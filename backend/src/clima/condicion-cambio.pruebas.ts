import assert from "node:assert/strict";
import { cambioAEvaluada } from "./condicion-cambio";

// Pruebas SIN red ni base de datos:
//   npm run pruebas:condicion
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

prueba("la primera condición evaluada inicia condicionDesde", () => {
  assert.equal(cambioAEvaluada(null, "SEQUIA"), true);
});

prueba("cambiar entre condiciones evaluadas actualiza condicionDesde", () => {
  assert.equal(cambioAEvaluada("SEQUIA", "INVIERNO_ACEPTABLE"), true);
  assert.equal(cambioAEvaluada("INVIERNO_ACEPTABLE", "EXCESO_LLUVIA"), true);
});

prueba("repetir la misma condición no mueve condicionDesde", () => {
  assert.equal(cambioAEvaluada("SEQUIA", "SEQUIA"), false);
  assert.equal(cambioAEvaluada(null, null), false);
});

prueba("entrar a sin evaluación no se trata como cambio", () => {
  assert.equal(cambioAEvaluada("SEQUIA", null), false);
  assert.equal(cambioAEvaluada("INVIERNO_ACEPTABLE", null), false);
  assert.equal(cambioAEvaluada("EXCESO_LLUVIA", null), false);
});

console.log(`\n${ok} ok, ${fallos} con fallas`);
process.exit(fallos > 0 ? 1 : 0);
