import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { PerfilService } from './perfil.service';

describe('authInterceptor', () => {
  let http: HttpTestingController;
  let perfilLimpiado: number;
  const token = signal<string | null>('token-de-prueba');

  beforeEach(() => {
    token.set('token-de-prueba');
    perfilLimpiado = 0;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', children: [] }]),
        {
          provide: AuthService,
          useValue: {
            token: token.asReadonly(),
            cerrarSesion: () => token.set(null),
          },
        },
        {
          provide: PerfilService,
          useValue: {
            limpiar: () => {
              perfilLimpiado++;
            },
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('agrega el token a las peticiones del API', () => {
    TestBed.inject(HttpClient).get('/api/auth/yo').subscribe();
    const peticion = http.expectOne('/api/auth/yo');
    expect(peticion.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
    peticion.flush({});
  });

  it('no filtra el token a otros orígenes ni a recursos estáticos', () => {
    TestBed.inject(HttpClient).get('https://ejemplo.com/datos').subscribe();
    const externo = http.expectOne('https://ejemplo.com/datos');
    expect(externo.request.headers.has('Authorization')).toBe(false);
    externo.flush({});

    TestBed.inject(HttpClient).get('/assets/logo.svg').subscribe();
    const estatico = http.expectOne('/assets/logo.svg');
    expect(estatico.request.headers.has('Authorization')).toBe(false);
    estatico.flush('');
  });

  it('sin token no agrega el encabezado', () => {
    token.set(null);
    TestBed.inject(HttpClient).get('/api/distritos').subscribe();
    const peticion = http.expectOne('/api/distritos');
    expect(peticion.request.headers.has('Authorization')).toBe(false);
    peticion.flush([]);
  });

  it('ante un 401 cierra la sesión y limpia el perfil anterior', () => {
    TestBed.inject(HttpClient).get('/api/auth/yo').subscribe({ error: () => undefined });
    http.expectOne('/api/auth/yo').flush(
      { error: 'Sesión expirada' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(token()).toBeNull();
    expect(perfilLimpiado).toBe(1);
  });

  it('ante un 401 en login no limpia la sesión', () => {
    TestBed.inject(HttpClient).post('/api/auth/login', {}).subscribe({ error: () => undefined });
    http.expectOne('/api/auth/login').flush(
      { error: 'Credenciales inválidas' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(token()).toBe('token-de-prueba');
    expect(perfilLimpiado).toBe(0);
  });
});
