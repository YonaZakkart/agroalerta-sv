import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_URL } from './api.config';
import { DatosRegistro, RespuestaLogin, RespuestaRegistro, RespuestaVerificacion } from './models';

const CLAVE_TOKEN = 'agroalerta_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenActual = signal<string | null>(this.leerToken());

  readonly token = this.tokenActual.asReadonly();
  readonly autenticado = computed(() => this.tokenActual() !== null);

  login(correo: string, contrasena: string): Observable<RespuestaLogin> {
    return this.http
      .post<RespuestaLogin>(`${API_URL}/auth/login`, { correo, contrasena })
      .pipe(tap((respuesta) => this.guardarToken(respuesta.token)));
  }

  registrar(datos: DatosRegistro): Observable<RespuestaRegistro> {
    return this.http.post<RespuestaRegistro>(`${API_URL}/auth/registro`, datos);
  }

  verificar(token: string): Observable<RespuestaVerificacion> {
    return this.http.get<RespuestaVerificacion>(`${API_URL}/auth/verificar/${token}`);
  }

  cerrarSesion(): void {
    this.tokenActual.set(null);
    try {
      sessionStorage.removeItem(CLAVE_TOKEN);
    } catch {
      // almacenamiento no disponible: la sesión solo vive en memoria
    }
  }

  private guardarToken(token: string): void {
    this.tokenActual.set(token);
    try {
      sessionStorage.setItem(CLAVE_TOKEN, token);
    } catch {
      // almacenamiento no disponible: la sesión solo vive en memoria
    }
  }

  private leerToken(): string | null {
    try {
      return sessionStorage.getItem(CLAVE_TOKEN);
    } catch {
      return null; // servidor (SSR) o almacenamiento bloqueado
    }
  }
}
