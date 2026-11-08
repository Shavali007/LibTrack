import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { finalize } from 'rxjs';
import { BorrowingService, MemberFineSummary } from './borrowing.service';
import { FineRecord } from '../librarian/librarian-operations.service';

export type FineFilterTab = 'ALL' | 'UNPAID' | 'PAID' | 'OVERDUE';

@Component({
  selector: 'app-my-fines',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <!-- Page Header matching Mockup -->
    <header class="page-header">
      <div class="header-left">
        <p class="eyebrow">YOUR LIBRARY · ACCOUNTS</p>
        <h1 class="page-title">My Fines & Overdue Charges</h1>
        <p class="page-desc">Review overdue book assessments, current unpaid balances, and past payment receipts.</p>
      </div>
      <div class="header-actions">
        <button class="button button-secondary refresh-btn" type="button" (click)="load()" [disabled]="loading()">
          <span class="refresh-icon">↻</span> Refresh Fines
        </button>
      </div>
    </header>

    @if (error()) {
      <div class="alert alert-error" role="alert">
        <span>{{ error() }}</span>
        <button type="button" class="btn-retry" (click)="load()">Try again</button>
      </div>
    }

    <!-- 4 Summary Cards matching Target Mockup Image 2 -->
    <section class="summary-cards-grid" aria-labelledby="fines-summary-heading">
      <h2 id="fines-summary-heading" class="sr-only">Fines Overview</h2>

      <!-- Card 1: Total Outstanding (Red Indicator) -->
      <article class="stat-card stat-card-outstanding surface-card">
        <div class="stat-icon-wrap icon-outstanding" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="stat-svg">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <div class="stat-content">
          <p class="stat-label">Total Outstanding</p>
          <p class="stat-value text-danger">₹{{ totalOutstanding().toFixed(2) }}</p>
          <p class="stat-sub muted">{{ unpaidCount() }} unpaid item(s)</p>
        </div>
      </article>

      <!-- Card 2: Total Paid (Green Indicator) -->
      <article class="stat-card stat-card-paid surface-card">
        <div class="stat-icon-wrap icon-paid" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="stat-svg">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
          </svg>
        </div>
        <div class="stat-content">
          <p class="stat-label">Total Paid</p>
          <p class="stat-value text-success">₹{{ totalPaid().toFixed(2) }}</p>
          <p class="stat-sub muted">{{ paidCount() }} settled fine(s)</p>
        </div>
      </article>

      <!-- Card 3: Total Assessments (Light Blue Indicator) -->
      <article class="stat-card stat-card-assessments surface-card">
        <div class="stat-icon-wrap icon-assessments" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="stat-svg">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
        </div>
        <div class="stat-content">
          <p class="stat-label">Total Assessments</p>
          <p class="stat-value text-charcoal">{{ totalAssessments() }}</p>
          <p class="stat-sub muted">All-time circulation items</p>
        </div>
      </article>

      <!-- Card 4: Current Overdues (Amber Indicator) -->
      <article class="stat-card stat-card-overdues surface-card">
        <div class="stat-icon-wrap icon-overdues" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="stat-svg">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <div class="stat-content">
          <p class="stat-label">Current Overdues</p>
          <p class="stat-value" [class.text-danger]="currentOverdueCount() > 0" [class.text-charcoal]="currentOverdueCount() === 0">
            {{ currentOverdueCount() }}
          </p>
          <p class="stat-sub muted">{{ currentOverdueCount() > 0 ? 'Book(s) currently overdue' : 'Book(s) currently overdue' }}</p>
        </div>
      </article>
    </section>

    <!-- Fine Filters matching Mockup (Forest-green active pill) -->
    <nav class="filter-tabs" aria-label="Fine record categories">
      <button
        type="button"
        class="filter-tab"
        [class.active]="selectedTab() === 'ALL'"
        (click)="setTab('ALL')"
        [attr.aria-pressed]="selectedTab() === 'ALL'"
      >
        All ({{ fines().length }})
      </button>

      <button
        type="button"
        class="filter-tab"
        [class.active]="selectedTab() === 'UNPAID'"
        (click)="setTab('UNPAID')"
        [attr.aria-pressed]="selectedTab() === 'UNPAID'"
      >
        Unpaid ({{ unpaidFines().length }})
      </button>

      <button
        type="button"
        class="filter-tab"
        [class.active]="selectedTab() === 'PAID'"
        (click)="setTab('PAID')"
        [attr.aria-pressed]="selectedTab() === 'PAID'"
      >
        Paid ({{ paidFines().length }})
      </button>

      <button
        type="button"
        class="filter-tab"
        [class.active]="selectedTab() === 'OVERDUE'"
        (click)="setTab('OVERDUE')"
        [attr.aria-pressed]="selectedTab() === 'OVERDUE'"
      >
        Overdue ({{ overdueFines().length }})
      </button>
    </nav>

    <!-- Main Content Area: Loading / Empty / Ledger -->
    @if (loading()) {
      <div class="loading-state surface-card" role="status">
        <div class="loading-spinner" aria-hidden="true"></div>
        <p>Loading your fine records…</p>
      </div>
    } @else if (!fines().length) {
      <div class="empty-state surface-card">
        <div class="empty-icon-wrap" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h2>No Fines on File</h2>
        <p>Your library account has no overdue assessments or outstanding fines. Thank you for returning books on time!</p>
      </div>
    } @else if (!filteredFines().length) {
      <div class="empty-tab surface-card">
        <h3>No {{ selectedTab().toLowerCase() }} fines</h3>
        <p>There are no fine records currently matching the selected filter.</p>
        <button type="button" class="button button-secondary" (click)="setTab('ALL')">
          View all fines ({{ fines().length }})
        </button>
      </div>
    } @else {
      <!-- Fine Ledger matching Image 2 Reference Mockup -->
      <section class="ledger-card surface-card" aria-labelledby="ledger-section-title">
        <h2 id="ledger-section-title" class="sr-only">Overdue Items & Fine Ledger</h2>

        <!-- Ledger Column Headers (Desktop) -->
        <header class="ledger-header" aria-hidden="true">
          <span class="col-book">Book & Copy Details</span>
          <span class="col-due">Due Date & Status</span>
          <span class="col-fine">Fine Details</span>
          <span class="col-payment">Payment</span>
          <span class="col-actions">Actions</span>
        </header>

        <!-- Ledger Rows -->
        <div class="ledger-rows" role="feed" aria-label="Fine items list">
          @for (fine of filteredFines(); track fine.id) {
            <article class="ledger-row" (click)="openDetails(fine)">
              <!-- 1. Book & Copy Details -->
              <div class="cell-book">
                <div class="book-cover-wrap">
                  @if (fine.bookCoverImageUrl) {
                    <img [src]="fine.bookCoverImageUrl" [alt]="'Cover of ' + fine.bookTitle" class="book-cover-img" loading="lazy" />
                  } @else {
                    <div class="book-cover-fallback" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="cover-svg">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                      </svg>
                      <span class="fallback-letter">{{ fine.bookTitle.slice(0, 1) }}</span>
                    </div>
                  }
                </div>
                <div class="book-meta">
                  <h3 class="book-title">{{ fine.bookTitle }}</h3>
                  @if (fine.bookIsbn) {
                    <p class="meta-item"><span class="meta-label">ISBN:</span> {{ fine.bookIsbn }}</p>
                  }
                  <p class="meta-item"><span class="meta-label">Copy:</span> <code class="barcode-code">{{ fine.copyIdentifier }}</code></p>
                </div>
              </div>

              <!-- 2. Due Date & Status -->
              <div class="cell-due">
                <div class="due-date-row">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="cell-icon" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <div>
                    <span class="due-label">Due Date</span>
                    <time class="due-time" [attr.datetime]="fine.dueDate">{{ fine.dueDate | date:'mediumDate' }}</time>
                  </div>
                </div>

                @if (fine.renewed && fine.originalDueDate && fine.originalDueDate !== fine.dueDate) {
                  <p class="renewed-sub muted">
                    Renewed (Original: {{ fine.originalDueDate | date:'mediumDate' }})
                  </p>
                }

                <!-- Contextual Status Badges -->
                <div class="status-indicator-box">
                  @if (fine.renewed && !fine.loanOverdue) {
                    <span class="indicator-badge badge-amber">
                      <span class="info-dot">ⓘ</span> Assessed prior to renewal
                    </span>
                  } @else if (fine.loanOverdue) {
                    <span class="indicator-badge badge-danger">
                      <span class="info-dot">⚠</span> Currently overdue ({{ fine.overdueDays }} day(s))
                    </span>
                  } @else if (fine.loanStatus === 'RETURNED') {
                    <span class="indicator-badge badge-neutral">
                      <span class="info-dot">✓</span> Loan returned ({{ fine.overdueDays }} day(s))
                    </span>
                  } @else {
                    <span class="indicator-badge badge-amber">
                      <span class="info-dot">ⓘ</span> {{ fine.overdueDays }} day(s) overdue
                    </span>
                  }
                </div>
              </div>

              <!-- 3. Fine Details -->
              <div class="cell-fine">
                <div class="fine-amount-row">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="cell-icon" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path>
                    <line x1="12" y1="6" x2="12" y2="8"></line>
                    <line x1="12" y1="16" x2="12" y2="18"></line>
                  </svg>
                  <strong class="fine-amount-val">₹{{ fine.fineAmount.toFixed(2) }}</strong>
                </div>
                <div class="terms-applied">
                  <p class="term-rate">₹{{ fine.dailyRate.toFixed(2) }}/day</p>
                  <p class="term-sub">Maximum: ₹{{ fine.maxFine.toFixed(2) }}</p>
                  <p class="term-sub">Grace: {{ fine.gracePeriodDays }} day(s)</p>
                  <span class="sr-only">Terms Applied to This Loan: Maximum ₹{{ fine.maxFine.toFixed(2) }} · {{ fine.gracePeriodDays }} grace day(s)</span>
                </div>
              </div>

              <!-- 4. Payment Status -->
              <div class="cell-payment">
                <span class="status-pill" [class.pill-unpaid]="fine.status === 'UNPAID'" [class.pill-paid]="fine.status === 'PAID'">
                  <span class="pill-dot"></span>
                  <span>{{ fine.status === 'UNPAID' ? 'Unpaid' : 'Paid' }}</span>
                </span>
                <span class="sr-only">{{ fine.status }}</span>
                @if (fine.status === 'UNPAID') {
                  <span class="sr-only">Pay at Circulation Desk</span>
                }
              </div>

              <!-- 5. Actions -->
              <div class="cell-actions" (click)="$event.stopPropagation()">
                <button type="button" class="btn-view-details" (click)="openDetails(fine)">
                  <span>View Details</span>
                  <span class="arrow-glyph" aria-hidden="true">&gt;</span>
                </button>
              </div>
            </article>
          }
        </div>
      </section>
    }

    <!-- Right-Side Drawer matching Target Mockup Image 2 -->
    @if (selectedFine(); as detail) {
      <div class="drawer-backdrop" (click)="closeDetails()" aria-hidden="true"></div>

      <aside class="details-drawer surface-card" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <!-- Drawer Header -->
        <header class="drawer-header">
          <h2 id="drawer-title" class="drawer-title">Fine Details</h2>
          <button type="button" class="drawer-close-btn" (click)="closeDetails()" aria-label="Close details panel">✕</button>
        </header>

        <!-- Drawer Body -->
        <div class="drawer-body">
          <!-- Hero: Book Cover & Titles -->
          <div class="drawer-book-hero">
            <div class="drawer-cover-wrap">
              @if (detail.bookCoverImageUrl) {
                <img [src]="detail.bookCoverImageUrl" [alt]="detail.bookTitle" class="book-cover-img" />
              } @else {
                <div class="book-cover-fallback" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="cover-svg">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                  </svg>
                  <span class="fallback-letter">{{ detail.bookTitle.slice(0, 1) }}</span>
                </div>
              }
            </div>

            <div class="drawer-meta">
              <h3 class="drawer-book-title">{{ detail.bookTitle }}</h3>
              @if (detail.bookIsbn) {
                <p class="drawer-meta-line"><span class="meta-label">ISBN:</span> {{ detail.bookIsbn }}</p>
              }
              <p class="drawer-meta-line">
                <span class="meta-label">Copy ID:</span>
                <code class="barcode-code">{{ detail.copyIdentifier }}</code>
              </p>
            </div>
          </div>

          <!-- 2-Column Details Grid matching Mockup -->
          <div class="drawer-grid">
            <!-- Left Column: Dates & Timeline -->
            <div class="grid-col">
              <div class="info-block">
                <div class="block-icon-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="drawer-icon">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span class="block-title">Due Date</span>
                </div>
                <p class="block-value">{{ detail.dueDate | date:'mediumDate' }}</p>
              </div>

              <div class="info-block">
                <div class="block-icon-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="drawer-icon">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                  <span class="block-title">{{ detail.renewed ? 'Renewed On' : 'Issue Date' }}</span>
                </div>
                @if (detail.renewed && detail.originalDueDate) {
                  <p class="block-value">{{ detail.originalDueDate | date:'mediumDate' }}</p>
                  <p class="block-sub muted">(Original Due: {{ detail.originalDueDate | date:'mediumDate' }})</p>
                } @else {
                  <p class="block-value">{{ detail.issueDate | date:'mediumDate' }}</p>
                }
              </div>
            </div>

            <!-- Right Column: Fine Amount & Terms Applied -->
            <div class="grid-col">
              <div class="info-block">
                <div class="block-icon-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="drawer-icon">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path>
                    <line x1="12" y1="6" x2="12" y2="8"></line>
                    <line x1="12" y1="16" x2="12" y2="18"></line>
                  </svg>
                  <span class="block-title">Fine Amount</span>
                </div>
                <p class="block-value fine-highlight">₹{{ detail.fineAmount.toFixed(2) }}</p>
              </div>

              <div class="info-block">
                <div class="block-icon-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="drawer-icon">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <span class="block-title">Terms Applied</span>
                </div>
                <p class="block-value-sm">₹{{ detail.dailyRate.toFixed(2) }}/day · Maximum: ₹{{ detail.maxFine.toFixed(2) }}</p>
                <p class="block-sub muted">Grace: {{ detail.gracePeriodDays }} day(s)</p>
              </div>
            </div>
          </div>

          <!-- Why was this fine generated? Section -->
          <div class="drawer-explanation-section">
            <h4 class="explanation-title">Why was this fine generated?</h4>
            <p class="explanation-text">
              This fine accrued for <strong>{{ detail.overdueDays }} day(s)</strong> past the loan due date at the policy rate of
              <strong>₹{{ detail.dailyRate.toFixed(2) }}/day</strong> (capped at maximum ₹{{ detail.maxFine.toFixed(2) }} with {{ detail.gracePeriodDays }} grace day(s)).
            </p>
            <div class="billable-line">
              <span>Billable Overdue Days:</span>
              <strong>{{ detail.overdueDays }} day(s)</strong>
            </div>
            <span class="sr-only">Fine Assessment Details</span>
          </div>

          <!-- Desk Settlement Instruction / Receipt Details -->
          <div class="drawer-desk-notice">
            @if (detail.status === 'PAID') {
              <div class="settled-notice-content">
                <strong>✓ Paid in Full</strong>
                @if (detail.payments.length > 0) {
                  <p class="settled-sub">Official Receipt: <code>{{ detail.payments[0].receiptNumber }}</code></p>
                  <p class="settled-sub muted">Recorded by {{ detail.payments[0].recordedByEmail }} on {{ detail.payments[0].paymentDate | date:'medium' }}</p>
                } @else {
                  <p class="settled-sub muted">Recorded settled at circulation desk.</p>
                }
              </div>
            } @else {
              <div class="unpaid-desk-info">
                <strong>Pay at Circulation Desk</strong>
                <p class="desk-sub">
                  LibTrack requires physical settlement at the campus library circulation desk.
                  Partial payments are prohibited. The duty librarian will accept payment and issue an official receipt.
                </p>
              </div>
            }
          </div>
        </div>

        <!-- Drawer Footer matching Mockup: Status Pill + Action -->
        <footer class="drawer-footer">
          <div class="footer-status-wrap">
            <span class="footer-status-label">Status</span>
            <span class="status-pill" [class.pill-unpaid]="detail.status === 'UNPAID'" [class.pill-paid]="detail.status === 'PAID'">
              <span class="pill-dot"></span>
              <span>{{ detail.status === 'UNPAID' ? 'Unpaid' : 'Paid' }}</span>
            </span>
          </div>

          <div class="footer-action-wrap">
            @if (detail.status === 'UNPAID') {
              <div class="desk-pay-pill" title="Fine payments are handled at the library circulation desk">
                Pay at Circulation Desk
              </div>
            } @else {
              <button type="button" class="button button-secondary" (click)="closeDetails()">
                Close
              </button>
            }
          </div>
        </footer>
      </aside>
    }
  `,
  styles: [`
    :host {
      display: block;
      padding: 1.5rem;
      max-width: 1240px;
      margin: 0 auto;
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .eyebrow {
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #5A625D;
      margin: 0 0 0.25rem;
      text-transform: uppercase;
    }

    .page-title {
      font-family: var(--font-serif, 'Playfair Display', Georgia, serif);
      font-size: 1.75rem;
      font-weight: 600;
      color: #1F2421;
      margin: 0 0 0.35rem;
      line-height: 1.25;
      letter-spacing: -0.02em;
    }

    .page-desc {
      color: #5A625D;
      margin: 0;
      font-size: 0.85rem;
    }

    .refresh-btn {
      background: #FFFFFF;
      border: 1px solid #D8D2C4;
      border-radius: 8px;
      color: #1F2421;
      font-weight: 600;
      padding: 0.5rem 0.95rem;
      font-size: 0.84rem;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
      transition: all 0.15s ease;
    }

    .refresh-btn:hover:not(:disabled) {
      background: #F6F4EE;
      border-color: #CBD5E1;
    }

    .refresh-icon {
      font-size: 0.95rem;
    }

    /* Summary Cards (Matching Target Mockup 2) */
    .summary-cards-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-card {
      background: #FFFFFF;
      border: 1px solid #E5E0D5;
      border-radius: 12px;
      padding: 1.15rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .stat-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }

    .stat-svg {
      width: 22px;
      height: 22px;
    }

    .icon-outstanding {
      background: #FEE2E2;
      color: #DC2626;
    }

    .icon-paid {
      background: #EAF2EF;
      color: #059669;
    }

    .icon-assessments {
      background: #EFF6FF;
      color: #0284C7;
    }

    .icon-overdues {
      background: #FEF3C7;
      color: #D97706;
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-label {
      font-size: 0.8125rem;
      font-weight: 550;
      color: #4B5563;
      margin: 0 0 0.25rem;
    }

    .stat-value {
      font-family: var(--font-sans, -apple-system, sans-serif);
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1.15;
      margin: 0 0 0.2rem;
    }

    .stat-sub {
      font-size: 0.775rem;
      color: #6B7280;
      margin: 0;
    }

    .text-danger {
      color: #DC2626;
    }

    .text-success {
      color: #059669;
    }

    .text-charcoal {
      color: #1F2421;
    }

    /* Filter Tabs (Forest-green active pill) */
    .filter-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
    }

    .filter-tab {
      background: #FFFFFF;
      border: 1px solid #E5E0D5;
      color: #4B5563;
      padding: 0.45rem 1.1rem;
      border-radius: 9999px;
      font-size: 0.84375rem;
      font-weight: 550;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .filter-tab:hover {
      background: #F6F4EE;
      color: #003D30;
    }

    .filter-tab.active {
      background: #003D30;
      border-color: #003D30;
      color: #FFFFFF;
      box-shadow: 0 2px 6px rgba(0, 61, 48, 0.25);
    }

    /* Fine Ledger Card (Matching Reference 2 Mockup) */
    .ledger-card {
      background: #FFFFFF;
      border: 1px solid #E5E0D5;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    }

    .ledger-header {
      display: grid;
      grid-template-columns: 2.2fr 1.6fr 1.4fr 1fr 1.1fr;
      padding: 0.9rem 1.25rem;
      background: #FFFFFF;
      border-bottom: 1px solid #E5E0D5;
      font-size: 0.8rem;
      font-weight: 600;
      color: #4B5563;
    }

    .ledger-rows {
      display: flex;
      flex-direction: column;
    }

    .ledger-row {
      display: grid;
      grid-template-columns: 2.2fr 1.6fr 1.4fr 1fr 1.1fr;
      padding: 1.15rem 1.25rem;
      border-bottom: 1px solid #F1ECE4;
      align-items: center;
      transition: background 0.12s ease;
      cursor: pointer;
    }

    .ledger-row:last-child {
      border-bottom: none;
    }

    .ledger-row:hover {
      background: #FAF8F5;
    }

    /* Column 1: Book & Copy Details */
    .cell-book {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding-right: 0.5rem;
    }

    .book-cover-wrap {
      width: 48px;
      height: 66px;
      border-radius: 6px;
      overflow: hidden;
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.06);
    }

    .book-cover-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .book-cover-fallback {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #EAF2EF;
      color: #003D30;
      gap: 2px;
    }

    .cover-svg {
      width: 16px;
      height: 16px;
      opacity: 0.8;
    }

    .fallback-letter {
      font-size: 0.75rem;
      font-weight: 700;
    }

    .book-meta {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      min-width: 0;
    }

    .book-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #1F2421;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .meta-item {
      font-size: 0.78rem;
      color: #6B7280;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .meta-label {
      font-weight: 500;
      color: #4B5563;
    }

    .barcode-code {
      background: transparent;
      padding: 0;
      font-family: inherit;
      color: #4B5563;
    }

    /* Column 2: Due Date & Status */
    .cell-due {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding-right: 0.5rem;
    }

    .due-date-row {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .cell-icon {
      width: 16px;
      height: 16px;
      color: #4B5563;
      flex-shrink: 0;
    }

    .due-label {
      font-size: 0.75rem;
      color: #6B7280;
      display: block;
      line-height: 1.1;
    }

    .due-time {
      font-size: 0.875rem;
      font-weight: 700;
      color: #1F2421;
    }

    .renewed-sub {
      font-size: 0.75rem;
      color: #6B7280;
      margin: 0;
    }

    .status-indicator-box {
      margin-top: 0.15rem;
    }

    .indicator-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
      font-size: 0.74rem;
      font-weight: 550;
    }

    .badge-amber {
      background: #FEF3C7;
      color: #92400E;
      border: 1px solid #FDE68A;
    }

    .badge-danger {
      background: #FEE2E2;
      color: #991B1B;
      border: 1px solid #FECACA;
    }

    .badge-neutral {
      background: #F1F5F9;
      color: #475569;
      border: 1px solid #E2E8F0;
    }

    .info-dot {
      font-size: 0.78rem;
    }

    /* Column 3: Fine Details */
    .cell-fine {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      padding-right: 0.5rem;
    }

    .fine-amount-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .fine-amount-val {
      font-size: 0.975rem;
      font-weight: 700;
      color: #1F2421;
    }

    .terms-applied {
      font-size: 0.75rem;
      color: #6B7280;
      line-height: 1.35;
    }

    .term-rate {
      margin: 0;
      color: #4B5563;
    }

    .term-sub {
      margin: 0;
    }

    /* Column 4: Payment */
    .cell-payment {
      display: flex;
      align-items: center;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.76rem;
      font-weight: 600;
    }

    .pill-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .pill-unpaid {
      background: #FEE2E2;
      color: #DC2626;
      border: 1px solid #FECACA;
    }

    .pill-unpaid .pill-dot {
      background: #DC2626;
    }

    .pill-paid {
      background: #EAF2EF;
      color: #003D30;
      border: 1px solid #C2D6CF;
    }

    .pill-paid .pill-dot {
      background: #003D30;
    }

    /* Column 5: Actions */
    .cell-actions {
      display: flex;
      justify-content: flex-end;
    }

    .btn-view-details {
      background: #FFFFFF;
      border: 1px solid #003D30;
      color: #003D30;
      padding: 0.4rem 0.95rem;
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.15s ease;
    }

    .btn-view-details:hover {
      background: #EAF2EF;
    }

    .arrow-glyph {
      font-size: 0.85rem;
      font-weight: 700;
      line-height: 1;
    }

    /* Right-Side Drawer (Slide-Over Panel) */
    .drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(2px);
      z-index: 999;
      animation: fadeIn 0.18s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .details-drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 480px;
      max-width: 95vw;
      background: #FFFFFF;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      animation: slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideInRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .drawer-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #E5E0D5;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #FCFBF9;
    }

    .drawer-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1F2421;
      margin: 0;
    }

    .drawer-close-btn {
      background: transparent;
      border: none;
      font-size: 1.25rem;
      color: #6B7280;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      line-height: 1;
    }

    .drawer-close-btn:hover {
      background: #EFECE6;
      color: #1F2421;
    }

    .drawer-body {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1.35rem;
    }

    /* Drawer Hero */
    .drawer-book-hero {
      display: flex;
      gap: 1.15rem;
      align-items: center;
      padding: 1rem;
      background: #F6F4EE;
      border-radius: 10px;
      border: 1px solid #E5E0D5;
    }

    .drawer-cover-wrap {
      width: 58px;
      height: 80px;
      border-radius: 6px;
      overflow: hidden;
      flex-shrink: 0;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.06);
    }

    .drawer-meta {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      min-width: 0;
    }

    .drawer-book-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #1F2421;
      margin: 0 0 0.15rem;
    }

    .drawer-meta-line {
      font-size: 0.8rem;
      color: #6B7280;
      margin: 0;
    }

    /* 2-Column Drawer Grid */
    .drawer-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .grid-col {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .info-block {
      background: #FCFBF9;
      border: 1px solid #E5E0D5;
      border-radius: 8px;
      padding: 0.85rem;
    }

    .block-icon-label {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 0.35rem;
    }

    .drawer-icon {
      width: 16px;
      height: 16px;
      color: #4B5563;
    }

    .block-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: #4B5563;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .block-value {
      font-size: 0.95rem;
      font-weight: 700;
      color: #1F2421;
      margin: 0;
    }

    .block-value-sm {
      font-size: 0.82rem;
      font-weight: 600;
      color: #1F2421;
      margin: 0;
      line-height: 1.35;
    }

    .block-sub {
      font-size: 0.74rem;
      margin: 0.2rem 0 0;
    }

    .fine-highlight {
      color: #1F2421;
      font-size: 1.1rem;
    }

    /* Drawer Explanation */
    .drawer-explanation-section {
      background: #FFFFFF;
      border: 1px solid #E5E0D5;
      border-radius: 8px;
      padding: 0.95rem;
    }

    .explanation-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: #1F2421;
      margin: 0 0 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .explanation-text {
      font-size: 0.84rem;
      color: #5A625D;
      margin: 0 0 0.75rem;
      line-height: 1.45;
    }

    .billable-line {
      display: flex;
      justify-content: space-between;
      border-top: 1px dashed #E5E0D5;
      padding-top: 0.5rem;
      font-size: 0.85rem;
      color: #1F2421;
    }

    /* Desk Notice */
    .drawer-desk-notice {
      border-radius: 8px;
      padding: 0.95rem;
    }

    .unpaid-desk-info {
      background: #FEF3C7;
      border: 1px solid #FDE68A;
      border-radius: 8px;
      padding: 0.85rem;
    }

    .unpaid-desk-info strong {
      color: #92400E;
      font-size: 0.875rem;
      display: block;
      margin-bottom: 0.25rem;
    }

    .desk-sub {
      font-size: 0.8rem;
      color: #78350F;
      margin: 0;
      line-height: 1.4;
    }

    .settled-notice-content {
      background: #EAF2EF;
      border: 1px solid #C2D6CF;
      border-radius: 8px;
      padding: 0.85rem;
    }

    .settled-notice-content strong {
      color: #003D30;
      font-size: 0.875rem;
      display: block;
      margin-bottom: 0.25rem;
    }

    .settled-sub {
      font-size: 0.8rem;
      margin: 0.15rem 0 0;
      color: #1F2421;
    }

    /* Drawer Footer matching Mockup */
    .drawer-footer {
      padding: 1.15rem 1.5rem;
      border-top: 1px solid #E5E0D5;
      background: #FCFBF9;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .footer-status-wrap {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .footer-status-label {
      font-size: 0.84rem;
      font-weight: 600;
      color: #4B5563;
    }

    .desk-pay-pill {
      background: #003D30;
      color: #FFFFFF;
      padding: 0.55rem 1.15rem;
      border-radius: 9999px;
      font-size: 0.84rem;
      font-weight: 600;
      text-align: center;
      cursor: default;
      box-shadow: 0 2px 6px rgba(0, 61, 48, 0.2);
    }

    /* Common states & Alerts */
    .loading-state, .empty-state, .empty-tab {
      padding: 3rem 1.5rem;
      text-align: center;
      border-radius: 12px;
      border: 1px solid #E5E0D5;
      background: #FFFFFF;
    }

    .loading-spinner {
      width: 2rem;
      height: 2rem;
      margin: 0 auto 0.75rem;
      border: 3px solid #E2E8F0;
      border-top-color: #003D30;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-icon-wrap {
      width: 48px;
      height: 48px;
      margin: 0 auto 1rem;
      border-radius: 50%;
      background: #EAF2EF;
      color: #003D30;
      display: grid;
      place-items: center;
    }

    .empty-icon-wrap svg {
      width: 24px;
      height: 24px;
    }

    .alert {
      padding: 0.85rem 1rem;
      border-radius: 8px;
      margin-bottom: 1.25rem;
      font-size: 0.875rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .alert-error {
      background: #FEF2F2;
      color: #991B1B;
      border: 1px solid #FECACA;
    }

    .btn-retry {
      background: transparent;
      border: none;
      text-decoration: underline;
      color: #991B1B;
      cursor: pointer;
      font-weight: 600;
    }

    .button {
      padding: 0.5rem 0.95rem;
      border-radius: 6px;
      font-size: 0.84375rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }

    .button-secondary {
      background: #FFFFFF;
      border-color: #D8D2C4;
      color: #1F2421;
    }

    /* =========================================================
       Responsive Styles matching Mockup Image 2 Tablet & Mobile
       ========================================================= */

    /* Tablet (<= 992px) */
    @media (max-width: 992px) {
      .summary-cards-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .ledger-header {
        grid-template-columns: 2fr 1.8fr 1.2fr 0.8fr;
      }

      .col-actions {
        display: none;
      }

      .ledger-row {
        grid-template-columns: 2fr 1.8fr 1.2fr 0.8fr;
        position: relative;
      }

      .cell-actions {
        position: absolute;
        right: 1.25rem;
        top: 50%;
        transform: translateY(-50%);
      }

      .btn-view-details span:first-child {
        display: none;
      }

      .btn-view-details {
        padding: 0.35rem 0.55rem;
      }
    }

    /* Mobile (<= 640px) */
    @media (max-width: 640px) {
      :host {
        padding: 1rem 0.75rem;
      }

      .page-title {
        font-size: 1.4rem;
      }

      /* Stacked Horizontal Summary Cards matching Mobile Mockup */
      .summary-cards-grid {
        grid-template-columns: 1fr;
        gap: 0.65rem;
      }

      .stat-card {
        padding: 0.75rem 1rem;
        display: grid;
        grid-template-columns: 36px 1fr auto;
        align-items: center;
        gap: 0.75rem;
      }

      .stat-icon-wrap {
        width: 36px;
        height: 36px;
      }

      .stat-svg {
        width: 18px;
        height: 18px;
      }

      .stat-content {
        flex-direction: column;
      }

      .stat-label {
        margin: 0;
        font-size: 0.825rem;
      }

      .stat-sub {
        display: none;
      }

      .stat-value {
        font-size: 1.15rem;
        margin: 0;
        text-align: right;
      }

      /* Filter Tabs */
      .filter-tabs {
        gap: 0.35rem;
        overflow-x: auto;
        flex-wrap: nowrap;
        padding-bottom: 0.25rem;
      }

      .filter-tab {
        padding: 0.35rem 0.85rem;
        font-size: 0.78rem;
        white-space: nowrap;
      }

      /* Mobile Card Rows */
      .ledger-header {
        display: none;
      }

      .ledger-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.95rem;
        gap: 0.75rem;
      }

      .cell-book {
        flex: 1;
        min-width: 0;
      }

      .book-cover-wrap {
        width: 40px;
        height: 56px;
      }

      .meta-item {
        display: none;
      }

      .cell-due {
        display: none;
      }

      .cell-fine {
        display: none;
      }

      .cell-payment {
        flex-shrink: 0;
      }

      .cell-actions {
        position: static;
        transform: none;
        flex-shrink: 0;
      }

      .btn-view-details {
        border: none;
        background: transparent;
        padding: 0.25rem;
        color: #4B5563;
      }

      /* Drawer Mobile Full Width */
      .details-drawer {
        width: 100vw;
        max-width: 100vw;
      }

      .drawer-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class MyFinesComponent implements OnInit {
  private readonly borrowingService = inject(BorrowingService);

  readonly fines = signal<FineRecord[]>([]);
  readonly summary = signal<MemberFineSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly selectedTab = signal<FineFilterTab>('ALL');
  readonly selectedFine = signal<FineRecord | null>(null);

  readonly unpaidFines = computed(() => this.fines().filter(f => f.status === 'UNPAID'));
  readonly paidFines = computed(() => this.fines().filter(f => f.status === 'PAID'));
  readonly overdueFines = computed(() => this.fines().filter(f => f.loanOverdue || (f.status === 'UNPAID' && f.overdueDays > 0)));

  // Fallbacks if backend summary hasn't arrived
  readonly unpaidCount = computed(() => this.summary()?.unpaidCount ?? this.unpaidFines().length);
  readonly paidCount = computed(() => this.summary()?.paidCount ?? this.paidFines().length);
  readonly totalOutstanding = computed(() => {
    if (this.summary()?.totalOutstanding !== undefined) return this.summary()!.totalOutstanding;
    return this.unpaidFines().reduce((sum, f) => sum + f.fineAmount, 0);
  });
  readonly totalPaid = computed(() => {
    if (this.summary()?.totalPaid !== undefined) return this.summary()!.totalPaid;
    return this.paidFines().reduce((sum, f) => sum + f.fineAmount, 0);
  });
  readonly totalAssessments = computed(() => this.summary()?.totalAssessments ?? this.fines().length);
  readonly currentOverdueCount = computed(() => this.summary()?.currentOverdueCount ?? this.fines().filter(f => f.loanOverdue).length);

  readonly filteredFines = computed(() => {
    switch (this.selectedTab()) {
      case 'UNPAID': return this.unpaidFines();
      case 'PAID': return this.paidFines();
      case 'OVERDUE': return this.overdueFines();
      default: return this.fines();
    }
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    // Fetch summary
    if (this.borrowingService.myFineSummary) {
      this.borrowingService.myFineSummary().subscribe({
        next: (sum) => this.summary.set(sum),
        error: () => {}
      });
    }

    // Fetch records
    this.borrowingService.myFines().pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (records) => {
        this.fines.set(records);
      },
      error: () => {
        this.error.set('Failed to load your fine records. Please try again.');
      }
    });
  }

  setTab(tab: FineFilterTab): void {
    this.selectedTab.set(tab);
  }

  openDetails(fine: FineRecord): void {
    this.selectedFine.set(fine);
  }

  closeDetails(): void {
    this.selectedFine.set(null);
  }
}
