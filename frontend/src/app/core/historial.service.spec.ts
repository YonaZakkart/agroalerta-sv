import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { HistorialService } from './historial.service';
import { EstimacionService } from './estimacion.service';
import { SiembraService } from './siembra.service';
import type { Estimacion, Siembra } from './models';

describe('HistorialService', () => {
  const siembra = { id: 1, cultivo: 'MAIZ' } as Siembra;
  const estimacion = { id: 10, siembraId: 1 } as Estimacion;

  function configurar(estimaciones: Estimacion[]): void {
    TestBed.configureTestingModule({
      providers: [
        HistorialService,
        { provide: SiembraService, useValue: { listar: () => of([siembra]) } },
        { provide: EstimacionService, useValue: { listar: () => of(estimaciones) } },
      ],
    });
  }

  it('asocia la última estimación a cada siembra', async () => {
    configurar([estimacion, { id: 9, siembraId: 1 } as Estimacion]);
    const items = await firstValueFrom(TestBed.inject(HistorialService).listar());
    expect(items).toEqual([{ siembra, estimacion }]);
  });

  it('deja la estimación en null cuando no existe', async () => {
    configurar([]);
    const items = await firstValueFrom(TestBed.inject(HistorialService).listar());
    expect(items[0]?.estimacion).toBeNull();
  });
});
