import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
import { manejarErrores, rutaNoEncontrada } from "./http-errores";

// Pruebas SIN red externa ni base de datos: levanta una app mínima en un puerto
// efímero y comprueba el contrato HTTP. Se ejecuta con `npm run pruebas:http`.
type Respuesta = { status: number; tipo: string; cuerpo: unknown };

async function main(): Promise<void> {
  const app = express();
  app.use(express.json());
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.post("/eco", (req, res) => {
    res.json({ recibido: req.body });
  });
  app.use(rutaNoEncontrada);
  app.use(manejarErrores);

  const servidor = app.listen(0);
  await new Promise<void>((resolve) => servidor.once("listening", resolve));
  const puerto = (servidor.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${puerto}`;

  async function pedir(ruta: string, init?: RequestInit): Promise<Respuesta> {
    const respuesta = await fetch(`${base}${ruta}`, init);
    const tipo = respuesta.headers.get("content-type") ?? "";
    const cuerpo: unknown = tipo.includes("application/json") ? await respuesta.json() : await respuesta.text();
    return { status: respuesta.status, tipo, cuerpo };
  }

  let ok = 0;
  let fallos = 0;
  async function prueba(nombre: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
      ok++;
      console.log(`  ok    ${nombre}`);
    } catch (error) {
      fallos++;
      console.error(`  FALLA ${nombre}\n        ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  try {
    await prueba("una ruta inexistente responde 404 en JSON", async () => {
      const r = await pedir("/no-existe");
      assert.equal(r.status, 404);
      assert.match(r.tipo, /application\/json/);
      assert.deepEqual(r.cuerpo, {
        error: "Ruta no encontrada",
        detalles: "GET /no-existe",
      });
    });

    await prueba("un JSON mal formado responde 400 en JSON", async () => {
      const r = await pedir("/eco", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"distritoIds": [1304',
      });
      assert.equal(r.status, 400);
      assert.match(r.tipo, /application\/json/);
      assert.deepEqual(r.cuerpo, {
        error: "Cuerpo JSON inválido",
        detalles: "El cuerpo de la petición no es JSON válido",
      });
    });

    await prueba("las rutas válidas siguen funcionando", async () => {
      const salud = await pedir("/health");
      assert.equal(salud.status, 200);
      assert.deepEqual(salud.cuerpo, { status: "ok" });

      const eco = await pedir("/eco", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ distritoIds: [1304] }),
      });
      assert.equal(eco.status, 200);
      assert.deepEqual(eco.cuerpo, { recibido: { distritoIds: [1304] } });
    });
  } finally {
    await new Promise<void>((resolve, reject) =>
      servidor.close((error) => (error ? reject(error) : resolve())),
    );
  }

  console.log(`\n${ok} ok, ${fallos} con fallas`);
  process.exit(fallos > 0 ? 1 : 0);
}

void main();
