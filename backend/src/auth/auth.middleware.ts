import type { NextFunction, Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { verificarToken } from "./jwt";
import type { UsuarioAutenticado } from "./jwt";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const match = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? "");
  if (!match) {
    res.status(401).json({ mensaje: "Falta el encabezado Authorization: Bearer <token>" });
    return;
  }

  try {
    req.usuario = verificarToken(match[1]!);
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ mensaje: "Sesión expirada, inicia sesión nuevamente" });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ mensaje: "Token inválido" });
      return;
    }
    console.error("Error de configuración en requireAuth:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}