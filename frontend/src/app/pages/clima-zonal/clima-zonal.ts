import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, filter, map, switchMap, tap, EMPTY } from 'rxjs';
import { PerfilService } from '../../core/perfil.service';
import { DistritosService } from '../../core/distritos.service';
import { ClimaService, RespuestaClimaDistrito, CondicionDistritoDto } from '../../core/clima.service';
import { Distrito } from '../../core/models';

type CondicionClave = NonNullable<CondicionDistritoDto['condicion']> | 'SIN_EVALUAR';

function claveCondicion(c: CondicionDistritoDto['condicion']): CondicionClave {
  return c ?? 'SIN_EVALUAR';
}

const ETIQUETA_CONDICION: Record<CondicionClave, string> = {
  SEQUIA: 'Sequía',
  EXCESO_LLUVIA: 'Exceso de lluvia',
  INVIERNO_ACEPTABLE: 'Invierno aceptable',
  SIN_EVALUAR: 'Sin evaluar',
};

const ETIQUETA_NIVEL_SEQUIA: Record<NonNullable<CondicionDistritoDto['nivelSequia']>, string> = {
  DEBIL: 'Débil',
  MODERADA: 'Moderada',
  FUERTE: 'Fuerte',
  SEVERA: 'Severa',
};

const ICONO_CONDICION: Record<CondicionClave, string> = {
  SEQUIA: 'fa-solid fa-sun',
  EXCESO_LLUVIA: 'fa-solid fa-cloud-showers-heavy',
  INVIERNO_ACEPTABLE: 'fa-solid fa-cloud-sun',
  SIN_EVALUAR: 'fa-solid fa-circle-question',
};

const CLASE_CONDICION: Record<CondicionClave, string> = {
  SEQUIA: 'condicion-sequia',
  EXCESO_LLUVIA: 'condicion-exceso',
  INVIERNO_ACEPTABLE: 'condicion-aceptable',
  SIN_EVALUAR: 'condicion-sin-evaluar',
};

const CLASE_NIVEL_SEQUIA: Record<NonNullable<CondicionDistritoDto['nivelSequia']>, string> = {
  DEBIL: 'nivel-debil',
  MODERADA: 'nivel-moderada',
  FUERTE: 'nivel-fuerte',
  SEVERA: 'nivel-severa',
};

interface DistritoConClima extends Distrito {
  condicion: RespuestaClimaDistrito['condicion'];
}

@Component({
  imports: [CommonModule, DecimalPipe],
  selector: 'app-clima-zonal',
  styleUrl: './clima-zonal.css',
  templateUrl: './clima-zonal.html',
})
export class ClimaZonal {
  private readonly perfilService = inject(PerfilService);
  private readonly distritosService = inject(DistritosService);
  private readonly climaService = inject(ClimaService);

  protected readonly perfil = this.perfilService.perfil;
  protected readonly perfilNoDisponible = this.perfilService.error;

  protected readonly distritos = signal<Distrito[]>([]);
  protected readonly errorCatalogo = signal(false);
  protected readonly cargandoCatalogo = signal(true);

  protected readonly datosClima = signal<Map<number, RespuestaClimaDistrito['condicion']>>(new Map());
  protected readonly cargandoClima = signal<Set<number>>(new Set());
  protected readonly errorClima = signal<Set<number>>(new Set());

  constructor() {
    this.cargarCatalogo();
  }

  private cargarCatalogo(): void {
    this.cargandoCatalogo.set(true);
    this.errorCatalogo.set(false);
    this.distritosService.listar().subscribe({
      next: (lista) => {
        this.distritos.set(lista);
        this.cargandoCatalogo.set(false);
        this.cargarTodasCondiciones(lista);
      },
      error: () => {
        this.errorCatalogo.set(true);
        this.cargandoCatalogo.set(false);
      },
    });
  }

  private cargarTodasCondiciones(lista: Distrito[]): void {
    for (const d of lista) {
      this.cargarCondicion(d.id);
    }
  }

  protected cargarCondicion(distritoId: number): void {
    const cargando = new Set(this.cargandoClima());
    cargando.add(distritoId);
    this.cargandoClima.set(cargando);

    const errores = new Set(this.errorClima());
    errores.delete(distritoId);
    this.errorClima.set(errores);

    this.climaService.obtenerCondicion(distritoId).pipe(
      takeUntilDestroyed(),
      catchError(() => {
        const err = new Set(this.errorClima());
        err.add(distritoId);
        this.errorClima.set(err);
        return EMPTY;
      }),
      tap((respuesta) => {
        const nuevoMapa = new Map(this.datosClima());
        nuevoMapa.set(distritoId, respuesta.condicion);
        this.datosClima.set(nuevoMapa);

        const cargandoNuevo = new Set(this.cargandoClima());
        cargandoNuevo.delete(distritoId);
        this.cargandoClima.set(cargandoNuevo);
      }),
    ).subscribe();
  }

  protected reintentarCatalogo(): void {
    this.cargarCatalogo();
  }

  protected reintentarCondicion(distritoId: number): void {
    this.cargarCondicion(distritoId);
  }

  protected recargarPerfil(): void {
    this.perfilService.cargar().subscribe();
  }

  protected obtenerCondicion(distritoId: number): RespuestaClimaDistrito['condicion'] | undefined {
    return this.datosClima().get(distritoId);
  }

  protected estaCargando(distritoId: number): boolean {
    return this.cargandoClima().has(distritoId);
  }

  protected tieneError(distritoId: number): boolean {
    return this.errorClima().has(distritoId);
  }

  protected distritosConClima(): DistritoConClima[] {
    return this.distritos().map((d) => ({
      ...d,
      condicion: this.datosClima().get(d.id) ?? null,
    }));
  }

  protected etiquetaCondicion(condicion: CondicionDistritoDto['condicion']): string {
    return ETIQUETA_CONDICION[claveCondicion(condicion)];
  }

  protected etiquetaNivelSequia(nivel: CondicionDistritoDto['nivelSequia']): string {
    return nivel ? ETIQUETA_NIVEL_SEQUIA[nivel] : '—';
  }

  protected iconoCondicion(condicion: CondicionDistritoDto['condicion']): string {
    return ICONO_CONDICION[claveCondicion(condicion)];
  }

  protected claseCondicion(condicion: CondicionDistritoDto['condicion']): string {
    return CLASE_CONDICION[claveCondicion(condicion)];
  }

  protected claseNivelSequia(nivel: CondicionDistritoDto['nivelSequia']): string {
    return nivel ? CLASE_NIVEL_SEQUIA[nivel] : '';
  }

  protected formatearFecha(fecha: string): string {
    if (!fecha) return '—';
    const d = new Date(fecha + 'T00:00:00');
    return d.toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  protected formatearFechaHora(fecha: string): string {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return d.toLocaleString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  protected trackByDistritoId = (_: number, d: Distrito) => d.id;
}