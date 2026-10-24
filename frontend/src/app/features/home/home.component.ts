import { Component, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <div class="page-heading">
      <p class="eyebrow">LIBRARY SERVICES</p>
      <h1>Welcome to LibTrack</h1>
      <p class="page-description">Your library workspace is ready.</p>
    </div>
    <section class="welcome-card surface-card" aria-labelledby="welcome-heading">
      <div class="welcome-mark" aria-hidden="true"><svg viewBox="0 0 44 44" focusable="false"><path d="M7 9c5.8-1.4 10.8-.4 15 2.8v22C17 30.6 12 29.6 7 31zM37 9c-5.8-1.4-10.8-.4-15 2.8v22c5-3.2 10-4.2 15-2.8z"/><path d="M22 12v22"/></svg></div>
      <div>
        <h2 id="welcome-heading">A place for your library work</h2>
        <p class="muted">You are signed in as <strong>{{ auth.profile()?.email }}</strong>.</p>
        <span class="status-badge status-badge-success">{{ roleLabel }}</span>
        <p class="workspace-note">Catalogue and circulation services will appear here as they are implemented.</p>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .page-heading { margin-bottom: 1.5rem; }
    .page-heading .eyebrow { margin-bottom: .45rem; }
    .page-heading h1 { margin-bottom: .45rem; }
    .page-description { margin-bottom: 0; color: var(--color-charcoal-600); }
    .welcome-card { display: grid; max-width: 52rem; grid-template-columns: auto 1fr; align-items: start; gap: 1.25rem; padding: clamp(1.25rem, 3vw, 2rem); }
    .welcome-mark { display: grid; width: 3.25rem; height: 3.25rem; place-items: center; border-radius: 6px; color: var(--color-forest-900); background: var(--color-sage-100); }
    .welcome-mark svg { width: 2rem; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.5; }
    .welcome-card h2 { margin: .15rem 0 .6rem; font-size: 1.4rem; }
    .welcome-card p { margin-bottom: .8rem; }
    .workspace-note { max-width: 38rem; margin: 1rem 0 0 !important; color: var(--color-charcoal-600); font-size: .9rem; }
    .alert { max-width: 52rem; margin-top: 1rem; }
    @media (max-width: 520px) { .welcome-card { grid-template-columns: 1fr; } }
  `],
})
export class HomeComponent {
  readonly auth = inject(AuthService);
  get roleLabel(): string { return this.auth.profile()?.role.toLowerCase() ?? 'member'; }
}

