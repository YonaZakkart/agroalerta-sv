import type { CondicionClimatica } from "../events/types";
import type { Cultivo, EstadoSiembra, NivelSequia } from "../generated/prisma/enums";
import type { ContextoEstimacion } from "./recalculo";

// Proyección de rendimiento e ingresos (5-B). Función pura: no toca base,
// red ni relojes. Los datos base de F1 (rendimiento) y F4 (precio de venta)
// son del informe del MAG 2022-2023; el ajuste por clima es un SUPUESTO
// declarado del equipo porque no hay dato oficial por cultivo y etapa.
//
// La proyección no calcula costos ni margen: 4-C ya tiene la estimación de
// costos y 5-C/5-D decidirán cómo combinarlos. Tampoco persiste: 5-D.

export type TipoSupuesto = "OFICIAL" | "SUPUESTO";

export interface Supuesto {
  clave: string;
  valor: number | string;
  unidad: string;
  tipo: TipoSupuesto;
  fuente: string;
  fecha: string;
  nota?: string;
}

export interface ProyeccionEstimacion {
  siembraId: number;
  usuarioId: number;
  distritoId: number;
  cultivo: Cultivo;
  estado: EstadoSiembra;
  areaMz: number;
  fechaSiembra: Date;
  condicion: CondicionClimatica | null;
  nivelSequia: NivelSequia | null;
  fechaDatos: Date | null;
  actualizadoEn: Date | null;
  rendimientoBaseQqPorMz: number;
  factorClimatico: number;
  rendimientoEstimadoQqPorMz: number;
  produccionEstimadaQq: number;
  precioVentaQqUsd: number;
  ingresoEstimadoUsd: number;
  supuestos: Supuesto[];
}

export interface ReferenciaProyeccion {
  rendimientoQqPorMz: number;
  precioVentaQqUsd: number;
  ficha: string;
  paginaPdf: number;
}

const MAG = {
  fuente: "MAG/DGEA/DEA — Costos de producción de cultivos agrícolas 2022-2023",
  fecha: "2024-02-21",
} as const;

const SUPUESTO_CLIMA = {
  fuente: "Supuesto del equipo para el MVP; no hay dato oficial por cultivo y etapa",
  fecha: "2026-11-24",
} as const;

/** F1 y F4: mismas fichas del MAG que usa 4-C, para no mezclar tecnologías. */
export const REFERENCIA_PROYECCION: Record<Cultivo, ReferenciaProyeccion> = {
  MAIZ: {
    rendimientoQqPorMz: 58.22,
    precioVentaQqUsd: 30.74,
    ficha: "Maíz semitecnificado",
    paginaPdf: 15,
  },
  FRIJOL: {
    rendimientoQqPorMz: 18.17,
    precioVentaQqUsd: 70,
    ficha: "Frijol de invierno",
    paginaPdf: 12,
  },
  MAICILLO: {
    rendimientoQqPorMz: 39.44,
    precioVentaQqUsd: 30,
    ficha: "Sorgo semi-tecnificado (maicillo)",
    paginaPdf: 16,
  },
};

/** Factor declarado cuando la condición es sequía y no hay nivel. */
export const FACTOR_SEQUIA_BASE = 0.8;

/** Factores declarados por nivel de sequía. */
export const FACTORES_SEQUIA: Record<NivelSequia, number> = {
  DEBIL: 0.95,
  MODERADA: 0.85,
  FUERTE: 0.7,
  SEVERA: 0.5,
};

/** Factor declarado para las condiciones que no son sequía. */
export const FACTORES_CLIMA: Record<Exclude<CondicionClimatica, "SEQUIA">, number> = {
  INVIERNO_ACEPTABLE: 1,
  EXCESO_LLUVIA: 0.9,
};

function redondear2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function factorClimatico(contexto: ContextoEstimacion): { factor: number; nota: string } {
  if (contexto.condicion === null) {
    return {
      factor: 1,
      nota: "Sin evaluación climática: no se aplica ajuste; se usa el rendimiento base.",
    };
  }

  if (contexto.condicion === "SEQUIA") {
    if (contexto.nivelSequia !== null) {
      return {
        factor: FACTORES_SEQUIA[contexto.nivelSequia],
        nota: `Sequía ${contexto.nivelSequia.toLowerCase()}: factor declarado por el equipo.`,
      };
    }
    return {
      factor: FACTOR_SEQUIA_BASE,
      nota: "Sequía sin nivel: se aplica el factor base de sequía.",
    };
  }

  return {
    factor: FACTORES_CLIMA[contexto.condicion],
    nota: `${contexto.condicion}: factor declarado por el equipo.`,
  };
}

function validarContexto(contexto: ContextoEstimacion): void {
  if (!Object.prototype.hasOwnProperty.call(REFERENCIA_PROYECCION, contexto.cultivo)) {
    throw new RangeError(`Cultivo desconocido: ${String(contexto.cultivo)}`);
  }
  if (!Number.isFinite(contexto.areaMz) || contexto.areaMz <= 0) {
    throw new RangeError("areaMz debe ser un número finito mayor que cero");
  }
}

export function proyectarEstimacion(contexto: ContextoEstimacion): ProyeccionEstimacion {
  validarContexto(contexto);

  const referencia = REFERENCIA_PROYECCION[contexto.cultivo];
  const { factor, nota } = factorClimatico(contexto);

  // Se redondea el rendimiento antes de multiplicar por el área para que el
  // resultado sea reproducible a mano con la tabla de supuestos.
  const rendimientoEstimadoQqPorMz = redondear2(referencia.rendimientoQqPorMz * factor);
  const produccionEstimadaQq = redondear2(rendimientoEstimadoQqPorMz * contexto.areaMz);
  const ingresoEstimadoUsd =
    Math.round(produccionEstimadaQq * referencia.precioVentaQqUsd * 100) / 100;

  const supuestos: Supuesto[] = [
    {
      clave: "rendimiento_base",
      valor: referencia.rendimientoQqPorMz,
      unidad: "qq/mz",
      tipo: "OFICIAL",
      ...MAG,
      nota: `${referencia.ficha}, PDF pág. ${referencia.paginaPdf}. Ciclo 2022-2023; no es un pronóstico de la parcela.`,
    },
    {
      clave: "precio_venta",
      valor: referencia.precioVentaQqUsd,
      unidad: "USD/qq",
      tipo: "OFICIAL",
      ...MAG,
      nota: `${referencia.ficha}, PDF pág. ${referencia.paginaPdf}. Precio promedio del ciclo 2022-2023; no es una cotización actual.`,
    },
    {
      clave: "factor_climatico",
      valor: factor,
      unidad: "factor",
      tipo: "SUPUESTO",
      ...SUPUESTO_CLIMA,
      nota,
    },
  ];

  return {
    siembraId: contexto.siembraId,
    usuarioId: contexto.usuarioId,
    distritoId: contexto.distritoId,
    cultivo: contexto.cultivo,
    estado: contexto.estado,
    areaMz: contexto.areaMz,
    fechaSiembra: contexto.fechaSiembra,
    condicion: contexto.condicion,
    nivelSequia: contexto.nivelSequia,
    fechaDatos: contexto.fechaDatos,
    actualizadoEn: contexto.actualizadoEn,
    rendimientoBaseQqPorMz: referencia.rendimientoQqPorMz,
    factorClimatico: factor,
    rendimientoEstimadoQqPorMz,
    produccionEstimadaQq,
    precioVentaQqUsd: referencia.precioVentaQqUsd,
    ingresoEstimadoUsd,
    supuestos,
  };
}
