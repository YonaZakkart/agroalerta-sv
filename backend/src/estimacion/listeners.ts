import type { EventEmitter } from "node:events";
import { EVENTOS } from "../events/types";
import type {
  CondicionClimaticaActualizadaPayload,
  SiembraRegistradaPayload,
} from "../events/types";

// Listeners de la Parte 5 (5-A). Reaccionan a SiembraRegistrada y
// CondicionClimaticaActualizada y disparan el recálculo de la estimación.
//
// EventEmitter es síncrono: si el listener devuelve una promesa y esta se
// rechaza, emitirSeguro NO la captura. Por eso cada listener envuelve su tarea
// con ejecutarSeguro, que captura tanto el error síncrono como el rechazo.
// Regla: un listener nunca lanza hacia el emisor.

export interface ListenersEstimacionDeps {
  recalcularSiembra(siembraId: number): Promise<void>;
  recalcularDistrito(distritoId: number): Promise<void>;
  registrarError(evento: string, error: unknown): void;
}

export interface ListenersEstimacion {
  onSiembraRegistrada(payload: SiembraRegistradaPayload): void;
  onCondicionClimaticaActualizada(payload: CondicionClimaticaActualizadaPayload): void;
}

function ejecutarSeguro(
  evento: string,
  tarea: () => Promise<void>,
  registrarError: ListenersEstimacionDeps["registrarError"],
): void {
  try {
    void tarea().catch((error) => registrarError(evento, error));
  } catch (error) {
    registrarError(evento, error);
  }
}

export function crearListenersEstimacion(deps: ListenersEstimacionDeps): ListenersEstimacion {
  return {
    onSiembraRegistrada(payload) {
      ejecutarSeguro(
        EVENTOS.SIEMBRA_REGISTRADA,
        () => deps.recalcularSiembra(payload.siembraId),
        deps.registrarError,
      );
    },
    onCondicionClimaticaActualizada(payload) {
      ejecutarSeguro(
        EVENTOS.CONDICION_CLIMATICA_ACTUALIZADA,
        () => deps.recalcularDistrito(payload.distritoId),
        deps.registrarError,
      );
    },
  };
}

/**
 * Registra los listeners en el bus. Se llama una sola vez al arrancar; el bus
 * es en proceso y no hay entrega garantizada (ver ADR 3-C).
 */
export function registrarListenersEstimacion(
  deps: ListenersEstimacionDeps,
  busObjetivo: Pick<EventEmitter, "on">,
): void {
  const listeners = crearListenersEstimacion(deps);
  busObjetivo.on(EVENTOS.SIEMBRA_REGISTRADA, listeners.onSiembraRegistrada);
  busObjetivo.on(EVENTOS.CONDICION_CLIMATICA_ACTUALIZADA, listeners.onCondicionClimaticaActualizada);
}
