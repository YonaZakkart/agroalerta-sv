import type { RequestHandler, Response } from "express";

// Comprobación de salud con verificación real de la base. /health/live solo
// confirma que el proceso responde; /health (readiness) devuelve 503 si MySQL
// no contesta, para detectar caídas antes de la primera operación de negocio.

export const TIEMPO_LIMITE_SALUD_MS = 2_000;

/** Espera la promesa como máximo ms; si no termina, rechaza. */
export async function conTiempoLimite<T>(promesa: Promise<T>, ms: number): Promise<T> {
  let temporizador: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promesa,
      new Promise<never>((_resolver, rechazar) => {
        temporizador = setTimeout(
          () => rechazar(new Error(`La comprobación tardó más de ${ms} ms`)),
          ms,
        );
        temporizador.unref?.();
      }),
    ]);
  } finally {
    if (temporizador !== undefined) clearTimeout(temporizador);
  }
}

function responder(res: Response, codigo: 200 | 503, cuerpo: Record<string, string>): void {
  res.status(codigo).json(cuerpo);
}

export function crearSalud(
  comprobarBase: () => Promise<unknown>,
  tiempoLimiteMs: number = TIEMPO_LIMITE_SALUD_MS,
): RequestHandler {
  return async (_req, res) => {
    try {
      await conTiempoLimite(comprobarBase(), tiempoLimiteMs);
      responder(res, 200, { status: "ok", baseDatos: "ok" });
    } catch (error) {
      console.error("[salud] la base de datos no respondió:", error);
      responder(res, 503, { status: "degradado", baseDatos: "error" });
    }
  };
}
