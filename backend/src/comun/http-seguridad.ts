import type { NextFunction, Request, RequestHandler, Response } from "express";

// Endurecimiento HTTP sin dependencias nuevas: CORS opt-in por variable de
// entorno, cabeceras de seguridad básicas y un límite de cuerpo explícito.
// El backend solo sirve JSON; la CSP es responsabilidad del frontend.

export const LIMITE_CUERPO = "100kb";

const CABECERAS: ReadonlyArray<[string, string]> = [
  ["X-Content-Type-Options", "nosniff"],
  ["X-Frame-Options", "DENY"],
  ["Referrer-Policy", "no-referrer"],
  ["Cross-Origin-Resource-Policy", "same-site"],
];

/** CORS_ORIGINS es una lista separada por comas; vacío = no habilitar CORS. */
export function leerOrigenesPermitidos(valor: string | undefined): string[] {
  return (valor ?? "")
    .split(",")
    .map((origen) => origen.trim())
    .filter((origen) => origen !== "");
}

export const cabecerasSeguridad: RequestHandler = (_req, res, next) => {
  for (const [nombre, valor] of CABECERAS) res.setHeader(nombre, valor);
  next();
};

const METODOS = "GET, POST, OPTIONS";
const ENCABEZADOS = "Authorization, Content-Type";

/**
 * Devuelve un middleware CORS. Sin orígenes configurados no agrega cabeceras
 * (el navegador bloquea el acceso cruzado); con "*" permite cualquiera.
 */
export function crearCors(permitidos: readonly string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const origen = req.headers.origin;
    const permitido = origen !== undefined && (permitidos.includes("*") || permitidos.includes(origen));

    if (permitido) {
      res.setHeader("Access-Control-Allow-Origin", permitidos.includes("*") ? "*" : origen);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", METODOS);
      res.setHeader("Access-Control-Allow-Headers", ENCABEZADOS);
      res.setHeader("Access-Control-Max-Age", "600");
    }

    if (req.method === "OPTIONS" && origen !== undefined) {
      if (permitido) {
        res.status(204).end();
        return;
      }
      res.status(403).json({ error: "Origen no permitido" });
      return;
    }

    next();
  };
}
