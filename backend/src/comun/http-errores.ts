import type { ErrorRequestHandler, RequestHandler } from "express";

/**
 * Express responde 404 con HTML por defecto. El contrato del proyecto es siempre
 * JSON ({ error, detalles }), así que una ruta inexistente también lo respeta.
 */
export const rutaNoEncontrada: RequestHandler = (req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    detalles: `${req.method} ${req.originalUrl}`,
  });
};

/** body-parser marca los JSON mal formados como SyntaxError con status 400. */
function esJsonInvalido(error: unknown): boolean {
  if (!(error instanceof SyntaxError)) return false;
  const detalle = error as SyntaxError & { status?: number; type?: string };
  return detalle.status === 400 || detalle.type === "entity.parse.failed";
}

/**
 * Último middleware: convierte cualquier error no controlado en JSON y evita
 * que el cliente reciba el HTML o la traza interna de Express.
 */
export const manejarErrores: ErrorRequestHandler = (error, _req, res, _next) => {
  if (esJsonInvalido(error)) {
    res.status(400).json({
      error: "Cuerpo JSON inválido",
      detalles: "El cuerpo de la petición no es JSON válido",
    });
    return;
  }

  console.error("Error no controlado:", error);
  res.status(500).json({ error: "Error interno del servidor" });
};
