import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EstimacionService } from './estimacion.service';
import type { Estimacion } from './models';

describe('EstimacionService', () => {
  let servicio: EstimacionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(EstimacionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista las estimaciones del usuario', () => {
    const estimacion = { id: 1, nivelRiesgo: 'VERDE' } as Estimacion;
    let resultado: Estimacion[] | undefined;
    servicio.listar().subscribe((r) => (resultado = r));

    const peticion = http.expectOne('/api/estimaciones');
    expect(peticion.request.method).toBe('GET');
    peticion.flush({ estimaciones: [estimacion] });

    expect(resultado).toEqual([estimacion]);
  });
});
