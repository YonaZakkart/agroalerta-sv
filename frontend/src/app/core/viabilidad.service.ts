import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api.config';
import { Cultivo, RespuestaViabilidad } from './models';

@Injectable({ providedIn: 'root' })
export class ViabilidadService {
  private readonly http = inject(HttpClient);

  /** Potencial del cultivo más riesgo de sequía (el backend lo incluye al filtrar por cultivo). */
  consultar(distritoId: number, cultivo: Cultivo): Observable<RespuestaViabilidad> {
    const params = new HttpParams().set('cultivo', cultivo);
    return this.http.get<RespuestaViabilidad>(`${API_URL}/viabilidad/distritos/${distritoId}`, { params });
  }
}
