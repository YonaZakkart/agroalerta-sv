import { bus } from "./bus";

/**
 * Emite un evento sin permitir que un listener defectuoso aborte el trabajo del
 * emisor. EventEmitter es síncrono: si un listener lanza, la excepción sube hasta
 * el orquestador y puede dejar distritos sin procesar después de haber escrito
 * en la base. El fallo se registra y se continúa con el resto.
 */
export function emitirSeguro(evento: string, payload: unknown): boolean {
  try {
    bus.emit(evento, payload);
    return true;
  } catch (error) {
    console.error(`[eventos] un listener de ${evento} falló; se continúa:`, error);
    return false;
  }
}
