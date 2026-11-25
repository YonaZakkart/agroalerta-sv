import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_URL } from './api.config';
import { Estimacion, RespuestaEstimaciones } from './models';

@Injectable({ providedIn: 'root' })
export class EstimacionService {
  private readonly http = inject(HttpClient);

  /** GET /estimaciones: historial del usuario, más reciente primero. */
  listar(): Observable<Estimacion[]> {
    return this.http
      .get<RespuestaEstimaciones>(`${API_URL}/estimaciones`)
      .pipe(map((respuesta) => respuesta.estimaciones));
  }
}
