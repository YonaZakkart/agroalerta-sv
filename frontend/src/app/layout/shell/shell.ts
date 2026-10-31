import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  protected readonly menuAbierto = signal(false);

  protected abrirMenu(): void {
    this.menuAbierto.set(true);
  }

  protected cerrarMenu(): void {
    this.menuAbierto.set(false);
  }
}
