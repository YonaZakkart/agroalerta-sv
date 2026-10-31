import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_URL } from './api.config';
import { Distrito, RespuestaDistritos } from './models';

@Injectable({ providedIn: 'root' })
export class DistritosService {
  private readonly http = inject(HttpClient);

  /** Catálogo público: se consulta antes del login. */
  listar(): Observable<Distrito[]> {
    return this.http
      .get<RespuestaDistritos>(`${API_URL}/distritos`)
      .pipe(map((respuesta) => respuesta.distritos));
  }
}
