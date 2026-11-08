import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService, UserProfile, OFFICIAL_DEPARTMENTS } from '../auth/auth.service';
import { SignInDialogComponent } from '../auth/sign-in-dialog.component';
import { BookSummary, CatalogueService, CatalogueStatistics, Category } from './catalogue.service';
import { RecommendationService, Recommendation } from '../recommendations/recommendation.service';
import { RecommendModalComponent, RecommendableBook } from '../recommendations/recommend-modal.component';
import { WishlistService } from '../wishlist/wishlist.service';
import { PublicNavigationComponent } from '../../shared/layout/public-navigation.component';

@Component({
  selector: 'app-book-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SignInDialogComponent, RecommendModalComponent, PublicNavigationComponent],
  template: `
    <div class="catalogue-page">
    @if (!isInsideWorkspace()) {
      <app-public-navigation activePage="books" (signInRequested)="openWorkspace()" />
    }

    <div class="catalogue-content">
      <section class="catalogue-hero" aria-labelledby="catalogue-title">
        <div class="catalogue-hero-copy">
          <p class="catalogue-eyebrow">LIBRARY CATALOGUE</p>
          <h1 id="catalogue-title" class="page-title">Books &amp; Catalogue</h1>
          <p class="page-subtitle">Search, explore and find books across all subjects in the university library.</p>
        </div>
      </section>

      <section class="search-and-stats" aria-label="Catalogue search and statistics">
        <form class="catalogue-search" (ngSubmit)="apply()" role="search">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <label for="q" class="sr-only">Title, author, subject, ISBN or keyword</label>
          <input id="q" name="q" [(ngModel)]="q" placeholder="Search by title, author, subject, or ISBN..." autocomplete="off">
          <button class="search-submit" type="submit">Search</button>
        </form>
        <div class="catalogue-stats" aria-label="Catalogue totals">
          <article class="stat-card">
            <div class="stat-icon stat-icon-wrap" aria-hidden="true">
              <svg class="stat-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <div class="stat-info">
              <strong class="stat-value">{{ statistics()?.totalBooks ?? '—' }}</strong>
              <span class="stat-label">Total Books</span>
            </div>
          </article>
          <article class="stat-card">
            <div class="stat-icon stat-icon-wrap" aria-hidden="true">
              <svg class="stat-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                <rect x="14" y="14" width="7" height="7" rx="1.5"/>
                <rect x="3" y="14" width="7" height="7" rx="1.5"/>
              </svg>
            </div>
            <div class="stat-info">
              <strong class="stat-value">{{ statistics()?.totalCategories ?? '—' }}</strong>
              <span class="stat-label">Categories</span>
            </div>
          </article>
          <article class="stat-card">
            <div class="stat-icon stat-icon-wrap" aria-hidden="true">
              <svg class="stat-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
            <div class="stat-info">
              <strong class="stat-value">{{ statistics()?.availableCopies ?? '—' }}</strong>
              <span class="stat-label">Available Copies</span>
            </div>
          </article>
        </div>
        @if (statisticsLoading()) { <p class="stats-note" role="status" aria-live="polite">Loading catalogue totals…</p> }
        @else if (statisticsError()) { <p class="stats-note stats-error" role="alert">Catalogue totals are temporarily unavailable. <button class="text-button" type="button" (click)="loadStatistics()">Retry</button></p> }
        @else if (statistics()?.totalBooks === 0) { <p class="stats-note" role="status">The catalogue currently has no active books.</p> }
      </section>

    <nav class="category-chips-row" aria-label="Browse by category">
      <strong>Browse by Category:</strong>
      <button
        type="button"
        class="category-chip"
        [class.active]="category === '' && !facultyRecommendedOnly()"
        (click)="selectCategory('')"
      >
        All
      </button>
      @for (c of visibleChipCategories(); track c.id) {
        <button
          type="button"
          class="category-chip"
          [class.active]="category.toLowerCase() === c.name.toLowerCase() && !facultyRecommendedOnly()"
          (click)="selectCategory(c.name)"
        >{{ c.name }}</button>
      }
      @if (categories().length > chipCategoryLimit) {
        <button type="button" class="category-chip more-chip" (click)="showAllChips.update(v => !v)">{{ showAllChips() ? 'Less' : 'More' }} <span aria-hidden="true">⌄</span></button>
      }
      @if (auth.profile()) {
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
      }
    </nav>

    <div class="results-layout">
      <button class="mobile-filter-toggle" type="button" (click)="filtersOpen.update(v => !v)" [attr.aria-expanded]="filtersOpen()">{{ filtersOpen() ? 'Hide filters' : 'Show filters' }}</button>
      <aside class="filters-panel" [class.filters-open]="filtersOpen()" aria-label="Catalogue filters">
        <div class="filters-heading"><h2>Filters</h2><button class="text-button" type="button" (click)="clearFilters()">Clear All</button></div>
        <section class="filter-group" aria-labelledby="availability-filter-title">
          <h3 id="availability-filter-title">Availability</h3>
          <label><input type="checkbox" aria-label="Available" [checked]="draftAvailable()" (change)="setAvailability('available', $any($event.target).checked)"> Available ({{ availableCount() }})</label>
          <label><input type="checkbox" aria-label="Not Available" [checked]="draftUnavailable()" (change)="setAvailability('unavailable', $any($event.target).checked)"> Not Available ({{ unavailableCount() }})</label>
        </section>
        <section class="filter-group" aria-labelledby="department-filter-title">
          <h3 id="department-filter-title">Department</h3>
          <div class="department-filter-select-wrap">
            <select
              id="department-filter"
              class="department-select-control"
              [ngModel]="draftDepartment()"
              (ngModelChange)="setDepartment($event)"
              aria-label="Filter by department"
            >
              <option value="">All Departments</option>
              @for (dept of officialDepartments; track dept) {
                <option [value]="dept">{{ dept }}</option>
              }
            </select>
          </div>
        </section>
        <section class="filter-group" aria-labelledby="category-filter-title">
          <h3 id="category-filter-title">Category</h3>
          @for (c of visibleFilterCategories(); track c.id) {
            <label><input type="checkbox" [checked]="category.toLowerCase() === c.name.toLowerCase()" (change)="selectFilterCategory(c.name, $any($event.target).checked)"> {{ c.name }} ({{ c.bookCount ?? 0 }})</label>
          }
          @if (categories().length > filterCategoryLimit) { <button class="text-button show-more" type="button" (click)="showAllFilterCategories.update(v => !v)">{{ showAllFilterCategories() ? 'Show Less' : 'Show More' }} <span aria-hidden="true">⌄</span></button> }
        </section>
        <section class="filter-group year-filter" aria-labelledby="year-filter-title">
          <h3 id="year-filter-title">Publication Year</h3>
          @if (statistics()?.minimumPublicationYear !== null && statistics()?.minimumPublicationYear !== undefined && statistics()?.maximumPublicationYear !== null && statistics()?.maximumPublicationYear !== undefined) {
            <div class="year-values"><label>From <strong>{{ draftYearFrom() ?? statistics()!.minimumPublicationYear }}</strong></label><label>To <strong>{{ draftYearTo() ?? statistics()!.maximumPublicationYear }}</strong></label></div>
            <input aria-label="Earliest publication year" type="range" [min]="statistics()!.minimumPublicationYear!" [max]="draftYearTo() ?? statistics()!.maximumPublicationYear!" [value]="draftYearFrom() ?? statistics()!.minimumPublicationYear!" (input)="setYearFrom($any($event.target).value)">
            <input aria-label="Latest publication year" type="range" [min]="draftYearFrom() ?? statistics()!.minimumPublicationYear!" [max]="statistics()!.maximumPublicationYear!" [value]="draftYearTo() ?? statistics()!.maximumPublicationYear!" (input)="setYearTo($any($event.target).value)">
          } @else { <p class="muted">Publication years are not available in the catalogue.</p> }
        </section>
        @if (filterError()) { <p class="filter-error" role="alert">{{ filterError() }}</p> }
        <button class="apply-filters" type="button" (click)="apply()">Apply Filters</button>
      </aside>

      <section class="results-panel" aria-label="Catalogue results">
        @if (error()) {
          <div class="alert alert-error error-row" role="alert"><span>{{ error() }}</span><button class="button button-secondary" type="button" (click)="load(page())">Retry</button></div>
        }
        <div class="results-toolbar">
          <p class="result-count" aria-live="polite">Showing {{ getStartIndex() }}–{{ getEndIndex() }} of {{ total() }} books <span class="sr-only">({{ total() }} catalogue {{ total() === 1 ? 'record' : 'records' }})</span></p>
          <div class="results-controls">
            @if (auth.profile()?.role === 'LIBRARIAN') { <a class="add-book-btn compact-add" routerLink="/workspace/librarian/books/new">＋ Add Book</a> }
            <label for="catalogue-sort">Sort by:</label>
            <select id="catalogue-sort" [value]="sortSelection()" (change)="changeSort($any($event.target).value)">
              <option value="trending">Trending</option><option value="topRated">Top Rated</option><option value="title:asc">Title A–Z</option><option value="title:desc">Title Z–A</option><option value="publicationYear:desc">Newest publication year</option><option value="publicationYear:asc">Oldest publication year</option>
            </select>
            <div class="view-toggle" role="group" aria-label="Catalogue view">
              <button type="button" [class.active]="viewMode() === 'grid'" [attr.aria-pressed]="viewMode() === 'grid'" aria-label="Grid view" (click)="viewMode.set('grid')">▦</button>
              <button type="button" [class.active]="viewMode() === 'list'" [attr.aria-pressed]="viewMode() === 'list'" aria-label="List view" (click)="viewMode.set('list')">☷</button>
            </div>
          </div>
        </div>

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
          <div class="book-grid" [class.list-view]="viewMode() === 'list'">
            @for (book of displayedBooks(); track book.id) {
              <article class="book-card">
                <a class="card-cover" [routerLink]="bookLink(book.id)" [queryParams]="currentQueryParams()" [attr.aria-label]="'View '+book.title">
                  @if (book.coverImageUrl && !broken().has(book.id)) { <img [src]="book.coverImageUrl" [alt]="'Cover of '+book.title" loading="lazy" (error)="markBroken(book.id)"> }
                  @else { <span class="card-cover-fallback" aria-hidden="true">{{ book.title.substring(0, 3).toUpperCase() }}</span> }
                  @if (book.availableCopies > 0) { <span class="cover-status available">Available</span> }
                  @else { <span class="cover-status unavailable">Unavailable</span> }
                </a>
                <div class="book-main">
                  <p class="book-category">{{ book.categories[0] || 'General' }}</p>
                  <h2><a [routerLink]="bookLink(book.id)" [queryParams]="currentQueryParams()">{{ book.title }}</a></h2>
                  <p class="book-author">{{ book.authors.join(', ') || 'Unknown Author' }}</p>
                  <p class="book-isbn">{{ book.isbn ? 'ISBN: '+book.isbn : 'No ISBN listed' }}</p>
                  <div class="book-badges">
                    @if (book.department) { <span class="badge-dept">{{ book.department }}</span> }
                    @if (book.hasDigitalEdition) { <span class="badge-pdf">PDF</span> }
                    @if (recommendedBookIds().has(book.id)) { <span class="badge-faculty-rec">Faculty Recommended</span> }
                    @if (book.publicationYear) { <span>{{ book.publicationYear }}</span> }
                  </div>
                </div>
                <div class="book-action">
                  @if (book.availableCopies > 0) { <span class="availability-pill available">● {{ book.availableCopies }} Available / {{ book.totalCopies }} Copies</span> }
                  @else { <span class="availability-pill unavailable">● Currently Unavailable</span> }
                  <span class="sr-only">{{ book.totalCopies }} total copies, {{ book.availableCopies }} available, {{ book.onLoanCopies }} on loan</span>
                  @if (auth.profile()?.role === 'STUDENT' || auth.profile()?.role === 'FACULTY') {
                    @if (book.availableCopies > 0) { <a class="book-action-button primary" [routerLink]="bookLink(book.id)" [queryParams]="currentQueryParams()">Request to Borrow</a> }
                    @else if (auth.profile()?.role === 'STUDENT') { <a class="book-action-button secondary" [routerLink]="bookLink(book.id)" [queryParams]="currentQueryParams()">Reserve Book</a> }
                    @else { <span class="book-action-note">Reservation is student-only</span> }
                  } @else if (!auth.profile()) {
                    <button class="book-action-button primary" type="button" (click)="requestOrSignIn(book)">{{ book.availableCopies > 0 ? 'Request to Borrow' : 'Sign in to reserve' }}</button>
                  } @else {
                    <a class="book-action-button secondary" [routerLink]="bookLink(book.id)" [queryParams]="currentQueryParams()">View Details</a>
                  }
                  <div class="book-utilities">
                    @if (auth.profile()?.role === 'STUDENT' || auth.profile()?.role === 'FACULTY') {
                      <button type="button" class="utility-button" [class.is-wishlisted]="wishlistService.isInWishlist(book.id)" [attr.aria-label]="wishlistService.isInWishlist(book.id) ? 'Remove from wishlist' : 'Add to wishlist'" [title]="wishlistService.isInWishlist(book.id) ? 'Remove from wishlist' : 'Add to wishlist'" (click)="wishlistService.toggleWishlist(book.id).subscribe()">♡</button>
                    }
                    @if (auth.profile()?.role === 'FACULTY') { <button type="button" class="utility-button" [class.is-rec]="recommendedBookIds().has(book.id)" [attr.aria-label]="recommendedBookIds().has(book.id) ? 'Already recommended' : 'Recommend book'" title="Recommend book" (click)="openRecommendModal(book)">♧</button> }
                    <a class="utility-button" [routerLink]="bookLink(book.id)" [queryParams]="currentQueryParams()" [attr.aria-label]="'View details for '+book.title" title="View details">⌕</a>
                    @if (auth.profile()?.role === 'LIBRARIAN') { <a class="utility-button" [routerLink]="['/workspace/librarian/books', book.id, 'edit']" [attr.aria-label]="'Edit '+book.title" title="Edit book">✎</a><a class="utility-button" [routerLink]="['/workspace/librarian/books', book.id, 'copies']" [attr.aria-label]="'Manage copies for '+book.title" title="Manage copies">⋯</a> }
                  </div>
                </div>
              </article>
            }
          </div>
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
        }
      </section>
    </div>
    </div>

    @if (showDialog()) {
      <app-sign-in-dialog
        [initialRole]="loginRole()"
        [contextMessage]="signInContext()"
        (dismissed)="dismissSignIn()"
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
    .badge-dept {
      background: var(--color-primary-soft, #EAF2EF);
      color: var(--color-primary, #003D30);
      border: 1px solid var(--color-primary-border, #C2D6CF);
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-full, 9999px);
      font-size: var(--font-size-xs, 0.75rem);
      font-weight: 600;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      max-width: 190px;
    }
    .department-filter-select-wrap {
      margin-top: 0.35rem;
    }
    .department-select-control {
      width: 100%;
      padding: 0.5rem 0.65rem;
      border: 1px solid var(--color-line-300, #D8D2C4);
      border-radius: var(--radius-control, 6px);
      background: #FFFFFF;
      font-size: var(--font-size-sm, 0.84375rem);
      color: var(--color-charcoal-900, #1F2421);
      font-family: inherit;
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

    /* Explore Books catalogue layout */
    .catalogue-page{min-height:100vh;background:#fbf9f6;color:#18231f}.catalogue-content{width:min(100%,112rem);margin:0 auto;padding:0 clamp(1rem,3.6vw,4.25rem) 2.5rem}
    .catalogue-public-nav{min-height:4rem;margin:0;padding:.55rem clamp(1rem,4.2vw,4.5rem);background:rgb(255 255 255 / 94%);border-bottom:1px solid #e9e5dc;gap:1.5rem}.catalogue-public-nav .brand{gap:.65rem}.brand-icon{width:2.6rem;height:2.6rem;border-radius:.65rem}.brand-icon svg{width:1.45rem;fill:none;stroke:#d9f5e8;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.brand-copy{display:grid;gap:.1rem}.brand-copy strong{font:600 1.35rem/1 var(--font-serif);letter-spacing:-.02em}.brand-copy small{font-size:.58rem;font-weight:600;letter-spacing:.02em;color:#58645e}.catalogue-public-nav nav{gap:clamp(.8rem,2.4vw,2.4rem)}.catalogue-public-nav nav a[aria-current="page"]{color:var(--color-forest-900);font-weight:700;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:.65rem}.catalogue-public-nav nav a,.catalogue-public-nav nav button{font-size:.88rem}.workspace-action{display:inline-flex;min-height:2.75rem;align-items:center;justify-content:center;gap:.5rem;padding:.55rem 1.2rem;border:0;border-radius:.65rem;background:var(--color-forest-900);color:#fff;font:600 .86rem var(--font-sans);text-decoration:none;white-space:nowrap;cursor:pointer;box-shadow:0 2px 5px rgb(0 61 48 / 16%)}.workspace-action:hover{background:var(--color-forest-950)}
    .catalogue-public-nav{min-height:4rem;margin:0;padding:.55rem clamp(1rem,4.2vw,4.5rem);background:rgb(255 255 255 / 94%);border-bottom:1px solid #e9e5dc;gap:1.5rem}.catalogue-public-nav .brand{gap:.65rem}.brand-icon{width:2.6rem;height:2.6rem;border-radius:.65rem}.brand-icon svg{width:1.45rem;fill:none;stroke:#d9f5e8;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.brand-copy{display:grid;gap:.1rem}.brand-copy strong{font:600 1.35rem/1 var(--font-serif);letter-spacing:-.02em}.brand-copy small{font-size:.58rem;font-weight:600;letter-spacing:.02em;color:#58645e}.catalogue-public-nav nav{gap:clamp(.8rem,2.4vw,2.4rem)}.catalogue-public-nav nav a[aria-current="page"]{color:var(--color-forest-900);font-weight:700;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:.65rem}.catalogue-public-nav nav a,.catalogue-public-nav nav button{font-size:.88rem}.workspace-action{display:inline-flex;min-height:2.75rem;align-items:center;justify-content:center;gap:.5rem;padding:.55rem 1.2rem;border:0;border-radius:.65rem;background:var(--color-forest-900);color:#fff;font:600 .86rem var(--font-sans);text-decoration:none;white-space:nowrap;cursor:pointer;box-shadow:0 2px 5px rgb(0 61 48 / 16%)}.workspace-action:hover{background:var(--color-forest-950)}

    .catalogue-hero{position:relative;display:flex;min-height:7.5rem;align-items:center;margin:0 calc(-1 * clamp(1rem,3.6vw,4.25rem));padding:1.6rem clamp(1rem,3.6vw,4.25rem);background:#faf8f5;border-bottom:1px solid #eae6de;box-sizing:border-box}.catalogue-hero-copy{position:relative;z-index:1;max-width:52rem}.catalogue-eyebrow{margin:0 0 .35rem;color:var(--color-forest-800);font-size:.74rem;font-weight:750;letter-spacing:.08em;text-transform:uppercase}.page-title{margin:0 0 .4rem;color:#101729;font:600 clamp(1.9rem,2.7vw,2.4rem)/1.18 var(--font-serif);letter-spacing:-.025em}.page-subtitle{margin:0;color:var(--color-charcoal-600);font:400 .95rem/1.5 var(--font-sans);max-width:44rem}
    .search-and-stats{display:grid;grid-template-columns:minmax(18rem,1fr) auto;align-items:stretch;gap:1.25rem;padding:1.35rem 0 1.15rem}.catalogue-search{display:flex;min-width:0;min-height:4.5rem;align-items:center;gap:.85rem;padding:.5rem .65rem .5rem 1.15rem;border:1px solid #e3e2de;border-radius:.85rem;background:#fff;box-shadow:0 2px 8px rgb(20 40 30 / 4%);box-sizing:border-box;transition:border-color .15s ease,box-shadow .15s ease}.catalogue-search:focus-within{border-color:var(--color-sage-300);box-shadow:0 4px 12px rgb(0 61 48 / 8%)}.catalogue-search .search-icon{width:1.35rem;height:1.35rem;flex:0 0 auto;color:var(--color-forest-900)}.catalogue-search input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#112a20;font:500 .95rem var(--font-sans)}.catalogue-search input::placeholder{color:#77818d}.catalogue-search input:focus-visible{outline:none}.search-submit{min-height:3.1rem;padding:.55rem 1.5rem;border:0;border-radius:.65rem;background:var(--color-forest-900);color:#fff;font:600 .88rem var(--font-sans);cursor:pointer;flex-shrink:0;transition:background-color .15s ease}.search-submit:hover{background:var(--color-forest-950)}.catalogue-stats{display:grid;grid-template-columns:repeat(3,minmax(10.5rem,1fr));gap:.85rem;align-items:stretch}.stat-card{display:flex;min-width:10.5rem;min-height:4.5rem;align-items:center;gap:.85rem;padding:.75rem 1.15rem;border:1px solid var(--color-line-200);border-radius:.85rem;background:#fff;box-shadow:0 2px 8px rgb(20 40 30 / 4%);box-sizing:border-box;transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease}.stat-card:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgb(0 61 48 / 7%);border-color:var(--color-sage-300)}.stat-icon-wrap{display:flex;align-items:center;justify-content:center;width:2.65rem;height:2.65rem;border-radius:.65rem;background:#eaf2ef;color:var(--color-forest-900);flex-shrink:0}.stat-icon-svg{width:1.35rem;height:1.35rem}.stat-info{display:flex;flex-direction:column;justify-content:center;gap:.15rem;min-width:0}.stat-value{color:#101729;font-size:1.45rem;font-weight:700;line-height:1.15;letter-spacing:-.02em;font-family:var(--font-sans)}.stat-label{color:var(--color-charcoal-600);font-size:.76rem;font-weight:600;white-space:nowrap;letter-spacing:.01em}.stats-note{grid-column:1 / -1;margin:.25rem 0 0;color:#80631a;font-size:.78rem}
    .category-chips-row{display:flex;align-items:center;gap:.5rem;margin:0 0 1rem;padding:.1rem 0 .8rem;border-bottom:1px solid #e8e4dc;overflow-x:auto}.category-chips-row>strong{flex:0 0 auto;margin-right:.3rem;color:#27332e;font-size:.8rem}.category-chip{padding:.5rem .9rem;border:1px solid #e8e7e2;border-radius:999px;background:#fff;color:#313c36;font-size:.78rem;font-weight:600;white-space:nowrap;box-shadow:0 1px 3px rgb(20 40 30 / 3%)}.category-chip:hover{border-color:#aac8ba;color:var(--color-forest-900)}.category-chip.active,.faculty-filter-chip.active{border-color:var(--color-forest-900);background:var(--color-forest-900);color:#fff}.faculty-filter-chip{display:inline-flex;align-items:center;gap:.3rem;background:#f8faf8;border-color:#c9d7d0;color:var(--color-forest-900)}.more-chip{color:var(--color-forest-900)}
    .results-layout{display:grid;grid-template-columns:15rem minmax(0,1fr);align-items:start;gap:1.2rem}.filters-panel{padding:1rem;border:1px solid #ebe8e1;border-radius:.9rem;background:#fff;box-shadow:0 2px 8px rgb(20 40 30 / 4%)}.filters-heading{display:flex;align-items:center;justify-content:space-between;padding-bottom:.75rem;border-bottom:1px solid #eeeae3}.filters-heading h2{margin:0;color:#202c26;font-size:1rem;font-weight:750}.filters-heading .text-button{font-size:.78rem;text-decoration:none}.filter-group{display:grid;gap:.65rem;padding:.85rem 0;border-bottom:1px solid #eeeae3}.filter-group h3{margin:0 0 .15rem;color:#28352f;font-size:.84rem;font-weight:700}.filter-group>label{display:flex;align-items:center;gap:.55rem;color:#47534c;font-size:.8rem;cursor:pointer}.filter-group input[type="checkbox"]{width:1rem;height:1rem;accent-color:var(--color-forest-900)}.filter-group .show-more{justify-self:start;padding:0;text-decoration:none}.year-values{display:flex;justify-content:space-between;color:#59665e;font-size:.73rem}.year-values strong{color:#28352f}.year-filter input[type="range"]{width:100%;height:.3rem;accent-color:var(--color-forest-900)}.filter-error{margin:.65rem 0 0;color:#a33727;font-size:.75rem}.apply-filters{width:100%;min-height:2.55rem;margin-top:.9rem;border:1px solid #8fb7a4;border-radius:.65rem;background:#eef7f1;color:var(--color-forest-900);font-weight:700;cursor:pointer}.apply-filters:hover{background:#e3f1e8}.mobile-filter-toggle{display:none}
    .results-panel{min-width:0}.results-toolbar{display:flex;min-height:2.65rem;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:.75rem}.result-count{margin:0;color:#4d5953;font-size:.82rem;font-weight:600}.results-controls{display:flex;align-items:center;gap:.5rem;color:#34423a;font-size:.78rem}.results-controls label{font-weight:600}.results-controls select{min-height:2.3rem;max-width:12rem;padding:0 2rem 0 .65rem;border:1px solid #e4e2dc;border-radius:.55rem;background:#fff;color:#29362f;font-size:.78rem}.compact-add{min-height:2.25rem;padding:.45rem .7rem;font-size:.75rem}.view-toggle{display:flex;overflow:hidden;border:1px solid #e5e3de;border-radius:.6rem;background:#fff}.view-toggle button{width:2.25rem;height:2.25rem;border:0;background:transparent;color:#59645e;font-size:1rem;cursor:pointer}.view-toggle button.active{background:var(--color-forest-900);color:#fff}.book-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem}.book-card{display:grid;min-width:0;grid-template-columns:5.2rem minmax(0,1fr) minmax(9rem,11.5rem);align-items:center;gap:.8rem;padding:.75rem;border:1px solid #e8e7e2;border-radius:.9rem;background:#fff;box-shadow:0 2px 6px rgb(20 40 30 / 4%);transition:box-shadow .16s ease,transform .16s ease}.book-card:hover{box-shadow:0 5px 15px rgb(20 40 30 / 8%);transform:translateY(-1px)}.card-cover{position:relative;display:block;width:5.2rem;height:7.6rem;overflow:hidden;border-radius:.45rem;background:#eef0eb;box-shadow:0 2px 5px rgb(20 40 30 / 12%)}.card-cover img{display:block;width:100%;height:100%;object-fit:contain;background:#f5f4ef}.card-cover-fallback{display:grid;width:100%;height:100%;place-items:center;padding:.4rem;border-left:4px solid #a5c4b2;background:#0b3d30;color:#fff;font:700 .85rem var(--font-serif);text-align:center;overflow-wrap:anywhere}.cover-status{position:absolute;top:.25rem;right:.25rem;padding:.16rem .3rem;border-radius:.3rem;font-size:.55rem;font-weight:700}.cover-status.available{background:#e4f3e8;color:#075632}.cover-status.unavailable{background:#fff1d2;color:#8e4a00}.book-main{min-width:0}.book-category{margin:0 0 .35rem;color:var(--color-forest-800);font-size:.65rem;font-weight:750;letter-spacing:.06em;text-transform:uppercase}.book-main h2{margin:0 0 .28rem;color:#1a2420;font-size:.98rem;font-weight:750;line-height:1.25;overflow-wrap:anywhere}.book-main h2 a{color:inherit;text-decoration:none}.book-main h2 a:hover{color:var(--color-forest-900);text-decoration:underline;text-underline-offset:.15rem}.book-author{margin:0 0 .28rem;color:#55615a;font-size:.8rem;overflow-wrap:anywhere}.book-isbn{margin:0;color:#65716a;font-size:.7rem;overflow-wrap:anywhere}.book-badges{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.35rem}.book-badges>span:not(.badge-pdf):not(.badge-faculty-rec){padding:.1rem .3rem;border-radius:.3rem;background:#f3f3ef;color:#68736d;font-size:.62rem}.book-action{display:flex;min-width:0;flex-direction:column;align-items:stretch;gap:.5rem;padding-left:.75rem;border-left:1px solid #ecebe6}.availability-pill{display:block;max-width:100%;padding:.4rem .5rem;border-radius:999px;font-size:.68rem;font-weight:700;text-align:center;white-space:normal;line-height:1.2}.availability-pill.available{background:#e6f3e9;color:#075632}.availability-pill.unavailable{background:#fff2d4;color:#945000}.book-action-button{display:flex;min-height:2.35rem;align-items:center;justify-content:center;padding:.4rem .55rem;border:1px solid var(--color-forest-900);border-radius:.55rem;font-size:.73rem;font-weight:700;line-height:1.2;text-align:center;text-decoration:none;cursor:pointer}.book-action-button.primary{background:var(--color-forest-900);color:#fff}.book-action-button.primary:hover{background:var(--color-forest-950)}.book-action-button.secondary{background:#fff;color:var(--color-forest-900)}.book-action-button.secondary:hover{background:#eef7f1}.book-action-note{color:#68736d;font-size:.66rem;text-align:center}.book-utilities{display:flex;justify-content:flex-end;gap:.35rem}.utility-button{display:grid;width:1.8rem;height:1.8rem;place-items:center;border:1px solid #e6e5df;border-radius:.45rem;background:#fff;color:#52625a;font-size:1rem;text-decoration:none;cursor:pointer}.utility-button:hover,.utility-button.is-rec{border-color:#b7d3c3;background:#edf7f0;color:var(--color-forest-900)}.utility-button.is-wishlisted{border-color:#f5c5ca;background:#fff3f4;color:#bd2332}.pagination-controls{display:flex;justify-content:center;gap:.4rem;margin:1.1rem 0 0}.pagination-btn,.pagination-page{width:2.15rem;height:2.15rem;border:1px solid #e5e4de;border-radius:50%;background:#fff;color:#33423a}.pagination-page.active{border-color:var(--color-forest-900);background:var(--color-forest-900);color:#fff}.pagination-btn:disabled{opacity:.42;cursor:not-allowed}
    .book-grid.list-view{grid-template-columns:1fr}.book-grid.list-view .book-card{grid-template-columns:5.2rem minmax(0,1fr) minmax(10rem,13rem)}
    @media(max-width:1200px){.search-and-stats{grid-template-columns:1fr;gap:1rem}.catalogue-stats{grid-template-columns:repeat(3,minmax(0,1fr));gap:.85rem}.results-layout{grid-template-columns:13rem minmax(0,1fr);gap:.8rem}.book-grid{grid-template-columns:1fr}.book-card{grid-template-columns:5.5rem minmax(0,1fr) minmax(10rem,13rem)}.card-cover{width:5.5rem;height:8rem}}
    @media(max-width:900px){.catalogue-content{padding-inline:1.25rem}.catalogue-public-nav{padding-inline:1.25rem}.catalogue-public-nav nav{gap:.75rem}.catalogue-hero{margin-inline:-1.25rem;padding:1.25rem 1.25rem;min-height:6.5rem}.page-title{font-size:1.75rem}.page-subtitle{max-width:28rem;font-size:.88rem}.catalogue-eyebrow{font-size:.68rem}.category-chips-row{margin-bottom:.75rem}.category-chips-row>strong{font-size:.7rem}.category-chip{padding:.43rem .68rem;font-size:.7rem}.results-toolbar{align-items:flex-start;flex-direction:column;gap:.55rem}.results-controls{width:100%;flex-wrap:wrap}.results-controls select{flex:1;max-width:none}.results-controls label{margin-right:auto}.compact-add{order:4}.book-grid{grid-template-columns:1fr}.book-card{grid-template-columns:5.2rem minmax(0,1fr);gap:.65rem;padding:.65rem}.card-cover{width:5.2rem;height:7.6rem}.book-main h2{font-size:.9rem}.book-action-button{font-size:.68rem}.book-utilities{gap:.2rem}.utility-button{width:1.65rem;height:1.65rem}.pagination-controls{margin-bottom:1rem}}
    @media(max-width:620px){.catalogue-public-nav{min-height:3.6rem;flex-wrap:wrap;padding:.45rem .8rem}.catalogue-public-nav nav{width:100%;flex-wrap:wrap;justify-content:space-between;gap:.45rem;padding-bottom:.35rem}.catalogue-public-nav nav a{display:inline-flex}.brand-copy small{font-size:.52rem}.workspace-action{min-height:2.45rem;padding:.45rem .65rem;font-size:.72rem}.catalogue-content{padding-inline:.8rem}.catalogue-hero{margin-inline:-.8rem;padding:1rem .8rem;min-height:5.5rem}.page-title{font-size:1.55rem}.page-subtitle{max-width:24rem;font-size:.82rem}.catalogue-eyebrow{font-size:.63rem}.search-and-stats{gap:.75rem;padding:.75rem 0}.catalogue-search{min-height:3.8rem;padding:.4rem .5rem .4rem .85rem}.search-submit{min-height:2.65rem;padding-inline:.95rem;font-size:.82rem}.catalogue-search input{font-size:.88rem}.catalogue-stats{grid-template-columns:1fr;gap:.65rem}.stat-card{min-width:0;min-height:4.1rem;padding:.65rem .95rem}.stat-icon-wrap{width:2.4rem;height:2.4rem}.stat-icon-svg{width:1.2rem;height:1.2rem}.stat-value{font-size:1.3rem}.stat-label{font-size:.75rem}}
    @media(max-width:380px){.catalogue-hero-copy{max-width:100%}.stat-card{justify-content:flex-start}.stat-card .stat-label{white-space:nowrap}.book-card{grid-template-columns:4.5rem minmax(0,1fr);gap:.5rem}.card-cover{width:4.5rem;height:6.7rem}.book-action{flex-wrap:wrap}.book-action-button{max-width:none}}
  `]
})
export class BookListComponent {
  readonly chipCategoryLimit = 6;
  readonly filterCategoryLimit = 5;
  private readonly service = inject(CatalogueService);
  private readonly recService = inject(RecommendationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);
  readonly wishlistService = inject(WishlistService);

  readonly books = signal<BookSummary[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly statistics = signal<CatalogueStatistics | null>(null);
  readonly statisticsLoading = signal(true);
  readonly statisticsError = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly total = signal(0);
  readonly pages = signal(0);
  readonly page = signal(0);
  readonly broken = signal(new Set<string>());
  readonly showDialog = signal(false);
  readonly loginRole = signal<'STUDENT' | 'FACULTY' | 'LIBRARIAN'>('STUDENT');
  readonly signInContext = signal('');
  readonly selectedBookForRequest = signal<BookSummary | null>(null);
  readonly filtersOpen = signal(false);
  readonly showAllChips = signal(false);
  readonly showAllFilterCategories = signal(false);
  readonly draftAvailable = signal(true);
  readonly draftUnavailable = signal(true);
  readonly draftYearFrom = signal<number | null>(null);
  readonly draftYearTo = signal<number | null>(null);
  readonly filterError = signal('');
  readonly viewMode = signal<'grid' | 'list'>('grid');
  readonly sortField = signal<'title' | 'publicationYear' | 'trending' | 'rating'>('title');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly recommendedBookIds = signal<Set<string>>(new Set());
  readonly recommendationsLoaded = signal(false);
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
  department = '';
  readonly officialDepartments = OFFICIAL_DEPARTMENTS;
  readonly draftDepartment = signal<string>('');

  private applied = { q: '', category: '', department: '', availability: '', yearFrom: null as number | null, yearTo: null as number | null };
  private searchRequest = 0;
  private goToWorkspaceAfterSignIn = false;

  constructor() {
    this.q = this.route.snapshot.queryParamMap.get('q') || '';
    this.category = this.route.snapshot.queryParamMap.get('category') || '';
    this.availability = this.route.snapshot.queryParamMap.get('availability') || '';
    this.department = this.route.snapshot.queryParamMap.get('department') || '';
    this.draftDepartment.set(this.department);
    this.draftAvailable.set(this.availability !== 'false');
    this.draftUnavailable.set(this.availability !== 'true');
    this.draftYearFrom.set(this.readYearParam(this.route.snapshot.queryParamMap.get('publicationYearFrom')));
    this.draftYearTo.set(this.readYearParam(this.route.snapshot.queryParamMap.get('publicationYearTo')));
    const sortDirection = this.route.snapshot.queryParamMap.get('direction');
    this.sortDirection.set(sortDirection === 'desc' ? 'desc' : 'asc');
    const sortField = this.route.snapshot.queryParamMap.get('sort');
    this.sortField.set(
      sortField === 'publicationYear' || sortField === 'trending' || sortField === 'rating' || sortField === 'topRated'
        ? (sortField === 'topRated' ? 'rating' : sortField)
        : 'title'
    );
    if (this.route.snapshot.queryParamMap.get('facultyRecommended') === 'true') {
      this.facultyRecommendedOnly.set(true);
    }
    this.applied = { q: this.q.trim(), category: this.category.trim(), department: this.department.trim(), availability: this.availability, yearFrom: this.draftYearFrom(), yearTo: this.draftYearTo() };

    this.service.categories().subscribe({
      next: x => this.categories.set(x),
      error: () => this.error.set('Categories could not be loaded. Please try again.')
    });

    this.loadStatistics();

    if (this.auth.profile()) {
      this.recService.getRecommendedBookIds().subscribe({
        next: ids => { this.recommendedBookIds.set(new Set(ids)); this.recommendationsLoaded.set(true); if (this.facultyRecommendedOnly()) this.load(0); },
        error: () => { this.recommendationsLoaded.set(true); if (this.facultyRecommendedOnly()) { this.loading.set(false); this.error.set('Faculty recommendations could not be loaded. Please try again.'); } }
      });
    } else {
      this.recommendationsLoaded.set(true);
    }

    this.load();

    this.route.queryParamMap.subscribe(params => {
      const q = params.get('q') || '';
      const cat = params.get('category') || '';
      const avail = params.get('availability') || '';
      const dept = params.get('department') || '';
      const yearFrom = this.readYearParam(params.get('publicationYearFrom'));
      const yearTo = this.readYearParam(params.get('publicationYearTo'));
      const sort = params.get('sort');
      const nextSort: 'title' | 'publicationYear' | 'trending' | 'rating' =
        sort === 'publicationYear' || sort === 'trending' || sort === 'rating' || sort === 'topRated'
          ? (sort === 'topRated' ? 'rating' : sort)
          : 'title';
      const direction = nextSort === 'trending' || nextSort === 'rating' ? 'desc' : (params.get('direction') === 'desc' ? 'desc' : 'asc');
      if (q.trim() !== this.applied.q || cat.trim() !== this.applied.category || dept.trim() !== this.applied.department || avail !== this.applied.availability || yearFrom !== this.applied.yearFrom || yearTo !== this.applied.yearTo || nextSort !== this.sortField() || direction !== this.sortDirection()) {
        this.q = q;
        this.category = cat;
        this.availability = avail;
        this.department = dept;
        this.draftDepartment.set(dept);
        this.draftAvailable.set(avail !== 'false');
        this.draftUnavailable.set(avail !== 'true');
        this.draftYearFrom.set(yearFrom);
        this.draftYearTo.set(yearTo);
        this.sortField.set(nextSort);
        this.sortDirection.set(direction);
        this.applied = { q: q.trim(), category: cat.trim(), department: dept.trim(), availability: avail, yearFrom, yearTo };
        this.load(0);
      }
    });
  }

  isInsideWorkspace(): boolean {
    return this.router.url.startsWith('/workspace');
  }

  loadStatistics(): void {
    this.statisticsLoading.set(true);
    this.statisticsError.set(false);
    this.service.statistics().subscribe({
      next: summary => { this.statistics.set(summary); this.statisticsLoading.set(false); },
      error: () => { this.statisticsLoading.set(false); this.statisticsError.set(true); },
    });
  }

  bookLink(bookId: string): string[] {
    return this.isInsideWorkspace() ? ['/workspace/books', bookId] : ['/books', bookId];
  }

  currentQueryParams(): Record<string, string | null> {
    return {
      q: this.applied.q || null,
      category: this.applied.category || null,
      department: this.applied.department || null,
      availability: this.applied.availability || null,
      publicationYearFrom: this.applied.yearFrom === null ? null : String(this.applied.yearFrom),
      publicationYearTo: this.applied.yearTo === null ? null : String(this.applied.yearTo),
      sort: this.sortField(),
      direction: this.sortField() === 'trending' ? null : this.sortDirection(),
      facultyRecommended: this.facultyRecommendedOnly() ? 'true' : null,
    };
  }

  apply() {
    const from = this.draftYearFrom();
    const to = this.draftYearTo();
    if (from !== null && to !== null && from > to) {
      this.filterError.set('The starting publication year must be no later than the ending year.');
      return;
    }
    this.filterError.set('');
    this.department = this.draftDepartment();
    this.applied = { q: this.q.trim(), category: this.category.trim(), department: this.department.trim(), availability: this.availability, yearFrom: from, yearTo: to };
    void this.router.navigate([], { relativeTo: this.route, queryParams: this.currentQueryParams(), queryParamsHandling: 'merge' });
    this.filtersOpen.set(false);
    this.load(0);
  }

  setDepartment(dept: string) {
    this.draftDepartment.set(dept);
  }

  selectCategory(catName: string) {
    this.category = catName;
    this.apply();
  }

  toggleFacultyRecommended() {
    this.facultyRecommendedOnly.update(v => !v);
    void this.router.navigate([], { relativeTo: this.route, queryParams: this.currentQueryParams() });
    this.load(0);
  }

  visibleChipCategories(): Category[] { return this.showAllChips() ? this.categories() : this.categories().slice(0, this.chipCategoryLimit); }
  visibleFilterCategories(): Category[] { return this.showAllFilterCategories() ? this.categories() : this.categories().slice(0, this.filterCategoryLimit); }
  availableCount(): number { return this.statistics()?.availableBooks ?? 0; }
  unavailableCount(): number { return this.statistics()?.unavailableBooks ?? 0; }
  sortSelection(): string {
    if (this.sortField() === 'trending') return 'trending';
    if (this.sortField() === 'rating') return 'topRated';
    return `${this.sortField()}:${this.sortDirection()}`;
  }

  selectFilterCategory(name: string, checked: boolean): void {
    this.category = checked ? name : this.category.toLowerCase() === name.toLowerCase() ? '' : this.category;
  }

  setAvailability(which: 'available' | 'unavailable', checked: boolean): void {
    if (which === 'available') this.draftAvailable.set(checked);
    else this.draftUnavailable.set(checked);
    this.availability = this.draftAvailable() === this.draftUnavailable() ? '' : this.draftAvailable() ? 'true' : 'false';
  }

  setYearFrom(value: string): void {
    const year = Number(value);
    this.draftYearFrom.set(year);
    if (this.draftYearTo() !== null && year > this.draftYearTo()!) this.draftYearTo.set(year);
  }

  setYearTo(value: string): void {
    const year = Number(value);
    this.draftYearTo.set(year);
    if (this.draftYearFrom() !== null && year < this.draftYearFrom()!) this.draftYearFrom.set(year);
  }

  changeSort(value: string): void {
    if (value === 'trending') {
      this.sortField.set('trending');
      this.sortDirection.set('desc');
      void this.router.navigate([], { relativeTo: this.route, queryParams: this.currentQueryParams() });
      this.load(0);
      return;
    }
    if (value === 'topRated' || value === 'rating') {
      this.sortField.set('rating');
      this.sortDirection.set('desc');
      void this.router.navigate([], { relativeTo: this.route, queryParams: this.currentQueryParams() });
      this.load(0);
      return;
    }
    const [field, direction] = value.split(':');
    this.sortField.set(field === 'publicationYear' ? field : 'title');
    this.sortDirection.set(direction === 'desc' ? 'desc' : 'asc');
    void this.router.navigate([], { relativeTo: this.route, queryParams: this.currentQueryParams() });
    this.load(0);
  }

  private readYearParam(value: string | null): number | null {
    if (!value || !/^\d{4}$/.test(value)) return null;
    const year = Number(value);
    return Number.isFinite(year) ? year : null;
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
    if (this.facultyRecommendedOnly()) this.load(0);
  }

  clearFilters() {
    this.q = '';
    this.category = '';
    this.availability = '';
    this.draftAvailable.set(true);
    this.draftUnavailable.set(true);
    this.draftYearFrom.set(null);
    this.draftYearTo.set(null);
    this.filterError.set('');
    this.facultyRecommendedOnly.set(false);
    this.department = '';
    this.draftDepartment.set('');
    this.applied = { q: '', category: '', department: '', availability: '', yearFrom: null, yearTo: null };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: null, category: null, department: null, availability: null, publicationYearFrom: null, publicationYearTo: null, facultyRecommended: null },

      queryParamsHandling: 'merge',
    });
    this.load(0);
  }

  load(p = 0) {
    const request = ++this.searchRequest;
    if (this.facultyRecommendedOnly() && !this.recommendationsLoaded()) {
      this.loading.set(true);
      return;
    }
    if (this.facultyRecommendedOnly() && this.recommendedBookIds().size === 0) {
      this.books.set([]); this.total.set(0); this.pages.set(0); this.page.set(0); this.loading.set(false); this.error.set('');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const filters = {
      q: this.applied.q,
      category: this.applied.category,
      department: this.applied.department || null,
      available: this.applied.availability === '' ? null : this.applied.availability === 'true',
      publicationYearFrom: this.applied.yearFrom,
      publicationYearTo: this.applied.yearTo,
    };
    const results = this.sortField() === 'trending'
      ? this.service.trending(filters, p, 12)
      : this.service.search({ ...filters, bookIds: this.facultyRecommendedOnly() ? [...this.recommendedBookIds()] : null }, p, this.sortField(), this.sortDirection());
    results
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
    this.goToWorkspaceAfterSignIn = false;
    this.loginRole.set('STUDENT');
    this.showDialog.set(true);
  }

  openWorkspace(): void {
    if (this.auth.profile()) { void this.router.navigateByUrl('/workspace'); return; }
    this.goToWorkspaceAfterSignIn = true;
    this.openSignIn();
    this.goToWorkspaceAfterSignIn = true;
  }

  requestOrSignIn(book: BookSummary): void {
    if (this.auth.profile()) { void this.router.navigate(this.bookLink(book.id), { queryParams: this.currentQueryParams() }); return; }
    this.goToWorkspaceAfterSignIn = false;
    this.selectedBookForRequest.set(book);
    this.loginRole.set('STUDENT');
    this.signInContext.set(`You selected “${book.title}”. Sign in to review and submit the request on the book details page.`);
    this.showDialog.set(true);
  }

  dismissSignIn(): void {
    this.showDialog.set(false);
    this.selectedBookForRequest.set(null);
    this.signInContext.set('');
    this.goToWorkspaceAfterSignIn = false;
  }

  onAuthenticated(profile: UserProfile) {
    this.showDialog.set(false);
    const selected = this.selectedBookForRequest();
    if (selected) {
      this.selectedBookForRequest.set(null);
      this.signInContext.set('');
      void this.router.navigate(this.bookLink(selected.id), { queryParams: this.currentQueryParams() });
      return;
    }
    if (profile.role === 'STUDENT' || profile.role === 'FACULTY') {
      this.loginRole.set(profile.role);
    }
    if (this.goToWorkspaceAfterSignIn) {
      this.goToWorkspaceAfterSignIn = false;
      void this.router.navigateByUrl('/workspace');
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
