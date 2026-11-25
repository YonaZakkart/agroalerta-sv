import { Router } from "express";
import type { Request, RequestHandler } from "express";
import { requireAuth } from "../auth/auth.middleware";
import type { EstimacionDto } from "./reporte.dto";
import { listarEstimaciones } from "./reporte.service";

// Endpoint de lectura del reporte (5-D). Solo el dueño ve sus estimaciones.
// El router se crea con dependencias para probar el contrato HTTP sin MySQL.

export interface EstimacionesRouterDeps {
  requireAuth: RequestHandler;
  listar: (usuarioId: number) => Promise<EstimacionDto[]>;
}

function usuarioIdDe(req: Request): number | null {
  const id = req.usuario?.id;
  return typeof id === "number" && Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function crearEstimacionesRouter(deps: EstimacionesRouterDeps): Router {
  const router = Router();

  // GET /estimaciones: historial completo del usuario, más reciente primero.
  // La última estimación de una siembra es la primera fila de esa siembra.
  router.get("/", deps.requireAuth, async (req, res) => {
    const usuarioId = usuarioIdDe(req);
    if (usuarioId === null) {
      res.status(401).json({ error: "No autorizado", detalles: "Token sin usuario asociado" });
      return;
    }

    try {
      const estimaciones = await deps.listar(usuarioId);
      res.status(200).json({ estimaciones });
    } catch (error) {
      console.error("Error en GET /estimaciones:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  return router;
}

export const estimacionesRouter = crearEstimacionesRouter({
  requireAuth,
  listar: listarEstimaciones,
});
