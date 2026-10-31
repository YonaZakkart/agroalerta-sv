import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();
  const peticion = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  const esAcceso = req.url.endsWith('/auth/login') || req.url.endsWith('/auth/registro');

  return next(peticion).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && token && !esAcceso) {
        const motivo = error.error?.error === 'Sesión expirada' ? 'expirada' : 'invalida';
        auth.cerrarSesion();
        void router.navigate(['/login'], { queryParams: { sesion: motivo } });
      }
      return throwError(() => error);
    }),
  );
};
