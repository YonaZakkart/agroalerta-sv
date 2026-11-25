import { aSiembraDto } from "./siembra.dto";
import type { DecimalLike, SiembraDto, SiembraPersistida } from "./siembra.dto";
import type { DatosSiembra } from "./siembra.validacion";

// Ayudas compartidas por las pruebas de 4-D. No las importa el código de la app.

export function decimal(valor: number): DecimalLike {
  return { toNumber: () => valor };
}

export function siembraPersistida(overrides: Partial<SiembraPersistida> = {}): SiembraPersistida {
  return {
    id: 1,
    distritoId: 1304,
    distrito: { id: 1304, nombre: "Chilanga", municipio: { id: 1, nombre: "Morazán Norte" } },
    cultivo: "MAIZ",
    estado: "POR_SEMBRAR",
    fechaSiembra: new Date("2026-11-24T00:00:00.000Z"),
    areaMz: decimal(3.5),
    cantidadSemilla: decimal(45),
    unidadSemilla: "LIBRAS",
    alquilaTerreno: false,
    usaMaquinaria: true,
    usaRiego: false,
    inversionTotalUsd: decimal(1900),
    costoSemillaUsd: decimal(120),
    costoAlquilerUsd: null,
    costoMaquinariaUsd: decimal(300),
    costoRiegoUsd: null,
    costoOtrosUsd: null,
    creadoEn: new Date("2026-11-24T18:00:00.000Z"),
    ...overrides,
  };
}

export function siembraDto(overrides: Partial<SiembraPersistida> = {}): SiembraDto {
  return aSiembraDto(siembraPersistida(overrides));
}

export function datosValidos(overrides: Partial<DatosSiembra> = {}): DatosSiembra {
  return {
    distritoId: 1304,
    cultivo: "MAIZ",
    estado: "POR_SEMBRAR",
    fechaSiembra: hoyEnElSalvador(),
    areaMz: 3.5,
    cantidadSemilla: 45,
    unidadSemilla: "LIBRAS",
    alquilaTerreno: false,
    usaMaquinaria: true,
    usaRiego: false,
    inversionTotalUsd: 1900,
    costoSemillaUsd: 120,
    costoAlquilerUsd: null,
    costoMaquinariaUsd: 300,
    costoRiegoUsd: null,
    costoOtrosUsd: null,
    ...overrides,
  };
}

export function hoyEnElSalvador(instante: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/El_Salvador",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instante);
}

export function sumarDias(fecha: string, dias: number): string {
  const instante = new Date(`${fecha}T00:00:00.000Z`);
  instante.setUTCDate(instante.getUTCDate() + dias);
  return instante.toISOString().slice(0, 10);
}
