import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
import { requireAuth } from "../auth/auth.middleware";
import { firmarToken } from "../auth/jwt";
import { manejarErrores } from "../comun/http-errores";
import { crearEstimacionesRouter } from "./estimaciones.routes";
import type { EstimacionDto } from "./reporte.dto";

// Pruebas del contrato HTTP de GET /estimaciones, SIN MySQL:
//   npm run pruebas:estimaciones-http
type Respuesta = { status: number; tipo: string; cuerpo: unknown };

const estimacion: EstimacionDto = {
  id: 1,
  siembraId: 10,
  distritoId: 1304,
  cultivo: "MAIZ",
  estado: "SEMBRADO",
  areaMz: 1,
  fechaSiembra: "2026-11-24",
  condicion: "INVIERNO_ACEPTABLE",
  nivelSequia: null,
  fechaDatos: "2026-11-23",
  actualizadoEn: "2026-11-24T12:00:00.000Z",
  rendimientoBaseQqPorMz: 58.22,
  factorClimatico: 1,
  rendimientoEstimadoQqPorMz: 58.22,
  produccionEstimadaQq: 58.22,
  precioVentaQqUsd: 30.74,
  ingresoEstimadoUsd: 1789.68,
  nivelRiesgo: "VERDE",
  titulo: "Riesgo bajo",
  mensaje: "Condición favorable.",
  motivos: ["Condición climática: INVIERNO_ACEPTABLE."],
  viabilidad: null,
  supuestos: [],
  calculadoEn: "2026-11-24T18:00:00.000Z",
};

async function main(): Promise<void> {
  process.env.JWT_SECRET = "x".repeat(32);
  const token = firmarToken({ id: 7, correo: "prueba@agroalerta.sv" });

  let listarLlamado: number | null = null;
  let fallar = false;

  const app = express();
  app.use(
    "/estimaciones",
    crearEstimacionesRouter({
      requireAuth,
      listar: async (usuarioId) => {
        listarLlamado = usuarioId;
        if (fallar) throw new Error("base caída");
        return [estimacion];
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
    await prueba("GET /estimaciones sin token responde 401", async () => {
      listarLlamado = null;
      const r = await pedir("/estimaciones");
      assert.equal(r.status, 401);
      assert.equal((r.cuerpo as { error: string }).error, "No autorizado");
      assert.equal(listarLlamado, null);
    });

    await prueba("GET /estimaciones con token devuelve solo las del usuario", async () => {
      listarLlamado = null;
      const r = await pedir("/estimaciones", {
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(r.status, 200);
      const cuerpo = r.cuerpo as { estimaciones: EstimacionDto[] };
      assert.equal(cuerpo.estimaciones.length, 1);
      assert.equal(cuerpo.estimaciones[0]?.id, 1);
      assert.equal(cuerpo.estimaciones[0]?.nivelRiesgo, "VERDE");
      assert.equal(listarLlamado, 7);
    });

    await prueba("un fallo del servicio responde 500", async () => {
      fallar = true;
      const original = console.error;
      console.error = () => undefined;
      try {
        const r = await pedir("/estimaciones", {
          headers: { authorization: `Bearer ${token}` },
        });
        assert.equal(r.status, 500);
        assert.deepEqual(r.cuerpo, { error: "Error interno del servidor" });
      } finally {
        console.error = original;
        fallar = false;
      }
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
