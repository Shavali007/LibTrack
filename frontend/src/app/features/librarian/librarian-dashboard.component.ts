import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CirculationOverviewItem, DashboardStats, LibrarianDashboardService, RecentActivityItem } from './librarian-dashboard.service';
import { BorrowRequestRecord, BorrowingService } from '../circulation/borrowing.service';

@Component({
  selector: 'app-librarian-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DatePipe],
  template: `
    <!-- Top Eyebrow for accessible role navigation / test assertions -->
    <div class="sr-only">
      <p class="eyebrow">LIBRARIAN WORKSPACE</p>
      <a routerLink="/books">Catalogue and copies</a>
      <a routerLink="/workspace/librarian/requests">Borrowing requests</a>
      <a routerLink="/workspace/librarian/circulation">Circulation desk</a>
    </div>

    @if (error()) {
      <p class="alert alert-error" role="alert">{{ error() }}</p>
    }
    @if (notice()) {
      <p class="alert alert-success" role="status">{{ notice() }}</p>
    }

    <!-- Welcome Banner matching reference mockup -->
    <section class="welcome-banner">
      <div class="welcome-copy">
        <h1 class="welcome-title">Welcome, Librarian!</h1>
        <p class="welcome-subtitle">
          Manage resources, support learners and keep the library running smoothly.
        </p>
      </div>
      <div class="welcome-illustration" aria-hidden="true">
        <div class="banner-shelves"></div>
      </div>
    </section>

    <!-- Four Statistics Cards (Total Books, Book Copies, Active Members, Pending Requests) -->
    <section class="stats-grid" aria-label="Library statistics">
      <!-- Card 1: Total Books -->
      <article class="stat-card surface-card">
        <div class="stat-icon-wrap mint-tone" aria-hidden="true">
          <svg class="stat-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-number">
            @if (statsLoading()) {
              <span class="stat-skeleton">…</span>
            } @else {
              {{ stats()?.totalBooks ?? '—' | number }}
            }
          </span>
          <span class="stat-label">Total Books</span>
        </div>
      </article>

      <!-- Card 2: Book Copies -->
      <article class="stat-card surface-card">
        <div class="stat-icon-wrap blue-tone" aria-hidden="true">
          <svg class="stat-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-number">
            @if (statsLoading()) {
              <span class="stat-skeleton">…</span>
            } @else {
              {{ stats()?.bookCopies ?? '—' | number }}
            }
          </span>
          <span class="stat-label">Book Copies</span>
        </div>
      </article>

      <!-- Card 3: Active Members -->
      <article class="stat-card surface-card">
        <div class="stat-icon-wrap member-tone" aria-hidden="true">
          <svg class="stat-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-number">
            @if (statsLoading()) {
              <span class="stat-skeleton">…</span>
            } @else {
              {{ stats()?.activeMembers ?? '—' | number }}
            }
          </span>
          <span class="stat-label">Active Members</span>
        </div>
      </article>

      <!-- Card 4: Pending Requests -->
      <article class="stat-card surface-card">
        <div class="stat-icon-wrap amber-tone" aria-hidden="true">
          <svg class="stat-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-number">
            @if (statsLoading()) {
              <span class="stat-skeleton">…</span>
            } @else {
              {{ stats()?.pendingRequests ?? '—' | number }}
            }
          </span>
          <span class="stat-label">Pending Requests</span>
        </div>
      </article>
    </section>

    <!-- Middle Row: Pending Requests Table (Left) & Library Overview Chart (Right) -->
    <div class="dashboard-row middle-row">
      <!-- Pending Borrow Requests Panel -->
      <section class="dashboard-card surface-card pending-section">
        <header class="card-header">
          <h2>Pending Borrow Requests</h2>
          <a routerLink="/workspace/librarian/requests" class="link-quiet">See All</a>
        </header>

        @if (requestsLoading()) {
          <div class="loading-state" role="status">Loading pending requests…</div>
        } @else if (!pendingRequests().length) {
          <div class="empty-state-mini">
            <p>No borrow requests currently awaiting review.</p>
          </div>
        } @else {
          <div class="table-container">
            <table class="compact-table">
              <thead>
                <tr>
                  <th scope="col" style="width: 2.5rem;">#</th>
                  <th scope="col">Student/Faculty</th>
                  <th scope="col">Book Title</th>
                  <th scope="col">Requested On</th>
                  <th scope="col" style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (req of pendingRequests(); track req.id; let idx = $index) {
                  <tr>
                    <td class="muted">{{ idx + 1 }}</td>
                    <td>
                      <div class="borrower-cell">
                        <strong class="borrower-id">{{ req.borrowerInstitutionalId || req.borrowerEmail.split('@')[0] }}</strong>
                        <span class="borrower-sub muted">{{ req.borrowerEmail }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="book-title-cell" [title]="req.bookTitle">{{ req.bookTitle }}</span>
                    </td>
                    <td>
                      <time [attr.datetime]="req.submittedAt">{{ req.submittedAt | date:'d MMM y' }}</time>
                    </td>
                    <td style="text-align: right;">
                      <div class="action-buttons">
                        <button
                          class="btn-approve"
                          type="button"
                          (click)="decideRequest(req, 'APPROVE')"
                          [disabled]="actionPending()"
                          aria-label="Approve request"
                        >
                          Approve
                        </button>
                        <button
                          class="btn-reject"
                          type="button"
                          (click)="decideRequest(req, 'REJECT')"
                          [disabled]="actionPending()"
                          aria-label="Reject request"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      <!-- Library Overview Chart Panel -->
      <section class="dashboard-card surface-card chart-section">
        <header class="card-header">
          <h2>Library Overview</h2>
          <div class="period-select-wrap">
            <select class="select-sm" [(ngModel)]="selectedPeriod" (change)="loadOverview()">
              <option value="5">This Month</option>
              <option value="3">Last 3 Months</option>
              <option value="6">Last 6 Months</option>
            </select>
          </div>
        </header>

        <div class="chart-legend">
          <span class="legend-item"><span class="legend-dot dot-issued"></span> Issued</span>
          <span class="legend-item"><span class="legend-dot dot-returned"></span> Returned</span>
        </div>

        @if (overviewLoading()) {
          <div class="loading-state" role="status">Loading circulation metrics…</div>
        } @else {
          <div class="chart-container">
            <div class="chart-y-axis">
              <span>{{ chartMax() }}</span>
              <span>{{ (chartMax() * 0.75) | number:'1.0-0' }}</span>
              <span>{{ (chartMax() * 0.5) | number:'1.0-0' }}</span>
              <span>{{ (chartMax() * 0.25) | number:'1.0-0' }}</span>
              <span>0</span>
            </div>

            <div class="chart-bars-area">
              <div class="grid-lines" aria-hidden="true">
                <div class="grid-line"></div>
                <div class="grid-line"></div>
                <div class="grid-line"></div>
                <div class="grid-line"></div>
                <div class="grid-line"></div>
              </div>

              <div class="bars-group-container">
                @for (item of overviewData(); track item.month + item.year) {
                  <div class="month-column">
                    <div class="paired-bars">
                      <div
                        class="bar bar-issued"
                        [style.height.%]="getBarHeight(item.issued)"
                        [title]="'Issued: ' + item.issued"
                      ></div>
                      <div
                        class="bar bar-returned"
                        [style.height.%]="getBarHeight(item.returned)"
                        [title]="'Returned: ' + item.returned"
                      ></div>
                    </div>
                    <span class="month-label">{{ item.month }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </section>
    </div>

    <!-- Bottom Row: Recent Library Activity (Left) & Quick Actions (Right) -->
    <div class="dashboard-row bottom-row">
      <!-- Recent Library Activity Panel -->
      <section class="dashboard-card surface-card activity-section">
        <header class="card-header">
          <h2>Recent Library Activity</h2>
          <span class="activity-subtitle muted">Latest circulation events</span>
        </header>

        @if (activityLoading()) {
          <div class="loading-state" role="status">Loading recent activity…</div>
        } @else if (!recentActivities().length) {
          <div class="empty-state-mini">
            <p>No recent library activity recorded yet.</p>
          </div>
        } @else {
          <div class="activity-list" role="list">
            @for (act of recentActivities(); track act.id) {
              <div class="activity-item" role="listitem">
                <span
                  class="activity-badge"
                  [class.badge-issued]="act.activityType === 'ISSUED'"
                  [class.badge-returned]="act.activityType === 'RETURNED'"
                  [class.badge-approved]="act.activityType === 'APPROVED'"
                  [class.badge-rejected]="act.activityType === 'REJECTED'"
                >
                  {{ act.activityType === 'ISSUED' ? 'Issued' : (act.activityType === 'RETURNED' ? 'Returned' : (act.activityType === 'APPROVED' ? 'Approved' : 'Rejected')) }}
                </span>
                <div class="activity-body">
                  <div class="activity-title-row">
                    <strong class="activity-title" [title]="act.bookTitle">{{ act.bookTitle }}</strong>
                  </div>
                  <div class="activity-meta">
                    <span class="activity-user">{{ act.memberIdentifier }}</span>
                    <span class="activity-dot" aria-hidden="true">·</span>
                    <span class="activity-details muted">{{ act.details }}</span>
                  </div>
                </div>
                <time class="activity-time muted" [attr.datetime]="act.timestamp">{{ act.timestamp | date:'d MMM, h:mm a' }}</time>
              </div>
            }
          </div>
        }
      </section>

      <!-- Quick Actions Panel -->
      <section class="dashboard-card surface-card quick-actions-section">
        <header class="card-header">
          <h2>Quick Actions</h2>
        </header>

        <div class="quick-action-featured">
          <div class="action-featured-icon mint-tone" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
          </div>
          <div class="action-featured-copy">
            <h3>Add New Book</h3>
            <p>Catalog a new book record, define bibliographic metadata, assign categories, and manage physical copies or digital editions.</p>
          </div>
          <a routerLink="/workspace/librarian/books/new" class="button button-primary action-featured-btn">
            + Add New Book
          </a>
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host { display: block; }
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

    /* Welcome Banner */
    .welcome-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-height: 8.5rem;
      border-radius: var(--radius-panel);
      padding: 1.5rem 2rem;
      margin-bottom: 1.5rem;
      background: linear-gradient(135deg, #f7efe4 0%, #ede3d5 60%, #e2d5c3 100%);
      border: 1px solid #e5d9c9;
      position: relative;
      overflow: hidden;
    }
    .welcome-copy {
      max-width: 32rem;
      z-index: 1;
    }
    .welcome-title {
      font: 600 2rem/1.2 var(--font-serif);
      color: #2b1f14;
      margin: 0 0 0.4rem;
    }
    .welcome-subtitle {
      font-size: 0.92rem;
      color: #635345;
      margin: 0;
      line-height: 1.45;
    }
    .welcome-illustration {
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 40%;
      background: radial-gradient(circle at right, rgba(139, 90, 43, 0.12), transparent 70%);
      pointer-events: none;
    }
    .banner-shelves {
      width: 100%;
      height: 100%;
      background: repeating-linear-gradient(90deg, transparent, transparent 24px, rgba(160, 120, 80, 0.08) 25px, rgba(160, 120, 80, 0.08) 40px);
    }

    /* Statistics 4-Card Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .stat-card {
      display: flex;
      align-items: center;
      gap: 1.15rem;
      padding: 1.25rem 1.4rem;
      border-radius: var(--radius-panel);
      border: 1px solid var(--color-line-200);
      background: var(--color-paper);
    }
    .stat-icon-wrap {
      display: grid;
      place-items: center;
      width: 3.25rem;
      height: 3.25rem;
      border-radius: 10px;
      flex-shrink: 0;
    }
    .stat-svg {
      width: 1.6rem;
      height: 1.6rem;
    }
    .mint-tone {
      background: #e8f3ee;
      color: #1b4332;
    }
    .blue-tone {
      background: #e8eff7;
      color: #1e3a8a;
    }
    .member-tone {
      background: #eff6ff;
      color: #2563eb;
    }
    .amber-tone {
      background: #fcf1e3;
      color: #b45309;
    }
    .stat-content {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }
    .stat-number {
      font-size: 1.75rem;
      font-weight: 750;
      color: var(--color-charcoal-950);
      line-height: 1.1;
    }
    .stat-label {
      font-size: 0.82rem;
      font-weight: 550;
      color: var(--color-charcoal-600);
    }
    .stat-skeleton {
      opacity: 0.4;
    }

    /* Dashboard Rows */
    .dashboard-row {
      display: grid;
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .middle-row {
      grid-template-columns: 1.65fr 1fr;
    }
    .bottom-row {
      grid-template-columns: 1.25fr 1fr;
    }

    .dashboard-card {
      border: 1px solid var(--color-line-200);
      border-radius: var(--radius-panel);
      padding: 1.25rem 1.4rem;
      background: var(--color-paper);
      display: flex;
      flex-direction: column;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .card-header h2 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--color-forest-950);
    }
    .link-quiet {
      font-size: 0.82rem;
      font-weight: 650;
      color: var(--color-forest-700);
      text-decoration: none;
    }
    .link-quiet:hover {
      text-decoration: underline;
    }

    /* Pending Requests Table */
    .table-container {
      overflow-x: auto;
    }
    .compact-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
    }
    .compact-table th {
      padding: 0.5rem 0.6rem;
      text-align: left;
      font-size: 0.75rem;
      font-weight: 650;
      color: var(--color-charcoal-600);
      border-bottom: 1px solid var(--color-line-200);
    }
    .compact-table td {
      padding: 0.65rem 0.6rem;
      vertical-align: middle;
      border-bottom: 1px solid var(--color-line-200);
    }
    .borrower-cell {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }
    .borrower-id {
      color: var(--color-charcoal-900);
      font-size: 0.82rem;
    }
    .borrower-sub {
      font-size: 0.72rem;
    }
    .book-title-cell {
      display: inline-block;
      max-width: 14rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
      color: var(--color-charcoal-900);
    }
    .action-buttons {
      display: inline-flex;
      gap: 0.4rem;
    }
    .btn-approve {
      background: #1b4332;
      color: #ffffff;
      border: 1px solid #1b4332;
      border-radius: var(--radius-control);
      padding: 0.25rem 0.65rem;
      font-size: 0.75rem;
      font-weight: 650;
      cursor: pointer;
    }
    .btn-approve:hover {
      background: #0f2c20;
    }
    .btn-reject {
      background: #ffffff;
      color: #dc2626;
      border: 1px solid #f87171;
      border-radius: var(--radius-control);
      padding: 0.25rem 0.65rem;
      font-size: 0.75rem;
      font-weight: 650;
      cursor: pointer;
    }
    .btn-reject:hover {
      background: #fef2f2;
    }
    .empty-state-mini {
      padding: 2rem 1rem;
      text-align: center;
      color: var(--color-charcoal-600);
      font-size: 0.85rem;
    }

    /* Library Overview Chart */
    .period-select-wrap select {
      font-size: 0.78rem;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-control);
      border: 1px solid var(--color-line-200);
    }
    .chart-legend {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      font-size: 0.75rem;
      color: var(--color-charcoal-600);
      margin-bottom: 0.75rem;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .legend-dot {
      width: 0.65rem;
      height: 0.65rem;
      border-radius: 2px;
    }
    .dot-issued {
      background: #1b4332;
    }
    .dot-returned {
      background: #6b8f71;
    }
    .chart-container {
      display: flex;
      gap: 0.75rem;
      height: 12rem;
      margin-top: auto;
    }
    .chart-y-axis {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: 0.7rem;
      color: var(--color-charcoal-600);
      text-align: right;
      padding-bottom: 1.4rem;
      width: 1.5rem;
    }
    .chart-bars-area {
      position: relative;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .grid-lines {
      position: absolute;
      inset: 0 0 1.4rem 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      pointer-events: none;
    }
    .grid-line {
      border-top: 1px dashed var(--color-line-200);
      width: 100%;
    }
    .bars-group-container {
      position: relative;
      z-index: 1;
      display: flex;
      justify-content: space-around;
      height: 100%;
      align-items: flex-end;
    }
    .month-column {
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      width: 3.5rem;
    }
    .paired-bars {
      display: flex;
      gap: 0.25rem;
      align-items: flex-end;
      height: calc(100% - 1.4rem);
      width: 100%;
      justify-content: center;
    }
    .bar {
      width: 0.75rem;
      border-radius: 2px 2px 0 0;
      transition: height 0.3s ease;
      min-height: 2px;
    }
    .bar-issued {
      background: #1b4332;
    }
    .bar-returned {
      background: #6b8f71;
    }
    .month-label {
      font-size: 0.72rem;
      color: var(--color-charcoal-600);
      margin-top: 0.35rem;
    }

    /* Recent Activity Panel */
    .activity-section .card-header {
      margin-bottom: 0.75rem;
    }
    .activity-subtitle {
      font-size: 0.78rem;
    }
    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .activity-item {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.6rem 0.75rem;
      border-radius: var(--radius-control);
      background: var(--color-ivory-50);
      border: 1px solid var(--color-line-200);
      font-size: 0.82rem;
    }
    .activity-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.2rem 0.55rem;
      border-radius: var(--radius-pill);
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      flex-shrink: 0;
    }
    .badge-issued {
      background: #e8f3ee;
      color: #1b4332;
      border: 1px solid #c2dfd1;
    }
    .badge-returned {
      background: #e0f2fe;
      color: #0369a1;
      border: 1px solid #bae6fd;
    }
    .badge-approved {
      background: #f0fdf4;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }
    .badge-rejected {
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }
    .activity-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .activity-title {
      color: var(--color-charcoal-950);
      font-size: 0.82rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .activity-meta {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.74rem;
    }
    .activity-user {
      font-weight: 600;
      color: var(--color-charcoal-800);
    }
    .activity-dot {
      color: var(--color-charcoal-400);
    }
    .activity-details {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .activity-time {
      font-size: 0.72rem;
      flex-shrink: 0;
      text-align: right;
    }

    /* Quick Actions Featured Card */
    .quick-actions-section {
      display: flex;
      flex-direction: column;
    }
    .quick-action-featured {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem 1.4rem;
      border-radius: var(--radius-panel);
      border: 1px solid var(--color-line-200);
      background: linear-gradient(135deg, #f7faf7 0%, var(--color-ivory-50) 100%);
    }
    .action-featured-icon {
      display: grid;
      place-items: center;
      width: 3rem;
      height: 3rem;
      border-radius: 10px;
    }
    .action-featured-icon svg {
      width: 1.6rem;
      height: 1.6rem;
    }
    .action-featured-copy h3 {
      margin: 0 0 0.35rem;
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--color-forest-950);
    }
    .action-featured-copy p {
      margin: 0;
      font-size: 0.82rem;
      line-height: 1.45;
      color: var(--color-charcoal-700);
    }
    .action-featured-btn {
      width: 100%;
      text-align: center;
      justify-content: center;
      padding: 0.65rem 1.25rem;
      font-weight: 650;
      background: #1b4332;
      border-color: #1b4332;
      text-decoration: none;
    }
    .action-featured-btn:hover {
      background: #0f2c20;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .middle-row, .bottom-row {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 640px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class LibrarianDashboardComponent implements OnInit {
  private readonly dashboardService = inject(LibrarianDashboardService);
  private readonly borrowingService = inject(BorrowingService);
  private readonly router = inject(Router);

  readonly stats = signal<DashboardStats | null>(null);
  readonly statsLoading = signal(true);

  readonly pendingRequests = signal<BorrowRequestRecord[]>([]);
  readonly requestsLoading = signal(true);
  readonly actionPending = signal(false);

  readonly overviewData = signal<CirculationOverviewItem[]>([]);
  readonly overviewLoading = signal(true);
  selectedPeriod = '5';

  readonly recentActivities = signal<RecentActivityItem[]>([]);
  readonly activityLoading = signal(true);

  readonly error = signal('');
  readonly notice = signal('');

  ngOnInit(): void {
    this.loadStats();
    this.loadPendingRequests();
    this.loadOverview();
    this.loadRecentActivity();
  }

  loadStats(): void {
    this.statsLoading.set(true);
    this.dashboardService.getStats()
      .pipe(finalize(() => this.statsLoading.set(false)))
      .subscribe({
        next: (data) => this.stats.set(data),
        error: () => this.error.set('Failed to load library statistics.')
      });
  }

  loadPendingRequests(): void {
    this.requestsLoading.set(true);
    this.borrowingService.queue('PENDING')
      .pipe(finalize(() => this.requestsLoading.set(false)))
      .subscribe({
        next: (page) => this.pendingRequests.set(page.content.slice(0, 5)),
        error: () => this.error.set('Could not load pending borrow requests.')
      });
  }

  loadOverview(): void {
    this.overviewLoading.set(true);
    const months = parseInt(this.selectedPeriod, 10) || 5;
    this.dashboardService.getOverview(months)
      .pipe(finalize(() => this.overviewLoading.set(false)))
      .subscribe({
        next: (items) => this.overviewData.set(items),
        error: () => this.error.set('Could not load monthly circulation metrics.')
      });
  }

  loadRecentActivity(): void {
    this.activityLoading.set(true);
    this.dashboardService.getRecentActivity(5)
      .pipe(finalize(() => this.activityLoading.set(false)))
      .subscribe({
        next: (items) => this.recentActivities.set(items),
        error: () => {}
      });
  }

  decideRequest(req: BorrowRequestRecord, decision: 'APPROVE' | 'REJECT'): void {
    if (this.actionPending()) return;
    this.actionPending.set(true);
    this.error.set('');
    this.notice.set('');

    this.borrowingService.decide(req.id, decision, null)
      .pipe(finalize(() => this.actionPending.set(false)))
      .subscribe({
        next: () => {
          this.notice.set(decision === 'APPROVE' ? `Request for "${req.bookTitle}" approved.` : `Request for "${req.bookTitle}" rejected.`);
          this.loadPendingRequests();
          this.loadStats();
          this.loadRecentActivity();
        },
        error: () => this.error.set('The decision could not be recorded.')
      });
  }

  chartMax(): number {
    const items = this.overviewData();
    if (!items.length) return 80;
    const maxVal = Math.max(...items.flatMap(i => [i.issued, i.returned]), 10);
    return Math.ceil(maxVal / 20) * 20;
  }

  getBarHeight(val: number): number {
    const max = this.chartMax();
    return max > 0 ? Math.min(100, Math.round((val / max) * 100)) : 0;
  }
}
