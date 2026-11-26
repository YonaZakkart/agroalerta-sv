import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { mensajesDeError } from '../../core/errores';

@Component({
  selector: 'app-verificar',
  imports: [RouterLink],
  templateUrl: './verificar.html',
  styleUrl: './verificar.css',
})
export class Verificar implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  protected readonly estado = signal<'cargando' | 'ok' | 'error'>('cargando');
  protected readonly mensaje = signal('');

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!token) {
      this.estado.set('error');
      this.mensaje.set('El enlace no incluye un token de verificación.');
      return;
    }

    this.auth.verificar(token).subscribe({
      next: () => this.estado.set('ok'),
      error: (error: unknown) => {
        this.estado.set('error');
        this.mensaje.set(mensajesDeError(error).join(' ') || 'No se pudo verificar el correo.');
      },
    });
  }
}
