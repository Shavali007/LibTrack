import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, Subject, switchMap } from 'rxjs';
import { BookSummary, CatalogueService } from '../catalogue/catalogue.service';
import { RecommendationService } from './recommendation.service';

@Component({
  selector: 'app-recommend-book-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="recommend-page-container">
      <!-- Back Navigation & Page Header matching Screen 2 -->
      <header class="page-header">
        <div class="header-nav-wrap">
          <a routerLink="/workspace/recommendations" class="back-link" aria-label="Back to recommendations">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="back-arrow">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <h1 class="page-title">Recommend a Book</h1>
          </a>
          <p class="page-subtitle">Suggest a book to students and share your insights.</p>
        </div>
      </header>

      <div class="card-wrapper surface-card">
        <!-- Selected Book Preview or Search Selector -->
        @if (selectedBook()) {
          <div class="selected-book-card">
            <div class="book-cover-wrap">
              @if (selectedBook()?.coverImageUrl && !coverBroken()) {
                <img
                  [src]="selectedBook()?.coverImageUrl"
                  [alt]="'Cover of ' + selectedBook()?.title"
                  class="book-cover"
                  (error)="coverBroken.set(true)"
                >
              } @else {
                <div class="book-cover-fallback">
                  {{ selectedBook()?.title?.substring(0, 3)?.toUpperCase() }}
                </div>
              }
            </div>

            <div class="book-meta">
              <h2 class="book-title">{{ selectedBook()?.title }}</h2>
              <p class="book-author">{{ selectedBook()?.authors?.join(', ') || 'Unknown Author' }}</p>
              @if (selectedBook()?.categories && (selectedBook()?.categories?.length ?? 0) > 0) {
                <span class="book-category">{{ selectedBook()?.categories?.[0] }}</span>
              }
            </div>

            <button
              type="button"
              class="clear-book-btn"
              (click)="clearSelectedBook()"
              aria-label="Change selected book"
              title="Change book"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        } @else {
          <!-- Search input to pick a book -->
          <div class="book-search-section">
            <label for="book-search" class="field-label">Select Book from Catalogue</label>
            <div class="search-input-wrap">
              <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                id="book-search"
                type="text"
                class="search-input"
                placeholder="Search books by title, author, or ISBN..."
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchChange($event)"
                autocomplete="off"
              >
            </div>

            @if (searching()) {
              <div class="search-loading">Searching catalogue…</div>
            }

            @if (searchResults().length > 0) {
              <div class="search-results-dropdown">
                @for (b of searchResults(); track b.id) {
                  <button type="button" class="search-result-item" (click)="selectBook(b)">
                    <div class="mini-thumb">
                      @if (b.coverImageUrl) {
                        <img [src]="b.coverImageUrl" [alt]="b.title" class="mini-thumb-img">
                      } @else {
                        <div class="mini-thumb-fallback">{{ b.title.substring(0, 2).toUpperCase() }}</div>
                      }
                    </div>
                    <div class="result-info">
                      <strong class="result-title">{{ b.title }}</strong>
                      <span class="result-author">{{ b.authors.join(', ') || 'Unknown Author' }}</span>
                    </div>
                  </button>
                }
              </div>
            } @else if (searchQuery.trim().length > 1 && !searching()) {
              <p class="no-search-results">No catalogue books match your query.</p>
            }
          </div>
        }

        <!-- Recommendation Message Form Field matching Screen 2 -->
        <div class="form-group" style="margin-top: 1.5rem;">
          <label for="rec-message" class="field-label">
            Recommendation Message <span class="muted-label">(Optional)</span>
          </label>
          <textarea
            id="rec-message"
            [(ngModel)]="message"
            maxlength="300"
            rows="5"
            class="form-textarea"
            placeholder="Share why you recommend this book to students..."
            [disabled]="pending()"
          ></textarea>
          <div class="char-counter" [class.near-limit]="message.length >= 280">
            {{ message.length }} / 300
          </div>
        </div>

        <!-- Visible To Section matching Screen 2 -->
        <div class="visibility-section">
          <div class="visibility-label-row">
            <span class="field-label">Visible To</span>
            <span class="info-icon" title="Recommendations are visible to all students in the library catalogue and recommendation feeds.">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </span>
          </div>
          <div class="visibility-selector">
            <div class="vis-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="group-icon">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span class="vis-text">All Students</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="chevron-icon">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>

        @if (error()) {
          <div class="alert alert-error" role="alert">
            {{ error() }}
          </div>
        }

        <!-- Actions Row matching Screen 2 -->
        <div class="action-footer">
          <a routerLink="/workspace/recommendations" class="btn-cancel">
            Cancel
          </a>
          <button
            type="button"
            class="btn-recommend"
            (click)="submitRecommendation()"
            [disabled]="pending() || !selectedBook()"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="send-icon">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            <span>{{ pending() ? 'Submitting…' : 'Recommend Book' }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .recommend-page-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 1.5rem 1.5rem 3rem;
    }

    .page-header {
      margin-bottom: 1.5rem;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: var(--color-charcoal-900, #1F2421);

      &:hover .back-arrow {
        transform: translateX(-3px);
      }
    }

    .back-arrow {
      width: 22px;
      height: 22px;
      color: var(--color-charcoal-900, #1F2421);
      transition: transform 0.15s ease;
    }

    .page-title {
      font-family: var(--font-serif, 'Playfair Display', Georgia, serif);
      font-size: var(--type-page-title-size, 1.6875rem);
      font-weight: 600;
      line-height: 1.25;
      margin: 0;
    }

    .page-subtitle {
      font-size: var(--type-page-subtitle-size, 0.84375rem);
      color: var(--color-charcoal-600, #5A625D);
      margin: 0.25rem 0 0 2.25rem;
    }

    .card-wrapper {
      background: var(--color-surface, #ffffff);
      border: 1px solid var(--color-line-200, #E5E0D5);
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    /* Selected Book Card matching Screen 2 */
    .selected-book-card {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding: 1.25rem;
      background: #FAF9F6;
      border: 1px solid var(--color-line-200, #E5E0D5);
      border-radius: 10px;
      position: relative;
    }

    .book-cover-wrap {
      width: 72px;
      height: 100px;
      border-radius: 6px;
      overflow: hidden;
      flex-shrink: 0;
      background: #ffffff;
      border: 1px solid var(--color-line-100, #EFECE6);
    }

    .book-cover {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .book-cover-fallback {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1f2e2b 0%, #003D30 100%);
      color: #ffffff;
      font-weight: 700;
      font-size: 0.8125rem;
    }

    .book-meta {
      flex: 1;
      min-width: 0;
    }

    .book-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-charcoal-900, #1F2421);
      margin: 0 0 0.25rem;
    }

    .book-author {
      font-size: 0.84375rem;
      color: var(--color-charcoal-600, #5A625D);
      margin: 0;
    }

    .book-category {
      display: inline-block;
      margin-top: 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      background: var(--color-primary-soft, #EAF2EF);
      color: var(--color-primary, #003D30);
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
    }

    .clear-book-btn {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: transparent;
      border: none;
      color: var(--color-charcoal-500, #737C76);
      cursor: pointer;
      padding: 0.35rem;
      border-radius: 4px;

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover {
        color: var(--color-charcoal-900, #1F2421);
        background: rgba(0, 0, 0, 0.05);
      }
    }

    /* Book search section */
    .book-search-section {
      position: relative;
    }

    .field-label {
      display: block;
      font-size: var(--type-form-label-size, 0.84375rem);
      font-weight: 600;
      color: var(--color-charcoal-900, #1F2421);
      margin-bottom: 0.5rem;
    }

    .muted-label {
      font-weight: 400;
      color: var(--color-charcoal-500, #737C76);
    }

    .search-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 1rem;
      width: 18px;
      height: 18px;
      color: var(--color-charcoal-500, #737C76);
    }

    .search-input {
      width: 100%;
      border: 1px solid var(--color-line-300, #D8D2C4);
      border-radius: 8px;
      padding: 0.75rem 1rem 0.75rem 2.75rem;
      font-size: 0.875rem;
      font-family: inherit;
      color: var(--color-charcoal-900, #1F2421);
      box-sizing: border-box;

      &:focus {
        outline: none;
        border-color: var(--color-primary, #003D30);
        box-shadow: 0 0 0 3px rgba(0, 61, 48, 0.1);
      }
    }

    .search-loading {
      font-size: 0.8125rem;
      color: var(--color-charcoal-500, #737C76);
      margin-top: 0.5rem;
    }

    .search-results-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: #ffffff;
      border: 1px solid var(--color-line-200, #E5E0D5);
      border-radius: 8px;
      margin-top: 0.25rem;
      max-height: 260px;
      overflow-y: auto;
      z-index: 50;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08);
    }

    .search-result-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.625rem 0.875rem;
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--color-line-100, #EFECE6);
      text-align: left;
      cursor: pointer;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: #FAF9F6;
      }
    }

    .mini-thumb {
      width: 32px;
      height: 44px;
      border-radius: 3px;
      overflow: hidden;
      flex-shrink: 0;
      background: var(--color-bg-canvas, #FDFCF9);
    }

    .mini-thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .mini-thumb-fallback {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-primary-soft, #EAF2EF);
      color: var(--color-primary, #003D30);
      font-weight: 700;
      font-size: 0.65rem;
    }

    .result-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .result-title {
      font-size: 0.84375rem;
      color: var(--color-charcoal-900, #1F2421);
    }

    .result-author {
      font-size: 0.75rem;
      color: var(--color-charcoal-500, #737C76);
    }

    .no-search-results {
      font-size: 0.8125rem;
      color: var(--color-charcoal-500, #737C76);
      margin-top: 0.5rem;
    }

    /* Form textarea */
    .form-textarea {
      width: 100%;
      border: 1px solid var(--color-line-300, #D8D2C4);
      border-radius: 8px;
      padding: 0.875rem 1rem;
      font-size: 0.875rem;
      font-family: inherit;
      color: var(--color-charcoal-900, #1F2421);
      box-sizing: border-box;
      resize: vertical;

      &:focus {
        outline: none;
        border-color: var(--color-primary, #003D30);
        box-shadow: 0 0 0 3px rgba(0, 61, 48, 0.1);
      }
    }

    .char-counter {
      text-align: right;
      font-size: 0.75rem;
      color: var(--color-charcoal-500, #737C76);
      margin-top: 0.35rem;

      &.near-limit {
        color: #d97706;
      }
    }

    /* Visibility Section */
    .visibility-section {
      margin-top: 1.5rem;
    }

    .visibility-label-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 0.5rem;
    }

    .info-icon {
      color: var(--color-charcoal-500, #737C76);
      display: inline-flex;
      cursor: help;

      svg {
        width: 15px;
        height: 15px;
      }
    }

    .visibility-selector {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 1px solid var(--color-line-300, #D8D2C4);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      background: #ffffff;
    }

    .vis-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .group-icon {
      width: 18px;
      height: 18px;
      color: var(--color-charcoal-600, #5A625D);
    }

    .vis-text {
      font-size: 0.875rem;
      color: var(--color-charcoal-900, #1F2421);
      font-weight: 500;
    }

    .chevron-icon {
      width: 16px;
      height: 16px;
      color: var(--color-charcoal-500, #737C76);
    }

    .alert-error {
      background: #FEE2E2;
      border: 1px solid #FECACA;
      color: #991B1B;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin-top: 1.25rem;
      font-size: 0.84375rem;
    }

    /* Action Footer */
    .action-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 1rem;
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--color-line-200, #E5E0D5);
    }

    .btn-cancel {
      display: inline-flex;
      align-items: center;
      padding: 0.625rem 1.25rem;
      border: 1px solid var(--color-line-200, #E5E0D5);
      border-radius: 8px;
      font-size: var(--type-button-size, 0.84375rem);
      font-weight: 500;
      color: var(--color-charcoal-600, #5A625D);
      text-decoration: none;
      background: #ffffff;

      &:hover {
        background: var(--color-bg-canvas, #FDFCF9);
      }
    }

    .btn-recommend {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.35rem;
      border: none;
      border-radius: 8px;
      font-size: var(--type-button-size, 0.84375rem);
      font-weight: 600;
      background: var(--color-primary, #003D30);
      color: #ffffff;
      cursor: pointer;
      transition: background 0.15s ease;

      .send-icon {
        width: 16px;
        height: 16px;
      }

      &:hover {
        background: var(--color-primary-hover, #002B22);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
  `]
})
export class RecommendBookPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalogueService = inject(CatalogueService);
  private readonly recService = inject(RecommendationService);

  readonly selectedBook = signal<BookSummary | null>(null);
  readonly coverBroken = signal(false);

  searchQuery = '';
  readonly searchResults = signal<BookSummary[]>([]);
  readonly searching = signal(false);
  private searchSubject = new Subject<string>();

  message = '';
  readonly pending = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    // Check if bookId passed via query params
    const queryBookId = this.route.snapshot.queryParamMap.get('bookId');
    if (queryBookId) {
      this.catalogueService.get(queryBookId).subscribe({
        next: (book) => {
          this.selectedBook.set(book);
        },
        error: () => {}
      });
    }

    // Setup debounced search
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => {
        if (!q || q.trim().length < 2) {
          this.searching.set(false);
          this.searchResults.set([]);
          return [];
        }
        this.searching.set(true);
        return this.catalogueService.search({ q: q.trim() }, 0).pipe(
          finalize(() => this.searching.set(false))
        );
      })
    ).subscribe({
      next: (page) => {
        if ('content' in page) {
          this.searchResults.set(page.content);
        }
      },
      error: () => {
        this.searchResults.set([]);
      }
    });
  }

  onSearchChange(query: string): void {
    this.searchSubject.next(query);
  }

  selectBook(book: BookSummary): void {
    this.selectedBook.set(book);
    this.searchQuery = '';
    this.searchResults.set([]);
    this.coverBroken.set(false);
  }

  clearSelectedBook(): void {
    this.selectedBook.set(null);
    this.coverBroken.set(false);
  }

  submitRecommendation(): void {
    const book = this.selectedBook();
    if (!book) {
      this.error.set('Please select a book to recommend.');
      return;
    }

    const trimmed = this.message.trim();
    if (this.message.length > 0 && trimmed.length === 0) {
      this.error.set('Recommendation message cannot contain only whitespace.');
      return;
    }

    this.pending.set(true);
    this.error.set(null);

    this.recService.createRecommendation(book.id, trimmed ? trimmed : undefined)
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe({
        next: () => {
          this.router.navigate(['/workspace/recommendations']);
        },
        error: (err) => {
          if (err.status === 409) {
            this.error.set(err.error?.message || 'You have already recommended this book.');
          } else if (err.status === 401) {
            this.error.set('Your session has expired. Please sign in again.');
          } else if (err.status === 403) {
            this.error.set('Only faculty members are authorized to recommend books.');
          } else if (err.status === 404) {
            this.error.set(err.error?.message || 'The selected book could not be found.');
          } else if (err.status === 400) {
            this.error.set(err.error?.message || 'Please check your recommendation details and try again.');
          } else if (err.error?.message) {
            this.error.set(err.error.message);
          } else {
            this.error.set('Could not submit recommendation. Please try again.');
          }
        }
      });
  }
}
