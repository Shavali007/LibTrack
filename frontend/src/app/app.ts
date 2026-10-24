import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  template: `
    <header class="site-header">
      <a class="brand" routerLink="/" aria-label="LibTrack home">LibTrack</a>
    </header>
    <router-outlet />
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }
    .site-header { min-height: 4.5rem; display: flex; align-items: center; padding: 0 clamp(1rem, 5vw, 4rem); border-bottom: 1px solid var(--line-200); background: var(--paper-0); }
    .brand { color: var(--forest-900); font: 600 1.5rem/1 Georgia, serif; text-decoration: none; }
  `],
})
export class AppComponent {}
