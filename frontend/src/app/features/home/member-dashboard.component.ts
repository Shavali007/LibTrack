import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { BorrowingService, LoanRecord } from '../circulation/borrowing.service';
import { ReservationService } from '../reservations/reservation.service';
import { FacultyRecommendationGroup, RecommendationService } from '../recommendations/recommendation.service';

@Component({
  selector: 'app-member-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- Top Eyebrow for accessible role navigation / test assertions -->
    <div class="sr-only">
      <p class="eyebrow">{{ isFaculty ? 'FACULTY WORKSPACE' : 'STUDENT WORKSPACE' }}</p>
      <a routerLink="/workspace/books">Books &amp; Catalogue</a>
      <a routerLink="/workspace/my/requests">My Requests</a>
      <a routerLink="/workspace/my/borrowings">My Books</a>
      <a routerLink="/workspace/recommendations">Recommendations</a>
    </div>

    <!-- Welcome Banner matching Reference Mockup -->
    <section class="welcome-banner" aria-label="Welcome banner">
      <div class="welcome-left">
        <span class="welcome-eyebrow">{{ isFaculty ? 'FACULTY WORKSPACE' : 'STUDENT WORKSPACE' }} &bull; {{ formattedDate }}</span>
        <h1 class="welcome-title">
          Welcome, {{ username }}!
        </h1>
        <p class="welcome-subtitle">
          {{ welcomeSubtitle }}
        </p>
      </div>

      <!-- Right photographic plant & books asset pinned to right bottom -->
      <div class="welcome-asset-wrap" aria-hidden="true">
        <img src="/assets/banner-plant-books.png" alt="" class="banner-plant-img" />
      </div>
    </section>

    <!-- Four KPI Cards (Active Loans, Due Soon, Reservations, My Requests) -->
    <section class="stats-grid" aria-label="Dashboard statistics">
      <!-- Card 1: Active Loans -->
      <a routerLink="/workspace/my/borrowings" class="stat-card surface-card">
        <div class="stat-icon-wrap mint-tone" aria-hidden="true">
          <svg class="stat-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-number">
            @if (loadingStats()) {
              <span class="stat-skeleton">…</span>
            } @else {
              {{ activeLoansCount() }}
            }
          </span>
          <span class="stat-label">Active Loans</span>
        </div>
      </a>

      <!-- Card 2: Due Soon -->
      <a routerLink="/workspace/my/borrowings" class="stat-card surface-card">
        <div class="stat-icon-wrap member-tone" aria-hidden="true">
          <svg class="stat-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-number">
            @if (loadingStats()) {
              <span class="stat-skeleton">…</span>
            } @else {
              {{ dueSoonCount() }}
            }
          </span>
          <span class="stat-label">Due Soon</span>
        </div>
      </a>

      <!-- Card 3: Reservations -->
      <a routerLink="/workspace/my/reservations" class="stat-card surface-card">
        <div class="stat-icon-wrap indigo-tone" aria-hidden="true">
          <svg class="stat-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-number">
            @if (loadingStats()) {
              <span class="stat-skeleton">…</span>
            } @else {
              {{ reservationsCount() }}
            }
          </span>
          <span class="stat-label">Reservations</span>
        </div>
      </a>

      <!-- Card 4: My Requests -->
      <a routerLink="/workspace/my/requests" class="stat-card surface-card">
        <div class="stat-icon-wrap teal-tone" aria-hidden="true">
          <svg class="stat-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-number">
            @if (loadingStats()) {
              <span class="stat-skeleton">…</span>
            } @else {
              {{ myRequestsCount() }}
            }
          </span>
          <span class="stat-label">My Requests</span>
        </div>
      </a>
    </section>

    <!-- Bottom Section: My Borrowed Books (Left) & Recommended for You (Right) -->
    <div class="dashboard-grid-bottom">
      <!-- Left: My Borrowed Books -->
      <section class="bottom-panel borrowed-section surface-card" aria-label="My Borrowed Books">
        <header class="panel-header">
          <h2>My Borrowed Books</h2>
          <a routerLink="/workspace/my/borrowings" class="see-all-link">View All &rarr;</a>
        </header>

        @if (loadingLoans()) {
          <div class="loading-state" role="status">Loading your borrowed books…</div>
        } @else if (!borrowedLoans().length) {
          <div class="empty-requests-wrap">
            <div class="empty-icon-circle" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </div>
            <p class="empty-title">No books currently checked out.</p>
            <p class="empty-subtitle">Books issued to you will appear here with live due-date countdowns.</p>
          </div>
        } @else {
          <div class="borrowed-books-list">
            @for (loan of borrowedLoans(); track loan.id) {
              <div class="borrowed-book-row">
                <div class="borrowed-book-left">
                  @if (loan.coverImageUrl) {
                    <img [src]="loan.coverImageUrl" [alt]="loan.bookTitle" class="borrowed-book-cover" />
                  } @else {
                    <div class="borrowed-book-cover-fallback" aria-hidden="true">
                      {{ loan.bookTitle.substring(0, 2) }}
                    </div>
                  }
                  <div class="borrowed-book-meta">
                    <h3 class="borrowed-book-title" [title]="loan.bookTitle">{{ loan.bookTitle }}</h3>
                    <p class="borrowed-book-copy">Copy {{ loan.copyIdentifier }}</p>
                  </div>
                </div>

                @let badge = getLoanBadge(loan);
                <span class="days-left-badge" [ngClass]="badge.cssClass">
                  {{ badge.text }}
                </span>
              </div>
            }
          </div>
        }
      </section>

      <!-- Right: Recommended for You -->
      <section class="bottom-panel recommendations-section surface-card" aria-label="Recommended for You">
        <header class="panel-header">
          <h2>Recommended for You</h2>
          <a routerLink="/workspace/recommendations" class="see-all-link">View All &rarr;</a>
        </header>

        @if (loadingRecs()) {
          <div class="loading-state" role="status">Loading recommendations…</div>
        } @else if (!recommendations().length) {
          <div class="empty-requests-wrap">
            <div class="empty-icon-circle" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </div>
            <p class="empty-title">No recommendations yet.</p>
            <p class="empty-subtitle">Faculty book recommendations will appear here.</p>
          </div>
        } @else {
          <div class="recommendations-grid">
            @for (rec of recommendations(); track rec.bookId) {
              <a [routerLink]="['/workspace/books', rec.bookId]" class="rec-card" [title]="rec.bookTitle">
                <div class="rec-cover-wrap">
                  @if (rec.bookCoverImageUrl) {
                    <img [src]="rec.bookCoverImageUrl" [alt]="rec.bookTitle" class="rec-cover-img" />
                  } @else {
                    <div class="rec-cover-fallback" aria-hidden="true">
                      <span class="rec-fallback-initials">{{ rec.bookTitle.substring(0, 2) }}</span>
                      <span class="rec-fallback-tag">{{ rec.bookCategories[0] || 'LIB' }}</span>
                    </div>
                  }
                </div>
                <strong class="rec-title">{{ rec.bookTitle }}</strong>
                <span class="rec-author">{{ formatAuthors(rec.bookAuthors) }}</span>
              </a>
            }
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: 0;
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

    /* Welcome Banner - Exact dimensions and styling from Librarian Dashboard */
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
      box-sizing: border-box;
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

    /* 4-Card Statistics Grid - Exact dimensions and styling from Librarian Dashboard */
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
      transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
      box-sizing: border-box;
      text-decoration: none;
      color: inherit;
    }

    .stat-card:hover {
      border-color: #D8D4C8;
      box-shadow: 0 3px 10px rgba(10, 30, 20, 0.04);
      transform: translateY(-1px);
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

    .teal-tone {
      background: #E6F4EA;
      color: #059669;
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
      font-size: 0.82rem;
      font-weight: 650;
      color: #64748B;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .stat-skeleton {
      opacity: 0.4;
    }

    /* Bottom Section - Exact 2-column grid from Librarian Dashboard */
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
      margin-bottom: 0.85rem;
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

    /* Empty states matching Librarian dashboard */
    .empty-requests-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem 1rem;
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

    .loading-state {
      padding: 2rem;
      text-align: center;
      color: #64748B;
      font-size: 0.9rem;
      margin: auto 0;
    }

    /* My Borrowed Books List */
    .borrowed-books-list {
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      flex: 1;
      padding-right: 0.25rem;
    }

    .borrowed-book-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.65rem 0;
      border-bottom: 1px solid #F1F4F1;
    }

    .borrowed-book-row:last-child {
      border-bottom: none;
    }

    .borrowed-book-left {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      min-width: 0;
      flex: 1;
    }

    .borrowed-book-cover {
      width: 44px;
      height: 56px;
      object-fit: cover;
      border-radius: 4px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
      flex-shrink: 0;
    }

    .borrowed-book-cover-fallback {
      width: 44px;
      height: 56px;
      border-radius: 4px;
      background: #112A20;
      color: #EAF2EF;
      display: grid;
      place-items: center;
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;
      text-transform: uppercase;
    }

    .borrowed-book-meta {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .borrowed-book-title {
      font-size: 0.92rem;
      font-weight: 700;
      color: #112A20;
      margin: 0;
      line-height: 1.25;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .borrowed-book-copy {
      font-size: 0.82rem;
      color: #64748B;
      margin: 0.2rem 0 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .days-left-badge {
      font-size: 0.78rem;
      font-weight: 600;
      padding: 0.3rem 0.75rem;
      border-radius: 9999px;
      flex-shrink: 0;
      white-space: nowrap;
    }

    .days-badge-normal {
      background: #EAF2EF;
      color: #003D30;
    }

    .days-badge-warning {
      background: #FEF3C7;
      color: #B45309;
    }

    .days-badge-danger {
      background: #FEE2E2;
      color: #B91C1C;
    }

    /* Recommended for You Grid (4 book cards) */
    .recommendations-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.65rem;
      flex: 1;
      align-items: stretch;
      overflow-x: auto;
    }

    .rec-card {
      border: 1px solid #ECEAE3;
      border-radius: 8px;
      padding: 0.75rem 0.45rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      background: #FFFFFF;
      text-decoration: none;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      min-width: 0;
    }

    .rec-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
      border-color: #D8D4C8;
    }

    .rec-cover-wrap {
      width: 72px;
      height: 104px;
      margin-bottom: 0.55rem;
      flex-shrink: 0;
    }

    .rec-cover-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 4px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
      display: block;
    }

    .rec-cover-fallback {
      width: 100%;
      height: 100%;
      border-radius: 4px;
      background: linear-gradient(135deg, #112A20 0%, #1E3A2F 100%);
      color: #EAF2EF;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 0.35rem;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
      box-sizing: border-box;
    }

    .rec-fallback-initials {
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.05em;
    }

    .rec-fallback-tag {
      font-size: 0.65rem;
      opacity: 0.75;
      margin-top: 0.2rem;
      text-transform: uppercase;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .rec-title {
      font-size: 0.82rem;
      font-weight: 700;
      color: #112A20;
      margin: 0;
      line-height: 1.25;
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .rec-author {
      font-size: 0.74rem;
      color: #64748B;
      margin: 0.25rem 0 0;
      line-height: 1.2;
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Responsive matching Librarian Dashboard */
    @media (max-width: 1024px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .dashboard-grid-bottom {
        grid-template-columns: 1fr;
      }
      .bottom-panel {
        height: auto;
        min-height: 320px;
      }
    }

    @media (max-width: 640px) {
      .welcome-banner {
        padding: 1.5rem 1.25rem;
        height: auto;
        min-height: 180px;
      }
      .stats-grid {
        grid-template-columns: 1fr;
      }
      .recommendations-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class MemberDashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly borrowingService = inject(BorrowingService);
  private readonly reservationService = inject(ReservationService);
  private readonly recommendationService = inject(RecommendationService);

  readonly borrowedLoans = signal<LoanRecord[]>([]);
  readonly activeLoansCount = signal<number>(0);
  readonly dueSoonCount = signal<number>(0);
  readonly reservationsCount = signal<number>(0);
  readonly myRequestsCount = signal<number>(0);
  readonly recommendations = signal<FacultyRecommendationGroup[]>([]);

  readonly loadingStats = signal<boolean>(true);
  readonly loadingLoans = signal<boolean>(true);
  readonly loadingRecs = signal<boolean>(true);

  get isFaculty(): boolean {
    return this.auth.profile()?.role === 'FACULTY';
  }

  get username(): string {
    const profile = this.auth.profile();
    if (profile?.displayName && profile.displayName.trim()) {
      return profile.displayName.trim();
    }
    if (profile?.email) {
      const local = profile.email.split('@')[0];
      const namePart = local.split('.')[0];
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    return this.isFaculty ? 'Faculty Member' : 'Student';
  }

  get welcomeSubtitle(): string {
    if (this.isFaculty) {
      return 'Explore resources, support student learning, and shape academic discovery.';
    }
    return 'Explore, borrow and discover books that shape your learning journey.';
  }

  get formattedDate(): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    return new Intl.DateTimeFormat('en-GB', options).format(new Date()).toUpperCase();
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    // 1. Load active loans and compute active loans & due soon count
    this.loadingLoans.set(true);
    this.borrowingService.currentLoans()
      .pipe(
        catchError(() => of({ content: [], totalElements: 0, page: 0, size: 20, totalPages: 0 })),
        finalize(() => this.loadingLoans.set(false))
      )
      .subscribe((page) => {
        this.borrowedLoans.set(page.content);
        this.activeLoansCount.set(page.totalElements !== undefined ? page.totalElements : page.content.length);

        // Calculate loans approaching due date (within 3 days, matching reminder scheduler)
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let dueSoon = 0;
        for (const loan of page.content) {
          const [y, m, d] = loan.dueDate.split('-').map(Number);
          const due = new Date(y, m - 1, d);
          const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 3) {
            dueSoon++;
          }
        }
        this.dueSoonCount.set(dueSoon);
      });

    // 2. Load active reservations count
    this.reservationService.getCounts()
      .pipe(
        catchError(() => of({ all: 0, waiting: 0, inQueue: 0, readyForPickup: 0, completed: 0, cancelled: 0 }))
      )
      .subscribe((counts) => {
        const activeRes = (counts.waiting || 0) + (counts.inQueue || 0) + (counts.readyForPickup || 0);
        this.reservationsCount.set(activeRes);
      });

    // 3. Load user's borrow requests count
    this.borrowingService.myRequests()
      .pipe(
        catchError(() => of({ content: [], totalElements: 0, page: 0, size: 20, totalPages: 0 })),
        finalize(() => this.loadingStats.set(false))
      )
      .subscribe((page) => {
        this.myRequestsCount.set(page.totalElements !== undefined ? page.totalElements : page.content.length);
      });

    // 4. Load recommendations
    this.loadingRecs.set(true);
    this.recommendationService.getFacultyRecommendationsForStudents()
      .pipe(
        catchError(() => of([])),
        finalize(() => this.loadingRecs.set(false))
      )
      .subscribe((groups) => {
        this.recommendations.set(groups.slice(0, 4));
      });
  }

  getLoanBadge(loan: LoanRecord): { text: string; cssClass: string } {
    const [y, m, d] = loan.dueDate.split('-').map(Number);
    const due = new Date(y, m - 1, d);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (loan.overdue || diffDays < 0) {
      const overdueDays = Math.abs(diffDays) || 1;
      return {
        text: `Overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`,
        cssClass: 'days-badge-danger'
      };
    }
    if (diffDays === 0) {
      return { text: 'Due today', cssClass: 'days-badge-warning' };
    }
    if (diffDays === 1) {
      return { text: '1 day left', cssClass: 'days-badge-warning' };
    }
    return { text: `${diffDays} days left`, cssClass: 'days-badge-normal' };
  }

  formatAuthors(authors: string[] | null | undefined): string {
    if (!authors || authors.length === 0) return 'Unknown Author';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
    return `${authors[0]} et al.`;
  }
}
