import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { BookCopy, CatalogueService } from '../catalogue/catalogue.service';
import { BorrowRequestRecord, BorrowingService, Holiday, LoanRecord, ReturnCondition } from './borrowing.service';

@Component({
  selector: 'app-librarian-requests',
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `
    <!-- Page Header matching Screenshot 4 -->
    <header class="page-header">
      <div>
        <h1 class="page-title">Borrow Requests</h1>
        <p class="page-subtitle">Review and manage student and faculty borrowing requests</p>
      </div>
    </header>

    @if (error()) {
      <p class="alert alert-error" role="alert">{{ error() }}</p>
    }
    @if (notice()) {
      <p class="alert alert-success" role="status">{{ notice() }}</p>
    }

    <!-- Tabs matching Screenshot 4 -->
    <div class="filter-tabs-bar" role="tablist">
      <button
        type="button"
        class="tab-btn"
        [class.active]="filter() === 'PENDING'"
        (click)="setFilter('PENDING')"
      >
        Pending ({{ countForStatus('PENDING') }})
      </button>
      <button
        type="button"
        class="tab-btn"
        [class.active]="filter() === 'APPROVED'"
        (click)="setFilter('APPROVED')"
      >
        Approved ({{ countForStatus('APPROVED') }})
      </button>
      <button
        type="button"
        class="tab-btn"
        [class.active]="filter() === 'REJECTED'"
        (click)="setFilter('REJECTED')"
      >
        Rejected ({{ countForStatus('REJECTED') }})
      </button>
      <button
        type="button"
        class="tab-btn"
        [class.active]="filter() === ''"
        (click)="setFilter('')"
      >
        All Requests
      </button>
    </div>

    <!-- Toolbar: Search + Role Filter -->
    <div class="requests-toolbar surface-card">
      <div class="search-input-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          [(ngModel)]="searchQuery"
          placeholder="Search requests by student, book, or ID..."
        >
      </div>

      <div class="select-field">
        <select [(ngModel)]="roleFilter">
          <option value="">All Roles</option>
          <option value="STUDENT">Student</option>
          <option value="FACULTY">Faculty</option>
        </select>
      </div>

      <!-- Preserved accessible select for test compatibility -->
      <div class="select-field sr-only">
        <label for="request-status">Show requests</label>
        <select id="request-status" [ngModel]="filter()" (ngModelChange)="setFilter($event)">
          <option value="PENDING">Pending review</option>
          <option value="APPROVED">Approved · awaiting issue</option>
          <option value="REJECTED">Rejected</option>
          <option value="ISSUED">Issued</option>
          <option value="">All statuses</option>
        </select>
      </div>

      <button class="button button-primary filter-submit-btn" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
          <line x1="4" y1="21" x2="4" y2="14"></line>
          <line x1="4" y1="10" x2="4" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12" y2="3"></line>
          <line x1="20" y1="21" x2="20" y2="16"></line>
          <line x1="20" y1="12" x2="20" y2="3"></line>
          <line x1="1" y1="14" x2="7" y2="14"></line>
          <line x1="9" y1="8" x2="15" y2="8"></line>
          <line x1="17" y1="16" x2="23" y2="16"></line>
        </svg>
        Filter
      </button>
    </div>

    @if (loading()) {
      <div class="loading-state surface-card" role="status">Loading requests…</div>
    } @else if (!filteredItems().length) {
      <!-- Empty State matching Screenshot 4 -->
      <section class="empty-state surface-card">
        <div class="empty-icon-circle" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>
        <h2>No pending requests</h2>
        <p>All borrow requests have been reviewed.</p>
        <button class="button button-secondary" type="button" (click)="setFilter('')">
          View All Requests
        </button>
      </section>
    } @else {
      <!-- Request List Cards -->
      <div class="request-list">
        @for (item of filteredItems(); track item.id) {
          <article class="surface-card request-card">
            <div class="request-head">
              <div class="cover-thumb-col">
                @if (item.coverImageUrl) {
                  <img class="book-cover-thumb" [src]="item.coverImageUrl" [alt]="'Cover of ' + item.bookTitle" loading="lazy">
                } @else {
                  <div class="book-cover-thumb cover-fallback" aria-hidden="true">
                    {{ item.bookTitle.slice(0, 1) }}
                  </div>
                }
              </div>

              <div class="request-main-col">
                <div class="book-title-row">
                  <h2 class="book-title-text">{{ item.bookTitle }}</h2>
                  <span
                    class="status-pill"
                    [class.status-pending]="item.status === 'PENDING'"
                    [class.status-approved]="item.status === 'APPROVED'"
                    [class.status-issued]="item.status === 'ISSUED'"
                    [class.status-rejected]="item.status === 'REJECTED'"
                  >
                    <span class="status-dot"></span>
                    {{ item.status }}
                  </span>
                </div>

                <div class="requester-info-row">
                  <span class="requester-name">
                    <strong>{{ item.borrowerDisplayName || item.borrowerInstitutionalId || item.borrowerEmail.split('@')[0] }}</strong>
                  </span>
                  <span class="requester-email muted">{{ item.borrowerEmail }}</span>
                  <span class="badge badge-role">{{ item.borrowerRole }}</span>
                  <span class="dot-separator">&middot;</span>
                  <span class="request-time muted">
                    Requested <time [attr.datetime]="item.submittedAt">{{ item.submittedAt | date:'d MMM y, h:mm a' }}</time>
                  </span>
                </div>
              </div>
            </div>

            @if (item.status === 'PENDING') {
              <div class="decision-actions">
                <div class="note-input-field">
                  <label [for]="'reason-' + item.id">Decision note (optional)</label>
                  <input
                    [id]="'reason-' + item.id"
                    [ngModel]="reasons()[item.id] || ''"
                    (ngModelChange)="setReason(item.id, $event)"
                    placeholder="Add an optional comment for the borrower..."
                    maxlength="500"
                  >
                </div>
                <div class="decision-buttons">
                  <button
                    class="button button-primary btn-approve"
                    type="button"
                    (click)="decide(item, 'APPROVE')"
                    [disabled]="pending()"
                  >
                    Approve
                  </button>
                  <button
                    class="button button-danger-outline btn-reject"
                    type="button"
                    (click)="decide(item, 'REJECT')"
                    [disabled]="pending()"
                  >
                    Reject
                  </button>
                </div>
              </div>
            }

            @if (item.status === 'APPROVED') {
              <div class="issue-actions">
                <div class="copy-select-field">
                  <label [for]="'copy-' + item.id">Available physical copy</label>
                  <select
                    [id]="'copy-' + item.id"
                    [ngModel]="selectedCopies()[item.id] || ''"
                    (ngModelChange)="setCopy(item.id, $event)"
                  >
                    <option value="">Choose a copy</option>
                    @for (copy of availableCopies(item); track copy.id) {
                      <option [value]="copy.id">{{ copy.copyIdentifier }} @if (copy.location) { &middot; {{ copy.location }} }</option>
                    }
                  </select>
                </div>
                @if (!availableCopies(item).length) {
                  <p class="field-hint text-warning">No available copies are currently listed.</p>
                }
                <button
                  class="button button-primary btn-issue"
                  type="button"
                  (click)="issue(item)"
                  [disabled]="pending() || !selectedCopies()[item.id]"
                >
                  Record Issue
                </button>
              </div>
            }

            @if (item.decisionReason) {
              <p class="decision-note-box">
                <strong>Decision note:</strong> {{ item.decisionReason }}
              </p>
            }

            <details class="request-history-accordion">
              <summary>History ({{ item.history.length }})</summary>
              <ol class="history-events-list">
                @for (event of item.history; track event.occurredAt + event.eventType) {
                  <li>
                    <strong>{{ event.eventType }}</strong> &middot; {{ event.actorEmail }} &middot;
                    <time [attr.datetime]="event.occurredAt">{{ event.occurredAt | date:'medium' }}</time>
                    @if (event.reason) {
                      <span> &mdash; {{ event.reason }}</span>
                    }
                  </li>
                }
              </ol>
            </details>
          </article>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
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

    .page-header {
      margin-bottom: 1.25rem;
    }
    .page-title {
      font-family: var(--type-page-title-family);
      font-size: var(--type-page-title-size);
      font-weight: var(--type-page-title-weight);
      color: var(--type-page-title-color);
      margin: 0 0 0.25rem;
      line-height: var(--type-page-title-line);
      letter-spacing: var(--letter-spacing-tight);
    }
    .page-subtitle {
      font-size: var(--type-page-subtitle-size);
      color: var(--type-page-subtitle-color);
      margin: 0;
    }

    /* Filter Tabs Bar matching Screenshot 4 */
    .filter-tabs-bar {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid var(--color-line-200);
      margin-bottom: 1.25rem;
      overflow-x: auto;
    }
    .tab-btn {
      padding: 0.65rem 1.25rem;
      font-size: 0.88rem;
      font-weight: 600;
      background: transparent;
      border: 0;
      border-bottom: 2px solid transparent;
      color: var(--color-charcoal-600);
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .tab-btn:hover {
      color: #003D30;
    }
    .tab-btn.active {
      color: #003D30;
      border-bottom-color: #003D30;
    }

    /* Requests Toolbar */
    .requests-toolbar {
      display: grid;
      grid-template-columns: 1fr 180px auto;
      gap: 0.85rem;
      padding: 0.85rem 1.15rem;
      margin-bottom: 1.25rem;
      align-items: center;
      background: #ffffff;
      border: 1px solid var(--color-line-200);
      border-radius: 10px;
    }
    .search-input-wrap {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      background: #F9FBF9;
      border: 1px solid var(--color-line-200);
      border-radius: 7px;
      padding: 0.45rem 0.85rem;
    }
    .search-icon {
      width: 1.1rem;
      height: 1.1rem;
      color: var(--color-charcoal-400);
      flex-shrink: 0;
    }
    .search-input-wrap input {
      border: 0;
      background: transparent;
      outline: none;
      font-size: 0.85rem;
      width: 100%;
      color: var(--color-charcoal-900);
    }
    .select-field select {
      width: 100%;
      padding: 0.55rem 0.85rem;
      border: 1px solid var(--color-line-200);
      border-radius: 7px;
      background: #ffffff;
      font-size: 0.85rem;
      color: var(--color-charcoal-800);
      outline: none;
    }
    .filter-submit-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.55rem 1.15rem;
      font-size: var(--type-button-size);
      font-weight: var(--type-button-weight);
      background: var(--sidebar-bg);
      color: #ffffff;
      border: 0;
      border-radius: var(--radius-control);
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .filter-submit-btn:hover {
      background: #002B22;
    }
    .btn-icon {
      width: 1rem;
      height: 1rem;
    }

    /* Empty state */
    .empty-state {
      padding: 4rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #ffffff;
      border: 1px solid var(--color-line-200);
      border-radius: 10px;
    }
    .empty-icon-circle {
      width: 4rem;
      height: 4rem;
      border-radius: 50%;
      background: #EAF2EF;
      color: #003D30;
      display: grid;
      place-items: center;
      margin-bottom: 1.15rem;
    }
    .empty-icon-circle svg {
      width: 2rem;
      height: 2rem;
    }
    .empty-state h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-charcoal-900);
      margin: 0 0 0.35rem;
    }
    .empty-state p {
      font-size: 0.88rem;
      color: var(--color-charcoal-500);
      margin: 0 0 1.5rem;
    }

    /* Request list */
    .request-list {
      display: grid;
      gap: 1rem;
    }
    .request-card {
      padding: 1.25rem 1.4rem;
      background: #ffffff;
      border: 1px solid var(--color-line-200);
      border-radius: 10px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }
    .request-head {
      display: flex;
      gap: 1.15rem;
      align-items: center;
    }
    .book-cover-thumb {
      width: 2.8rem;
      height: 3.8rem;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid var(--color-line-200);
      flex-shrink: 0;
    }
    .cover-fallback {
      background: linear-gradient(135deg, #002B22 0%, #003D30 100%);
      color: #ffffff;
      display: grid;
      place-items: center;
      font-size: 0.9rem;
      font-weight: 700;
    }
    .request-main-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .book-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .book-title-text {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--color-charcoal-900);
      margin: 0;
    }
    .requester-info-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.82rem;
      flex-wrap: wrap;
    }
    .requester-name {
      color: var(--color-charcoal-900);
    }
    .badge-role {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      background: #EEF2FB;
      color: #2563EB;
    }

    /* Status Pills */
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: 16px;
      font-size: 0.74rem;
      font-weight: 600;
    }
    .status-dot {
      width: 0.45rem;
      height: 0.45rem;
      border-radius: 50%;
    }
    .status-pending {
      background: #FEF3C7;
      color: #D97706;
    }
    .status-pending .status-dot {
      background: #D97706;
    }
    .status-approved, .status-issued {
      background: #EAF2EF;
      color: #003D30;
      border: 1px solid #C2D6CF;
    }
    .status-approved .status-dot, .status-issued .status-dot {
      background: #003D30;
    }
    .status-rejected {
      background: #FDF0EE;
      color: #DC2626;
    }
    .status-rejected .status-dot {
      background: #DC2626;
    }

    /* Decision Actions */
    .decision-actions {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 1rem;
      margin-top: 1rem;
      padding-top: 0.85rem;
      border-top: 1px solid var(--color-line-100);
    }
    .note-input-field {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .note-input-field label, .copy-select-field label {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--color-charcoal-600);
    }
    .note-input-field input, .copy-select-field select {
      padding: 0.45rem 0.75rem;
      border: 1px solid var(--color-line-200);
      border-radius: 6px;
      font-size: 0.82rem;
      outline: none;
    }
    .decision-buttons {
      display: flex;
      gap: 0.5rem;
    }
    .btn-approve {
      padding: 0.45rem 1rem;
      font-size: 0.82rem;
      font-weight: 600;
      background: #003D30;
      color: #ffffff;
      border: 0;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-approve:hover {
      background: #002B22;
    }
    .button-danger-outline {
      padding: 0.45rem 1rem;
      font-size: 0.82rem;
      font-weight: 600;
      background: transparent;
      color: #DC2626;
      border: 1px solid #FCA5A5;
      border-radius: 6px;
      cursor: pointer;
    }
    .button-danger-outline:hover {
      background: #FDF0EE;
    }

    /* Issue Actions */
    .issue-actions {
      display: flex;
      align-items: flex-end;
      gap: 1rem;
      margin-top: 1rem;
      padding-top: 0.85rem;
      border-top: 1px solid var(--color-line-100);
    }
    .copy-select-field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      flex: 1;
      max-width: 24rem;
    }
    .btn-issue {
      padding: 0.45rem 1.15rem;
      font-size: 0.82rem;
      font-weight: 600;
      background: #003D30;
      color: #ffffff;
      border: 0;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-issue:hover {
      background: #002B22;
    }

    .decision-note-box {
      margin: 0.75rem 0 0;
      padding: 0.55rem 0.85rem;
      background: #FAF9F6;
      border-radius: 6px;
      font-size: 0.82rem;
      color: var(--color-charcoal-700);
    }

    .request-history-accordion {
      margin-top: 0.85rem;
      font-size: 0.82rem;
    }
    .request-history-accordion summary {
      cursor: pointer;
      font-weight: 600;
      color: #003D30;
    }
    .history-events-list {
      margin: 0.5rem 0 0;
      padding-left: 1.25rem;
      color: var(--color-charcoal-600);
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .loading-state {
      padding: 3rem;
      text-align: center;
      color: var(--color-charcoal-500);
    }
  `]
})
export class LibrarianRequestsComponent {
  private readonly service = inject(BorrowingService);
  private readonly catalogue = inject(CatalogueService);

  readonly items = signal<BorrowRequestRecord[]>([]);
  readonly loading = signal(true);
  readonly pending = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly filter = signal('PENDING');
  readonly reasons = signal<Record<string, string>>({});
  readonly selectedCopies = signal<Record<string, string>>({});
  readonly copyMap = signal<Record<string, BookCopy[]>>({});

  searchQuery = '';
  roleFilter = '';

  constructor() {
    this.load();
  }

  setFilter(status: string) {
    this.filter.set(status);
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.service
      .queue(this.filter())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: p => {
          this.items.set(p.content);
          for (const request of p.content.filter(x => x.status === 'APPROVED')) {
            this.loadCopies(request);
          }
        },
        error: () => this.error.set('Borrow requests could not be loaded.')
      });
  }

  countForStatus(status: string): number {
    return this.items().filter(item => item.status === status).length;
  }

  filteredItems(): BorrowRequestRecord[] {
    return this.items().filter(item => {
      if (this.roleFilter && item.borrowerRole !== this.roleFilter) return false;
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase();
        const titleMatch = item.bookTitle.toLowerCase().includes(query);
        const emailMatch = item.borrowerEmail.toLowerCase().includes(query);
        const idMatch = (item.borrowerInstitutionalId || '').toLowerCase().includes(query);
        if (!titleMatch && !emailMatch && !idMatch) return false;
      }
      return true;
    });
  }

  loadCopies(item: BorrowRequestRecord) {
    this.catalogue.copies(item.bookId).subscribe({
      next: copies => this.copyMap.update(all => ({ ...all, [item.id]: copies })),
      error: () => this.error.set('Available copies could not be loaded for an approved request.')
    });
  }

  availableCopies(item: BorrowRequestRecord) {
    return (this.copyMap()[item.id] || []).filter(c => c.status === 'AVAILABLE');
  }

  setReason(id: string, value: string) {
    this.reasons.update(all => ({ ...all, [id]: value }));
  }

  setCopy(id: string, value: string) {
    this.selectedCopies.update(all => ({ ...all, [id]: value }));
  }

  decide(item: BorrowRequestRecord, decision: 'APPROVE' | 'REJECT') {
    if (this.pending()) return;
    this.pending.set(true);
    this.error.set('');
    this.notice.set('');
    this.service
      .decide(item.id, decision, this.reasons()[item.id]?.trim() || null)
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe({
        next: () => {
          this.notice.set(
            decision === 'APPROVE'
              ? 'Request approved. Issue the physical copy in a separate step.'
              : 'Request rejected.'
          );
          this.load();
        },
        error: e =>
          this.error.set(
            e.error?.message ||
            (e.status === 409
              ? 'This request has already been reviewed. Refresh the queue.'
              : 'The request decision could not be recorded.')
          )
      });
  }

  issue(item: BorrowRequestRecord) {
    const copyId = this.selectedCopies()[item.id];
    if (!copyId || this.pending()) return;
    this.pending.set(true);
    this.error.set('');
    this.notice.set('');
    this.service
      .issue(item.id, copyId)
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe({
        next: () => {
          this.notice.set('Physical copy issue recorded.');
          this.load();
        },
        error: e =>
          this.error.set(
            e.error?.message ||
            (e.status === 409
              ? 'That copy is no longer available, or the request was already issued. Refresh the list.'
              : 'The issue could not be recorded.')
          )
      });
  }
}

@Component({
  selector: 'app-circulation-desk',
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Circulation Desk</h1>
        <p class="page-subtitle">Record physical returns and maintain the library holiday calendar used for due dates</p>
      </div>
    </header>

    @if (error()) {
      <p class="alert alert-error" role="alert">{{ error() }}</p>
    }
    @if (notice()) {
      <p class="alert alert-success" role="status">{{ notice() }}</p>
    }

    <!-- Active Loans Section -->
    <section class="desk-section" aria-labelledby="active-title">
      <div class="section-header">
        <h2 id="active-title" class="section-title">Active Loans</h2>
        <label class="check-filter">
          <input type="checkbox" [ngModel]="overdueOnly()" (ngModelChange)="overdueOnly.set($event); loadLoans()">
          Show Overdue Only
        </label>
      </div>

      @if (loanLoading()) {
        <div class="loading-state surface-card" role="status">Loading active loans…</div>
      } @else if (!loans().length) {
        <div class="empty-state surface-card">
          <h3>No active loans in this view</h3>
          <p>Issued physical copies will appear here.</p>
        </div>
      } @else {
        <div class="loan-list">
          @for (loan of loans(); track loan.id) {
            <article class="surface-card loan-card">
              <div class="loan-main">
                <div class="cover-col">
                  @if (loan.coverImageUrl) {
                    <img class="book-cover-thumb" [src]="loan.coverImageUrl" [alt]="'Cover of ' + loan.bookTitle" loading="lazy">
                  } @else {
                    <div class="book-cover-thumb cover-fallback" aria-hidden="true">
                      {{ loan.bookTitle.slice(0, 1) }}
                    </div>
                  }
                </div>
                <div class="loan-info-col">
                  <h3 class="loan-title">{{ loan.bookTitle }}</h3>
                  <p class="loan-sub">
                    Copy <strong>{{ loan.copyIdentifier }}</strong> &middot; {{ loan.borrowerDisplayName ? (loan.borrowerDisplayName + ' (' + loan.borrowerEmail + ')') : loan.borrowerEmail }}
                  </p>
                  <p class="loan-due muted">
                    Due: <time [attr.datetime]="loan.dueDate">{{ loan.dueDate | date:'mediumDate' }}</time>
                  </p>
                </div>
                <div class="loan-badge-col">
                  <span
                    class="status-pill"
                    [class.status-overdue]="loan.overdue"
                    [class.status-onloan]="!loan.overdue"
                  >
                    <span class="status-dot"></span>
                    {{ loan.overdue ? 'Overdue' : 'On loan' }}
                  </span>
                </div>
              </div>

              <!-- Return Actions -->
              <div class="return-actions">
                <div class="field">
                  <label [for]="'condition-' + loan.id">Return Condition</label>
                  <select
                    [id]="'condition-' + loan.id"
                    [ngModel]="conditions()[loan.id] || 'GOOD'"
                    (ngModelChange)="setCondition(loan.id, $event)"
                  >
                    <option value="GOOD">Good &middot; return to available</option>
                    <option value="DAMAGED">Damaged &middot; quarantine copy</option>
                    <option value="LOST">Lost case &middot; keep unavailable</option>
                  </select>
                </div>

                <div class="field field-wide">
                  <label [for]="'note-' + loan.id">
                    Case Note @if (conditionNeedsNote(loan.id)) { <span class="required-mark">*</span> }
                  </label>
                  <input
                    [id]="'note-' + loan.id"
                    maxlength="1000"
                    [required]="conditionNeedsNote(loan.id)"
                    [attr.aria-required]="conditionNeedsNote(loan.id)"
                    [ngModel]="notes()[loan.id] || ''"
                    (ngModelChange)="setNote(loan.id, $event)"
                    [placeholder]="conditionNeedsNote(loan.id) ? 'Record observed damage or lost report' : 'Optional return note'"
                  >
                </div>

                <button
                  class="button button-primary btn-record-return"
                  type="button"
                  (click)="recordReturn(loan)"
                  [disabled]="pending() || !canReturn(loan.id)"
                >
                  {{ pendingId() === loan.id ? 'Recording…' : 'Record Return' }}
                </button>
              </div>
            </article>
          }
        </div>
      }
    </section>

    <!-- Library Holiday Calendar Section -->
    <section class="desk-section calendar-section" aria-labelledby="calendar-title">
      <div class="section-header">
        <div>
          <h2 id="calendar-title" class="section-title">Library Holiday Calendar</h2>
          <p class="field-hint">Only dates entered here shift due dates. Weekends are not automatically treated as holidays.</p>
        </div>
      </div>

      <form class="holiday-form surface-card" (ngSubmit)="addHoliday()">
        <div class="field">
          <label for="holiday-date">Holiday Date</label>
          <input id="holiday-date" type="date" [(ngModel)]="holidayDate" name="holidayDate" required>
        </div>
        <div class="field field-wide">
          <label for="holiday-name">Holiday Name</label>
          <input id="holiday-name" [(ngModel)]="holidayName" name="holidayName" placeholder="e.g. University Founders Day" maxlength="120" required>
        </div>
        <button class="button button-primary btn-add-holiday" type="submit" [disabled]="pending() || !holidayDate || !holidayName.trim()">
          + Add Holiday
        </button>
      </form>

      @if (holidayLoading()) {
        <div class="loading-state surface-card" role="status">Loading configured holidays…</div>
      } @else if (!holidays().length) {
        <div class="empty-state surface-card">
          <h3>No holidays configured</h3>
          <p>Due dates will use standard day calculations until calendar dates are maintained.</p>
        </div>
      } @else {
        <div class="table-card surface-card">
          <table class="data-table">
            <caption class="sr-only">Configured library holidays</caption>
            <thead>
              <tr>
                <th scope="col" style="width: 25%;">DATE</th>
                <th scope="col" style="width: 35%;">HOLIDAY</th>
                <th scope="col" style="width: 25%;">ADDED BY</th>
                <th scope="col" style="width: 15%; text-align: right;">ACTION</th>
              </tr>
            </thead>
            <tbody>
              @for (day of holidays(); track day.id) {
                <tr>
                  <td>
                    <strong><time [attr.datetime]="day.holidayDate">{{ day.holidayDate | date:'mediumDate' }}</time></strong>
                  </td>
                  <td>{{ day.name }}</td>
                  <td class="muted">{{ day.createdByEmail }}</td>
                  <td style="text-align: right;">
                    <button class="button button-quiet remove-holiday-btn" type="button" (click)="deleteHoliday(day)" [disabled]="pending()">
                      Remove date
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: [`
    :host {
      display: block;
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

    .page-header {
      margin-bottom: 1.5rem;
    }
    .page-title {
      font-family: var(--font-serif);
      font-size: 1.75rem;
      font-weight: 400;
      color: #17382B;
      margin: 0 0 0.25rem;
      line-height: 1.2;
    }
    .page-subtitle {
      font-size: 0.88rem;
      color: var(--color-charcoal-500);
      margin: 0;
    }

    .desk-section {
      margin-bottom: 2.25rem;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 0.85rem;
    }
    .section-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-charcoal-900);
      margin: 0;
    }
    .check-filter {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--color-charcoal-700);
      cursor: pointer;
    }

    /* Loan Cards */
    .loan-list {
      display: grid;
      gap: 1rem;
    }
    .loan-card {
      padding: 1.25rem 1.4rem;
      background: #ffffff;
      border: 1px solid var(--color-line-200);
      border-radius: 10px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }
    .loan-main {
      display: flex;
      align-items: center;
      gap: 1.15rem;
    }
    .book-cover-thumb {
      width: 2.8rem;
      height: 3.8rem;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid var(--color-line-200);
      flex-shrink: 0;
    }
    .cover-fallback {
      background: linear-gradient(135deg, #002B22 0%, #003D30 100%);
      color: #ffffff;
      display: grid;
      place-items: center;
      font-size: 0.9rem;
      font-weight: 700;
    }
    .loan-info-col {
      flex: 1;
    }
    .loan-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--color-charcoal-900);
      margin: 0 0 0.25rem;
    }
    .loan-sub {
      font-size: 0.82rem;
      color: var(--color-charcoal-600);
      margin: 0 0 0.2rem;
    }
    .loan-due {
      font-size: 0.8rem;
      margin: 0;
    }

    /* Status Pills */
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: 16px;
      font-size: 0.74rem;
      font-weight: 600;
    }
    .status-dot {
      width: 0.45rem;
      height: 0.45rem;
      border-radius: 50%;
    }
    .status-onloan {
      background: #EAF2EF;
      color: #003D30;
      border: 1px solid #C2D6CF;
    }
    .status-onloan .status-dot {
      background: #003D30;
    }
    .status-overdue {
      background: #FEF3C7;
      color: #D97706;
    }
    .status-overdue .status-dot {
      background: #D97706;
    }

    /* Return Actions */
    .return-actions {
      display: grid;
      grid-template-columns: 220px 1fr auto;
      align-items: flex-end;
      gap: 0.85rem;
      margin-top: 1rem;
      padding-top: 0.85rem;
      border-top: 1px solid var(--color-line-100);
    }
    .field label {
      display: block;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--color-charcoal-600);
      margin-bottom: 0.3rem;
    }
    .field select, .field input {
      width: 100%;
      padding: 0.45rem 0.75rem;
      border: 1px solid var(--color-line-200);
      border-radius: 6px;
      font-size: 0.82rem;
      outline: none;
    }
    .required-mark {
      color: #DC2626;
    }
    .btn-record-return {
      padding: 0.5rem 1.15rem;
      font-size: 0.82rem;
      font-weight: 600;
      background: #003D30;
      color: #ffffff;
      border: 0;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-record-return:hover:not(:disabled) {
      background: #002B22;
    }

    /* Holiday Form */
    .holiday-form {
      display: grid;
      grid-template-columns: 200px 1fr auto;
      align-items: flex-end;
      gap: 0.85rem;
      padding: 1rem 1.25rem;
      background: #ffffff;
      border: 1px solid var(--color-line-200);
      border-radius: 10px;
      margin-bottom: 1.25rem;
    }
    .btn-add-holiday {
      padding: 0.5rem 1.15rem;
      font-size: 0.82rem;
      font-weight: 600;
      background: #003D30;
      color: #ffffff;
      border: 0;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-add-holiday:hover:not(:disabled) {
      background: #002B22;
    }

    /* Table Card */
    .table-card {
      background: #ffffff;
      border: 1px solid var(--color-line-200);
      border-radius: 10px;
      overflow: hidden;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .data-table th {
      padding: 0.75rem 1.15rem;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: var(--color-charcoal-500);
      background: #FAF9F6;
      border-bottom: 1px solid var(--color-line-200);
    }
    .data-table td {
      padding: 0.85rem 1.15rem;
      border-bottom: 1px solid var(--color-line-100);
      font-size: 0.85rem;
    }
    .remove-holiday-btn {
      color: #DC2626;
      background: transparent;
      border: 0;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: underline;
    }

    .empty-state {
      padding: 3rem 1.5rem;
      text-align: center;
      background: #ffffff;
      border: 1px solid var(--color-line-200);
      border-radius: 10px;
    }
    .empty-state h3 {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--color-charcoal-900);
      margin: 0 0 0.35rem;
    }
    .empty-state p {
      font-size: 0.85rem;
      color: var(--color-charcoal-500);
      margin: 0;
    }

    .loading-state {
      padding: 3rem;
      text-align: center;
      color: var(--color-charcoal-500);
      background: #ffffff;
      border: 1px solid var(--color-line-200);
      border-radius: 10px;
    }
  `]
})
export class CirculationDeskComponent {
  private readonly service = inject(BorrowingService);

  readonly loans = signal<LoanRecord[]>([]);
  readonly holidays = signal<Holiday[]>([]);
  readonly loanLoading = signal(true);
  readonly holidayLoading = signal(true);
  readonly overdueOnly = signal(false);
  readonly pending = signal(false);
  readonly pendingId = signal('');
  readonly error = signal('');
  readonly notice = signal('');
  readonly conditions = signal<Record<string, ReturnCondition>>({});
  readonly notes = signal<Record<string, string>>({});

  holidayDate = '';
  holidayName = '';

  constructor() {
    this.loadLoans();
    this.loadHolidays();
  }

  loadLoans() {
    this.loanLoading.set(true);
    this.service
      .librarianLoans(this.overdueOnly())
      .pipe(finalize(() => this.loanLoading.set(false)))
      .subscribe({
        next: p => this.loans.set(p.content),
        error: () => this.error.set('Active loans could not be loaded.')
      });
  }

  loadHolidays() {
    this.holidayLoading.set(true);
    this.service
      .holidays()
      .pipe(finalize(() => this.holidayLoading.set(false)))
      .subscribe({
        next: x => this.holidays.set(x),
        error: () => this.error.set('The configured holiday calendar could not be loaded.')
      });
  }

  setCondition(id: string, value: ReturnCondition) {
    this.conditions.update(all => ({ ...all, [id]: value }));
  }

  setNote(id: string, value: string) {
    this.notes.update(all => ({ ...all, [id]: value }));
  }

  conditionNeedsNote(id: string) {
    return (this.conditions()[id] || 'GOOD') !== 'GOOD';
  }

  canReturn(id: string) {
    return !this.conditionNeedsNote(id) || !!this.notes()[id]?.trim();
  }

  recordReturn(loan: LoanRecord) {
    if (this.pending() || !this.canReturn(loan.id)) return;
    this.pendingId.set(loan.id);
    this.pending.set(true);
    this.error.set('');
    this.notice.set('');
    this.service
      .returnLoan(loan.id, this.conditions()[loan.id] || 'GOOD', this.notes()[loan.id]?.trim() || null)
      .pipe(
        finalize(() => {
          this.pending.set(false);
          this.pendingId.set('');
        })
      )
      .subscribe({
        next: () => {
          this.notice.set('Return case recorded. Copy availability now reflects the recorded condition.');
          this.loadLoans();
        },
        error: e =>
          this.error.set(
            e.status === 409
              ? 'This loan was already closed. Refresh the active loans.'
              : 'The return could not be recorded.'
          )
      });
  }

  addHoliday() {
    if (!this.holidayDate || !this.holidayName.trim() || this.pending()) return;
    this.pending.set(true);
    this.error.set('');
    this.notice.set('');
    this.service
      .addHoliday(this.holidayDate, this.holidayName.trim())
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe({
        next: () => {
          this.notice.set('Holiday date added to the library calendar.');
          this.holidayDate = '';
          this.holidayName = '';
          this.loadHolidays();
        },
        error: e =>
          this.error.set(
            e.status === 409
              ? 'A holiday is already configured for that date.'
              : 'The holiday date could not be saved.'
          )
      });
  }

  deleteHoliday(day: Holiday) {
    if (this.pending()) return;
    this.pending.set(true);
    this.error.set('');
    this.notice.set('');
    this.service
      .deleteHoliday(day.id)
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe({
        next: () => {
          this.notice.set('Holiday date removed.');
          this.loadHolidays();
        },
        error: () => this.error.set('The holiday date could not be removed.')
      });
  }
}
