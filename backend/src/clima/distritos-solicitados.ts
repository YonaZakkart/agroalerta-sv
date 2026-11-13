export type ValidacionDistritoIds =
  | { ok: true; distritoIds: number[] | undefined }
  | { ok: false; detalles: string };

/**
 * Valida el campo distritoIds de POST /clima/actualizar.
 * - undefined: se actualizan todos los distritos.
 * - Array no vacío de enteros positivos: solo esos distritos.
 * - Cualquier otra cosa (incluido un array vacío) es un error del cliente.
 */
export function validarDistritoIds(valor: unknown): ValidacionDistritoIds {
  if (valor === undefined) return { ok: true, distritoIds: undefined };

  if (!Array.isArray(valor)) {
    return { ok: false, detalles: "distritoIds debe ser una lista de enteros positivos" };
  }

  if (valor.length === 0) {
    return {
      ok: false,
      detalles: "distritoIds no puede estar vacío; omítelo para actualizar todos los distritos",
    };
  }

  if (!valor.every((id) => Number.isSafeInteger(id) && id > 0)) {
    return { ok: false, detalles: "distritoIds debe ser una lista de enteros positivos" };
  }

  return { ok: true, distritoIds: valor as number[] };
}
