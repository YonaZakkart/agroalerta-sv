import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PerfilService } from './perfil.service';
import { PerfilUsuario } from './models';

const PERFIL: PerfilUsuario = {
  id: 1,
  nombres: 'Ana',
  apellidos: 'Pérez',
  correo: 'ana@example.com',
  distrito: { id: 1304, nombre: 'Chilanga', municipio: { id: 1, nombre: 'Morazán Sur' } },
  verificado: true,
  fechaRegistro: '2026-11-01',
};

describe('PerfilService', () => {
  let servicio: PerfilService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(PerfilService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('guarda el perfil y limpia el error al cargar', () => {
    servicio.cargar().subscribe();
    http.expectOne('/api/auth/yo').flush({ success: true, usuario: PERFIL });

    expect(servicio.perfil()).toEqual(PERFIL);
    expect(servicio.error()).toBe(false);
  });

  it('marca el error cuando /auth/yo falla', () => {
    servicio.cargar().subscribe({ error: () => undefined });
    http
      .expectOne('/api/auth/yo')
      .flush({ error: 'Error interno del servidor' }, { status: 500, statusText: 'Server Error' });

    expect(servicio.error()).toBe(true);
    expect(servicio.perfil()).toBeNull();
  });

  it('limpiar borra el perfil y el error', () => {
    servicio.cargar().subscribe();
    http.expectOne('/api/auth/yo').flush({ success: true, usuario: PERFIL });
    expect(servicio.perfil()).toEqual(PERFIL);

    servicio.limpiar();

    expect(servicio.perfil()).toBeNull();
    expect(servicio.error()).toBe(false);
  });
});
