import assert from "node:assert/strict";
import { crearLimitador } from "./rate-limit";

// Pruebas SIN red ni base de datos:
//   npm run pruebas:http-seguridad
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

interface RespuestaFalsa {
  cabeceras: Record<string, string>;
  estado: number;
  cuerpo: unknown;
  setHeader(nombre: string, valor: string): void;
  status(codigo: number): RespuestaFalsa;
  json(cuerpo: unknown): RespuestaFalsa;
}

function respuestaFalsa(): RespuestaFalsa {
  const res: RespuestaFalsa = {
    cabeceras: {},
    estado: 200,
    cuerpo: undefined,
    setHeader(nombre, valor) {
      this.cabeceras[nombre] = valor;
    },
    status(codigo) {
      this.estado = codigo;
      return this;
    },
    json(cuerpo) {
      this.cuerpo = cuerpo;
      return this;
    },
  };
  return res;
}

function peticion(ip: string) {
  return { ip, socket: { remoteAddress: ip } } as never;
}

function ejecutar(
  limitador: ReturnType<typeof crearLimitador>,
  ip: string,
): { res: RespuestaFalsa; siguiente: boolean } {
  const res = respuestaFalsa();
  let siguiente = false;
  limitador(peticion(ip) as never, res as never, () => {
    siguiente = true;
  });
  return { res, siguiente };
}

prueba("permite hasta el límite y luego responde 429 con Retry-After", () => {
  const limitador = crearLimitador({ limite: 2, ventanaMs: 60_000, ahora: () => 1_000 });

  const primera = ejecutar(limitador, "10.0.0.1");
  const segunda = ejecutar(limitador, "10.0.0.1");
  const tercera = ejecutar(limitador, "10.0.0.1");

  assert.equal(primera.siguiente, true);
  assert.equal(segunda.siguiente, true);
  assert.equal(segunda.res.cabeceras["RateLimit-Remaining"], "0");
  assert.equal(tercera.siguiente, false);
  assert.equal(tercera.res.estado, 429);
  assert.equal(tercera.res.cabeceras["Retry-After"], "60");
  assert.match(JSON.stringify(tercera.res.cuerpo), /Demasiadas solicitudes/);
});

prueba("cada clave tiene su propio contador", () => {
  const limitador = crearLimitador({ limite: 1, ventanaMs: 60_000, ahora: () => 1_000 });
  assert.equal(ejecutar(limitador, "10.0.0.1").siguiente, true);
  assert.equal(ejecutar(limitador, "10.0.0.1").siguiente, false);
  assert.equal(ejecutar(limitador, "10.0.0.2").siguiente, true);
});

prueba("la ventana se reinicia al pasar el tiempo", () => {
  let ahora = 1_000;
  const limitador = crearLimitador({ limite: 1, ventanaMs: 60_000, ahora: () => ahora });
  assert.equal(ejecutar(limitador, "10.0.0.1").siguiente, true);
  assert.equal(ejecutar(limitador, "10.0.0.1").siguiente, false);

  ahora += 60_000;
  const reiniciada = ejecutar(limitador, "10.0.0.1");
  assert.equal(reiniciada.siguiente, true);
  assert.equal(reiniciada.res.cabeceras["RateLimit-Remaining"], "0");
});

prueba("acepta una clave personalizada", () => {
  const limitador = crearLimitador({
    limite: 1,
    ventanaMs: 60_000,
    ahora: () => 1_000,
    clave: (req) => `cuenta:${(req as unknown as { body?: { correo?: string } }).body?.correo ?? "sin-correo"}`,
  });

  const primera = respuestaFalsa();
  limitador(
    { ip: "10.0.0.1", socket: {}, body: { correo: "a@example.com" } } as never,
    primera as never,
    () => undefined,
  );
  const segunda = respuestaFalsa();
  limitador(
    { ip: "10.0.0.1", socket: {}, body: { correo: "b@example.com" } } as never,
    segunda as never,
    () => undefined,
  );
  assert.equal(segunda.estado, 200, "otra cuenta no comparte el contador");
});

console.log(`\n${ok} ok, ${fallos} con fallas`);
process.exit(fallos > 0 ? 1 : 0);
