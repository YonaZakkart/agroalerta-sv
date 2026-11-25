import { strict as assert } from "node:assert";
import { aEstimacionDto } from "./reporte.dto";
import type { DecimalLike, EstimacionPersistida } from "./reporte.dto";

// Pruebas SIN red ni base de datos del DTO de reporte (5-D):
//   npm run pruebas:reporte
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

function decimal(valor: number): DecimalLike {
  return { toNumber: () => valor };
}

function fila(overrides: Partial<EstimacionPersistida> = {}): EstimacionPersistida {
  return {
    id: 1,
    siembraId: 10,
    usuarioId: 7,
    distritoId: 1304,
    cultivo: "MAIZ",
    estado: "SEMBRADO",
    areaMz: decimal(1),
    fechaSiembra: new Date("2026-11-24T00:00:00.000Z"),
    condicion: "SEQUIA",
    nivelSequia: "MODERADA",
    fechaDatos: new Date("2026-11-23T00:00:00.000Z"),
    actualizadoEn: new Date("2026-11-24T12:00:00.000Z"),
    rendimientoBaseQqPorMz: decimal(58.22),
    factorClimatico: decimal(0.85),
    rendimientoEstimadoQqPorMz: decimal(49.49),
    produccionEstimadaQq: decimal(49.49),
    precioVentaQqUsd: decimal(30.74),
    ingresoEstimadoUsd: decimal(1521.32),
    nivelRiesgo: "AMARILLO",
    titulo: "Riesgo medio",
    mensaje: "La sequía es moderada.",
    motivos: ["Condición climática: SEQUIA (MODERADA).", "Factor: 0.85."],
    viabilidad: {
      capa: "Potencial Maíz",
      claseDominante: "Medio",
      porcentaje: 46.3,
      fuente: "CENTA",
      fechaExtraccion: "2026-10-30",
    },
    supuestos: [
      {
        clave: "rendimiento_base",
        valor: 58.22,
        unidad: "qq/mz",
        tipo: "OFICIAL",
        fuente: "MAG",
        fecha: "2024-02-21",
      },
    ],
    calculadoEn: new Date("2026-11-24T18:00:00.000Z"),
    ...overrides,
  };
}

console.log("aEstimacionDto");

prueba("convierte Decimal, fechas y JSON al contrato público", () => {
  const dto = aEstimacionDto(fila());
  assert.equal(dto.id, 1);
  assert.equal(dto.siembraId, 10);
  assert.equal(dto.distritoId, 1304);
  assert.equal(dto.areaMz, 1);
  assert.equal(dto.fechaSiembra, "2026-11-24");
  assert.equal(dto.fechaDatos, "2026-11-23");
  assert.equal(dto.actualizadoEn, "2026-11-24T12:00:00.000Z");
  assert.equal(dto.calculadoEn, "2026-11-24T18:00:00.000Z");
  assert.equal(dto.rendimientoBaseQqPorMz, 58.22);
  assert.equal(dto.factorClimatico, 0.85);
  assert.equal(dto.produccionEstimadaQq, 49.49);
  assert.equal(dto.ingresoEstimadoUsd, 1521.32);
  assert.equal(dto.nivelRiesgo, "AMARILLO");
  assert.deepEqual(dto.motivos, ["Condición climática: SEQUIA (MODERADA).", "Factor: 0.85."]);
  assert.equal(dto.viabilidad?.claseDominante, "Medio");
  assert.equal(dto.supuestos.length, 1);
});

prueba("mantiene null en condición, nivel y viabilidad ausentes", () => {
  const dto = aEstimacionDto(
    fila({
      condicion: null,
      nivelSequia: null,
      fechaDatos: null,
      actualizadoEn: null,
      viabilidad: null,
    }),
  );
  assert.equal(dto.condicion, null);
  assert.equal(dto.nivelSequia, null);
  assert.equal(dto.fechaDatos, null);
  assert.equal(dto.actualizadoEn, null);
  assert.equal(dto.viabilidad, null);
});

prueba("un JSON inválido no rompe el DTO", () => {
  const dto = aEstimacionDto(
    fila({
      motivos: "no es arreglo",
      supuestos: null,
      viabilidad: { capa: 1 },
    }),
  );
  assert.deepEqual(dto.motivos, []);
  assert.deepEqual(dto.supuestos, []);
  assert.equal(dto.viabilidad, null);
});

prueba("descarta motivos que no son texto", () => {
  const dto = aEstimacionDto(fila({ motivos: ["ok", 42, null, "también"] }));
  assert.deepEqual(dto.motivos, ["ok", "también"]);
});

console.log(`\n${ok} ok, ${fallos} con fallas`);
process.exit(fallos > 0 ? 1 : 0);
