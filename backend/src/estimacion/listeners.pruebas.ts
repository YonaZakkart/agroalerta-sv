import { strict as assert } from "node:assert";
import { EventEmitter } from "node:events";
import { EVENTOS } from "../events/types";
import type {
  CondicionClimaticaActualizadaPayload,
  SiembraRegistradaPayload,
} from "../events/types";
import { registrarListenersEstimacion } from "./listeners";
import type { ListenersEstimacionDeps } from "./listeners";

// Pruebas SIN red ni base de datos de los listeners de 5-A:
//   npm run pruebas:listeners
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

const tick = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

const payloadSiembra: SiembraRegistradaPayload = {
  siembraId: 42,
  usuarioId: 7,
  distritoId: 1304,
  cultivo: "MAIZ",
  areaMz: 3.5,
  fecha: new Date("2026-11-24T00:00:00.000Z"),
};

const payloadClima: CondicionClimaticaActualizadaPayload = {
  distritoId: 1304,
  condicion: "SEQUIA",
  condicionAnterior: null,
  precipitacionAcumuladaMm: 10,
  fecha: new Date("2026-11-24T00:00:00.000Z"),
};

async function main(): Promise<void> {
  await prueba("registra los dos listeners y reacciona a SiembraRegistrada", async () => {
    const bus = new EventEmitter();
    const llamadas: string[] = [];
    const deps: ListenersEstimacionDeps = {
      recalcularSiembra: async (id) => {
        llamadas.push(`siembra:${id}`);
      },
      recalcularDistrito: async (id) => {
        llamadas.push(`distrito:${id}`);
      },
      registrarError: () => undefined,
    };

    registrarListenersEstimacion(deps, bus);
    bus.emit(EVENTOS.SIEMBRA_REGISTRADA, payloadSiembra);
    await tick();
    assert.deepEqual(llamadas, ["siembra:42"]);
  });

  await prueba("reacciona a CondicionClimaticaActualizada con el distrito afectado", async () => {
    const bus = new EventEmitter();
    const llamadas: string[] = [];
    const deps: ListenersEstimacionDeps = {
      recalcularSiembra: async (id) => {
        llamadas.push(`siembra:${id}`);
      },
      recalcularDistrito: async (id) => {
        llamadas.push(`distrito:${id}`);
      },
      registrarError: () => undefined,
    };

    registrarListenersEstimacion(deps, bus);
    bus.emit(EVENTOS.CONDICION_CLIMATICA_ACTUALIZADA, payloadClima);
    await tick();
    assert.deepEqual(llamadas, ["distrito:1304"]);
  });

  await prueba("un evento distinto no dispara ningún recálculo", async () => {
    const bus = new EventEmitter();
    let llamadas = 0;
    const deps: ListenersEstimacionDeps = {
      recalcularSiembra: async () => {
        llamadas++;
      },
      recalcularDistrito: async () => {
        llamadas++;
      },
      registrarError: () => undefined,
    };

    registrarListenersEstimacion(deps, bus);
    bus.emit("OtroEvento", {});
    await tick();
    assert.equal(llamadas, 0);
  });

  await prueba("un rechazo del recálculo se registra y no se propaga", async () => {
    const bus = new EventEmitter();
    const errores: { evento: string; error: unknown }[] = [];
    const deps: ListenersEstimacionDeps = {
      recalcularSiembra: async () => {
        throw new Error("fallo asíncrono");
      },
      recalcularDistrito: async () => undefined,
      registrarError: (evento, error) => {
        errores.push({ evento, error });
      },
    };

    registrarListenersEstimacion(deps, bus);
    bus.emit(EVENTOS.SIEMBRA_REGISTRADA, payloadSiembra);
    await tick();
    assert.equal(errores.length, 1);
    assert.equal(errores[0]!.evento, EVENTOS.SIEMBRA_REGISTRADA);
    assert.match((errores[0]!.error as Error).message, /fallo asíncrono/);
  });

  await prueba("un error síncrono del recálculo también se registra", async () => {
    const bus = new EventEmitter();
    const errores: { evento: string; error: unknown }[] = [];
    const deps: ListenersEstimacionDeps = {
      recalcularSiembra: () => {
        throw new Error("fallo síncrono");
      },
      recalcularDistrito: async () => undefined,
      registrarError: (evento, error) => {
        errores.push({ evento, error });
      },
    };

    registrarListenersEstimacion(deps, bus);
    bus.emit(EVENTOS.SIEMBRA_REGISTRADA, payloadSiembra);
    await tick();
    assert.equal(errores.length, 1);
    assert.match((errores[0]!.error as Error).message, /fallo síncrono/);
  });

  await prueba("un fallo del clima no impide el recálculo de una siembra", async () => {
    const bus = new EventEmitter();
    const llamadas: string[] = [];
    const deps: ListenersEstimacionDeps = {
      recalcularSiembra: async () => {
        llamadas.push("siembra");
      },
      recalcularDistrito: async () => {
        throw new Error("clima roto");
      },
      registrarError: () => undefined,
    };

    registrarListenersEstimacion(deps, bus);
    bus.emit(EVENTOS.CONDICION_CLIMATICA_ACTUALIZADA, payloadClima);
    bus.emit(EVENTOS.SIEMBRA_REGISTRADA, payloadSiembra);
    await tick();
    assert.deepEqual(llamadas, ["siembra"]);
  });

  console.log(`\n${ok} ok, ${fallos} con fallas`);
  process.exit(fallos > 0 ? 1 : 0);
}

void main();
