import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from './models';

/** Convierte cualquier error de HTTP en mensajes legibles para mostrar al usuario. */
export function mensajesDeError(error: unknown): string[] {
  if (!(error instanceof HttpErrorResponse)) return ['Ocurrió un error inesperado'];
  if (error.status === 0) return ['No se pudo conectar con el servidor'];
  if (error.status === 403) {
    return ['Tu cuenta aún no está verificada. Verifícala para poder iniciar sesión'];
  }

  const cuerpo = error.error as Partial<ApiError> | null;
  const mensajes: string[] = [];
  if (cuerpo && typeof cuerpo.error === 'string') mensajes.push(cuerpo.error);
  if (cuerpo?.detalles) {
    mensajes.push(...(Array.isArray(cuerpo.detalles) ? cuerpo.detalles : [cuerpo.detalles]));
  }
  if (mensajes.length > 0) return mensajes;

  return error.status >= 500
    ? ['El servidor no responde. Verifica que el backend esté en ejecución']
    : [`Error ${error.status}.`];
}
