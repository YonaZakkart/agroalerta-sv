import { bus } from "../events/bus";
import { registrarListenersEstimacion } from "./listeners";
import { recalcularDistrito, recalcularSiembra } from "./recalculo";

// Registro real de los listeners de 5-A. Se llama una sola vez al arrancar.
// La lógica de cada listener vive en listeners.ts (pura y probable); este
// archivo solo une el bus con las funciones que consultan la base.
export function iniciarListenersEstimacion(): void {
  registrarListenersEstimacion(
    {
      recalcularSiembra,
      recalcularDistrito,
      registrarError: (evento, error) => {
        console.error(`[estimacion] fallo en el listener de ${evento}:`, error);
      },
    },
    bus,
  );
}
