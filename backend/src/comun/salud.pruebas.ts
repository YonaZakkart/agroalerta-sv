import assert from "node:assert/strict";
import { conTiempoLimite, crearSalud } from "./salud";

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

interface RespuestaFalsa {
  estado: number;
  cuerpo: unknown;
  status(codigo: number): RespuestaFalsa;
  json(cuerpo: unknown): RespuestaFalsa;
}

function respuestaFalsa(): RespuestaFalsa {
  const res: RespuestaFalsa = {
    estado: 200,
    cuerpo: undefined,
    status(codigo) {
      this.estado = codigo;
      return this;
    },
    json(cuerpo) {
      this.cuerpo = cuerpo;
      return this;
    },
  };
  return res;
}

async function ejecutarSalud(
  comprobarBase: () => Promise<unknown>,
  tiempoLimiteMs?: number,
): Promise<RespuestaFalsa> {
  const res = respuestaFalsa();
  await crearSalud(comprobarBase, tiempoLimiteMs)({} as never, res as never, () => undefined);
  return res;
}

void (async () => {
  await prueba("conTiempoLimite devuelve el resultado si termina a tiempo", async () => {
    assert.equal(await conTiempoLimite(Promise.resolve(42), 1_000), 42);
  });

  await prueba("conTiempoLimite rechaza si la promesa no termina", async () => {
    // El temporizador de respaldo mantiene vivo el proceso mientras el límite de
    // 5 ms dispara (el temporizador interno está unref para no retener el server).
    const nuncaTermina = new Promise<never>(() => setTimeout(() => undefined, 1_000));
    await assert.rejects(() => conTiempoLimite(nuncaTermina, 5), /tardó más de 5 ms/);
  });

  await prueba("la salud responde 200 cuando la base contesta", async () => {
    const res = await ejecutarSalud(async () => ({ ok: true }), 1_000);
    assert.equal(res.estado, 200);
    assert.deepEqual(res.cuerpo, { status: "ok", baseDatos: "ok" });
  });

  await prueba("la salud responde 503 cuando la base falla", async () => {
    const original = console.error;
    console.error = () => undefined;
    try {
      const res = await ejecutarSalud(async () => {
        throw new Error("MySQL caído");
      }, 1_000);
      assert.equal(res.estado, 503);
      assert.deepEqual(res.cuerpo, { status: "degradado", baseDatos: "error" });
    } finally {
      console.error = original;
    }
  });

  await prueba("la salud responde 503 cuando la base no contesta a tiempo", async () => {
    const original = console.error;
    console.error = () => undefined;
    try {
      const res = await ejecutarSalud(
        () => new Promise<never>(() => setTimeout(() => undefined, 1_000)),
        5,
      );
      assert.equal(res.estado, 503);
    } finally {
      console.error = original;
    }
  });

  console.log(`\n${ok} ok, ${fallos} con fallas`);
  process.exit(fallos > 0 ? 1 : 0);
})();
