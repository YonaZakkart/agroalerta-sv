import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from './api.config';

export interface CondicionDistritoDto {
  condicion: 'SEQUIA' | 'EXCESO_LLUVIA' | 'INVIERNO_ACEPTABLE' | null;
  nivelSequia: 'DEBIL' | 'MODERADA' | 'FUERTE' | 'SEVERA' | null;
  diasSecosConsecutivos: number;
  acumulado30Mm: number | null;
  normal30Mm: number | null;
  razon30: number | null;
  fechaDatos: string;
  actualizadoEn: string;
  condicionDesde: string | null;
}

export interface RespuestaClimaDistrito {
  distrito: { id: number; nombre: string; municipio: { id: number; nombre: string } };
  condicion: CondicionDistritoDto | null;
  fuente: string;
  atribucion: { texto: string; url: string; licencia: string; urlLicencia: string };
}

export interface ClimaActual {
  fuente: string;
  atribucion: { texto: string; url: string; licencia: string; urlLicencia: string };
  consultadoEn: string;
  zonaHoraria: string;
  fechaLocal: string;
  fechaUltimoDiaCompleto: string | null;
  normalDisponible: boolean;
  distritos: DistritoClima[];
}

export interface DistritoClima {
  distritoId: number;
  celdaModelo: { latitud: number; longitud: number; elevacionM: number | null };
  diario: DiaLluvia[];
  normal30Mm: number | null;
}

export interface DiaLluvia {
  fecha: string;
  precipitacionMm: number | null;
  completo: boolean;
}

@Injectable({ providedIn: 'root' })
export class ClimaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = API_URL;

  /** GET /clima/distritos/:id - última condición guardada (rápida, sin consultar Open-Meteo) */
  obtenerCondicion(distritoId: number): Observable<RespuestaClimaDistrito> {
    return this.http.get<RespuestaClimaDistrito>(`${this.baseUrl}/clima/distritos/${distritoId}`);
  }

  /** POST /clima/actualizar - fuerza actualización bajo demanda (opcional) */
  actualizar(distritoIds: number[]): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/clima/actualizar`, { distritoIds });
  }
}