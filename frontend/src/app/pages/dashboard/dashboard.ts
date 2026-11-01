import { DecimalPipe, LowerCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, filter, switchMap, tap } from 'rxjs';
import { PerfilService } from '../../core/perfil.service';
import { ViabilidadService } from '../../core/viabilidad.service';
import { CULTIVOS, Cultivo, RespuestaViabilidad, TipoCapa } from '../../core/models';

const CLAVE_CULTIVO = 'agroalerta_cultivo';

interface Peticion {
  distritoId: number;
  cultivo: Cultivo;
  intento: number;
}

function leerCultivo(): Cultivo {
  try {
    const guardado = sessionStorage.getItem(CLAVE_CULTIVO);
    const encontrado = CULTIVOS.find((c) => c.valor === guardado);
    if (encontrado) return encontrado.valor;
  } catch {
    // almacenamiento no disponible: se usa el valor por defecto
  }
  return 'maiz';
}

@Component({
  imports: [DecimalPipe, LowerCasePipe],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly viabilidad = inject(ViabilidadService);

  protected readonly perfil = inject(PerfilService).perfil;
  protected readonly cultivos = CULTIVOS;
  protected readonly cultivo = signal<Cultivo>(leerCultivo());
  protected readonly datos = signal<RespuestaViabilidad | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal(false);
  private readonly intento = signal(0);

  protected readonly capas = computed(() => this.datos()?.capas ?? []);

  // Se dispara cuando llega el perfil (de ahí sale el id del distrito), cambia el cultivo o se reintenta.
  private readonly peticion = computed<Peticion | null>(() => {
    const p = this.perfil();
    return p ? { distritoId: p.distrito.id, cultivo: this.cultivo(), intento: this.intento() } : null;
  });

  constructor() {
    toObservable(this.peticion)
      .pipe(
        filter((p): p is Peticion => p !== null),
        tap(() => {
          this.cargando.set(true);
          this.error.set(false);
        }),
        switchMap((p) =>
          this.viabilidad.consultar(p.distritoId, p.cultivo).pipe(
            catchError(() => {
              this.error.set(true);
              this.cargando.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((respuesta) => {
        this.datos.set(respuesta);
        this.cargando.set(false);
      });
  }

  protected elegir(cultivo: Cultivo): void {
    this.cultivo.set(cultivo);
    try {
      sessionStorage.setItem(CLAVE_CULTIVO, cultivo);
    } catch {
      // almacenamiento no disponible: el cultivo solo vive en memoria
    }
  }

  protected reintentar(): void {
    this.intento.update((n) => n + 1);
  }

  /** En potencial, valor mayor es mejor; en riesgo, valor mayor es peor. El color depende del tipo, no del número. */
  protected nivel(tipo: TipoCapa, valor: number): 'bueno' | 'medio' | 'malo' {
    const n = tipo === 'POTENCIAL' ? valor : 4 - valor;
    return n >= 3 ? 'bueno' : n === 2 ? 'medio' : 'malo';
  }
}
