import { ErrorOpenMeteo } from "./errores";

export interface RespuestaErrorClima {
  estado: number;
  cuerpo: { error: string; detalles: string };
  /** Solo para 429: segundos que conviene esperar antes de reintentar. */
  reintentarEnSegundos?: number;
}

/**
 * Traduce los errores del cliente de Open-Meteo al contrato HTTP.
 * - 429: el límite de uso es del proveedor; el cliente debe esperar, no reintentar en bucle.
 * - 502: Open-Meteo no respondió, respondió mal o devolvió un estado de error.
 * - 500: un dato del servidor (coordenada faltante, parámetro inválido) impide la consulta.
 */
export function respuestaErrorClima(error: unknown): RespuestaErrorClima | null {
  if (!(error instanceof ErrorOpenMeteo)) return null;

  if (error.estadoHttp === 429) {
    return {
      estado: 429,
      cuerpo: {
        error: "Límite de Open-Meteo alcanzado",
        detalles: "Open-Meteo rechazó la consulta por límite de uso; espera al menos una hora antes de reintentar",
      },
      reintentarEnSegundos: 3600,
    };
  }

  if (error.tipo === "COORDENADA_INVALIDA" || error.tipo === "PARAMETRO_INVALIDO") {
    return {
      estado: 500,
      cuerpo: {
        error: "No se pudo consultar el clima",
        detalles: "Falta configuración de distritos en el servidor; revisa los datos de referencia",
      },
    };
  }

  return {
    estado: 502,
    cuerpo: {
      error: "No se pudo consultar Open-Meteo",
      detalles: "El servicio climático no respondió correctamente; se conserva el último dato bueno",
    },
  };
}
