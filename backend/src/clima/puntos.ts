import { prisma } from "../config/prisma";
import { ErrorOpenMeteo } from "./errores";
import type { PuntoDistrito } from "./tipos";

/** Alguno de los distritos solicitados no existe en la base (error del cliente). */
export class ErrorDistritosNoExisten extends Error {
    constructor(readonly distritoIds: number[]) {
        super(`Distritos que no existen: ${distritoIds.join(", ")}`);
        this.name = "ErrorDistritosNoExisten";
    }
}

/**
 * Lee de la base los puntos a consultar. latitud y longitud llegan como Decimal | null:
 * se convierten con toNumber() y un null se trata como error (corre npm run datos:cargar).
 * Sin ids devuelve los 26 distritos.
 */
export async function leerPuntosDistrito(ids?: readonly number[]): Promise<PuntoDistrito[]> {
    const filas = await prisma.distrito.findMany({
        where: ids === undefined ? {} : { id: { in: [...ids] } },
        select: { id: true, nombre: true, latitud: true, longitud: true },
        orderBy: { id: "asc" },
    });

    if (ids !== undefined) {
        const encontrados = new Set(filas.map((f) => f.id));
        const faltan = ids.filter((id) => !encontrados.has(id));
        if (faltan.length > 0) {
            throw new ErrorDistritosNoExisten(faltan);
        }
    }

    return filas.map((fila) => {
        if (fila.latitud === null || fila.longitud === null) {
            throw new ErrorOpenMeteo(
                "COORDENADA_INVALIDA",
                `El distrito ${fila.id} (${fila.nombre}) no tiene coordenadas; corre npm run datos:cargar`,
            );
        }
        return {
            distritoId: fila.id,
            nombre: fila.nombre,
            latitud: fila.latitud.toNumber(),
            longitud: fila.longitud.toNumber(),
        };
    });
}
