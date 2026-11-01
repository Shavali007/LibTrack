import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { finalize } from 'rxjs';
import { LibrarianOperationsService, ReportSummary } from './librarian-operations.service';

@Component({
  selector: 'app-report-viewer',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <header class="page-heading">
      <div>
        <p class="eyebrow">LIBRARIAN WORKSPACE · REPORTS</p>
        <h1>Library Reports & Analytics</h1>
        <p class="muted">Live operational data, inventory condition breakdown, overdue audits, and circulation statistics.</p>
      </div>
      <div class="header-actions">
        <button class="button button-secondary" type="button" (click)="load()" [disabled]="loading()">
          ↻ Refresh Reports
        </button>
      </div>
    </header>

    @if (error()) {
      <p class="alert alert-error" role="alert">{{ error() }}</p>
    }

    @if (loading()) {
      <div class="loading-state" role="status">Compiling real-time library reports…</div>
    } @else if (summary(); as data) {
      <!-- Inventory Condition Breakdown Cards -->
      <section class="report-section" aria-labelledby="inventory-heading">
        <h2 id="inventory-heading">Physical Inventory Breakdown</h2>
        <div class="metrics-grid">
          <article class="metric-card surface-card">
            <span class="metric-value">{{ data.inventory.totalBooks }}</span>
            <span class="metric-label">Total Titles</span>
          </article>
          <article class="metric-card surface-card">
            <span class="metric-value">{{ data.inventory.totalCopies }}</span>
            <span class="metric-label">Total Physical Copies</span>
          </article>
          <article class="metric-card surface-card tone-success">
            <span class="metric-value">{{ data.inventory.availableCopies }}</span>
            <span class="metric-label">Available on Shelves</span>
          </article>
          <article class="metric-card surface-card tone-info">
            <span class="metric-value">{{ data.inventory.onLoanCopies }}</span>
            <span class="metric-label">Currently on Loan</span>
          </article>
          <article class="metric-card surface-card tone-warning">
            <span class="metric-value">{{ data.inventory.damagedCopies }}</span>
            <span class="metric-label">Damaged / Quarantine</span>
          </article>
          <article class="metric-card surface-card tone-danger">
            <span class="metric-value">{{ data.inventory.lostCopies }}</span>
            <span class="metric-label">Lost Cases</span>
          </article>
          <article class="metric-card surface-card tone-neutral">
            <span class="metric-value">{{ data.inventory.withdrawnCopies }}</span>
            <span class="metric-label">Withdrawn from Circ.</span>
          </article>
        </div>
      </section>

      <!-- Circulation Overview Cards -->
      <section class="report-section" aria-labelledby="circ-heading">
        <h2 id="circ-heading">Circulation Metrics</h2>
        <div class="metrics-grid metrics-circ">
          <article class="metric-card surface-card">
            <span class="metric-value">{{ data.circulation.totalLoans }}</span>
            <span class="metric-label">Total Loans Recorded</span>
          </article>
          <article class="metric-card surface-card tone-info">
            <span class="metric-value">{{ data.circulation.activeLoans }}</span>
            <span class="metric-label">Active Loans</span>
          </article>
          <article class="metric-card surface-card tone-danger">
            <span class="metric-value">{{ data.circulation.overdueLoans }}</span>
            <span class="metric-label">Overdue Loans</span>
          </article>
          <article class="metric-card surface-card tone-success">
            <span class="metric-value">{{ data.circulation.returnedLoans }}</span>
            <span class="metric-label">Successfully Returned</span>
          </article>
        </div>
      </section>

      <div class="two-column-layout">
        <!-- Top Borrowed Books Ranking -->
        <section class="report-section column-panel surface-card" aria-labelledby="top-books-heading">
          <h2 id="top-books-heading">Top Borrowed Titles</h2>
          @if (!data.topBooks.length) {
            <p class="empty-note">No borrowing history recorded yet.</p>
          } @else {
            <div class="table-wrap">
              <table class="compact-table">
                <thead>
                  <tr>
                    <th scope="col" style="width: 2.5rem;">#</th>
                    <th scope="col">Title</th>
                    <th scope="col">Author(s)</th>
                    <th scope="col" style="text-align: right;">Times Borrowed</th>
                  </tr>
                </thead>
                <tbody>
                  @for (book of data.topBooks; track book.bookId; let idx = $index) {
                    <tr>
                      <td class="muted">{{ idx + 1 }}</td>
                      <td><strong>{{ book.title }}</strong></td>
                      <td class="muted">{{ book.author || '—' }}</td>
                      <td style="text-align: right;">
                        <span class="badge-count">{{ book.loanCount }}</span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>

        <!-- Overdue Loans Audit -->
        <section class="report-section column-panel surface-card" aria-labelledby="overdue-heading">
          <div class="section-header-split">
            <h2 id="overdue-heading">Overdue Items Audit</h2>
            <span class="overdue-tag">{{ data.overdueLoans.length }} Pending</span>
          </div>
          @if (!data.overdueLoans.length) {
            <p class="empty-note empty-good">✓ All borrowed copies are within their authorized due dates.</p>
          } @else {
            <div class="table-wrap">
              <table class="compact-table">
                <thead>
                  <tr>
                    <th scope="col">Borrower</th>
                    <th scope="col">Book / Copy</th>
                    <th scope="col">Due Date</th>
                    <th scope="col" style="text-align: right;">Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  @for (loan of data.overdueLoans; track loan.loanId) {
                    <tr>
                      <td>
                        <strong>{{ loan.borrowerName }}</strong>
                        <br><small class="muted">{{ loan.borrowerEmail }}</small>
                      </td>
                      <td>
                        <span class="book-title-cell" [title]="loan.bookTitle">{{ loan.bookTitle }}</span>
                        <br><small class="muted">Copy {{ loan.copyIdentifier }}</small>
                      </td>
                      <td>
                        <time [attr.datetime]="loan.dueDate">{{ loan.dueDate | date:'d MMM y' }}</time>
                      </td>
                      <td style="text-align: right;">
                        <span class="overdue-days">{{ loan.daysOverdue }}d late</span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .page-heading {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
    }
    .page-heading h1 {
      font-family: var(--type-page-title-family);
      font-size: var(--type-page-title-size);
      font-weight: var(--type-page-title-weight);
      color: var(--type-page-title-color);
      margin: 0 0 0.25rem;
      line-height: var(--type-page-title-line);
      letter-spacing: var(--letter-spacing-tight);
    }
    .report-section {
      margin-bottom: 2rem;
    }
    .report-section h2 {
      font-family: var(--type-section-heading-family);
      font-size: var(--type-section-heading-size);
      font-weight: var(--type-section-heading-weight);
      color: var(--type-section-heading-color);
      margin-bottom: 0.85rem;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 1rem;
    }
    .metrics-circ {
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }
    .metric-card {
      padding: 1.15rem 1rem;
      border-radius: var(--radius-panel);
      border: 1px solid var(--color-line-200);
      background: var(--color-paper);
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      box-shadow: var(--shadow-sm);
    }
    .metric-value {
      font-family: var(--type-stat-number-family);
      font-size: var(--type-stat-number-size);
      font-weight: var(--type-stat-number-weight);
      line-height: 1.1;
      color: var(--sidebar-bg);
    }
    .metric-label {
      font-size: var(--type-stat-label-size);
      font-weight: var(--type-stat-label-weight);
      color: var(--type-stat-label-color);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .tone-success .metric-value { color: #003D30; }
    .tone-info .metric-value { color: #1e40af; }
    .tone-warning .metric-value { color: #b45309; }
    .tone-danger .metric-value { color: #b91c1c; }
    .tone-neutral .metric-value { color: #4b5563; }

    .two-column-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    .column-panel {
      padding: 1.25rem;
      border-radius: var(--radius-panel);
      border: 1px solid var(--color-line-200);
      background: var(--color-paper);
    }
    .section-header-split {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.85rem;
    }
    .section-header-split h2 { margin: 0; }
    .overdue-tag {
      background: #fef2f2;
      color: #991b1b;
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .table-wrap {
      overflow-x: auto;
      max-height: 24rem;
      overflow-y: auto;
    }
    .compact-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    .compact-table th {
      text-align: left;
      padding: 0.5rem 0.6rem;
      border-bottom: 2px solid var(--color-line-200);
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--color-charcoal-600);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .compact-table td {
      padding: 0.6rem;
      border-bottom: 1px solid var(--color-line-200);
      vertical-align: middle;
    }
    .badge-count {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      background: #EAF2EF;
      color: #003D30;
      font-weight: 700;
      font-size: 0.82rem;
    }
    .overdue-days {
      color: #dc2626;
      font-weight: 700;
      font-size: 0.82rem;
    }
    .empty-note {
      padding: 1.5rem;
      text-align: center;
      color: var(--color-charcoal-600);
      font-size: 0.9rem;
    }
    .empty-good {
      color: #003D30;
      background: #EAF2EF;
      border-radius: 8px;
    }
    .book-title-cell {
      max-width: 14rem;
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    @media (max-width: 900px) {
      .two-column-layout { grid-template-columns: 1fr; }
    }
  `]
})
export class ReportViewerComponent implements OnInit {
  private readonly opsService = inject(LibrarianOperationsService);

  readonly summary = signal<ReportSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.opsService.getReportsSummary()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.summary.set(data),
        error: () => this.error.set('Could not load library reports summary.')
      });
  }
}
