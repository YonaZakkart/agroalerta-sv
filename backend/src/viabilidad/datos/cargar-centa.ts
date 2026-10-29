// Carga de los datos de viabilidad (CENTA) en MySQL (Parte 2-B).
// Lee los CSV limpios de data/centa/clean/ (no los crudos), los valida y los guarda con upsert
// dentro de una sola transacción: correrlo dos veces no duplica y un fallo no deja carga a medias.

import { join } from "path";
import { prisma } from "../../config/prisma";
import { CAPAS } from "./capas.config";
import { ARCHIVO_AREAS_LIMPIO, ARCHIVO_DISTRITOS_LIMPIO, DIR_CLEAN, leerFuente, type Fuente } from "./limpiar-centa";
import { Reporte, celda, exigirColumnas, leerCsv, normalizarNombre, parsearNumero, ubicacion } from "./utilidades";

// Cantidades esperadas. Si se agrega una capa o cambia la división territorial, se actualizan a propósito.
const ESPERADO = { municipios: 2, distritos: 26, capas: 4, clases: 12, areas: 312 } as const;
const LARGO_MAXIMO_NOMBRE = 100;
const FORMATO_ENTERO = /^\d+$/;

interface DistritoLimpio {
    id: number;
    nombre: string;
    municipio: string;
    nombreNormalizado: string;
}

interface AreaLimpia {
    capa: string; // capas.codigo
    idDistrito: number;
    valor: number;
    areaHa: string; // texto con 3 decimales; Prisma lo recibe como Decimal
}

// Lectura y validación de los CSV limpios (no toca la base de datos)

function leerDistritosLimpios(reporte: Reporte, dirClean: string): DistritoLimpio[] {
    const tabla = leerCsv(join(dirClean, ARCHIVO_DISTRITOS_LIMPIO), ",", reporte);
    if (tabla === null || !exigirColumnas(tabla, ["id_distrito", "distrito", "municipio"], reporte)) return [];

    const distritos: DistritoLimpio[] = [];
    const ids = new Set<number>();
    const claves = new Set<string>();

    for (const fila of tabla.filas) {
        const erroresAntes = reporte.errores.length;
        const falla = (mensaje: string): void => reporte.error(`${ubicacion(tabla, fila)}: ${mensaje}`);

        const idTexto = celda(fila, "id_distrito").trim();
        const nombre = celda(fila, "distrito").trim();
        const municipio = celda(fila, "municipio").trim();

        if (!FORMATO_ENTERO.test(idTexto)) falla(`id_distrito "${idTexto}" no es un entero`);
        if (nombre === "" || nombre.length > LARGO_MAXIMO_NOMBRE) falla(`distrito "${nombre}" vacío o de más de ${LARGO_MAXIMO_NOMBRE} caracteres`);
        if (municipio === "" || municipio.length > LARGO_MAXIMO_NOMBRE) falla(`municipio "${municipio}" vacío o de más de ${LARGO_MAXIMO_NOMBRE} caracteres`);

        const id = Number(idTexto);
        const nombreNormalizado = normalizarNombre(nombre);
        if (ids.has(id)) falla(`id_distrito ${id} repetido`);
        if (claves.has(nombreNormalizado)) falla(`el distrito "${nombre}" está repetido (mismo nombre normalizado)`);

        if (reporte.errores.length === erroresAntes) {
            ids.add(id);
            claves.add(nombreNormalizado);
            distritos.push({ id, nombre, municipio, nombreNormalizado });
        }
    }
    return distritos;
}

function leerAreasLimpias(reporte: Reporte, dirClean: string, idsDistrito: ReadonlySet<number>): AreaLimpia[] {
    const tabla = leerCsv(join(dirClean, ARCHIVO_AREAS_LIMPIO), ",", reporte);
    if (tabla === null || !exigirColumnas(tabla, ["capa", "id_distrito", "valor", "clase", "area_ha"], reporte)) return [];

    const capasPorCodigo = new Map(CAPAS.map((c) => [c.codigo, c] as const));
    const areas: AreaLimpia[] = [];
    const vistos = new Set<string>();

    for (const fila of tabla.filas) {
        const erroresAntes = reporte.errores.length;
        const falla = (mensaje: string): void => reporte.error(`${ubicacion(tabla, fila)}: ${mensaje}`);

        const codigoCapa = celda(fila, "capa").trim();
        const capa = capasPorCodigo.get(codigoCapa);
        if (capa === undefined) falla(`capa "${codigoCapa}" no existe en capas.config.ts`);

        const idTexto = celda(fila, "id_distrito").trim();
        const idDistrito = FORMATO_ENTERO.test(idTexto) ? Number(idTexto) : Number.NaN;
        if (!idsDistrito.has(idDistrito)) falla(`id_distrito "${idTexto}" no está en ${ARCHIVO_DISTRITOS_LIMPIO}`);

        const valorTexto = celda(fila, "valor").trim();
        const valor = FORMATO_ENTERO.test(valorTexto) ? Number(valorTexto) : Number.NaN;
        const claseEsperada = capa?.clases[valor];
        const clase = celda(fila, "clase").trim();
        if (capa !== undefined && claseEsperada === undefined) {
            falla(`valor "${valorTexto}" no es una clase válida de ${codigoCapa}`);
        } else if (claseEsperada !== undefined && clase !== claseEsperada) {
            falla(`la clase "${clase}" no coincide con la esperada para el valor ${valor} ("${claseEsperada}")`);
        }

        const area = parsearNumero(celda(fila, "area_ha"));
        if (area === null) falla(`area_ha "${celda(fila, "area_ha")}" no es un número válido (no se aceptan negativos)`);

        const clave = `${codigoCapa}|${idDistrito}|${valor}`;
        if (vistos.has(clave)) falla(`fila duplicada (${codigoCapa}, distrito ${idDistrito}, valor ${valor})`);
        vistos.add(clave);

        if (reporte.errores.length === erroresAntes && area !== null) {
            areas.push({ capa: codigoCapa, idDistrito, valor, areaHa: area.texto });
        }
    }
    return areas;
}

function validarCantidades(reporte: Reporte, distritos: readonly DistritoLimpio[], areas: readonly AreaLimpia[]): void {
    const encontrado = {
        municipios: new Set(distritos.map((d) => d.municipio)).size,
        distritos: distritos.length,
        capas: CAPAS.length,
        clases: CAPAS.reduce((suma, c) => suma + Object.keys(c.clases).length, 0),
        areas: areas.length,
    };
    for (const clave of Object.keys(ESPERADO) as (keyof typeof ESPERADO)[]) {
        if (encontrado[clave] !== ESPERADO[clave]) {
            reporte.error(`se esperaban ${ESPERADO[clave]} ${clave} y hay ${encontrado[clave]}`);
        }
    }
}

// Escritura en la base de datos

type Conteos = Record<keyof typeof ESPERADO, number>;

async function cargar(distritos: readonly DistritoLimpio[], areas: readonly AreaLimpia[], fuente: Fuente): Promise<Conteos> {
    const fecha = new Date(`${fuente.fechaExtraccion}T00:00:00.000Z`);

    return prisma.$transaction(
        async (tx) => {
            // 1) Municipios
            const idMunicipio = new Map<string, number>();
            for (const nombre of [...new Set(distritos.map((d) => d.municipio))].sort()) {
                const municipio = await tx.municipio.upsert({ where: { nombre }, update: {}, create: { nombre } });
                idMunicipio.set(nombre, municipio.id);
            }

            // 2) Distritos (el id es el código CENTA, se inserta explícito)
            for (const d of distritos) {
                const municipioId = idMunicipio.get(d.municipio);
                if (municipioId === undefined) throw new Error(`municipio "${d.municipio}" sin id (no debería ocurrir)`);
                await tx.distrito.upsert({
                    where: { id: d.id },
                    update: { nombre: d.nombre, nombreNormalizado: d.nombreNormalizado, municipioId },
                    create: { id: d.id, nombre: d.nombre, nombreNormalizado: d.nombreNormalizado, municipioId },
                });
            }

            // 3) Capas y sus clases, desde capas.config.ts
            const idClase = new Map<string, number>(); // "codigoCapa|valor" -> clases_capa.id
            for (const capa of CAPAS) {
                const { id: capaId } = await tx.capa.upsert({
                    where: { codigo: capa.codigo },
                    update: { nombre: capa.nombre, tipo: capa.tipo, cultivo: capa.cultivo },
                    create: { codigo: capa.codigo, nombre: capa.nombre, tipo: capa.tipo, cultivo: capa.cultivo },
                });
                for (const [valorTexto, nombre] of Object.entries(capa.clases)) {
                    const valor = Number(valorTexto);
                    const clase = await tx.claseCapa.upsert({
                        where: { capaId_valor: { capaId, valor } },
                        update: { nombre },
                        create: { capaId, valor, nombre },
                    });
                    idClase.set(`${capa.codigo}|${valor}`, clase.id);
                }
            }

            // 4) Áreas por distrito y clase
            for (const a of areas) {
                const claseId = idClase.get(`${a.capa}|${a.valor}`);
                if (claseId === undefined) throw new Error(`clase ${a.capa}|${a.valor} sin id (no debería ocurrir)`);
                await tx.areaClase.upsert({
                    where: { distritoId_claseId: { distritoId: a.idDistrito, claseId } },
                    update: { areaHa: a.areaHa, fuente: fuente.fuente, fechaExtraccion: fecha },
                    create: { distritoId: a.idDistrito, claseId, areaHa: a.areaHa, fuente: fuente.fuente, fechaExtraccion: fecha },
                });
            }

            // 5) Verificación dentro de la transacción: si hay filas de más o de menos, se revierte todo.
            const conteos: Conteos = {
                municipios: await tx.municipio.count(),
                distritos: await tx.distrito.count(),
                capas: await tx.capa.count(),
                clases: await tx.claseCapa.count(),
                areas: await tx.areaClase.count(),
            };
            for (const clave of Object.keys(ESPERADO) as (keyof typeof ESPERADO)[]) {
                if (conteos[clave] !== ESPERADO[clave]) {
                    throw new Error(
                        `la tabla de ${clave} quedó con ${conteos[clave]} filas y se esperaban ${ESPERADO[clave]} (¿filas ajenas a esta carga?)`,
                    );
                }
            }
            return conteos;
        },
        { maxWait: 10_000, timeout: 120_000 },
    );
}

// Punto de entrada

async function main(): Promise<void> {
    const reporte = new Reporte();
    const fuente = leerFuente(reporte);
    const distritos = leerDistritosLimpios(reporte, DIR_CLEAN);
    const areas = leerAreasLimpias(reporte, DIR_CLEAN, new Set(distritos.map((d) => d.id)));
    if (!reporte.hayErrores) validarCantidades(reporte, distritos, areas);

    if (reporte.hayErrores || fuente === null) {
        console.error(`Se encontraron ${reporte.errores.length} error(es). No se escribió nada en la base de datos:`);
        for (const error of reporte.errores) console.error(`  - ${error}`);
        console.error("Si los CSV limpios no existen o están desactualizados, corre primero: npm run datos:limpiar");
        process.exitCode = 1;
        return;
    }

    console.log(`Fuente: ${fuente.fuente}, extracción ${fuente.fechaExtraccion}`);
    console.log(
        `Validado antes de escribir: ${ESPERADO.distritos} distritos, ${ESPERADO.municipios} municipios, ${ESPERADO.capas} capas, ${ESPERADO.clases} clases, ${ESPERADO.areas} áreas`,
    );
    const conteos = await cargar(distritos, areas, fuente);
    console.log("Carga completada (transacción confirmada). Filas en la base de datos:");
    console.log(
        `  municipios ${conteos.municipios}, distritos ${conteos.distritos}, capas ${conteos.capas}, clases_capa ${conteos.clases}, areas_clase ${conteos.areas}`,
    );
}

function reportarError(error: unknown): void {
    const codigo =
        typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
    console.error("La carga falló. Lo que estaba dentro de la transacción se revirtió por completo.");
    if (codigo === "P2021" || codigo === "P2022") {
        console.error("Parece que las tablas no existen o están desactualizadas: corre npx prisma generate y npx prisma migrate dev.");
    }
    if (codigo === "P2039") {
                console.error("Pool timeout: Prisma oculta la causa real; ver 1-END (fix/prisma-mariadb-rsa-key) en Estado_del_Proyecto.txt (conexión a MySQL 8.4).");
    }
    console.error(error instanceof Error ? error.message : error);
}

if (require.main === module) {
    void (async () => {
        try {
            await main();
        } catch (error) {
            reportarError(error);
            process.exitCode = 1;
        } finally {
            await prisma.$disconnect();
        }
    })();
}