import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { ApiError } from './models';

/** Tiempo máximo que el interceptor espera la respuesta del API. */
export const TIEMPO_LIMITE_HTTP_MS = 15_000;

function segundosDeEspera(error: HttpErrorResponse): string | null {
  const valor = error.headers?.get('Retry-After');
  if (!valor) return null;
  const segundos = Number(valor);
  if (!Number.isFinite(segundos) || segundos <= 0) return null;
  return segundos >= 60 ? `${Math.ceil(segundos / 60)} minuto(s)` : `${Math.ceil(segundos)} segundo(s)`;
}

/** Convierte cualquier error de HTTP en mensajes legibles para mostrar al usuario. */
export function mensajesDeError(error: unknown): string[] {
  if (error instanceof TimeoutError) {
    return ['El servidor tardó demasiado en responder. Verifica tu conexión e intenta de nuevo'];
  }
  if (!(error instanceof HttpErrorResponse)) return ['Ocurrió un error inesperado'];

  // El backend responde { error, detalles }; sus mensajes son más específicos
  // que cualquier texto genérico por código de estado.
  const cuerpo = error.error as Partial<ApiError> | null;
  const mensajes: string[] = [];
  if (cuerpo && typeof cuerpo.error === 'string') mensajes.push(cuerpo.error);
  if (cuerpo?.detalles) {
    mensajes.push(...(Array.isArray(cuerpo.detalles) ? cuerpo.detalles : [cuerpo.detalles]));
  }
  if (mensajes.length > 0) return mensajes;

  if (error.status === 0) {
    return ['No se pudo conectar con el servidor. Verifica tu conexión o que el backend esté en ejecución'];
  }
  if (error.status === 403) {
    return ['No tienes permiso para realizar esta acción. Si acabas de registrarte, verifica tu correo'];
  }
  if (error.status === 413) {
    return ['La solicitud es demasiado grande'];
  }
  if (error.status === 429) {
    const espera = segundosDeEspera(error);
    return [
      espera
        ? `Demasiadas solicitudes. Espera ${espera} antes de reintentar`
        : 'Demasiadas solicitudes. Espera un momento antes de reintentar',
    ];
  }
  if (error.status >= 500) {
    return ['El servidor no responde. Verifica que el backend esté en ejecución'];
  }
  return [`Error ${error.status}.`];
}
