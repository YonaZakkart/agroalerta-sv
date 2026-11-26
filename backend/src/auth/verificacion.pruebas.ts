import { strict as assert } from "node:assert";
import { verificacionAutomaticaActiva } from "./verificacion";

let ok = 0;
let fallos = 0;
function prueba(nombre: string, fn: () => void): void {
  try { fn(); ok++; console.log(`  ok    ${nombre}`); }
  catch (e) { fallos++; console.error(`  FALLA ${nombre}\n        ${(e as Error).message}`); }
}

prueba("sin variable no verifica automáticamente", () => {
  assert.equal(verificacionAutomaticaActiva({} as NodeJS.ProcessEnv), false);
});
prueba("solo el valor exacto true activa la verificación", () => {
  assert.equal(verificacionAutomaticaActiva({ VERIFICACION_AUTOMATICA: "true" } as NodeJS.ProcessEnv), true);
  assert.equal(verificacionAutomaticaActiva({ VERIFICACION_AUTOMATICA: "TRUE" } as NodeJS.ProcessEnv), false);
  assert.equal(verificacionAutomaticaActiva({ VERIFICACION_AUTOMATICA: "1" } as NodeJS.ProcessEnv), false);
});

console.log(`\n${ok} ok, ${fallos} con fallas`);
process.exit(fallos > 0 ? 1 : 0);
