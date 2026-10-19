import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { consultarViabilidad, ViabilidadError } from "./service";

export const viabilidadRouter = Router();

const SOLO_DIGITOS = /^\d+$/;

function textoOpcional(valor: unknown): string | undefined {
  if (typeof valor !== "string") return undefined;
  const limpio = valor.trim();
  return limpio === "" ? undefined : limpio;
}

function mensajePorEstado(status: number): string {
  if (status === 400) return "Datos inválidos";
  if (status === 404) return "No encontrado";
  return "Error de consulta";
}

viabilidadRouter.get("/distritos/:id", requireAuth, async (req, res) => {
  const idTexto = String(req.params.id ?? "");

  if (!SOLO_DIGITOS.test(idTexto) || Number(idTexto) <= 0) {
    res.status(400).json({
      error: "Datos inválidos",
      detalles: "El id del distrito debe ser un entero positivo",
    });
    return;
  }

  if (Array.isArray(req.query.capa) || Array.isArray(req.query.cultivo)) {
    res.status(400).json({
      error: "Datos inválidos",
      detalles: "capa y cultivo no pueden repetirse",
    });
    return;
  }

  const capa = textoOpcional(req.query.capa);
  const cultivo = textoOpcional(req.query.cultivo);

  try {
    const resultado = await consultarViabilidad(Number(idTexto), {
      capa,
      cultivo,
    });
    res.status(200).json(resultado);
  } catch (error) {
    if (error instanceof ViabilidadError) {
      res.status(error.status).json({
        error: mensajePorEstado(error.status),
        detalles: error.message,
      });
      return;
    }
    console.error("Error en GET /viabilidad/distritos/:id:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});