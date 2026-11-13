import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { actualizarClima } from "./orquestador";

export const climaRouter = Router();

// POST /clima/actualizar: actualización bajo demanda de la condición climática por distrito (3-D).
// Llama a la misma función que el job, así que ambos comparten el cerrojo de orquestador.ts.
climaRouter.post("/actualizar", requireAuth, async (req, res) => {
  const cuerpo = req.body as { distritoIds?: unknown } | undefined;
  const distritoIds = cuerpo?.distritoIds;

  if (distritoIds !== undefined) {
    if (!Array.isArray(distritoIds) || !distritoIds.every((id) => Number.isSafeInteger(id) && id > 0)) {
      res.status(400).json({
        error: "Datos inválidos",
        detalles: "distritoIds debe ser una lista de enteros positivos",
      });
      return;
    }
  }

  try {
    const resultado = await actualizarClima({
      distritoIds: distritoIds as number[] | undefined,
    });
    res.status(200).json(resultado);
  } catch (error) {
    console.error("Error en POST /clima/actualizar:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});