import { strict as assert } from "node:assert";
import type { ResultadoViabilidad } from "../viabilidad/service";
import { proyectarEstimacion } from "./proyeccion";
import { recomendar } from "./recomendacion";
import type { ViabilidadReferencia } from "./recomendacion";
import type { ContextoEstimacion } from "./recalculo";
import { leerViabilidadReferencia } from "./viabilidad-referencia";

// Pruebas SIN red ni base de datos de 5-C:
//   npm run pruebas:recomendacion
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

function contexto(overrides: Partial<ContextoEstimacion> = {}): ContextoEstimacion {
  return {
    siembraId: 1,
    usuarioId: 7,
    distritoId: 1304,
    cultivo: "MAIZ",
    estado: "SEMBRADO",
    areaMz: 1,
    fechaSiembra: new Date("2026-11-24T00:00:00.000Z"),
    condicion: "INVIERNO_ACEPTABLE",
    nivelSequia: null,
    fechaDatos: new Date("2026-11-23T00:00:00.000Z"),
    actualizadoEn: new Date("2026-11-24T12:00:00.000Z"),
    ...overrides,
  };
}

const viabilidad: ViabilidadReferencia = {
  capa: "Potencial Maíz",
  claseDominante: "Medio",
  porcentaje: 46.3,
  fuente: "CENTA",
  fechaExtraccion: "2026-10-30",
};

async function main(): Promise<void> {
  console.log("recomendar");

  await prueba("invierno aceptable = VERDE y cita clima, factor y proyección", () => {
    const r = recomendar(proyectarEstimacion(contexto()), null);
    assert.equal(r.nivel, "VERDE");
    assert.equal(r.titulo, "Riesgo bajo");
    assert.equal(r.viabilidad, null);
    assert.ok(r.motivos.length >= 4);
    assert.match(r.motivos[0]!, /INVIERNO_ACEPTABLE/);
    assert.match(r.motivos[1]!, /Factor climático aplicado: 1/);
    assert.match(r.motivos[2]!, /Rendimiento estimado: 58\.22 qq\/mz/);
    assert.match(r.motivos[3]!, /Viabilidad CENTA: no disponible/);
  });

  await prueba("sin evaluación climática = AMARILLO, no VERDE", () => {
    const r = recomendar(proyectarEstimacion(contexto({ condicion: null, nivelSequia: null })), null);
    assert.equal(r.nivel, "AMARILLO");
    assert.match(r.motivos[0]!, /sin evaluación/);
    assert.match(r.mensaje, /rendimiento base sin ajuste/);
  });

  await prueba("exceso de lluvia = AMARILLO", () => {
    const r = recomendar(proyectarEstimacion(contexto({ condicion: "EXCESO_LLUVIA" })), null);
    assert.equal(r.nivel, "AMARILLO");
    assert.match(r.motivos[0]!, /EXCESO_LLUVIA/);
    assert.match(r.motivos[1]!, /0\.9/);
  });

  await prueba("sequía débil o moderada = AMARILLO y aclara que no anula el cultivo", () => {
    for (const nivel of ["DEBIL", "MODERADA"] as const) {
      const r = recomendar(proyectarEstimacion(contexto({ condicion: "SEQUIA", nivelSequia: nivel })), null);
      assert.equal(r.nivel, "AMARILLO");
      assert.ok(r.motivos.some((m) => m.includes("no equivale a pérdida total")));
    }
  });

  await prueba("sequía fuerte o severa = ROJO", () => {
    for (const nivel of ["FUERTE", "SEVERA"] as const) {
      const r = recomendar(proyectarEstimacion(contexto({ condicion: "SEQUIA", nivelSequia: nivel })), null);
      assert.equal(r.nivel, "ROJO");
      assert.equal(r.titulo, "Riesgo alto");
      assert.match(r.mensaje, /no equivale a pérdida total/);
    }
  });

  await prueba("sequía sin nivel = AMARILLO", () => {
    const r = recomendar(proyectarEstimacion(contexto({ condicion: "SEQUIA", nivelSequia: null })), null);
    assert.equal(r.nivel, "AMARILLO");
    assert.match(r.motivos[0]!, /SEQUIA/);
    assert.match(r.motivos[1]!, /0\.8/);
  });

  await prueba("la viabilidad de CENTA se cita pero no cambia el semáforo", () => {
    const r = recomendar(
      proyectarEstimacion(contexto({ condicion: "SEQUIA", nivelSequia: "FUERTE" })),
      viabilidad,
    );
    assert.equal(r.nivel, "ROJO");
    assert.deepEqual(r.viabilidad, viabilidad);
    const motivo = r.motivos.find((m) => m.startsWith("Viabilidad CENTA:"))!;
    assert.match(motivo, /Potencial Maíz/);
    assert.match(motivo, /clase dominante Medio/);
    assert.match(motivo, /46\.3% del distrito/);
    assert.match(motivo, /referencia distrital, no un veredicto sobre la parcela/);
    assert.match(motivo, /CENTA/);
    assert.match(motivo, /2026-10-30/);
  });

  await prueba("cada recomendación cita el dato que la origina", () => {
    const r = recomendar(proyectarEstimacion(contexto({ condicion: "SEQUIA", nivelSequia: "MODERADA" })), viabilidad);
    for (const motivo of r.motivos) assert.ok(motivo.trim().length > 0);
    assert.ok(r.motivos.some((m) => m.includes("SEQUIA (MODERADA)")));
    assert.ok(r.motivos.some((m) => m.includes("0.85")));
    assert.ok(r.motivos.some((m) => m.includes("49.49 qq/mz")));
    assert.ok(r.motivos.some((m) => m.includes("1,521.32") || m.includes("1521.32")));
    assert.ok(r.motivos.some((m) => m.includes("46.3%")));
  });

  console.log("leerViabilidadReferencia");

  await prueba("extrae capa, clase dominante, fuente y fecha", async () => {
    const resultado = {
      capas: [
        {
          nombre: "Potencial Maíz",
          claseDominante: { nombre: "Medio", porcentaje: 46.3 },
        },
      ],
      fuente: "CENTA",
      fechaExtraccion: "2026-10-30",
    } as unknown as ResultadoViabilidad;

    const ref = await leerViabilidadReferencia(1304, "MAIZ", async () => resultado);
    assert.deepEqual(ref, viabilidad);
  });

  await prueba("sin capa o sin clase dominante devuelve null", async () => {
    const sinCapas = { capas: [], fuente: null, fechaExtraccion: null } as unknown as ResultadoViabilidad;
    assert.equal(await leerViabilidadReferencia(1304, "MAIZ", async () => sinCapas), null);

    const sinDominante = {
      capas: [{ nombre: "Potencial Maíz", claseDominante: null }],
      fuente: "CENTA",
      fechaExtraccion: null,
    } as unknown as ResultadoViabilidad;
    assert.equal(await leerViabilidadReferencia(1304, "MAIZ", async () => sinDominante), null);
  });

  await prueba("si CENTA falla, devuelve null y no lanza", async () => {
    const original = console.warn;
    console.warn = () => undefined;
    try {
      const ref = await leerViabilidadReferencia(1304, "MAIZ", async () => {
        throw new Error("CENTA caída");
      });
      assert.equal(ref, null);
    } finally {
      console.warn = original;
    }
  });

  console.log(`\n${ok} ok, ${fallos} con fallas`);
  process.exit(fallos > 0 ? 1 : 0);
}

void main();
