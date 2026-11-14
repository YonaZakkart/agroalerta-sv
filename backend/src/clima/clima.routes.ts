import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { prisma } from "../config/prisma";
import { actualizarClima } from "./orquestador";
import { validarDistritoIds } from "./distritos-solicitados";
import { ErrorDistritosNoExisten } from "./puntos";
import { aCondicionDto, validarIdDistrito } from "./condicion.dto";
import { ATRIBUCION, OPEN_METEO } from "./config";

export const climaRouter = Router();

// GET /clima/distritos/:id: última condición guardada de un distrito (3-D).
// No consulta Open-Meteo: sirve para pintar el estado sin esperar la red.
// Incluye la atribución porque la interfaz muestra datos derivados de Open-Meteo.
climaRouter.get("/distritos/:id", requireAuth, async (req, res) => {
  const id = validarIdDistrito(req.params.id);
  if (id === null) {
    res.status(400).json({
      error: "Datos inválidos",
      detalles: "El id del distrito debe ser un entero positivo",
    });
    return;
  }

  try {
    const distrito = await prisma.distrito.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        municipio: { select: { id: true, nombre: true } },
        condicion: true,
      },
    });

    if (!distrito) {
      res.status(404).json({ error: "No encontrado", detalles: "Distrito no encontrado" });
      return;
    }

    res.status(200).json({
      distrito: {
        id: distrito.id,
        nombre: distrito.nombre,
        municipio: distrito.municipio,
      },
      // null = todavía no se ha clasificado (o está fuera de época y se guardó sin evaluación).
      condicion: distrito.condicion ? aCondicionDto(distrito.condicion) : null,
      fuente: OPEN_METEO.fuente,
      atribucion: ATRIBUCION,
    });
  } catch (error) {
    console.error("Error en GET /clima/distritos/:id:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

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