import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { authGuard, invitadoGuard } from './auth.guard';
import { AuthService } from './auth.service';

type GuardFn = (route: unknown, state: unknown) => unknown;

function ejecutar(guard: typeof authGuard): unknown {
  return TestBed.runInInjectionContext(() =>
    (guard as GuardFn)({}, {}),
  );
}

describe('guards de autenticación', () => {
  let autenticado: boolean;
  let router: Router;

  beforeEach(() => {
    autenticado = false;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', children: [] },
          { path: 'dashboard', children: [] },
        ]),
        { provide: AuthService, useValue: { autenticado: () => autenticado } },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('authGuard deja pasar con sesión y redirige a login sin ella', () => {
    autenticado = true;
    expect(ejecutar(authGuard)).toBe(true);

    autenticado = false;
    const resultado = ejecutar(authGuard);
    expect(resultado instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(resultado as UrlTree)).toBe('/login');
  });

  it('invitadoGuard redirige al dashboard si ya hay sesión', () => {
    autenticado = true;
    const resultado = ejecutar(invitadoGuard);
    expect(resultado instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(resultado as UrlTree)).toBe('/dashboard');
  });

  it('invitadoGuard deja ver login y registro sin sesión', () => {
    expect(ejecutar(invitadoGuard)).toBe(true);
  });
});
