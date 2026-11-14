import assert from "node:assert/strict";
import { aCondicionDto, validarIdDistrito } from "./condicion.dto";
import type { CondicionPersistida } from "./condicion.dto";

// Pruebas SIN red ni base de datos:
//   npm run pruebas:clima-endpoint
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

const decimal = (n: number): { toNumber(): number } => ({ toNumber: () => n });

prueba("acepta solo ids de distrito con dígitos y enteros positivos", () => {
  assert.equal(validarIdDistrito("1304"), 1304);
  assert.equal(validarIdDistrito(" 1304 "), null);
  assert.equal(validarIdDistrito("1304.0"), null);
  assert.equal(validarIdDistrito("0"), null);
  assert.equal(validarIdDistrito("-1"), null);
  assert.equal(validarIdDistrito("abc"), null);
  assert.equal(validarIdDistrito("99999999999999999999"), null);
  assert.equal(validarIdDistrito(1304), null);
  assert.equal(validarIdDistrito(undefined), null);
});

prueba("convierte los Decimal y las fechas al contrato público", () => {
  const fila: CondicionPersistida = {
    condicion: "SEQUIA",
    nivelSequia: "MODERADA",
    diasSecosConsecutivos: 12,
    acumulado30Mm: decimal(42.5),
    normal30Mm: decimal(100),
    razon30: decimal(0.425),
    fechaDatos: new Date("2026-11-12T00:00:00.000Z"),
    actualizadoEn: new Date("2026-11-13T15:04:05.000Z"),
    condicionDesde: new Date("2026-11-10T08:00:00.000Z"),
  };

  assert.deepEqual(aCondicionDto(fila), {
    condicion: "SEQUIA",
    nivelSequia: "MODERADA",
    diasSecosConsecutivos: 12,
    acumulado30Mm: 42.5,
    normal30Mm: 100,
    razon30: 0.425,
    fechaDatos: "2026-11-12",
    actualizadoEn: "2026-11-13T15:04:05.000Z",
    condicionDesde: "2026-11-10T08:00:00.000Z",
  });
});

prueba("mantiene null en sin evaluación y en los campos sin dato", () => {
  const fila: CondicionPersistida = {
    condicion: null,
    nivelSequia: null,
    diasSecosConsecutivos: 0,
    acumulado30Mm: null,
    normal30Mm: null,
    razon30: null,
    fechaDatos: new Date("2026-11-12T00:00:00.000Z"),
    actualizadoEn: new Date("2026-11-13T00:00:00.000Z"),
    condicionDesde: null,
  };

  const dto = aCondicionDto(fila);
  assert.equal(dto.condicion, null);
  assert.equal(dto.acumulado30Mm, null);
  assert.equal(dto.normal30Mm, null);
  assert.equal(dto.razon30, null);
  assert.equal(dto.condicionDesde, null);
});

console.log(`\n${ok} ok, ${fallos} con fallas`);
process.exit(fallos > 0 ? 1 : 0);
