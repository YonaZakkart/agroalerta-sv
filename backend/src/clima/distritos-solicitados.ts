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

export type ValidacionCuerpo =
  | { ok: true; distritoIds: number[] | undefined }
  | { ok: false; estado: 400 | 415; detalles: string };

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function esJson(tipoContenido: string | undefined): boolean {
  if (tipoContenido === undefined) return false;
  // application/json y variantes como application/problem+json.
  return /^application\/(?:[\w.+-]+\+)?json\b/i.test(tipoContenido.trim());
}

/**
 * Valida el cuerpo completo de POST /clima/actualizar antes de leer la base.
 * Sin cuerpo (o con {}) se actualizan todos los distritos. Un cuerpo enviado
 * con otro Content-Type, una lista JSON o un valor que no es objeto se rechaza:
 * antes se interpretaban en silencio como "todos los distritos".
 */
export function validarCuerpoActualizacion(
  cuerpo: unknown,
  tipoContenido: string | undefined,
  tieneCuerpo: boolean,
): ValidacionCuerpo {
  if (tieneCuerpo && !esJson(tipoContenido)) {
    return {
      ok: false,
      estado: 415,
      detalles: "El cuerpo debe enviarse con Content-Type: application/json",
    };
  }

  if (cuerpo === undefined) return { ok: true, distritoIds: undefined };
  if (!esObjeto(cuerpo)) {
    return {
      ok: false,
      estado: 400,
      detalles: "El cuerpo debe ser un objeto JSON con el campo opcional distritoIds",
    };
  }

  const validacion = validarDistritoIds(cuerpo["distritoIds"]);
  if (!validacion.ok) return { ok: false, estado: 400, detalles: validacion.detalles };

  return { ok: true, distritoIds: validacion.distritoIds };
}
