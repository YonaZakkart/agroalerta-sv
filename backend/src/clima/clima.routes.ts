import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { actualizarClima } from "./orquestador";
import { validarDistritoIds } from "./distritos-solicitados";
import { ErrorDistritosNoExisten } from "./puntos";

export const climaRouter = Router();

// POST /clima/actualizar: actualización bajo demanda de la condición climática por distrito (3-D).
// Llama a la misma función que el job, así que ambos comparten el cerrojo de orquestador.ts.
climaRouter.post("/actualizar", requireAuth, async (req, res) => {
  const cuerpo = req.body as { distritoIds?: unknown } | undefined;
  const validacion = validarDistritoIds(cuerpo?.distritoIds);

  if (!validacion.ok) {
    res.status(400).json({ error: "Datos inválidos", detalles: validacion.detalles });
    return;
  }

  try {
    const resultado = await actualizarClima({ distritoIds: validacion.distritoIds });
    res.status(200).json(resultado);
  } catch (error) {
    // Un id inexistente es un error del cliente, no del servidor.
    if (error instanceof ErrorDistritosNoExisten) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.message });
      return;
    }
    console.error("Error en POST /clima/actualizar:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});