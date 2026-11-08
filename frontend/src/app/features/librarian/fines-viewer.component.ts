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

export type FineStatusFilter = 'ALL' | 'UNPAID' | 'PAID' | 'OVERDUE';
export type MemberRoleFilter = 'ALL' | 'STUDENT' | 'FACULTY';

@Component({
  selector: 'app-fines-viewer',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  template: `
    <!-- Page Header matching Mockup Style -->
    <header class="page-heading">
      <div>
        <p class="eyebrow">LIBRARIAN WORKSPACE · CIRCULATION DESK</p>
        <h1 class="page-title">Fine Management</h1>
        <p class="muted">Monitor overdue book assessments, review institutional policy, and record full fine settlements.</p>
      </div>
      <div class="header-actions">
        <button class="button button-secondary" type="button" (click)="recalculate()" [disabled]="recalculating() || loading()">
          {{ recalculating() ? 'Recalculating…' : '⚡ Recalculate Assessments' }}
        </button>
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

    <!-- 4 Summary Cards matching Mockup Visual Language -->
    <section class="summary-cards-grid" aria-labelledby="summary-heading">
      <h2 id="summary-heading" class="sr-only">Fines Overview</h2>

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
          <p class="stat-value text-danger">₹{{ (summary()?.totalOutstanding ?? 0).toFixed(2) }}</p>
          <p class="stat-sub muted">{{ summary()?.unpaidFines ?? unpaidFinesCount() }} unpaid fine(s)</p>
        </div>
      </article>

      <!-- Card 2: Total Collected (Green Indicator) -->
      <article class="stat-card stat-card-paid surface-card">
        <div class="stat-icon-wrap icon-paid" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="stat-svg">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
          </svg>
        </div>
        <div class="stat-content">
          <p class="stat-label">Total Collected</p>
          <p class="stat-value text-success">₹{{ (summary()?.totalCollected ?? 0).toFixed(2) }}</p>
          <p class="stat-sub muted">{{ summary()?.paidFines ?? paidFinesCount() }} settled fine(s)</p>
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
          <p class="stat-value text-charcoal">{{ summary()?.totalFines ?? fines().length }}</p>
          <p class="stat-sub muted">All-time circulation items</p>
        </div>
      </article>

      <!-- Card 4: Currently Overdue Loans (Amber Indicator) -->
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
          <p class="stat-label">Currently Overdue Loans</p>
          <p class="stat-value" [class.text-danger]="(summary()?.currentlyOverdueLoans ?? overdueLoansCount()) > 0" [class.text-charcoal]="(summary()?.currentlyOverdueLoans ?? overdueLoansCount()) === 0">
            {{ summary()?.currentlyOverdueLoans ?? overdueLoansCount() }}
          </p>
          <p class="stat-sub muted">Active overdue loans</p>
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
            <span class="invariant-item">Daily overdue fine: ₹{{ data.dailyFineRate.toFixed(2) }} per day</span>
            <span class="invariant-item">Maximum fine per book: ₹{{ data.maximumFinePerBook.toFixed(2) }}</span>
            <span class="invariant-item">Grace period: {{ data.gracePeriodDays }} day(s)</span>
            <span class="invariant-item">Manual full payment at the circulation desk; partial payments are not accepted.</span>
            <span class="invariant-item">Current policy applies to new loans. Existing loans keep their issue-time terms.</span>
          </div>
        </div>
      </section>
    }

    <!-- Search & Filter Controls -->
    <section class="controls-card surface-card">
      <div class="search-input-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon" aria-hidden="true">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="search"
          class="search-input"
          placeholder="Search by member name, email, ID, book title, or barcode…"
          [ngModel]="searchQuery()"
          (ngModelChange)="onSearchChange($event)"
          aria-label="Search fines"
        />
        @if (searchQuery()) {
          <button type="button" class="clear-search-btn" (click)="clearSearch()" aria-label="Clear search">✕</button>
        }
      </div>

      <div class="filters-row">
        <!-- Status Filter Pills -->
        <div class="filter-pills" role="radiogroup" aria-label="Filter by status">
          <button
            type="button"
            class="filter-pill"
            [class.active]="statusFilter() === 'ALL'"
            (click)="setStatusFilter('ALL')">
            All ({{ fines().length }})
          </button>
          <button
            type="button"
            class="filter-pill"
            [class.active]="statusFilter() === 'UNPAID'"
            (click)="setStatusFilter('UNPAID')">
            Unpaid ({{ unpaidFinesCount() }})
          </button>
          <button
            type="button"
            class="filter-pill"
            [class.active]="statusFilter() === 'PAID'"
            (click)="setStatusFilter('PAID')">
            Paid ({{ paidFinesCount() }})
          </button>
          <button
            type="button"
            class="filter-pill"
            [class.active]="statusFilter() === 'OVERDUE'"
            (click)="setStatusFilter('OVERDUE')">
            Overdue ({{ overdueFinesCount() }})
          </button>
        </div>

        <!-- Role Filter Dropdown -->
        <div class="role-filter-wrap">
          <label for="role-filter-select" class="role-filter-label">Borrower Role:</label>
          <select
            id="role-filter-select"
            class="role-select"
            [ngModel]="roleFilter()"
            (ngModelChange)="setRoleFilter($event)">
            <option value="ALL">All Roles</option>
            <option value="STUDENT">Student Only</option>
            <option value="FACULTY">Faculty Only</option>
          </select>
        </div>
      </div>
    </section>

    <!-- Fines Ledger Table -->
    <section class="fines-ledger-section surface-card" aria-labelledby="ledger-heading">
      <div class="section-header-split">
        <div>
          <h2 id="ledger-heading">Fine Assessment Ledger</h2>
          <p class="section-sub muted">Administrative ledger of circulation assessments, member roles, and payment status.</p>
        </div>
        <div class="table-meta-badge">
          Showing {{ paginatedFines().length }} of {{ filteredFines().length }} matching records
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state" role="status">Retrieving fine records and audit ledger…</div>
      } @else if (!filteredFines().length) {
        <div class="empty-state empty-good">
          <h3>✓ No Matching Fine Records</h3>
          <p>No fines matched the current filter criteria or search query.</p>
          @if (searchQuery() || statusFilter() !== 'ALL' || roleFilter() !== 'ALL') {
            <button type="button" class="button button-secondary" (click)="resetFilters()">
              Reset all filters
            </button>
          }
        </div>
      } @else {
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col">Role</th>
                <th scope="col" style="width: 48px;">Cover</th>
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
              @for (fine of paginatedFines(); track fine.id) {
                <tr>
                  <td>
                    <strong>{{ fine.borrowerName }}</strong>
                    <br><small class="muted">{{ fine.borrowerEmail }}</small>
                    @if (fine.borrowerInstitutionalId) {
                      <br><small class="muted">ID: {{ fine.borrowerInstitutionalId }}</small>
                    }
                  </td>
                  <td>
                    <span class="role-badge" [class.role-student]="(fine.borrowerRole || '').toUpperCase() === 'STUDENT'" [class.role-faculty]="(fine.borrowerRole || '').toUpperCase() === 'FACULTY'">
                      {{ fine.borrowerRole || 'MEMBER' }}
                    </span>
                  </td>
                  <td>
                    <div class="cover-thumb-sm">
                      @if (fine.bookCoverImageUrl) {
                        <img [src]="fine.bookCoverImageUrl" [alt]="fine.bookTitle" class="cover-img" loading="lazy" />
                      } @else {
                        <div class="cover-fallback-sm">
                          <span>{{ fine.bookTitle.slice(0, 1) }}</span>
                        </div>
                      }
                    </div>
                  </td>
                  <td>
                    <span class="book-title-cell" [title]="fine.bookTitle">{{ fine.bookTitle }}</span>
                    @if (fine.bookIsbn) {
                      <br><small class="muted">ISBN: {{ fine.bookIsbn }}</small>
                    }
                  </td>
                  <td><code>{{ fine.copyIdentifier }}</code></td>
                  <td>
                    <time [attr.datetime]="fine.dueDate">{{ fine.dueDate | date:'mediumDate' }}</time>
                    @if (fine.renewed && fine.originalDueDate && fine.originalDueDate !== fine.dueDate) {
                      <br><small class="muted">Renewed (Orig: {{ fine.originalDueDate | date:'mediumDate' }})</small>
                    }
                  </td>
                  <td>
                    <span class="days-badge" [class.badge-danger]="fine.loanOverdue">{{ fine.overdueDays }} day(s)</span>
                    @if (fine.renewed && !fine.loanOverdue) {
                      <br><small class="muted">(Prior to renewal)</small>
                    } @else if (fine.loanStatus === 'RETURNED') {
                      <br><small class="muted">(Returned)</small>
                    } @else if (fine.loanOverdue) {
                      <br><small class="text-danger">(Overdue)</small>
                    }
                  </td>
                  <td>
                    <strong [class.text-danger]="fine.status === 'UNPAID'" class="fine-amount">
                      ₹{{ fine.fineAmount.toFixed(2) }}
                    </strong>
                  </td>
                  <td>
                    <span class="status-pill" [class.pill-unpaid]="fine.status === 'UNPAID'" [class.pill-paid]="fine.status === 'PAID'">
                      <span class="pill-dot"></span>
                      <span>{{ fine.status === 'UNPAID' ? 'Unpaid' : 'Paid' }}</span>
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <div class="actions-cell">
                      <button
                        type="button"
                        class="btn-action-pill"
                        (click)="openDetailsDrawer(fine)"
                        title="View complete assessment breakdown">
                        <span>View Details</span>
                        <span class="arrow-glyph">&gt;</span>
                      </button>
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
                          Receipt
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        @if (totalPages() > 1) {
          <div class="pagination-bar">
            <span class="pagination-info muted">
              Page {{ currentPage() }} of {{ totalPages() }} ({{ filteredFines().length }} total records)
            </span>
            <div class="pagination-actions">
              <button
                type="button"
                class="button button-secondary button-sm"
                [disabled]="currentPage() <= 1"
                (click)="prevPage()">
                ‹ Previous
              </button>
              <button
                type="button"
                class="button button-secondary button-sm"
                [disabled]="currentPage() >= totalPages()"
                (click)="nextPage()">
                Next ›
              </button>
            </div>
          </div>
        }
      }
    </section>

    <!-- Right-Side Drawer matching Target Mockup Image 2 -->
    @if (inspectFine(); as detail) {
      <div class="drawer-backdrop" (click)="closeDetailsDrawer()" aria-hidden="true"></div>

      <aside class="details-drawer surface-card" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header class="drawer-header">
          <h2 id="drawer-title" class="drawer-title">Fine Details</h2>
          <button type="button" class="drawer-close-btn" (click)="closeDetailsDrawer()" aria-label="Close details panel">✕</button>
        </header>

        <div class="drawer-body">
          <!-- Hero Section -->
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
              <p class="drawer-meta-line">
                <span class="meta-label">Borrower:</span>
                <strong>{{ detail.borrowerName }}</strong> ({{ detail.borrowerEmail }})
              </p>
            </div>
          </div>

          <!-- 2-Column Details Grid -->
          <div class="drawer-grid">
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

          <!-- Audit & Breakdown -->
          <div class="drawer-explanation-section">
            <h4 class="explanation-title">Applied Loan Terms</h4>
            <div class="terms-grid">
              <div>Daily Rate: <strong>₹{{ detail.dailyRate.toFixed(2) }}/day</strong></div>
              <div>Grace Period: <strong>{{ detail.gracePeriodDays }} day(s)</strong></div>
              <div>Maximum Limit: <strong>₹{{ detail.maxFine.toFixed(2) }}</strong></div>
              <div>Overdue Days: <strong class="text-danger">{{ detail.overdueDays }} day(s)</strong></div>
            </div>
            <div class="billable-line">
              <span>Circulation Audit Reference:</span>
              <code>{{ detail.id }}</code>
            </div>
            <span class="sr-only">CIRCULATION AUDIT</span>
          </div>

          <!-- Payment / Receipt Status -->
          <div class="drawer-desk-notice">
            @if (detail.status === 'PAID') {
              <div class="settled-notice-content">
                <strong>✓ Paid in Full</strong>
                @if (detail.payments.length > 0) {
                  <p class="settled-sub">Official Receipt: <code>{{ detail.payments[0].receiptNumber }}</code></p>
                  <p class="settled-sub muted">Recorded by {{ detail.payments[0].recordedByEmail }} on {{ detail.payments[0].paymentDate | date:'medium' }}</p>
                }
              </div>
            } @else {
              <div class="unpaid-desk-info">
                <strong>Unpaid Circulation Balance</strong>
                <p class="desk-sub">
                  Member has an outstanding fine balance of ₹{{ detail.fineAmount.toFixed(2) }}. Full payment must be recorded at the circulation desk.
                </p>
              </div>
            }
          </div>
        </div>

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
              <button type="button" class="button button-primary" (click)="openPaymentModal(detail)">
                Record Payment
              </button>
            } @else {
              <button type="button" class="button button-secondary" (click)="openReceiptModal(detail)">
                View Receipt
              </button>
            }
          </div>
        </footer>
      </aside>
    }

    <!-- Payment Modal Dialog with Confirmation Step -->
    @if (selectedFine(); as target) {
      <div class="modal-backdrop" (click)="closeModal()">
        <div class="modal-dialog surface-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <header class="modal-header">
            <div>
              <p class="modal-eyebrow">CIRCULATION DESK CASHIER</p>
              <h2 id="modal-title">Record Fine Payment</h2>
            </div>
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
              @if (target.borrowerInstitutionalId) {
                <div class="detail-row">
                  <span class="muted">Institutional ID:</span>
                  <span>{{ target.borrowerInstitutionalId }}</span>
                </div>
              }
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
                <label for="receiptNumber">Official Receipt / Reference Number <span class="required">*</span></label>
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

              <!-- Explicit Confirmation Notice -->
              <div class="confirm-box">
                <label class="confirm-label">
                  <input
                    type="checkbox"
                    [(ngModel)]="paymentConfirmed"
                    name="confirmPayment"
                    [disabled]="submittingPayment()" />
                  <span>I confirm full receipt of ₹{{ target.fineAmount.toFixed(2) }} from {{ target.borrowerName }}.</span>
                </label>
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
                  [disabled]="submittingPayment() || !receiptInput.trim() || !paymentConfirmed">
                  {{ submittingPayment() ? 'Recording…' : 'Confirm Full Settlement (₹' + target.fineAmount.toFixed(2) + ')' }}
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
            <div>
              <p class="modal-eyebrow">AUDIT & SETTLEMENT</p>
              <h2 id="receipt-title">Fine Payment Receipt</h2>
            </div>
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
                  <span class="muted">Fine Record ID:</span>
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
                          <strong class="text-success">₹{{ p.amount.toFixed(2) }}</strong>
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
      max-width: 1240px;
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

    .header-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .page-title {
      font-family: var(--font-serif, 'Playfair Display', Georgia, serif);
      font-size: 1.75rem;
      font-weight: 600;
      color: #1F2421;
      margin: 0 0 0.25rem;
      line-height: 1.25;
      letter-spacing: -0.02em;
    }

    .eyebrow {
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #5A625D;
      margin: 0 0 0.25rem;
      text-transform: uppercase;
    }

    .muted {
      color: #5A625D;
      margin: 0;
      font-size: 0.85rem;
    }

    /* Summary Cards (Matching Mockup) */
    .summary-cards-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1.75rem;
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

    /* Policy Banner */
    .policy-banner {
      display: flex;
      gap: 1.25rem;
      padding: 1.25rem;
      background: #F6F4EE;
      border: 1px solid #E5E0D5;
      border-radius: 10px;
      margin-bottom: 1.5rem;
      align-items: flex-start;
    }

    .banner-icon-box {
      width: 40px;
      height: 40px;
      background: #EAF2EF;
      color: #003D30;
      border-radius: 8px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }

    .banner-icon-box svg {
      width: 20px;
      height: 20px;
    }

    .banner-body {
      flex: 1;
    }

    .banner-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.35rem;
    }

    .banner-top h2 {
      margin: 0;
      font-size: 1.1rem;
      color: #003D30;
      font-weight: 600;
    }

    .policy-status-badge {
      font-size: 0.75rem;
      font-weight: 700;
      background: #EAF2EF;
      color: #003D30;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      border: 1px solid #C2D6CF;
    }

    .banner-text {
      font-size: 0.85rem;
      color: #5A625D;
      margin: 0 0 0.65rem;
      line-height: 1.45;
    }

    .policy-invariants {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem 0.75rem;
    }

    .invariant-item {
      font-size: 0.78rem;
      color: #1F2421;
      background: #FFFFFF;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      border: 1px solid #E5E0D5;
    }

    /* Search & Filter Controls */
    .controls-card {
      background: #FFFFFF;
      border: 1px solid #E5E0D5;
      border-radius: 10px;
      padding: 1rem 1.25rem;
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }

    .search-input-wrap {
      position: relative;
      width: 100%;
    }

    .search-icon {
      position: absolute;
      left: 0.85rem;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      color: #5A625D;
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      box-sizing: border-box;
      padding: 0.6rem 2.25rem 0.6rem 2.5rem;
      border: 1px solid #D8D2C4;
      border-radius: 6px;
      font-size: 0.875rem;
      background: #FCFBF9;
      color: #1F2421;
      outline: none;
      transition: border-color 0.15s ease;
    }

    .search-input:focus {
      border-color: #003D30;
      background: #FFFFFF;
    }

    .clear-search-btn {
      position: absolute;
      right: 0.65rem;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: #5A625D;
      font-size: 1rem;
      cursor: pointer;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
    }

    .filters-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .filter-pills {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .filter-pill {
      background: #FFFFFF;
      border: 1px solid #E5E0D5;
      color: #4B5563;
      padding: 0.45rem 1.1rem;
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 550;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .filter-pill:hover {
      background: #F6F4EE;
      color: #003D30;
    }

    .filter-pill.active {
      background: #003D30;
      border-color: #003D30;
      color: #FFFFFF;
      box-shadow: 0 2px 6px rgba(0, 61, 48, 0.25);
    }

    .role-filter-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .role-filter-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #5A625D;
    }

    .role-select {
      padding: 0.35rem 0.65rem;
      border: 1px solid #D8D2C4;
      border-radius: 6px;
      font-size: 0.82rem;
      background: #FCFBF9;
      color: #1F2421;
      outline: none;
    }

    /* Ledger Table Section */
    .fines-ledger-section {
      background: #FFFFFF;
      border: 1px solid #E5E0D5;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }

    .section-header-split {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.15rem 1.25rem;
      border-bottom: 1px solid #E5E0D5;
      background: #FCFBF9;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .section-header-split h2 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 600;
      color: #003D30;
    }

    .section-sub {
      margin: 0.15rem 0 0;
      font-size: 0.84rem;
    }

    .table-meta-badge {
      font-size: 0.8rem;
      color: #5A625D;
      background: #F6F4EE;
      padding: 0.25rem 0.65rem;
      border-radius: 4px;
      border: 1px solid #E5E0D5;
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
      background: #FCFBF9;
      padding: 0.85rem 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #4B5563;
      border-bottom: 1px solid #E5E0D5;
      white-space: nowrap;
    }

    .data-table td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #F1ECE4;
      font-size: 0.875rem;
      vertical-align: middle;
    }

    .data-table tr:last-child td {
      border-bottom: none;
    }

    .data-table tr:hover {
      background: #FAF8F5;
    }

    .role-badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      background: #F1F5F9;
      color: #334155;
      border: 1px solid #CBD5E1;
    }

    .role-student {
      background: #EAF2EF;
      color: #003D30;
      border-color: #C2D6CF;
    }

    .role-faculty {
      background: #EDE9FE;
      color: #5B21B6;
      border-color: #DDD6FE;
    }

    .cover-thumb-sm {
      width: 36px;
      height: 48px;
      border-radius: 4px;
      overflow: hidden;
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cover-fallback-sm {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #EAF2EF;
      color: #003D30;
      width: 100%;
      height: 100%;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .cover-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .book-title-cell {
      display: inline-block;
      font-weight: 600;
      color: #1F2421;
      max-width: 220px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      vertical-align: middle;
    }

    .days-badge {
      display: inline-block;
      background: #FEF3C7;
      color: #92400E;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .days-badge.badge-danger {
      background: #FEE2E2;
      color: #991B1B;
    }

    .fine-amount {
      font-size: 0.95rem;
    }

    /* Status Pill matching Mockup */
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

    .actions-cell {
      display: flex;
      gap: 0.4rem;
      justify-content: flex-end;
      align-items: center;
    }

    .btn-action-pill {
      background: #FFFFFF;
      border: 1px solid #003D30;
      color: #003D30;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      transition: all 0.15s ease;
    }

    .btn-action-pill:hover {
      background: #EAF2EF;
    }

    .arrow-glyph {
      font-size: 0.85rem;
      font-weight: 700;
      line-height: 1;
    }

    /* Pagination Bar */
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1.25rem;
      border-top: 1px solid #E5E0D5;
      background: #FCFBF9;
    }

    .pagination-actions {
      display: flex;
      gap: 0.5rem;
    }

    /* Buttons & States */
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
      transition: all 0.15s ease;
    }

    .button-sm {
      padding: 0.3rem 0.65rem;
      font-size: 0.8rem;
    }

    .button-primary {
      background: #003D30;
      color: #FFFFFF;
    }

    .button-primary:hover:not(:disabled) {
      background: #002B22;
    }

    .button-secondary {
      background: #FFFFFF;
      border-color: #D8D2C4;
      color: #1F2421;
    }

    .button-secondary:hover:not(:disabled) {
      background: #F6F4EE;
    }

    .alert {
      padding: 0.85rem 1rem;
      border-radius: 8px;
      margin-bottom: 1.25rem;
      font-size: 0.875rem;
    }

    .alert-error {
      background: #FEF2F2;
      color: #991B1B;
      border: 1px solid #FECACA;
    }

    .alert-success {
      background: #EAF2EF;
      color: #003D30;
      border: 1px solid #C2D6CF;
    }

    .loading-state, .empty-state {
      padding: 3rem 1.5rem;
      text-align: center;
    }

    /* Right-Side Drawer matching Mockup */
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

    .barcode-code {
      background: transparent;
      padding: 0;
      font-family: inherit;
      color: #4B5563;
    }

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

    .terms-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
      font-size: 0.85rem;
    }

    .billable-line {
      display: flex;
      justify-content: space-between;
      border-top: 1px dashed #E5E0D5;
      padding-top: 0.5rem;
      margin-top: 0.5rem;
      font-size: 0.85rem;
      color: #1F2421;
    }

    .drawer-desk-notice {
      border-radius: 8px;
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

    /* Modal Dialogs */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(2px);
      z-index: 1005;
      display: grid;
      place-items: center;
      padding: 1rem;
    }

    .modal-dialog {
      background: #FFFFFF;
      border: 1px solid #E5E0D5;
      border-radius: 14px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      width: 100%;
      max-width: 560px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #E5E0D5;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: #FCFBF9;
    }

    .modal-eyebrow {
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #5A625D;
      margin: 0 0 0.2rem;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.2rem;
      color: #003D30;
      font-weight: 600;
    }

    .close-btn {
      background: transparent;
      border: none;
      font-size: 1.25rem;
      color: #5A625D;
      cursor: pointer;
      line-height: 1;
      padding: 0.25rem;
      border-radius: 4px;
    }

    .close-btn:hover {
      background: #EFECE6;
      color: #1F2421;
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
    }

    .payment-details-box {
      background: #F6F4EE;
      border: 1px solid #E5E0D5;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
    }

    .total-row {
      border-top: 1px dashed #D8D2C4;
      padding-top: 0.5rem;
      margin-top: 0.25rem;
      font-weight: 600;
      font-size: 0.95rem;
    }

    .policy-note {
      font-size: 0.8rem;
      color: #5A625D;
      background: #FEF3C7;
      border: 1px solid #FDE68A;
      padding: 0.65rem 0.85rem;
      border-radius: 6px;
      margin: 0 0 1.25rem;
      line-height: 1.4;
    }

    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-group label {
      display: block;
      font-size: 0.84375rem;
      font-weight: 600;
      color: #1F2421;
      margin-bottom: 0.4rem;
    }

    .text-input {
      width: 100%;
      box-sizing: border-box;
      padding: 0.6rem 0.85rem;
      border: 1px solid #D8D2C4;
      border-radius: 6px;
      font-size: 0.875rem;
    }

    .confirm-box {
      margin-bottom: 1.25rem;
      background: #FCFBF9;
      border: 1px solid #E5E0D5;
      border-radius: 6px;
      padding: 0.75rem 0.85rem;
    }

    .confirm-label {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-size: 0.84rem;
      font-weight: 550;
      color: #1F2421;
      cursor: pointer;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .receipt-card {
      background: #FFFFFF;
      border: 1px solid #E5E0D5;
      border-radius: 10px;
      padding: 1.25rem;
    }

    .receipt-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #E5E0D5;
      padding-bottom: 0.85rem;
      margin-bottom: 1rem;
    }

    .receipt-header h3 {
      margin: 0;
      font-size: 1.1rem;
      color: #003D30;
    }

    .receipt-content {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .payment-logs-box {
      margin-top: 1rem;
      border-top: 1px dashed #D8D2C4;
      padding-top: 0.85rem;
    }

    .payment-logs-box h4 {
      margin: 0 0 0.65rem;
      font-size: 0.85rem;
      text-transform: uppercase;
      color: #5A625D;
    }

    .log-item {
      display: flex;
      justify-content: space-between;
      padding: 0.4rem 0;
      border-bottom: 1px solid #EFECE6;
      font-size: 0.84rem;
    }

    .status-badge {
      display: inline-block;
      padding: 0.22rem 0.65rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .status-badge-success {
      background: #EAF2EF;
      color: #003D30;
      border: 1px solid #C2D6CF;
    }

    @media (max-width: 992px) {
      .summary-cards-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .summary-cards-grid {
        grid-template-columns: 1fr;
      }

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
export class FinesViewerComponent implements OnInit {
  private readonly opsService = inject(LibrarianOperationsService);

  readonly policy = signal<FinesPolicyResponse | null>(null);
  readonly summary = signal<FineSummary | null>(null);
  readonly fines = signal<FineRecord[]>([]);
  readonly loading = signal(true);
  readonly recalculating = signal(false);
  readonly error = signal('');
  readonly successMessage = signal('');

  // Filters & Search
  readonly statusFilter = signal<FineStatusFilter>('ALL');
  readonly roleFilter = signal<MemberRoleFilter>('ALL');
  readonly searchQuery = signal('');

  // Pagination
  readonly pageSize = 15;
  readonly currentPage = signal(1);

  // Modal & Drawer States
  readonly selectedFine = signal<FineRecord | null>(null);
  receiptInput = '';
  paymentConfirmed = false;
  readonly submittingPayment = signal(false);
  readonly modalError = signal('');

  readonly receiptFine = signal<FineRecord | null>(null);
  readonly inspectFine = signal<FineRecord | null>(null);

  // Counts
  readonly unpaidFinesCount = computed(() => this.fines().filter(f => f.status === 'UNPAID').length);
  readonly paidFinesCount = computed(() => this.fines().filter(f => f.status === 'PAID').length);
  readonly overdueFinesCount = computed(() => this.fines().filter(f => f.loanOverdue || (f.status === 'UNPAID' && f.overdueDays > 0)).length);
  readonly overdueLoansCount = computed(() => this.fines().filter(f => f.loanOverdue).length);

  // Filtered List
  readonly filteredFines = computed(() => {
    let result = this.fines();

    // Status filter
    const status = this.statusFilter();
    if (status === 'UNPAID') {
      result = result.filter(x => x.status === 'UNPAID');
    } else if (status === 'PAID') {
      result = result.filter(x => x.status === 'PAID');
    } else if (status === 'OVERDUE') {
      result = result.filter(x => x.loanOverdue || (x.status === 'UNPAID' && x.overdueDays > 0));
    }

    // Role filter
    const role = this.roleFilter();
    if (role !== 'ALL') {
      result = result.filter(x => (x.borrowerRole || '').toUpperCase() === role);
    }

    // Search query
    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      result = result.filter(x =>
        (x.borrowerName || '').toLowerCase().includes(query) ||
        (x.borrowerEmail || '').toLowerCase().includes(query) ||
        (x.borrowerInstitutionalId || '').toLowerCase().includes(query) ||
        (x.bookTitle || '').toLowerCase().includes(query) ||
        (x.copyIdentifier || '').toLowerCase().includes(query)
      );
    }

    return result;
  });

  // Pagination calculation
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredFines().length / this.pageSize)));
  readonly paginatedFines = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredFines().slice(start, start + this.pageSize);
  });

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
          next: (res) => {
            this.fines.set(res);
            this.currentPage.set(1);
          },
          error: () => this.error.set('Could not load fines records from the server.')
        });
    } else {
      this.loading.set(false);
    }
  }

  recalculate(): void {
    this.recalculating.set(true);
    if (this.opsService.recalculateFines) {
      this.opsService.recalculateFines()
        .pipe(finalize(() => this.recalculating.set(false)))
        .subscribe({
          next: () => {
            this.successMessage.set('Overdue fines recalculated successfully.');
            this.load();
            setTimeout(() => this.successMessage.set(''), 4000);
          },
          error: () => {
            this.error.set('Failed to trigger overdue fine recalculation.');
          }
        });
    } else {
      this.recalculating.set(false);
    }
  }

  setStatusFilter(filter: FineStatusFilter): void {
    this.statusFilter.set(filter);
    this.currentPage.set(1);
  }

  setRoleFilter(role: MemberRoleFilter): void {
    this.roleFilter.set(role);
    this.currentPage.set(1);
  }

  onSearchChange(val: string): void {
    this.searchQuery.set(val);
    this.currentPage.set(1);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.statusFilter.set('ALL');
    this.roleFilter.set('ALL');
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  openPaymentModal(fine: FineRecord): void {
    this.selectedFine.set(fine);
    this.receiptInput = '';
    this.paymentConfirmed = false;
    this.modalError.set('');
  }

  closeModal(): void {
    this.selectedFine.set(null);
    this.receiptInput = '';
    this.paymentConfirmed = false;
    this.modalError.set('');
  }

  openReceiptModal(fine: FineRecord): void {
    this.receiptFine.set(fine);
  }

  closeReceiptModal(): void {
    this.receiptFine.set(null);
  }

  openDetailsDrawer(fine: FineRecord): void {
    this.inspectFine.set(fine);
  }

  closeDetailsDrawer(): void {
    this.inspectFine.set(null);
  }

  openDetailsModal(fine: FineRecord): void {
    this.openDetailsDrawer(fine);
  }

  closeDetailsModal(): void {
    this.closeDetailsDrawer();
  }

  submitPayment(fine: FineRecord): void {
    if (!this.receiptInput.trim()) {
      this.modalError.set('Receipt or reference number is required.');
      return;
    }
    if (!this.paymentConfirmed) {
      this.modalError.set('Please check the confirmation box before proceeding.');
      return;
    }

    this.submittingPayment.set(true);
    this.modalError.set('');

    this.opsService.recordPayment(fine.id, fine.fineAmount, this.receiptInput.trim())
      .pipe(finalize(() => this.submittingPayment.set(false)))
      .subscribe({
        next: () => {
          this.closeModal();
          if (this.inspectFine()?.id === fine.id) {
            this.closeDetailsDrawer();
          }
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
