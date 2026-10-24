import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (auth.profile()?.role === 'STUDENT') {
      <div class="page-heading dashboard-heading">
        <div>
          <p class="eyebrow">STUDENT DASHBOARD · {{ today }}</p>
          <h1>Welcome back</h1>
          <p class="page-description">Signed in as <strong>{{ auth.profile()?.email }}</strong>. Your library workspace is ready.</p>
        </div>
        <span class="status-badge status-badge-success">Student account</span>
      </div>

      <section class="welcome-banner" aria-labelledby="welcome-title">
        <div class="welcome-copy">
          <p class="eyebrow">YOUR UNIVERSITY LIBRARY</p>
          <h2 id="welcome-title">A place to discover what’s next.</h2>
          <p>LibTrack is preparing a connected view of your library activity. Available services will appear here as they come online.</p>
        </div>
        <div class="banner-book" aria-hidden="true"><svg viewBox="0 0 128 112" focusable="false"><path d="M12 25c23-7 39-2 52 9v62C51 84 35 79 12 87zM116 25c-23-7-39-2-52 9v62c13-12 29-17 52-9z"/><path d="M64 34v62M24 39c13-3 24-1 34 5M24 52c13-3 24-1 34 5M104 39c-13-3-24-1-34 5M104 52c-13-3-24-1-34 5"/></svg></div>
      </section>

      <div class="dashboard-grid">
        <div class="dashboard-main-column">
          <section class="dashboard-section" aria-labelledby="activity-title">
            <div class="section-title-row"><div><p class="eyebrow">YOUR LIBRARY</p><h2 id="activity-title">Library activity</h2></div><span class="section-caption">Services not connected</span></div>
            <div class="activity-grid">
              <a class="activity-card surface-card activity-link" routerLink="/my/borrowings">
                <span class="activity-icon" aria-hidden="true">↗</span>
                <div><h3>My borrowings</h3><p>View current loans, due dates, and borrowing history.</p></div>
                <span class="status-badge status-badge-success">Available</span>
              </a>
              <a class="activity-card surface-card activity-link" routerLink="/my/requests">
                <span class="activity-icon" aria-hidden="true">≡</span>
                <div><h3>My requests</h3><p>Follow the review and issue status of requested books.</p></div>
                <span class="status-badge status-badge-success">Available</span>
              </a>
              <article class="activity-card surface-card">
                <span class="activity-icon" aria-hidden="true">₹</span>
                <div><h3>Fines</h3><p>LibTrack has no fines data or fine-management service yet.</p></div>
                <span class="status-badge status-badge-neutral">Unavailable</span>
              </article>
            </div>
          </section>

          <section class="discovery-card surface-card" aria-labelledby="discovery-title">
            <div class="section-title-row"><div><p class="eyebrow">CATALOGUE</p><h2 id="discovery-title">Discover books</h2></div><span class="status-badge status-badge-success">Available</span></div>
            <p class="muted">Search real catalogue records and see availability derived from physical-copy inventory.</p>
            <a class="button button-secondary" routerLink="/books">Search books</a>

          </section>

          <section class="recommendations-card surface-card" aria-labelledby="recommendations-title">
            <div class="section-title-row"><div><p class="eyebrow">SMART SERVICES</p><h2 id="recommendations-title">Recommendations</h2></div><span class="status-badge status-badge-neutral">Planned</span></div>
            <p class="muted">Recommendations will appear when catalogue data and recommendation services are available.</p>
          </section>
        </div>

        <aside class="dashboard-side-column" aria-label="Reading and account services">
          <section class="side-panel surface-card" aria-labelledby="reading-goal-title">
            <div class="section-title-row"><h2 id="reading-goal-title">Reading goals</h2><span class="status-badge status-badge-neutral">Planned</span></div>
            <div class="side-empty-state"><span class="side-state-mark" aria-hidden="true">—</span><p>No reading goal is stored for this account.</p></div>
            <p class="muted small-copy">Reading goals and progress need a dedicated data model; borrowing records alone are not a reading measure.</p>
          </section>

          <section class="side-panel surface-card" aria-labelledby="notifications-title">
            <div class="section-title-row"><h2 id="notifications-title">Recent updates</h2><span class="status-badge status-badge-neutral">Unavailable</span></div>
            <div class="side-empty-state"><span class="side-state-mark" aria-hidden="true">○</span><p>No notification service is connected.</p></div>
          </section>

          <section class="side-panel quote-panel" aria-labelledby="continue-title">
            <p class="eyebrow">A NOTE ON READING</p>
            <h2 id="continue-title">Continue reading</h2>
            <p>Page-level reading progress and e-book activity are not tracked by this physical-library prototype.</p>
            <span class="status-badge status-badge-neutral">Not tracked</span>
          </section>
        </aside>
      </div>
    } @else {
      <section class="role-placeholder surface-card" aria-labelledby="role-placeholder-title">
        <p class="eyebrow">LIBRARY WORKSPACE</p>
        <h1 id="role-placeholder-title">Your workspace is ready</h1>
        <p class="muted">A role-specific dashboard is not available for this account yet.</p>
        @if (auth.profile()?.role === 'LIBRARIAN') {
          <a class="button button-primary" routerLink="/librarian/accounts/new">Provision a member account</a>
        }
      </section>
    }
  `,
  styles: [`
    :host { display: block; }
    .dashboard-heading { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin-bottom: 1.35rem; }
    .dashboard-heading .eyebrow { margin-bottom: .4rem; }
    .dashboard-heading h1 { margin-bottom: .4rem; }
    .dashboard-heading .page-description { margin-bottom: 0; }
    .welcome-banner { position: relative; display: flex; min-height: 9.5rem; align-items: center; justify-content: space-between; overflow: hidden; margin-bottom: 1.5rem; padding: clamp(1.25rem, 3vw, 2rem); border: 1px solid var(--color-line-200); border-radius: var(--radius-panel); background: #f0efe6; }
    .welcome-copy { position: relative; z-index: 1; max-width: 43rem; }
    .welcome-copy .eyebrow { margin-bottom: .5rem; }
    .welcome-copy h2 { margin-bottom: .6rem; font-size: clamp(1.4rem, 3vw, 1.85rem); }
    .welcome-copy > p:last-child { max-width: 40rem; margin-bottom: 0; color: var(--color-charcoal-700); font-size: .92rem; }
    .banner-book { display: grid; width: 7rem; height: 7rem; flex: 0 0 auto; place-items: center; margin-inline: 1rem 2rem; border-radius: 50%; color: var(--color-forest-900); background: var(--color-sage-100); }
    .banner-book svg { width: 5rem; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2; }
    .dashboard-grid { display: grid; grid-template-columns: minmax(0, 1.8fr) minmax(15rem, .9fr); align-items: start; gap: 1.25rem; }
    .dashboard-main-column, .dashboard-side-column { display: grid; align-content: start; gap: 1.25rem; min-width: 0; }
    .dashboard-section { min-width: 0; }
    .section-title-row { display: flex; align-items: center; justify-content: space-between; gap: .75rem; }
    .dashboard-section > .section-title-row { margin-bottom: .7rem; }
    .section-title-row .eyebrow { margin-bottom: .25rem; }
    .section-title-row h2 { margin: 0; font-size: 1.25rem; }
    .section-caption { color: var(--color-charcoal-600); font-size: .75rem; }
    .activity-grid { display: grid; gap: .65rem; }
    .activity-card { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: .9rem; padding: .9rem 1rem; }
    .activity-link { color: inherit; text-decoration: none; }
    .activity-link:hover { border-color: var(--color-sage-500); background: var(--color-ivory-100); }
    .activity-icon { display: grid; width: 2.4rem; height: 2.4rem; place-items: center; border-radius: var(--radius-control); color: var(--color-forest-900); background: var(--color-sage-100); font-size: 1.1rem; font-weight: 700; }
    .activity-card h3 { margin: 0 0 .15rem; font-size: .92rem; }
    .activity-card p { margin: 0; color: var(--color-charcoal-600); font-size: .77rem; line-height: 1.4; }
    .discovery-card, .recommendations-card, .side-panel { padding: 1.1rem 1.2rem; }
    .discovery-card .section-title-row, .recommendations-card .section-title-row { margin-bottom: .65rem; }
    .discovery-card > p, .recommendations-card > p { margin-bottom: .85rem; font-size: .84rem; }
    .discovery-card .button { min-height: 2.4rem; font-size: .82rem; }
    .unavailable-note { display: inline-block; margin: 0 0 0 .7rem !important; color: var(--color-charcoal-600); font-size: .72rem !important; }
    .side-panel { min-width: 0; }
    .side-panel .section-title-row { align-items: start; }
    .side-panel .section-title-row h2 { font-size: 1.15rem; }
    .side-empty-state { display: grid; justify-items: center; gap: .35rem; padding: 1rem .5rem .4rem; color: var(--color-charcoal-600); text-align: center; }
    .side-empty-state p { max-width: 16rem; margin: 0; font-size: .8rem; }
    .side-state-mark { color: var(--color-sage-700); font: 500 2rem/1 var(--font-serif); }
    .small-copy { margin: .5rem 0 0; font-size: .75rem; line-height: 1.45; }
    .quote-panel { border-color: var(--color-forest-900); color: white; background: var(--color-forest-900); }
    .quote-panel .eyebrow { color: #d7e3d7; }
    .quote-panel h2 { margin: .4rem 0 .55rem; color: white; font-size: 1.35rem; }
    .quote-panel p:not(.eyebrow) { color: #f2f4ee; font-size: .82rem; }
    .quote-panel .status-badge { color: white; border-color: #708a7d; background: #315447; }
    .role-placeholder { max-width: 46rem; padding: clamp(1.5rem, 4vw, 2.5rem); }
    .role-placeholder .eyebrow { margin-bottom: .5rem; }
    .role-placeholder h1 { margin-bottom: .6rem; }
    .role-placeholder .button { margin-top: .25rem; }
    @media (max-width: 900px) { .dashboard-grid { grid-template-columns: minmax(0, 1.35fr) minmax(14rem, .8fr); gap: .9rem; } .activity-card { grid-template-columns: auto minmax(0, 1fr); } .activity-card .status-badge { grid-column: 2; justify-self: start; } }
    @media (max-width: 680px) { .dashboard-heading { align-items: start; flex-direction: column; } .dashboard-grid { grid-template-columns: 1fr; } .dashboard-side-column { grid-template-columns: repeat(2, minmax(0, 1fr)); } .quote-panel { grid-column: 1 / -1; } }
    @media (max-width: 440px) { .welcome-banner { min-height: auto; } .banner-book { width: 3.7rem; height: 3.7rem; margin-inline: .5rem 0; } .banner-book svg { width: 2.8rem; } .dashboard-side-column { grid-template-columns: 1fr; } .quote-panel { grid-column: auto; } .activity-card { padding: .8rem; } }
  `],
})
export class HomeComponent {
  readonly auth = inject(AuthService);
  readonly today = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
}
