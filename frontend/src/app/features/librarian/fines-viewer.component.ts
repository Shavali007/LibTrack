import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  FineRecord,
  FineSummary,
  FinesPolicyResponse,
  LibrarianOperationsService
} from './librarian-operations.service';

@Component({
  selector: 'app-fines-viewer',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  template: `
    <header class="page-heading">
      <div>
        <p class="eyebrow">LIBRARIAN WORKSPACE · CIRCULATION DESK</p>
        <h1>Library Fines & Overdue Assessments</h1>
        <p class="muted">Monitor overdue book assessments, review institutional policy, and record full fine settlements.</p>
      </div>
      <div class="header-actions">
        <button class="button button-secondary" type="button" (click)="load()" [disabled]="loading()">
          ↻ Refresh Ledger
        </button>
      </div>
    </header>

    @if (error()) {
      <p class="alert alert-error" role="alert">{{ error() }}</p>
    }
    @if (successMessage()) {
      <p class="alert alert-success" role="status">{{ successMessage() }}</p>
    }

    <!-- 4 Summary Cards -->
    <section class="summary-cards-grid" aria-labelledby="summary-heading">
      <h2 id="summary-heading" class="sr-only">Fines Overview</h2>

      <article class="stat-card surface-card">
        <div class="stat-icon-wrap icon-total">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
        </div>
        <div>
          <p class="stat-label">Total Fines</p>
          <p class="stat-value">{{ summary()?.totalFines ?? 0 }}</p>
          <p class="stat-sub muted">Assessed circulation items</p>
        </div>
      </article>

      <article class="stat-card surface-card">
        <div class="stat-icon-wrap icon-unpaid">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <div>
          <p class="stat-label">Unpaid Fines</p>
          <p class="stat-value text-danger">{{ summary()?.unpaidFines ?? 0 }}</p>
          <p class="stat-sub text-danger">₹{{ (summary()?.totalOutstanding ?? 0).toFixed(2) }} outstanding</p>
        </div>
      </article>

      <article class="stat-card surface-card">
        <div class="stat-icon-wrap icon-paid">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <div>
          <p class="stat-label">Paid Fines</p>
          <p class="stat-value text-success">{{ summary()?.paidFines ?? 0 }}</p>
          <p class="stat-sub text-success">Settled accounts</p>
        </div>
      </article>

      <article class="stat-card surface-card">
        <div class="stat-icon-wrap icon-collected">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        </div>
        <div>
          <p class="stat-label">Total Collected</p>
          <p class="stat-value text-success">₹{{ (summary()?.totalCollected ?? 0).toFixed(2) }}</p>
          <p class="stat-sub muted">Recorded payments</p>
        </div>
      </article>
    </section>

    <!-- Policy Banner -->
    @if (policy(); as data) {
      <section class="policy-banner surface-card" aria-labelledby="policy-heading">
        <div class="banner-icon-box" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <div class="banner-body">
          <div class="banner-top">
            <h2 id="policy-heading">{{ data.policyTitle }}</h2>
            <span class="policy-status-badge">Policy: {{ data.status }}</span>
          </div>
          <p class="banner-text">{{ data.policyDescription }}</p>
          <div class="policy-invariants">
            <span class="invariant-item">✓ Standard loan: 21 eligible days (skipping holidays)</span>
            <span class="invariant-item">✓ Daily fine: ₹10.00/day (max ₹500.00/book)</span>
            <span class="invariant-item">✓ Full payment only (partial prohibited)</span>
            <span class="invariant-item">✓ No unauthorized ledger debiting</span>
            <span class="invariant-item">✓ Administrative resolution model</span>
          </div>
        </div>
      </section>
    }

    <!-- Fines Ledger Table -->
    <section class="fines-ledger-section surface-card" aria-labelledby="ledger-heading">
      <div class="section-header-split">
        <div>
          <h2 id="ledger-heading">Fine Assessment Ledger</h2>
          <p class="section-sub muted">Comprehensive record of overdue loans, fine amounts, and recorded receipts.</p>
        </div>
        <div class="filter-pills">
          <button
            type="button"
            class="filter-pill"
            [class.active]="filter() === 'ALL'"
            (click)="setFilter('ALL')">
            All ({{ fines().length }})
          </button>
          <button
            type="button"
            class="filter-pill pill-danger"
            [class.active]="filter() === 'UNPAID'"
            (click)="setFilter('UNPAID')">
            Unpaid ({{ unpaidFinesCount() }})
          </button>
          <button
            type="button"
            class="filter-pill pill-success"
            [class.active]="filter() === 'PAID'"
            (click)="setFilter('PAID')">
            Paid ({{ paidFinesCount() }})
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state" role="status">Retrieving fine records and audit ledger…</div>
      } @else if (!filteredFines().length) {
        <div class="empty-state empty-good">
          <h3>✓ Perfect Circulation Compliance</h3>
          <p>There are no {{ filter() === 'ALL' ? '' : filter().toLowerCase() }} fines in the library registry.</p>
        </div>
      } @else {
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th scope="col">Borrower</th>
                <th scope="col">Book Title</th>
                <th scope="col">Barcode</th>
                <th scope="col">Due Date</th>
                <th scope="col">Overdue</th>
                <th scope="col">Fine (₹)</th>
                <th scope="col">Status</th>
                <th scope="col" style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              @for (fine of filteredFines(); track fine.id) {
                <tr>
                  <td>
                    <strong>{{ fine.borrowerName }}</strong>
                    <br><small class="muted">{{ fine.borrowerEmail }}</small>
                    @if (fine.borrowerInstitutionalId) {
                      <br><small class="muted">ID: {{ fine.borrowerInstitutionalId }}</small>
                    }
                  </td>
                  <td>
                    <span class="book-title-cell" [title]="fine.bookTitle">{{ fine.bookTitle }}</span>
                    @if (fine.bookIsbn) {
                      <small class="muted">ISBN: {{ fine.bookIsbn }}</small>
                    }
                  </td>
                  <td><code>{{ fine.copyIdentifier }}</code></td>
                  <td><time [attr.datetime]="fine.dueDate">{{ fine.dueDate | date:'mediumDate' }}</time></td>
                  <td>
                    <span class="days-badge">{{ fine.overdueDays }} day(s)</span>
                  </td>
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
                  <td style="text-align: right;">
                    @if (fine.status === 'UNPAID') {
                      <button
                        type="button"
                        class="button button-primary button-sm"
                        (click)="openPaymentModal(fine)">
                        Record Payment
                      </button>
                    } @else {
                      <button
                        type="button"
                        class="button button-secondary button-sm"
                        (click)="openReceiptModal(fine)">
                        View History
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>

    <!-- Payment Modal Dialog -->
    @if (selectedFine(); as target) {
      <div class="modal-backdrop" (click)="closeModal()">
        <div class="modal-dialog surface-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <header class="modal-header">
            <h2 id="modal-title">Record Fine Payment</h2>
            <button type="button" class="close-btn" (click)="closeModal()" aria-label="Close dialog">✕</button>
          </header>

          <div class="modal-body">
            @if (modalError()) {
              <p class="alert alert-error" role="alert">{{ modalError() }}</p>
            }

            <div class="payment-details-box">
              <div class="detail-row">
                <span class="muted">Borrower:</span>
                <strong>{{ target.borrowerName }} ({{ target.borrowerEmail }})</strong>
              </div>
              <div class="detail-row">
                <span class="muted">Book:</span>
                <span>{{ target.bookTitle }}</span>
              </div>
              <div class="detail-row">
                <span class="muted">Copy Barcode:</span>
                <code>{{ target.copyIdentifier }}</code>
              </div>
              <div class="detail-row">
                <span class="muted">Days Overdue:</span>
                <span>{{ target.overdueDays }} day(s)</span>
              </div>
              <div class="detail-row total-row">
                <span>Amount Due (Full Settlement):</span>
                <span class="total-amount text-danger">₹{{ target.fineAmount.toFixed(2) }}</span>
              </div>
            </div>

            <p class="policy-note">
              <em>Note: Partial fine payments are prohibited by institutional policy. The full balance must be collected in cash or official institutional receipt.</em>
            </p>

            <form (ngSubmit)="submitPayment(target)">
              <div class="form-group">
                <label for="receiptNumber">Receipt / Reference Number <span class="required">*</span></label>
                <input
                  id="receiptNumber"
                  type="text"
                  class="text-input"
                  [(ngModel)]="receiptInput"
                  name="receiptNumber"
                  placeholder="e.g., REC-2026-1049"
                  required
                  [disabled]="submittingPayment()"
                  autofocus />
              </div>

              <div class="modal-actions">
                <button
                  type="button"
                  class="button button-secondary"
                  (click)="closeModal()"
                  [disabled]="submittingPayment()">
                  Cancel
                </button>
                <button
                  type="submit"
                  class="button button-primary"
                  [disabled]="submittingPayment() || !receiptInput.trim()">
                  {{ submittingPayment() ? 'Recording…' : 'Confirm Full Payment (₹' + target.fineAmount.toFixed(2) + ')' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }

    <!-- Receipt / History Modal Dialog -->
    @if (receiptFine(); as target) {
      <div class="modal-backdrop" (click)="closeReceiptModal()">
        <div class="modal-dialog surface-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
          <header class="modal-header">
            <h2 id="receipt-title">Fine Payment Receipt</h2>
            <button type="button" class="close-btn" (click)="closeReceiptModal()" aria-label="Close dialog">✕</button>
          </header>

          <div class="modal-body">
            <div class="receipt-card">
              <div class="receipt-header">
                <h3>LibTrack Circulation Desk</h3>
                <span class="status-badge status-badge-success">SETTLED IN FULL</span>
              </div>

              <div class="receipt-content">
                <div class="detail-row">
                  <span class="muted">Fine ID:</span>
                  <code>{{ target.id }}</code>
                </div>
                <div class="detail-row">
                  <span class="muted">Borrower:</span>
                  <strong>{{ target.borrowerName }} ({{ target.borrowerEmail }})</strong>
                </div>
                <div class="detail-row">
                  <span class="muted">Book:</span>
                  <span>{{ target.bookTitle }}</span>
                </div>
                <div class="detail-row">
                  <span class="muted">Barcode:</span>
                  <code>{{ target.copyIdentifier }}</code>
                </div>
                <div class="detail-row">
                  <span class="muted">Days Overdue:</span>
                  <span>{{ target.overdueDays }} day(s)</span>
                </div>
                <div class="detail-row total-row">
                  <span>Total Amount Paid:</span>
                  <span class="total-amount text-success">₹{{ target.fineAmount.toFixed(2) }}</span>
                </div>

                @if (target.payments.length > 0) {
                  <div class="payment-logs-box">
                    <h4>Recorded Transactions</h4>
                    @for (p of target.payments; track p.id) {
                      <div class="log-item">
                        <div>
                          <strong>Receipt #: {{ p.receiptNumber }}</strong>
                          <br><small class="muted">Recorded by: {{ p.recordedByEmail }}</small>
                        </div>
                        <div style="text-align: right;">
                          <strong>₹{{ p.amount.toFixed(2) }}</strong>
                          <br><small class="muted">{{ p.paymentDate | date:'medium' }}</small>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>

              <div class="modal-actions" style="margin-top: 1.5rem;">
                <button type="button" class="button button-secondary" (click)="closeReceiptModal()">
                  Close Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
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
      font-family: var(--type-page-title-family);
      font-size: var(--type-page-title-size);
      font-weight: var(--type-page-title-weight);
      color: var(--type-page-title-color);
      margin: 0 0 0.25rem;
      line-height: var(--type-page-title-line);
      letter-spacing: var(--letter-spacing-tight);
    }
    .eyebrow {
      font-size: var(--font-size-2xs);
      font-weight: var(--font-weight-bold);
      letter-spacing: var(--letter-spacing-wider);
      color: var(--color-charcoal-600);
      margin: 0;
      text-transform: uppercase;
    }
    .muted {
      color: var(--type-page-subtitle-color);
      margin: 0;
      font-size: var(--type-page-subtitle-size);
    }
    .summary-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 1.75rem;
    }
    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.15rem 1.25rem;
      border-radius: var(--radius-panel);
      background: var(--color-paper);
      border: 1px solid var(--color-line-200);
      box-shadow: var(--shadow-panel);
    }
    .stat-icon-wrap {
      width: 2.75rem;
      height: 2.75rem;
      border-radius: var(--radius-control);
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }
    .stat-icon-wrap svg {
      width: 1.5rem;
      height: 1.5rem;
    }
    .icon-total { background: #f1f5f9; color: #475569; }
    .icon-unpaid { background: #fee2e2; color: #dc2626; }
    .icon-paid { background: #EAF2EF; color: #003D30; }
    .icon-collected { background: #EAF2EF; color: #003D30; }
    .stat-label {
      font-size: var(--type-stat-label-size);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: var(--type-stat-label-weight);
      color: var(--type-stat-label-color);
      margin: 0 0 0.25rem;
    }
    .stat-value {
      font-family: var(--type-stat-number-family);
      font-size: var(--type-stat-number-size);
      font-weight: var(--type-stat-number-weight);
      line-height: 1.1;
      margin: 0 0 0.15rem;
      color: var(--color-charcoal-900);
      line-height: 1.1;
    }
    .text-danger { color: #dc2626; }
    .text-success { color: #003D30; }
    .stat-sub { font-size: 0.78rem; margin: 0; }
    .policy-banner {
      display: flex;
      gap: 1.25rem;
      padding: 1.25rem 1.5rem;
      border-radius: 8px;
      border: 1px solid #e2d9cc;
      background: linear-gradient(135deg, #fdfbf7 0%, #f7f2ea 100%);
      margin-bottom: 1.75rem;
    }
    .banner-icon-box {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 6px;
      background: #fef3c7;
      color: #92400e;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }
    .banner-icon-box svg { width: 1.4rem; height: 1.4rem; }
    .banner-body { flex: 1; }
    .banner-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.35rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .banner-top h2 { margin: 0; font-size: 1.15rem; color: #2b1f14; }
    .policy-status-badge {
      background: #f1f5f9;
      color: #334155;
      padding: 0.15rem 0.55rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      border: 1px solid #cbd5e1;
    }
    .banner-text {
      margin: 0 0 0.75rem;
      font-size: 0.88rem;
      line-height: 1.45;
      color: #524336;
    }
    .policy-invariants {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .invariant-item {
      font-size: 0.78rem;
      font-weight: 600;
      color: #003D30;
    }
    .fines-ledger-section {
      background: #fff;
      border: 1px solid var(--color-sand-200, #e2ded5);
      border-radius: 8px;
      overflow: hidden;
    }
    .section-header-split {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--color-sand-200, #e2ded5);
      flex-wrap: wrap;
      gap: 1rem;
    }
    .section-header-split h2 { margin: 0 0 0.2rem; font-size: 1.25rem; }
    .section-sub { margin: 0; font-size: 0.88rem; }
    .filter-pills {
      display: flex;
      gap: 0.5rem;
    }
    .filter-pill {
      background: var(--color-sand-50, #fcfbfa);
      border: 1px solid var(--color-sand-200, #e2ded5);
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      color: var(--color-charcoal-700, #444);
    }
    .filter-pill.active {
      background: #003D30;
      color: #fff;
      border-color: #003D30;
    }
    .pill-danger.active {
      background: #dc2626;
      border-color: #dc2626;
      color: #fff;
    }
    .pill-success.active {
      background: #003D30;
      border-color: #003D30;
      color: #fff;
    }
    .data-table-wrap { overflow-x: auto; }
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
      font-size: 0.88rem;
      vertical-align: middle;
    }
    .data-table tr:last-child td { border-bottom: none; }
    .book-title-cell {
      max-width: 16rem;
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 600;
    }
    .days-badge {
      background: #fef3c7;
      color: #92400e;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.78rem;
      font-weight: 600;
    }
    .status-badge {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .status-badge-danger {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }
    .status-badge-success {
      background: #EAF2EF;
      color: #003D30;
      border: 1px solid #C2D6CF;
    }
    .empty-state {
      padding: 3rem 1.5rem;
      text-align: center;
    }
    .empty-good {
      color: #003D30;
      background: #EAF2EF;
    }
    .empty-good h3 { margin: 0 0 0.35rem; font-size: 1.2rem; }
    .loading-state {
      padding: 2.5rem;
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
    .alert-success {
      background: #EAF2EF;
      color: #003D30;
      border: 1px solid #C2D6CF;
    }
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
      transition: background 0.15s ease;
    }
    .button-sm {
      padding: 0.35rem 0.75rem;
      font-size: 0.78rem;
    }
    .button-primary {
      background: #003D30;
      color: #fff;
    }
    .button-primary:hover:not(:disabled) {
      background: #002B22;
    }
    .button-secondary {
      background: #fff;
      border-color: var(--color-sand-300, #d5d0c7);
      color: var(--color-charcoal-800, #333);
    }
    .button-secondary:hover:not(:disabled) {
      background: var(--color-sand-50, #fcfbfa);
    }
    .button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      display: grid;
      place-items: center;
      z-index: 1000;
      padding: 1rem;
    }
    .modal-dialog {
      background: #fff;
      border-radius: 8px;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      overflow: hidden;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--color-sand-200, #e2ded5);
    }
    .modal-header h2 {
      margin: 0;
      font-size: 1.25rem;
      color: #003D30;
    }
    .close-btn {
      background: transparent;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
      color: #666;
    }
    .modal-body {
      padding: 1.5rem;
    }
    .payment-details-box, .receipt-content {
      background: var(--color-sand-50, #fcfbfa);
      border: 1px solid var(--color-sand-200, #e2ded5);
      border-radius: 6px;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 0.35rem 0;
      font-size: 0.88rem;
    }
    .total-row {
      border-top: 1px solid var(--color-sand-200, #e2ded5);
      margin-top: 0.5rem;
      padding-top: 0.75rem;
      font-weight: 700;
      font-size: 1rem;
    }
    .total-amount {
      font-size: 1.2rem;
    }
    .policy-note {
      font-size: 0.8rem;
      color: var(--color-charcoal-600, #666);
      margin-bottom: 1.25rem;
    }
    .form-group {
      margin-bottom: 1.25rem;
    }
    .form-group label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 0.4rem;
      color: var(--color-charcoal-800, #333);
    }
    .required { color: #dc2626; }
    .text-input {
      width: 100%;
      padding: 0.65rem 0.85rem;
      border: 1px solid var(--color-sand-300, #d5d0c7);
      border-radius: 6px;
      font-size: 0.95rem;
      box-sizing: border-box;
    }
    .text-input:focus {
      outline: none;
      border-color: #003D30;
      box-shadow: 0 0 0 2px rgba(0, 61, 48, 0.15);
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }
    .receipt-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--color-sand-200, #e2ded5);
    }
    .receipt-header h3 {
      margin: 0;
      font-size: 1.1rem;
      color: #003D30;
    }
    .payment-logs-box {
      margin-top: 1rem;
      border-top: 1px dashed var(--color-sand-300, #d5d0c7);
      padding-top: 0.75rem;
    }
    .payment-logs-box h4 {
      margin: 0 0 0.5rem;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #666;
    }
    .log-item {
      display: flex;
      justify-content: space-between;
      background: #fff;
      padding: 0.65rem 0.85rem;
      border-radius: 4px;
      border: 1px solid var(--color-sand-200, #e2ded5);
      margin-bottom: 0.5rem;
      font-size: 0.85rem;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }
  `]
})
export class FinesViewerComponent implements OnInit {
  private readonly opsService = inject(LibrarianOperationsService);

  readonly policy = signal<FinesPolicyResponse | null>(null);
  readonly summary = signal<FineSummary | null>(null);
  readonly fines = signal<FineRecord[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly successMessage = signal('');

  readonly filter = signal<'ALL' | 'UNPAID' | 'PAID'>('ALL');

  readonly unpaidFinesCount = computed(() => this.fines().filter(f => f.status === 'UNPAID').length);
  readonly paidFinesCount = computed(() => this.fines().filter(f => f.status === 'PAID').length);

  readonly filteredFines = computed(() => {
    const f = this.filter();
    if (f === 'UNPAID') return this.fines().filter(x => x.status === 'UNPAID');
    if (f === 'PAID') return this.fines().filter(x => x.status === 'PAID');
    return this.fines();
  });

  // Payment Modal state
  readonly selectedFine = signal<FineRecord | null>(null);
  receiptInput = '';
  readonly submittingPayment = signal(false);
  readonly modalError = signal('');

  // Receipt Modal state
  readonly receiptFine = signal<FineRecord | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    if (this.opsService.getFinesPolicy) {
      this.opsService.getFinesPolicy().subscribe({
        next: (res) => this.policy.set(res),
        error: () => {}
      });
    }

    if (this.opsService.getFinesSummary) {
      this.opsService.getFinesSummary().subscribe({
        next: (res) => this.summary.set(res),
        error: () => {}
      });
    }

    if (this.opsService.getAllFines) {
      this.opsService.getAllFines()
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (res) => this.fines.set(res),
          error: () => this.error.set('Could not load fines records from the server.')
        });
    } else {
      this.loading.set(false);
    }
  }

  setFilter(filter: 'ALL' | 'UNPAID' | 'PAID'): void {
    this.filter.set(filter);
  }

  openPaymentModal(fine: FineRecord): void {
    this.selectedFine.set(fine);
    this.receiptInput = '';
    this.modalError.set('');
  }

  closeModal(): void {
    this.selectedFine.set(null);
    this.receiptInput = '';
    this.modalError.set('');
  }

  openReceiptModal(fine: FineRecord): void {
    this.receiptFine.set(fine);
  }

  closeReceiptModal(): void {
    this.receiptFine.set(null);
  }

  submitPayment(fine: FineRecord): void {
    if (!this.receiptInput.trim()) {
      this.modalError.set('Receipt or reference number is required.');
      return;
    }

    this.submittingPayment.set(true);
    this.modalError.set('');

    this.opsService.recordPayment(fine.id, fine.fineAmount, this.receiptInput.trim())
      .pipe(finalize(() => this.submittingPayment.set(false)))
      .subscribe({
        next: () => {
          this.closeModal();
          this.successMessage.set(`Payment of ₹${fine.fineAmount.toFixed(2)} recorded successfully.`);
          this.load();
          setTimeout(() => this.successMessage.set(''), 5000);
        },
        error: (err) => {
          const msg = err.error?.message || 'Payment could not be recorded.';
          this.modalError.set(msg);
        }
      });
  }
}
