import { ErrorOpenMeteo } from "./errores";
import type { DiaLluvia } from "./tipos";

// Normal de lluvia de 30 días por distrito (Info_Datos_Clima.md, sección 5).
// Funciones puras: sin red, sin base, sin archivos.
//
// normal30 de una fecha F = promedio, sobre los años de la serie, de la lluvia acumulada
// en los 30 días que terminan en F (F incluida).

export const VENTANA_DIAS = 30;
export const MINIMO_ANIOS = 10;

/** Clave "MM-DD" -> normal en mm (1 decimal), o null si no hay suficientes años completos. */
export type TablaNormal30 = Record<string, number | null>;

const MS_DIA = 86_400_000;

function aMsUtc(fecha: string): number {
    const [anio, mes, dia] = fecha.split("-").map(Number);
    return Date.UTC(anio ?? 0, (mes ?? 1) - 1, dia ?? 1);
}

/** Las 365 claves MM-DD de un año no bisiesto. */
export function clavesDelAnio(): string[] {
    const claves: string[] = [];
    for (let d = 0; d < 365; d++) {
        claves.push(new Date(Date.UTC(2001, 0, 1) + d * MS_DIA).toISOString().slice(5, 10));
    }
    return claves;
}

/**
 * Calcula la tabla de normales a partir de una serie diaria contigua de varios años.
 * Un año se descarta para una fecha si algún día de su ventana de 30 días no tiene dato.
 * El 29 de febrero no tiene clave propia (se usa el 28; ver obtenerNormal30).
 */
export function calcularNormal30(serie: readonly DiaLluvia[], minimoAnios: number = MINIMO_ANIOS): TablaNormal30 {
    for (let i = 1; i < serie.length; i++) {
        const anterior = serie[i - 1];
        const actual = serie[i];
        if (anterior === undefined || actual === undefined || aMsUtc(actual.fecha) - aMsUtc(anterior.fecha) !== MS_DIA) {
            throw new ErrorOpenMeteo("FORMATO", `La serie histórica no es contigua cerca de ${serie[i]?.fecha ?? "?"}`);
        }
    }

    const acumulado = new Map<string, { suma: number; anios: number }>();
    for (let i = VENTANA_DIAS - 1; i < serie.length; i++) {
        const fin = serie[i];
        if (fin === undefined) continue;
        const clave = fin.fecha.slice(5);
        if (clave === "02-29") continue;

        let suma = 0;
        let completa = true;
        for (let j = i - (VENTANA_DIAS - 1); j <= i; j++) {
            const valor = serie[j]?.precipitacionMm;
            if (valor === null || valor === undefined) {
                completa = false;
                break;
            }
            suma += valor;
        }
        if (!completa) continue;

        const previo = acumulado.get(clave) ?? { suma: 0, anios: 0 };
        previo.suma += suma;
        previo.anios += 1;
        acumulado.set(clave, previo);
    }

    const tabla: TablaNormal30 = {};
    for (const clave of clavesDelAnio()) {
        const dato = acumulado.get(clave);
        tabla[clave] = dato !== undefined && dato.anios >= minimoAnios ? Math.round((dato.suma / dato.anios) * 10) / 10 : null;
    }
    return tabla;
}

/** Normal de 30 días para una fecha AAAA-MM-DD. null si no hay dato para ese día. */
export function obtenerNormal30(tabla: TablaNormal30, fecha: string): number | null {
    const clave = fecha.slice(5);
    return tabla[clave === "02-29" ? "02-28" : clave] ?? null;
}
