import type { CondicionClimatica } from "../events/types";
import type { NivelSequia } from "./clasificacion";

// Contrato de salida de GET /clima/distritos/:id. Se mantiene puro para poder
// probarlo sin base de datos y para no filtrar los Decimal de Prisma al cliente.

/** Decimal de Prisma reducido a lo único que necesita el mapeo. */
export interface DecimalLike {
  toNumber(): number;
}

export interface CondicionPersistida {
  condicion: CondicionClimatica | null;
  nivelSequia: NivelSequia | null;
  diasSecosConsecutivos: number;
  acumulado30Mm: DecimalLike | null;
  normal30Mm: DecimalLike | null;
  razon30: DecimalLike | null;
  fechaDatos: Date;
  actualizadoEn: Date;
  condicionDesde: Date | null;
}

export interface CondicionDistritoDto {
  condicion: CondicionClimatica | null;
  nivelSequia: NivelSequia | null;
  diasSecosConsecutivos: number;
  acumulado30Mm: number | null;
  normal30Mm: number | null;
  razon30: number | null;
  /** Último día completo con datos (AAAA-MM-DD), no la fecha de la consulta. */
  fechaDatos: string;
  /** Momento de la última consulta a Open-Meteo (ISO 8601). */
  actualizadoEn: string;
  condicionDesde: string | null;
}

const numero = (valor: DecimalLike | null): number | null =>
  valor === null ? null : valor.toNumber();

export function aCondicionDto(fila: CondicionPersistida): CondicionDistritoDto {
  return {
    condicion: fila.condicion,
    nivelSequia: fila.nivelSequia,
    diasSecosConsecutivos: fila.diasSecosConsecutivos,
    acumulado30Mm: numero(fila.acumulado30Mm),
    normal30Mm: numero(fila.normal30Mm),
    razon30: numero(fila.razon30),
    fechaDatos: fila.fechaDatos.toISOString().slice(0, 10),
    actualizadoEn: fila.actualizadoEn.toISOString(),
    condicionDesde: fila.condicionDesde?.toISOString() ?? null,
  };
}

/** Un id de distrito válido es un entero positivo escrito con dígitos. */
export function validarIdDistrito(valor: unknown): number | null {
  if (typeof valor !== "string" || !/^\d+$/.test(valor)) return null;
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
