import type { Cultivo, EstadoSiembra, UnidadSemilla } from "../generated/prisma/enums";

// Validación de entrada de POST /siembras (4-D). Es una función pura para poder
// probarla sin HTTP ni base de datos. El contrato de error es { error, detalles }.
//
// Decisión MVP: la suma del desglose puede superar inversionTotalUsd. El
// formulario ya lo advierte y deja guardar; rechazarlo obligaría al agricultor a
// inventar un total que no conoce. Solo se validan montos no negativos.

export interface DatosSiembra {
  distritoId: number;
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
}

export type ResultadoValidacionSiembra =
  | { ok: true; datos: DatosSiembra }
  | { ok: false; detalles: string[] };

const CULTIVOS: readonly string[] = ["MAIZ", "FRIJOL", "MAICILLO"];
const ESTADOS: readonly string[] = ["POR_SEMBRAR", "SEMBRADO"];
const UNIDADES: readonly string[] = ["LIBRAS", "BOLSAS"];
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_AREA_MZ = 999999.99;
const MAX_MONTO_USD = 99999999.99;

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function esNumero(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor);
}

function tieneDosDecimales(valor: number): boolean {
  return Math.abs(valor * 100 - Math.round(valor * 100)) < 1e-9;
}

function esMonto(valor: unknown, minimo: number): valor is number {
  return esNumero(valor) && valor >= minimo && valor <= MAX_MONTO_USD && tieneDosDecimales(valor);
}

function esArea(valor: unknown): valor is number {
  return esNumero(valor) && valor >= 0.01 && valor <= MAX_AREA_MZ && tieneDosDecimales(valor);
}

function esFechaValida(texto: string): boolean {
  if (!FECHA_RE.test(texto)) return false;
  const [anio, mes, dia] = texto.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio!, mes! - 1, dia!));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes! - 1 &&
    fecha.getUTCDate() === dia
  );
}

/** Hoy en la zona horaria del proyecto, para comparar con <input type="date">. */
export function hoyEnElSalvador(instante: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/El_Salvador",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instante);
}

function booleanoOpcional(
  valor: unknown,
  defecto: boolean,
  nombre: string,
  errores: string[],
): boolean {
  if (valor === undefined || valor === null) return defecto;
  if (typeof valor !== "boolean") {
    errores.push(`${nombre} debe ser booleano`);
    return defecto;
  }
  return valor;
}

function montoOpcional(valor: unknown, nombre: string, errores: string[]): number | null {
  if (valor === undefined || valor === null) return null;
  if (!esMonto(valor, 0)) {
    errores.push(`${nombre} debe ser un número no negativo con máximo dos decimales`);
    return null;
  }
  return valor;
}

export function validarDatosSiembra(cuerpo: unknown): ResultadoValidacionSiembra {
  if (!esObjeto(cuerpo)) {
    return { ok: false, detalles: ["El cuerpo debe ser un objeto JSON"] };
  }

  const errores: string[] = [];

  const distritoId = cuerpo["distritoId"];
  if (typeof distritoId !== "number" || !Number.isSafeInteger(distritoId) || distritoId <= 0) {
    errores.push("distritoId debe ser un entero positivo");
  }

  const cultivo = cuerpo["cultivo"];
  if (typeof cultivo !== "string" || !CULTIVOS.includes(cultivo)) {
    errores.push("cultivo debe ser MAIZ, FRIJOL o MAICILLO");
  }

  const estado = cuerpo["estado"];
  if (typeof estado !== "string" || !ESTADOS.includes(estado)) {
    errores.push("estado debe ser POR_SEMBRAR o SEMBRADO");
  }

  const fechaSiembra = cuerpo["fechaSiembra"];
  if (typeof fechaSiembra !== "string" || !esFechaValida(fechaSiembra)) {
    errores.push("fechaSiembra debe ser una fecha válida AAAA-MM-DD");
  } else {
    const hoy = hoyEnElSalvador();
    if (estado === "SEMBRADO" && fechaSiembra > hoy) {
      errores.push("Una siembra ya realizada no puede tener fecha futura");
    }
    if (estado === "POR_SEMBRAR" && fechaSiembra < hoy) {
      errores.push("Una siembra planeada no puede tener fecha pasada");
    }
  }

  const areaMz = cuerpo["areaMz"];
  if (!esArea(areaMz)) {
    errores.push("areaMz debe ser un número entre 0.01 y 999 999.99 con máximo dos decimales");
  }

  const cantidadSemilla = cuerpo["cantidadSemilla"];
  const unidadSemilla = cuerpo["unidadSemilla"];
  const hayCantidad = cantidadSemilla !== undefined && cantidadSemilla !== null;
  const hayUnidad = unidadSemilla !== undefined && unidadSemilla !== null;
  if (hayCantidad !== hayUnidad) {
    errores.push("cantidadSemilla y unidadSemilla deben ir juntas");
  }
  if (hayCantidad && !esMonto(cantidadSemilla, 0.01)) {
    errores.push("cantidadSemilla debe ser un número positivo con máximo dos decimales");
  }
  if (hayUnidad && (typeof unidadSemilla !== "string" || !UNIDADES.includes(unidadSemilla))) {
    errores.push("unidadSemilla debe ser LIBRAS o BOLSAS");
  }

  const alquilaTerreno = booleanoOpcional(cuerpo["alquilaTerreno"], false, "alquilaTerreno", errores);
  const usaMaquinaria = booleanoOpcional(cuerpo["usaMaquinaria"], false, "usaMaquinaria", errores);
  const usaRiego = booleanoOpcional(cuerpo["usaRiego"], false, "usaRiego", errores);

  const inversionTotalUsd = cuerpo["inversionTotalUsd"];
  if (!esMonto(inversionTotalUsd, 0)) {
    errores.push("inversionTotalUsd debe ser un número no negativo con máximo dos decimales");
  }

  const costoSemillaUsd = montoOpcional(cuerpo["costoSemillaUsd"], "costoSemillaUsd", errores);
  const costoAlquilerUsd = montoOpcional(cuerpo["costoAlquilerUsd"], "costoAlquilerUsd", errores);
  const costoMaquinariaUsd = montoOpcional(cuerpo["costoMaquinariaUsd"], "costoMaquinariaUsd", errores);
  const costoRiegoUsd = montoOpcional(cuerpo["costoRiegoUsd"], "costoRiegoUsd", errores);
  const costoOtrosUsd = montoOpcional(cuerpo["costoOtrosUsd"], "costoOtrosUsd", errores);

  if (errores.length > 0) return { ok: false, detalles: errores };

  return {
    ok: true,
    datos: {
      distritoId: distritoId as number,
      cultivo: cultivo as Cultivo,
      estado: estado as EstadoSiembra,
      fechaSiembra: fechaSiembra as string,
      areaMz: areaMz as number,
      cantidadSemilla: hayCantidad ? (cantidadSemilla as number) : null,
      unidadSemilla: hayUnidad ? (unidadSemilla as UnidadSemilla) : null,
      alquilaTerreno,
      usaMaquinaria,
      usaRiego,
      inversionTotalUsd: inversionTotalUsd as number,
      costoSemillaUsd,
      costoAlquilerUsd,
      costoMaquinariaUsd,
      costoRiegoUsd,
      costoOtrosUsd,
    },
  };
}
