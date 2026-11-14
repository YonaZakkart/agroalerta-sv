import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () =>
  inject(AuthService).autenticado() ? true : inject(Router).createUrlTree(['/login']);

/** Login y registro no tienen sentido con una sesión activa. */
export const invitadoGuard: CanActivateFn = () =>
  inject(AuthService).autenticado() ? inject(Router).createUrlTree(['/dashboard']) : true;
