import { Component } from '@angular/core';
import { AuthShell } from '../../layout/auth-shell/auth-shell';

@Component({
  selector: 'app-login',
  imports: [AuthShell],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  // Sin lógica en la 6-0: la conexión con el backend llega en la 6-A.
  protected enviar(evento: Event): void {
    evento.preventDefault();
  }
}
