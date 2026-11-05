import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { BorrowRequestRecord, BorrowRequestStatus, BorrowingService } from './borrowing.service';
import { CatalogueService } from '../catalogue/catalogue.service';

export type RequestFilterTab = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

@Component({
  selector: 'app-my-requests',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  template: `
    <!-- Header Section -->
    <header class="page-header">
      <div class="header-left">
        <p class="eyebrow">YOUR LIBRARY</p>
        <h1 class="page-title">My Requests</h1>
        <p class="page-desc">Borrowing requests and their review history.</p>
      </div>

      <div class="header-right">
        <div class="total-badge" aria-label="Total borrowing requests">
          Total Requests: {{ requests().length }}
        </div>
      </div>
    </header>

    <!-- Error Alert -->
    @if (error()) {
      <div class="alert alert-error" role="alert">
        <span>{{ error() }}</span>
        <button type="button" class="btn-retry" (click)="load()">Try again</button>
      </div>
    }

    <!-- Status Filter Tabs -->
    <nav class="filter-tabs" aria-label="Request status filters">
      <button
        type="button"
        class="filter-tab"
        [class.active]="selectedFilter() === 'ALL'"
        (click)="setFilter('ALL')"
        [attr.aria-pressed]="selectedFilter() === 'ALL'"
      >
        All ({{ requests().length }})
      </button>

      <button
        type="button"
        class="filter-tab"
        [class.active]="selectedFilter() === 'PENDING'"
        (click)="setFilter('PENDING')"
        [attr.aria-pressed]="selectedFilter() === 'PENDING'"
      >
        Pending ({{ pendingCount() }})
      </button>

      <button
        type="button"
        class="filter-tab"
        [class.active]="selectedFilter() === 'APPROVED'"
        (click)="setFilter('APPROVED')"
        [attr.aria-pressed]="selectedFilter() === 'APPROVED'"
      >
        Approved ({{ approvedCount() }})
      </button>

      <button
        type="button"
        class="filter-tab"
        [class.active]="selectedFilter() === 'REJECTED'"
        (click)="setFilter('REJECTED')"
        [attr.aria-pressed]="selectedFilter() === 'REJECTED'"
      >
        Rejected ({{ rejectedCount() }})
      </button>

      <button
        type="button"
        class="filter-tab"
        [class.active]="selectedFilter() === 'CANCELLED'"
        (click)="setFilter('CANCELLED')"
        [attr.aria-pressed]="selectedFilter() === 'CANCELLED'"
      >
        Cancelled ({{ cancelledCount() }})
      </button>
    </nav>

    <!-- Main Content Area -->
    @if (loading()) {
      <div class="loading-state surface-card" role="status">
        <div class="loading-spinner" aria-hidden="true"></div>
        <p>Loading your requests…</p>
      </div>
    } @else if (!requests().length) {
      <!-- Empty State: No requests at all -->
      <section class="empty-state surface-card" aria-label="No requests found">
        <div class="empty-icon-wrap" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="empty-svg">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>
        <h2>No borrowing requests</h2>
        <p>When you request a catalogue book, its review progress and status will appear here.</p>
        <a class="button button-primary" routerLink="/workspace/books">Explore Books</a>
      </section>
    } @else if (!filteredRequests().length) {
      <!-- Empty Filter State: Filter matched 0 requests -->
      <section class="empty-filter surface-card" aria-label="No matching requests">
        <h3>No {{ selectedFilter().toLowerCase() }} requests found</h3>
        <p>There are currently no requests with this status in your history.</p>
        <button type="button" class="button button-secondary" (click)="setFilter('ALL')">
          View all requests ({{ requests().length }})
        </button>
      </section>
    } @else {
      <!-- Compact Horizontal Cards List -->
      <div class="request-cards-list" role="feed" aria-label="Borrowing requests list">
        @for (item of filteredRequests(); track item.id) {
          <article
            class="request-card surface-card"
            [class.is-expanded]="expandedRequestId() === item.id"
            aria-labelledby="'req-title-' + item.id"
          >
            <!-- Card Summary Header Row -->
            <div
              class="card-summary"
              (click)="toggleDetails(item.id)"
              role="button"
              tabindex="0"
              (keydown)="onCardKeydown($event, item.id)"
              [attr.aria-expanded]="expandedRequestId() === item.id"
              [attr.aria-controls]="'req-details-' + item.id"
              title="Click to view request details and review history"
            >
              <!-- Area 1: Book Thumbnail -->
              <div class="book-thumb-wrap">
                @if (item.coverImageUrl) {
                  <img
                    class="book-thumb"
                    [src]="item.coverImageUrl"
                    [alt]="'Cover of ' + item.bookTitle"
                    loading="lazy"
                  />
                } @else {
                  <div class="book-thumb book-thumb-fallback" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="book-icon">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                  </div>
                }
              </div>

              <!-- Area 2: Book Title and Author -->
              <div class="book-info">
                <h2 [id]="'req-title-' + item.id" class="book-title" [title]="item.bookTitle">
                  {{ item.bookTitle }}
                </h2>
                <p class="book-author">
                  {{ getAuthors(item.bookId) }}
                </p>
              </div>

              <!-- Area 3: Request Date -->
              <div class="request-meta">
                <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <div class="meta-text">
                  <span class="meta-label">Requested On</span>
                  <time class="meta-value" [attr.datetime]="item.submittedAt">
                    {{ displayDate(item.submittedAt) }}
                  </time>
                </div>
              </div>

              <!-- Area 4: Request Status Badge -->
              <div class="request-status-wrap">
                <span class="status-col-label">Status</span>
                <span class="status-badge" [ngClass]="getStatusBadgeClass(item.status)">
                  {{ statusLabel(item.status) }}
                </span>
              </div>

              <!-- Area 5: Right-Facing Arrow -->
              <div class="card-chevron" [class.rotated]="expandedRequestId() === item.id" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </div>

            <!-- Area 6: Expanded Details & History Drawer -->
            @if (expandedRequestId() === item.id) {
              <div [id]="'req-details-' + item.id" class="request-details-drawer" (click)="$event.stopPropagation()">
                <div class="drawer-header">
                  <h3>Request Review & History</h3>
                  <button
                    type="button"
                    class="btn-close-drawer"
                    (click)="toggleDetails(item.id)"
                    aria-label="Close details"
                  >
                    ✕
                  </button>
                </div>

                <!-- Review summary status -->
                <div class="review-status-card">
                  <div class="review-status-row">
                    <span class="review-field-label">Review Status:</span>
                    <strong class="review-field-val">
                      @if (item.status === 'PENDING') {
                        Awaiting librarian review
                      } @else if (item.status === 'APPROVED') {
                        Approved by library staff · Ready for copy allocation at circulation desk
                      } @else if (item.status === 'ISSUED') {
                        Book physical copy issued to your account
                      } @else {
                        Review completed ({{ statusLabel(item.status) }})
                      }
                    </strong>
                  </div>

                  @if (item.decidedAt) {
                    <div class="review-status-row">
                      <span class="review-field-label">Decision Date:</span>
                      <time class="review-field-val" [attr.datetime]="item.decidedAt">
                        {{ item.decidedAt | date:'medium' }}
                      </time>
                    </div>
                  }

                  @if (item.decisionReason) {
                    <div class="review-status-row reason-row">
                      <span class="review-field-label">Librarian Note:</span>
                      <p class="review-reason-text">{{ item.decisionReason }}</p>
                    </div>
                  }
                </div>

                <!-- Event History Timeline -->
                @if (item.history && item.history.length > 0) {
                  <div class="history-timeline-wrap">
                    <h4>Activity Timeline ({{ item.history.length }})</h4>
                    <ol class="history-timeline">
                      @for (event of item.history; track event.occurredAt + event.eventType) {
                        <li class="timeline-item">
                          <span class="timeline-bullet" aria-hidden="true"></span>
                          <div class="timeline-content">
                            <div class="timeline-header">
                              <strong class="timeline-type">{{ formatEventType(event.eventType) }}</strong>
                              <time class="timeline-time" [attr.datetime]="event.occurredAt">
                                {{ event.occurredAt | date:'medium' }}
                              </time>
                            </div>
                            <span class="timeline-actor">{{ event.actorEmail }}</span>
                            @if (event.reason) {
                              <p class="timeline-note">{{ event.reason }}</p>
                            }
                          </div>
                        </li>
                      }
                    </ol>
                  </div>
                }
              </div>
            }
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

    .total-badge {
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

    /* Alert */
    .alert-error {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.25rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      background: #FEE2E2;
      color: #991B1B;
      border: 1px solid #FECACA;
      font-size: 0.875rem;
    }

    .btn-retry {
      padding: 0.25rem 0.65rem;
      border: 1px solid #B91C1C;
      background: transparent;
      color: #991B1B;
      font-weight: 600;
      font-size: 0.8rem;
      border-radius: 6px;
      cursor: pointer;
    }

    .btn-retry:hover {
      background: #FCA5A5;
    }

    /* Filter Tabs */
    .filter-tabs {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 1.5rem;
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
    .loading-state, .empty-state, .empty-filter {
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

    .empty-state p, .empty-filter p {
      font-size: 0.9rem;
      color: #5A625D;
      max-width: 26rem;
      margin: 0 auto 1.25rem;
      line-height: 1.4;
    }

    /* Cards List */
    .request-cards-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .request-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      overflow: hidden;
    }

    .request-card:hover {
      border-color: #CBD5E1;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
    }

    .request-card.is-expanded {
      border-color: #C2D6CF;
      box-shadow: 0 4px 14px rgba(0, 61, 48, 0.08);
    }

    /* Card Summary Row matching Reference 1 Mockup */
    .card-summary {
      display: grid;
      grid-template-columns: 56px minmax(200px, 2fr) minmax(160px, 1.2fr) minmax(130px, 1fr) 28px;
      align-items: center;
      gap: 1.25rem;
      padding: 0.95rem 1.4rem;
      cursor: pointer;
      user-select: none;
      outline: none;
      transition: background 0.12s ease;
    }

    .card-summary:hover {
      background: #FAF9F6;
    }

    .card-summary:focus-visible {
      outline: 2px solid #003D30;
      outline-offset: -2px;
    }

    /* Area 1: Book Thumbnail */
    .book-thumb-wrap {
      width: 52px;
      height: 72px;
      flex-shrink: 0;
      border-radius: 6px;
      overflow: hidden;
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    }

    .book-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .book-thumb-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #EAF2EF;
      color: #003D30;
    }

    .book-icon {
      width: 1.5rem;
      height: 1.5rem;
      opacity: 0.85;
    }

    /* Area 2: Book Info */
    .book-info {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .book-title {
      font-family: var(--font-sans);
      font-size: 1.02rem;
      font-weight: 700;
      color: #1F2421;
      margin: 0;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .book-author {
      font-size: 0.86rem;
      color: #5A625D;
      margin: 0;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Area 3: Requested Date */
    .request-meta {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      min-width: 0;
    }

    .meta-icon {
      width: 1.25rem;
      height: 1.25rem;
      color: #4A5568;
      flex-shrink: 0;
    }

    .meta-text {
      display: flex;
      flex-direction: column;
      line-height: 1.3;
      min-width: 0;
    }

    .meta-label {
      font-size: 0.74rem;
      color: #718096;
      font-weight: 500;
    }

    .meta-value {
      font-size: 0.88rem;
      color: #1F2421;
      font-weight: 600;
      white-space: nowrap;
    }

    /* Area 4: Status */
    .request-status-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }

    .status-col-label {
      font-size: 0.74rem;
      color: #718096;
      font-weight: 500;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: fit-content;
      padding: 0.25rem 0.85rem;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 650;
      line-height: 1.25;
      white-space: nowrap;
    }

    .badge-pending {
      background: #FEF3C7;
      color: #92400E;
      border: 1px solid #FDE68A;
    }

    .badge-approved {
      background: #DCFCE7;
      color: #15803D;
      border: 1px solid #BBF7D0;
    }

    .badge-rejected {
      background: #FEE2E2;
      color: #B91C1C;
      border: 1px solid #FECACA;
    }

    .badge-cancelled {
      background: #F3F4F6;
      color: #4B5563;
      border: 1px solid #E5E7EB;
    }

    /* Area 5: Arrow Chevron */
    .card-chevron {
      display: grid;
      place-items: center;
      width: 1.5rem;
      height: 1.5rem;
      color: #718096;
      transition: transform 0.2s ease, color 0.15s ease;
      margin-left: auto;
    }

    .card-chevron svg {
      width: 1.15rem;
      height: 1.15rem;
    }

    .card-chevron.rotated {
      transform: rotate(90deg);
      color: #003D30;
    }

    /* Area 6: Expanded Details Drawer */
    .request-details-drawer {
      background: #FAF9F6;
      border-top: 1px solid #E5E0D5;
      padding: 1.25rem 1.6rem 1.5rem;
      animation: fadeIn 0.15s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .drawer-header h3 {
      font-family: var(--font-sans);
      font-size: 0.95rem;
      font-weight: 700;
      color: #1F2421;
      margin: 0;
    }

    .btn-close-drawer {
      border: 0;
      background: transparent;
      color: #718096;
      font-size: 1rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }

    .btn-close-drawer:hover {
      color: #1F2421;
      background: #E5E0D5;
    }

    .review-status-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 0.85rem 1.15rem;
      margin-bottom: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .review-status-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-size: 0.85rem;
    }

    .review-status-row.reason-row {
      align-items: flex-start;
      margin-top: 0.2rem;
    }

    .review-field-label {
      color: #718096;
      font-weight: 500;
      min-width: 105px;
    }

    .review-field-val {
      color: #1F2421;
      font-weight: 600;
    }

    .review-reason-text {
      margin: 0;
      color: #4A5568;
      font-style: italic;
    }

    /* History Timeline */
    .history-timeline-wrap h4 {
      font-size: 0.85rem;
      font-weight: 700;
      color: #4A5568;
      margin: 0 0 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .history-timeline {
      list-style: none;
      padding: 0;
      margin: 0;
      position: relative;
    }

    .history-timeline::before {
      content: "";
      position: absolute;
      top: 0.5rem;
      bottom: 0.5rem;
      left: 6px;
      width: 2px;
      background: #CBD5E1;
    }

    .timeline-item {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding-bottom: 1rem;
    }

    .timeline-item:last-child {
      padding-bottom: 0;
    }

    .timeline-bullet {
      position: relative;
      z-index: 2;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 3px solid #003D30;
      flex-shrink: 0;
      margin-top: 0.25rem;
    }

    .timeline-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      font-size: 0.85rem;
    }

    .timeline-header {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }

    .timeline-type {
      color: #1F2421;
      font-weight: 600;
    }

    .timeline-time {
      color: #718096;
      font-size: 0.78rem;
    }

    .timeline-actor {
      color: #5A625D;
      font-size: 0.78rem;
    }

    .timeline-note {
      margin: 0.25rem 0 0;
      color: #4A5568;
      background: #FFFFFF;
      padding: 0.4rem 0.65rem;
      border-radius: 6px;
      border: 1px solid #E2E8F0;
      font-size: 0.82rem;
    }

    /* Responsive */
    @media (max-width: 900px) {
      .card-summary {
        grid-template-columns: 52px 1.5fr 1fr auto;
        gap: 1rem;
        padding: 0.85rem 1.1rem;
      }
      .request-status-wrap {
        grid-column: 3;
      }
      .card-chevron {
        grid-column: 4;
      }
    }

    @media (max-width: 720px) {
      .card-summary {
        grid-template-columns: 48px 1fr auto;
        gap: 0.85rem;
      }
      .request-meta {
        grid-column: 2;
        margin-top: 0.25rem;
      }
      .request-status-wrap {
        grid-column: 2;
        margin-top: 0.25rem;
      }
      .card-chevron {
        grid-column: 3;
        grid-row: 1 / span 3;
      }
    }

    @media (max-width: 520px) {
      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }
      .header-right {
        margin-top: 0;
      }
      .card-summary {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }
      .card-chevron {
        display: none;
      }
    }
  `]
})
export class MyRequestsComponent implements OnInit {
  private readonly service = inject(BorrowingService);
  private readonly catalogueService = inject(CatalogueService);
  private readonly router = inject(Router);

  readonly requests = signal<BorrowRequestRecord[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly selectedFilter = signal<RequestFilterTab>('ALL');
  readonly expandedRequestId = signal<string | null>(null);
  readonly authorMap = signal<Record<string, string>>({});

  readonly pendingCount = computed(() =>
    this.requests().filter(r => r.status === 'PENDING').length
  );

  readonly approvedCount = computed(() =>
    this.requests().filter(r => r.status === 'APPROVED' || r.status === 'ISSUED').length
  );

  readonly rejectedCount = computed(() =>
    this.requests().filter(r => r.status === 'REJECTED').length
  );

  readonly cancelledCount = computed(() =>
    this.requests().filter(r => (r.status as string) === 'CANCELLED').length
  );

  readonly filteredRequests = computed(() => {
    const list = this.requests();
    const filter = this.selectedFilter();
    switch (filter) {
      case 'PENDING':
        return list.filter(r => r.status === 'PENDING');
      case 'APPROVED':
        return list.filter(r => r.status === 'APPROVED' || r.status === 'ISSUED');
      case 'REJECTED':
        return list.filter(r => r.status === 'REJECTED');
      case 'CANCELLED':
        return list.filter(r => (r.status as string) === 'CANCELLED');
      case 'ALL':
      default:
        return list;
    }
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.service.myRequests()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: page => {
          const content = page?.content || [];
          this.requests.set(content);
          this.fetchAuthorsForRequests(content);
        },
        error: e => {
          if (e?.status === 401) {
            void this.router.navigateByUrl('/login');
          } else {
            this.error.set('Your requests could not be loaded. Please try again.');
          }
        }
      });
  }

  private fetchAuthorsForRequests(items: BorrowRequestRecord[]): void {
    const uniqueIds = Array.from(new Set(items.map(i => i.bookId).filter(Boolean)));
    for (const bookId of uniqueIds) {
      if (!this.authorMap()[bookId]) {
        this.catalogueService.get(bookId).subscribe({
          next: detail => {
            if (detail?.authors && detail.authors.length > 0) {
              const formatted = detail.authors.join(', ');
              this.authorMap.update(map => ({ ...map, [bookId]: formatted }));
            }
          },
          error: () => {
            // Silently fall back to default if catalogue detail isn't available
          }
        });
      }
    }
  }

  getAuthors(bookId: string): string {
    return this.authorMap()[bookId] || 'Academic Collection';
  }

  setFilter(filter: RequestFilterTab): void {
    this.selectedFilter.set(filter);
  }

  toggleDetails(id: string): void {
    this.expandedRequestId.update(cur => (cur === id ? null : id));
  }

  onCardKeydown(event: KeyboardEvent, id: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleDetails(id);
    }
  }

  statusLabel(status: BorrowRequestStatus | string): string {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'APPROVED':
        return 'Approved';
      case 'ISSUED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }

  getStatusBadgeClass(status: BorrowRequestStatus | string): string {
    switch (status) {
      case 'PENDING':
        return 'badge-pending';
      case 'APPROVED':
      case 'ISSUED':
        return 'badge-approved';
      case 'REJECTED':
        return 'badge-rejected';
      case 'CANCELLED':
        return 'badge-cancelled';
      default:
        return 'badge-pending';
    }
  }

  formatEventType(type: string): string {
    if (!type) return 'Request Event';
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  displayDate(isoValue: string | null): string {
    if (!isoValue) return '—';
    try {
      const d = new Date(isoValue);
      if (isNaN(d.getTime())) return isoValue;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return isoValue;
    }
  }
}
