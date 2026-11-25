import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
import { requireAuth } from "../auth/auth.middleware";
import { firmarToken } from "../auth/jwt";
import { manejarErrores } from "../comun/http-errores";
import { crearSiembraRouter } from "./siembra.routes";
import { SiembraError } from "./siembra.service";
import type { DatosSiembra } from "./siembra.validacion";
import { datosValidos, siembraDto } from "./siembra.pruebas.ayudas";

// Pruebas del contrato HTTP de 4-D, SIN MySQL: el router recibe servicios falsos
// y el requireAuth real con un token firmado. Se ejecuta con
// `npm run pruebas:siembra-http`.
type Respuesta = { status: number; tipo: string; cuerpo: unknown };

async function main(): Promise<void> {
  process.env.JWT_SECRET = "x".repeat(32);
  const token = firmarToken({ id: 7, correo: "prueba@agroalerta.sv" });

  let crearLlamado: { usuarioId: number; datos: DatosSiembra } | null = null;
  let listarLlamado: number | null = null;
  let fallarListar = false;

  // El compilador no ve las asignaciones hechas dentro de los servicios falsos;
  // esta función devuelve el valor con su tipo declarado.
  function ultimaCreacion(): { usuarioId: number; datos: DatosSiembra } | null {
    return crearLlamado;
  }

  const app = express();
  app.use(express.json());
  app.use(
    "/siembras",
    crearSiembraRouter({
      requireAuth,
      crear: async (usuarioId, datos) => {
        crearLlamado = { usuarioId, datos };
        if (datos.distritoId === 9999) {
          throw new SiembraError(404, "No encontrado", ["Distrito no encontrado"]);
        }
        return siembraDto();
      },
      listar: async (usuarioId) => {
        listarLlamado = usuarioId;
        if (fallarListar) throw new Error("base caída");
        return [siembraDto()];
      },
    }),
  );
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

  function autorizado(extra: RequestInit = {}): RequestInit {
    return {
      ...extra,
      headers: {
        ...(extra.headers ?? {}),
        authorization: `Bearer ${token}`,
      },
    };
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
    await prueba("POST /siembras sin token responde 401", async () => {
      crearLlamado = null;
      const r = await pedir("/siembras", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(datosValidos()),
      });
      assert.equal(r.status, 401);
      assert.match(r.tipo, /application\/json/);
      assert.equal((r.cuerpo as { error: string }).error, "No autorizado");
      assert.equal(crearLlamado, null);
    });

    await prueba("POST /siembras con token y cuerpo inválido responde 400", async () => {
      crearLlamado = null;
      const r = await pedir(
        "/siembras",
        autorizado({
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...datosValidos(), areaMz: 0, cultivo: "SORGO" }),
        }),
      );
      assert.equal(r.status, 400);
      const cuerpo = r.cuerpo as { error: string; detalles: string[] };
      assert.equal(cuerpo.error, "Datos inválidos");
      assert.ok(Array.isArray(cuerpo.detalles));
      assert.equal(cuerpo.detalles.length, 2);
      assert.equal(crearLlamado, null);
    });

    await prueba("POST /siembras con token y cuerpo válido responde 201", async () => {
      crearLlamado = null;
      const datos = datosValidos();
      const r = await pedir(
        "/siembras",
        autorizado({
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(datos),
        }),
      );
      assert.equal(r.status, 201);
      const cuerpo = r.cuerpo as { siembra: { id: number } };
      assert.equal(cuerpo.siembra.id, 1);
      assert.equal(ultimaCreacion()?.usuarioId, 7);
      assert.equal(ultimaCreacion()?.datos.distritoId, 1304);
      assert.equal(ultimaCreacion()?.datos.cultivo, "MAIZ");
    });

    await prueba("POST /siembras con distrito inexistente responde 404", async () => {
      const r = await pedir(
        "/siembras",
        autorizado({
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(datosValidos({ distritoId: 9999 })),
        }),
      );
      assert.equal(r.status, 404);
      assert.deepEqual(r.cuerpo, {
        error: "No encontrado",
        detalles: ["Distrito no encontrado"],
      });
    });

    await prueba("GET /siembras sin token responde 401", async () => {
      listarLlamado = null;
      const r = await pedir("/siembras");
      assert.equal(r.status, 401);
      assert.equal(listarLlamado, null);
    });

    await prueba("GET /siembras con token devuelve solo las del usuario", async () => {
      listarLlamado = null;
      const r = await pedir("/siembras", autorizado());
      assert.equal(r.status, 200);
      const cuerpo = r.cuerpo as { siembras: { id: number }[] };
      assert.equal(cuerpo.siembras.length, 1);
      assert.equal(cuerpo.siembras[0]?.id, 1);
      assert.equal(listarLlamado, 7);
    });

    await prueba("GET /siembras con fallo del servicio responde 500", async () => {
      fallarListar = true;
      const original = console.error;
      console.error = () => undefined;
      try {
        const r = await pedir("/siembras", autorizado());
        assert.equal(r.status, 500);
        assert.deepEqual(r.cuerpo, { error: "Error interno del servidor" });
      } finally {
        console.error = original;
        fallarListar = false;
      }
    });

    await prueba("un JSON mal formado responde 400 JSON", async () => {
      const r = await pedir(
        "/siembras",
        autorizado({
          method: "POST",
          headers: { "content-type": "application/json" },
          body: '{"distritoId": 1304',
        }),
      );
      assert.equal(r.status, 400);
      assert.match(r.tipo, /application\/json/);
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
