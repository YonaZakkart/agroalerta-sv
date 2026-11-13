import assert from "node:assert/strict";
import { validarDistritoIds } from "./distritos-solicitados";

// Pruebas SIN red ni base de datos:
//   npm run pruebas:clima-validacion
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

prueba("sin distritoIds actualiza todos los distritos", () => {
  assert.deepEqual(validarDistritoIds(undefined), { ok: true, distritoIds: undefined });
});

prueba("acepta una lista de enteros positivos", () => {
  assert.deepEqual(validarDistritoIds([1304, 1318]), { ok: true, distritoIds: [1304, 1318] });
});

prueba("rechaza una lista vacía en vez de consultar y fallar con 500", () => {
  const r = validarDistritoIds([]);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.detalles, /no puede estar vacío/);
});

prueba("rechaza valores que no son listas", () => {
  for (const valor of [null, 1304, "1304", {}, true]) {
    const r = validarDistritoIds(valor);
    assert.equal(r.ok, false, `se esperaba error para ${JSON.stringify(valor)}`);
  }
});

prueba("rechaza ids inválidos dentro de la lista", () => {
  for (const valor of [[0], [-1], [1.5], ["1304"], [Number.NaN], [Number.MAX_SAFE_INTEGER + 1], [1304, null]]) {
    const r = validarDistritoIds(valor);
    assert.equal(r.ok, false, `se esperaba error para ${JSON.stringify(valor)}`);
  }
});

console.log(`\n${ok} ok, ${fallos} con fallas`);
process.exit(fallos > 0 ? 1 : 0);
