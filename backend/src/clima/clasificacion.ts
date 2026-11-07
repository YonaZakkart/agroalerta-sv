import type { CondicionClimatica } from "../events/types";
import { UMBRALES } from "./umbrales";
import { resumirLluvia, type DiaLluvia, type ResumenLluvia } from "./resumen-lluvia";

export type NivelSequia = "DEBIL" | "MODERADA" | "FUERTE" | "SEVERA";
export type Criterio = "DIAS_SECOS" | "DEFICIT_30D" | "EXCESO_30D";

export interface EntradaClasificacion {
  fecha: string; // AAAA-MM-DD: último día completo
  diasSecosConsecutivos: number;
  acumulado30Mm: number | null;
  normal30Mm: number | null;
  // Condición vigente; solo se usa para el margen anti-oscilación.
  condicionAnterior?: CondicionClimatica | null;
}

export interface ResultadoClasificacion {
  condicion: CondicionClimatica | null; // null = sin evaluación
  nivelSequia: NivelSequia | null; // solo por días secos (Info_Datos_Clima.md, sección 3)
  razon30: number | null; // acumulado30 / normal30, 3 decimales
  criterios: Criterio[]; // qué reglas dispararon la condición
  sinEvaluar: "FUERA_DE_EPOCA" | "SIN_DATOS" | null;
}

export function enEpocaLluviosa(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new RangeError(`Fecha inválida: ${fecha}`);
  const mmdd = fecha.slice(5);
  return mmdd >= UMBRALES.EPOCA_INICIO && mmdd <= UMBRALES.EPOCA_FIN;
}

export function nivelSequiaPorDias(dsc: number): NivelSequia | null {
  if (dsc >= UMBRALES.DSC_SEVERA) return "SEVERA";
  if (dsc >= UMBRALES.DSC_FUERTE) return "FUERTE";
  if (dsc >= UMBRALES.DSC_MODERADA) return "MODERADA";
  if (UMBRALES.DSC_DEBIL_MIN !== null && dsc >= UMBRALES.DSC_DEBIL_MIN) return "DEBIL";
  return null;
}

// Orden de evaluación (Info_Datos_Clima.md, sección 4): SEQUIA, EXCESO, ACEPTABLE.
export function clasificar(e: EntradaClasificacion): ResultadoClasificacion {
  if (!enEpocaLluviosa(e.fecha)) {
    return { condicion: null, nivelSequia: null, razon30: null, criterios: [], sinEvaluar: "FUERA_DE_EPOCA" };
  }

  const nivelSequia = nivelSequiaPorDias(e.diasSecosConsecutivos);

  let razon: number | null = null;
  if (e.acumulado30Mm !== null && e.normal30Mm !== null && e.normal30Mm >= UMBRALES.NORMAL_MIN_MM) {
    razon = e.acumulado30Mm / e.normal30Mm;
  }

  // Margen anti-oscilación: salir de un estado exige cruzar el umbral + margen.
  const ant = e.condicionAnterior ?? null;
  const umbralSequia = ant === "SEQUIA" ? UMBRALES.SEQUIA_RAZON_MAX + UMBRALES.MARGEN_RAZON : UMBRALES.SEQUIA_RAZON_MAX;
  const umbralExceso = ant === "EXCESO_LLUVIA" ? UMBRALES.EXCESO_RAZON_MIN - UMBRALES.MARGEN_RAZON : UMBRALES.EXCESO_RAZON_MIN;

  const criterios: Criterio[] = [];
  if (e.diasSecosConsecutivos >= UMBRALES.DSC_MODERADA) criterios.push("DIAS_SECOS");
  if (razon !== null && razon < umbralSequia) criterios.push("DEFICIT_30D");

  let condicion: CondicionClimatica;
  if (criterios.length > 0) {
    condicion = "SEQUIA";
  } else if (razon !== null && razon >= umbralExceso) {
    condicion = "EXCESO_LLUVIA";
    criterios.push("EXCESO_30D");
  } else {
    condicion = "INVIERNO_ACEPTABLE";
  }

  return {
    condicion,
    nivelSequia,
    razon30: razon === null ? null : Math.round(razon * 1000) / 1000,
    criterios,
    sinEvaluar: null,
  };
}

// Conveniencia para 3-C/3-D: serie diaria de ClimaActual -> resumen + clasificación.
export function clasificarLluvia(
  diario: readonly DiaLluvia[],
  normal30Mm: number | null,
  condicionAnterior: CondicionClimatica | null = null,
): { resumen: ResumenLluvia; resultado: ResultadoClasificacion } {
  const resumen = resumirLluvia(diario);
  if (resumen.fecha === null) {
    return {
      resumen,
      resultado: { condicion: null, nivelSequia: null, razon30: null, criterios: [], sinEvaluar: "SIN_DATOS" },
    };
  }
  const resultado = clasificar({
    fecha: resumen.fecha,
    diasSecosConsecutivos: resumen.diasSecosConsecutivos,
    acumulado30Mm: resumen.acumulado30Mm,
    normal30Mm,
    condicionAnterior,
  });
  return { resumen, resultado };
}