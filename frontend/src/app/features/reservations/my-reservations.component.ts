import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ReservationCounts, ReservationItem, ReservationService } from './reservation.service';

@Component({
  selector: 'app-my-reservations',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="reservations-container">
      <!-- Page Header -->
      <header class="page-header">
        <div class="header-left">
          <div class="header-icon-box" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div class="header-title-wrap">
            <h1 class="page-title">My Reservations</h1>
            <p class="page-subtitle">Manage your reserved books and track their status.</p>
          </div>
        </div>

        <div class="header-right">
          <div class="hold-period-banner">
            <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>Reservation Hold Period: <strong class="hold-highlight">1 Calendar Month</strong></span>
          </div>
        </div>
      </header>

      <!-- Status Tabs -->
      <nav class="status-tabs-nav" aria-label="Reservation Status Filters">
        <button
          type="button"
          class="tab-pill"
          [class.active]="activeTab() === 'all'"
          (click)="setTab('all')"
        >
          All ({{ counts().all }})
        </button>
        <button
          type="button"
          class="tab-pill"
          [class.active]="activeTab() === 'waiting'"
          (click)="setTab('waiting')"
        >
          Waiting ({{ counts().waiting }})
        </button>
        <button
          type="button"
          class="tab-pill"
          [class.active]="activeTab() === 'inQueue'"
          (click)="setTab('inQueue')"
        >
          In Queue ({{ counts().inQueue }})
        </button>
        <button
          type="button"
          class="tab-pill"
          [class.active]="activeTab() === 'readyForPickup'"
          (click)="setTab('readyForPickup')"
        >
          Ready for Pickup ({{ counts().readyForPickup }})
        </button>
        <button
          type="button"
          class="tab-pill"
          [class.active]="activeTab() === 'completed'"
          (click)="setTab('completed')"
        >
          Completed ({{ counts().completed }})
        </button>
        <button
          type="button"
          class="tab-pill"
          [class.active]="activeTab() === 'cancelled'"
          (click)="setTab('cancelled')"
        >
          Cancelled ({{ counts().cancelled }})
        </button>
      </nav>

      <!-- Feedback / Alerts -->
      @if (notice()) {
        <div class="alert alert-success" role="status">
          {{ notice() }}
        </div>
      }
      @if (actionError()) {
        <div class="alert alert-error" role="alert">
          {{ actionError() }}
        </div>
      }

      <!-- Main Table Card -->
      <div class="table-card surface-card">
        @if (loading()) {
          <div class="state-container loading-state">
            <div class="spinner" aria-hidden="true"></div>
            <p>Loading your reservations…</p>
          </div>
        } @else if (error()) {
          <div class="state-container error-state" role="alert">
            <div class="error-icon-wrap" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3 class="error-title">Unable to Load Reservations</h3>
            <p class="error-desc">{{ error() }}</p>
            <button type="button" class="button button-primary retry-btn" (click)="loadData()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              <span>Retry</span>
            </button>
          </div>
        } @else if (reservations().length === 0) {
          <div class="state-container empty-state">
            <div class="empty-icon-wrap" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <h3 class="empty-title">No reservations found</h3>
            <p class="empty-desc">
              @if (activeTab() === 'all') {
                You have not reserved any books yet. Explore the catalogue to find and reserve books currently on loan.
              } @else {
                There are no reservations matching the "{{ activeTabLabel() }}" filter.
              }
            </p>
            <a routerLink="/workspace/books" class="button button-primary empty-action">
              Browse Catalogue
            </a>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="reservations-table">
              <thead>
                <tr>
                  <th scope="col" class="th-book">Book</th>
                  <th scope="col" class="th-reserved" (click)="toggleSort('reservedOn')">
                    <span class="th-content">Reserved On <span class="sort-icon">≍</span></span>
                  </th>
                  <th scope="col" class="th-queue" (click)="toggleSort('queuePosition')">
                    <span class="th-content">Queue Position <span class="sort-icon">≍</span></span>
                  </th>
                  <th scope="col" class="th-status" (click)="toggleSort('status')">
                    <span class="th-content">Status <span class="sort-icon">≍</span></span>
                  </th>
                  <th scope="col" class="th-availability">Availability / Hold</th>
                  <th scope="col" class="th-action">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (item of reservations(); track item.id) {
                  <tr class="reservation-row">
                    <!-- Book Info -->
                    <td class="td-book">
                      <div class="book-cell">
                        <a [routerLink]="['/workspace/books', item.bookId]" class="cover-link">
                          @if (item.bookCoverImageUrl) {
                            <img [src]="item.bookCoverImageUrl" [alt]="item.bookTitle" class="book-cover-img" />
                          } @else {
                            <div class="book-cover-fallback" [ngClass]="getCoverFallbackClass(item.bookTitle)">
                              <span class="fallback-title">{{ item.bookTitle.substring(0, 18) }}</span>
                              <span class="fallback-icon">📖</span>
                            </div>
                          }
                        </a>
                        <div class="book-details">
                          <a [routerLink]="['/workspace/books', item.bookId]" class="book-title-link">
                            {{ item.bookTitle }}
                          </a>
                          <p class="book-authors">{{ item.bookAuthors.join(', ') || 'Unknown Author' }}</p>
                          <span class="category-pill" [ngClass]="getCategoryPillClass(item.bookCategory)">
                            {{ item.bookCategory }}
                          </span>
                        </div>
                      </div>
                    </td>

                    <!-- Reserved On -->
                    <td class="td-reserved">
                      <span class="date-text">{{ formatDate(item.reservedOn) }}</span>
                    </td>

                    <!-- Queue Position -->
                    <td class="td-queue">
                      @if (item.queuePosition) {
                        <span class="queue-badge" [class.pos-one]="item.queuePosition === 1" [class.pos-multi]="item.queuePosition > 1">
                          #{{ item.queuePosition }}
                        </span>
                      } @else {
                        <span class="queue-dash">-</span>
                      }
                    </td>

                    <!-- Status -->
                    <td class="td-status">
                      <span class="status-badge" [ngClass]="getStatusBadgeClass(item.status)">
                        @if (item.status === 'READY_FOR_PICKUP') {
                          <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        }
                        {{ item.statusDisplay }}
                      </span>
                    </td>

                    <!-- Availability / Hold -->
                    <td class="td-availability">
                      <div class="availability-cell">
                        @if (item.status === 'READY_FOR_PICKUP') {
                          <svg class="cell-icon clock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          <span class="hold-text">{{ item.availabilityHoldText }}</span>
                        } @else if (item.availabilityHoldText.startsWith('Est.')) {
                          <svg class="cell-icon cal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                          </svg>
                          <span>{{ item.availabilityHoldText }}</span>
                        } @else {
                          <svg class="cell-icon clock-icon muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          <span class="muted-dash">{{ item.availabilityHoldText }}</span>
                        }
                      </div>
                    </td>

                    <!-- Action -->
                    <td class="td-action">
                      @if (item.canBorrowNow) {
                        <button
                          type="button"
                          class="btn-borrow-now"
                          (click)="openBorrowNowDialog(item)"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                          </svg>
                          <span>Borrow Now</span>
                        </button>
                      } @else if (item.canCancel) {
                        <button
                          type="button"
                          class="btn-cancel-reservation"
                          (click)="confirmCancel(item)"
                          [disabled]="cancellingId() === item.id"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                          </svg>
                          <span>Cancel</span>
                        </button>
                      } @else {
                        <span class="no-action-dash">—</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>

    <!-- Confirmation Modal: Cancel Reservation -->
    @if (cancellingItem()) {
      <div class="modal-backdrop" (click)="dismissCancelDialog()">
        <div class="modal-card surface-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="cancel-dialog-title">
          <div class="modal-header">
            <div class="danger-icon-box" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div>
              <h2 id="cancel-dialog-title" class="modal-title">Cancel Reservation?</h2>
              <p class="modal-subtitle">You are about to cancel this reservation.</p>
            </div>
          </div>

          <p class="dialog-body-text">
            Are you sure you want to cancel your reservation for
            <strong>"{{ cancellingItem()!.bookTitle }}"</strong>?
            @if (cancellingItem()!.queuePosition) {
              You will lose your position <strong>(#{{ cancellingItem()!.queuePosition }})</strong> in the reservation queue.
            } @else {
              Any physical copy allocated for pickup will be immediately released to the next eligible member.
            }
          </p>

          <div class="modal-actions">
            <button
              type="button"
              class="button button-secondary"
              (click)="dismissCancelDialog()"
              [disabled]="cancellingPending()"
            >
              Keep Reservation
            </button>
            <button
              type="button"
              class="btn-danger-confirm"
              (click)="executeCancel()"
              [disabled]="cancellingPending()"
            >
              {{ cancellingPending() ? 'Cancelling…' : 'Cancel Reservation' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Dialog: Ready for Pickup Information -->
    @if (pickupItem()) {
      <div class="modal-backdrop" (click)="pickupItem.set(null)">
        <div class="modal-card surface-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="pickup-dialog-title">
          <div class="modal-header">
            <div class="success-icon-box" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div>
              <h2 id="pickup-dialog-title" class="modal-title">Ready for Pickup!</h2>
              <p class="modal-subtitle">{{ pickupItem()!.bookTitle }}</p>
            </div>
          </div>

          <div class="pickup-info-box">
            <p class="pickup-instruction">
              Good news! A physical copy has been assigned to you and is held at the library circulation desk.
            </p>
            <div class="hold-timing-alert">
              <strong>Time Remaining:</strong> {{ pickupItem()!.availabilityHoldText }}
            </div>
            <p class="step-guide">
              <strong>Next Step:</strong> Visit the Circulation Desk with your institutional ID to collect your book. The librarian will issue it to your account directly.
            </p>
          </div>

          <div class="modal-actions">
            <button
              type="button"
              class="button button-secondary"
              (click)="pickupItem.set(null)"
            >
              Close
            </button>
            <button
              type="button"
              class="button button-primary"
              (click)="goToBorrowRequests()"
            >
              View Borrow Requests
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .reservations-container {
      max-width: 78rem;
      margin: 0 auto;
      padding: 0 0.5rem 3rem;
    }

    /* Header */
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      margin-bottom: 1.75rem;
      flex-wrap: wrap;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .header-icon-box {
      width: 50px;
      height: 50px;
      border-radius: 14px;
      background: #e6f4ea;
      color: #003d30;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      svg {
        width: 28px;
        height: 28px;
      }
    }

    .page-title {
      font-family: var(--font-serif);
      font-size: 1.75rem;
      font-weight: 700;
      color: #1f2421;
      margin: 0;
      line-height: 1.25;
    }

    .page-subtitle {
      font-family: var(--font-sans);
      font-size: 0.875rem;
      color: #5a625d;
      margin: 0.25rem 0 0;
    }

    .hold-period-banner {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      background: #f0fdf4;
      border: 1.5px solid #86efac;
      border-radius: 9999px;
      padding: 0.5rem 1.25rem;
      font-size: 0.85rem;
      color: #166534;
      font-weight: 500;

      .info-icon {
        width: 18px;
        height: 18px;
        color: #15803d;
      }

      .hold-highlight {
        color: #003d30;
        font-weight: 700;
      }
    }

    /* Tabs */
    .status-tabs-nav {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
      margin-bottom: 1.5rem;
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }
    }

    .tab-pill {
      background: #ffffff;
      color: #374151;
      border: 1px solid #e5e0d5;
      border-radius: 9999px;
      padding: 0.45rem 1.15rem;
      font-size: 0.84375rem;
      font-weight: 550;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease-in-out;

      &:hover:not(.active) {
        background: #f6f4ee;
        border-color: #d8d2c4;
      }

      &.active {
        background: #003d30;
        color: #ffffff;
        border-color: #003d30;
        box-shadow: 0 2px 4px rgba(0, 61, 48, 0.18);
      }
    }

    /* Alerts */
    .alert {
      padding: 0.85rem 1.25rem;
      border-radius: 10px;
      margin-bottom: 1.25rem;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .alert-success {
      background: #eaf2ef;
      color: #003d30;
      border: 1px solid #c2d6cf;
    }
    .alert-error {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    /* Table Card */
    .table-card {
      background: #ffffff;
      border: 1px solid #e5e0d5;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
    }

    .table-responsive {
      width: 100%;
      overflow-x: auto;
    }

    .reservations-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;

      thead th {
        background: #f0f7f4;
        color: #1f2421;
        font-size: 0.78125rem;
        font-weight: 700;
        padding: 0.9rem 1.2rem;
        border-bottom: 1px solid #e5e0d5;
        white-space: nowrap;
        user-select: none;

        .th-content {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          cursor: pointer;
        }

        .sort-icon {
          font-size: 0.85rem;
          color: #737c76;
        }
      }

      tbody td {
        padding: 1.15rem 1.2rem;
        border-bottom: 1px solid #f4f2ec;
        vertical-align: middle;
        font-size: 0.84375rem;
        color: #1f2421;
      }

      tbody tr:last-child td {
        border-bottom: none;
      }

      tbody tr:hover {
        background: #fdfcf9;
      }
    }

    /* Book Cell */
    .book-cell {
      display: flex;
      align-items: center;
      gap: 1rem;
      min-width: 260px;
    }

    .cover-link {
      display: block;
      flex-shrink: 0;
    }

    .book-cover-img {
      width: 48px;
      height: 64px;
      object-fit: cover;
      border-radius: 6px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
    }

    .book-cover-fallback {
      width: 48px;
      height: 64px;
      border-radius: 6px;
      padding: 0.4rem 0.25rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      color: #ffffff;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);

      .fallback-title {
        font-size: 0.55rem;
        font-weight: 700;
        line-height: 1.1;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
      }

      .fallback-icon {
        font-size: 0.85rem;
      }

      &.fallback-os { background: #1e3a5f; }
      &.fallback-db { background: #065f46; }
      &.fallback-net { background: #4338ca; }
      &.fallback-dsa { background: #7c2d12; }
      &.fallback-default { background: #003d30; }
    }

    .book-details {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .book-title-link {
      font-weight: 600;
      font-size: 0.9375rem;
      color: #1f2421;
      text-decoration: none;
      line-height: 1.35;

      &:hover {
        color: #003d30;
        text-decoration: underline;
      }
    }

    .book-authors {
      font-size: 0.8125rem;
      color: #5a625d;
      margin: 0;
    }

    .category-pill {
      display: inline-block;
      width: fit-content;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.15rem 0.6rem;
      border-radius: 9999px;
      margin-top: 0.2rem;

      &.cat-cs {
        background: #f3e8ff;
        color: #6b21a8;
      }
      &.cat-db {
        background: #e6f4ea;
        color: #137333;
      }
      &.cat-net {
        background: #e0e7ff;
        color: #3730a3;
      }
      &.cat-algo {
        background: #fae8ff;
        color: #86198f;
      }
      &.cat-default {
        background: #f1f5f9;
        color: #475569;
      }
    }

    /* Reserved On */
    .date-text {
      color: #374151;
      font-weight: 500;
      white-space: nowrap;
    }

    /* Queue Badge */
    .queue-badge {
      display: inline-block;
      font-weight: 700;
      font-size: 0.8125rem;
      border-radius: 8px;
      padding: 0.25rem 0.65rem;
      white-space: nowrap;

      &.pos-one {
        background: #e6f4ea;
        color: #137333;
      }

      &.pos-multi {
        background: #f3e8ff;
        color: #6b21a8;
      }
    }

    .queue-dash {
      color: #9ca3af;
      font-weight: 600;
      padding-left: 0.5rem;
    }

    /* Status Badge */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      border-radius: 9999px;
      padding: 0.3rem 0.85rem;
      font-size: 0.78125rem;
      font-weight: 600;
      white-space: nowrap;

      .check-icon {
        width: 14px;
        height: 14px;
        stroke-width: 3;
      }

      &.status-waiting {
        background: #fef7e0;
        color: #b06000;
      }

      &.status-queue {
        background: #f3e8ff;
        color: #6b21a8;
      }

      &.status-ready {
        background: #e6f4ea;
        color: #137333;
      }

      &.status-completed {
        background: #eaf2ef;
        color: #003d30;
      }

      &.status-cancelled {
        background: #fee2e2;
        color: #991b1b;
      }

      &.status-expired {
        background: #f3f4f6;
        color: #6b7280;
      }
    }

    /* Availability / Hold Cell */
    .availability-cell {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.84375rem;
      color: #374151;
      white-space: nowrap;

      .cell-icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;

        &.clock-icon { color: #6b7280; }
        &.cal-icon { color: #6b7280; }
        &.muted { color: #9ca3af; }
      }

      .hold-text {
        font-weight: 500;
        color: #1f2421;
      }

      .muted-dash {
        color: #6b7280;
      }
    }

    /* Action Buttons */
    .btn-cancel-reservation {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: #ffffff;
      color: #ea4335;
      border: 1.5px solid #ea4335;
      border-radius: 9999px;
      padding: 0.35rem 0.95rem;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease-in-out;

      svg {
        width: 14px;
        height: 14px;
      }

      &:hover:not(:disabled) {
        background: #fef2f2;
        border-color: #dc2626;
        color: #dc2626;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .btn-borrow-now {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: #003d30;
      color: #ffffff;
      border: none;
      border-radius: 9999px;
      padding: 0.42rem 1.05rem;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0, 61, 48, 0.2);
      transition: all 0.15s ease-in-out;

      svg {
        width: 15px;
        height: 15px;
      }

      &:hover {
        background: #002b22;
        transform: translateY(-1px);
      }
    }

    .no-action-dash {
      color: #9ca3af;
      padding-left: 0.5rem;
    }

    /* State Container */
    .state-container {
      padding: 4rem 2rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #eaf2ef;
      border-top-color: #003d30;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: #f6f4ee;
      color: #737c76;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;

      svg {
        width: 32px;
        height: 32px;
      }
    }

    .empty-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #1f2421;
      margin: 0 0 0.5rem;
    }

    .empty-desc {
      font-size: 0.875rem;
      color: #5a625d;
      max-width: 28rem;
      margin: 0 auto 1.5rem;
      line-height: 1.45;
    }

    .error-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: #fee2e2;
      color: #991b1b;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;

      svg {
        width: 32px;
        height: 32px;
      }
    }

    .error-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #991b1b;
      margin: 0 0 0.5rem;
    }

    .error-desc {
      font-size: 0.875rem;
      color: #5a625d;
      max-width: 28rem;
      margin: 0 auto 1.5rem;
      line-height: 1.45;
    }

    .retry-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;

      .btn-icon {
        width: 16px;
        height: 16px;
      }
    }

    /* Modal Dialogs */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(4px);
      display: grid;
      place-items: center;
      z-index: 1000;
      padding: 1.5rem;
    }

    .modal-card {
      width: 100%;
      max-width: 30rem;
      border-radius: 16px;
      padding: 1.75rem;
      background: #ffffff;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      animation: modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.96) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .modal-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .danger-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #fee2e2;
      color: #dc2626;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      svg { width: 24px; height: 24px; }
    }

    .success-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #e6f4ea;
      color: #137333;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      svg { width: 24px; height: 24px; }
    }

    .modal-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #1f2421;
      margin: 0;
    }

    .modal-subtitle {
      font-size: 0.8125rem;
      color: #5a625d;
      margin: 0.2rem 0 0;
    }

    .dialog-body-text {
      font-size: 0.875rem;
      color: #374151;
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }

    .pickup-info-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .pickup-instruction {
      font-size: 0.875rem;
      color: #111827;
      margin: 0 0 0.75rem;
    }

    .hold-timing-alert {
      background: #e6f4ea;
      color: #137333;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      font-size: 0.8125rem;
      margin-bottom: 0.75rem;
    }

    .step-guide {
      font-size: 0.8125rem;
      color: #4b5563;
      margin: 0;
      line-height: 1.4;
    }

    .modal-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .btn-danger-confirm {
      background: #dc2626;
      color: #ffffff;
      border: none;
      border-radius: 9999px;
      padding: 0.5rem 1.25rem;
      font-size: 0.84375rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease-in-out;

      &:hover:not(:disabled) {
        background: #b91c1c;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class MyReservationsComponent implements OnInit {
  private readonly reservationService = inject(ReservationService);
  private readonly router = inject(Router);

  readonly activeTab = signal<'all' | 'waiting' | 'inQueue' | 'readyForPickup' | 'completed' | 'cancelled'>('all');
  readonly reservations = signal<ReservationItem[]>([]);
  readonly counts = signal<ReservationCounts>({ all: 0, waiting: 0, inQueue: 0, readyForPickup: 0, completed: 0, cancelled: 0 });
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  readonly cancellingItem = signal<ReservationItem | null>(null);
  readonly cancellingId = signal<string | null>(null);
  readonly cancellingPending = signal<boolean>(false);

  readonly pickupItem = signal<ReservationItem | null>(null);

  private sortColumn = 'reservedOn';
  private sortAsc = false;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.actionError.set(null);

    this.reservationService.getCounts().subscribe({
      next: (c) => this.counts.set(c),
      error: () => {}
    });

    this.reservationService.getMyReservations(this.activeTab())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => {
          this.reservations.set(this.applySort(items));
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'Could not load reservations. Please try again.');
        }
      });
  }

  setTab(tab: 'all' | 'waiting' | 'inQueue' | 'readyForPickup' | 'completed' | 'cancelled'): void {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    this.loadData();
  }

  activeTabLabel(): string {
    switch (this.activeTab()) {
      case 'waiting': return 'Waiting';
      case 'inQueue': return 'In Queue';
      case 'readyForPickup': return 'Ready for Pickup';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return 'All';
    }
  }

  toggleSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortColumn = column;
      this.sortAsc = true;
    }
    this.reservations.set(this.applySort(this.reservations()));
  }

  private applySort(items: ReservationItem[]): ReservationItem[] {
    return [...items].sort((a, b) => {
      let cmp = 0;
      if (this.sortColumn === 'reservedOn') {
        cmp = new Date(a.reservedOn).getTime() - new Date(b.reservedOn).getTime();
      } else if (this.sortColumn === 'queuePosition') {
        const pa = a.queuePosition ?? 9999;
        const pb = b.queuePosition ?? 9999;
        cmp = pa - pb;
      } else if (this.sortColumn === 'status') {
        cmp = a.statusDisplay.localeCompare(b.statusDisplay);
      }
      return this.sortAsc ? cmp : -cmp;
    });
  }

  confirmCancel(item: ReservationItem): void {
    this.notice.set(null);
    this.actionError.set(null);
    this.cancellingItem.set(item);
  }

  dismissCancelDialog(): void {
    this.cancellingItem.set(null);
  }

  executeCancel(): void {
    const item = this.cancellingItem();
    if (!item) return;

    this.cancellingPending.set(true);
    this.cancellingId.set(item.id);

    this.reservationService.cancelReservation(item.id)
      .pipe(finalize(() => {
        this.cancellingPending.set(false);
        this.cancellingId.set(null);
      }))
      .subscribe({
        next: () => {
          this.cancellingItem.set(null);
          this.notice.set(`Your reservation for "${item.bookTitle}" has been cancelled.`);
          this.loadData();
        },
        error: (err) => {
          this.actionError.set(err?.error?.message || 'Failed to cancel reservation. Please try again.');
          this.cancellingItem.set(null);
        }
      });
  }

  openBorrowNowDialog(item: ReservationItem): void {
    this.pickupItem.set(item);
  }

  goToBorrowRequests(): void {
    this.pickupItem.set(null);
    this.router.navigate(['/workspace/my/requests']);
  }

  formatDate(isoString: string): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'READY_FOR_PICKUP': return 'status-ready';
      case 'WAITING_FOR_AVAILABILITY': return 'status-waiting';
      case 'IN_QUEUE': return 'status-queue';
      case 'COMPLETED': return 'status-completed';
      case 'CANCELLED': return 'status-cancelled';
      case 'EXPIRED': return 'status-expired';
      default: return 'status-waiting';
    }
  }

  getCategoryPillClass(category: string): string {
    const lower = (category || '').toLowerCase();
    if (lower.includes('computer') || lower.includes('software')) return 'cat-cs';
    if (lower.includes('database') || lower.includes('data')) return 'cat-db';
    if (lower.includes('network')) return 'cat-net';
    if (lower.includes('algorithm')) return 'cat-algo';
    return 'cat-default';
  }

  getCoverFallbackClass(title: string): string {
    const lower = (title || '').toLowerCase();
    if (lower.includes('operating')) return 'fallback-os';
    if (lower.includes('database')) return 'fallback-db';
    if (lower.includes('network')) return 'fallback-net';
    if (lower.includes('structure') || lower.includes('algorithm')) return 'fallback-dsa';
    return 'fallback-default';
  }
}
