import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth.service';
import { PerfilService } from '../../core/perfil.service';
import { ClimaService, CondicionDistritoDto } from '../../core/clima.service';

@Component({
  selector: 'app-shell',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly perfilService = inject(PerfilService);
  private readonly climaService = inject(ClimaService);
  private readonly router = inject(Router);

  protected readonly menuAbierto = signal(false);
  protected readonly errorPerfil = signal(false);
  protected readonly perfil = this.perfilService.perfil;

  // Clima en el encabezado (compacto)
  protected readonly condicionHeader = signal<CondicionDistritoDto | null>(null);
  protected readonly cargandoHeader = signal(false);
  protected readonly errorHeader = signal(false);

  protected readonly nombreCorto = computed(() => {
    const p = this.perfil();
    if (!p) return '';
    return `${p.nombres.trim().split(/\s+/)[0]} ${p.apellidos.trim().split(/\s+/)[0]}`;
  });

  protected readonly iniciales = computed(() => {
    const p = this.perfil();
    if (!p) return '';
    return (p.nombres.trim().charAt(0) + p.apellidos.trim().charAt(0)).toUpperCase();
  });

  constructor() {
    this.cargarPerfil();
  }

  protected cargarPerfil(): void {
    this.errorPerfil.set(false);
    this.perfilService.cargar().pipe(takeUntilDestroyed()).subscribe({
      next: () => this.cargarClimaHeader(),
      error: () => {
        this.errorPerfil.set(true);
        this.errorHeader.set(true);
      },
    });
  }

  private cargarClimaHeader(): void {
    const distritoId = this.perfil()?.distrito?.id;
    if (!distritoId) return;

    this.cargandoHeader.set(true);
    this.errorHeader.set(false);

    this.climaService.obtenerCondicion(distritoId).pipe(takeUntilDestroyed()).subscribe({
      next: (respuesta) => {
        this.condicionHeader.set(respuesta.condicion);
        this.cargandoHeader.set(false);
      },
      error: () => {
        this.errorHeader.set(true);
        this.cargandoHeader.set(false);
      },
    });
  }

  protected abrirMenu(): void {
    this.menuAbierto.set(true);
  }

  protected cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.perfilService.limpiar();
    this.condicionHeader.set(null);
    void this.router.navigate(['/login']);
  }

  protected etiquetaCondicion(condicion: CondicionDistritoDto['condicion']): string {
    const etiquetas: Record<string, string> = {
      SEQUIA: 'Sequía',
      EXCESO_LLUVIA: 'Exceso lluvia',
      INVIERNO_ACEPTABLE: 'Invierno OK',
      null: 'Sin datos',
    };
    return etiquetas[condicion ?? ''] ?? '—';
  }

  protected claseCondicion(condicion: CondicionDistritoDto['condicion']): string {
    const clases: Record<string, string> = {
      SEQUIA: 'header-condicion-sequia',
      EXCESO_LLUVIA: 'header-condicion-exceso',
      INVIERNO_ACEPTABLE: 'header-condicion-aceptable',
      null: 'header-condicion-sin-datos',
    };
    return clases[condicion ?? ''] ?? 'header-condicion-sin-datos';
  }

  protected iconoCondicion(condicion: CondicionDistritoDto['condicion']): string {
    const iconos: Record<string, string> = {
      SEQUIA: 'fa-solid fa-sun',
      EXCESO_LLUVIA: 'fa-solid fa-cloud-showers-heavy',
      INVIERNO_ACEPTABLE: 'fa-solid fa-cloud-sun',
      null: 'fa-solid fa-circle-question',
    };
    return iconos[condicion ?? ''] ?? 'fa-solid fa-circle-question';
  }
}
