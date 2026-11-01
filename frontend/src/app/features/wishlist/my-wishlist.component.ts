import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { WishlistBook, WishlistService } from './wishlist.service';
import { ToastService } from '../../shared/layout/toast.component';

@Component({
  selector: 'app-my-wishlist',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="wishlist-container">
      <!-- Page Header -->
      <header class="page-header">
        <div class="header-left">
          <div class="header-icon-box" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div>
            <div class="header-title-row">
              <h1 class="page-title">My Wishlist</h1>
              <span class="count-badge" aria-label="Total saved books">
                Saved Books ({{ wishlistService.items().length }})
              </span>
            </div>
            <p class="page-subtitle">Your saved books, all in one place.</p>
          </div>
        </div>
        <div class="header-actions">
          <a routerLink="/workspace/books" class="btn-explore">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            Explore Books
          </a>
        </div>
      </header>

      <!-- Main Content Area -->
      @if (wishlistService.loading()) {
        <div class="loading-state surface-card" role="status">
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading your saved books…</p>
        </div>
      } @else if (wishlistService.error()) {
        <div class="alert alert-error surface-card" role="alert">
          <p>{{ wishlistService.error() }}</p>
          <button type="button" class="button button-secondary btn-retry" (click)="load()">
            Retry
          </button>
        </div>
      } @else if (wishlistService.items().length === 0) {
        <div class="empty-state surface-card">
          <div class="empty-icon-circle" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <h2 class="empty-title">Your wishlist is empty</h2>
          <p class="empty-desc">Books you save from the catalogue and recommendations will appear here.</p>
          <a routerLink="/workspace/books" class="button button-primary btn-explore-cta">
            Explore Books
          </a>
        </div>
      } @else {
        <!-- Wishlist Cards Grid -->
        <div class="wishlist-grid">
          @for (item of wishlistService.items(); track item.bookId) {
            <article class="wishlist-card surface-card">
              <div class="card-cover-wrap">
                @if (item.coverImageUrl && !brokenCovers.has(item.bookId)) {
                  <img
                    [src]="item.coverImageUrl"
                    [alt]="'Cover of ' + item.title"
                    class="book-cover-img"
                    loading="lazy"
                    (error)="markBroken(item.bookId)"
                  >
                } @else {
                  <div class="cover-fallback" aria-hidden="true">
                    <span>{{ item.title.substring(0, 3).toUpperCase() }}</span>
                  </div>
                }
              </div>

              <div class="card-details">
                <div class="card-meta-top">
                  <span class="category-pill">{{ item.category || 'General' }}</span>
                  <span
                    class="status-pill"
                    [class.status-available]="item.available"
                    [class.status-unavailable]="!item.available"
                  >
                    <span class="status-dot"></span>
                    {{ item.available ? (item.availableCopies + ' available') : 'Unavailable' }}
                  </span>
                </div>

                <h3 class="book-title">
                  <a [routerLink]="['/workspace/books', item.bookId]">{{ item.title }}</a>
                </h3>

                <p class="book-author">
                  {{ item.authors.join(', ') || 'Unknown Author' }}
                </p>

                @if (item.publisher || item.publicationYear) {
                  <p class="book-pub-meta">
                    @if (item.publisher) {
                      <span>{{ item.publisher }}</span>
                    }
                    @if (item.publisher && item.publicationYear) {
                      <span class="meta-sep">·</span>
                    }
                    @if (item.publicationYear) {
                      <span>{{ item.publicationYear }}</span>
                    }
                  </p>
                }

                <!-- Genuine Rating Display -->
                <div class="rating-row" [attr.aria-label]="item.reviewCount > 0 ? (item.averageRating + ' stars, ' + item.reviewCount + ' reviews') : 'No reviews'">
                  @if (item.reviewCount > 0) {
                    <span class="rating-star filled" aria-hidden="true">★</span>
                    <strong class="rating-score">{{ item.averageRating.toFixed(1) }}</strong>
                    <span class="rating-count">({{ item.reviewCount }} {{ item.reviewCount === 1 ? 'review' : 'reviews' }})</span>
                  } @else {
                    <span class="rating-star unfilled" aria-hidden="true">☆</span>
                    <strong class="rating-score">0</strong>
                    <span class="rating-count">(0)</span>
                  }
                </div>

                <!-- Card Actions -->
                <div class="card-actions-row">
                  <a [routerLink]="['/workspace/books', item.bookId]" class="button button-secondary btn-view">
                    View Details
                  </a>
                  <button
                    type="button"
                    class="btn-remove"
                    title="Remove from Wishlist"
                    aria-label="Remove book from wishlist"
                    (click)="removeItem(item)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="trash-icon">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .wishlist-container {
      max-width: 1240px;
      margin: 0 auto;
      padding: 1.75rem 2rem 3.5rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1.25rem;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1.15rem;
    }

    .header-icon-box {
      width: 3.25rem;
      height: 3.25rem;
      border-radius: 1rem;
      background: #E8F4F0;
      color: #065F46;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .header-icon-box svg {
      width: 1.65rem;
      height: 1.65rem;
    }

    .header-title-row {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      flex-wrap: wrap;
    }

    .page-title {
      font-size: 1.85rem;
      font-weight: 700;
      color: #0F172A;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .count-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      background: #E8F4F0;
      color: #065F46;
      font-size: 0.85rem;
      font-weight: 600;
      border: 1px solid #D1E7DD;
    }

    .page-subtitle {
      font-size: 0.95rem;
      color: #64748B;
      margin: 0.25rem 0 0;
    }

    .btn-explore {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.25rem;
      border-radius: 0.625rem;
      background: #003D30;
      color: #FFFFFF;
      font-size: 0.92rem;
      font-weight: 600;
      text-decoration: none;
      transition: background-color 150ms ease, transform 150ms ease;
    }

    .btn-explore:hover {
      background: #002b22;
      transform: translateY(-1px);
    }

    .btn-icon {
      width: 1.15rem;
      height: 1.15rem;
    }

    .surface-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .loading-state,
    .alert-error {
      padding: 3rem 2rem;
      text-align: center;
      margin: 2rem 0;
    }

    .alert-error {
      border-color: #FECACA;
      background: #FEF2F2;
      color: #991B1B;
    }

    .btn-retry {
      margin-top: 1rem;
    }

    .spinner {
      width: 2.25rem;
      height: 2.25rem;
      border: 3px solid #E2E8F0;
      border-top-color: #065F46;
      border-radius: 50%;
      margin: 0 auto 1rem;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-state {
      padding: 4.5rem 2rem;
      text-align: center;
      max-width: 580px;
      margin: 2rem auto;
    }

    .empty-icon-circle {
      width: 4rem;
      height: 4rem;
      border-radius: 50%;
      background: #F1F5F9;
      color: #64748B;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
    }

    .empty-icon-circle svg {
      width: 2rem;
      height: 2rem;
    }

    .empty-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #1E293B;
      margin: 0 0 0.5rem;
    }

    .empty-desc {
      font-size: 0.95rem;
      color: #64748B;
      margin: 0 0 1.75rem;
    }

    .btn-explore-cta {
      display: inline-block;
      padding: 0.75rem 1.75rem;
      border-radius: 0.625rem;
      background: #003D30;
      color: #FFFFFF;
      font-weight: 600;
      text-decoration: none;
    }

    .btn-explore-cta:hover {
      background: #002b22;
    }

    /* Grid of Cards */
    .wishlist-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.5rem;
    }

    .wishlist-card {
      display: flex;
      gap: 1.25rem;
      padding: 1.35rem;
      transition: transform 160ms ease, box-shadow 160ms ease;
    }

    .wishlist-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.07);
    }

    .card-cover-wrap {
      flex-shrink: 0;
      width: 90px;
      height: 128px;
      border-radius: 0.5rem;
      overflow: hidden;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
    }

    .book-cover-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .cover-fallback {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1E293B, #0F172A);
      color: #F8FAFC;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.1rem;
      letter-spacing: 0.05em;
    }

    .card-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .card-meta-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.4rem;
    }

    .category-pill {
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.15rem 0.55rem;
      border-radius: 9999px;
      background: #F1F5F9;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-pill.status-available {
      color: #065F46;
    }

    .status-pill.status-unavailable {
      color: #991B1B;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .book-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #0F172A;
      margin: 0 0 0.25rem;
      line-height: 1.35;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .book-title a {
      color: inherit;
      text-decoration: none;
    }

    .book-title a:hover {
      color: #065F46;
      text-decoration: underline;
    }

    .book-author {
      font-size: 0.85rem;
      color: #64748B;
      margin: 0 0 0.35rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .book-pub-meta {
      font-size: 0.78rem;
      color: #94A3B8;
      margin: 0 0 0.5rem;
    }

    .meta-sep {
      margin: 0 0.35rem;
    }

    .rating-row {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin-bottom: 0.85rem;
      font-size: 0.85rem;
    }

    .rating-star.filled {
      color: #F59E0B;
    }

    .rating-star.unfilled {
      color: #CBD5E1;
    }

    .rating-score {
      font-weight: 700;
      color: #1E293B;
    }

    .rating-count {
      color: #64748B;
      font-size: 0.8rem;
    }

    .card-actions-row {
      margin-top: auto;
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .btn-view {
      flex: 1;
      padding: 0.45rem 0.85rem;
      border-radius: 0.5rem;
      font-size: 0.82rem;
      font-weight: 600;
      text-align: center;
      text-decoration: none;
      background: #F1F5F9;
      color: #334155;
      border: 1px solid #CBD5E1;
      transition: background 120ms ease;
    }

    .btn-view:hover {
      background: #E2E8F0;
      color: #0F172A;
    }

    .btn-remove {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.75rem;
      border-radius: 0.5rem;
      font-size: 0.82rem;
      font-weight: 600;
      background: transparent;
      color: #DC2626;
      border: 1px solid #FECACA;
      cursor: pointer;
      transition: background 120ms ease, border-color 120ms ease;
    }

    .btn-remove:hover {
      background: #FEF2F2;
      border-color: #FCA5A5;
    }

    .trash-icon {
      width: 0.95rem;
      height: 0.95rem;
    }
  `]
})
export class MyWishlistComponent implements OnInit {
  readonly wishlistService = inject(WishlistService);
  private readonly toast = inject(ToastService);
  readonly brokenCovers = new Set<string>();

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.wishlistService.loadMyWishlist().subscribe({
      error: () => {}
    });
  }

  removeItem(item: WishlistBook): void {
    this.wishlistService.removeFromWishlist(item.bookId).subscribe({
      next: () => {
        this.toast.show(`“${item.title}” removed from your wishlist.`, 'info');
      },
      error: (err) => {
        this.toast.show(err.error?.message || 'Could not remove book from wishlist.', 'error');
      }
    });
  }

  markBroken(bookId: string): void {
    this.brokenCovers.add(bookId);
  }
}
