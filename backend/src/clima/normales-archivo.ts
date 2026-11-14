import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { VENTANA_DIAS } from "./normales";
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

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const CLAVE_DIA = /^\d{2}-\d{2}$/;
const CLAVE_DISTRITO = /^\d+$/;

function esObjeto(valor: unknown): valor is Record<string, unknown> {
    return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function esTablaNormal(valor: unknown): valor is TablaNormal30 {
    if (!esObjeto(valor)) return false;
    const claves = Object.keys(valor);
    if (claves.length !== 365) return false;
    return claves.every((clave) => {
        const normal = valor[clave];
        return CLAVE_DIA.test(clave) && (normal === null || (typeof normal === "number" && Number.isFinite(normal) && normal >= 0));
    });
}

function esCelda(valor: unknown): valor is CeldaModelo {
    if (!esObjeto(valor)) return false;
    return (
        typeof valor["latitud"] === "number" &&
        Number.isFinite(valor["latitud"]) &&
        typeof valor["longitud"] === "number" &&
        Number.isFinite(valor["longitud"]) &&
        (valor["elevacionM"] === null || (typeof valor["elevacionM"] === "number" && Number.isFinite(valor["elevacionM"])))
    );
}

function esAtribucion(valor: unknown): valor is Atribucion {
    if (!esObjeto(valor)) return false;
    return ["texto", "url", "licencia", "urlLicencia"].every(
        (clave) => typeof valor[clave] === "string" && valor[clave] !== "",
    );
}

/**
 * Valida la estructura mínima del archivo antes de usarlo o escribirlo.
 * Un archivo corrupto no debe tumbar todo el clima: el llamador lo trata como
 * "sin normales" y 3-B sigue clasificando solo con los días secos.
 */
export function validarArchivoNormales(valor: unknown): valor is ArchivoNormales {
    if (!esObjeto(valor)) return false;

    if (typeof valor["fuente"] !== "string" || valor["fuente"].trim() === "") return false;
    if (!esAtribucion(valor["atribucion"])) return false;
    if (typeof valor["modelo"] !== "string" || valor["modelo"].trim() === "") return false;
    if (typeof valor["fechaGeneracion"] !== "string" || !FECHA.test(valor["fechaGeneracion"])) return false;

    const periodo = valor["periodo"];
    if (!esObjeto(periodo)) return false;
    const desde = periodo["desde"];
    const hasta = periodo["hasta"];
    if (typeof desde !== "string" || !FECHA.test(desde)) return false;
    if (typeof hasta !== "string" || !FECHA.test(hasta) || desde > hasta) return false;

    if (valor["ventanaDias"] !== VENTANA_DIAS) return false;
    if (!Number.isInteger(valor["minimoAnios"]) || (valor["minimoAnios"] as number) < 1) return false;
    if (valor["unidad"] !== "mm") return false;

    const distritos = valor["distritos"];
    if (!esObjeto(distritos)) return false;
    for (const [id, distrito] of Object.entries(distritos)) {
        if (!CLAVE_DISTRITO.test(id) || !esObjeto(distrito)) return false;
        if (typeof distrito["nombre"] !== "string" || distrito["nombre"].trim() === "") return false;
        if (!esCelda(distrito["celdaModelo"])) return false;
        if (!esTablaNormal(distrito["normal30"])) return false;
    }

    return true;
}

/**
 * Lee y valida el archivo. Si no existe devuelve null (las normales son
 * opcionales). Si existe pero está corrupto, avisa y devuelve null en vez de
 * lanzar: el clima sigue funcionando con la clasificación por días secos.
 */
export function leerArchivoNormales(ruta: string = RUTA_NORMALES): ArchivoNormales | null {
    if (!existsSync(ruta)) return null;

    let json: unknown;
    try {
        json = JSON.parse(readFileSync(ruta, "utf8"));
    } catch (error) {
        console.warn(`[clima] no se pudo leer ${ruta}; se continúa sin normales:`, error);
        return null;
    }

    if (!validarArchivoNormales(json)) {
        console.warn(`[clima] ${ruta} no tiene la estructura esperada; se continúa sin normales`);
        return null;
    }
    return json;
}

/**
 * Escribe primero en un temporal de la misma carpeta y luego renombra. Así una
 * interrupción no deja el archivo versionado a medio escribir.
 */
export function escribirArchivoNormales(archivo: ArchivoNormales, ruta: string = RUTA_NORMALES): void {
    if (!validarArchivoNormales(archivo)) {
        throw new Error(`No se escribirá ${ruta}: el archivo de normales no tiene la estructura esperada`);
    }

    mkdirSync(dirname(ruta), { recursive: true });
    const temporal = `${ruta}.${process.pid}.${Date.now()}.tmp`;
    try {
        writeFileSync(temporal, JSON.stringify(archivo, null, 1) + "\n", "utf8");
        renameSync(temporal, ruta);
    } catch (error) {
        try {
            unlinkSync(temporal);
        } catch {
            // El temporal pudo no haberse creado; no ocultar el error original.
        }
        throw error;
    }
}
