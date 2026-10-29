import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-feature-notice',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="page-heading">
      <p class="eyebrow">LIBRARY OPERATIONS · {{ title }}</p>
      <h1>{{ title }}</h1>
    </header>

    <section class="surface-card notice-panel">
      <div class="notice-icon" aria-hidden="true">ℹ</div>
      <div class="notice-body">
        <h2>{{ heading }}</h2>
        <p>{{ message }}</p>
        <div class="notice-actions">
          <a routerLink="/workspace" class="button button-primary">Back to Dashboard</a>
          <a routerLink="/workspace/librarian/circulation" class="button button-secondary">Open Circulation Desk</a>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .page-heading { margin-bottom: 1.4rem; }
    .notice-panel {
      display: flex;
      gap: 1.5rem;
      padding: clamp(1.5rem, 3vw, 2.5rem);
      border-radius: var(--radius-panel);
      align-items: flex-start;
      border: 1px solid var(--color-line-200);
      background: var(--color-paper);
    }
    .notice-icon {
      display: grid;
      place-items: center;
      width: 3rem;
      height: 3rem;
      border-radius: 50%;
      background: var(--color-sage-100);
      color: var(--color-forest-900);
      font-size: 1.4rem;
      font-weight: bold;
      flex-shrink: 0;
    }
    .notice-body h2 {
      margin: 0 0 0.5rem;
      font-size: 1.25rem;
      color: var(--color-forest-950);
    }
    .notice-body p {
      margin: 0 0 1.25rem;
      color: var(--color-charcoal-700);
      max-width: 38rem;
      line-height: 1.5;
    }
    .notice-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
  `]
})
export class FeatureNoticeComponent {
  private readonly route = inject(ActivatedRoute);

  get title(): string {
    return this.route.snapshot.data['title'] || 'Feature Status';
  }

  get heading(): string {
    return this.route.snapshot.data['heading'] || `${this.title} Status`;
  }

  get message(): string {
    return this.route.snapshot.data['message'] || 'This capability is currently in review and will be scheduled in an upcoming release.';
  }
}
