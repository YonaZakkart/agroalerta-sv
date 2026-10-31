import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthShell } from '../../layout/auth-shell/auth-shell';
import { AuthService } from '../../core/auth.service';
import { mensajesDeError } from '../../core/errores';

@Component({
  selector: 'app-login',
  imports: [AuthShell, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly motivoSesion = inject(ActivatedRoute).snapshot.queryParamMap.get('sesion');

  protected readonly formulario = this.fb.group({
    correo: ['', Validators.required],
    contrasena: ['', Validators.required],
  });
  protected readonly cargando = signal(false);
  protected readonly errores = signal<string[]>([]);

  // Lo fija el interceptor al recibir un 401 con sesión activa.
  protected readonly avisoSesion =
    this.motivoSesion === 'expirada'
      ? 'Tu sesión expiró. Inicia sesión nuevamente.'
      : this.motivoSesion === 'invalida'
        ? 'Tu sesión ya no es válida. Inicia sesión nuevamente.'
        : null;

  protected enviar(): void {
    if (this.cargando()) return;
    if (this.formulario.invalid) {
      this.errores.set(['Ingresa tu correo y tu contraseña.']);
      return;
    }

    this.cargando.set(true);
    this.errores.set([]);
    const { correo, contrasena } = this.formulario.getRawValue();

    this.auth.login(correo.trim(), contrasena).subscribe({
      next: () => void this.router.navigate(['/dashboard']),
      error: (error: unknown) => {
        this.errores.set(mensajesDeError(error));
        this.cargando.set(false);
      },
    });
  }
}
