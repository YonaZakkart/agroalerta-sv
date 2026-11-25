import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { HistorialService } from '../../core/historial.service';
import type { CondicionClimatica, ItemHistorial } from '../../core/models';

@Component({
  selector: 'app-historial',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink],
  styleUrl: './historial.css',
  templateUrl: './historial.html',
})
export class Historial {
  private readonly destroyRef = inject(DestroyRef);
  private readonly historialService = inject(HistorialService);

  protected readonly items = signal<ItemHistorial[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal(false);

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.historialService.listar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        this.items.set(items);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      },
    });
  }

  protected etiquetaCultivo(cultivo: string): string {
    if (cultivo === 'MAIZ') return 'Maíz';
    if (cultivo === 'FRIJOL') return 'Frijol';
    if (cultivo === 'MAICILLO') return 'Maicillo';
    return cultivo;
  }

  protected etiquetaEstado(estado: string): string {
    return estado === 'SEMBRADO' ? 'Sembrado' : 'Por sembrar';
  }

  protected condicionTexto(condicion: CondicionClimatica | null): string {
    if (condicion === 'SEQUIA') return 'Sequía';
    if (condicion === 'EXCESO_LLUVIA') return 'Exceso de lluvia';
    if (condicion === 'INVIERNO_ACEPTABLE') return 'Invierno aceptable';
    return 'Sin evaluar';
  }

  protected detalleClima(item: ItemHistorial): string {
    const e = item.estimacion;
    if (!e) return '';
    const nivel = e.nivelSequia ? ` (${e.nivelSequia.toLowerCase()})` : '';
    const fecha = e.fechaDatos ? ` · datos al ${e.fechaDatos}` : '';
    return `${this.condicionTexto(e.condicion)}${nivel}${fecha}`;
  }
}
