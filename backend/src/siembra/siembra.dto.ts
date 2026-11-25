import type { Cultivo, EstadoSiembra, UnidadSemilla } from "../generated/prisma/enums";

// Contrato de salida de POST /siembras y GET /siembras. Se mantiene puro para
// probarlo sin base de datos y para no filtrar los Decimal de Prisma al cliente.

/** Decimal de Prisma reducido a lo único que necesita el mapeo. */
export interface DecimalLike {
  toNumber(): number;
}

export interface DistritoSiembraDto {
  id: number;
  nombre: string;
  municipio: { id: number; nombre: string };
}

/** Fila de Prisma con el select de siembra. */
export interface SiembraPersistida {
  id: number;
  distritoId: number;
  distrito: DistritoSiembraDto;
  cultivo: Cultivo;
  estado: EstadoSiembra;
  fechaSiembra: Date;
  areaMz: DecimalLike;
  cantidadSemilla: DecimalLike | null;
  unidadSemilla: UnidadSemilla | null;
  alquilaTerreno: boolean;
  usaMaquinaria: boolean;
  usaRiego: boolean;
  inversionTotalUsd: DecimalLike;
  costoSemillaUsd: DecimalLike | null;
  costoAlquilerUsd: DecimalLike | null;
  costoMaquinariaUsd: DecimalLike | null;
  costoRiegoUsd: DecimalLike | null;
  costoOtrosUsd: DecimalLike | null;
  creadoEn: Date;
}

export interface SiembraDto {
  id: number;
  distritoId: number;
  distrito: DistritoSiembraDto;
  cultivo: Cultivo;
  estado: EstadoSiembra;
  fechaSiembra: string;
  areaMz: number;
  cantidadSemilla: number | null;
  unidadSemilla: UnidadSemilla | null;
  alquilaTerreno: boolean;
  usaMaquinaria: boolean;
  usaRiego: boolean;
  inversionTotalUsd: number;
  costoSemillaUsd: number | null;
  costoAlquilerUsd: number | null;
  costoMaquinariaUsd: number | null;
  costoRiegoUsd: number | null;
  costoOtrosUsd: number | null;
  creadoEn: string;
}

const numero = (valor: DecimalLike | null): number | null =>
  valor === null ? null : valor.toNumber();

export function aSiembraDto(fila: SiembraPersistida): SiembraDto {
  return {
    id: fila.id,
    distritoId: fila.distritoId,
    distrito: fila.distrito,
    cultivo: fila.cultivo,
    estado: fila.estado,
    fechaSiembra: fila.fechaSiembra.toISOString().slice(0, 10),
    areaMz: fila.areaMz.toNumber(),
    cantidadSemilla: numero(fila.cantidadSemilla),
    unidadSemilla: fila.unidadSemilla,
    alquilaTerreno: fila.alquilaTerreno,
    usaMaquinaria: fila.usaMaquinaria,
    usaRiego: fila.usaRiego,
    inversionTotalUsd: fila.inversionTotalUsd.toNumber(),
    costoSemillaUsd: numero(fila.costoSemillaUsd),
    costoAlquilerUsd: numero(fila.costoAlquilerUsd),
    costoMaquinariaUsd: numero(fila.costoMaquinariaUsd),
    costoRiegoUsd: numero(fila.costoRiegoUsd),
    costoOtrosUsd: numero(fila.costoOtrosUsd),
    creadoEn: fila.creadoEn.toISOString(),
  };
}
