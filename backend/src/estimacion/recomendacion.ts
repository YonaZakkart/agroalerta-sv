import type { ProyeccionEstimacion } from "./proyeccion";

// Recomendaciones por riesgo (5-C). Función pura: recibe la proyección de 5-B
// y una referencia opcional de viabilidad de CENTA. El semáforo se decide solo
// con la condición climática y el factor aplicado; la viabilidad de CENTA se
// cita como referencia distrital, nunca como veredicto sobre la parcela.

export type NivelRiesgo = "VERDE" | "AMARILLO" | "ROJO";

export interface ViabilidadReferencia {
  capa: string;
  claseDominante: string;
  porcentaje: number;
  fuente: string | null;
  fechaExtraccion: string | null;
}

export interface Recomendacion {
  nivel: NivelRiesgo;
  titulo: string;
  mensaje: string;
  /** Cada motivo cita el dato que lo origina. */
  motivos: string[];
  viabilidad: ViabilidadReferencia | null;
}

function nivelDe(proyeccion: ProyeccionEstimacion): NivelRiesgo {
  if (proyeccion.condicion === "SEQUIA") {
    if (proyeccion.nivelSequia === "FUERTE" || proyeccion.nivelSequia === "SEVERA") {
      return "ROJO";
    }
    return "AMARILLO";
  }
  if (proyeccion.condicion === "EXCESO_LLUVIA") return "AMARILLO";
  if (proyeccion.condicion === "INVIERNO_ACEPTABLE") return "VERDE";
  // null = sin evaluación climática: no hay señal de riesgo, pero tampoco una
  // condición evaluada; se muestra como riesgo medio, no como verde.
  return "AMARILLO";
}

function textoDe(proyeccion: ProyeccionEstimacion): { titulo: string; mensaje: string } {
  if (proyeccion.condicion === "SEQUIA") {
    if (proyeccion.nivelSequia === "FUERTE" || proyeccion.nivelSequia === "SEVERA") {
      return {
        titulo: "Riesgo alto",
        mensaje:
          "La sequía del distrito es fuerte o severa. Revisa el cultivo y aplica manejo; la sequía meteorológica no equivale a pérdida total.",
      };
    }
    return {
      titulo: "Riesgo medio",
      mensaje:
        "La sequía del distrito es débil o moderada. El rendimiento se reduce, pero no se anula; mantén el seguimiento del cultivo.",
    };
  }
  if (proyeccion.condicion === "EXCESO_LLUVIA") {
    return {
      titulo: "Riesgo medio",
      mensaje:
        "La condición del distrito es exceso de lluvia. El rendimiento se ajusta a la baja; revisa drenajes y enfermedades.",
    };
  }
  if (proyeccion.condicion === "INVIERNO_ACEPTABLE") {
    return {
      titulo: "Riesgo bajo",
      mensaje:
        "La condición climática del distrito es favorable. Mantén el seguimiento normal del cultivo.",
    };
  }
  return {
    titulo: "Riesgo medio",
    mensaje:
      "No hay una evaluación climática reciente para el distrito. La proyección usa el rendimiento base sin ajuste; vuelve a consultar cuando haya datos.",
  };
}

function motivoClima(proyeccion: ProyeccionEstimacion): string {
  if (proyeccion.condicion === null) {
    return "Condición climática: sin evaluación; no hay fecha de datos.";
  }
  const nivel = proyeccion.nivelSequia === null ? "" : ` (${proyeccion.nivelSequia})`;
  const fecha = proyeccion.fechaDatos?.toISOString().slice(0, 10) ?? "sin fecha";
  return `Condición climática: ${proyeccion.condicion}${nivel}; datos al ${fecha}.`;
}

function motivoViabilidad(viabilidad: ViabilidadReferencia | null): string {
  if (viabilidad === null) {
    return "Viabilidad CENTA: no disponible para este distrito/cultivo.";
  }
  const fuente = viabilidad.fuente ?? "fuente no indicada";
  const fecha = viabilidad.fechaExtraccion ?? "sin fecha";
  return (
    `Viabilidad CENTA: ${viabilidad.capa}, clase dominante ${viabilidad.claseDominante} ` +
    `(${viabilidad.porcentaje}% del distrito; fuente ${fuente}, extracción ${fecha}). ` +
    "Es referencia distrital, no un veredicto sobre la parcela."
  );
}

export function recomendar(
  proyeccion: ProyeccionEstimacion,
  viabilidad: ViabilidadReferencia | null,
): Recomendacion {
  const nivel = nivelDe(proyeccion);
  const { titulo, mensaje } = textoDe(proyeccion);

  const motivos = [
    motivoClima(proyeccion),
    `Factor climático aplicado: ${proyeccion.factorClimatico} (supuesto declarado).`,
    `Rendimiento estimado: ${proyeccion.rendimientoEstimadoQqPorMz} qq/mz; ` +
      `producción: ${proyeccion.produccionEstimadaQq} qq; ` +
      `ingreso estimado: $${proyeccion.ingresoEstimadoUsd.toFixed(2)}.`,
    motivoViabilidad(viabilidad),
  ];

  if (proyeccion.condicion === "SEQUIA") {
    motivos.push("La sequía meteorológica no equivale a pérdida total del cultivo.");
  }

  return { nivel, titulo, mensaje, motivos, viabilidad };
}
