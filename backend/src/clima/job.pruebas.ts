import assert from "node:assert/strict";
import { ErrorOpenMeteo } from "./errores";
import {
    INTERVALO_MIN_MS,
    INTERVALO_POR_DEFECTO_MS,
    esperaTrasError,
    iniciarJobClima,
    leerIntervaloJob,
} from "./job";

// Pruebas SIN red ni base de datos:
//   npm run pruebas:clima-job
let ok = 0;
let fallos = 0;

async function prueba(nombre: string, fn: () => void | Promise<void>): Promise<void> {
    try {
        await fn();
        ok++;
        console.log(`  ok    ${nombre}`);
    } catch (error) {
        fallos++;
        console.error(`  FALLA ${nombre}\n        ${error instanceof Error ? error.message : String(error)}`);
    }
}

const silencioso = { log: () => undefined, advertir: () => undefined };

void (async () => {
    await prueba("sin valor usa una hora y acepta enteros mayores", () => {
        assert.equal(leerIntervaloJob(undefined), INTERVALO_POR_DEFECTO_MS);
        assert.equal(leerIntervaloJob("   "), INTERVALO_POR_DEFECTO_MS);
        assert.equal(leerIntervaloJob(String(INTERVALO_MIN_MS)), INTERVALO_MIN_MS);
        assert.equal(leerIntervaloJob(String(2 * INTERVALO_MIN_MS)), 2 * INTERVALO_MIN_MS);
    });

    await prueba("rechaza intervalos menores a una hora o que no son enteros", () => {
        for (const valor of ["0", "60000", "-1", "1.5", "1h", String(INTERVALO_MIN_MS - 1)]) {
            assert.throws(() => leerIntervaloJob(valor), /CLIMA_JOB_INTERVALO_MS/, `se esperaba error para "${valor}"`);
        }
    });

    await prueba("solo un 429 de Open-Meteo pausa dos ciclos", () => {
        assert.equal(esperaTrasError(new ErrorOpenMeteo("HTTP", "429", 429), INTERVALO_MIN_MS), 2 * INTERVALO_MIN_MS);
        assert.equal(esperaTrasError(new ErrorOpenMeteo("HTTP", "500", 500), INTERVALO_MIN_MS), 0);
        assert.equal(esperaTrasError(new ErrorOpenMeteo("TIMEOUT", "timeout"), INTERVALO_MIN_MS), 0);
        assert.equal(esperaTrasError(new Error("otro"), INTERVALO_MIN_MS), 0);
    });

    await prueba("no solapa ejecuciones y se detiene", async () => {
        let ejecuciones = 0;
        let resolver: (() => void) | undefined;
        const job = iniciarJobClima({
            intervaloMs: INTERVALO_MIN_MS,
            ...silencioso,
            ejecutar: () => {
                ejecuciones++;
                return new Promise<void>((r) => {
                    resolver = r;
                });
            },
        });

        const primera = job.ejecutarAhora();
        const segunda = job.ejecutarAhora();
        assert.equal(ejecuciones, 1, "la segunda llamada no debe arrancar otra ejecución");
        resolver?.();
        await Promise.all([primera, segunda]);
        assert.equal(ejecuciones, 1);

        job.detener();
        const tercera = job.ejecutarAhora();
        await tercera;
        assert.equal(ejecuciones, 1, "después de detener no debe ejecutar");
    });

    await prueba("tras un 429 espera dos intervalos antes de reintentar", async () => {
        let ahora = 1_000_000;
        let ejecuciones = 0;
        let fallar = true;
        const job = iniciarJobClima({
            intervaloMs: INTERVALO_MIN_MS,
            ahora: () => ahora,
            ...silencioso,
            ejecutar: async () => {
                ejecuciones++;
                if (fallar) throw new ErrorOpenMeteo("HTTP", "Too many requests", 429);
            },
        });

        await job.ejecutarAhora();
        assert.equal(ejecuciones, 1);

        ahora += INTERVALO_MIN_MS;
        await job.ejecutarAhora();
        assert.equal(ejecuciones, 1, "durante la pausa no debe reintentar");

        fallar = false;
        ahora += 2 * INTERVALO_MIN_MS;
        await job.ejecutarAhora();
        assert.equal(ejecuciones, 2, "al terminar la pausa debe volver a ejecutar");
        job.detener();
    });

    await prueba("un error distinto no bloquea el siguiente ciclo", async () => {
        let ejecuciones = 0;
        let fallar = true;
        const job = iniciarJobClima({
            intervaloMs: INTERVALO_MIN_MS,
            ...silencioso,
            ejecutar: async () => {
                ejecuciones++;
                if (fallar) throw new Error("fallo de red");
            },
        });

        await job.ejecutarAhora();
        fallar = false;
        await job.ejecutarAhora();
        assert.equal(ejecuciones, 2);
        job.detener();
    });

    console.log(`\n${ok} ok, ${fallos} con fallas`);
    process.exit(fallos > 0 ? 1 : 0);
})();
