import { Router } from "express";
import { prisma } from "../config/prisma";
import { SELECT_DISTRITO } from "../auth/distrito.select";

export const distritosRouter = Router();

/**
 * GET /distritos
 * Catálogo público de los 26 distritos de Morazán (el registro ocurre antes del login).
 * 200: { distritos: [{ id, nombre, municipio: { id, nombre } }] }, ordenado por nombre normalizado.
 * 500: { error }
 */
distritosRouter.get("/", async (_req, res) => {
    try {
        const distritos = await prisma.distrito.findMany({
            orderBy: { nombreNormalizado: "asc" },
            ...SELECT_DISTRITO,
        });
        res.status(200).json({ distritos });
    } catch (error) {
        console.error("Error en GET /distritos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});