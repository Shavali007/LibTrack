import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { LibrarianDashboardComponent } from '../librarian/librarian-dashboard.component';
import { BorrowingService, LoanRecord } from '../circulation/borrowing.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, LibrarianDashboardComponent],
  template: `
    @if (auth.profile()?.role === 'STUDENT') {
      <header class="page-heading">
        <div>
          <p class="eyebrow">STUDENT WORKSPACE · {{ today }}</p>
          <h1>Welcome, {{ auth.profile()?.displayName || 'back' }}!</h1>
          <p class="muted">{{ auth.profile()?.email }}</p>
        </div>
        <span class="status-badge status-badge-success">Student account</span>
      </header>

      <section class="welcome-banner">
        <div>
          <p class="eyebrow">YOUR UNIVERSITY LIBRARY</p>
          <h2>A place to discover what’s next.</h2>
          <p>Explore the catalogue and follow your requests and loans from one place.</p>
        </div>
        <span class="banner-book" aria-hidden="true">▤</span>
      </section>

      <!-- My Borrowed Books with Live Due Date Countdown -->
      <section class="borrowed-books-section" aria-labelledby="borrowed-heading">
        <div class="section-heading">
          <div>
            <p class="eyebrow">ACTIVE CIRCULATION</p>
            <h2 id="borrowed-heading">My Borrowed Books</h2>
          </div>
          <span class="count-pill">{{ borrowedLoans().length }} Active</span>
        </div>

        @if (renewalNotice()) {
          <p class="alert alert-success" role="status">{{ renewalNotice() }}</p>
        }
        @if (renewalError()) {
          <p class="alert alert-error" role="alert">{{ renewalError() }}</p>
        }

        @if (loadingLoans()) {
          <div class="loading-state surface-card" role="status">Loading your borrowed books…</div>
        } @else if (!borrowedLoans().length) {
          <div class="empty-state surface-card">
            <h3>No books currently checked out</h3>
            <p class="muted">Books issued to you will appear here with real-time due-date countdowns and 1-click renewal.</p>
            <a class="button button-secondary" routerLink="/books" style="margin-top: 0.75rem;">Browse Catalogue</a>
          </div>
        } @else {
          <div class="loans-grid">
            @for (loan of borrowedLoans(); track loan.id) {
              <article class="borrowed-card surface-card">
                <div class="card-top">
                  <div class="book-info">
                    @if (loan.coverImageUrl) {
                      <img class="book-thumb" [src]="loan.coverImageUrl" [alt]="'Cover of ' + loan.bookTitle" loading="lazy" />
                    } @else {
                      <div class="book-thumb-fallback" aria-hidden="true">{{ loan.bookTitle.slice(0, 1) }}</div>
                    }
                    <div class="book-meta">
                      <h3>{{ loan.bookTitle }}</h3>
                      <p class="muted">Copy {{ loan.copyIdentifier }}</p>
                    </div>
                  </div>

                  <!-- Due Date Countdown Pill -->
                  <div class="countdown-wrap">
                    @let cd = getCountdown(loan);
                    <span class="countdown-badge" [ngClass]="cd.cssClass">
                      {{ cd.text }}
                    </span>
                  </div>
                </div>

                <div class="card-dates">
                  <div class="date-item">
                    <span class="date-label">Issued</span>
                    <span class="date-val">{{ loan.issueDate | date:'mediumDate' }}</span>
                  </div>
                  <div class="date-item">
                    <span class="date-label">Due Date</span>
                    <span class="date-val" [class.text-danger]="loan.overdue">{{ loan.dueDate | date:'mediumDate' }}</span>
                  </div>
                  <div class="date-item">
                    <span class="date-label">Renewal</span>
                    <span class="date-val">
                      @if (loan.renewalCount >= 1) {
                        <span class="renewed-tag">Renewed (1/1)</span>
                      } @else {
                        <span class="available-tag">1 Available</span>
                      }
                    </span>
                  </div>
                </div>

                <div class="card-actions">
                  @if (loan.renewalEligible) {
                    <button
                      type="button"
                      class="button button-primary button-sm"
                      (click)="renewLoan(loan)"
                      [disabled]="renewingLoanId() === loan.id">
                      {{ renewingLoanId() === loan.id ? 'Renewing…' : 'Renew Book (+21 Days)' }}
                    </button>
                  } @else if (loan.renewalCount >= 1) {
                    <span class="muted-note">Renewal limit reached</span>
                  } @else {
                    <span class="muted-note">Not eligible for online renewal</span>
                  }
                </div>
              </article>
            }
          </div>
        }
      </section>

      <section class="dashboard-section">
        <div class="section-heading">
          <div><p class="eyebrow">YOUR LIBRARY</p><h2>Library activity</h2></div>
        </div>
        <div class="activity-grid">
          <a class="activity-card surface-card" routerLink="/workspace/my/borrowings">
            <span class="activity-icon" aria-hidden="true">↗</span>
            <span><h3>My borrowings</h3><p>View active loans, due dates, renewal eligibility, and history.</p></span>
            <span class="status-badge status-badge-success">Available</span>
          </a>
          <a class="activity-card surface-card" routerLink="/workspace/my/requests">
            <span class="activity-icon" aria-hidden="true">≡</span>
            <span><h3>My requests</h3><p>Follow librarian review and issue status.</p></span>
            <span class="status-badge status-badge-success">Available</span>
          </a>
          <a class="activity-card surface-card" routerLink="/books">
            <span class="activity-icon" aria-hidden="true">⌕</span>
            <span><h3>Search books</h3><p>Browse catalogue records and live physical-copy availability.</p></span>
            <span class="status-badge status-badge-success">Available</span>
          </a>
          <a class="activity-card surface-card" routerLink="/workspace/my/fines">
            <span class="activity-icon" aria-hidden="true">₹</span>
            <span><h3>Fines & Assessments</h3><p>View overdue charges, active balances, and payment receipts.</p></span>
            <span class="status-badge status-badge-success">Available</span>
          </a>
        </div>
      </section>
    } @else if (auth.profile()?.role === 'FACULTY') {
      <header class="page-heading">
        <div>
          <p class="eyebrow">FACULTY WORKSPACE</p>
          <h1>Welcome, {{ auth.profile()?.displayName || 'Faculty Member' }}!</h1>
          <p class="muted">{{ auth.profile()?.email }}</p>
        </div>
        <span class="status-badge status-badge-success">Faculty account</span>
      </header>

      <section class="welcome-banner">
        <div>
          <p class="eyebrow">YOUR UNIVERSITY LIBRARY</p>
          <h2>Research and reading, in one place.</h2>
          <p>Explore the catalogue and manage your active loans and book requests.</p>
        </div>
        <span class="banner-book" aria-hidden="true">▤</span>
      </section>

      <!-- Faculty Borrowed Books with Live Due Date Countdown -->
      <section class="borrowed-books-section" aria-labelledby="faculty-borrowed-heading">
        <div class="section-heading">
          <div>
            <p class="eyebrow">ACTIVE CIRCULATION</p>
            <h2 id="faculty-borrowed-heading">My Borrowed Books</h2>
          </div>
          <span class="count-pill">{{ borrowedLoans().length }} Active</span>
        </div>

        @if (renewalNotice()) {
          <p class="alert alert-success" role="status">{{ renewalNotice() }}</p>
        }
        @if (renewalError()) {
          <p class="alert alert-error" role="alert">{{ renewalError() }}</p>
        }

        @if (loadingLoans()) {
          <div class="loading-state surface-card" role="status">Loading your borrowed books…</div>
        } @else if (!borrowedLoans().length) {
          <div class="empty-state surface-card">
            <h3>No books currently checked out</h3>
            <p class="muted">Books issued to you will appear here with real-time due-date countdowns and 1-click renewal.</p>
            <a class="button button-secondary" routerLink="/books" style="margin-top: 0.75rem;">Browse Catalogue</a>
          </div>
        } @else {
          <div class="loans-grid">
            @for (loan of borrowedLoans(); track loan.id) {
              <article class="borrowed-card surface-card">
                <div class="card-top">
                  <div class="book-info">
                    @if (loan.coverImageUrl) {
                      <img class="book-thumb" [src]="loan.coverImageUrl" [alt]="'Cover of ' + loan.bookTitle" loading="lazy" />
                    } @else {
                      <div class="book-thumb-fallback" aria-hidden="true">{{ loan.bookTitle.slice(0, 1) }}</div>
                    }
                    <div class="book-meta">
                      <h3>{{ loan.bookTitle }}</h3>
                      <p class="muted">Copy {{ loan.copyIdentifier }}</p>
                    </div>
                  </div>

                  <!-- Due Date Countdown Pill -->
                  <div class="countdown-wrap">
                    @let cd = getCountdown(loan);
                    <span class="countdown-badge" [ngClass]="cd.cssClass">
                      {{ cd.text }}
                    </span>
                  </div>
                </div>

                <div class="card-dates">
                  <div class="date-item">
                    <span class="date-label">Issued</span>
                    <span class="date-val">{{ loan.issueDate | date:'mediumDate' }}</span>
                  </div>
                  <div class="date-item">
                    <span class="date-label">Due Date</span>
                    <span class="date-val" [class.text-danger]="loan.overdue">{{ loan.dueDate | date:'mediumDate' }}</span>
                  </div>
                  <div class="date-item">
                    <span class="date-label">Renewal</span>
                    <span class="date-val">
                      @if (loan.renewalCount >= 1) {
                        <span class="renewed-tag">Renewed (1/1)</span>
                      } @else {
                        <span class="available-tag">1 Available</span>
                      }
                    </span>
                  </div>
                </div>

                <div class="card-actions">
                  @if (loan.renewalEligible) {
                    <button
                      type="button"
                      class="button button-primary button-sm"
                      (click)="renewLoan(loan)"
                      [disabled]="renewingLoanId() === loan.id">
                      {{ renewingLoanId() === loan.id ? 'Renewing…' : 'Renew Book (+21 Days)' }}
                    </button>
                  } @else if (loan.renewalCount >= 1) {
                    <span class="muted-note">Renewal limit reached</span>
                  } @else {
                    <span class="muted-note">Not eligible for online renewal</span>
                  }
                </div>
              </article>
            }
          </div>
        }
      </section>

      <section class="dashboard-section">
        <h2>Library services</h2>
        <div class="activity-grid">
          <a class="activity-card surface-card" routerLink="/books">
            <span class="activity-icon" aria-hidden="true">⌕</span>
            <span><h3>Search books</h3><p>Search real catalogue records and availability.</p></span>
            <span class="status-badge status-badge-success">Available</span>
          </a>
          <a class="activity-card surface-card" routerLink="/workspace/my/borrowings">
            <span class="activity-icon" aria-hidden="true">↗</span>
            <span><h3>My borrowings</h3><p>View active loans, due dates, renewals, and history.</p></span>
            <span class="status-badge status-badge-success">Available</span>
          </a>
          <a class="activity-card surface-card" routerLink="/workspace/my/requests">
            <span class="activity-icon" aria-hidden="true">≡</span>
            <span><h3>My requests</h3><p>Track your book requests.</p></span>
            <span class="status-badge status-badge-success">Available</span>
          </a>
          <a class="activity-card surface-card" routerLink="/workspace/my/fines">
            <span class="activity-icon" aria-hidden="true">₹</span>
            <span><h3>Fines & Assessments</h3><p>View overdue charges, active balances, and payment receipts.</p></span>
            <span class="status-badge status-badge-success">Available</span>
          </a>
          <article class="activity-card surface-card">
            <span class="activity-icon" aria-hidden="true">✦</span>
            <span><h3>Recommendations</h3><p>Faculty-to-student recommendations are not implemented.</p></span>
            <span class="status-badge status-badge-neutral">Unavailable</span>
          </article>
        </div>
      </section>
    } @else if (auth.profile()?.role === 'LIBRARIAN') {
      <app-librarian-dashboard />
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
    :host { display: block; }
    .page-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1.4rem; }
    .page-heading h1 { margin-bottom: 0.35rem; }
    .page-heading p { margin-bottom: 0; }
    .welcome-banner { display: flex; min-height: 9rem; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.75rem; padding: clamp(1.25rem, 3vw, 2rem); border: 1px solid var(--color-line-200); border-radius: var(--radius-panel); background: #f0efe6; }
    .welcome-banner .eyebrow { margin-bottom: 0.45rem; }
    .welcome-banner h2 { margin-bottom: 0.5rem; font-family: var(--font-serif); font-size: var(--type-page-title-size); font-weight: var(--type-page-title-weight); line-height: var(--type-page-title-line-height); }
    .welcome-banner p:last-child { max-width: 40rem; margin: 0; color: var(--color-charcoal-700); }
    .banner-book { display: grid; width: 5.5rem; height: 5.5rem; flex: 0 0 auto; place-items: center; border-radius: 50%; color: var(--color-forest-900); background: var(--color-sage-100); font-size: 2rem; }
    
    .borrowed-books-section {
      margin-bottom: 2rem;
    }
    .count-pill {
      background: #EAF2EF;
      color: #003D30;
      padding: 0.2rem 0.65rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .loans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1rem;
    }
    .borrowed-card {
      padding: 1.15rem;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 0.9rem;
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .book-info {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      min-width: 0;
    }
    .book-thumb {
      width: 2.75rem;
      height: 3.8rem;
      object-fit: cover;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      flex-shrink: 0;
    }
    .book-thumb-fallback {
      width: 2.75rem;
      height: 3.8rem;
      border-radius: 4px;
      background: #003D30;
      color: #fff;
      display: grid;
      place-items: center;
      font-size: 1.25rem;
      font-weight: 700;
      flex-shrink: 0;
    }
    .book-meta {
      min-width: 0;
    }
    .book-meta h3 {
      margin: 0 0 0.2rem;
      font-size: 0.95rem;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #003D30;
    }
    .book-meta p {
      margin: 0;
      font-size: 0.78rem;
    }
    .countdown-badge {
      display: inline-block;
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }
    .countdown-normal {
      background: #EAF2EF;
      color: #003D30;
      border: 1px solid #C2D6CF;
    }
    .countdown-warning {
      background: #fff8e1;
      color: #b78103;
      border: 1px solid #ffe082;
    }
    .countdown-danger {
      background: #ffebee;
      color: #c62828;
      border: 1px solid #ffcdd2;
    }
    .card-dates {
      display: flex;
      justify-content: space-between;
      background: var(--color-sand-50, #fcfbfa);
      padding: 0.6rem 0.8rem;
      border-radius: 6px;
      border: 1px solid var(--color-sand-200, #e2ded5);
    }
    .date-item {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .date-label {
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-charcoal-500, #666);
      font-weight: 600;
    }
    .date-val {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--color-charcoal-900, #222);
    }
    .renewed-tag {
      color: #003D30;
      font-size: 0.78rem;
    }
    .available-tag {
      color: #2563eb;
      font-size: 0.78rem;
    }
    .card-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      min-height: 2rem;
    }
    .muted-note {
      font-size: 0.78rem;
      color: var(--color-charcoal-500, #666);
      font-style: italic;
    }
    .text-danger { color: #dc2626; }

    .dashboard-section { margin-top: 1.5rem; }
    .section-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
    .dashboard-section > h2, .section-heading h2 { margin-bottom: 0.75rem; font-family: var(--font-sans); font-size: var(--type-section-heading-size); font-weight: var(--type-section-heading-weight); }
    .activity-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.8rem; }
    .activity-card { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 0.85rem; min-height: 7rem; padding: 1rem; color: inherit; text-decoration: none; }
    .activity-card:hover { border-color: var(--color-sage-500); box-shadow: var(--shadow-panel); }
    .activity-icon { display: grid; width: 2.5rem; height: 2.5rem; place-items: center; border-radius: 8px; color: var(--color-forest-900); background: var(--color-sage-100); font-size: 1.15rem; }
    .activity-card h3 { margin: 0 0 0.2rem; font-size: 0.98rem; }
    .activity-card p { margin: 0; color: var(--color-charcoal-600); font-size: 0.78rem; }
    .activity-card > span:nth-child(2) { min-width: 0; }
    .empty-state { padding: 2rem 1.5rem; text-align: center; }
    .empty-state h3 { margin: 0 0 0.35rem; font-size: 1.15rem; color: #003D30; }
    .loading-state { padding: 2rem; text-align: center; color: var(--color-charcoal-500, #666); }
    .alert { padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.88rem; }
    .alert-success { background: #EAF2EF; color: #003D30; border: 1px solid #C2D6CF; }
    .alert-error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .button {
      padding: 0.5rem 0.9rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
    }
    .button-sm { padding: 0.35rem 0.75rem; font-size: 0.78rem; }
    .button-primary { background: #003D30; color: #fff; }
    .button-primary:hover:not(:disabled) { background: #002B22; }
    .button-secondary { background: #fff; border-color: var(--color-sand-300, #d5d0c7); color: var(--color-charcoal-800, #333); }
    .button-secondary:hover:not(:disabled) { background: var(--color-sand-50, #fcfbfa); }
    .button:disabled { opacity: 0.6; cursor: not-allowed; }

    @media (max-width: 700px) {
      .activity-grid { grid-template-columns: 1fr; }
      .activity-card { grid-template-columns: auto minmax(0, 1fr); }
      .activity-card > .status-badge { grid-column: 2; }
      .page-heading { align-items: flex-start; flex-direction: column; }
    }
    @media (max-width: 400px) {
      .banner-book { width: 3.8rem; height: 3.8rem; }
    }
  `]
})
export class HomeComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly borrowingService = inject(BorrowingService);

  readonly today = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(new Date());

  readonly borrowedLoans = signal<LoanRecord[]>([]);
  readonly loadingLoans = signal(false);
  readonly renewingLoanId = signal('');
  readonly renewalNotice = signal('');
  readonly renewalError = signal('');

  ngOnInit(): void {
    const role = this.auth.profile()?.role;
    if (role === 'STUDENT' || role === 'FACULTY') {
      this.loadLoans();
    }
  }

  loadLoans(): void {
    this.loadingLoans.set(true);
    this.borrowingService.currentLoans()
      .pipe(finalize(() => this.loadingLoans.set(false)))
      .subscribe({
        next: (page) => this.borrowedLoans.set(page.content),
        error: () => {}
      });
  }

  getCountdown(loan: LoanRecord): { text: string; cssClass: string } {
    const [y, m, d] = loan.dueDate.split('-').map(Number);
    const due = new Date(y, m - 1, d);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (loan.overdue || diffDays < 0) {
      const overdueDays = Math.abs(diffDays) || 1;
      return {
        text: `Overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`,
        cssClass: 'countdown-danger'
      };
    }
    if (diffDays === 0) {
      return { text: 'Due today', cssClass: 'countdown-warning' };
    }
    if (diffDays === 1) {
      return { text: '1 day left', cssClass: 'countdown-warning' };
    }
    return { text: `${diffDays} days left`, cssClass: 'countdown-normal' };
  }

  renewLoan(loan: LoanRecord): void {
    if (!loan.renewalEligible || this.renewingLoanId()) return;
    if (!confirm(`Are you sure you want to renew "${loan.bookTitle}"? This will extend the loan by 21 eligible loan days.`)) {
      return;
    }

    this.renewingLoanId.set(loan.id);
    this.renewalNotice.set('');
    this.renewalError.set('');

    this.borrowingService.renew(loan.id)
      .pipe(finalize(() => this.renewingLoanId.set('')))
      .subscribe({
        next: (updated) => {
          this.renewalNotice.set(`"${loan.bookTitle}" renewed successfully! New due date: ${updated.dueDate}`);
          this.loadLoans();
          setTimeout(() => this.renewalNotice.set(''), 6000);
        },
        error: (err) => {
          const msg = err.error?.message || 'Renewal could not be completed.';
          this.renewalError.set(msg);
        }
      });
  }
}
