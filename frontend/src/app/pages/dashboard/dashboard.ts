import { DecimalPipe, LowerCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, filter, switchMap, tap } from 'rxjs';
import { DistritosService } from '../../core/distritos.service';
import { PerfilService } from '../../core/perfil.service';
import { ViabilidadService } from '../../core/viabilidad.service';
import { CULTIVOS, Cultivo, Distrito, RespuestaViabilidad, TipoCapa } from '../../core/models';

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
  private readonly catalogo = inject(DistritosService);

  protected readonly perfil = inject(PerfilService).perfil;
  protected readonly cultivos = CULTIVOS;
  protected readonly cultivo = signal<Cultivo>(leerCultivo());
  protected readonly datos = signal<RespuestaViabilidad | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal(false);
  private readonly intento = signal(0);

  protected readonly capas = computed(() => this.datos()?.capas ?? []);

  // El distrito consultado es el elegido en el selector o, si no hay, el del perfil. Solo vive en memoria.
  protected readonly distritos = signal<Distrito[]>([]);
  private readonly distritoElegidoId = signal<number | null>(null);

  protected readonly distritoActual = computed<Distrito | null>(() => {
    const id = this.distritoElegidoId();
    const elegido = id === null ? undefined : this.distritos().find((d) => d.id === id);
    return elegido ?? this.perfil()?.distrito ?? null;
  });

  protected readonly esOtroDistrito = computed(() => {
    const propio = this.perfil()?.distrito.id;
    const actual = this.distritoActual()?.id;
    return propio !== undefined && actual !== undefined && propio !== actual;
  });

  // Se dispara cuando llega el perfil, cambia el distrito o el cultivo, o se reintenta.
  private readonly peticion = computed<Peticion | null>(() => {
    const d = this.distritoActual();
    return d ? { distritoId: d.id, cultivo: this.cultivo(), intento: this.intento() } : null;
  });

  constructor() {
    // Si el catálogo falla, simplemente no se ofrece el selector y se sigue con el distrito del perfil.
    this.catalogo.listar().subscribe({ next: (lista) => this.distritos.set(lista), error: () => { } });
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

  protected cambiarDistrito(evento: Event): void {
    const id = Number((evento.target as HTMLSelectElement).value);
    // Si vuelve a elegir el propio, se limpia la selección para no repetir la consulta.
    this.distritoElegidoId.set(id === this.perfil()?.distrito.id ? null : id);
  }

  protected volverAMiDistrito(): void {
    this.distritoElegidoId.set(null);
  }

  /** En potencial, valor mayor es mejor; en riesgo, valor mayor es peor. El color depende del tipo, no del número. */
  protected nivel(tipo: TipoCapa, valor: number): 'bueno' | 'medio' | 'malo' {
    const n = tipo === 'POTENCIAL' ? valor : 4 - valor;
    return n >= 3 ? 'bueno' : n === 2 ? 'medio' : 'malo';
  }
}
