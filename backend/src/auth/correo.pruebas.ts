import { strict as assert } from "node:assert";
import { correoConfigurado, enlaceVerificacion } from "./correo";

let ok = 0;
let fallos = 0;
function prueba(nombre: string, fn: () => void): void {
  try { fn(); ok++; console.log(`  ok    ${nombre}`); }
  catch (e) { fallos++; console.error(`  FALLA ${nombre}\n        ${(e as Error).message}`); }
}

prueba("sin SMTP no está configurado", () => {
  assert.equal(correoConfigurado({} as NodeJS.ProcessEnv), false);
});
prueba("con host, puerto y remitente está configurado", () => {
  assert.equal(correoConfigurado({ SMTP_HOST: "smtp", SMTP_PORT: "587", SMTP_FROM: "a@b.c" } as NodeJS.ProcessEnv), true);
});
prueba("el enlace usa el frontend y el token", () => {
  assert.equal(enlaceVerificacion("abc123", "https://app.example/"), "https://app.example/verificar/abc123");
});

console.log(`\n${ok} ok, ${fallos} con fallas`);
process.exit(fallos > 0 ? 1 : 0);
