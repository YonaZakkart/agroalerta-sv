import type { CondicionClimatica } from "../events/types";
import type { Cultivo, EstadoSiembra, NivelRiesgo, NivelSequia } from "../generated/prisma/enums";
import type { NivelRiesgo as NivelRiesgoRecomendacion, ViabilidadReferencia } from "./recomendacion";
import type { Supuesto } from "./proyeccion";

// Contrato de salida de GET /estimaciones (5-D). Se mantiene puro para probarlo
// sin base de datos y para no filtrar los Decimal ni los Json de Prisma.

export interface DecimalLike {
  toNumber(): number;
}

export interface EstimacionPersistida {
  id: number;
  siembraId: number;
  usuarioId: number;
  distritoId: number;
  cultivo: Cultivo;
  estado: EstadoSiembra;
  areaMz: DecimalLike;
  fechaSiembra: Date;
  condicion: CondicionClimatica | null;
  nivelSequia: NivelSequia | null;
  fechaDatos: Date | null;
  actualizadoEn: Date | null;
  rendimientoBaseQqPorMz: DecimalLike;
  factorClimatico: DecimalLike;
  rendimientoEstimadoQqPorMz: DecimalLike;
  produccionEstimadaQq: DecimalLike;
  precioVentaQqUsd: DecimalLike;
  ingresoEstimadoUsd: DecimalLike;
  nivelRiesgo: NivelRiesgo;
  titulo: string;
  mensaje: string;
  motivos: unknown;
  viabilidad: unknown | null;
  supuestos: unknown;
  calculadoEn: Date;
}

export interface EstimacionDto {
  id: number;
  siembraId: number;
  distritoId: number;
  cultivo: Cultivo;
  estado: EstadoSiembra;
  areaMz: number;
  fechaSiembra: string;
  condicion: CondicionClimatica | null;
  nivelSequia: NivelSequia | null;
  fechaDatos: string | null;
  actualizadoEn: string | null;
  rendimientoBaseQqPorMz: number;
  factorClimatico: number;
  rendimientoEstimadoQqPorMz: number;
  produccionEstimadaQq: number;
  precioVentaQqUsd: number;
  ingresoEstimadoUsd: number;
  nivelRiesgo: NivelRiesgoRecomendacion;
  titulo: string;
  mensaje: string;
  motivos: string[];
  viabilidad: ViabilidadReferencia | null;
  supuestos: Supuesto[];
  calculadoEn: string;
}

const numero = (valor: DecimalLike): number => valor.toNumber();

function comoMotivos(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === "string") : [];
}

function comoViabilidad(valor: unknown): ViabilidadReferencia | null {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) return null;
  const v = valor as Record<string, unknown>;
  if (
    typeof v["capa"] !== "string" ||
    typeof v["claseDominante"] !== "string" ||
    typeof v["porcentaje"] !== "number"
  ) {
    return null;
  }
  return {
    capa: v["capa"],
    claseDominante: v["claseDominante"],
    porcentaje: v["porcentaje"],
    fuente: typeof v["fuente"] === "string" ? v["fuente"] : null,
    fechaExtraccion: typeof v["fechaExtraccion"] === "string" ? v["fechaExtraccion"] : null,
  };
}

function comoSupuestos(valor: unknown): Supuesto[] {
  return Array.isArray(valor) ? (valor as Supuesto[]) : [];
}

export function aEstimacionDto(fila: EstimacionPersistida): EstimacionDto {
  return {
    id: fila.id,
    siembraId: fila.siembraId,
    distritoId: fila.distritoId,
    cultivo: fila.cultivo,
    estado: fila.estado,
    areaMz: numero(fila.areaMz),
    fechaSiembra: fila.fechaSiembra.toISOString().slice(0, 10),
    condicion: fila.condicion,
    nivelSequia: fila.nivelSequia,
    fechaDatos: fila.fechaDatos?.toISOString().slice(0, 10) ?? null,
    actualizadoEn: fila.actualizadoEn?.toISOString() ?? null,
    rendimientoBaseQqPorMz: numero(fila.rendimientoBaseQqPorMz),
    factorClimatico: numero(fila.factorClimatico),
    rendimientoEstimadoQqPorMz: numero(fila.rendimientoEstimadoQqPorMz),
    produccionEstimadaQq: numero(fila.produccionEstimadaQq),
    precioVentaQqUsd: numero(fila.precioVentaQqUsd),
    ingresoEstimadoUsd: numero(fila.ingresoEstimadoUsd),
    nivelRiesgo: fila.nivelRiesgo,
    titulo: fila.titulo,
    mensaje: fila.mensaje,
    motivos: comoMotivos(fila.motivos),
    viabilidad: comoViabilidad(fila.viabilidad),
    supuestos: comoSupuestos(fila.supuestos),
    calculadoEn: fila.calculadoEn.toISOString(),
  };
}
