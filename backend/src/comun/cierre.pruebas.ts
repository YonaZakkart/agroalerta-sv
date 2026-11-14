import assert from "node:assert/strict";
import { crearManejadorCierre } from "./cierre";

// Pruebas SIN red ni base de datos:
//   npm run pruebas:http-seguridad
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

interface Registro {
  pasos: string[];
  codigos: number[];
  mensajes: string[];
}

function crearDobles(sobrescribir: Partial<{
  cerrarServidor: () => Promise<void>;
  desconectarBase: () => Promise<void>;
}> = {}) {
  const registro: Registro = { pasos: [], codigos: [], mensajes: [] };
  const cerrar = crearManejadorCierre({
    detenerJob: () => registro.pasos.push("job"),
    cerrarServidor: async () => {
      registro.pasos.push("servidor");
      await sobrescribir.cerrarServidor?.();
    },
    desconectarBase: async () => {
      registro.pasos.push("base");
      await sobrescribir.desconectarBase?.();
    },
    salir: (codigo) => registro.codigos.push(codigo),
    log: (mensaje) => registro.mensajes.push(mensaje),
  });
  return { cerrar, registro };
}

void (async () => {
  await prueba("detiene el job, cierra el servidor y desconecta la base en orden", async () => {
    const { cerrar, registro } = crearDobles();
    await cerrar("SIGTERM");
    assert.deepEqual(registro.pasos, ["job", "servidor", "base"]);
    assert.deepEqual(registro.codigos, [0]);
    assert.match(registro.mensajes.join(" "), /cierre completado/);
  });

  await prueba("es idempotente ante señales repetidas", async () => {
    const { cerrar, registro } = crearDobles();
    await Promise.all([cerrar("SIGTERM"), cerrar("SIGINT")]);
    assert.deepEqual(registro.pasos, ["job", "servidor", "base"]);
    assert.deepEqual(registro.codigos, [0]);
  });

  await prueba("si cerrar el servidor falla, sale con 1", async () => {
    const { cerrar, registro } = crearDobles({
      cerrarServidor: async () => {
        throw new Error("socket colgado");
      },
    });
    await cerrar("SIGTERM");
    assert.deepEqual(registro.codigos, [1]);
    assert.match(registro.mensajes.join(" "), /socket colgado/);
  });

  await prueba("si la base no desconecta, sale con 1", async () => {
    const { cerrar, registro } = crearDobles({
      desconectarBase: async () => {
        throw new Error("pool ocupado");
      },
    });
    await cerrar("SIGTERM");
    assert.deepEqual(registro.codigos, [1]);
  });

  await prueba("fuerza la salida si el cierre se excede del tiempo límite", async () => {
    const registro: Registro = { pasos: [], codigos: [], mensajes: [] };
    const cerrar = crearManejadorCierre({
      cerrarServidor: () =>
        new Promise<void>(() => {
          // Mantiene vivo el proceso mientras el límite de 5 ms dispara.
          setTimeout(() => undefined, 1_000);
        }),
      desconectarBase: async () => undefined,
      salir: (codigo) => registro.codigos.push(codigo),
      log: (mensaje) => registro.mensajes.push(mensaje),
      tiempoLimiteMs: 5,
    });

    void cerrar("SIGTERM");
    await new Promise((resolver) => setTimeout(resolver, 50));
    assert.deepEqual(registro.codigos, [1]);
    assert.match(registro.mensajes.join(" "), /se fuerza la salida/);
  });

  console.log(`\n${ok} ok, ${fallos} con fallas`);
  process.exit(fallos > 0 ? 1 : 0);
})();
