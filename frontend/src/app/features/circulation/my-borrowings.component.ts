import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { CatalogueService } from '../catalogue/catalogue.service';
import { BorrowingService, LoanRecord } from './borrowing.service';

export type BorrowingTab = 'CURRENT' | 'PAST' | 'ALL';

@Component({
  selector: 'app-my-borrowings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- Header Section -->
    <header class="page-header">
      <div class="header-left">
        <p class="eyebrow">YOUR LIBRARY</p>
        <h1 class="page-title">My Borrowings</h1>
        <p class="page-desc">Current physical loans and your completed borrowing history.</p>
      </div>

      <div class="header-right">
        <div class="limit-badge" aria-label="Borrow limit">
          Borrow Limit: {{ borrowLimit() }}
        </div>
      </div>
    </header>

    <!-- Success & Error Alerts -->
    @if (error()) {
      <div class="alert alert-error" role="alert">
        <span>{{ error() }}</span>
        <button type="button" class="btn-retry" (click)="load()">Try again</button>
      </div>
    }

    @if (notice()) {
      <div class="alert alert-success" role="status">
        <span>{{ notice() }}</span>
        <button type="button" class="btn-dismiss" (click)="notice.set('')" aria-label="Dismiss message">✕</button>
      </div>
    }

    <!-- Borrowing Filter Tabs -->
    <nav class="filter-tabs" aria-label="Borrowing categories">
      <button
        type="button"
        class="filter-tab"
        [class.active]="selectedTab() === 'CURRENT'"
        (click)="setTab('CURRENT')"
        [attr.aria-pressed]="selectedTab() === 'CURRENT'"
      >
        Current Loans ({{ current().length }})
      </button>

      <button
        type="button"
        class="filter-tab"
        [class.active]="selectedTab() === 'PAST'"
        (click)="setTab('PAST')"
        [attr.aria-pressed]="selectedTab() === 'PAST'"
      >
        Past Loans ({{ history().length }})
      </button>

      <button
        type="button"
        class="filter-tab"
        [class.active]="selectedTab() === 'ALL'"
        (click)="setTab('ALL')"
        [attr.aria-pressed]="selectedTab() === 'ALL'"
      >
        All ({{ totalLoansCount() }})
      </button>
    </nav>

    <!-- Main Content Area -->
    @if (loading() || historyLoading()) {
      <div class="loading-state surface-card" role="status">
        <div class="loading-spinner" aria-hidden="true"></div>
        <p>Loading your borrowing records…</p>
      </div>
    } @else if (totalLoansCount() === 0) {
      <!-- Empty State: No borrowing records at all -->
      <section class="empty-state surface-card" aria-label="No borrowing records found">
        <div class="empty-icon-wrap" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="empty-svg">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
        </div>
        <h2>No physical book borrowings</h2>
        <p>Books issued to you at the library circulation desk will appear here with active due dates and return history.</p>
        <a class="button button-primary" routerLink="/workspace/books">Explore Books</a>
      </section>
    } @else if (displayedLoans().length === 0) {
      <!-- Empty Tab State -->
      <section class="empty-tab surface-card" aria-label="No records in this category">
        <h3>{{ getEmptyTabHeading() }}</h3>
        <p>{{ getEmptyTabMessage() }}</p>
        <button type="button" class="button button-secondary" (click)="setTab('ALL')">
          View all loans ({{ totalLoansCount() }})
        </button>
      </section>
    } @else {
      <!-- Two Cards Per Row Grid matching Reference 2 Mockup (Option A) -->
      <div class="borrowing-grid" role="feed" aria-label="Physical loans list">
        @for (loan of displayedLoans(); track loan.id) {
          <article class="borrowing-card surface-card" aria-labelledby="'loan-title-' + loan.id">
            <!-- Left: Book Cover Thumbnail -->
            <div class="book-cover-wrap">
              @if (loan.coverImageUrl) {
                <img
                  class="book-cover-img"
                  [src]="loan.coverImageUrl"
                  [alt]="'Cover of ' + loan.bookTitle"
                  loading="lazy"
                />
              } @else {
                <div class="book-cover-fallback" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="book-fallback-icon">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                  </svg>
                  <span class="fallback-letter">{{ loan.bookTitle.slice(0, 1) }}</span>
                </div>
              }
            </div>

            <!-- Right: Loan Information -->
            <div class="loan-details-col">
              <!-- Header Row: Title & Status Badge -->
              <div class="card-top-row">
                <h2 [id]="'loan-title-' + loan.id" class="book-title" [title]="loan.bookTitle">
                  {{ loan.bookTitle }}
                </h2>

                <span class="loan-status-pill" [ngClass]="getStatusPillClass(loan)">
                  <span class="pill-dot" aria-hidden="true"></span>
                  <span>{{ getStatusLabel(loan) }}</span>
                </span>
              </div>

              <!-- Author -->
              <p class="book-author">
                {{ getAuthors(loan.bookId) }}
              </p>

              <!-- Metadata Details Grid: Copy ID, Due Date, Remaining -->
              <div class="meta-details-list">
                <!-- Copy ID -->
                <div class="meta-row">
                  <div class="meta-label-group">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="meta-icon" aria-hidden="true">
                      <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                      <line x1="7" y1="15" x2="7.01" y2="15"></line>
                      <line x1="2" y1="9.5" x2="22" y2="9.5"></line>
                    </svg>
                    <span class="meta-label">Copy ID</span>
                  </div>
                  <strong class="meta-val">{{ loan.copyIdentifier }}</strong>
                </div>

                <!-- Due Date (Active) / Issued Date (Past) -->
                <div class="meta-row">
                  <div class="meta-label-group">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="meta-icon" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span class="meta-label">{{ loan.status === 'ACTIVE' ? 'Due Date' : 'Issued Date' }}</span>
                  </div>
                  <time class="meta-val" [attr.datetime]="loan.status === 'ACTIVE' ? loan.dueDate : loan.issueDate">
                    {{ displayDate(loan.status === 'ACTIVE' ? loan.dueDate : loan.issueDate) }}
                  </time>
                </div>

                <!-- Remaining Days (Active) / Returned Date (Past) -->
                <div class="meta-row">
                  <div class="meta-label-group">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="meta-icon" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span class="meta-label">
                      {{ loan.status === 'ACTIVE' ? (loan.overdue ? 'Overdue' : 'Remaining') : 'Returned' }}
                    </span>
                  </div>
                  <strong
                    class="meta-val"
                    [class.val-green]="loan.status === 'ACTIVE' && !loan.overdue"
                    [class.val-red]="loan.status === 'ACTIVE' && loan.overdue"
                  >
                    {{ getRemainingText(loan) }}
                  </strong>
                </div>
              </div>

              <!-- Action Footer Row -->
              <div class="card-actions-row">
                @if (loan.status === 'ACTIVE' && loan.renewalEligible) {
                  <button
                    type="button"
                    class="btn-renew"
                    (click)="renew(loan)"
                    [disabled]="pending()"
                    title="Renew this book loan for an additional period"
                  >
                    {{ pendingId() === loan.id ? 'Renewing…' : 'Renew Once' }}
                  </button>
                } @else if (loan.status === 'ACTIVE' && loan.overdue) {
                  <span class="renewal-restricted-badge pill-overdue-note" title="Overdue loans cannot be renewed. Please return the book to the circulation desk.">
                    Overdue · Renewal unavailable
                  </span>
                } @else if (loan.status === 'ACTIVE' && loan.renewalCount >= 1) {
                  <span class="renewal-restricted-badge pill-maxed-note" title="This loan has reached the maximum of 1 renewal.">
                    Renewed (Max Reached)
                  </span>
                }

                <!-- Book Issue Receipt Download Button -->
                <button
                  type="button"
                  class="btn-receipt"
                  (click)="downloadReceipt(loan)"
                  [disabled]="downloadingId() === loan.id"
                  title="Download official book issue receipt PDF"
                  aria-label="Download receipt"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="receipt-icon" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span>{{ downloadingId() === loan.id ? 'Downloading…' : 'Receipt' }}</span>
                </button>
              </div>
            </div>
          </article>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    /* Page Header */
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }

    .header-left {
      display: flex;
      flex-direction: column;
    }

    .eyebrow {
      font-size: 0.75rem;
      font-weight: 700;
      color: #105B48;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 0.35rem;
    }

    .page-title {
      font-family: var(--font-serif);
      font-size: 1.95rem;
      font-weight: 700;
      color: #1F2421;
      margin: 0 0 0.35rem;
      line-height: 1.2;
      letter-spacing: -0.015em;
    }

    .page-desc {
      font-size: 0.9rem;
      color: #5A625D;
      margin: 0;
    }

    .header-right {
      display: flex;
      align-items: center;
      margin-top: 0.5rem;
    }

    .limit-badge {
      display: inline-flex;
      align-items: center;
      background: #E8F2EC;
      color: #003D30;
      border: 1px solid #C2D6CF;
      border-radius: 9999px;
      padding: 0.4rem 1.05rem;
      font-size: 0.85rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      white-space: nowrap;
    }

    /* Alerts */
    .alert {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.25rem;
      padding: 0.75rem 1.15rem;
      border-radius: 8px;
      font-size: 0.875rem;
    }

    .alert-error {
      background: #FEE2E2;
      color: #991B1B;
      border: 1px solid #FECACA;
    }

    .alert-success {
      background: #EAF2EF;
      color: #003D30;
      border: 1px solid #C2D6CF;
    }

    .btn-retry, .btn-dismiss {
      padding: 0.2rem 0.55rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .btn-retry {
      border: 1px solid #B91C1C;
      background: transparent;
      color: #991B1B;
    }

    .btn-retry:hover {
      background: #FCA5A5;
    }

    .btn-dismiss {
      border: 0;
      background: transparent;
      color: #5A625D;
    }

    .btn-dismiss:hover {
      background: rgba(0, 0, 0, 0.05);
      color: #1F2421;
    }

    /* Filter Tabs */
    .filter-tabs {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 1.6rem;
      overflow-x: auto;
      padding-bottom: 0.25rem;
      scrollbar-width: none;
    }

    .filter-tabs::-webkit-scrollbar {
      display: none;
    }

    .filter-tab {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 1.15rem;
      border-radius: 9999px;
      border: 1px solid #D8D2C4;
      background: #FFFFFF;
      color: #1F2421;
      font-size: 0.875rem;
      font-weight: 550;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
      user-select: none;
    }

    .filter-tab:hover:not(.active) {
      background: #F6F4EE;
      border-color: #CBD5E1;
      color: #003D30;
    }

    .filter-tab.active {
      background: #003D30;
      border-color: #003D30;
      color: #FFFFFF;
      font-weight: 600;
      box-shadow: 0 2px 6px rgba(0, 61, 48, 0.25);
    }

    /* Loading & Empty States */
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
      display: grid;
      place-items: center;
      width: 3.5rem;
      height: 3.5rem;
      margin: 0 auto 1rem;
      border-radius: 50%;
      background: #EAF2EF;
      color: #003D30;
    }

    .empty-svg {
      width: 1.85rem;
      height: 1.85rem;
    }

    .empty-state h2 {
      font-family: var(--font-serif);
      font-size: 1.45rem;
      color: #1F2421;
      margin: 0 0 0.5rem;
    }

    .empty-state p, .empty-tab p {
      font-size: 0.9rem;
      color: #5A625D;
      max-width: 28rem;
      margin: 0 auto 1.25rem;
      line-height: 1.45;
    }

    /* 2 Cards Per Row Grid matching Reference 2 Mockup (Option A) */
    .borrowing-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.35rem;
    }

    .borrowing-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
      padding: 1.15rem 1.25rem;
      display: grid;
      grid-template-columns: 112px 1fr;
      gap: 1.25rem;
      align-items: stretch;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .borrowing-card:hover {
      border-color: #CBD5E1;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    }

    /* Left: Book Cover Thumbnail */
    .book-cover-wrap {
      width: 112px;
      height: 156px;
      flex-shrink: 0;
      border-radius: 8px;
      overflow: hidden;
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.07);
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
      gap: 0.35rem;
    }

    .book-fallback-icon {
      width: 1.75rem;
      height: 1.75rem;
      opacity: 0.8;
    }

    .fallback-letter {
      font-size: 1.15rem;
      font-weight: 700;
    }

    /* Right: Loan Details Column */
    .loan-details-col {
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    /* Card Top Row: Title + Status Pill */
    .card-top-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.15rem;
    }

    .book-title {
      font-family: var(--font-sans);
      font-size: 1.05rem;
      font-weight: 700;
      color: #1F2421;
      margin: 0;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .loan-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.78rem;
      font-weight: 600;
      line-height: 1.2;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .pill-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .pill-on-loan {
      background: #DCFCE7;
      color: #15803D;
      border: 1px solid #BBF7D0;
    }

    .pill-overdue {
      background: #FEE2E2;
      color: #B91C1C;
      border: 1px solid #FECACA;
    }

    .pill-returned {
      background: #F3F4F6;
      color: #4B5563;
      border: 1px solid #E5E7EB;
    }

    .pill-lost {
      background: #FEF3C7;
      color: #92400E;
      border: 1px solid #FDE68A;
    }

    /* Author */
    .book-author {
      font-size: 0.86rem;
      color: #5A625D;
      margin: 0 0 0.85rem;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Metadata details list */
    .meta-details-list {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      margin-bottom: 0.85rem;
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.85rem;
      line-height: 1.25;
    }

    .meta-label-group {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      color: #718096;
      width: 90px;
      flex-shrink: 0;
    }

    .meta-icon {
      width: 0.95rem;
      height: 0.95rem;
      flex-shrink: 0;
      color: #718096;
    }

    .meta-label {
      font-size: 0.76rem;
      font-weight: 500;
    }

    .meta-val {
      font-size: 0.86rem;
      color: #1F2421;
      font-weight: 600;
      white-space: nowrap;
    }

    .val-green {
      color: #15803D !important;
      font-weight: 700;
    }

    .val-red {
      color: #B91C1C !important;
      font-weight: 700;
    }

    /* Action Footer Row matching Reference 2 Mockup */
    .card-actions-row {
      margin-top: auto;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.5rem;
      padding-top: 0.35rem;
    }

    .btn-renew {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.35rem 0.95rem;
      border-radius: 8px;
      background: #FFFFFF;
      color: #003D30;
      border: 1.5px solid #003D30;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .btn-renew:hover:not(:disabled) {
      background: #003D30;
      color: #FFFFFF;
    }

    .btn-renew:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .renewal-restricted-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.35rem 0.65rem;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      line-height: 1.2;
      white-space: nowrap;
    }

    .pill-overdue-note {
      background: #FEF2F2;
      color: #991B1B;
      border: 1px solid #FECACA;
    }

    .pill-maxed-note {
      background: #F3F4F6;
      color: #4B5563;
      border: 1px solid #E5E7EB;
    }

    .btn-receipt {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
      background: #F8FAF9;
      color: #5A625D;
      border: 1px solid #D8D2C4;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .btn-receipt:hover:not(:disabled) {
      background: #EAF2EF;
      color: #003D30;
      border-color: #C2D6CF;
    }

    .btn-receipt:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .receipt-icon {
      width: 0.9rem;
      height: 0.9rem;
    }

    /* Responsive Design */
    @media (max-width: 1080px) {
      .borrowing-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 600px) {
      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }
      .header-right {
        margin-top: 0;
      }
      .borrowing-card {
        grid-template-columns: 90px 1fr;
        padding: 1rem;
        gap: 1rem;
      }
      .book-cover-wrap {
        width: 90px;
        height: 130px;
      }
      .meta-label-group {
        width: 80px;
      }
    }

    @media (max-width: 440px) {
      .borrowing-card {
        grid-template-columns: 1fr;
      }
      .book-cover-wrap {
        width: 100px;
        height: 140px;
        margin: 0 auto 0.5rem;
      }
    }
  `]
})
export class MyBorrowingsComponent implements OnInit {
  private readonly service = inject(BorrowingService);
  private readonly catalogueService = inject(CatalogueService);
  readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly current = signal<LoanRecord[]>([]);
  readonly history = signal<LoanRecord[]>([]);
  readonly loading = signal(true);
  readonly historyLoading = signal(true);
  readonly pending = signal(false);
  readonly pendingId = signal('');
  readonly downloadingId = signal('');
  readonly error = signal('');
  readonly notice = signal('');
  readonly borrowLimit = signal<number>(5);
  readonly selectedTab = signal<BorrowingTab>('CURRENT');
  readonly authorMap = signal<Record<string, string>>({});

  readonly totalLoansCount = computed(() =>
    this.current().length + this.history().length
  );

  readonly displayedLoans = computed(() => {
    switch (this.selectedTab()) {
      case 'CURRENT':
        return this.current();
      case 'PAST':
        return this.history();
      case 'ALL':
      default:
        return [...this.current(), ...this.history()];
    }
  });

  ngOnInit(): void {
    this.loadPolicies();
    this.load();
  }

  loadPolicies(): void {
    this.http.get<any>('/api/v1/policies').subscribe({
      next: res => {
        const role = this.auth.profile()?.role;
        const limit = role === 'FACULTY'
          ? res?.borrowing?.facultyMaxBooks
          : res?.borrowing?.studentMaxBooks;
        if (typeof limit === 'number' && limit > 0) {
          this.borrowLimit.set(limit);
        }
      },
      error: () => {
        // Fall back to default 5
        this.borrowLimit.set(5);
      }
    });
  }

  load(): void {
    this.loading.set(true);
    this.historyLoading.set(true);
    this.error.set('');

    this.service.currentLoans()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: p => {
          const content = p?.content || [];
          this.current.set(content);
          this.fetchAuthorsForLoans(content);
        },
        error: e => {
          this.historyLoading.set(false);
          if (e?.status === 401) {
            void this.router.navigateByUrl('/login');
          } else {
            this.error.set('Your current loans could not be loaded.');
          }
        }
      });

    this.service.loanHistory()
      .pipe(finalize(() => this.historyLoading.set(false)))
      .subscribe({
        next: p => {
          const content = p?.content || [];
          this.history.set(content);
          this.fetchAuthorsForLoans(content);
        },
        error: () => {
          this.error.set('Your borrowing history could not be loaded.');
        }
      });
  }

  private fetchAuthorsForLoans(loans: LoanRecord[]): void {
    const uniqueIds = Array.from(new Set(loans.map(l => l.bookId).filter(Boolean)));
    for (const bookId of uniqueIds) {
      if (!this.authorMap()[bookId]) {
        this.catalogueService.get(bookId).subscribe({
          next: detail => {
            if (detail?.authors && detail.authors.length > 0) {
              const formatted = detail.authors.join(', ');
              this.authorMap.update(m => ({ ...m, [bookId]: formatted }));
            }
          },
          error: () => {}
        });
      }
    }
  }

  getAuthors(bookId: string): string {
    return this.authorMap()[bookId] || 'Academic Collection';
  }

  setTab(tab: BorrowingTab): void {
    this.selectedTab.set(tab);
  }

  renew(loan: LoanRecord): void {
    if (!loan.renewalEligible || this.pending()) return;
    this.pendingId.set(loan.id);
    this.pending.set(true);
    this.error.set('');
    this.notice.set('');

    this.service.renew(loan.id)
      .pipe(finalize(() => {
        this.pending.set(false);
        this.pendingId.set('');
      }))
      .subscribe({
        next: () => {
          this.notice.set('Renewal completed. Your new due date has been updated.');
          this.load();
        },
        error: e => {
          const serverMsg = e?.error?.message;
          this.error.set(
            serverMsg || (e?.status === 409
              ? 'This loan is no longer eligible for renewal.'
              : 'Renewal could not be completed. Please contact circulation desk.')
          );
        }
      });
  }

  downloadReceipt(loan: LoanRecord): void {
    if (!loan || !loan.id || this.downloadingId() === loan.id) return;
    this.downloadingId.set(loan.id);
    this.error.set('');
    this.notice.set('');

    this.service.downloadLoanReceipt(loan.id)
      .pipe(finalize(() => this.downloadingId.set('')))
      .subscribe({
        next: () => {
          this.notice.set('Book issue receipt downloaded successfully.');
        },
        error: () => {
          this.error.set('Failed to download receipt for this loan. Please try again.');
        }
      });
  }

  getStatusLabel(loan: LoanRecord): string {
    if (loan.status === 'ACTIVE') {
      return loan.overdue ? 'Overdue' : 'On Loan';
    }
    if (loan.status === 'LOST') return 'Lost';
    return 'Returned';
  }

  getStatusPillClass(loan: LoanRecord): string {
    if (loan.status === 'ACTIVE') {
      return loan.overdue ? 'pill-overdue' : 'pill-on-loan';
    }
    if (loan.status === 'LOST') return 'pill-lost';
    return 'pill-returned';
  }

  getRemainingText(loan: LoanRecord): string {
    if (loan.status !== 'ACTIVE') {
      if (loan.actualReturnDate) {
        return this.displayDate(loan.actualReturnDate);
      }
      return 'Completed';
    }

    if (loan.overdue) {
      const days = Math.abs(typeof loan.daysLeft === 'number' ? loan.daysLeft : this.diffDaysFromToday(loan.dueDate));
      return days === 1 ? '1 day overdue' : `${days} days overdue`;
    }

    const days = typeof loan.daysLeft === 'number' && loan.daysLeft >= 0
      ? loan.daysLeft
      : Math.max(0, this.diffDaysFromToday(loan.dueDate));

    return days === 1 ? '1 day' : `${days} days`;
  }

  private diffDaysFromToday(dueDateStr: string): number {
    try {
      const [y, m, d] = dueDateStr.split('-').map(Number);
      const target = new Date(y, m - 1, d);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      target.setHours(0, 0, 0, 0);
      const diffMs = target.getTime() - now.getTime();
      return Math.round(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

  displayDate(value: string | null | undefined): string {
    if (!value) return '—';
    try {
      if (value.includes('T')) {
        const d = new Date(value);
        if (isNaN(d.getTime())) return value;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      const parts = value.split('-').map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return value;
    } catch {
      return value;
    }
  }

  getEmptyTabHeading(): string {
    switch (this.selectedTab()) {
      case 'CURRENT':
        return 'No active loans';
      case 'PAST':
        return 'No completed loans';
      default:
        return 'No borrowings found';
    }
  }

  getEmptyTabMessage(): string {
    switch (this.selectedTab()) {
      case 'CURRENT':
        return 'You do not have any physical books currently issued to your account.';
      case 'PAST':
        return 'You do not have any past returned book loans in your borrowing history.';
      default:
        return 'There are no borrowing records matching this view.';
    }
  }
}
