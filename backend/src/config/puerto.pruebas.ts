import assert from "node:assert/strict";
import { leerPuerto } from "./puerto";

// Pruebas SIN red ni base de datos:
//   npm run pruebas:config
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

prueba("sin PORT usa el valor por defecto", () => {
  assert.equal(leerPuerto(undefined, 3000), 3000);
});

prueba("PORT vacío o con espacios usa el valor por defecto", () => {
  assert.equal(leerPuerto("", 3000), 3000);
  assert.equal(leerPuerto("   ", 4000), 4000);
});

prueba("convierte un puerto válido de string a number", () => {
  assert.equal(leerPuerto("3000", 3000), 3000);
  assert.equal(leerPuerto(" 8080 ", 3000), 8080);
  assert.equal(leerPuerto("1", 3000), 1);
  assert.equal(leerPuerto("65535", 3000), 65535);
});

prueba("rechaza valores que no son un puerto TCP", () => {
  for (const valor of ["0", "65536", "-1", "abc", "3.5", "3000abc", "1e3", " 3000 ms"]) {
    assert.throws(() => leerPuerto(valor, 3000), /PORT debe/, `se esperaba error para "${valor}"`);
  }
});

console.log(`\n${ok} ok, ${fallos} con fallas`);
process.exit(fallos > 0 ? 1 : 0);
