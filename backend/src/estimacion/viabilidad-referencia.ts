import type { Cultivo } from "../generated/prisma/enums";
import { consultarViabilidad } from "../viabilidad/service";
import type { ResultadoViabilidad } from "../viabilidad/service";
import type { ViabilidadReferencia } from "./recomendacion";

// Lectura de la viabilidad de CENTA como referencia distrital para 5-C.
// No decide el semáforo: solo aporta contexto. Si falla, la recomendación
// sigue funcionando sin viabilidad.

const CAPA_POR_CULTIVO: Record<Cultivo, string> = {
  MAIZ: "potencial_maiz",
  FRIJOL: "potencial_frijol",
  MAICILLO: "potencial_maicillo",
};

type ConsultarViabilidad = (
  distritoId: number,
  opciones: { capa: string },
) => Promise<ResultadoViabilidad>;

const consultarReal: ConsultarViabilidad = (distritoId, opciones) =>
  consultarViabilidad(distritoId, opciones);

export async function leerViabilidadReferencia(
  distritoId: number,
  cultivo: Cultivo,
  consultar: ConsultarViabilidad = consultarReal,
): Promise<ViabilidadReferencia | null> {
  try {
    const resultado = await consultar(distritoId, { capa: CAPA_POR_CULTIVO[cultivo] });
    const capa = resultado.capas[0];
    if (!capa || !capa.claseDominante) return null;
    return {
      capa: capa.nombre,
      claseDominante: capa.claseDominante.nombre,
      porcentaje: capa.claseDominante.porcentaje,
      fuente: resultado.fuente,
      fechaExtraccion: resultado.fechaExtraccion,
    };
  } catch (error) {
    console.warn(`[estimacion] viabilidad no disponible para el distrito ${distritoId}:`, error);
    return null;
  }
}
