// Resumen del origen de los datos de viabilidad. La fuente y la fecha deben
// salir de la misma fila: antes se tomaba la fuente de la primera área y la
// fecha máxima de cualquiera, así que la respuesta podía atribuir a una fuente
// una fecha que no le correspondía.

export interface FilaOrigen {
  fuente: string;
  fechaExtraccion: Date;
}

export interface OrigenDatos {
  fuente: string | null;
  fechaExtraccion: Date | null;
}

/**
 * Elige la fila con la fecha de extracción más reciente y devuelve su fuente y
 * su fecha (en empate gana la primera, para que el resultado sea estable).
 * Sin filas no hay origen que reportar.
 */
export function origenDeFilas(filas: readonly FilaOrigen[]): OrigenDatos {
  let elegida: FilaOrigen | null = null;
  for (const fila of filas) {
    if (elegida === null || fila.fechaExtraccion.getTime() > elegida.fechaExtraccion.getTime()) {
      elegida = fila;
    }
  }
  return elegida === null
    ? { fuente: null, fechaExtraccion: null }
    : { fuente: elegida.fuente, fechaExtraccion: elegida.fechaExtraccion };
}
