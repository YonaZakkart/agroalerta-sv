import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "./auth.middleware";

export const perfilRouter = Router();

/**
 * GET /auth/yo
 * Retorna el perfil del usuario autenticado.
 * Requiere: Authorization: Bearer <token> válido.
 * 200: { success: true, usuario: { id, nombres, apellidos, correo, distrito, verificado, fechaRegistro } }
 * 401: { error, detalles } (token ausente/inválido/expirado, o usuario del token inexistente)
 * 500: { error }
 */
perfilRouter.get("/yo", requireAuth, async (req, res) => {
  try {
    const usuarioId = req.usuario?.id;

    if (!usuarioId) {
      res.status(401).json({ error: "No autorizado", detalles: "Token sin usuario asociado" });
      return;
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        correo: true,
        distrito: true,
        verificado: true,
        fechaRegistro: true,
      },
    });

    if (!usuario) {
      res.status(401).json({ error: "No autorizado", detalles: "El usuario asociado al token ya no existe" });
      return;
    }

    res.status(200).json({ success: true, usuario });
  } catch (error) {
    console.error("Error en GET /auth/yo:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});