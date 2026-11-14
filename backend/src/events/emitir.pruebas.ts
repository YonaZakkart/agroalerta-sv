import assert from "node:assert/strict";
import { bus } from "./bus";
import { emitirSeguro } from "./emitir";

// Pruebas SIN red ni base de datos:
//   npm run pruebas:eventos
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

prueba("un listener que lanza no interrumpe al emisor", () => {
  const evento = "PruebaListenerQueFalla";
  const original = console.error;
  console.error = () => undefined;

  const listener = (): void => {
    throw new Error("listener roto");
  };
  bus.on(evento, listener);

  try {
    assert.equal(emitirSeguro(evento, { dato: 1 }), false);
  } finally {
    bus.off(evento, listener);
    console.error = original;
  }
});

prueba("sin listeners y con listeners sanos devuelve true", () => {
  assert.equal(emitirSeguro("PruebaSinListeners", {}), true);

  const recibidos: unknown[] = [];
  const listener = (payload: unknown): void => {
    recibidos.push(payload);
  };
  bus.on("PruebaListenerSano", listener);
  try {
    assert.equal(emitirSeguro("PruebaListenerSano", { dato: 2 }), true);
    assert.deepEqual(recibidos, [{ dato: 2 }]);
  } finally {
    bus.off("PruebaListenerSano", listener);
  }
});

console.log(`\n${ok} ok, ${fallos} con fallas`);
process.exit(fallos > 0 ? 1 : 0);
