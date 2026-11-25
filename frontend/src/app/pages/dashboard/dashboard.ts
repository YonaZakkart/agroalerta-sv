import { CurrencyPipe, DatePipe, DecimalPipe, LowerCasePipe } from '@angular/common';
import { Component, computed, inject, signal, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, filter, switchMap, tap } from 'rxjs';
import { DistritosService } from '../../core/distritos.service';
import { PerfilService } from '../../core/perfil.service';
import { ViabilidadService } from '../../core/viabilidad.service';
import { EstimacionService } from '../../core/estimacion.service';
import {
  CULTIVO_A_ENUM,
  CULTIVOS,
  CondicionClimatica,
  Cultivo,
  Distrito,
  Estimacion,
  RespuestaViabilidad,
  TipoCapa,
} from '../../core/models';

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
  imports: [CurrencyPipe, DatePipe, DecimalPipe, LowerCasePipe, RouterLink],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly destroyRef = inject(DestroyRef);
  private readonly viabilidad = inject(ViabilidadService);
  private readonly catalogo = inject(DistritosService);
  private readonly perfilService = inject(PerfilService);
  private readonly estimacionService = inject(EstimacionService);

  protected readonly perfil = this.perfilService.perfil;
  protected readonly perfilNoDisponible = this.perfilService.error;
  protected readonly cultivos = CULTIVOS;
  protected readonly cultivo = signal<Cultivo>(leerCultivo());
  protected readonly datos = signal<RespuestaViabilidad | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal(false);
  protected readonly errorCatalogo = signal(false);
  protected readonly estimaciones = signal<Estimacion[]>([]);
  protected readonly cargandoEstimacion = signal(true);
  protected readonly errorEstimacion = signal(false);
  private readonly intento = signal(0);

  protected readonly capas = computed(() => this.datos()?.capas ?? []);

  /** Última estimación del cultivo y distrito seleccionados; la lista llega ordenada del más reciente al más viejo. */
  protected readonly estimacionActual = computed<Estimacion | null>(() => {
    const distrito = this.distritoActual();
    if (!distrito) return null;
    const cultivo = CULTIVO_A_ENUM[this.cultivo()];
    return this.estimaciones().find((e) => e.distritoId === distrito.id && e.cultivo === cultivo) ?? null;
  });

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
    // Si el catálogo falla se sigue con el distrito del perfil y se ofrece reintentar.
    this.cargarDistritos();
    this.cargarEstimaciones();
    toObservable(this.peticion)
      .pipe(
        filter((p): p is Peticion => p !== null),
        tap(() => {
          // No mostrar el distrito/fuente de la consulta anterior mientras llega la nueva.
          this.datos.set(null);
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

  protected cargarEstimaciones(): void {
    this.cargandoEstimacion.set(true);
    this.errorEstimacion.set(false);
    this.estimacionService.listar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (lista) => {
        this.estimaciones.set(lista);
        this.cargandoEstimacion.set(false);
      },
      error: () => {
        this.errorEstimacion.set(true);
        this.cargandoEstimacion.set(false);
      },
    });
  }

  protected condicionTexto(condicion: CondicionClimatica | null): string {
    if (condicion === 'SEQUIA') return 'Sequía';
    if (condicion === 'EXCESO_LLUVIA') return 'Exceso de lluvia';
    if (condicion === 'INVIERNO_ACEPTABLE') return 'Invierno aceptable';
    return 'Sin evaluar';
  }

  protected detalleClima(estimacion: Estimacion): string {
    const nivel = estimacion.nivelSequia ? ` (${estimacion.nivelSequia.toLowerCase()})` : '';
    const fecha = estimacion.fechaDatos ? ` · datos al ${estimacion.fechaDatos}` : '';
    return `${this.condicionTexto(estimacion.condicion)}${nivel}${fecha}`;
  }

  protected reintentar(): void {
    this.intento.update((n) => n + 1);
  }

  protected cargarDistritos(): void {
    this.errorCatalogo.set(false);
    this.catalogo.listar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (lista) => this.distritos.set(lista),
      error: () => this.errorCatalogo.set(true),
    });
  }

  /** Si /auth/yo falló, el dashboard no tiene distrito; este reintento lo recupera. */
  protected recargarPerfil(): void {
    this.perfilService.cargar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => undefined });
  }

  protected cambiarDistrito(evento: Event): void {
    const id = Number((evento.target as HTMLSelectElement).value);
    // Si vuelve a elegir el propio, se limpia la selección para no repetir la consulta.
    this.distritoElegidoId.set(id === this.perfil()?.distrito.id ? null : id);
  }

  /** Navegación con flechas del radiogroup de cultivos (comportamiento esperado de ARIA). */
  protected moverCultivo(evento: KeyboardEvent, indice: number): void {
    const paso =
      evento.key === 'ArrowRight' || evento.key === 'ArrowDown'
        ? 1
        : evento.key === 'ArrowLeft' || evento.key === 'ArrowUp'
          ? -1
          : 0;
    if (paso === 0) return;

    evento.preventDefault();
    const siguiente = (indice + paso + CULTIVOS.length) % CULTIVOS.length;
    this.elegir(CULTIVOS[siguiente]!.valor);
    const botones = (evento.currentTarget as HTMLElement).parentElement?.querySelectorAll('button');
    botones?.[siguiente]?.focus();
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
