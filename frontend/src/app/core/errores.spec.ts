import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { mensajesDeError } from './errores';

function respuesta(status: number, error: unknown, headers?: Record<string, string>) {
  return new HttpErrorResponse({
    status,
    error,
    headers: new HttpHeaders(headers ?? {}),
    url: '/api/prueba',
  });
}

describe('mensajesDeError', () => {
  it('explica un timeout del interceptor', () => {
    expect(mensajesDeError(new TimeoutError())[0]).toMatch(/tardó demasiado/);
  });

  it('prioriza el contrato { error, detalles } del backend', () => {
    expect(
      mensajesDeError(
        respuesta(400, { error: 'Datos inválidos', detalles: ['correo inválido', 'dui inválido'] }),
      ),
    ).toEqual(['Datos inválidos', 'correo inválido', 'dui inválido']);
  });

  it('explica la falta de conexión', () => {
    expect(mensajesDeError(respuesta(0, new ProgressEvent('error')))[0]).toMatch(/No se pudo conectar/);
  });

  it('usa Retry-After en un 429 sin cuerpo', () => {
    expect(mensajesDeError(respuesta(429, null, { 'Retry-After': '120' }))[0]).toMatch(
      /Espera 2 minuto/,
    );
    expect(mensajesDeError(respuesta(429, null, { 'Retry-After': '30' }))[0]).toMatch(
      /Espera 30 segundo/,
    );
    expect(mensajesDeError(respuesta(429, null))[0]).toMatch(/Espera un momento/);
  });

  it('aclara los 403, 413 y 5xx sin cuerpo', () => {
    expect(mensajesDeError(respuesta(403, null))[0]).toMatch(/verifica tu correo/);
    expect(mensajesDeError(respuesta(413, null))[0]).toMatch(/demasiado grande/);
    expect(mensajesDeError(respuesta(503, null))[0]).toMatch(/servidor no responde/);
  });

  it('cae a un mensaje genérico con el código', () => {
    expect(mensajesDeError(respuesta(418, null))).toEqual(['Error 418.']);
    expect(mensajesDeError(new Error('otro'))).toEqual(['Ocurrió un error inesperado']);
  });
});
