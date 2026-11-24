import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api.config';
import { DatosSiembra } from './models';

@Injectable({ providedIn: 'root' })
export class SiembraService {
  private readonly http = inject(HttpClient);

  /** Registra una siembra del usuario autenticado. La forma de la respuesta se define con 4-D. */
  registrar(datos: DatosSiembra): Observable<unknown> {
    return this.http.post(`${API_URL}/siembras`, datos);
  }
}