import type { CondicionClimatica } from "../events/types";

/**
 * condicionDesde marca desde cuándo rige la condición vigente.
 * - Una condición evaluada nueva sí cambia la fecha.
 * - Entrar a "sin evaluación" (null, fuera de época) no cuenta como cambio:
 *   se conserva la fecha para no perder cuándo empezó la última condición real.
 * - Repetir la misma condición tampoco la mueve.
 */
export function cambioAEvaluada(
  anterior: CondicionClimatica | null,
  nueva: CondicionClimatica | null,
): boolean {
  return nueva !== null && nueva !== anterior;
}
