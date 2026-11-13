import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL } from './api.config';
import { AuthService } from './auth.service';
import { PerfilService } from './perfil.service';

/** El token solo viaja al API propio; nunca a orígenes externos ni a recursos estáticos. */
function esPeticionApi(url: string): boolean {
  return url === API_URL || url.startsWith(`${API_URL}/`) || url.startsWith(`${API_URL}?`);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const perfil = inject(PerfilService);
  const token = auth.token();
  const peticion = token && esPeticionApi(req.url)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;
  const esAcceso = req.url.endsWith('/auth/login') || req.url.endsWith('/auth/registro');

  return next(peticion).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && token && !esAcceso) {
        const motivo = error.error?.error === 'Sesión expirada' ? 'expirada' : 'invalida';
        auth.cerrarSesion();
        // Sin esto, el distrito del usuario anterior quedaría visible hasta que
        // otra vista volviera a cargar el perfil.
        perfil.limpiar();
        void router.navigate(['/login'], { queryParams: { sesion: motivo } });
      }
      return throwError(() => error);
    }),
  );
};
