import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthShell } from '../../layout/auth-shell/auth-shell';
import { AuthService } from '../../core/auth.service';
import { DistritosService } from '../../core/distritos.service';
import { mensajesDeError } from '../../core/errores';
import { Distrito } from '../../core/models';

type Estado = 'formulario' | 'creada' | 'verificada';

@Component({
  selector: 'app-registro',
  imports: [AuthShell, ReactiveFormsModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro {
  private readonly auth = inject(AuthService);
  private readonly catalogo = inject(DistritosService);
  private readonly fb = inject(NonNullableFormBuilder);

  // Validación mínima en el cliente; el backend sigue siendo la autoridad.
  protected readonly formulario = this.fb.group({
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    dui: ['', [Validators.required, Validators.pattern(/^\d{9}$/)]],
    distrito: ['', Validators.required],
  });

  protected readonly estado = signal<Estado>('formulario');
  protected readonly cargando = signal(false);
  protected readonly errores = signal<string[]>([]);
  protected readonly correoRegistrado = signal('');
  // Solo llega si el backend tiene EXPONER_TOKEN_VERIFICACION=true (desarrollo).
  protected readonly tokenDev = signal<string | null>(null);

  protected readonly distritos = signal<Distrito[]>([]);
  protected readonly cargandoDistritos = signal(true);
  protected readonly errorDistritos = signal(false);

  constructor() {
    this.cargarDistritos();
  }

  protected cargarDistritos(): void {
    this.cargandoDistritos.set(true);
    this.errorDistritos.set(false);
    this.catalogo.listar().subscribe({
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

  protected enviar(): void {
    if (this.cargando()) return;
    if (this.formulario.invalid) {
      this.errores.set([
        'Completa todos los campos. La contraseña debe tener al menos 8 caracteres y el DUI 9 dígitos sin guiones',
      ]);
      return;
    }

    this.cargando.set(true);
    this.errores.set([]);
    const v = this.formulario.getRawValue();

    this.auth
      .registrar({
        nombres: v.nombres.trim(),
        apellidos: v.apellidos.trim(),
        correo: v.correo.trim(),
        contrasena: v.contrasena,
        dui: v.dui,
        distrito: v.distrito, // nombre del distrito; el backend lo valida contra el catálogo
      })
      .subscribe({
        next: (respuesta) => {
          this.correoRegistrado.set(respuesta.correo);
          this.tokenDev.set(respuesta.tokenVerificacion_DEV ?? null);
          this.formulario.reset(); // no dejar la contraseña en memoria del formulario
          this.estado.set('creada');
          this.cargando.set(false);
        },
        error: (error: unknown) => {
          this.errores.set(mensajesDeError(error));
          this.cargando.set(false);
        },
      });
  }

  /** Solo desarrollo: usa el token que devuelve el backend en lugar de un correo real. */
  protected simularVerificacion(): void {
    const token = this.tokenDev();
    if (!token || this.cargando()) return;

    this.cargando.set(true);
    this.errores.set([]);
    this.auth.verificar(token).subscribe({
      next: () => {
        this.estado.set('verificada');
        this.cargando.set(false);
      },
      error: (error: unknown) => {
        this.errores.set(mensajesDeError(error));
        this.cargando.set(false);
      },
    });
  }
}
