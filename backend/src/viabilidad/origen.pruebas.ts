import assert from "node:assert/strict";
import { origenDeFilas } from "./origen";

// Pruebas SIN red ni base de datos:
//   npm run pruebas:viabilidad
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

const d = (fecha: string): Date => new Date(`${fecha}T00:00:00.000Z`);

prueba("sin filas no hay fuente ni fecha", () => {
  assert.deepEqual(origenDeFilas([]), { fuente: null, fechaExtraccion: null });
});

prueba("la fuente acompaña a la fecha más reciente, no a la primera fila", () => {
  const origen = origenDeFilas([
    { fuente: "CENTA 2020", fechaExtraccion: d("2020-01-01") },
    { fuente: "CENTA 2024", fechaExtraccion: d("2024-06-30") },
    { fuente: "CENTA 2022", fechaExtraccion: d("2022-03-15") },
  ]);
  assert.equal(origen.fuente, "CENTA 2024");
  assert.equal(origen.fechaExtraccion?.toISOString(), "2024-06-30T00:00:00.000Z");
});

prueba("en empate conserva la primera fila para que el resultado sea estable", () => {
  const origen = origenDeFilas([
    { fuente: "Primera", fechaExtraccion: d("2024-06-30") },
    { fuente: "Segunda", fechaExtraccion: d("2024-06-30") },
  ]);
  assert.equal(origen.fuente, "Primera");
});

prueba("una sola fila se reporta tal cual", () => {
  const origen = origenDeFilas([{ fuente: "CENTA", fechaExtraccion: d("2023-11-01") }]);
  assert.equal(origen.fuente, "CENTA");
  assert.equal(origen.fechaExtraccion?.toISOString().slice(0, 10), "2023-11-01");
});

console.log(`\n${ok} ok, ${fallos} con fallas`);
process.exit(fallos > 0 ? 1 : 0);
