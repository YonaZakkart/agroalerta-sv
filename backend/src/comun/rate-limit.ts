import type { Request, RequestHandler, Response } from "express";

// Limitador en memoria de ventana fija. No reemplaza un límite compartido entre
// instancias (ver docs: pendiente de decisión del equipo), pero evita abuso
// accidental o fuerza bruta simple contra un solo proceso. Sin dependencias.

export interface OpcionesRateLimit {
  /** Solicitudes permitidas por clave dentro de la ventana. */
  limite: number;
  ventanaMs: number;
  /** Inyectable para pruebas. */
  ahora?: () => number;
  /** Clave de agrupación; por defecto, la IP del cliente. */
  clave?: (req: Request) => string;
  /** Detalle del 429. */
  mensaje?: string;
}

interface Entrada {
  inicio: number;
  cuenta: number;
}

const MAX_ENTRADAS = 10_000;

function limpiarExpiradas(mapa: Map<string, Entrada>, ahora: number, ventanaMs: number): void {
  for (const [clave, entrada] of mapa) {
    if (ahora - entrada.inicio >= ventanaMs) mapa.delete(clave);
  }
}

function clavePorDefecto(req: Request): string {
  return req.ip ?? req.socket?.remoteAddress ?? "desconocido";
}

export function crearLimitador(opciones: OpcionesRateLimit): RequestHandler {
  const ahora = opciones.ahora ?? (() => Date.now());
  const claveDe = opciones.clave ?? clavePorDefecto;
  const mapa = new Map<string, Entrada>();

  return (req: Request, res: Response, next) => {
    const t = ahora();
    const clave = claveDe(req);

    let entrada = mapa.get(clave);
    if (entrada === undefined || t - entrada.inicio >= opciones.ventanaMs) {
      entrada = { inicio: t, cuenta: 0 };
      mapa.set(clave, entrada);
    }
    entrada.cuenta++;

    const segundosParaReinicio = Math.max(1, Math.ceil((entrada.inicio + opciones.ventanaMs - t) / 1000));
    res.setHeader("RateLimit-Limit", String(opciones.limite));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, opciones.limite - entrada.cuenta)));
    res.setHeader("RateLimit-Reset", String(segundosParaReinicio));

    if (entrada.cuenta > opciones.limite) {
      res.setHeader("Retry-After", String(segundosParaReinicio));
      res.status(429).json({
        error: "Demasiadas solicitudes",
        detalles: opciones.mensaje ?? `Espera ${segundosParaReinicio} segundos antes de reintentar`,
      });
      return;
    }

    if (mapa.size > MAX_ENTRADAS) limpiarExpiradas(mapa, t, opciones.ventanaMs);
    next();
  };
}
