// Servicio de consulta de viabilidad por distrito (Parte 2-C).
// Lee los datos CENTA ya cargados en MySQL. No cubre temporadas.

import { prisma } from "../config/prisma";
import { HA_POR_MANZANA } from "./constantes";
import { normalizarNombre } from "./datos/utilidades";

export class ViabilidadError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

export interface OpcionesConsulta {
    capa?: string | undefined; // capas.codigo, p. ej. "potencial_maiz"
    cultivo?: string | undefined; // p. ej. "maiz" (se compara sin tildes ni mayúsculas)
}

export interface ClaseViabilidad {
    valor: number;
    nombre: string;
    areaHa: number; // 3 decimales
    areaMz: number; // solo para mostrar (ha / HA_POR_MANZANA), 2 decimales
    porcentaje: number; // 1 decimal, solo para mostrar
}

export interface CapaViabilidad {
    codigo: string;
    nombre: string;
    tipo: "POTENCIAL" | "RIESGO";
    cultivo: string | null;
    totalHa: number;
    totalMz: number;
    claseDominante: { valor: number; nombre: string; porcentaje: number } | null;
    clases: ClaseViabilidad[];
}

export interface ResultadoViabilidad {
    distrito: { id: number; nombre: string };
    municipio: { id: number; nombre: string };
    fuente: string | null;
    fechaExtraccion: string | null; // YYYY-MM-DD
    capas: CapaViabilidad[];
}

// Las áreas son Decimal(12,3). Se trabaja en milésimas de hectárea (enteros) para sumar sin error de coma flotante.
const aMilesimas = (decimal: { mul(n: number): { toNumber(): number } }): number => decimal.mul(1000).toNumber();
const redondear = (n: number, decimales: number): number => {
    const f = 10 ** decimales;
    return Math.round(n * f) / f;
};
const haAMz = (ha: number): number => redondear(ha / HA_POR_MANZANA, 2);

export async function consultarViabilidad(idDistrito: number, opciones: OpcionesConsulta = {}): Promise<ResultadoViabilidad> {
    const { capa, cultivo } = opciones;
    if (capa !== undefined && cultivo !== undefined) {
        throw new ViabilidadError(400, "Indique capa o cultivo, no ambos");
    }

    const distrito = await prisma.distrito.findUnique({
        where: { id: idDistrito },
        include: { municipio: true },
    });
    if (!distrito) throw new ViabilidadError(404, "Distrito no encontrado");

    const capas = await prisma.capa.findMany({
        orderBy: { id: "asc" },
        include: {
            clases: {
                orderBy: { valor: "asc" },
                include: { areas: { where: { distritoId: idDistrito } } },
            },
        },
    });

    let seleccion = capas;
    if (capa !== undefined) {
        seleccion = capas.filter((c) => c.codigo === capa);
        if (seleccion.length === 0) throw new ViabilidadError(404, "Capa no encontrada");
    } else if (cultivo !== undefined) {
        const buscado = normalizarNombre(cultivo);
        // Las capas sin cultivo (riesgo de sequía) aplican a todos los cultivos, por eso se incluyen.
        seleccion = capas.filter((c) => c.cultivo === null || normalizarNombre(c.cultivo) === buscado);
        if (!seleccion.some((c) => c.cultivo !== null)) throw new ViabilidadError(404, "Cultivo no encontrado");
    }

    const filas = seleccion.flatMap((c) => c.clases.flatMap((cl) => cl.areas));
    const fuente = filas[0]?.fuente ?? null;
    const fechaMax = filas.reduce<Date | null>((max, a) => (max === null || a.fechaExtraccion > max ? a.fechaExtraccion : max), null);

    return {
        distrito: { id: distrito.id, nombre: distrito.nombre },
        municipio: { id: distrito.municipio.id, nombre: distrito.municipio.nombre },
        fuente,
        fechaExtraccion: fechaMax ? fechaMax.toISOString().slice(0, 10) : null,
        capas: seleccion.map((c) => {
            const clases = c.clases.map((cl) => ({
                valor: cl.valor,
                nombre: cl.nombre,
                milesimas: cl.areas[0] ? aMilesimas(cl.areas[0].areaHa) : 0, // sin fila de área = 0 ha
            }));
            const totalMilesimas = clases.reduce((suma, cl) => suma + cl.milesimas, 0);
            const porcentaje = (milesimas: number): number =>
                totalMilesimas === 0 ? 0 : redondear((milesimas / totalMilesimas) * 100, 1);

            // La dominante se decide con áreas exactas, no con porcentajes redondeados. En empate gana el primero (menor valor).
            const mayor = clases.reduce<(typeof clases)[number] | null>(
                (m, cl) => (cl.milesimas > (m?.milesimas ?? 0) ? cl : m),
                null,
            );

            return {
                codigo: c.codigo,
                nombre: c.nombre,
                tipo: c.tipo,
                cultivo: c.cultivo,
                totalHa: totalMilesimas / 1000,
                totalMz: haAMz(totalMilesimas / 1000),
                claseDominante: mayor ? { valor: mayor.valor, nombre: mayor.nombre, porcentaje: porcentaje(mayor.milesimas) } : null,
                clases: clases.map((cl) => ({
                    valor: cl.valor,
                    nombre: cl.nombre,
                    areaHa: cl.milesimas / 1000,
                    areaMz: haAMz(cl.milesimas / 1000),
                    porcentaje: porcentaje(cl.milesimas),
                })),
            };
        }),
    };
}