import { Routes } from '@angular/router';
import { Shell } from './layout/shell/shell';
import { authGuard, invitadoGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión | AgroAlerta',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'registro',
    title: 'Registro | AgroAlerta',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/registro/registro').then((m) => m.Registro),
  },
  {
    path: 'verificar/:token',
    title: 'Verificar correo | AgroAlerta',
    loadComponent: () => import('./pages/verificar/verificar').then((m) => m.Verificar),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        title: 'Dashboard | AgroAlerta',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'clima-zonal',
        title: 'Clima Zonal | AgroAlerta',
        loadComponent: () => import('./pages/clima-zonal/clima-zonal').then((m) => m.ClimaZonal),
      },
      {
        path: 'siembra',
        title: 'Registrar siembra | AgroAlerta',
        loadComponent: () => import('./pages/siembra/siembra').then((m) => m.Siembra),
      },
      {
        path: 'historial',
        title: 'Historial | AgroAlerta',
        loadComponent: () => import('./pages/historial/historial').then((m) => m.Historial),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];