import { prisma } from "../config/prisma";
import type { CondicionClimatica } from "../events/types";
import type { Cultivo, EstadoSiembra, NivelSequia } from "../generated/prisma/enums";
import type { DecimalLike } from "../siembra/siembra.dto";

// Recálculo de la estimación (5-A). Los listeners llaman a estas funciones
// cuando hay una siembra nueva o cambia la condición de un distrito.
//
// 5-A deja preparado el contexto que necesita 5-B: siembra, distrito y última
// condición climática guardada. solicitarCalculo es el punto de extensión; por
// ahora registra la solicitud y no inventa una proyección.

export interface SiembraParaEstimar {
  id: number;
  usuarioId: number;
  distritoId: number;
  cultivo: Cultivo;
  estado: EstadoSiembra;
  areaMz: DecimalLike;
  fechaSiembra: Date;
  distrito: {
    condicion: {
      condicion: CondicionClimatica | null;
      nivelSequia: NivelSequia | null;
      fechaDatos: Date;
      actualizadoEn: Date;
    } | null;
  };
}

export interface ContextoEstimacion {
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
}

export interface RecalculoDeps {
  buscarSiembra: (id: number) => Promise<SiembraParaEstimar | null>;
  listarSiembrasPorDistrito: (distritoId: number) => Promise<SiembraParaEstimar[]>;
  solicitarCalculo: (contexto: ContextoEstimacion) => Promise<void> | void;
  registrar: (mensaje: string, error?: unknown) => void;
}

const SELECT_SIEMBRA_ESTIMACION = {
  id: true,
  usuarioId: true,
  distritoId: true,
  cultivo: true,
  estado: true,
  areaMz: true,
  fechaSiembra: true,
  distrito: {
    select: {
      condicion: {
        select: {
          condicion: true,
          nivelSequia: true,
          fechaDatos: true,
          actualizadoEn: true,
        },
      },
    },
  },
} as const;

function aContexto(siembra: SiembraParaEstimar): ContextoEstimacion {
  const condicion = siembra.distrito.condicion;
  return {
    siembraId: siembra.id,
    usuarioId: siembra.usuarioId,
    distritoId: siembra.distritoId,
    cultivo: siembra.cultivo,
    estado: siembra.estado,
    areaMz: siembra.areaMz.toNumber(),
    fechaSiembra: siembra.fechaSiembra,
    condicion: condicion?.condicion ?? null,
    nivelSequia: condicion?.nivelSequia ?? null,
    fechaDatos: condicion?.fechaDatos ?? null,
    actualizadoEn: condicion?.actualizadoEn ?? null,
  };
}

// Punto de extensión de 5-B. No se presenta como cálculo real: solo deja
// constancia de que el evento llegó y con qué datos se calculará.
function solicitarCalculoPendiente(contexto: ContextoEstimacion): void {
  console.log(
    `[estimacion] siembra ${contexto.siembraId} lista para calcular: ` +
      `${contexto.cultivo}, ${contexto.areaMz} mz, distrito ${contexto.distritoId}, ` +
      `clima ${contexto.condicion ?? "sin evaluar"}. La proyección llega en 5-B.`,
  );
}

const depsPrisma: RecalculoDeps = {
  buscarSiembra: (id) =>
    prisma.siembra.findUnique({ where: { id }, select: SELECT_SIEMBRA_ESTIMACION }),
  listarSiembrasPorDistrito: (distritoId) =>
    prisma.siembra.findMany({
      where: { distritoId },
      orderBy: { creadoEn: "asc" },
      select: SELECT_SIEMBRA_ESTIMACION,
    }),
  solicitarCalculo: solicitarCalculoPendiente,
  registrar: (mensaje, error) => {
    if (error === undefined) console.warn(mensaje);
    else console.error(mensaje, error);
  },
};

/** Recalcula una siembra concreta; la usa el listener de SiembraRegistrada. */
export async function recalcularSiembra(
  siembraId: number,
  deps: RecalculoDeps = depsPrisma,
): Promise<void> {
  const siembra = await deps.buscarSiembra(siembraId);
  if (!siembra) {
    deps.registrar(`[estimacion] siembra ${siembraId} no existe; se omite`);
    return;
  }
  await deps.solicitarCalculo(aContexto(siembra));
}

/**
 * Recalcula solo las siembras del distrito afectado. Un fallo en una siembra
 * no impide procesar las demás; el listener que lo invoca captura el resto.
 */
export async function recalcularDistrito(
  distritoId: number,
  deps: RecalculoDeps = depsPrisma,
): Promise<void> {
  const siembras = await deps.listarSiembrasPorDistrito(distritoId);
  for (const siembra of siembras) {
    try {
      await deps.solicitarCalculo(aContexto(siembra));
    } catch (error) {
      deps.registrar(`[estimacion] fallo al calcular la siembra ${siembra.id}`, error);
    }
  }
}
