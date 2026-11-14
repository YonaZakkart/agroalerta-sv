import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ATRIBUCION } from "./config";
import { clavesDelAnio, VENTANA_DIAS } from "./normales";
import { escribirArchivoNormales, leerArchivoNormales, validarArchivoNormales } from "./normales-archivo";
import type { ArchivoNormales } from "./normales-archivo";
import type { TablaNormal30 } from "./normales";

// Pruebas SIN red ni base de datos, con archivos temporales:
//   npm run pruebas:normales
let ok = 0;
let fallos = 0;

function prueba(nombre: string, fn: () => void): void {
    try {
        fn();
        ok++;
        console.log(`  ok    ${nombre}`);
    } catch (error) {
        fallos++;
        console.error(`  FALLA ${nombre}\n        ${error instanceof Error ? error.message : String(error)}`);
    }
}

function tabla(): TablaNormal30 {
    const t: TablaNormal30 = {};
    for (const clave of clavesDelAnio()) t[clave] = 30;
    return t;
}

function archivoValido(): ArchivoNormales {
    return {
        fuente: "Open-Meteo Historical Weather API",
        atribucion: ATRIBUCION,
        modelo: "era5",
        fechaGeneracion: "2026-11-13",
        periodo: { desde: "2001-01-01", hasta: "2020-12-31" },
        ventanaDias: VENTANA_DIAS,
        minimoAnios: 10,
        unidad: "mm",
        distritos: {
            "1304": {
                nombre: "Chilanga",
                celdaModelo: { latitud: 13.71667, longitud: -88.11667, elevacionM: 250 },
                normal30: tabla(),
            },
        },
    };
}

const dir = mkdtempSync(join(tmpdir(), "agroalerta-normales-"));

try {
    prueba("un archivo ausente se trata como sin normales", () => {
        assert.equal(leerArchivoNormales(join(dir, "no-existe.json")), null);
    });

    prueba("escribe y lee un archivo válido", () => {
        const ruta = join(dir, "validas.json");
        escribirArchivoNormales(archivoValido(), ruta);
        const leido = leerArchivoNormales(ruta);
        assert.equal(leido?.unidad, "mm");
        assert.equal(leido?.distritos["1304"]?.normal30["07-15"], 30);
        assert.deepEqual(readdirSync(dir).filter((f) => f.endsWith(".tmp")), []);
    });

    prueba("un JSON corrupto no lanza y devuelve null", () => {
        const ruta = join(dir, "corrupto.json");
        writeFileSync(ruta, "{ esto no es json", "utf8");
        const original = console.warn;
        console.warn = () => undefined;
        try {
            assert.equal(leerArchivoNormales(ruta), null);
        } finally {
            console.warn = original;
        }
    });

    prueba("una estructura inválida se rechaza sin lanzar al leer", () => {
        const ruta = join(dir, "invalido.json");
        writeFileSync(ruta, JSON.stringify({ ...archivoValido(), unidad: "inch" }), "utf8");
        const original = console.warn;
        console.warn = () => undefined;
        try {
            assert.equal(leerArchivoNormales(ruta), null);
        } finally {
            console.warn = original;
        }
    });

    prueba("validarArchivoNormales detecta periodos, tablas y celdas inválidas", () => {
        assert.equal(validarArchivoNormales(archivoValido()), true);
        assert.equal(validarArchivoNormales(null), false);
        assert.equal(validarArchivoNormales({ ...archivoValido(), periodo: { desde: "2020-01-01", hasta: "2001-01-01" } }), false);
        assert.equal(validarArchivoNormales({ ...archivoValido(), ventanaDias: 20 }), false);
        assert.equal(validarArchivoNormales({ ...archivoValido(), minimoAnios: 0 }), false);
        assert.equal(
            validarArchivoNormales({
                ...archivoValido(),
                distritos: { "1304": { nombre: "Chilanga", celdaModelo: { latitud: NaN, longitud: -88 }, normal30: tabla() } },
            }),
            false,
        );
        assert.equal(validarArchivoNormales({ ...archivoValido(), distritos: { abc: {} } }), false);
    });

    prueba("no escribe un archivo inválido", () => {
        const ruta = join(dir, "no-se-escribe.json");
        assert.throws(() => escribirArchivoNormales({ ...archivoValido(), unidad: "inch" } as never, ruta), /no tiene la estructura/);
        assert.equal(readdirSync(dir).includes("no-se-escribe.json"), false);
    });

    prueba("el contenido escrito termina en salto de línea y es JSON parseable", () => {
        const ruta = join(dir, "formato.json");
        escribirArchivoNormales(archivoValido(), ruta);
        const texto = readFileSync(ruta, "utf8");
        assert.ok(texto.endsWith("\n"));
        assert.equal(JSON.parse(texto).distritos["1304"].nombre, "Chilanga");
    });
} finally {
    rmSync(dir, { recursive: true, force: true });
}

console.log(`\n${ok} ok, ${fallos} con fallas`);
process.exit(fallos > 0 ? 1 : 0);
