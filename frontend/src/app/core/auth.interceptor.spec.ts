import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpTestingController;
  const token = signal<string | null>('token-de-prueba');

  beforeEach(() => {
    token.set('token-de-prueba');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            token: token.asReadonly(),
            cerrarSesion: () => token.set(null),
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
});
