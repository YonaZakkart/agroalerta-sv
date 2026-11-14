import assert from "node:assert/strict";
import { cabecerasSeguridad, crearCors, leerOrigenesPermitidos } from "./http-seguridad";

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
  terminado: boolean;
  setHeader(nombre: string, valor: string): void;
  status(codigo: number): RespuestaFalsa;
  json(cuerpo: unknown): RespuestaFalsa;
  end(): RespuestaFalsa;
}

function respuestaFalsa(): RespuestaFalsa {
  const res: RespuestaFalsa = {
    cabeceras: {},
    estado: 200,
    cuerpo: undefined,
    terminado: false,
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
    end() {
      this.terminado = true;
      return this;
    },
  };
  return res;
}

function peticion(metodo: string, origen?: string) {
  return { method: metodo, headers: origen === undefined ? {} : { origin: origen } } as never;
}

prueba("lee CORS_ORIGINS separado por comas y descarta vacíos", () => {
  assert.deepEqual(leerOrigenesPermitidos(undefined), []);
  assert.deepEqual(leerOrigenesPermitidos(""), []);
  assert.deepEqual(leerOrigenesPermitidos(" , "), []);
  assert.deepEqual(leerOrigenesPermitidos("http://localhost:4200, https://app.example.com"), [
    "http://localhost:4200",
    "https://app.example.com",
  ]);
});

prueba("agrega las cabeceras de seguridad", () => {
  const res = respuestaFalsa();
  let siguiente = false;
  cabecerasSeguridad(peticion("GET") as never, res as never, () => {
    siguiente = true;
  });
  assert.equal(siguiente, true);
  assert.equal(res.cabeceras["X-Content-Type-Options"], "nosniff");
  assert.equal(res.cabeceras["X-Frame-Options"], "DENY");
  assert.equal(res.cabeceras["Referrer-Policy"], "no-referrer");
  assert.equal(res.cabeceras["Cross-Origin-Resource-Policy"], "same-site");
});

prueba("sin orígenes configurados no habilita CORS ni bloquea peticiones normales", () => {
  const cors = crearCors([]);
  const res = respuestaFalsa();
  let siguiente = false;
  cors(peticion("GET", "http://localhost:4200") as never, res as never, () => {
    siguiente = true;
  });
  assert.equal(siguiente, true);
  assert.equal(res.cabeceras["Access-Control-Allow-Origin"], undefined);
});

prueba("permite un origen de la lista y responde el preflight", () => {
  const cors = crearCors(["http://localhost:4200"]);
  const res = respuestaFalsa();
  cors(peticion("OPTIONS", "http://localhost:4200") as never, res as never, () => {
    throw new Error("el preflight permitido no debe continuar");
  });
  assert.equal(res.estado, 204);
  assert.equal(res.terminado, true);
  assert.equal(res.cabeceras["Access-Control-Allow-Origin"], "http://localhost:4200");
  assert.match(res.cabeceras["Access-Control-Allow-Headers"] ?? "", /Authorization/);
});

prueba("rechaza el preflight de un origen ajeno sin cabeceras CORS", () => {
  const cors = crearCors(["http://localhost:4200"]);
  const res = respuestaFalsa();
  cors(peticion("OPTIONS", "https://malicioso.example") as never, res as never, () => {
    throw new Error("no debe continuar");
  });
  assert.equal(res.estado, 403);
  assert.equal(res.cabeceras["Access-Control-Allow-Origin"], undefined);
});

prueba("el comodín permite cualquier origen", () => {
  const cors = crearCors(["*"]);
  const res = respuestaFalsa();
  let siguiente = false;
  cors(peticion("GET", "https://cualquiera.example") as never, res as never, () => {
    siguiente = true;
  });
  assert.equal(siguiente, true);
  assert.equal(res.cabeceras["Access-Control-Allow-Origin"], "*");
});

console.log(`\n${ok} ok, ${fallos} con fallas`);
process.exit(fallos > 0 ? 1 : 0);
