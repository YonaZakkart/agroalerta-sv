import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { TablaNormal30 } from "./normales";
import type { Atribucion, CeldaModelo } from "./tipos";

// Archivo versionado con la normal de 30 días por distrito (lo genera npm run clima:normales).
// Se guarda como JSON y no en la base para no tocar schema.prisma; la fuente y la fecha viajan con el dato.

export const RUTA_NORMALES = resolve(__dirname, "../../data/referencia/normales_lluvia_30d.json");

export interface NormalDistrito {
    nombre: string;
    celdaModelo: CeldaModelo;
    normal30: TablaNormal30;
}

export interface ArchivoNormales {
    fuente: string;
    atribucion: Atribucion;
    modelo: string;
    fechaGeneracion: string;
    periodo: { desde: string; hasta: string };
    ventanaDias: number;
    minimoAnios: number;
    unidad: "mm";
    /** Clave: id del distrito (como texto). */
    distritos: Record<string, NormalDistrito>;
}

export function leerArchivoNormales(ruta: string = RUTA_NORMALES): ArchivoNormales | null {
    if (!existsSync(ruta)) return null;
    return JSON.parse(readFileSync(ruta, "utf8")) as ArchivoNormales;
}

export function escribirArchivoNormales(archivo: ArchivoNormales, ruta: string = RUTA_NORMALES): void {
    writeFileSync(ruta, JSON.stringify(archivo, null, 1) + "\n", "utf8");
}
