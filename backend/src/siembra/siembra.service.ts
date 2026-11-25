import { SELECT_DISTRITO } from "../auth/distrito.select";
import { prisma } from "../config/prisma";
import { emitirSeguro } from "../events/emitir";
import { EVENTOS } from "../events/types";
import type { SiembraRegistradaPayload } from "../events/types";
import { aSiembraDto } from "./siembra.dto";
import type { SiembraDto, SiembraPersistida } from "./siembra.dto";
import type { DatosSiembra } from "./siembra.validacion";

// Persistencia y evento de SiembraRegistrada (4-D). El servicio no valida la
// entrada: eso lo hace siembra.validacion.ts antes de llamar. La emisión ocurre
// después de guardar para que cualquier listener lea la siembra ya persistida.

export class SiembraError extends Error {
  constructor(
    public status: number,
    message: string,
    public detalles?: string[],
  ) {
    super(message);
  }
}

export interface NuevaSiembra {
  usuarioId: number;
  distritoId: number;
  cultivo: DatosSiembra["cultivo"];
  estado: DatosSiembra["estado"];
  fechaSiembra: Date;
  areaMz: number;
  cantidadSemilla: number | null;
  unidadSemilla: DatosSiembra["unidadSemilla"];
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

export interface CrearSiembraDeps {
  buscarDistrito: (id: number) => Promise<{ id: number } | null>;
  crear: (nueva: NuevaSiembra) => Promise<SiembraPersistida>;
  emitir: (evento: string, payload: unknown) => boolean;
}

const SELECT_SIEMBRA = {
  id: true,
  distritoId: true,
  distrito: SELECT_DISTRITO,
  cultivo: true,
  estado: true,
  fechaSiembra: true,
  areaMz: true,
  cantidadSemilla: true,
  unidadSemilla: true,
  alquilaTerreno: true,
  usaMaquinaria: true,
  usaRiego: true,
  inversionTotalUsd: true,
  costoSemillaUsd: true,
  costoAlquilerUsd: true,
  costoMaquinariaUsd: true,
  costoRiegoUsd: true,
  costoOtrosUsd: true,
  creadoEn: true,
} as const;

const depsPrisma: CrearSiembraDeps = {
  buscarDistrito: (id) => prisma.distrito.findUnique({ where: { id }, select: { id: true } }),
  crear: (nueva) =>
    prisma.siembra.create({
      data: {
        usuarioId: nueva.usuarioId,
        distritoId: nueva.distritoId,
        cultivo: nueva.cultivo,
        estado: nueva.estado,
        fechaSiembra: nueva.fechaSiembra,
        areaMz: nueva.areaMz,
        cantidadSemilla: nueva.cantidadSemilla,
        unidadSemilla: nueva.unidadSemilla,
        alquilaTerreno: nueva.alquilaTerreno,
        usaMaquinaria: nueva.usaMaquinaria,
        usaRiego: nueva.usaRiego,
        inversionTotalUsd: nueva.inversionTotalUsd,
        costoSemillaUsd: nueva.costoSemillaUsd,
        costoAlquilerUsd: nueva.costoAlquilerUsd,
        costoMaquinariaUsd: nueva.costoMaquinariaUsd,
        costoRiegoUsd: nueva.costoRiegoUsd,
        costoOtrosUsd: nueva.costoOtrosUsd,
      },
      select: SELECT_SIEMBRA,
    }),
  emitir: emitirSeguro,
};

function aNuevaSiembra(usuarioId: number, datos: DatosSiembra): NuevaSiembra {
  return {
    usuarioId,
    ...datos,
    // MySQL DATE no lleva hora: se fija medianoche UTC para que la fecha no se
    // desplace al serializar.
    fechaSiembra: new Date(`${datos.fechaSiembra}T00:00:00.000Z`),
  };
}

export function aPayloadSiembraRegistrada(
  siembra: SiembraPersistida,
  usuarioId: number,
): SiembraRegistradaPayload {
  return {
    siembraId: siembra.id,
    usuarioId,
    distritoId: siembra.distritoId,
    cultivo: siembra.cultivo,
    areaMz: siembra.areaMz.toNumber(),
    fecha: siembra.fechaSiembra,
  };
}

export async function crearSiembra(
  usuarioId: number,
  datos: DatosSiembra,
  deps: CrearSiembraDeps = depsPrisma,
): Promise<SiembraDto> {
  const distrito = await deps.buscarDistrito(datos.distritoId);
  if (!distrito) {
    throw new SiembraError(404, "No encontrado", ["Distrito no encontrado"]);
  }

  let siembra: SiembraPersistida;
  try {
    siembra = await deps.crear(aNuevaSiembra(usuarioId, datos));
  } catch (error) {
    // La FK puede fallar si el distrito se borra entre la comprobación y el
    // insert. Se traduce a 404, no a 500.
    if ((error as { code?: string }).code === "P2003") {
      throw new SiembraError(404, "No encontrado", ["Distrito no encontrado"]);
    }
    throw error;
  }

  try {
    deps.emitir(EVENTOS.SIEMBRA_REGISTRADA, aPayloadSiembraRegistrada(siembra, usuarioId));
  } catch (error) {
    // emitirSeguro ya captura los errores de los listeners; esto protege el
    // contrato si se inyecta otro emisor en una prueba.
    console.error("[siembra] no se pudo emitir SiembraRegistrada:", error);
  }

  return aSiembraDto(siembra);
}

export async function listarSiembras(usuarioId: number): Promise<SiembraDto[]> {
  const siembras = await prisma.siembra.findMany({
    where: { usuarioId },
    orderBy: { creadoEn: "desc" },
    select: SELECT_SIEMBRA,
  });
  return siembras.map(aSiembraDto);
}
