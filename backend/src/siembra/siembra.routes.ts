import { Router } from "express";
import type { Request, RequestHandler } from "express";
import { requireAuth } from "../auth/auth.middleware";
import type { SiembraDto } from "./siembra.dto";
import { crearSiembra, listarSiembras, SiembraError } from "./siembra.service";
import { validarDatosSiembra } from "./siembra.validacion";
import type { DatosSiembra } from "./siembra.validacion";

// Endpoints de siembra (4-D). El router se crea con dependencias para poder
// probar el contrato HTTP sin MySQL: las pruebas inyectan un requireAuth falso
// o el real con un token firmado, y servicios falsos.

export interface SiembraRouterDeps {
  requireAuth: RequestHandler;
  crear: (usuarioId: number, datos: DatosSiembra) => Promise<SiembraDto>;
  listar: (usuarioId: number) => Promise<SiembraDto[]>;
}

function usuarioIdDe(req: Request): number | null {
  const id = req.usuario?.id;
  return typeof id === "number" && Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function crearSiembraRouter(deps: SiembraRouterDeps): Router {
  const router = Router();

  // POST /siembras: registra una siembra del usuario autenticado.
  // 201: { siembra }
  // 400: { error, detalles }
  // 401: { error, detalles }
  // 404: { error, detalles } si el distrito no existe
  // 500: { error }
  router.post("/", deps.requireAuth, async (req, res) => {
    const usuarioId = usuarioIdDe(req);
    if (usuarioId === null) {
      res.status(401).json({ error: "No autorizado", detalles: "Token sin usuario asociado" });
      return;
    }

    const validacion = validarDatosSiembra(req.body);
    if (!validacion.ok) {
      res.status(400).json({ error: "Datos inválidos", detalles: validacion.detalles });
      return;
    }

    try {
      const siembra = await deps.crear(usuarioId, validacion.datos);
      res.status(201).json({ siembra });
    } catch (error) {
      if (error instanceof SiembraError) {
        res.status(error.status).json({
          error: error.message,
          ...(error.detalles !== undefined && { detalles: error.detalles }),
        });
        return;
      }
      console.error("Error en POST /siembras:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // GET /siembras: solo las siembras del usuario autenticado.
  // 200: { siembras }, ordenadas por creadoEn descendente.
  // 401: { error, detalles }
  // 500: { error }
  router.get("/", deps.requireAuth, async (req, res) => {
    const usuarioId = usuarioIdDe(req);
    if (usuarioId === null) {
      res.status(401).json({ error: "No autorizado", detalles: "Token sin usuario asociado" });
      return;
    }

    try {
      const siembras = await deps.listar(usuarioId);
      res.status(200).json({ siembras });
    } catch (error) {
      console.error("Error en GET /siembras:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  return router;
}

export const siembraRouter = crearSiembraRouter({
  requireAuth,
  crear: crearSiembra,
  listar: listarSiembras,
});
