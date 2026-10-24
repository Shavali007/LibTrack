import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="home-page">
      <section class="welcome-panel">
        <p class="eyebrow">LIBRARY SERVICES</p>
        <h1>Welcome to LibTrack</h1>
        <p class="copy">You are signed in as <strong>{{ auth.profile()?.email }}</strong>.</p>
        <p class="role">{{ roleLabel }}</p>
        @if (auth.profile()?.role === 'LIBRARIAN') {
          <p><a routerLink="/librarian/accounts/new">Provision a student or faculty account</a></p>
        }
        <p class="copy">Catalogue and circulation services will appear here as they are implemented.</p>
        @if (error()) { <p role="alert" class="error">{{ error() }}</p> }
        <button type="button" (click)="signOut()" [disabled]="pending()">
          {{ pending() ? 'Signing out…' : 'Sign out' }}
        </button>
      </section>
    </main>
  `,
  styles: [`
    :host { display: block; }
    .home-page { min-height: calc(100vh - 5rem); display: grid; place-items: center; padding: 2rem 1rem; }
    .welcome-panel { width: min(100%, 42rem); padding: clamp(2rem, 7vw, 4rem); border: 1px solid var(--line-200); background: var(--paper-0); }
    .eyebrow { color: var(--sage-500); font-size: .75rem; font-weight: 700; letter-spacing: .12em; }
    h1 { margin: 1rem 0; color: var(--forest-900); font: 500 clamp(2rem, 5vw, 3rem)/1.1 Georgia, serif; }
    .copy { max-width: 34rem; color: var(--charcoal-600); line-height: 1.6; }
    .role { display: inline-block; padding: .35rem .6rem; background: var(--sage-100); color: var(--forest-900); font-size: .85rem; }
    .error { color: var(--danger-700); }
    button { min-height: 2.6rem; margin-top: 1rem; border: 1px solid var(--forest-900); border-radius: 4px; padding: .5rem 1rem; color: var(--forest-900); background: transparent; font: inherit; font-weight: 600; cursor: pointer; }
    button:disabled { opacity: .55; cursor: not-allowed; }
  `],
})
export class HomeComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly pending = signal(false);
  readonly error = signal<string | null>(null);

  get roleLabel(): string {
    return this.auth.profile()?.role.toLowerCase() ?? '';
  }

  signOut(): void {
    this.pending.set(true);
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: () => {
        this.pending.set(false);
        this.error.set('Sign-out could not be confirmed. Please try again.');
      },
    });
  }
}


