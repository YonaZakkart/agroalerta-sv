import assert from "node:assert/strict";
import { DUI_PEPPER_MIN, JWT_SECRET_MIN, duracionJwtValida, validarEntorno } from "./entorno";

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

const valido = {
  JWT_SECRET: "a".repeat(JWT_SECRET_MIN),
  DUI_PEPPER: "b".repeat(DUI_PEPPER_MIN),
  JWT_EXPIRES_IN: "2h",
};

prueba("una configuración completa y válida no reporta errores", () => {
  assert.deepEqual(validarEntorno(valido), []);
  assert.deepEqual(validarEntorno({ ...valido, JWT_EXPIRES_IN: undefined }), []);
  assert.deepEqual(validarEntorno({ ...valido, JWT_EXPIRES_IN: "  " }), []);
});

prueba("reporta JWT_SECRET ausente o corto", () => {
  assert.match(validarEntorno({ ...valido, JWT_SECRET: undefined }).join(" "), /Falta JWT_SECRET/);
  assert.match(validarEntorno({ ...valido, JWT_SECRET: "" }).join(" "), /Falta JWT_SECRET/);
  assert.match(validarEntorno({ ...valido, JWT_SECRET: "corto" }).join(" "), /al menos 32/);
});

prueba("reporta DUI_PEPPER ausente o débil", () => {
  assert.match(validarEntorno({ ...valido, DUI_PEPPER: undefined }).join(" "), /Falta DUI_PEPPER/);
  assert.match(validarEntorno({ ...valido, DUI_PEPPER: "1234" }).join(" "), /al menos 32/);
  assert.match(validarEntorno({ ...valido, DUI_PEPPER: "1234" }).join(" "), /fuerza bruta/);
});

prueba("acepta duraciones válidas y rechaza las inválidas", () => {
  for (const valor of ["7200", "2h", "7d", "30m", "1.5h", "500ms", "1y", " 2h "]) {
    assert.equal(duracionJwtValida(valor), true, valor);
    assert.deepEqual(validarEntorno({ ...valido, JWT_EXPIRES_IN: valor }), [], valor);
  }
  for (const valor of ["abc", "-1", "0", "0h", "2 horas", "1d2h"]) {
    assert.equal(duracionJwtValida(valor), false, valor);
    assert.match(validarEntorno({ ...valido, JWT_EXPIRES_IN: valor }).join(" "), /JWT_EXPIRES_IN/, valor);
  }
});

prueba("en producción rechaza exponer el token de verificación", () => {
  const produccion = { ...valido, NODE_ENV: "production", EXPONER_TOKEN_VERIFICACION: "true" };
  assert.match(validarEntorno(produccion).join(" "), /EXPONER_TOKEN_VERIFICACION/);

  assert.deepEqual(validarEntorno({ ...produccion, EXPONER_TOKEN_VERIFICACION: "false" }), []);
  assert.deepEqual(validarEntorno({ ...produccion, EXPONER_TOKEN_VERIFICACION: undefined }), []);
  // Fuera de producción el flag es válido (es la simulación documentada).
  assert.deepEqual(validarEntorno({ ...valido, NODE_ENV: "development", EXPONER_TOKEN_VERIFICACION: "true" }), []);
});

prueba("acumula todos los errores en una sola pasada", () => {
  const errores = validarEntorno({
    NODE_ENV: "production",
    EXPONER_TOKEN_VERIFICACION: "true",
    JWT_EXPIRES_IN: "siempre",
  });
  assert.equal(errores.length, 4);
});

console.log(`\n${ok} ok, ${fallos} con fallas`);
process.exit(fallos > 0 ? 1 : 0);
