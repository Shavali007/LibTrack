import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { LibrarianDashboardComponent } from '../librarian/librarian-dashboard.component';
import { MemberDashboardComponent } from './member-dashboard.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, LibrarianDashboardComponent, MemberDashboardComponent],
  template: `
    @if (auth.profile()?.role === 'LIBRARIAN') {
      <app-librarian-dashboard />
    } @else if (auth.profile()?.role === 'STUDENT' || auth.profile()?.role === 'FACULTY') {
      <app-member-dashboard />
    } @else {
      <section class="surface-card surface-card-body">
        <p class="eyebrow">LIBRARY WORKSPACE</p>
        <h1>Account profile unavailable</h1>
        <p class="muted">Reload or sign in again to load your account.</p>
        <a class="button button-primary" routerLink="/login">Sign in</a>
      </section>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .surface-card-body {
      padding: 2.5rem;
      border-radius: var(--radius-panel, 12px);
      background: #FFFFFF;
      border: 1px solid #ECEAE3;
    }
    .eyebrow {
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #5E6D64;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
    }
    h1 {
      font-family: var(--font-serif);
      font-size: 1.85rem;
      color: #112A20;
      margin: 0 0 0.5rem;
    }
    .muted {
      color: #64748B;
      margin-bottom: 1.5rem;
    }
  `]
})
export class HomeComponent {
  readonly auth = inject(AuthService);
}
