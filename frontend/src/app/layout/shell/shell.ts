import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { PerfilService } from '../../core/perfil.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly perfilService = inject(PerfilService);
  private readonly router = inject(Router);

  protected readonly menuAbierto = signal(false);
  protected readonly errorPerfil = signal(false);
  protected readonly perfil = this.perfilService.perfil;

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
    // Valida el token al entrar al área protegida. Si da 401, el interceptor ya limpia la sesión y redirige.
    this.perfilService.cargar().subscribe({
      error: () => this.errorPerfil.set(true),
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
    void this.router.navigate(['/login']);
  }
}
