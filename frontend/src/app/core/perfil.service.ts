import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { API_URL } from './api.config';
import { PerfilUsuario, RespuestaPerfil } from './models';

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly perfilActual = signal<PerfilUsuario | null>(null);

  readonly perfil = this.perfilActual.asReadonly();

  /** Consulta /auth/yo y deja el perfil disponible para el shell y el dashboard. */
  cargar(): Observable<PerfilUsuario> {
    return this.http.get<RespuestaPerfil>(`${API_URL}/auth/yo`).pipe(
      map((respuesta) => respuesta.usuario),
      tap((usuario) => this.perfilActual.set(usuario)),
    );
  }

  limpiar(): void {
    this.perfilActual.set(null);
  }
}
