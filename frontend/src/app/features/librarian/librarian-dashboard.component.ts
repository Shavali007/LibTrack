import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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

    <!-- Welcome Banner matching Reference Mockup -->
    <section class="welcome-banner">
      <div class="welcome-left">
        <span class="welcome-eyebrow">WELCOME BACK,</span>
        <h1 class="welcome-title">
          Librarian!
          <svg class="welcome-sprout" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 10a6 6 0 0 0-6-6H3v2a6 6 0 0 0 6 6h3"></path>
            <path d="M12 14a6 6 0 0 1 6-6h3v2a6 6 0 0 1-6 6h-3"></path>
            <path d="M12 22V10"></path>
          </svg>
        </h1>
        <p class="welcome-subtitle">
          Manage resources, support learners and keep the library running smoothly.
        </p>
      </div>

      <!-- Right photographic plant & books asset pinned to right bottom -->
      <div class="welcome-asset-wrap" aria-hidden="true">
        <img src="/assets/banner-plant-books.png" alt="" class="banner-plant-img" />
      </div>
    </section>

    <!-- Four Statistics Cards (Total Books, Book Copies, Active Members, Pending Requests) -->
    <section class="stats-grid" aria-label="Library statistics">
      <!-- Card 1: Total Books -->
      <article class="stat-card surface-card">
        <div class="stat-icon-wrap mint-tone" aria-hidden="true">
          <svg class="stat-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
        <div class="stat-icon-wrap indigo-tone" aria-hidden="true">
          <svg class="stat-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
          <svg class="stat-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
          <svg class="stat-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <circle cx="14" cy="14" r="4"></circle>
            <polyline points="14 12 14 14 15.5 15"></polyline>
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

    <!-- Bottom Section: Pending Requests Table (Left) & Library Overview Chart (Right) -->
    <!-- The dashboard ends after these two cards. Recent Activity & Quick Actions are removed. -->
    <div class="dashboard-grid-bottom">
      <!-- Pending Borrow Requests Panel -->
      <section class="bottom-panel pending-section surface-card">
        <header class="panel-header">
          <h2>Pending Borrow Requests</h2>
          <a routerLink="/workspace/librarian/requests" class="see-all-link">See All &rarr;</a>
        </header>

        @if (requestsLoading()) {
          <div class="loading-state" role="status">Loading pending requests…</div>
        } @else if (!pendingRequests().length) {
          <div class="empty-requests-wrap">
            <div class="empty-icon-circle" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <circle cx="14" cy="14" r="5" stroke-width="1.6"></circle>
                <polyline points="14 12 14 14 15.5 15"></polyline>
              </svg>
            </div>
            <p class="empty-title">No borrow requests currently awaiting review.</p>
            <p class="empty-subtitle">All clear! New requests will appear here.</p>
          </div>
        } @else {
          <div class="table-container">
            <table class="requests-table">
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
                        <strong class="borrower-id">{{ req.borrowerDisplayName || req.borrowerInstitutionalId || req.borrowerEmail.split('@')[0] }}</strong>
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
      <section class="bottom-panel chart-panel surface-card">
        <header class="panel-header">
          <h2>Library Overview</h2>
          <div class="period-select-wrap">
            <select class="period-select" [(ngModel)]="selectedPeriod" (change)="loadOverview()">
              <option value="5">This Month</option>
              <option value="3">Last 3 Months</option>
              <option value="6">Last 6 Months</option>
            </select>
          </div>
        </header>

        <div class="chart-legend">
          <span class="legend-item"><span class="legend-square square-issued"></span> Issued</span>
          <span class="legend-item"><span class="legend-square square-returned"></span> Returned</span>
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
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
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

    /* Welcome Banner - Proportionate to Reference Image */
    .welcome-banner {
      display: flex;
      align-items: center;
      min-height: 195px;
      height: clamp(185px, 22vh, 215px);
      border-radius: var(--radius-panel, 12px);
      margin-bottom: 1.25rem;
      background: #EFF1E6 url('/assets/banner-right.png') no-repeat right bottom / auto 100%;
      border: 1px solid #E5E8DE;
      position: relative;
      overflow: hidden;
      box-shadow: 0 1px 6px rgba(40, 30, 10, 0.03);
      flex-shrink: 0;
      padding: 2rem 2.5rem;
    }

    .welcome-left {
      display: flex;
      flex-direction: column;
      justify-content: center;
      z-index: 2;
      max-width: 580px;
    }

    .welcome-eyebrow {
      display: block;
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #5E6D64;
      margin-bottom: 0.35rem;
      text-transform: uppercase;
    }

    .welcome-title {
      font-family: var(--font-serif);
      font-size: clamp(2.3rem, 2.9vw, 2.85rem);
      font-weight: 700;
      color: #112A20;
      margin: 0;
      line-height: 1.1;
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .welcome-sprout {
      width: 1.9rem;
      height: 1.9rem;
      color: #003D30;
      flex-shrink: 0;
    }

    .welcome-subtitle {
      font-size: 0.95rem;
      color: #5A6860;
      margin: 0.55rem 0 0;
      line-height: 1.45;
    }

    .welcome-asset-wrap {
      position: absolute;
      right: 0;
      bottom: 0;
      height: 100%;
      z-index: 1;
      pointer-events: none;
    }

    .banner-plant-img {
      height: 100%;
      max-height: 215px;
      object-fit: contain;
      object-position: bottom right;
      display: block;
    }

    /* Statistics 4-Card Grid - Height: ~112px */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
      margin-bottom: 1.25rem;
      flex-shrink: 0;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding: 1.15rem 1.4rem;
      border-radius: var(--radius-panel, 12px);
      border: 1px solid #ECEAE3;
      background: #FFFFFF;
      height: clamp(105px, 12vh, 118px);
      min-height: 105px;
      box-shadow: 0 1px 4px rgba(10, 30, 20, 0.02);
      transition: box-shadow 0.2s ease, border-color 0.2s ease;
      box-sizing: border-box;
    }

    .stat-card:hover {
      border-color: #D8D4C8;
      box-shadow: 0 3px 10px rgba(10, 30, 20, 0.04);
    }

    .stat-icon-wrap {
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      border-radius: 12px;
      flex-shrink: 0;
    }

    .stat-svg {
      width: 28px;
      height: 28px;
    }

    .mint-tone {
      background: #EAF2EF;
      color: #003D30;
    }

    .indigo-tone {
      background: #EEF2FF;
      color: #4F46E5;
    }

    .member-tone {
      background: #E0F2FE;
      color: #0284C7;
    }

    .amber-tone {
      background: #FEF3C7;
      color: #EA580C;
    }

    .stat-content {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      flex: 1;
    }

    .stat-number {
      font-size: 2.1rem;
      font-weight: 700;
      color: #111B19;
      line-height: 1.05;
      font-family: var(--font-sans);
      font-feature-settings: "tnum";
      letter-spacing: -0.01em;
    }

    .stat-label {
      font-size: 0.88rem;
      font-weight: 550;
      color: #64748B;
    }

    .stat-skeleton {
      opacity: 0.4;
    }

    /* Bottom Section - Responsive fitting in remaining viewport height */
    .dashboard-grid-bottom {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
      gap: 1.25rem;
      flex: 1;
    }

    .bottom-panel {
      border: 1px solid #ECEAE3;
      border-radius: var(--radius-panel, 12px);
      padding: 1.35rem 1.5rem;
      background: #FFFFFF;
      display: flex;
      flex-direction: column;
      min-height: 350px;
      height: clamp(340px, 40vh, 390px);
      box-shadow: 0 1px 4px rgba(10, 30, 20, 0.02);
      box-sizing: border-box;
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
      padding-bottom: 0;
      flex-shrink: 0;
    }

    .panel-header h2 {
      margin: 0;
      font-family: var(--font-serif);
      font-size: 1.35rem;
      font-weight: 700;
      color: #112A20;
    }

    .see-all-link {
      font-size: 0.85rem;
      font-weight: 600;
      color: #003D30;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }

    .see-all-link:hover {
      text-decoration: underline;
    }

    .period-select {
      font-size: 0.78rem;
      font-weight: 550;
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      border: 1px solid #D8D4C8;
      background: #FFFFFF;
      color: #2D3748;
      outline: none;
      cursor: pointer;
    }

    /* Pending Requests Table & Empty State */
    .empty-requests-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.25rem 1rem;
      text-align: center;
      margin: auto 0;
    }

    .empty-icon-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #F1F4F1;
      color: #64748B;
      display: grid;
      place-items: center;
      margin-bottom: 0.85rem;
    }

    .empty-icon-circle svg {
      width: 28px;
      height: 28px;
    }

    .empty-title {
      font-weight: 600;
      font-size: 0.95rem;
      color: #1E293B;
      margin: 0 0 0.25rem;
    }

    .empty-subtitle {
      font-size: 0.82rem;
      color: #64748B;
      margin: 0;
    }

    .table-container {
      overflow-y: auto;
      flex: 1;
    }

    .requests-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
    }

    .requests-table th {
      padding: 0.45rem 0.5rem;
      text-align: left;
      font-size: 0.74rem;
      font-weight: 650;
      color: #64748B;
      border-bottom: 1px solid #E2E8F0;
    }

    .requests-table td {
      padding: 0.5rem 0.5rem;
      vertical-align: middle;
      border-bottom: 1px solid #F1F5F9;
    }

    .borrower-cell {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .borrower-id {
      color: #0F172A;
      font-size: 0.8rem;
    }

    .borrower-sub {
      font-size: 0.72rem;
    }

    .book-title-cell {
      display: inline-block;
      max-width: 13rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
      color: #0F172A;
    }

    .action-buttons {
      display: inline-flex;
      gap: 0.4rem;
    }

    .btn-approve {
      background: #003D30;
      color: #ffffff;
      border: 1px solid #003D30;
      border-radius: 5px;
      padding: 0.25rem 0.65rem;
      font-size: 0.74rem;
      font-weight: 650;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-approve:hover {
      background: #002B22;
    }

    .btn-reject {
      background: #ffffff;
      color: #dc2626;
      border: 1px solid #f87171;
      border-radius: 5px;
      padding: 0.25rem 0.65rem;
      font-size: 0.74rem;
      font-weight: 650;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-reject:hover {
      background: #fef2f2;
    }

    /* Library Overview Chart */
    .chart-legend {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      font-size: 0.76rem;
      font-weight: 500;
      color: #64748B;
      margin-bottom: 0.65rem;
      flex-shrink: 0;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .legend-square {
      width: 9px;
      height: 9px;
      border-radius: 2px;
      display: inline-block;
    }

    .square-issued {
      background: #003D30;
    }

    .square-returned {
      background: #5E8276;
    }

    .chart-container {
      display: flex;
      gap: 0.75rem;
      height: 215px;
      margin-top: auto;
      padding-top: 0.25rem;
    }

    .chart-y-axis {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: 0.7rem;
      font-weight: 500;
      color: #94A3B8;
      text-align: right;
      padding-bottom: 1.4rem;
      width: 1.6rem;
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
      border-top: 1px dashed #E2E8F0;
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
      width: 3rem;
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
      background: #003D30;
    }

    .bar-returned {
      background: #5E8276;
    }

    .month-label {
      font-size: 0.72rem;
      font-weight: 550;
      color: #64748B;
      margin-top: 0.35rem;
    }

    .loading-state {
      padding: 2rem 1rem;
      text-align: center;
      color: #64748B;
      font-size: 0.82rem;
      margin: auto;
    }

    /* Responsive */
    @media (max-width: 1100px) {
      .welcome-banner {
        height: auto;
        min-height: auto;
        max-height: none;
        flex-direction: column;
        align-items: flex-start;
        padding: 1.5rem;
        background-image: none;
      }
      .welcome-asset-wrap {
        display: none;
      }
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .dashboard-grid-bottom {
        grid-template-columns: 1fr;
      }
      .bottom-panel {
        height: auto;
        min-height: 260px;
      }
    }

    @media (max-width: 640px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
      .welcome-title {
        font-size: 1.75rem;
      }
    }
  `]
})
export class LibrarianDashboardComponent implements OnInit {
  private readonly dashboardService = inject(LibrarianDashboardService);
  private readonly borrowingService = inject(BorrowingService);

  readonly stats = signal<DashboardStats | null>(null);
  readonly statsLoading = signal(true);

  readonly pendingRequests = signal<BorrowRequestRecord[]>([]);
  readonly requestsLoading = signal(true);
  readonly actionPending = signal(false);

  readonly overviewData = signal<CirculationOverviewItem[]>([]);
  readonly overviewLoading = signal(true);
  selectedPeriod = '5';

  readonly recentActivities = signal<RecentActivityItem[]>([]);
  readonly activityLoading = signal(false);

  readonly error = signal('');
  readonly notice = signal('');

  ngOnInit(): void {
    this.loadStats();
    this.loadPendingRequests();
    this.loadOverview();
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
