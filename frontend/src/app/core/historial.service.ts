import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { EstimacionService } from './estimacion.service';
import { SiembraService } from './siembra.service';
import type { ItemHistorial } from './models';

@Injectable({ providedIn: 'root' })
export class HistorialService {
  private readonly siembras = inject(SiembraService);
  private readonly estimaciones = inject(EstimacionService);

  /** Combina siembras y estimaciones; la primera estimación de cada siembra es la más reciente. */
  listar(): Observable<ItemHistorial[]> {
    return forkJoin({
      siembras: this.siembras.listar(),
      estimaciones: this.estimaciones.listar(),
    }).pipe(
      map(({ siembras, estimaciones }) =>
        siembras.map((siembra) => ({
          siembra,
          estimacion: estimaciones.find((e) => e.siembraId === siembra.id) ?? null,
        })),
      ),
    );
  }
}
