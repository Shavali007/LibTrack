import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService, UserProfile } from '../auth/auth.service';
import { SignInDialogComponent } from '../auth/sign-in-dialog.component';
import { BookSummary, CatalogueService, Category } from './catalogue.service';
import { RecommendationService, Recommendation } from '../recommendations/recommendation.service';
import { RecommendModalComponent, RecommendableBook } from '../recommendations/recommend-modal.component';
import { WishlistService } from '../wishlist/wishlist.service';

@Component({
  selector: 'app-book-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SignInDialogComponent, RecommendModalComponent],
  template: `
    @if (!isInsideWorkspace()) {
      <header class="catalogue-public-nav">
        <a class="brand" routerLink="/" aria-label="LibTrack home">
          <span class="brand-icon" aria-hidden="true">▤</span>
          <strong>LibTrack</strong>
        </a>
        <nav aria-label="Catalogue navigation">
          <a routerLink="/">Home</a>
          @if (auth.profile()) {
            <a routerLink="/workspace">My workspace</a>
          } @else {
            <button class="button button-secondary" type="button" (click)="openSignIn()">Sign in</button>
          }
        </nav>
      </header>
    }

    <!-- Page Header matching Reference Mockup -->
    <header class="page-header">
      <div class="header-left">
        <h1 class="page-title">Books & Catalogue</h1>
        <p class="page-subtitle">Search, manage and organize your library collection.</p>
      </div>
      @if (auth.profile()?.role === 'LIBRARIAN') {
        <a class="add-book-btn" routerLink="/workspace/librarian/books/new">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="btn-icon">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add New Book
        </a>
      }
    </header>

    <!-- Search & Filter Bar matching Reference Mockup -->
    <form class="catalogue-toolbar" (ngSubmit)="apply()" aria-label="Search catalogue">
      <div class="search-input-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <label for="q" class="sr-only">Title, author, subject, ISBN or keyword</label>
        <input
          id="q"
          name="q"
          [(ngModel)]="q"
          placeholder="Search by title, author, subject or ISBN..."
          autocomplete="off"
        >
      </div>

      <div class="select-field">
        <label for="category" class="sr-only">Category</label>
        <select id="category" name="category" [(ngModel)]="category">
          <option value="">All Categories</option>
          @for (c of categories(); track c.id) {
            <option [value]="c.name">{{ c.name }}</option>
          }
        </select>
        <svg class="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      <div class="select-field">
        <label for="availability" class="sr-only">Availability</label>
        <select id="availability" name="availability" [(ngModel)]="availability">
          <option value="">All Status</option>
          <option value="true">Available</option>
          <option value="false">Unavailable</option>
        </select>
        <svg class="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      <button class="filter-submit-btn" type="submit">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="filter-icon">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
        </svg>
        Filter
      </button>

      @if (q || category || availability) {
        <div class="filter-actions">
          <span class="filter-chip">Filters applied</span>
          <button class="text-button" type="button" (click)="clearFilters()">Clear filters</button>
        </div>
      }
    </form>

    <!-- Category Chips Filter Row -->
    <div class="category-chips-row" role="tablist" aria-label="Filter by category">
      <button
        type="button"
        class="category-chip"
        [class.active]="category === '' && !facultyRecommendedOnly()"
        (click)="selectCategory('')"
      >
        All ({{ total() }})
      </button>
      <button
        type="button"
        class="category-chip faculty-filter-chip"
        [class.active]="facultyRecommendedOnly()"
        (click)="toggleFacultyRecommended()"
      >
        🎓 Faculty Recommended
        @if (facultyRecommendedOnly()) {
          <span class="chip-remove" aria-hidden="true">&times;</span>
        }
      </button>
      @for (c of categories(); track c.id) {
        <button
          type="button"
          class="category-chip"
          [class.active]="category.toLowerCase() === c.name.toLowerCase() && !facultyRecommendedOnly()"
          (click)="selectCategory(c.name)"
        >
          {{ c.name }}
        </button>
      }
    </div>

    @if (error()) {
      <div class="alert alert-error error-row" role="alert">
        <span>{{ error() }}</span>
        <button class="button button-secondary" type="button" (click)="load(page())">Retry</button>
      </div>
    }

    @if (loading()) {
      <div class="loading-state" role="status" aria-live="polite">Loading catalogue…</div>
    } @else if (!error() && displayedBooks().length === 0) {
      <section class="empty-state">
        <div class="empty-icon-circle" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
        </div>
        <h2>No books found</h2>
        <p>There are no catalogue records matching these filters. Try a broader search or clear filters.</p>
        <button class="button button-secondary" type="button" (click)="clearFilters()">Clear filters</button>
      </section>
    } @else if (!error()) {
      <!-- Book Table View matching Reference Mockup -->
      <div class="table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th scope="col" style="width: 32%;">Book</th>
                <th scope="col" style="width: 20%;">Author</th>
                <th scope="col" style="width: 16%;">Category</th>
                <th scope="col" style="width: 12%;">Copies</th>
                <th scope="col" style="width: 12%;">Status</th>
                <th scope="col" style="width: 8%; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (book of displayedBooks(); track book.id) {
                <tr class="book-row">
                  <!-- Book Info -->
                  <td>
                    <div class="book-cell">
                      <a class="book-thumb-link" [routerLink]="bookLink(book.id)" [queryParams]="currentQueryParams()" [attr.aria-label]="'View '+book.title">
                        @if (book.coverImageUrl && !broken().has(book.id)) {
                          <img class="book-thumb" [src]="book.coverImageUrl" [alt]="'Cover of '+book.title" loading="lazy" (error)="markBroken(book.id)">
                        } @else {
                          <div class="thumb-fallback" aria-hidden="true">
                            <span>{{ book.title.substring(0, 3).toUpperCase() }}</span>
                          </div>
                        }
                      </a>
                      <div class="book-title-meta">
                        <a class="book-title" [routerLink]="bookLink(book.id)" [queryParams]="currentQueryParams()">
                          {{ book.title }}
                        </a>
                        <div class="book-submeta">
                          @if (book.isbn) {
                            <span class="meta-isbn">ISBN: {{ book.isbn }}</span>
                          } @else {
                            <span class="meta-isbn muted">No ISBN</span>
                          }
                          @if (book.hasDigitalEdition) {
                            <span class="badge-pdf">PDF</span>
                          }
                          @if (recommendedBookIds().has(book.id)) {
                            <span class="badge-faculty-rec" title="Recommended by faculty">🎓 Faculty Recommended</span>
                          }
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- Author -->
                  <td>
                    <span class="author-text">{{ book.authors.join(', ') || 'Unknown Author' }}</span>
                  </td>

                  <!-- Category -->
                  <td>
                    <span class="badge-category" [ngClass]="getCategoryClass(book.categories[0] || '')">
                      {{ book.categories[0] || 'General' }}
                    </span>
                  </td>

                  <!-- Copies: small bordered container -->
                  <td>
                    <div class="copies-cell">
                      <span class="copies-box" [title]="book.totalCopies + ' total · ' + book.availableCopies + ' available · ' + book.onLoanCopies + ' on loan'">
                        {{ book.availableCopies }}
                      </span>
                      <span class="sr-only">
                        {{ book.totalCopies }} total · {{ book.availableCopies }} available · {{ book.onLoanCopies }} on loan
                      </span>
                    </div>
                  </td>

                  <!-- Status -->
                  <td>
                    <span
                      class="status-pill"
                      [class.status-available]="book.availableCopies > 0"
                      [class.status-unavailable]="book.availableCopies === 0"
                    >
                      <span class="status-dot"></span>
                      {{ book.availableCopies > 0 ? 'Active' : 'Unavailable' }}
                    </span>
                  </td>

                  <!-- Actions -->
                  <td style="text-align: right;">
                    <div class="row-actions">
                      <a
                        class="action-icon-btn"
                        [routerLink]="bookLink(book.id)"
                        [queryParams]="currentQueryParams()"
                        title="View details"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </a>
                      @if (auth.profile()?.role === 'STUDENT' && book.availableCopies === 0) {
                        <a
                          class="action-icon-btn action-reserve-btn"
                          [routerLink]="bookLink(book.id)"
                          [queryParams]="currentQueryParams()"
                          title="Reserve book"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                          </svg>
                        </a>
                      }
                      @if (auth.profile()?.role === 'STUDENT' || auth.profile()?.role === 'FACULTY') {
                        <button
                          type="button"
                          class="action-icon-btn action-wishlist-btn"
                          [class.is-wishlisted]="wishlistService.isInWishlist(book.id)"
                          [title]="wishlistService.isInWishlist(book.id) ? 'Remove from wishlist' : 'Add to wishlist'"
                          (click)="wishlistService.toggleWishlist(book.id).subscribe()"
                        >
                          <svg viewBox="0 0 24 24" [attr.fill]="wishlistService.isInWishlist(book.id) ? '#DC2626' : 'none'" [attr.stroke]="wishlistService.isInWishlist(book.id) ? '#DC2626' : 'currentColor'" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                          </svg>
                        </button>
                      }
                      @if (auth.profile()?.role === 'FACULTY') {
                        <button
                          type="button"
                          class="action-icon-btn action-rec-btn"
                          [class.is-rec]="recommendedBookIds().has(book.id)"
                          [title]="recommendedBookIds().has(book.id) ? 'Already recommended' : 'Recommend book'"
                          (click)="openRecommendModal(book)"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                            <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                          </svg>
                        </button>
                      }
                      @if (auth.profile()?.role === 'LIBRARIAN') {
                        <a
                          class="action-icon-btn"
                          [routerLink]="['/workspace/librarian/books', book.id, 'edit']"
                          title="Edit book"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </a>
                        <a
                          class="action-icon-btn"
                          [routerLink]="['/workspace/librarian/books', book.id, 'copies']"
                          title="Manage copies"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="1.5"></circle>
                            <circle cx="19" cy="12" r="1.5"></circle>
                            <circle cx="5" cy="12" r="1.5"></circle>
                          </svg>
                        </a>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Table Footer / Pagination -->
        <div class="table-footer">
          <p class="result-count" aria-live="polite">
            Showing {{ getStartIndex() }} to {{ getEndIndex() }} of {{ total() }} books
            <span class="sr-only">({{ total() }} catalogue {{ total() === 1 ? 'record' : 'records' }})</span>
          </p>

          <nav class="pagination-controls" aria-label="Catalogue pages">
            <button
              class="pagination-btn"
              type="button"
              (click)="load(page() - 1)"
              [disabled]="page() === 0"
              aria-label="Previous page"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="page-nav-icon">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            @for (p of getPageNumbers(); track $index) {
              @if (p === '...') {
                <span class="pagination-ellipsis">…</span>
              } @else {
                <button
                  type="button"
                  class="pagination-page"
                  [class.active]="page() + 1 === p"
                  (click)="load(+p - 1)"
                >
                  {{ p }}
                </button>
              }
            }
            <button
              class="pagination-btn"
              type="button"
              (click)="load(page() + 1)"
              [disabled]="page() + 1 >= pages()"
              aria-label="Next page"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="page-nav-icon">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </nav>
        </div>
      </div>
    }

    @if (showDialog()) {
      <app-sign-in-dialog
        [initialRole]="loginRole()"
        (dismissed)="showDialog.set(false)"
        (authenticated)="onAuthenticated($event)"
      />
    }

    @if (selectedBookForRec()) {
      <app-recommend-modal
        [book]="selectedBookForRec()"
        (dismissed)="selectedBookForRec.set(null)"
        (recommended)="onBookRecommended($event)"
      />
    }
  `,
  styles: [`
    :host {
      display: block;
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

    /* Public navigation when viewed outside workspace */
    .catalogue-public-nav {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      min-height: 3.5rem;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      padding: 0.75rem 1.5rem;
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--color-line-200);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--color-forest-900);
      text-decoration: none;
    }
    .brand-icon {
      display: grid;
      width: 2rem;
      height: 2rem;
      place-items: center;
      border-radius: 6px;
      color: #fff;
      background: var(--color-forest-900);
    }
    .brand strong {
      font-family: var(--font-serif);
      font-size: 1.25rem;
    }
    .catalogue-public-nav nav {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }
    .catalogue-public-nav nav a {
      font-size: 0.88rem;
      font-weight: 550;
      color: var(--color-charcoal-700);
      text-decoration: none;
    }
    .catalogue-public-nav nav a:hover {
      color: var(--color-forest-900);
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.15rem;
    }
    .page-title {
      font-family: var(--type-page-title-family);
      font-size: var(--type-page-title-size);
      font-weight: var(--type-page-title-weight);
      color: var(--type-page-title-color);
      margin: 0 0 0.3rem;
      line-height: var(--type-page-title-line);
      letter-spacing: var(--letter-spacing-tight);
    }
    .page-subtitle {
      font-size: var(--type-page-subtitle-size);
      color: var(--type-page-subtitle-color);
      margin: 0;
    }
    .add-book-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.55rem 1.15rem;
      font-size: var(--type-button-size);
      font-weight: var(--type-button-weight);
      background: var(--sidebar-bg);
      color: #ffffff;
      border-radius: var(--radius-control);
      text-decoration: none;
      transition: background 0.15s ease;
      box-shadow: 0 1px 3px rgba(0, 61, 48, 0.2);
    }
    .add-book-btn:hover {
      background: #002B22;
    }
    .btn-icon {
      width: 1rem;
      height: 1rem;
    }

    /* Toolbar / Search */
    .catalogue-toolbar {
      display: grid;
      grid-template-columns: 1fr 180px 150px auto;
      gap: 0.85rem;
      padding: 0.85rem 1.15rem;
      margin-bottom: 0.85rem;
      align-items: center;
      background: #ffffff;
      border: 1px solid #ECEAE3;
      border-radius: 12px;
      box-shadow: 0 1px 4px rgba(10, 30, 20, 0.02);
    }
    .search-input-wrap {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 0 0.85rem;
      height: 42px;
      box-sizing: border-box;
    }
    .search-icon {
      width: 1.1rem;
      height: 1.1rem;
      color: #94A3B8;
      flex-shrink: 0;
    }
    .search-input-wrap input {
      border: 0;
      background: transparent;
      outline: none;
      font-size: 0.88rem;
      width: 100%;
      color: #1E293B;
    }
    .search-input-wrap input::placeholder {
      color: #94A3B8;
    }
    .select-field {
      position: relative;
      display: flex;
      align-items: center;
    }
    .select-field select {
      width: 100%;
      height: 42px;
      padding: 0 2.2rem 0 0.85rem;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      background: #ffffff;
      font-size: 0.85rem;
      font-weight: 500;
      color: #334155;
      outline: none;
      appearance: none;
      cursor: pointer;
      box-sizing: border-box;
    }
    .select-field select:focus {
      border-color: #003D30;
    }
    .select-chevron {
      position: absolute;
      right: 0.75rem;
      width: 1rem;
      height: 1rem;
      color: #64748B;
      pointer-events: none;
    }
    .filter-submit-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      height: 42px;
      padding: 0 1.25rem;
      font-size: 0.85rem;
      font-weight: 550;
      background: #FFFFFF;
      color: #334155;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      box-sizing: border-box;
    }
    .filter-submit-btn:hover {
      background: #F8FAFC;
      border-color: #CBD5E1;
      color: #0F172A;
    }
    .filter-icon {
      width: 1rem;
      height: 1rem;
      color: #64748B;
    }
    .filter-actions {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 0.5rem;
      border-top: 1px solid #E2E8F0;
    }
    .filter-chip {
      font-size: 0.75rem;
      padding: 0.2rem 0.6rem;
      border-radius: 20px;
      background: #EAF2EF;
      color: #003D30;
      font-weight: 600;
    }
    .text-button {
      border: 0;
      background: transparent;
      color: #003D30;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: underline;
    }

    /* Category Chips Filter Row */
    .category-chips-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      margin-bottom: 1.15rem;
      overflow-x: auto;
      padding-bottom: 0.25rem;
    }
    .category-chip {
      padding: 0.35rem 0.95rem;
      border-radius: 20px;
      border: 1px solid transparent;
      background: #F1F4F1;
      color: #4A5568;
      font-size: 0.82rem;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .category-chip:hover {
      background: #E5EBE5;
      color: #1E293B;
    }
    .category-chip.active {
      background: #E8F5EE;
      border-color: #003D30;
      color: #003D30;
      font-weight: 700;
    }

    /* Table Card */
    .table-card {
      background: #ffffff;
      border: 1px solid #ECEAE3;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(10, 30, 20, 0.02);
      margin-bottom: 1.5rem;
    }
    .table-responsive {
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .data-table th {
      padding: 0.85rem 1rem;
      font-size: 0.8rem;
      font-weight: 650;
      color: #1E293B;
      background: #FFFFFF;
      border-bottom: 1px solid #F1F5F9;
    }
    .data-table td {
      padding: 0.65rem 1rem;
      border-bottom: 1px solid #F8FAFC;
      vertical-align: middle;
      font-size: 0.85rem;
    }
    .book-row:hover {
      background: #FBFDFB;
    }

    /* Book cell */
    .book-cell {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .book-thumb-link {
      display: block;
      flex-shrink: 0;
      text-decoration: none;
    }
    .book-thumb {
      width: 44px;
      height: 60px;
      object-fit: cover;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      display: block;
    }
    .thumb-fallback {
      width: 44px;
      height: 60px;
      border-radius: 4px;
      background: linear-gradient(135deg, #002B22 0%, #003D30 100%);
      color: #ffffff;
      display: grid;
      place-items: center;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .book-title-meta {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .book-title {
      font-weight: 700;
      font-size: 0.92rem;
      color: #0F172A;
      text-decoration: none;
      line-height: 1.25;
    }
    .book-title:hover {
      color: #003D30;
      text-decoration: underline;
    }
    .book-submeta {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .meta-isbn {
      font-size: 0.78rem;
      color: #64748B;
      font-feature-settings: "tnum";
    }
    .badge-pdf {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      background: #FDF0EE;
      color: #DC2626;
      border: 1px solid #FCA5A5;
    }
    .badge-faculty-rec {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      background: #EAF2EF;
      color: #003D30;
      border: 1px solid #C2D6CF;
      white-space: nowrap;
    }
    .faculty-filter-chip {
      background: #F4F8F6;
      border-color: #C2D6CF;
      color: #003D30;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }
    .faculty-filter-chip.active {
      background: #003D30 !important;
      color: #ffffff !important;
    }
    .chip-remove {
      font-size: 0.9rem;
      line-height: 1;
      margin-left: 0.2rem;
    }
    .action-rec-btn {
      color: #003D30;
    }
    .action-rec-btn.is-rec {
      background: #EAF2EF;
      color: #003D30;
    }

    /* Author */
    .author-text {
      color: #334155;
      font-size: 0.85rem;
    }

    /* Category Badges */
    .badge-category {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .cat-programming {
      background: #EEF2FF;
      color: #4338CA;
    }
    .cat-cs {
      background: #EDE9FE;
      color: #6D28D9;
    }
    .cat-ds {
      background: #E0F2FE;
      color: #0369A1;
    }
    .cat-web {
      background: #E6FFFA;
      color: #0D9488;
    }
    .cat-science {
      background: #E0F2FE;
      color: #0284C7;
    }
    .cat-default {
      background: #F1F5F9;
      color: #475569;
    }

    /* Copies Box */
    .copies-box {
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 0.3rem 0.75rem;
      font-weight: 600;
      color: #334155;
      font-size: 0.82rem;
      display: inline-block;
      min-width: 36px;
      text-align: center;
      background: #FFFFFF;
    }

    /* Status Pill */
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.25rem 0.75rem;
      border-radius: 14px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .status-available {
      background: #EAF2EF;
      color: #003D30;
      border: 1px solid #C2D6CF;
    }
    .status-available .status-dot {
      background: #003D30;
    }
    .status-unavailable {
      background: #FEF3C7;
      color: #D97706;
    }
    .status-unavailable .status-dot {
      background: #D97706;
    }

    /* Row Actions */
    .row-actions {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .action-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      color: #64748B;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      text-decoration: none;
      transition: all 0.15s ease;
      cursor: pointer;
    }
    .action-icon-btn:hover {
      color: #0F172A;
      border-color: #CBD5E1;
      background: #F8FAFC;
    }
    .action-wishlist-btn.is-wishlisted {
      border-color: #FECACA;
      background: #FEF2F2;
    }
    .action-icon-btn svg {
      width: 1rem;
      height: 1rem;
    }

    /* Table Footer */
    .table-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1.25rem;
      background: #FFFFFF;
      border-top: 1px solid #F1F5F9;
    }
    .result-count {
      margin: 0;
      font-size: 0.82rem;
      color: #64748B;
    }
    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .pagination-btn, .pagination-page {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 550;
      border: 1px solid transparent;
      background: #ffffff;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .pagination-btn {
      border-color: #E2E8F0;
      color: #64748B;
    }
    .pagination-btn:hover:not(:disabled) {
      background: #F8FAFC;
      border-color: #CBD5E1;
      color: #0F172A;
    }
    .pagination-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
    .pagination-page:hover:not(.active) {
      border-color: #E2E8F0;
      background: #F8FAFC;
    }
    .pagination-page.active {
      background: #003D30;
      color: #ffffff;
      font-weight: 700;
    }
    .pagination-ellipsis {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      color: #94A3B8;
      font-size: 0.85rem;
    }
    .page-nav-icon {
      width: 14px;
      height: 14px;
    }

    /* Empty state */
    .empty-state {
      padding: 3.5rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #ffffff;
      border: 1px solid #ECEAE3;
      border-radius: 12px;
    }
    .empty-icon-circle {
      width: 3.75rem;
      height: 3.75rem;
      border-radius: 50%;
      background: #EAF2EF;
      color: #003D30;
      display: grid;
      place-items: center;
      margin-bottom: 1rem;
    }
    .empty-icon-circle svg {
      width: 1.85rem;
      height: 1.85rem;
    }
    .empty-state h2 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #112A20;
      margin: 0 0 0.4rem;
    }
    .empty-state p {
      font-size: 0.85rem;
      color: #64748B;
      max-width: 24rem;
      margin: 0 0 1.25rem;
    }

    .loading-state {
      padding: 3rem;
      text-align: center;
      color: #64748B;
      font-size: 0.9rem;
      background: #ffffff;
      border: 1px solid #ECEAE3;
      border-radius: 12px;
    }

    .error-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    /* Responsive */
    @media (max-width: 900px) {
      .catalogue-toolbar {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class BookListComponent {
  private readonly service = inject(CatalogueService);
  private readonly recService = inject(RecommendationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);
  readonly wishlistService = inject(WishlistService);

  readonly books = signal<BookSummary[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly total = signal(0);
  readonly pages = signal(0);
  readonly page = signal(0);
  readonly broken = signal(new Set<string>());
  readonly showDialog = signal(false);
  readonly loginRole = signal<'STUDENT' | 'FACULTY' | 'LIBRARIAN'>('STUDENT');

  readonly recommendedBookIds = signal<Set<string>>(new Set());
  readonly facultyRecommendedOnly = signal(false);
  readonly selectedBookForRec = signal<RecommendableBook | null>(null);

  readonly displayedBooks = computed(() => {
    const list = this.books();
    if (this.facultyRecommendedOnly()) {
      return list.filter(b => this.recommendedBookIds().has(b.id));
    }
    return list;
  });

  q = '';
  category = '';
  availability = '';

  private applied = { q: '', category: '', availability: '' };
  private searchRequest = 0;

  constructor() {
    this.q = this.route.snapshot.queryParamMap.get('q') || '';
    this.category = this.route.snapshot.queryParamMap.get('category') || '';
    this.availability = this.route.snapshot.queryParamMap.get('availability') || '';
    if (this.route.snapshot.queryParamMap.get('facultyRecommended') === 'true') {
      this.facultyRecommendedOnly.set(true);
    }
    this.applied = { q: this.q.trim(), category: this.category.trim(), availability: this.availability };

    this.service.categories().subscribe({
      next: x => this.categories.set(x),
      error: () => this.error.set('Categories could not be loaded. Please try again.')
    });

    this.recService.getRecommendedBookIds().subscribe({
      next: ids => this.recommendedBookIds.set(new Set(ids)),
      error: () => {}
    });

    this.load();

    this.route.queryParamMap.subscribe(params => {
      const q = params.get('q') || '';
      const cat = params.get('category') || '';
      const avail = params.get('availability') || '';
      if (q.trim() !== this.applied.q || cat.trim() !== this.applied.category || avail !== this.applied.availability) {
        this.q = q;
        this.category = cat;
        this.availability = avail;
        this.applied = { q: q.trim(), category: cat.trim(), availability: avail };
        this.load(0);
      }
    });
  }

  isInsideWorkspace(): boolean {
    return this.router.url.startsWith('/workspace');
  }

  bookLink(bookId: string): string[] {
    return this.isInsideWorkspace() ? ['/workspace/books', bookId] : ['/books', bookId];
  }

  currentQueryParams(): Record<string, string | null> {
    return {
      q: this.applied.q || null,
      category: this.applied.category || null,
      availability: this.applied.availability || null,
    };
  }

  apply() {
    this.applied = { q: this.q.trim(), category: this.category.trim(), availability: this.availability };
    this.load(0);
  }

  selectCategory(catName: string) {
    this.category = catName;
    this.apply();
  }

  toggleFacultyRecommended() {
    this.facultyRecommendedOnly.update(v => !v);
  }

  openRecommendModal(book: BookSummary) {
    this.selectedBookForRec.set({
      id: book.id,
      title: book.title,
      authors: book.authors,
      coverImageUrl: book.coverImageUrl,
      categories: book.categories,
    });
  }

  onBookRecommended(rec: Recommendation) {
    this.recommendedBookIds.update(set => new Set(set).add(rec.bookId));
    this.selectedBookForRec.set(null);
  }

  clearFilters() {
    this.q = '';
    this.category = '';
    this.availability = '';
    this.facultyRecommendedOnly.set(false);
    this.applied = { q: '', category: '', availability: '' };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: null, category: null, availability: null },
      queryParamsHandling: 'merge',
    });
    this.load(0);
  }

  load(p = 0) {
    const request = ++this.searchRequest;
    this.loading.set(true);
    this.error.set('');
    this.service
      .search(
        {
          q: this.applied.q,
          category: this.applied.category,
          available: this.applied.availability === '' ? null : this.applied.availability === 'true',
        },
        p
      )
      .pipe(
        finalize(() => {
          if (request === this.searchRequest) this.loading.set(false);
        })
      )
      .subscribe({
        next: r => {
          if (request !== this.searchRequest) return;
          this.books.set(r.content);
          this.total.set(r.totalElements);
          this.pages.set(r.totalPages);
          this.page.set(r.page);
          const bookIds = r.content.map(b => b.id).filter(Boolean);
          if (bookIds.length > 0 && (this.auth.profile()?.role === 'STUDENT' || this.auth.profile()?.role === 'FACULTY')) {
            this.wishlistService.checkStatus(bookIds).subscribe();
          }
        },
        error: () => {
          if (request === this.searchRequest) {
            this.error.set('The catalogue could not be loaded. Check your connection and try again.');
          }
        },
      });
  }

  markBroken(id: string) {
    this.broken.update(x => new Set(x).add(id));
  }

  openSignIn() {
    this.loginRole.set('STUDENT');
    this.showDialog.set(true);
  }

  onAuthenticated(profile: UserProfile) {
    this.showDialog.set(false);
    if (profile.role === 'STUDENT' || profile.role === 'FACULTY') {
      this.loginRole.set(profile.role);
    }
  }

  getStartIndex(): number {
    return this.total() === 0 ? 0 : this.page() * 12 + 1;
  }

  getEndIndex(): number {
    return Math.min((this.page() + 1) * 12, this.total());
  }

  getPageNumbers(): (number | string)[] {
    const totalPages = this.pages();
    const current = this.page() + 1;
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (current >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', current - 1, current, current + 1, '...', totalPages];
  }

  getCategoryClass(category: string): string {
    const cat = (category || '').toLowerCase();
    if (cat.includes('program')) return 'cat-programming';
    if (cat.includes('comput')) return 'cat-cs';
    if (cat.includes('struct') || cat.includes('algo')) return 'cat-ds';
    if (cat.includes('web')) return 'cat-web';
    if (cat.includes('sci') || cat.includes('math') || cat.includes('chem') || cat.includes('phys')) return 'cat-science';
    return 'cat-default';
  }
}
