// Normalización de nombres compartida entre módulos (viabilidad: seed y servicio;
// auth: validación del distrito en el registro, en la Rama 2 del cierre de la Parte 2).

/** Recorta y colapsa espacios repetidos (incluidos los de los extremos). */
export function colapsarEspacios(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Clave de comparación de nombres: sin tildes, en mayúsculas y con espacios colapsados.
 * Es la que se guarda en distritos.nombre_normalizado; la validación del registro
 * debe usar esta misma función.
 */
export function normalizarNombre(s: string): string {
  return colapsarEspacios(s).normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
}