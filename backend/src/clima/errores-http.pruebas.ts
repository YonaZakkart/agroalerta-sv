import assert from "node:assert/strict";
import { ErrorOpenMeteo } from "./errores";
import type { TipoErrorOpenMeteo } from "./errores";
import { respuestaErrorClima } from "./errores-http";

// Pruebas SIN red ni base de datos:
//   npm run pruebas:clima-errores
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

prueba("429 se traduce a 429 con Retry-After de una hora", () => {
  const r = respuestaErrorClima(new ErrorOpenMeteo("HTTP", "Too many requests", 429));
  assert.equal(r?.estado, 429);
  assert.equal(r?.reintentarEnSegundos, 3600);
  assert.match(r?.cuerpo.error ?? "", /Límite/);
});

prueba("timeout, red, formato y HTTP no-429 son 502", () => {
  const tipos: TipoErrorOpenMeteo[] = ["TIMEOUT", "RED", "FORMATO"];
  for (const tipo of tipos) {
    const r = respuestaErrorClima(new ErrorOpenMeteo(tipo, "fallo"));
    assert.equal(r?.estado, 502, tipo);
  }
  assert.equal(respuestaErrorClima(new ErrorOpenMeteo("HTTP", "500", 500))?.estado, 502);
});

prueba("coordenada o parámetro inválido es un problema del servidor", () => {
  assert.equal(respuestaErrorClima(new ErrorOpenMeteo("COORDENADA_INVALIDA", "sin coordenadas"))?.estado, 500);
  assert.equal(respuestaErrorClima(new ErrorOpenMeteo("PARAMETRO_INVALIDO", "días"))?.estado, 500);
});

prueba("un error que no es de Open-Meteo no se traduce", () => {
  assert.equal(respuestaErrorClima(new Error("base de datos caída")), null);
  assert.equal(respuestaErrorClima("texto"), null);
});

console.log(`\n${ok} ok, ${fallos} con fallas`);
process.exit(fallos > 0 ? 1 : 0);
