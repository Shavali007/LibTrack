import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RecommendationService, FacultyDetail } from './recommendation.service';
import { WishlistService } from '../wishlist/wishlist.service';

@Component({
  selector: 'app-faculty-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="faculty-profile-page">
      <!-- Top Navigation & Breadcrumb -->
      <nav class="top-nav-bar" aria-label="Breadcrumb">
        <button type="button" class="back-btn" (click)="goBack()" aria-label="Back to recommendations">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          <span>Back to Recommendations</span>
        </button>
      </nav>

      <!-- Loading State -->
      @if (loading()) {
        <div class="state-container loading-container surface-card">
          <div class="spinner" aria-hidden="true"></div>
          <p class="state-text">Loading faculty profile…</p>
        </div>
      }

      <!-- Error State -->
      @else if (error()) {
        <div class="state-container error-container surface-card" role="alert">
          <div class="state-icon error-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h2 class="state-title">Faculty Member Not Found</h2>
          <p class="state-desc">{{ error() }}</p>
          <div class="state-actions">
            <button type="button" class="action-btn btn-primary" (click)="goBack()">
              Return to Recommendations
            </button>
            <button type="button" class="action-btn btn-outline" (click)="loadProfile()">
              Retry
            </button>
          </div>
        </div>
      }

      <!-- Profile Content -->
      @else if (faculty(); as fac) {
        <main class="profile-content">
          <!-- Faculty Hero Banner Card -->
          <section class="faculty-hero-card surface-card" aria-label="Faculty details">
            <div class="hero-left">
              <div class="avatar-circle" aria-hidden="true">
                {{ getInitials(fac.displayName) }}
              </div>
              <div class="hero-info">
                <div class="name-row">
                  <h1 class="faculty-name">{{ fac.displayName }}</h1>
                  @if (fac.institutionalId) {
                    <span class="emp-id-badge" title="Employee ID">ID: {{ fac.institutionalId }}</span>
                  }
                </div>
                <p class="faculty-designation">{{ fac.designation || 'Faculty Member' }}</p>
                <div class="meta-row">
                  <span class="dept-pill">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                      <line x1="9" y1="22" x2="9" y2="22.01"></line>
                      <line x1="15" y1="22" x2="15" y2="22.01"></line>
                    </svg>
                    {{ fac.department }}
                  </span>
                  @if (fac.email) {
                    <span class="email-pill">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                      {{ fac.email }}
                    </span>
                  }
                </div>
              </div>
            </div>

            <div class="hero-right">
              <div class="stat-highlight">
                <span class="stat-number">{{ fac.books.length }}</span>
                <span class="stat-label">Book{{ fac.books.length === 1 ? '' : 's' }} Recommended</span>
              </div>
              <button
                type="button"
                class="follow-btn"
                [class.following]="isFollowed()"
                (click)="toggleFollow()"
                [attr.aria-pressed]="isFollowed()"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <span>{{ isFollowed() ? 'Following Faculty' : 'Follow Faculty' }}</span>
              </button>
            </div>
          </section>

          <!-- Recommended Books Section -->
          <section class="faculty-books-section" aria-label="Faculty recommendations">
            <div class="section-header-row">
              <div>
                <h2 class="section-title">Recommended Books</h2>
                <p class="section-subtitle">
                  Academic reading suggestions curated by {{ fac.displayName }}
                </p>
              </div>
              <span class="count-tag">{{ fac.books.length }} Title{{ fac.books.length === 1 ? '' : 's' }}</span>
            </div>

            <!-- Empty State for 0 recommendations -->
            @if (fac.books.length === 0) {
              <div class="empty-recs-card surface-card">
                <div class="empty-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                  </svg>
                </div>
                <h3 class="empty-title">This faculty has not recommended any books yet.</h3>
                <p class="empty-subtitle">
                  Check back later or explore recommendations from other faculty members.
                </p>
                <button type="button" class="action-btn btn-primary" (click)="goBack()">
                  Explore All Recommendations
                </button>
              </div>
            }

            <!-- Books Grid -->
            @else {
              <div class="books-grid">
                @for (book of fac.books; track book.recommendationId) {
                  <article class="book-card surface-card">
                    <div class="card-top">
                      <!-- Book Cover Thumbnail -->
                      <div class="cover-wrapper">
                        @if (book.coverImageUrl && !brokenCovers().has(book.bookId)) {
                          <img
                            [src]="book.coverImageUrl"
                            [alt]="'Cover of ' + book.title"
                            class="cover-image"
                            loading="lazy"
                            (error)="markCoverBroken(book.bookId)"
                          >
                        } @else {
                          <div class="cover-fallback" aria-hidden="true">
                            <span>{{ book.title.substring(0, 3).toUpperCase() }}</span>
                          </div>
                        }
                      </div>

                      <!-- Book Primary Details -->
                      <div class="primary-details">
                        <div class="title-wishlist-row">
                          <h3 class="book-title" [title]="book.title">
                            <a [routerLink]="['/workspace/books', book.bookId]">{{ book.title }}</a>
                          </h3>
                          <button
                            type="button"
                            class="wishlist-btn"
                            [class.active]="wishlistService.isInWishlist(book.bookId)"
                            (click)="toggleWishlist(book.bookId)"
                            [attr.aria-label]="wishlistService.isInWishlist(book.bookId) ? 'Remove from wishlist' : 'Add to wishlist'"
                          >
                            <svg viewBox="0 0 24 24" [attr.fill]="wishlistService.isInWishlist(book.bookId) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            </svg>
                          </button>
                        </div>

                        <p class="book-author" [title]="book.authors.join(', ')">
                          {{ book.authors.join(', ') || 'Unknown Author' }}
                        </p>

                        <div class="rating-row">
                          @if (book.averageRating) {
                            <span class="star-icon" aria-hidden="true">&#9733;</span>
                            <span class="rating-num">{{ book.averageRating }}</span>
                            <span class="review-count">({{ book.reviewCount }})</span>
                          } @else {
                            <span class="unrated-text">Unrated</span>
                          }
                        </div>
                      </div>
                    </div>

                    <!-- Faculty Recommendation Note / Quote -->
                    @if (book.message) {
                      <blockquote class="rec-quote" [title]="book.message">
                        <span class="quote-symbol">&ldquo;</span>
                        <span class="quote-text">{{ book.message }}</span>
                        <span class="quote-symbol">&rdquo;</span>
                      </blockquote>
                    }

                    <!-- Card Footer -->
                    <div class="card-footer">
                      <div class="date-badge">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <span>Recommended on {{ formatDate(book.createdAt) }}</span>
                      </div>
                      <a [routerLink]="['/workspace/books', book.bookId]" class="explore-link">
                        <span>Details</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </a>
                    </div>
                  </article>
                }
              </div>
            }
          </section>
        </main>
      }
    </div>
  `,
  styles: [`
    .faculty-profile-page {
      max-width: 1360px;
      margin: 0 auto;
      padding: 1.5rem 1.75rem 3rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .top-nav-bar {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: transparent;
      border: 1px solid var(--color-border-subtle, #E5E0D5);
      border-radius: 8px;
      padding: 0.5rem 0.95rem;
      font-size: var(--type-button-size, 0.84375rem);
      font-weight: 600;
      color: var(--color-forest-900, #003D30);
      cursor: pointer;
      background-color: #FFFFFF;
      transition: background-color 160ms ease, border-color 160ms ease, transform 120ms ease;
    }

    .back-btn:hover {
      background-color: var(--color-sage-100, #F2F7F4);
      border-color: var(--color-forest-700, #08745A);
      transform: translateX(-2px);
    }

    .back-btn svg {
      width: 1.1rem;
      height: 1.1rem;
    }

    /* State container */
    .state-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      text-align: center;
      border-radius: 12px;
      border: 1px solid var(--color-border-subtle, #E5E0D5);
      background: #FFFFFF;
    }

    .spinner {
      width: 2.25rem;
      height: 2.25rem;
      border: 3px solid var(--color-sage-200, #DDEAE4);
      border-top-color: var(--color-forest-900, #003D30);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .state-icon {
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
    }

    .error-icon {
      background: #FDF2F2;
      color: #991B1B;
    }

    .error-icon svg {
      width: 1.8rem;
      height: 1.8rem;
    }

    .state-title {
      font-family: var(--font-serif, serif);
      font-size: 1.45rem;
      color: var(--color-charcoal-900, #1F2937);
      margin: 0 0 0.5rem;
    }

    .state-desc {
      font-size: 0.9rem;
      color: var(--color-charcoal-600, #4B5563);
      max-width: 480px;
      margin: 0 0 1.5rem;
      line-height: 1.5;
    }

    .state-actions {
      display: flex;
      gap: 0.75rem;
    }

    /* Hero Banner */
    .faculty-hero-card {
      background: linear-gradient(135deg, #F3F8F5 0%, #FFFFFF 60%, #EAF4EE 100%);
      border: 1px solid var(--color-border-subtle, #E5E0D5);
      border-radius: 14px;
      padding: 1.85rem 2.2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      position: relative;
      overflow: hidden;
    }

    .faculty-hero-card::after {
      content: '';
      position: absolute;
      right: -30px;
      bottom: -30px;
      width: 220px;
      height: 220px;
      background: radial-gradient(circle, rgba(8, 116, 90, 0.06) 0%, transparent 70%);
      pointer-events: none;
      border-radius: 50%;
    }

    .hero-left {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      min-width: 0;
    }

    .avatar-circle {
      width: 4.5rem;
      height: 4.5rem;
      border-radius: 50%;
      background: var(--color-forest-900, #003D30);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.65rem;
      font-weight: 700;
      flex-shrink: 0;
      box-shadow: 0 4px 10px rgba(0, 61, 48, 0.18);
    }

    .hero-info {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      min-width: 0;
    }

    .name-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .faculty-name {
      font-family: var(--font-serif, serif);
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--color-forest-950, #00281F);
      margin: 0;
      line-height: 1.2;
    }

    .emp-id-badge {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--color-forest-800, #065945);
      background: #E8F5E9;
      border: 1px solid #C8E6C9;
      padding: 0.15rem 0.55rem;
      border-radius: 6px;
    }

    .faculty-designation {
      font-size: 0.95rem;
      font-weight: 550;
      color: var(--color-charcoal-700, #374151);
      margin: 0;
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
      margin-top: 0.25rem;
    }

    .dept-pill, .email-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
      color: var(--color-charcoal-600, #4B5563);
      background: #FFFFFF;
      border: 1px solid var(--color-border-subtle, #E5E0D5);
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
    }

    .dept-pill svg, .email-pill svg {
      width: 0.85rem;
      height: 0.85rem;
      color: var(--color-forest-700, #08745A);
    }

    .hero-right {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      flex-shrink: 0;
    }

    .stat-highlight {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #FFFFFF;
      border: 1px solid var(--color-border-subtle, #E5E0D5);
      border-radius: 10px;
      padding: 0.65rem 1.25rem;
      min-width: 120px;
    }

    .stat-number {
      font-family: var(--font-serif, serif);
      font-size: 1.65rem;
      font-weight: 700;
      color: var(--color-forest-900, #003D30);
      line-height: 1.1;
    }

    .stat-label {
      font-size: 0.72rem;
      color: var(--color-charcoal-600, #6B7280);
      font-weight: 550;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-top: 2px;
    }

    .follow-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: #FFFFFF;
      border: 1px solid var(--color-border-subtle, #D8D2C4);
      border-radius: 8px;
      padding: 0.6rem 1.1rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--color-forest-900, #003D30);
      cursor: pointer;
      transition: all 160ms ease;
    }

    .follow-btn:hover {
      background: var(--color-sage-100, #F2F7F4);
      border-color: var(--color-forest-700, #08745A);
    }

    .follow-btn.following {
      background: var(--color-forest-900, #003D30);
      color: #FFFFFF;
      border-color: var(--color-forest-900, #003D30);
    }

    .follow-btn svg {
      width: 1rem;
      height: 1rem;
    }

    /* Recommendations Section */
    .faculty-books-section {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .section-header-row {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      border-bottom: 1px solid var(--color-border-subtle, #E5E0D5);
      padding-bottom: 0.75rem;
    }

    .section-title {
      font-family: var(--font-serif, serif);
      font-size: 1.35rem;
      color: var(--color-forest-950, #00281F);
      margin: 0;
    }

    .section-subtitle {
      font-size: 0.84rem;
      color: var(--color-charcoal-600, #6B7280);
      margin: 0.2rem 0 0;
    }

    .count-tag {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--color-forest-800, #065945);
      background: var(--color-sage-100, #EAF2EF);
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
    }

    /* Empty state */
    .empty-recs-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3.5rem 2rem;
      text-align: center;
      border-radius: 12px;
      border: 1px dashed var(--color-border-subtle, #D8D2C4);
      background: #FFFFFF;
    }

    .empty-icon {
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 50%;
      background: #F9F9F6;
      color: #9CA3AF;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
    }

    .empty-icon svg {
      width: 1.85rem;
      height: 1.85rem;
    }

    .empty-title {
      font-family: var(--font-serif, serif);
      font-size: 1.2rem;
      color: #1F2937;
      margin: 0 0 0.4rem;
    }

    .empty-subtitle {
      font-size: 0.875rem;
      color: #6B7280;
      max-width: 440px;
      margin: 0 0 1.5rem;
      line-height: 1.45;
    }

    /* Books Grid: 4 columns on desktop matching mockup */
    .books-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.15rem;
    }

    .book-card {
      background: #FFFFFF;
      border: 1px solid var(--color-border-subtle, #E5E0D5);
      border-radius: 12px;
      padding: 0.95rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
    }

    .book-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.06);
      border-color: var(--color-sage-300, #B8D0C7);
    }

    .card-top {
      display: flex;
      gap: 0.75rem;
    }

    .cover-wrapper {
      width: 72px;
      height: 104px;
      flex-shrink: 0;
      border-radius: 6px;
      overflow: hidden;
      background: #111827;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
    }

    .cover-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .cover-fallback {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1B4332 0%, #081C15 100%);
      color: #61E5BC;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.05em;
    }

    .primary-details {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
      flex: 1;
    }

    .title-wishlist-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.4rem;
    }

    .book-title {
      font-size: 0.92rem;
      font-weight: 700;
      line-height: 1.25;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .book-title a {
      color: #0F172A;
      text-decoration: none;
      transition: color 140ms ease;
    }

    .book-title a:hover {
      color: var(--color-forest-700, #08745A);
      text-decoration: underline;
    }

    .wishlist-btn {
      background: transparent;
      border: 0;
      padding: 2px;
      color: #9CA3AF;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: color 140ms ease, transform 120ms ease;
    }

    .wishlist-btn:hover {
      color: var(--color-forest-700, #08745A);
      transform: scale(1.15);
    }

    .wishlist-btn.active {
      color: var(--color-forest-900, #003D30);
    }

    .wishlist-btn svg {
      width: 1.1rem;
      height: 1.1rem;
    }

    .book-author {
      font-size: 0.8rem;
      color: #6B7280;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rating-row {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-top: 0.2rem;
      font-size: 0.8rem;
    }

    .star-icon {
      color: #F59E0B;
      font-size: 0.88rem;
    }

    .rating-num {
      font-weight: 700;
      color: #1F2937;
    }

    .review-count {
      color: #9CA3AF;
      font-size: 0.75rem;
    }

    .unrated-text {
      color: #9CA3AF;
      font-size: 0.75rem;
      font-style: italic;
    }

    .rec-quote {
      margin: 0;
      padding: 0.45rem 0.6rem;
      background: #F9FAFB;
      border-left: 2px solid var(--color-forest-700, #08745A);
      border-radius: 0 6px 6px 0;
      font-size: 0.78rem;
      color: #374151;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .quote-symbol {
      color: var(--color-forest-700, #08745A);
      font-weight: 700;
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding-top: 0.45rem;
      border-top: 1px solid #F3F4F6;
      font-size: 0.75rem;
    }

    .date-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: #6B7280;
    }

    .date-badge svg {
      width: 0.85rem;
      height: 0.85rem;
      color: #9CA3AF;
    }

    .explore-link {
      display: inline-flex;
      align-items: center;
      gap: 0.15rem;
      color: var(--color-forest-800, #065945);
      font-weight: 600;
      text-decoration: none;
      transition: color 120ms ease;
    }

    .explore-link:hover {
      text-decoration: underline;
      color: var(--color-forest-950, #00281F);
    }

    .explore-link svg {
      width: 0.8rem;
      height: 0.8rem;
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 160ms ease;
    }

    .btn-primary {
      background: var(--color-forest-900, #003D30);
      color: #FFFFFF;
      border: 1px solid var(--color-forest-900, #003D30);
    }

    .btn-primary:hover {
      background: var(--color-forest-950, #00281F);
    }

    .btn-outline {
      background: transparent;
      color: var(--color-forest-900, #003D30);
      border: 1px solid var(--color-border-subtle, #D8D2C4);
    }

    .btn-outline:hover {
      background: var(--color-sage-100, #F2F7F4);
    }

    /* Responsive adjustments */
    @media (max-width: 1200px) {
      .books-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (max-width: 900px) {
      .faculty-hero-card {
        flex-direction: column;
        align-items: flex-start;
      }
      .hero-right {
        width: 100%;
        justify-content: space-between;
      }
      .books-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 600px) {
      .faculty-profile-page {
        padding: 1rem 0.85rem 2.5rem;
      }
      .hero-left {
        flex-direction: column;
        align-items: flex-start;
      }
      .hero-right {
        flex-direction: column;
        align-items: stretch;
      }
      .books-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class FacultyProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly recService = inject(RecommendationService);
  readonly wishlistService = inject(WishlistService);

  readonly faculty = signal<FacultyDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly isFollowed = signal(false);
  readonly brokenCovers = signal<Set<string>>(new Set());

  private facultyId: string | null = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.facultyId = params.get('facultyId');
      this.loadProfile();
    });
  }

  loadProfile(): void {
    if (!this.facultyId || !this.facultyId.trim()) {
      this.loading.set(false);
      this.error.set('No faculty identifier provided.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.recService.getFacultyDetails(this.facultyId.trim()).subscribe({
      next: (detail) => {
        this.faculty.set(detail);
        this.loading.set(false);

        // Check wishlist status for faculty books
        const bookIds = detail.books.map((b) => b.bookId);
        if (bookIds.length > 0) {
          this.wishlistService.checkStatus(bookIds).subscribe();
        }
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.error.set('The requested faculty member was not found or is no longer active.');
        } else if (err.status === 400) {
          this.error.set('Invalid faculty identifier provided.');
        } else {
          this.error.set('Could not load faculty details due to a network or server issue.');
        }
      }
    });
  }

  goBack(): void {
    // If there is history, navigate back; otherwise go to recommendations
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/workspace/recommendations']);
    }
  }

  toggleFollow(): void {
    this.isFollowed.update((v) => !v);
  }

  toggleWishlist(bookId: string): void {
    this.wishlistService.toggleWishlist(bookId).subscribe();
  }

  markCoverBroken(bookId: string): void {
    this.brokenCovers.update((set) => {
      const next = new Set(set);
      next.add(bookId);
      return next;
    });
  }

  getInitials(name: string): string {
    if (!name) return 'FA';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }
}
