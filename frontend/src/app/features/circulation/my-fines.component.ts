import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { finalize } from 'rxjs';
import { BorrowingService } from './borrowing.service';
import { FineRecord } from '../librarian/librarian-operations.service';

@Component({
  selector: 'app-my-fines',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <header class="page-heading">
      <div>
        <p class="eyebrow">YOUR LIBRARY · ACCOUNTS</p>
        <h1>My Fines & Overdue Charges</h1>
        <p class="muted">Review overdue book assessments, current unpaid balances, and past payment receipts.</p>
      </div>
      <div class="header-actions">
        <button class="button button-secondary" type="button" (click)="load()" [disabled]="loading()">
          ↻ Refresh Fines
        </button>
      </div>
    </header>

    @if (error()) {
      <p class="alert alert-error" role="alert">{{ error() }}</p>
    }

    @if (loading()) {
      <div class="loading-state" role="status">Loading your fine records…</div>
    } @else {
      <!-- Summary metrics -->
      <section class="summary-cards-grid">
        <article class="stat-card surface-card">
          <p class="stat-label">Total Outstanding</p>
          <p class="stat-value text-danger">₹{{ totalOutstanding().toFixed(2) }}</p>
          <p class="stat-sub muted">{{ unpaidCount() }} unpaid item(s)</p>
        </article>

        <article class="stat-card surface-card">
          <p class="stat-label">Total Paid</p>
          <p class="stat-value text-success">₹{{ totalPaid().toFixed(2) }}</p>
          <p class="stat-sub muted">{{ paidCount() }} settled fine(s)</p>
        </article>

        <article class="stat-card surface-card">
          <p class="stat-label">Total Assessments</p>
          <p class="stat-value">{{ fines().length }}</p>
          <p class="stat-sub muted">All-time circulation items</p>
        </article>
      </section>

      <!-- Fines list -->
      <section class="fines-table-section surface-card" aria-labelledby="fines-heading">
        <div class="section-header">
          <h2 id="fines-heading">Overdue Items & Fine Ledger</h2>
          <span class="count-badge">{{ fines().length }} Record(s)</span>
        </div>

        @if (!fines().length) {
          <div class="empty-state empty-good">
            <h3>✓ No Fines on File</h3>
            <p>Your library account has no overdue assessments or outstanding fines.</p>
          </div>
        } @else {
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">Book Title</th>
                  <th scope="col">Copy Barcode</th>
                  <th scope="col">Due Date</th>
                  <th scope="col">Overdue Days</th>
                  <th scope="col">Daily Rate</th>
                  <th scope="col">Fine Amount</th>
                  <th scope="col">Status</th>
                  <th scope="col">Payment / Receipt</th>
                </tr>
              </thead>
              <tbody>
                @for (fine of fines(); track fine.id) {
                  <tr>
                    <td>
                      <strong>{{ fine.bookTitle }}</strong>
                      @if (fine.bookIsbn) {
                        <br><small class="muted">ISBN: {{ fine.bookIsbn }}</small>
                      }
                    </td>
                    <td><code>{{ fine.copyIdentifier }}</code></td>
                    <td><time [attr.datetime]="fine.dueDate">{{ fine.dueDate | date:'mediumDate' }}</time></td>
                    <td>
                      <span class="days-badge">{{ fine.overdueDays }} day(s)</span>
                    </td>
                    <td>₹{{ fine.dailyRate.toFixed(2) }}/day</td>
                    <td>
                      <strong [class.text-danger]="fine.status === 'UNPAID'">
                        ₹{{ fine.fineAmount.toFixed(2) }}
                      </strong>
                    </td>
                    <td>
                      <span class="status-badge" [class.status-badge-danger]="fine.status === 'UNPAID'" [class.status-badge-success]="fine.status === 'PAID'">
                        {{ fine.status }}
                      </span>
                    </td>
                    <td>
                      @if (fine.status === 'PAID') {
                        @if (fine.payments.length > 0) {
                          <div class="receipt-info">
                            <strong>{{ fine.payments[0].receiptNumber }}</strong>
                            <br><small class="muted">{{ fine.payments[0].paymentDate | date:'short' }}</small>
                          </div>
                        } @else {
                          <span class="muted">Paid</span>
                        }
                      } @else {
                        <span class="muted">Pay at Circulation Desk</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    }
  `,
  styles: [`
    :host {
      display: block;
      padding: 1.5rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    .page-heading {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .page-heading h1 {
      margin: 0.25rem 0 0.5rem;
      font-size: 1.85rem;
      color: var(--color-forest-900, #1b382b);
    }
    .eyebrow {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--color-forest-700, #2c5943);
      margin: 0;
    }
    .muted {
      color: var(--color-charcoal-600, #555);
      margin: 0;
      font-size: 0.9rem;
    }
    .summary-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .stat-card {
      padding: 1.25rem;
      border-radius: 8px;
      background: #fff;
      border: 1px solid var(--color-sand-200, #e2ded5);
    }
    .stat-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 700;
      color: var(--color-charcoal-500, #666);
      margin: 0 0 0.5rem;
    }
    .stat-value {
      font-size: 1.85rem;
      font-weight: 700;
      margin: 0 0 0.25rem;
      color: var(--color-charcoal-900, #222);
    }
    .text-danger {
      color: var(--color-danger-700, #b91c1c);
    }
    .text-success {
      color: var(--color-forest-800, #15803d);
    }
    .stat-sub {
      font-size: 0.8rem;
    }
    .fines-table-section {
      background: #fff;
      border: 1px solid var(--color-sand-200, #e2ded5);
      border-radius: 8px;
      overflow: hidden;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem;
      border-bottom: 1px solid var(--color-sand-200, #e2ded5);
    }
    .section-header h2 {
      margin: 0;
      font-size: 1.25rem;
      color: var(--color-forest-900, #1b382b);
    }
    .count-badge {
      background: var(--color-sage-100, #e8ede9);
      color: var(--color-forest-900, #1b382b);
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .empty-state {
      padding: 3rem 1.5rem;
      text-align: center;
    }
    .empty-good h3 {
      color: var(--color-forest-800, #15803d);
      margin: 0 0 0.5rem;
    }
    .data-table-wrap {
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .data-table th {
      background: var(--color-sand-50, #fcfbfa);
      padding: 0.85rem 1rem;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-charcoal-600, #555);
      border-bottom: 1px solid var(--color-sand-200, #e2ded5);
    }
    .data-table td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid var(--color-sand-100, #edeae5);
      font-size: 0.9rem;
    }
    .data-table tr:last-child td {
      border-bottom: none;
    }
    .days-badge {
      background: #fef3c7;
      color: #92400e;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .status-badge-danger {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }
    .status-badge-success {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
    }
    .receipt-info strong {
      color: var(--color-forest-900, #1b382b);
    }
    .loading-state {
      padding: 2rem;
      text-align: center;
      color: var(--color-charcoal-500, #666);
    }
    .alert {
      padding: 0.85rem 1rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }
    .alert-error {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .button {
      padding: 0.55rem 1rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
    }
    .button-secondary {
      background: #fff;
      border-color: var(--color-sand-300, #d5d0c7);
      color: var(--color-charcoal-800, #333);
    }
    .button-secondary:hover:not(:disabled) {
      background: var(--color-sand-50, #fcfbfa);
    }
  `]
})
export class MyFinesComponent implements OnInit {
  private readonly borrowingService = inject(BorrowingService);

  readonly fines = signal<FineRecord[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly unpaidCount = signal(0);
  readonly paidCount = signal(0);
  readonly totalOutstanding = signal(0);
  readonly totalPaid = signal(0);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.borrowingService.myFines().pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: records => {
        this.fines.set(records);
        let unpaid = 0;
        let paid = 0;
        let outstanding = 0;
        let totalP = 0;
        for (const f of records) {
          if (f.status === 'UNPAID') {
            unpaid++;
            outstanding += f.fineAmount;
          } else {
            paid++;
            totalP += f.fineAmount;
          }
        }
        this.unpaidCount.set(unpaid);
        this.paidCount.set(paid);
        this.totalOutstanding.set(outstanding);
        this.totalPaid.set(totalP);
      },
      error: () => {
        this.error.set('Failed to load your fine records. Please try again.');
      }
    });
  }
}
