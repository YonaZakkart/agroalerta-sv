import { Component, DestroyRef, OnInit, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { CULTIVOS_SIEMBRA, Distrito, EstadoSiembra, DatosSiembra } from '../../core/models';
import { DistritosService } from '../../core/distritos.service';
import { PerfilService } from '../../core/perfil.service';
import { SiembraService } from '../../core/siembra.service';
import { mensajesDeError } from '../../core/errores';

/** Fecha local AAAA-MM-DD, para comparar con <input type="date">. */
function hoyLocal(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Regla D (4-B): SEMBRADO no puede tener fecha futura; POR_SEMBRAR no puede tener fecha pasada. */
function fechaCoherenteConEstado(control: AbstractControl): ValidationErrors | null {
  const grupo = control.parent;
  const estado = grupo?.get('estado')?.value as EstadoSiembra | undefined;
  const fecha = control.value as string;
  if (!fecha || !estado) return null;
  const hoy = hoyLocal();
  if (estado === 'SEMBRADO' && fecha > hoy) return { fechaFutura: true };
  if (estado === 'POR_SEMBRAR' && fecha < hoy) return { fechaPasada: true };
  return null;
}

/** Semilla: cantidad y unidad van juntas (o ninguna). */
function semillaCompleta(grupo: AbstractControl): ValidationErrors | null {
  const cantidad = grupo.get('cantidadSemilla')?.value;
  const unidad = grupo.get('unidadSemilla')?.value;
  const hayCantidad = cantidad !== null && cantidad !== '';
  const hayUnidad = !!unidad;
  return hayCantidad !== hayUnidad ? { semillaIncompleta: true } : null;
}

@Component({
  selector: 'app-siembra',
  imports: [ReactiveFormsModule],
  templateUrl: './siembra.html',
  styleUrl: './siembra.css',
})
export class Siembra implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly distritosService = inject(DistritosService);
  private readonly perfilService = inject(PerfilService);
  private readonly siembraService = inject(SiembraService);

  readonly cultivos = CULTIVOS_SIEMBRA;
  readonly distritos = signal<Distrito[]>([]);
  readonly cargandoDistritos = signal(true);
  readonly errorDistritos = signal(false);
  readonly enviando = signal(false);
  readonly erroresBackend = signal<string[]>([]);
  readonly enviadaOk = signal(false);
  readonly hoy = hoyLocal();

  readonly form = this.fb.nonNullable.group(
    {
      // Agronómico
      cultivo: ['MAIZ' as 'MAIZ' | 'FRIJOL' | 'MAICILLO', [Validators.required]],
      distritoId: [0, [Validators.required, Validators.min(1)]],
      estado: ['POR_SEMBRAR' as EstadoSiembra, [Validators.required]],
      fechaSiembra: ['', [Validators.required, fechaCoherenteConEstado]],
      areaMz: [null as number | null, [Validators.required, Validators.min(0.01), Validators.max(999999.99)]],
      cantidadSemilla: [null as number | null, [Validators.min(0.01)]],
      unidadSemilla: [null as 'LIBRAS' | 'BOLSAS' | null],
      // Técnico
      alquilaTerreno: [false],
      usaMaquinaria: [false],
      usaRiego: [false],
      inversionTotalUsd: [null as number | null, [Validators.required, Validators.min(0)]],
      costoSemillaUsd: [null as number | null, [Validators.min(0)]],
      costoAlquilerUsd: [null as number | null, [Validators.min(0)]],
      costoMaquinariaUsd: [null as number | null, [Validators.min(0)]],
      costoRiegoUsd: [null as number | null, [Validators.min(0)]],
      costoOtrosUsd: [null as number | null, [Validators.min(0)]],
    },
    { validators: [semillaCompleta] },
  );

  /** Suma del desglose; solo sirve para advertir si supera la inversión total. */
  readonly desgloseSuperaTotal = computed(() => {
    const v = this.form.getRawValue();
    const suma = [v.costoSemillaUsd, v.costoAlquilerUsd, v.costoMaquinariaUsd, v.costoRiegoUsd, v.costoOtrosUsd]
      .reduce<number>((acc, n) => acc + (n ?? 0), 0);
    return v.inversionTotalUsd !== null && suma > v.inversionTotalUsd;
  });

  ngOnInit(): void {
    this.cargarDistritos();
    this.usarDistritoDelPerfil();

    // Al cambiar el estado, revalida la fecha para que el error desaparezca o aparezca al momento.
    this.form.controls.estado.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.form.controls.fechaSiembra.updateValueAndValidity());
  }

  cargarDistritos(): void {
    this.cargandoDistritos.set(true);
    this.errorDistritos.set(false);
    this.distritosService
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lista) => {
          this.distritos.set(lista);
          this.cargandoDistritos.set(false);
        },
        error: () => {
          this.errorDistritos.set(true);
          this.cargandoDistritos.set(false);
        },
      });
  }

  /** D1 (aprobada): el distrito del perfil es el valor inicial; el usuario puede cambiarlo. */
  private usarDistritoDelPerfil(): void {
    const perfil = this.perfilService.perfil();
    if (perfil) {
      this.form.controls.distritoId.setValue(perfil.distrito.id);
      return;
    }
    this.perfilService
      .cargar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((usuario) => this.form.controls.distritoId.setValue(usuario.distrito.id));
  }

  enviar(): void {
    this.erroresBackend.set([]);
    this.enviadaOk.set(false);
    if (this.form.invalid || this.enviando()) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const datos: DatosSiembra = {
      distritoId: v.distritoId,
      cultivo: v.cultivo,
      estado: v.estado,
      fechaSiembra: v.fechaSiembra,
      areaMz: v.areaMz as number,
      alquilaTerreno: v.alquilaTerreno,
      usaMaquinaria: v.usaMaquinaria,
      usaRiego: v.usaRiego,
      inversionTotalUsd: v.inversionTotalUsd as number,
      // Los opcionales vacíos se omiten: el backend los trata como ausentes.
      ...(v.cantidadSemilla !== null && { cantidadSemilla: v.cantidadSemilla }),
      ...(v.unidadSemilla && { unidadSemilla: v.unidadSemilla }),
      ...(v.costoSemillaUsd !== null && { costoSemillaUsd: v.costoSemillaUsd }),
      ...(v.costoAlquilerUsd !== null && { costoAlquilerUsd: v.costoAlquilerUsd }),
      ...(v.costoMaquinariaUsd !== null && { costoMaquinariaUsd: v.costoMaquinariaUsd }),
      ...(v.costoRiegoUsd !== null && { costoRiegoUsd: v.costoRiegoUsd }),
      ...(v.costoOtrosUsd !== null && { costoOtrosUsd: v.costoOtrosUsd }),
    };

    this.enviando.set(true);
    this.siembraService
      .registrar(datos)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.enviadaOk.set(true);
          this.form.reset({
            cultivo: 'MAIZ',
            distritoId: v.distritoId,
            estado: 'POR_SEMBRAR',
            alquilaTerreno: false,
            usaMaquinaria: false,
            usaRiego: false,
          });
        },
        error: (error: unknown) => {
          this.enviando.set(false);
          this.erroresBackend.set(mensajesDeError(error));
        },
      });
  }

  volverAlDashboard(): void {
    this.router.navigateByUrl('/dashboard');
  }
}