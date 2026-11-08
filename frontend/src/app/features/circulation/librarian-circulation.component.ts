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
      border: 0 !important;
      background: transparent !important;
      outline: none !important;
      box-shadow: none !important;
      padding: 0 !important;
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

export { CirculationDeskComponent } from './circulation-desk.component';
