import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../features/auth/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <div class="app-frame">
      <aside class="sidebar" aria-label="Application navigation">
        <a class="brand-lockup" routerLink="/" aria-label="LibTrack home">
          <span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 28 28" focusable="false"><path d="M4.5 6.5c3.6-.9 6.8-.3 9.5 1.8v14c-2.7-2.1-5.9-2.7-9.5-1.8zM23.5 6.5c-3.6-.9-6.8-.3-9.5 1.8v14c2.7-2.1 5.9-2.7 9.5-1.8z"/><path d="M14 8.3v14"/></svg></span>
          <span class="brand-copy"><strong>LibTrack</strong><small>ACADEMIC LIBRARY</small></span>
        </a>
        <nav class="primary-nav" aria-label="Main navigation">
          <span class="nav-section-label">WORKSPACE</span>
          <a class="nav-link" routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">
            <span class="nav-icon" aria-hidden="true">⌂</span><span>Overview</span>
          <a class="nav-link" routerLink="/books" routerLinkActive="active" ariaCurrentWhenActive="page"><span class="nav-icon" aria-hidden="true">⌕</span><span>Search books</span></a>
          </a>
          @if (auth.profile()?.role === 'LIBRARIAN') {
            <span class="nav-section-label nav-section-spaced">ADMINISTRATION</span>
            <a class="nav-link" routerLink="/librarian/accounts/new" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">＋</span><span>Member accounts</span>
            </a>
          }
        </nav>
        <div class="sidebar-footer"><span class="status-dot" aria-hidden="true"></span><span>Library workspace</span></div>
      </aside>

      <div class="workspace">
        <header class="topbar">
          <div class="topbar-context"><span class="mobile-brand">LibTrack</span><span class="context-label">Library workspace</span></div>
          <div class="account-area">
            <span class="avatar" aria-hidden="true">{{ initials }}</span>
            <span class="account-copy"><strong>{{ auth.profile()?.email }}</strong><small>{{ roleLabel }}</small></span>
            <button class="button button-quiet signout-button" type="button" (click)="signOut()" [disabled]="pending()" aria-label="Sign out of LibTrack">
              {{ pending() ? 'Signing out…' : 'Sign out' }}
            </button>
          </div>
        </header>
        @if (error()) { <div class="shell-alert" role="alert"><p class="alert alert-error">{{ error() }}</p></div> }
        <main class="main-content" id="main-content" tabindex="-1"><router-outlet /></main>
        <footer class="workspace-footer"><span>LibTrack</span><span>Academic library services</span></footer>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }
    .app-frame { min-height: 100vh; }
    .sidebar { position: fixed; inset: 0 auto 0 0; z-index: 2; display: flex; width: var(--layout-sidebar); flex-direction: column; padding: 1.5rem 1rem 1rem; border-right: 1px solid var(--color-line-200); background: var(--color-paper); }
    .brand-lockup { display: flex; align-items: center; gap: .75rem; padding: .25rem .5rem 1.7rem; color: var(--color-forest-950); text-decoration: none; }
    .brand-mark { display: grid; width: 2.55rem; height: 2.55rem; place-items: center; border-radius: 6px; color: white; background: var(--color-forest-900); }
    .brand-mark svg { width: 1.55rem; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.5; }
    .brand-copy { display: grid; gap: .12rem; line-height: 1.1; }
    .brand-copy strong { font: 600 1.35rem/1 var(--font-serif); }
    .brand-copy small { color: var(--color-sage-700); font-size: .58rem; font-weight: 750; letter-spacing: .13em; }
    .primary-nav { display: grid; align-content: start; gap: .25rem; }
    .nav-section-label { padding: .8rem .7rem .4rem; color: var(--color-charcoal-600); font-size: .65rem; font-weight: 750; letter-spacing: .12em; }
    .nav-section-spaced { margin-top: 1.25rem; }
    .nav-link { display: flex; min-height: 2.65rem; align-items: center; gap: .7rem; padding: .5rem .7rem; border-left: 3px solid transparent; border-radius: 0 var(--radius-control) var(--radius-control) 0; color: var(--color-charcoal-700); font-size: .9rem; font-weight: 560; text-decoration: none; }
    .nav-link:hover { color: var(--color-forest-950); background: #f4f5ef; }
    .nav-link.active { border-left-color: var(--color-forest-700); color: var(--color-forest-950); background: var(--color-sage-100); font-weight: 700; }
    .nav-icon { width: 1.1rem; color: var(--color-sage-700); font-size: 1.15rem; text-align: center; }
    .sidebar-footer { display: flex; align-items: center; gap: .55rem; margin-top: auto; padding: 1rem .65rem .25rem; border-top: 1px solid var(--color-line-200); color: var(--color-charcoal-600); font-size: .75rem; }
    .status-dot { width: .45rem; height: .45rem; border-radius: 50%; background: var(--color-forest-700); }
    .workspace { min-height: 100vh; margin-left: var(--layout-sidebar); }
    .topbar { position: sticky; top: 0; z-index: 1; display: flex; min-height: 4.5rem; align-items: center; justify-content: space-between; gap: 1rem; padding: .6rem var(--layout-gutter); border-bottom: 1px solid var(--color-line-200); background: var(--color-ivory-50); }
    .topbar-context { color: var(--color-charcoal-600); font-size: .85rem; }
    .mobile-brand { display: none; color: var(--color-forest-950); font: 600 1.15rem var(--font-serif); }
    .account-area { display: flex; align-items: center; gap: .7rem; }
    .avatar { display: grid; width: 2.35rem; height: 2.35rem; flex: 0 0 auto; place-items: center; border: 1px solid var(--color-sage-300); border-radius: 50%; color: var(--color-forest-900); background: var(--color-sage-100); font-size: .75rem; font-weight: 750; }
    .account-copy { display: grid; max-width: 16rem; gap: .05rem; }
    .account-copy strong { overflow: hidden; color: var(--color-charcoal-900); font-size: .8rem; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
    .account-copy small { color: var(--color-charcoal-600); font-size: .7rem; text-transform: capitalize; }
    .signout-button { min-height: 2.4rem; margin-left: .35rem; font-size: .8rem; }
    .main-content { width: min(100%, var(--layout-content)); min-height: calc(100vh - 8rem); margin: 0 auto; padding: clamp(1.25rem, 3vw, 2.5rem) var(--layout-gutter); }
    .main-content:focus { outline: none; }
    .shell-alert { width: min(100%, var(--layout-content)); margin: 1rem auto 0; padding: 0 var(--layout-gutter); }
    .shell-alert p { margin: 0; }
    .workspace-footer { display: flex; justify-content: space-between; gap: 1rem; padding: 1rem var(--layout-gutter); border-top: 1px solid var(--color-line-200); color: var(--color-charcoal-600); font-size: .75rem; }
    @media (max-width: 760px) {
      .sidebar { position: static; display: block; width: auto; padding: .55rem 1rem .45rem; border-right: 0; border-bottom: 1px solid var(--color-line-200); }
      .brand-lockup, .sidebar-footer, .nav-section-label { display: none; }
      .primary-nav { display: flex; gap: .25rem; overflow-x: auto; }
      .nav-link { min-height: 2.45rem; flex: 0 0 auto; border-bottom: 2px solid transparent; border-left: 0; border-radius: var(--radius-control); padding: .45rem .75rem; font-size: .82rem; }
      .nav-link.active { border-bottom-color: var(--color-forest-700); }
      .nav-icon { display: none; }
      .nav-section-spaced { display: none; }
      .workspace { margin-left: 0; }
      .topbar { min-height: 4rem; }
      .mobile-brand { display: inline; }
      .context-label { display: none; }
      .account-area { gap: .5rem; }
      .account-copy { max-width: min(36vw, 12rem); }
      .signout-button { padding-inline: .65rem; }
      .main-content { min-height: calc(100vh - 11rem); }
    }
    @media (max-width: 430px) {
      .account-copy { display: none; }
      .topbar { padding-inline: 1rem; }
      .workspace-footer { font-size: .68rem; }
    }
  `],
})
export class AppShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly pending = signal(false);
  readonly error = signal<string | null>(null);

  get roleLabel(): string { return this.auth.profile()?.role.toLowerCase() ?? 'member'; }
  get initials(): string {
    const email = this.auth.profile()?.email ?? '';
    return email.slice(0, 1).toUpperCase() || 'L';
  }

  signOut(): void {
    if (this.pending()) return;
    this.pending.set(true);
    this.error.set(null);
    this.auth.logout().pipe(finalize(() => this.pending.set(false))).subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: () => this.error.set('Sign-out could not be confirmed. Please try again.'),
    });
  }
}
