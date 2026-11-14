// Cierre ordenado: dejar de aceptar peticiones, detener el job periódico y
// desconectar Prisma antes de salir. Sin esto, un SIGTERM en medio de una
// actualización de clima podía cortar la conexión a MySQL o dejar el job vivo.
// La lógica se aísla de process/servidor para poder probarla con dobles.

export interface AccionesCierre {
  /** Detiene el job periódico, si está activo. */
  detenerJob?: () => void;
  /** Deja de aceptar conexiones y espera a que terminen las abiertas. */
  cerrarServidor: () => Promise<void>;
  desconectarBase: () => Promise<void>;
  salir: (codigo: number) => void;
  log?: (mensaje: string) => void;
  tiempoLimiteMs?: number;
}

export const TIEMPO_LIMITE_CIERRE_MS = 10_000;

function describir(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Devuelve un manejador idempotente: si llegan SIGINT y SIGTERM seguidos, el
 * segundo no repite el cierre. Sale con 0 si todo cierra y con 1 si algo falla
 * o se excede el tiempo límite.
 */
export function crearManejadorCierre(acciones: AccionesCierre): (senal: string) => Promise<void> {
  const log = acciones.log ?? ((mensaje: string) => console.log(mensaje));
  const tiempoLimiteMs = acciones.tiempoLimiteMs ?? TIEMPO_LIMITE_CIERRE_MS;
  let cerrando = false;

  return async (senal: string): Promise<void> => {
    if (cerrando) return;
    cerrando = true;
    log(`[backend] ${senal}: cerrando...`);

    acciones.detenerJob?.();

    const limite = setTimeout(() => {
      log(`[backend] el cierre superó ${tiempoLimiteMs} ms; se fuerza la salida`);
      acciones.salir(1);
    }, tiempoLimiteMs);
    limite.unref?.();

    try {
      await acciones.cerrarServidor();
      await acciones.desconectarBase();
      clearTimeout(limite);
      log("[backend] cierre completado");
      acciones.salir(0);
    } catch (error) {
      clearTimeout(limite);
      log(`[backend] error durante el cierre: ${describir(error)}`);
      acciones.salir(1);
    }
  };
}
