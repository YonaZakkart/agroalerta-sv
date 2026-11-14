import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

const CLAVE_TOKEN = 'agroalerta_token';

function tokenConExpiracion(expSegundos: number): string {
  const base64url = (valor: string) =>
    btoa(valor).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url('{"alg":"HS256"}')}.${base64url(JSON.stringify({ sub: '1', exp: expSegundos }))}.firma`;
}

describe('AuthService', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    sessionStorage.clear();
    http.verify();
  });

  it('descarta al arrancar un token ya vencido', () => {
    sessionStorage.setItem(CLAVE_TOKEN, tokenConExpiracion(Math.floor(Date.now() / 1000) - 60));

    const servicio = TestBed.inject(AuthService);

    expect(servicio.token()).toBeNull();
    expect(servicio.autenticado()).toBe(false);
    expect(sessionStorage.getItem(CLAVE_TOKEN)).toBeNull();
  });

  it('mantiene la sesión con un token vigente', () => {
    const vigente = tokenConExpiracion(Math.floor(Date.now() / 1000) + 3_600);
    sessionStorage.setItem(CLAVE_TOKEN, vigente);

    const servicio = TestBed.inject(AuthService);

    expect(servicio.token()).toBe(vigente);
    expect(servicio.autenticado()).toBe(true);
  });

  it('guarda el token al iniciar sesión y lo borra al cerrar', () => {
    const servicio = TestBed.inject(AuthService);
    const token = tokenConExpiracion(Math.floor(Date.now() / 1000) + 3_600);

    servicio.login('ana@example.com', 'secreta123').subscribe();
    http.expectOne('/api/auth/login').flush({ token, usuario: {} });

    expect(servicio.autenticado()).toBe(true);
    expect(sessionStorage.getItem(CLAVE_TOKEN)).toBe(token);

    servicio.cerrarSesion();
    expect(servicio.autenticado()).toBe(false);
    expect(sessionStorage.getItem(CLAVE_TOKEN)).toBeNull();
  });
});
