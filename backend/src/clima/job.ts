import { ErrorOpenMeteo } from "./errores";

// Job periódico de 3-D. Usa setInterval (Mapa v2) y nunca reemplaza el último
// dato bueno: si actualizarClima lanza, no se guardó nada y solo se registra.
//
// Un 429 de Open-Meteo pausa dos ciclos en vez de uno: el límite es por hora y
// reintentar en el siguiente intervalo volvería a fallar.

export const INTERVALO_MIN_MS = 60 * 60 * 1000;
export const INTERVALO_POR_DEFECTO_MS = INTERVALO_MIN_MS;

/** CLIMA_JOB_INTERVALO_MS se expresa en milisegundos y no puede ser menor a una hora. */
export function leerIntervaloJob(valor: string | undefined): number {
  const texto = valor?.trim() ?? "";
  if (texto === "") return INTERVALO_POR_DEFECTO_MS;

  const intervalo = Number(texto);
  if (!Number.isSafeInteger(intervalo) || intervalo < INTERVALO_MIN_MS) {
    throw new Error(
      `CLIMA_JOB_INTERVALO_MS debe ser un entero de al menos ${INTERVALO_MIN_MS} ms (1 hora); recibido: "${valor}"`,
    );
  }
  return intervalo;
}

/** Milisegundos de pausa adicional después de un fallo (0 = seguir en el próximo ciclo). */
export function esperaTrasError(error: unknown, intervaloMs: number): number {
  return error instanceof ErrorOpenMeteo && error.estadoHttp === 429 ? intervaloMs * 2 : 0;
}

export interface OpcionesJobClima {
  intervaloMs: number;
  ejecutar: () => Promise<unknown>;
  /** Inyectable para pruebas. */
  ahora?: () => number;
  log?: (mensaje: string) => void;
  advertir?: (mensaje: string) => void;
}

export interface JobClima {
  detener(): void;
  /** Ejecuta un ciclo ahora (pruebas o disparo manual); respeta el cerrojo y la pausa. */
  ejecutarAhora(): Promise<void>;
}

function describirError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function iniciarJobClima(opciones: OpcionesJobClima): JobClima {
  const ahora = opciones.ahora ?? (() => Date.now());
  const log = opciones.log ?? ((mensaje: string) => console.log(mensaje));
  const advertir = opciones.advertir ?? ((mensaje: string) => console.warn(mensaje));

  let ejecutando = false;
  let detenido = false;
  let pausadoHasta = 0;

  const tick = async (): Promise<void> => {
    if (detenido || ejecutando) return;
    if (ahora() < pausadoHasta) {
      advertir(`[clima] job en pausa hasta ${new Date(pausadoHasta).toISOString()} por límite de Open-Meteo`);
      return;
    }

    ejecutando = true;
    try {
      await opciones.ejecutar();
      log("[clima] actualización periódica completada");
    } catch (error) {
      const espera = esperaTrasError(error, opciones.intervaloMs);
      if (espera > 0) pausadoHasta = ahora() + espera;
      advertir(
        `[clima] falló la actualización periódica; se conserva el último dato bueno: ${describirError(error)}`,
      );
    } finally {
      ejecutando = false;
    }
  };

  const temporizador = setInterval(() => {
    void tick();
  }, opciones.intervaloMs);
  // No mantener vivo el proceso solo por este temporizador.
  temporizador.unref?.();

  return {
    detener(): void {
      detenido = true;
      clearInterval(temporizador);
    },
    ejecutarAhora: tick,
  };
}
