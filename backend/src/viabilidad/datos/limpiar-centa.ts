
// Lee los CSV crudos de data/centa/raw/, los valida y (más adelante) escribe los CSV limpios
// en data/centa/clean/. Este archivo no toca la base de datos.

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { ARCHIVO_DIVISION, ARCHIVO_FUENTE, CAPAS, type CapaConfig } from "./capas.config";
import {
  Reporte,
  celda,
  colapsarEspacios,
  exigirColumnas,
  leerCsv,
  normalizarNombre,
  parsearNumero,
  ubicacion,
  type Numero,
} from "./utilidades";

// Este archivo vive en src/viabilidad/datos/ (o dist/viabilidad/datos/): tres niveles hasta backend/.
export const DIR_DATOS = resolve(__dirname, "../../../data/centa");
export const DIR_RAW = join(DIR_DATOS, "raw");
export const DIR_CLEAN = join(DIR_DATOS, "clean");

const ID_DEPARTAMENTO = "13";
const NOMBRE_DEPARTAMENTO = "MORAZAN"; // ya normalizado (ver normalizarNombre)
const CODIGO_DISTRITO_MIN = 1301;
const CODIGO_DISTRITO_MAX = 1326;
const TOLERANCIA_KM2_HA = 1; // |km² × 100 − ha| permitido, en hectáreas
const FORMATO_ENTERO = /^\d+$/;


// Paso 1: fuente.json

export interface Fuente {
  fuente: string;
  fechaExtraccion: string; // AAAA-MM-DD
}

function fechaValida(f: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return false;
  const d = new Date(`${f}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === f;
}

export function leerFuente(reporte: Reporte, dirRaw: string = DIR_RAW): Fuente | null {
  const ruta = join(dirRaw, ARCHIVO_FUENTE);

  let datos: unknown;
  try {
    datos = JSON.parse(readFileSync(ruta, "utf8"));
  } catch {
    reporte.error(`${ARCHIVO_FUENTE}: no se pudo leer o no es JSON válido (${ruta})`);
    return null;
  }
  if (typeof datos !== "object" || datos === null) {
    reporte.error(`${ARCHIVO_FUENTE}: debe ser un objeto JSON con "fuente" y "fechaExtraccion"`);
    return null;
  }

  const { fuente, fechaExtraccion } = datos as Record<string, unknown>;
  let valido = true;

  if (typeof fuente !== "string" || fuente.trim() === "" || fuente.trim().length > 50) {
    reporte.error(`${ARCHIVO_FUENTE}: "fuente" debe ser un texto no vacío de hasta 50 caracteres`);
    valido = false;
  }
  if (typeof fechaExtraccion !== "string" || !fechaValida(fechaExtraccion)) {
    reporte.error(`${ARCHIVO_FUENTE}: "fechaExtraccion" debe ser una fecha real con formato AAAA-MM-DD`);
    valido = false;
  } else if (fechaExtraccion > new Date().toISOString().slice(0, 10)) {
    reporte.error(`${ARCHIVO_FUENTE}: "fechaExtraccion" (${fechaExtraccion}) está en el futuro`);
    valido = false;
  }

  if (!valido || typeof fuente !== "string" || typeof fechaExtraccion !== "string") return null;
  return { fuente: fuente.trim(), fechaExtraccion };
}

// Pasos 2 a 5: lectura y validación de cada capa

export interface FilaCapa {
  linea: number; // línea en el export, para mensajes
  idDistrito: number; // código CENTA (Id_Muni)
  nombreExport: string; // texto de la columna Municipio; solo sirve para el cruce con la división
  valor: number; // código de clase
  clase: string; // nombre canónico de la clase (de capas.config.ts)
  areaHa: Numero;
}

export interface CapaLeida {
  capa: CapaConfig;
  filasLeidas: number; // filas de datos del export (válidas o no)
  filas: FilaCapa[]; // solo las que pasaron todas las validaciones
}

export function leerCapa(capa: CapaConfig, reporte: Reporte, dirRaw: string = DIR_RAW): CapaLeida | null {
  const tabla = leerCsv(join(dirRaw, capa.archivo), ";", reporte);
  if (tabla === null) return null;

  const columnas = [
    "Id_Departa",
    "Departamento",
    "Id_Muni",
    "Municipio",
    capa.columnaCodigo,
    capa.columnaTexto,
    "ha",
    "km²",
  ];
  if (!exigirColumnas(tabla, columnas, reporte)) return null;

  const filas: FilaCapa[] = [];
  const vistos = new Map<string, number>(); // "distrito|valor" -> línea donde apareció

  for (const fila of tabla.filas) {
    const erroresAntes = reporte.errores.length;
    const falla = (mensaje: string): void => reporte.error(`${ubicacion(tabla, fila)}: ${mensaje}`);

    const idDepartamento = celda(fila, "Id_Departa").trim();
    if (idDepartamento !== ID_DEPARTAMENTO) {
      falla(`Id_Departa debe ser ${ID_DEPARTAMENTO} (es "${idDepartamento}")`);
    }
    const departamento = celda(fila, "Departamento");
    if (normalizarNombre(departamento) !== NOMBRE_DEPARTAMENTO) {
      falla(`Departamento debe ser MORAZÁN (es "${departamento}")`);
    }

    const idTexto = celda(fila, "Id_Muni").trim();
    const idDistrito = FORMATO_ENTERO.test(idTexto) ? Number(idTexto) : Number.NaN;
    if (!(idDistrito >= CODIGO_DISTRITO_MIN && idDistrito <= CODIGO_DISTRITO_MAX)) {
      falla(`Id_Muni "${idTexto}" no es un código de distrito entre ${CODIGO_DISTRITO_MIN} y ${CODIGO_DISTRITO_MAX}`);
    }

    const valorTexto = celda(fila, capa.columnaCodigo).trim();
    const valor = FORMATO_ENTERO.test(valorTexto) ? Number(valorTexto) : Number.NaN;
    const nombreEsperado = capa.clases[valor];
    if (nombreEsperado === undefined) {
      falla(`${capa.columnaCodigo} "${valorTexto}" no es un código de clase válido para ${capa.codigo}`);
    }

    const claseCruda = colapsarEspacios(celda(fila, capa.columnaTexto));
    const claseTexto = claseCruda.replace(/^potencial /i, "");
    if (nombreEsperado !== undefined && claseTexto !== nombreEsperado) {
      falla(`la clase "${claseCruda}" no coincide con la esperada para el código ${valor} ("${nombreEsperado}")`);
    }

    const ha = parsearNumero(celda(fila, "ha"));
    if (ha === null) {
      falla(`ha "${celda(fila, "ha")}" no tiene un formato numérico válido`);
    } else if (ha.valor <= 0) {
      falla(`ha debe ser mayor que 0 (es ${ha.texto})`);
    }

    const km2 = parsearNumero(celda(fila, "km²"));
    if (km2 === null) {
      falla(`km² "${celda(fila, "km²")}" no tiene un formato numérico válido`);
    }
    if (ha !== null && km2 !== null && Math.abs(km2.valor * 100 - ha.valor) > TOLERANCIA_KM2_HA) {
      falla(`km² × 100 (${(km2.valor * 100).toFixed(3)}) no coincide con ha (${ha.texto}) dentro de ${TOLERANCIA_KM2_HA} ha`);
    }

    if (Number.isInteger(idDistrito) && Number.isInteger(valor)) {
      const clave = `${idDistrito}|${valor}`;
      const previa = vistos.get(clave);
      if (previa !== undefined) {
        falla(`fila duplicada: el distrito ${idDistrito} ya tiene la clase ${valor} en la línea ${previa}`);
      } else {
        vistos.set(clave, fila.linea);
      }
    }

    if (reporte.errores.length === erroresAntes && ha !== null && nombreEsperado !== undefined) {
      filas.push({
        linea: fila.linea,
        idDistrito,
        nombreExport: colapsarEspacios(celda(fila, "Municipio")),
        valor,
        clase: nombreEsperado,
        areaHa: ha,
      });
    }
  }

  return { capa, filasLeidas: tabla.filas.length, filas };
}

export function leerCapas(
  reporte: Reporte,
  dirRaw: string = DIR_RAW,
  capas: readonly CapaConfig[] = CAPAS,
): CapaLeida[] {
  const leidas: CapaLeida[] = [];
  for (const capa of capas) {
    const resultado = leerCapa(capa, reporte, dirRaw);
    if (resultado !== null) leidas.push(resultado);
  }
  return leidas;
}

// Pasos 6 y 7: tabla de división territorial y catálogo de distritos

// Encabezado de la tabla de división -> nombre del municipio.
const MUNICIPIOS_DIVISION: ReadonlyMap<string, string> = new Map([
  ["Morazan_Norte", "Morazán Norte"],
  ["Morazan_Sur", "Morazán Sur"],
]);
const TOTAL_DISTRITOS = 26;
const LARGO_MAXIMO_NOMBRE = 100; // distritos.nombre es VarChar(100)

export interface EntradaDivision {
  nombre: string; // con tildes, tal como está en la tabla de división
  municipio: string;
}

export interface Distrito {
  id: number; // código CENTA (Id_Muni de los exports)
  nombre: string;
  municipio: string;
}

/** Lee la tabla de división (formato ancho, una columna por municipio, celdas vacías ignoradas). */
export function leerDivision(reporte: Reporte, dirRaw: string = DIR_RAW): EntradaDivision[] | null {
  const tabla = leerCsv(join(dirRaw, ARCHIVO_DIVISION), ",", reporte);
  if (tabla === null) return null;

  if (!exigirColumnas(tabla, [...MUNICIPIOS_DIVISION.keys()], reporte)) return null;
  if (tabla.encabezados.length !== MUNICIPIOS_DIVISION.size) {
    reporte.error(
      `${tabla.archivo}: debe tener exactamente las columnas ${[...MUNICIPIOS_DIVISION.keys()].join(", ")} (tiene: ${tabla.encabezados.join(", ")})`,
    );
  }

  const entradas: EntradaDivision[] = [];
  const vistos = new Map<string, { municipio: string; linea: number }>();

  for (const fila of tabla.filas) {
    for (const [encabezado, municipio] of MUNICIPIOS_DIVISION) {
      const nombre = colapsarEspacios(celda(fila, encabezado));
      if (nombre === "") continue;

      if (nombre.length > LARGO_MAXIMO_NOMBRE) {
        reporte.error(`${ubicacion(tabla, fila)}: el nombre "${nombre}" supera ${LARGO_MAXIMO_NOMBRE} caracteres`);
      }
      const clave = normalizarNombre(nombre);
      const previo = vistos.get(clave);
      if (previo !== undefined) {
        reporte.error(
          `${ubicacion(tabla, fila)}: el distrito "${nombre}" está repetido: ya aparece en ${previo.municipio} (línea ${previo.linea})`,
        );
      } else {
        vistos.set(clave, { municipio, linea: fila.linea });
        entradas.push({ nombre, municipio });
      }
    }
  }

  if (entradas.length !== TOTAL_DISTRITOS) {
    reporte.error(`${tabla.archivo}: se esperaban ${TOTAL_DISTRITOS} distritos únicos y hay ${entradas.length}`);
  }
  return entradas;
}

/**
 * Empareja los códigos de los exports con la tabla de división por nombre normalizado
 * (mayúsculas, sin tildes, espacios colapsados). Devuelve el catálogo ordenado por código.
 */
export function armarDistritos(
  division: readonly EntradaDivision[],
  capas: readonly CapaLeida[],
  reporte: Reporte,
): Distrito[] {
  // Código -> nombres (normalizados) con que aparece en los exports de todas las capas.
  const nombresPorCodigo = new Map<number, Map<string, string>>();
  for (const capa of capas) {
    for (const fila of capa.filas) {
      const nombres = nombresPorCodigo.get(fila.idDistrito) ?? new Map<string, string>();
      nombres.set(normalizarNombre(fila.nombreExport), fila.nombreExport);
      nombresPorCodigo.set(fila.idDistrito, nombres);
    }
  }

  const porClave = new Map<string, EntradaDivision>();
  for (const entrada of division) porClave.set(normalizarNombre(entrada.nombre), entrada);

  const codigoDeClave = new Map<string, number>();
  const distritos: Distrito[] = [];

  for (const codigo of [...nombresPorCodigo.keys()].sort((a, b) => a - b)) {
    const nombres = nombresPorCodigo.get(codigo);
    if (nombres === undefined) continue;

    if (nombres.size > 1) {
      reporte.error(`el código ${codigo} aparece con nombres distintos en los exports: ${[...nombres.values()].join(" / ")}`);
      continue;
    }
    const primero = nombres.entries().next();
    if (primero.done === true) continue;
    const [clave, nombreExport] = primero.value;

    const entrada = porClave.get(clave);
    if (entrada === undefined) {
      reporte.error(`el código ${codigo} ("${nombreExport}") no tiene distrito en la tabla de división`);
      continue;
    }
    const otroCodigo = codigoDeClave.get(clave);
    if (otroCodigo !== undefined) {
      reporte.error(`el distrito "${entrada.nombre}" quedaría asignado a dos códigos (${otroCodigo} y ${codigo})`);
      continue;
    }
    codigoDeClave.set(clave, codigo);
    distritos.push({ id: codigo, nombre: entrada.nombre, municipio: entrada.municipio });
  }

  for (const [clave, entrada] of porClave) {
    if (!codigoDeClave.has(clave)) {
      reporte.error(`el distrito "${entrada.nombre}" (${entrada.municipio}) de la tabla de división no tiene código en los exports`);
    }
  }

  if (distritos.length !== TOTAL_DISTRITOS) {
    reporte.error(`se esperaban ${TOTAL_DISTRITOS} distritos emparejados y hay ${distritos.length}`);
  }
  return distritos;
}

// ---------------------------------------------------------------------------
// Pasos 8 y 9: completar clases ausentes y verificar totales entre capas
// ---------------------------------------------------------------------------

const TOLERANCIA_TOTAL_HA = 5; // diferencia permitida del área total de un distrito entre capas

export interface FilaLimpia {
  capa: string; // capas.codigo
  idDistrito: number;
  valor: number;
  clase: string;
  areaHa: string; // sin separador de miles, con 3 decimales
}

export interface Completada {
  capa: string;
  idDistrito: number;
  distrito: string;
  valor: number;
  clase: string;
}

/** Deja cada capa con una fila por distrito y clase; las clases ausentes del export se completan con 0 ha. */
function completarClases(
  distritos: readonly Distrito[],
  capas: readonly CapaLeida[],
): { filas: FilaLimpia[]; completadas: Completada[] } {
  const filas: FilaLimpia[] = [];
  const completadas: Completada[] = [];

  for (const { capa, filas: leidas } of capas) {
    const porClave = new Map<string, FilaCapa>();
    for (const fila of leidas) porClave.set(`${fila.idDistrito}|${fila.valor}`, fila);
    const valores = Object.keys(capa.clases)
      .map(Number)
      .sort((a, b) => a - b);

    for (const distrito of distritos) {
      for (const valor of valores) {
        const existente = porClave.get(`${distrito.id}|${valor}`);
        const clase = existente?.clase ?? capa.clases[valor];
        if (clase === undefined) continue;

        if (existente !== undefined) {
          filas.push({ capa: capa.codigo, idDistrito: distrito.id, valor, clase, areaHa: existente.areaHa.texto });
        } else {
          filas.push({ capa: capa.codigo, idDistrito: distrito.id, valor, clase, areaHa: "0.000" });
          completadas.push({ capa: capa.codigo, idDistrito: distrito.id, distrito: distrito.nombre, valor, clase });
        }
      }
    }
  }
  return { filas, completadas };
}

/**
 * Verifica que el área total clasificada de cada distrito coincida entre capas (tolerancia 5 ha)
 * y que ningún distrito falte por completo en una capa. Devuelve la diferencia máxima observada.
 */
function verificarTotales(distritos: readonly Distrito[], capas: readonly CapaLeida[], reporte: Reporte): number {
  let maxima = 0;

  for (const distrito of distritos) {
    const totales = capas.map(({ capa, filas }) => ({
      codigo: capa.codigo,
      ha: filas.filter((f) => f.idDistrito === distrito.id).reduce((suma, f) => suma + f.areaHa.valor, 0),
    }));

    for (const total of totales.filter((t) => t.ha === 0)) {
      reporte.error(
        `el distrito ${distrito.id} (${distrito.nombre}) no tiene ninguna clase en ${total.codigo}: no se podrían calcular porcentajes`,
      );
    }

    const conArea = totales.filter((t) => t.ha > 0);
    if (conArea.length < 2) continue;

    const valores = conArea.map((t) => t.ha);
    const diferencia = Math.max(...valores) - Math.min(...valores);
    maxima = Math.max(maxima, diferencia);
    if (diferencia > TOLERANCIA_TOTAL_HA) {
      reporte.error(
        `el área total del distrito ${distrito.id} (${distrito.nombre}) no coincide entre capas (tolerancia ${TOLERANCIA_TOTAL_HA} ha): ` +
          conArea.map((t) => `${t.codigo} ${t.ha.toFixed(3)}`).join(", "),
      );
    }
  }
  return maxima;
}


// Orquestación, escritura de los CSV limpios y punto de entrada

export const ARCHIVO_DISTRITOS_LIMPIO = "distritos.csv";
export const ARCHIVO_AREAS_LIMPIO = "areas_clase.csv";

export interface ResultadoLimpieza {
  fuente: Fuente | null;
  distritos: Distrito[];
  capas: { codigo: string; filasLeidas: number }[];
  filas: FilaLimpia[];
  completadas: Completada[];
  diferenciaMaximaHa: number;
}

/** Ejecuta todos los pasos de validación. Los problemas se acumulan en el reporte; no escribe nada. */
export function limpiar(reporte: Reporte, dirRaw: string = DIR_RAW): ResultadoLimpieza {
  const fuente = leerFuente(reporte, dirRaw);
  const capas = leerCapas(reporte, dirRaw);
  const division = leerDivision(reporte, dirRaw);
  const distritos = division === null ? [] : armarDistritos(division, capas, reporte);
  const { filas, completadas } = completarClases(distritos, capas);
  const diferenciaMaximaHa = verificarTotales(distritos, capas, reporte);

  return {
    fuente,
    distritos,
    capas: capas.map((c) => ({ codigo: c.capa.codigo, filasLeidas: c.filasLeidas })),
    filas,
    completadas,
    diferenciaMaximaHa,
  };
}

function campoCsv(valor: string): string {
  return /[",\r\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

function textoCsv(encabezados: readonly string[], filas: readonly (readonly string[])[]): string {
  return [encabezados, ...filas].map((fila) => fila.map(campoCsv).join(",")).join("\n") + "\n";
}

/** Escribe distritos.csv y areas_clase.csv (UTF-8 sin BOM, separador ",", saltos LF). Devuelve las rutas. */
export function escribirLimpios(resultado: ResultadoLimpieza, dirClean: string = DIR_CLEAN): string[] {
  mkdirSync(dirClean, { recursive: true });
  const rutaDistritos = join(dirClean, ARCHIVO_DISTRITOS_LIMPIO);
  const rutaAreas = join(dirClean, ARCHIVO_AREAS_LIMPIO);

  writeFileSync(
    rutaDistritos,
    textoCsv(
      ["id_distrito", "distrito", "municipio"],
      resultado.distritos.map((d) => [String(d.id), d.nombre, d.municipio]),
    ),
    "utf8",
  );
  writeFileSync(
    rutaAreas,
    textoCsv(
      ["capa", "id_distrito", "valor", "clase", "area_ha"],
      resultado.filas.map((f) => [f.capa, String(f.idDistrito), String(f.valor), f.clase, f.areaHa]),
    ),
    "utf8",
  );
  return [rutaDistritos, rutaAreas];
}

/** Resumen legible para la consola, pensado para compararlo con los controles numéricos del documento. */
export function resumen(resultado: ResultadoLimpieza): string[] {
  const lineas: string[] = [];
  const fuente = resultado.fuente;
  lineas.push(fuente === null ? "Fuente: (no válida)" : `Fuente: ${fuente.fuente}, extracción ${fuente.fechaExtraccion}`);

  const porMunicipio = new Map<string, number>();
  for (const d of resultado.distritos) porMunicipio.set(d.municipio, (porMunicipio.get(d.municipio) ?? 0) + 1);
  lineas.push(
    `Distritos: ${resultado.distritos.length} (${[...porMunicipio].map(([m, n]) => `${m}: ${n}`).join(", ")})`,
  );

  for (const capa of resultado.capas) {
    const completadas = resultado.completadas.filter((c) => c.capa === capa.codigo).length;
    lineas.push(`${capa.codigo}: ${capa.filasLeidas} filas leídas, ${completadas} completadas con 0 ha`);
  }
  lineas.push(`Filas completadas con 0 ha en total: ${resultado.completadas.length}`);
  for (const capa of resultado.capas) {
    const propias = resultado.completadas.filter((c) => c.capa === capa.codigo);
    if (propias.length > 0) {
      lineas.push(`  ${capa.codigo}: ${propias.map((c) => `${c.distrito} (${c.clase})`).join(", ")}`);
    }
  }
  lineas.push(`areas_clase.csv: ${resultado.filas.length} filas`);
  lineas.push(
    `Diferencia máxima del área total de un distrito entre capas: ${resultado.diferenciaMaximaHa.toFixed(3)} ha (tolerancia ${TOLERANCIA_TOTAL_HA} ha)`,
  );
  return lineas;
}

function main(): void {
  const reporte = new Reporte();
  const resultado = limpiar(reporte);

  if (reporte.hayErrores) {
    console.error(`Se encontraron ${reporte.errores.length} error(es). No se escribió ningún archivo limpio:`);
    for (const error of reporte.errores) console.error(`  - ${error}`);
    process.exit(1);
  }

  const rutas = escribirLimpios(resultado);
  for (const linea of resumen(resultado)) console.log(linea);
  for (const ruta of rutas) console.log(`Escrito: ${ruta}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error("Error inesperado en la limpieza:", error);
    process.exit(1);
  }
}