import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import {
  AllRecommendedBookItem,
  FacultyBookItem,
  FacultyDetail,
  FacultyDirectoryItem,
  FacultyRecommendationGroup,
  FacultyRecommendationItem,
  RecentRecommendation,
  Recommendation,
  RecommendationService,
  TopRecommendedBook
} from './recommendation.service';
import { CatalogueService, Category } from '../catalogue/catalogue.service';
import { WishlistService } from '../wishlist/wishlist.service';

@Component({
  selector: 'app-book-recommendations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="recommendations-container">
      <!-- ======================================================== -->
      <!-- STUDENT VIEW                                             -->
      <!-- ======================================================== -->
      @if (isStudent() || isLibrarian()) {
        <!-- Page Header -->
        <header class="page-header">
          <div class="header-left">
            <div class="header-icon-box" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                <path d="M8 7h8"></path>
                <path d="M8 11h6"></path>
              </svg>
            </div>
            <div>
              <h1 class="page-title">Book Recommendations</h1>
              <p class="page-subtitle">Explore book suggestions from our faculty members and discover titles for your academic journey.</p>
            </div>
          </div>
        </header>

        <!-- Top Filter Controls Bar (spans full width above both columns) -->
        <div class="filter-controls-row surface-card">
          <div class="search-input-wrap">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="search"
              class="search-input"
              placeholder="Search faculty by name, department, or employee ID..."
              [ngModel]="facultySearchQuery()"
              (ngModelChange)="onFacultySearch($event)"
              aria-label="Search faculty"
            >
            @if (facultySearchQuery()) {
              <button type="button" class="search-clear-btn" aria-label="Clear search" (click)="clearFacultySearch()">
                &times;
              </button>
            }
          </div>

          <div class="dropdown-wrap">
            <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
              <line x1="9" y1="22" x2="9" y2="22.01"></line>
              <line x1="15" y1="22" x2="15" y2="22.01"></line>
              <line x1="12" y1="2" x2="12" y2="22"></line>
            </svg>
            <select
              class="filter-select"
              [ngModel]="selectedDepartment()"
              (ngModelChange)="onDepartmentChange($event)"
              aria-label="Filter by department"
            >
              <option value="ALL">All Departments</option>
              @for (dept of departments(); track dept) {
                <option [value]="dept">{{ dept }}</option>
              }
            </select>
          </div>

          <div class="dropdown-wrap">
            <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <polyline points="19 12 12 19 5 12"></polyline>
            </svg>
            <select
              class="filter-select"
              [ngModel]="selectedSort()"
              (ngModelChange)="onSortChange($event)"
              aria-label="Sort faculty"
            >
              <option value="newest">Sort: Newest</option>
              <option value="most_recommended">Most Recommended</option>
              <option value="name_asc">Name A–Z</option>
            </select>
          </div>
        </div>

        <!-- Two Column: Faculty List (Left) + View Content (Right) -->
        <div class="faculty-workspace-grid">
          <!-- Left: Faculty Directory -->
          <aside class="faculty-directory-col surface-card" aria-label="Faculty Directory">
            <div class="directory-header">
              <h2 class="directory-title">Faculty ({{ facultyDirectory().length }})</h2>
              <button
                type="button"
                class="all-faculty-pill-btn"
                [class.active]="selectedFacultyId() === null"
                (click)="selectAllRecommendations()"
                aria-label="Show all recommendations"
              >
                <svg class="star-icon" viewBox="0 0 24 24" [attr.fill]="selectedFacultyId() === null ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                <span>All</span>
              </button>
            </div>

            @if (loadingFaculty()) {
              <div class="loading-state">Loading faculty directory…</div>
            } @else if (facultyDirectory().length === 0) {
              <div class="empty-state-small">
                <p>No faculty members found matching your search.</p>
              </div>
            } @else {
              <div class="faculty-list" role="list">
                @for (fac of facultyDirectory(); track fac.id) {
                  <button
                    type="button"
                    class="faculty-item-btn"
                    [class.selected]="selectedFacultyId() === fac.id"
                    (click)="selectFaculty(fac.id)"
                    role="listitem"
                    [attr.aria-selected]="selectedFacultyId() === fac.id"
                  >
                    <div class="fac-avatar" [class.highlight]="selectedFacultyId() === fac.id">
                      {{ getInitials(fac.displayName) }}
                    </div>
                    <div class="fac-item-info">
                      <span class="fac-name">{{ fac.displayName }}</span>
                      <span class="fac-dept">{{ fac.department }} &gt;</span>
                      <span class="fac-books-count" [class.zero-books]="fac.recommendationCount === 0">
                        @if (fac.recommendationCount > 0) {
                          {{ fac.recommendationCount }} {{ fac.recommendationCount === 1 ? 'book' : 'books' }}
                        } @else {
                          &#9734; Not recommended yet
                        }
                      </span>
                    </div>
                  </button>
                }
              </div>

              <div class="directory-footer">
                <button type="button" class="view-all-faculty-btn" (click)="resetFacultyFilter()">
                  View All Faculty &rarr;
                </button>
              </div>
            }
          </aside>

          <!-- Right Column: View Content (All Recommended Books by Default, or Selected Faculty) -->
          <section class="selected-faculty-view" aria-label="Recommendations Content">
            <!-- ======================================================== -->
            <!-- VIEW 1: FACULTY RECOMMENDATIONS (when faculty selected)  -->
            <!-- ======================================================== -->
            @if (selectedFacultyId() !== null) {
              @if (loadingFacultyDetail()) {
                <div class="loading-state surface-card">Loading faculty recommendations…</div>
              } @else if (selectedFacultyDetail(); as currentFac) {
                <!-- Faculty Profile Banner -->
                <div class="faculty-banner surface-card">
                  <div class="banner-left">
                    <div class="banner-avatar">
                      {{ getInitials(currentFac.displayName) }}
                    </div>
                    <div class="banner-details">
                      <h2 class="banner-name">{{ currentFac.displayName }}</h2>
                      <p class="banner-designation">{{ currentFac.designation || 'Associate Professor' }}</p>
                      <p class="banner-dept">{{ currentFac.department }}</p>
                    </div>
                  </div>

                  <div class="banner-actions">
                    <button type="button" class="banner-btn btn-outline" (click)="viewFacultyProfile(currentFac.id)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      View Faculty Profile
                    </button>
                  </div>
                </div>

                <!-- Recommended Books Section -->
                <div class="faculty-books-section">
                  <div class="section-heading-row">
                    <h3 class="section-title">Recommended Books ({{ currentFac.books.length }})</h3>
                    <button
                      type="button"
                      class="banner-btn btn-follow"
                      [class.following]="isFacultyFollowed(currentFac.id)"
                      (click)="toggleFollowFaculty(currentFac.id)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                      </svg>
                      {{ isFacultyFollowed(currentFac.id) ? 'Following' : 'Follow Faculty' }}
                    </button>
                  </div>

                  @if (currentFac.books.length === 0) {
                    <!-- Zero Recommendation Empty State -->
                    <div class="empty-state-faculty surface-card">
                      <div class="empty-book-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                        </svg>
                      </div>
                      <div class="empty-text-wrap">
                        <h4 class="empty-heading">This faculty has not recommended any books yet.</h4>
                        <p class="empty-subtext">Check back later or explore recommendations from other faculty members.</p>
                      </div>
                    </div>
                  } @else {
                    <!-- Books Grid -->
                    <div class="faculty-books-grid">
                      @for (book of paginatedFacultyBooks(); track book.recommendationId) {
                        <article class="faculty-book-card surface-card">
                          <div class="card-top-row">
                            <div class="book-cover-container">
                              @if (book.coverImageUrl && !brokenCovers().has(book.bookId)) {
                                <img
                                  [src]="book.coverImageUrl"
                                  [alt]="'Cover of ' + book.title"
                                  class="book-cover-img"
                                  loading="lazy"
                                  (error)="markCoverBroken(book.bookId)"
                                >
                              } @else {
                                <div class="book-cover-fallback">
                                  <span>{{ book.title.substring(0, 3).toUpperCase() }}</span>
                                </div>
                              }
                            </div>

                            <div class="book-info-body">
                              <div class="title-bookmark-row">
                                <h4 class="book-title" [title]="book.title">
                                  <a [routerLink]="['/workspace/books', book.bookId]">{{ book.title }}</a>
                                </h4>
                                <button
                                  type="button"
                                  class="wishlist-btn-overlay"
                                  [class.active]="wishlistService.isInWishlist(book.bookId)"
                                  (click)="toggleBookmark(book.bookId)"
                                  [attr.aria-label]="wishlistService.isInWishlist(book.bookId) ? 'Remove from wishlist' : 'Add to wishlist'"
                                >
                                  <svg viewBox="0 0 24 24" [attr.fill]="wishlistService.isInWishlist(book.bookId) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                                  </svg>
                                </button>
                              </div>

                              <p class="book-recommender" [title]="'Recommended by ' + getFacultyRecommendationSubtitle(currentFac.displayName)">
                                Recommended by {{ getFacultyRecommendationSubtitle(currentFac.displayName) }}
                              </p>

                              <p class="book-author" [title]="book.authors.join(', ')">{{ book.authors.join(', ') || 'Unknown Author' }}</p>

                              <div class="rating-row">
                                @if (book.averageRating) {
                                  <span class="rating-star">&#9733;</span>
                                  <span class="rating-val">{{ book.averageRating }}</span>
                                  <span class="rating-count">({{ book.reviewCount }})</span>
                                } @else {
                                  <span class="rating-unrated">Unrated</span>
                                }
                              </div>
                            </div>
                          </div>

                          @if (book.message) {
                            <blockquote class="quote-box" [title]="book.message">
                              <span class="quote-mark">&ldquo;</span>
                              <span class="quote-text">{{ book.message }}</span>
                              <span class="quote-mark">&rdquo;</span>
                            </blockquote>
                          }

                          <div class="date-row">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="16" y1="2" x2="16" y2="6"></line>
                              <line x1="8" y1="2" x2="8" y2="6"></line>
                              <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <span>Recommended on {{ formatDate(book.createdAt) }}</span>
                          </div>
                        </article>
                      }
                    </div>

                    <!-- Pagination Controls -->
                    @if (totalFacultyPages() > 1) {
                      <div class="pagination-row" aria-label="Book pagination">
                        <button
                          type="button"
                          class="page-nav-btn"
                          [disabled]="facultyBooksPage() <= 1"
                          (click)="prevFacultyPage()"
                          aria-label="Previous page"
                        >
                          &lt;
                        </button>
                        <div class="page-numbers-wrap">
                          @for (p of facultyBooksPageNumbers(); track p) {
                            <button
                              type="button"
                              class="page-number-btn"
                              [class.active]="facultyBooksPage() === p"
                              (click)="goToFacultyPage(p)"
                              [attr.aria-label]="'Page ' + p"
                              [attr.aria-current]="facultyBooksPage() === p ? 'page' : null"
                            >
                              {{ p }}
                            </button>
                          }
                        </div>
                        <button
                          type="button"
                          class="page-nav-btn"
                          [disabled]="facultyBooksPage() >= totalFacultyPages()"
                          (click)="nextFacultyPage()"
                          aria-label="Next page"
                        >
                          &gt;
                        </button>
                      </div>
                    }
                  }
                </div>
              }
            }

            <!-- ======================================================== -->
            <!-- VIEW 2: ALL RECOMMENDED BOOKS (Default when no faculty)  -->
            <!-- ======================================================== -->
            @if (selectedFacultyId() === null && studentTab() !== 'personalized' && studentTab() !== 'department') {
              @if (loadingAllBooks()) {
                <div class="loading-state surface-card">Loading recommended books…</div>
              } @else if (allRecommendedBooks().length === 0) {
                <div class="empty-state surface-card">
                  <h3>No recommended books found</h3>
                  <p>Check back later as faculty members recommend new titles.</p>
                </div>
              } @else {
                <div class="faculty-books-grid">
                  @for (book of paginatedAllBooks(); track book.bookId) {
                    <article class="faculty-book-card surface-card">
                      <div class="card-top-row">
                        <div class="book-cover-container">
                          @if (book.coverImageUrl && !brokenCovers().has(book.bookId)) {
                            <img
                              [src]="book.coverImageUrl"
                              [alt]="'Cover of ' + book.title"
                              class="book-cover-img"
                              loading="lazy"
                              (error)="markCoverBroken(book.bookId)"
                            >
                          } @else {
                            <div class="book-cover-fallback">
                              <span>{{ book.title.substring(0, 3).toUpperCase() }}</span>
                            </div>
                          }
                        </div>

                        <div class="book-info-body">
                          <div class="title-bookmark-row">
                            <h4 class="book-title" [title]="book.title">
                              <a [routerLink]="['/workspace/books', book.bookId]">{{ book.title }}</a>
                            </h4>
                            <button
                              type="button"
                              class="wishlist-btn-overlay"
                              [class.active]="wishlistService.isInWishlist(book.bookId)"
                              (click)="toggleBookmark(book.bookId)"
                              [attr.aria-label]="wishlistService.isInWishlist(book.bookId) ? 'Remove from wishlist' : 'Add to wishlist'"
                            >
                              <svg viewBox="0 0 24 24" [attr.fill]="wishlistService.isInWishlist(book.bookId) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                              </svg>
                            </button>
                          </div>

                          <p class="book-recommender" [title]="'Recommended by ' + getPrimaryFacultyName(book)">
                            Recommended by {{ getPrimaryFacultyName(book) }}
                          </p>

                          @if (book.authors.length > 0) {
                            <p class="book-author" [title]="book.authors.join(', ')">{{ book.authors.join(', ') }}</p>
                          }

                          <div class="rating-row">
                            @if (book.averageRating) {
                              <span class="rating-star">&#9733;</span>
                              <span class="rating-val">{{ book.averageRating }}</span>
                              <span class="rating-count">({{ book.reviewCount }})</span>
                            } @else {
                              <span class="rating-unrated">Unrated</span>
                            }
                          </div>
                        </div>
                      </div>

                      <div class="date-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <span>Recommended on {{ formatDate(book.latestCreatedAt) }}</span>
                      </div>
                    </article>
                  }
                </div>

                <!-- Numeric Pagination Controls < 1 2 > -->
                @if (totalAllBooksPages() > 1) {
                  <div class="pagination-row" aria-label="All books pagination">
                    <button
                      type="button"
                      class="page-nav-btn"
                      [disabled]="allBooksPage() <= 1"
                      (click)="prevAllBooksPage()"
                      aria-label="Previous page"
                    >
                      &lt;
                    </button>

                    <div class="page-numbers-wrap">
                      @for (p of allBooksPageNumbers(); track p) {
                        <button
                          type="button"
                          class="page-number-btn"
                          [class.active]="allBooksPage() === p"
                          (click)="goToAllBooksPage(p)"
                          [attr.aria-label]="'Page ' + p"
                          [attr.aria-current]="allBooksPage() === p ? 'page' : null"
                        >
                          {{ p }}
                        </button>
                      }
                    </div>

                    <button
                      type="button"
                      class="page-nav-btn"
                      [disabled]="allBooksPage() >= totalAllBooksPages()"
                      (click)="nextAllBooksPage()"
                      aria-label="Next page"
                    >
                      &gt;
                    </button>
                  </div>
                }
              }
            }

            <!-- ======================================================== -->
            <!-- VIEW 3: PERSONALIZED / DEPARTMENT (BETA)                 -->
            <!-- ======================================================== -->
            @if (studentTab() === 'personalized' || studentTab() === 'department') {
              <div class="interests-banner surface-card">
                <div class="interests-banner-content">
                  <div class="sparkle-badge" aria-hidden="true">🏛️</div>
                  <div>
                    <h3 class="banner-title">
                      {{ userDepartment() ? 'Recommended for ' + userDepartment() : 'Recommended for Your Department' }}
                    </h3>
                    <p class="banner-desc">
                      {{ userDepartment() ? 'Curated academic books classified under ' + userDepartment() + '.' : 'Books tailored to your academic department.' }}
                    </p>
                  </div>
                </div>
                @if (userDepartment()) {
                  <a [routerLink]="['/workspace/books']" [queryParams]="{ department: userDepartment() }" class="btn-update-interests">
                    View All in Catalogue &rarr;
                  </a>
                }
              </div>

              @if (loadingDepartmentBooks()) {
                <div class="loading-state surface-card">Loading department recommendations…</div>
              } @else if (!userDepartment()) {
                <div class="empty-state surface-card">
                  <div class="empty-icon-circle">🏛️</div>
                  <h3>No department assigned</h3>
                  <p>Please contact the library or update your profile to receive department-based book recommendations.</p>
                </div>
              } @else if (departmentBooks().length === 0) {
                <div class="empty-state surface-card">
                  <h3>No books currently classified under {{ userDepartment() }}</h3>
                  <p>Check back soon! Our librarians are actively classifying and acquiring new titles.</p>
                </div>
              } @else {
                <div class="all-books-grid">
                  @for (book of departmentBooks(); track book.id) {
                    <article class="all-book-card surface-card">
                      <div class="all-book-cover-wrap">
                        @if (book.coverImageUrl && !brokenCovers().has(book.id)) {
                          <img [src]="book.coverImageUrl" [alt]="'Cover of ' + book.title" class="all-book-cover" loading="lazy" (error)="markCoverBroken(book.id)">
                        } @else {
                          <div class="book-cover-fallback">
                            <span>{{ book.title.substring(0, 3).toUpperCase() }}</span>
                          </div>
                        }

                        <button
                          type="button"
                          class="wishlist-btn-overlay"
                          [class.active]="wishlistService.isInWishlist(book.id)"
                          (click)="toggleBookmark(book.id)"
                          aria-label="Add to wishlist"
                        >
                          <svg viewBox="0 0 24 24" [attr.fill]="wishlistService.isInWishlist(book.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                          </svg>
                        </button>
                      </div>

                      <div class="all-book-body">
                        @if (book.availableCopies > 0) {
                          <div class="badge-pill" style="color: #003D30; background: #EAF2EF;">● Available ({{ book.availableCopies }})</div>
                        } @else {
                          <div class="badge-pill" style="color: #991B1B; background: #FEE2E2;">● Unavailable</div>
                        }

                        <h4 class="book-title">
                          <a [routerLink]="['/workspace/books', book.id]">{{ book.title }}</a>
                        </h4>
                        <p class="book-author">{{ book.authors.join(', ') || 'Unknown Author' }}</p>

                        <div class="categories-pill-row">
                          <span class="cat-tag" style="background:#EAF2EF;color:#003D30;font-weight:600;">{{ book.department || userDepartment() }}</span>
                          @for (cat of book.categories; track cat) {
                            <span class="cat-tag">{{ cat }}</span>
                          }
                        </div>

                        <div class="action-footer">
                          <a [routerLink]="['/workspace/books', book.id]" class="btn-view-details">
                            View Details &rarr;
                          </a>
                        </div>
                      </div>
                    </article>
                  }
                </div>
              }
            }
          </section>
        </div>
      }

      <!-- ======================================================== -->
      <!-- FACULTY VIEW (Manage Own & View All)                     -->
      <!-- ======================================================== -->
      @if (isFaculty()) {
        <header class="page-header">
          <div class="header-left">
            <div class="header-icon-box" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
            </div>
            <div>
              <h1 class="page-title">Faculty Recommendations</h1>
              <p class="page-subtitle">Curate and recommend books for your students.</p>
            </div>
          </div>
          <div class="header-actions">
            <a routerLink="/workspace/recommendations/new" class="btn-primary-action">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Recommend a Book
            </a>
          </div>
        </header>

        <div class="nav-tabs-bar" role="tablist">
          <button
            type="button"
            role="tab"
            class="nav-tab-pill"
            [class.active]="facultyTab() === 'mine'"
            (click)="setFacultyTab('mine')"
          >
            My Recommendations ({{ facultyMine().length }})
          </button>
          <button
            type="button"
            role="tab"
            class="nav-tab-pill"
            [class.active]="facultyTab() === 'all'"
            (click)="setFacultyTab('all')"
          >
            All Faculty Recommendations ({{ facultyAll().length }})
          </button>
        </div>

        @if (loading()) {
          <div class="loading-state surface-card">Loading recommendations…</div>
        } @else if (facultyTab() === 'mine') {
          @if (facultyMine().length === 0) {
            <div class="empty-state surface-card">
              <h3>You have not recommended any books yet</h3>
              <p>Browse the catalogue and recommend titles to guide student reading.</p>
              <a routerLink="/workspace/books" class="btn-primary-action">Browse Catalogue</a>
            </div>
          } @else {
            <div class="faculty-management-grid">
              @for (rec of facultyMine(); track rec.id) {
                <article class="faculty-manage-card surface-card">
                  <div class="card-left-cover">
                    @if (rec.bookCoverImageUrl && !brokenCovers().has(rec.bookId)) {
                      <img [src]="rec.bookCoverImageUrl" [alt]="rec.bookTitle" class="manage-cover" (error)="markCoverBroken(rec.bookId)">
                    } @else {
                      <div class="book-cover-fallback"><span>{{ rec.bookTitle.substring(0, 2).toUpperCase() }}</span></div>
                    }
                  </div>
                  <div class="card-right-info">
                    <div class="status-row">
                      <span class="status-badge" [class.withdrawn]="rec.status === 'WITHDRAWN'">
                        {{ rec.status === 'ACTIVE' ? 'Active' : 'Withdrawn' }}
                      </span>
                      <span class="helpful-tag">Helpful ({{ rec.helpfulCount }})</span>
                    </div>
                    <h3 class="manage-book-title">
                      <a [routerLink]="['/workspace/books', rec.bookId]">{{ rec.bookTitle }}</a>
                    </h3>
                    <p class="manage-book-author">{{ rec.bookAuthors.join(', ') }}</p>
                    @if (rec.message) {
                      <p class="manage-book-message">&ldquo;{{ rec.message }}&rdquo;</p>
                    }
                    <div class="manage-actions-row">
                      <button type="button" class="action-link" (click)="openEditModal(rec)" [disabled]="rec.status === 'WITHDRAWN'">Edit Note</button>
                      @if (rec.status === 'ACTIVE') {
                        <button type="button" class="action-link text-danger" (click)="confirmWithdraw(rec)">Withdraw</button>
                      }
                    </div>
                  </div>
                </article>
              }
            </div>
          }
        } @else {
          <!-- Faculty: All Recommendations view -->
          <div class="faculty-management-grid">
            @for (rec of facultyAll(); track rec.id) {
              <article class="faculty-manage-card surface-card">
                <div class="card-left-cover">
                  @if (rec.bookCoverImageUrl && !brokenCovers().has(rec.bookId)) {
                    <img [src]="rec.bookCoverImageUrl" [alt]="rec.bookTitle" class="manage-cover" (error)="markCoverBroken(rec.bookId)">
                  } @else {
                    <div class="book-cover-fallback"><span>{{ rec.bookTitle.substring(0, 2).toUpperCase() }}</span></div>
                  }
                </div>
                <div class="card-right-info">
                  <span class="faculty-tag">{{ rec.facultyName }} &bull; {{ rec.facultyDepartment }}</span>
                  <h3 class="manage-book-title">
                    <a [routerLink]="['/workspace/books', rec.bookId]">{{ rec.bookTitle }}</a>
                  </h3>
                  <p class="manage-book-author">{{ rec.bookAuthors.join(', ') }}</p>
                  @if (rec.message) {
                    <p class="manage-book-message">&ldquo;{{ rec.message }}&rdquo;</p>
                  }
                  <span class="date-tag">Recommended on {{ formatDate(rec.createdAt) }}</span>
                </div>
              </article>
            }
          </div>
        }
      }

      <!-- ======================================================== -->
      <!-- MODAL: UPDATE MY INTERESTS                               -->
      <!-- ======================================================== -->
      @if (showInterestsModal()) {
        <div class="modal-backdrop" (click)="closeInterestsModal()">
          <div class="modal-card surface-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <header class="modal-header">
              <div>
                <h3 id="modal-title" class="modal-title">&#10024; Select Your Academic Interests</h3>
                <p class="modal-subtitle">Choose subjects and disciplines to receive personalized book suggestions.</p>
              </div>
              <button type="button" class="modal-close-btn" aria-label="Close modal" (click)="closeInterestsModal()">&times;</button>
            </header>

            <div class="modal-body">
              <div class="category-pills-selection">
                @for (cat of availableCategories(); track cat) {
                  <button
                    type="button"
                    class="interest-pill"
                    [class.selected]="modalSelectedCategories().has(cat)"
                    (click)="toggleCategoryInModal(cat)"
                  >
                    @if (modalSelectedCategories().has(cat)) {
                      <span class="check-icon">&#10003;</span>
                    }
                    {{ cat }}
                  </button>
                }
              </div>
            </div>

            <footer class="modal-footer">
              <button type="button" class="btn-cancel" (click)="closeInterestsModal()" [disabled]="savingInterests()">
                Cancel
              </button>
              <button type="button" class="btn-save-interests" (click)="saveInterests()" [disabled]="savingInterests()">
                {{ savingInterests() ? 'Saving…' : 'Save Interests' }}
              </button>
            </footer>
          </div>
        </div>
      }

      <!-- ======================================================== -->
      <!-- MODAL: EDIT FACULTY RECOMMENDATION NOTE                  -->
      <!-- ======================================================== -->
      @if (editingRec()) {
        <div class="modal-backdrop" (click)="closeEditModal()">
          <div class="modal-card surface-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
            <header class="modal-header">
              <h3 class="modal-title">Edit Recommendation Note</h3>
              <button type="button" class="modal-close-btn" (click)="closeEditModal()">&times;</button>
            </header>
            <div class="modal-body">
              <label for="edit-msg" class="field-label">Message / Endorsement (optional)</label>
              <textarea
                id="edit-msg"
                class="form-textarea"
                rows="4"
                maxlength="300"
                [(ngModel)]="editMessage"
                placeholder="Explain why students should read this book..."
              ></textarea>
              <span class="char-count">{{ editMessage.length }}/300 characters</span>
              @if (editError()) {
                <div class="error-text">{{ editError() }}</div>
              }
            </div>
            <footer class="modal-footer">
              <button type="button" class="btn-cancel" (click)="closeEditModal()" [disabled]="modalPending()">Cancel</button>
              <button type="button" class="btn-save-interests" (click)="submitEdit()" [disabled]="modalPending()">
                {{ modalPending() ? 'Saving…' : 'Save Note' }}
              </button>
            </footer>
          </div>
        </div>
      }

      <!-- ======================================================== -->
      <!-- MODAL: CONFIRM WITHDRAW RECOMMENDATION                   -->
      <!-- ======================================================== -->
      @if (withdrawingRec()) {
        <div class="modal-backdrop" (click)="cancelWithdraw()">
          <div class="modal-card surface-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
            <header class="modal-header">
              <h3 class="modal-title text-danger">Withdraw Recommendation</h3>
              <button type="button" class="modal-close-btn" (click)="cancelWithdraw()">&times;</button>
            </header>
            <div class="modal-body">
              <p>Are you sure you want to withdraw your recommendation for <strong>{{ withdrawingRec()?.bookTitle }}</strong>?</p>
              <p class="modal-subtext">Students will no longer see this book under your recommendations.</p>
              @if (withdrawError()) {
                <div class="error-text">{{ withdrawError() }}</div>
              }
            </div>
            <footer class="modal-footer">
              <button type="button" class="btn-cancel" (click)="cancelWithdraw()" [disabled]="modalPending()">Keep Active</button>
              <button type="button" class="btn-danger-action" (click)="submitWithdraw()" [disabled]="modalPending()">
                {{ modalPending() ? 'Withdrawing…' : 'Withdraw Recommendation' }}
              </button>
            </footer>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background: #FDFCF9;
      min-height: 100vh;
      color: #1A202C;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      box-sizing: border-box;
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
    }

    .recommendations-container {
      padding: 0 0 2rem;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .header-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #003D30;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      svg {
        width: 24px;
        height: 24px;
      }
    }

    .page-title {
      font-size: 1.625rem;
      font-weight: 700;
      color: #0F172A;
      margin: 0 0 0.25rem;
      letter-spacing: -0.02em;
    }

    .page-subtitle {
      font-size: 0.9rem;
      color: #64748B;
      margin: 0;
    }

    /* Navigation Tabs */
    .nav-tabs-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    .nav-tab-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 500;
      border: 1px solid #E2E8F0;
      background: #FFFFFF;
      color: #4A5568;
      cursor: pointer;
      transition: all 0.15s ease;

      .tab-icon {
        width: 16px;
        height: 16px;
      }

      &:hover {
        border-color: #CBD5E1;
        background: #F8FAFC;
      }

      &.active {
        background: #003D30;
        color: #FFFFFF;
        border-color: #003D30;
        font-weight: 600;
      }
    }

    .beta-badge {
      background: #FEF3C7;
      color: #92400E;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Content Layout */
    .content-layout {
      display: block;
      width: 100%;
    }

    .main-column {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* Surface Card */
    .surface-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    /* Filter Controls Row */
    .filter-controls-row {
      display: flex;
      gap: 1rem;
      padding: 0.875rem 1.25rem;
      align-items: center;
      margin-bottom: 1.5rem;
      background: #FFFFFF;
      border: 1px solid var(--color-line-200, #E5E0D5);
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      box-sizing: border-box;
      width: 100%;
    }

    .search-input-wrap {
      position: relative;
      flex: 1 1 auto;
      min-width: 220px;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      color: #94A3B8;
      pointer-events: none;
      z-index: 2;
    }

    .search-input {
      width: 100%;
      height: 42px;
      padding: 0.5rem 2.5rem 0.5rem 2.75rem !important;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      font-size: 0.875rem;
      color: #1E293B;
      background: #F8FAFC;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.15s ease, background 0.15s ease;

      &:focus {
        border-color: #003D30;
        background: #FFFFFF;
      }
    }

    .search-clear-btn {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      font-size: 1.2rem;
      color: #94A3B8;
      cursor: pointer;
      line-height: 1;
      z-index: 2;
    }

    .dropdown-wrap {
      position: relative;
      display: flex;
      align-items: center;
      flex: 0 0 auto;
    }

    .dropdown-icon {
      position: absolute;
      left: 12px;
      width: 16px;
      height: 16px;
      color: #64748B;
      pointer-events: none;
      z-index: 2;
    }

    .filter-select {
      height: 42px;
      padding: 0 1rem 0 2.25rem;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      font-size: 0.85rem;
      color: #1E293B;
      background: #FFFFFF;
      cursor: pointer;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.15s ease;

      &:focus {
        border-color: #003D30;
      }
    }

    /* Faculty Workspace Grid (Left directory + Right Selected) */
    .faculty-workspace-grid {
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr);
      gap: 1.5rem;
      align-items: start;
      width: 100%;
      box-sizing: border-box;
    }

    .selected-faculty-view {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      min-width: 0;
      width: 100%;
      box-sizing: border-box;
    }

    /* Faculty Directory (Left) */
    .faculty-directory-col {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .directory-header {
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #F1F5F9;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .all-faculty-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      font-size: 0.78rem;
      font-weight: 600;
      color: #374151;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.15s ease;

      .star-icon {
        width: 13px;
        height: 13px;
      }

      &:hover {
        border-color: #003D30;
        color: #003D30;
      }

      &.active {
        background: #F0FDF4;
        border-color: #003D30;
        color: #003D30;
        font-weight: 700;
      }
    }

    .directory-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0F172A;
      margin: 0;
    }

    .faculty-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 600px;
      overflow-y: auto;
    }

    .faculty-item-btn {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 0.75rem;
      border: 1px solid transparent;
      border-radius: 8px;
      background: transparent;
      text-align: left;
      cursor: pointer;
      width: 100%;
      transition: all 0.15s ease;

      &:hover {
        background: #F8FAFC;
      }

      &.selected {
        background: #F0FDF4;
        border-color: #86EFAC;
      }
    }

    .fac-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #E2E8F0;
      color: #334155;
      font-size: 0.8rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &.highlight {
        background: #003D30;
        color: #FFFFFF;
      }
    }

    .fac-item-info {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .fac-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: #0F172A;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .fac-dept {
      font-size: 0.725rem;
      color: #64748B;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .fac-books-count {
      font-size: 0.725rem;
      color: #059669;
      font-weight: 500;

      &.zero-books {
        color: #D97706;
      }
    }

    .directory-footer {
      padding-top: 0.5rem;
      border-top: 1px solid #F1F5F9;
    }

    .view-all-faculty-btn {
      background: transparent;
      border: none;
      color: #003D30;
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0;

      &:hover {
        text-decoration: underline;
      }
    }

    /* Selected Faculty Banner */
    .faculty-banner {
      padding: 1.25rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
      background: linear-gradient(135deg, #ECFDF5 0%, #E0F2FE 100%);
      border: 1px solid #A7F3D0;
    }

    .banner-left {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .banner-avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #003D30;
      color: #FFFFFF;
      font-size: 1.2rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(0, 61, 48, 0.2);
    }

    .banner-name {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0F172A;
      margin: 0 0 0.15rem;
    }

    .banner-designation {
      font-size: 0.85rem;
      color: #334155;
      font-weight: 500;
      margin: 0;
    }

    .banner-dept {
      font-size: 0.8rem;
      color: #64748B;
      margin: 0;
    }

    .banner-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .banner-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      height: 38px;
      padding: 0 1rem;
      border-radius: 9999px;
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;

      svg {
        width: 16px;
        height: 16px;
      }
    }

    .btn-outline {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      color: #334155;

      &:hover {
        background: #F8FAFC;
        border-color: #94A3B8;
      }
    }

    .btn-follow {
      background: #FFFFFF;
      border: 1px solid #003D30;
      color: #003D30;

      &:hover {
        background: #003D30;
        color: #FFFFFF;
      }

      &.following {
        background: #003D30;
        color: #FFFFFF;
      }
    }

    /* Section Heading */
    .section-heading-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .section-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0F172A;
      margin: 0;
    }

    /* Faculty & All Recommended Books Grid: 3 columns on desktop */
    .faculty-books-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1.25rem;
      width: 100%;
      box-sizing: border-box;
    }

    .faculty-book-card {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 0.75rem;
      border-radius: 12px;
      border: 1px solid var(--color-line-200, #E5E0D5);
      background: #FFFFFF;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      box-sizing: border-box;
      min-height: 185px;
      height: 100%;
      min-width: 0;
      transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 14px rgba(0, 0, 0, 0.06);
        border-color: #B8D0C7;
      }
    }

    .card-top-row {
      display: flex;
      gap: 0.85rem;
      align-items: flex-start;
      min-width: 0;
    }

    .book-cover-container {
      width: 72px;
      height: 104px;
      flex-shrink: 0;
      border-radius: 6px;
      overflow: hidden;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
      margin-bottom: 0;
    }

    .book-cover-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #F8FAFC;
    }

    .book-cover-fallback {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #003D30 0%, #005C49 100%);
      color: #FFFFFF;
      font-size: 0.85rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .book-info-body {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      flex: 1;
      min-width: 0;
    }

    .title-bookmark-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
      min-width: 0;
    }

    .book-title {
      font-size: 0.95rem;
      font-weight: 700;
      line-height: 1.25;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;

      a {
        color: #0F172A;
        text-decoration: none;

        &:hover {
          color: #003D30;
          text-decoration: underline;
        }
      }
    }

    .wishlist-btn-overlay {
      position: static;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      background: transparent;
      border: none;
      color: #9CA3AF;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.15s ease;

      svg {
        width: 16px;
        height: 16px;
      }

      &:hover {
        color: #003D30;
      }

      &.active {
        color: #003D30;
      }
    }

    .book-author {
      font-size: 0.78rem;
      color: #64748B;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .book-recommender {
      font-size: 0.78rem;
      color: #003D30;
      font-weight: 600;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rating-row {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.78rem;
      margin-top: 0.15rem;
    }

    .rating-star {
      color: #F59E0B;
      font-size: 0.85rem;
    }

    .rating-val {
      font-weight: 700;
      color: #1E293B;
    }

    .rating-count {
      color: #94A3B8;
      font-size: 0.75rem;
    }

    .rating-unrated {
      color: #94A3B8;
      font-size: 0.75rem;
    }

    .quote-box {
      margin: 0;
      padding: 0.4rem 0.55rem;
      background: #F8FAFC;
      border-left: 2px solid #003D30;
      border-radius: 4px;
      font-size: 0.76rem;
      color: #334155;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .quote-mark {
      font-weight: 700;
      color: #003D30;
    }

    .date-row {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.725rem;
      color: #94A3B8;
      margin-top: auto;
      padding-top: 0.35rem;
      border-top: 1px solid #F8FAFC;

      svg {
        width: 14px;
        height: 14px;
      }
    }

    /* View Toggle Pills */
    .view-toggle-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    .view-toggle-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1.15rem;
      border-radius: 9999px;
      font-size: 0.84rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid #E5E0D5;
      background: #FFFFFF;
      color: #1F2421;

      .tab-icon {
        width: 16px;
        height: 16px;
        stroke: currentColor;
      }

      &:hover:not(.active) {
        background: #F8FAFC;
        border-color: #CBD5E1;
      }

      &.active {
        background: #003D30;
        color: #FFFFFF;
        border-color: #003D30;

        .tab-icon {
          stroke: #FFFFFF;
        }
      }
    }

    /* All Recommended Books Section */
    .all-books-view {
      display: flex;
      flex-direction: column;
    }

    .all-books-header {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      margin-bottom: 1.25rem;
    }

    .all-books-icon-wrap {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: #EAF2EF;
      color: #003D30;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      svg {
        width: 22px;
        height: 22px;
      }
    }

    .all-books-heading-text {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .all-books-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #1F2421;
      margin: 0;
    }

    .all-books-subtitle {
      font-size: 0.825rem;
      color: #5A625D;
      margin: 0;
    }

    /* Pagination */
    .pagination-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 1.75rem;
    }

    .page-nav-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1px solid #CBD5E1;
      background: #FFFFFF;
      color: #334155;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      &:not(:disabled):hover {
        background: #F8FAFC;
        border-color: #003D30;
      }
    }

    .page-indicator {
      font-size: 0.85rem;
      font-weight: 600;
      color: #475569;
    }

    .page-numbers-wrap {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .page-number-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      background: transparent;
      color: #475569;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;

      &:hover:not(.active) {
        background: #F1F5F9;
        color: #0F172A;
      }

      &.active {
        background: #003D30;
        color: #FFFFFF;
        font-weight: 700;
      }
    }

    /* Empty state notice */
    .empty-state-faculty {
      display: flex;
      align-items: center;
      gap: 1.15rem;
      padding: 1.4rem 1.6rem;
      border-radius: 12px;
      border: 1px solid #E5E0D5;
      background: #FFFFFF;
      margin-top: 0.5rem;
    }

    .empty-book-icon {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #F1F5F9;
      color: #64748B;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      svg {
        width: 22px;
        height: 22px;
      }
    }

    .empty-text-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .empty-heading {
      font-size: 0.95rem;
      font-weight: 600;
      color: #1F2937;
      margin: 0;
    }

    .empty-subtext {
      font-size: 0.82rem;
      color: #64748B;
      margin: 0;
    }

    /* All Recommended Books Grid */
    .all-books-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1.25rem;
      width: 100%;
      box-sizing: border-box;
    }

    .all-book-card {
      padding: 1rem;
      display: flex;
      flex-direction: column;
    }

    .all-book-cover-wrap {
      position: relative;
      height: 180px;
      border-radius: 8px;
      overflow: hidden;
      background: #F1F5F9;
      margin-bottom: 0.875rem;
    }

    .all-book-cover {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .all-book-body {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      flex: 1;
    }

    .badge-pill {
      align-self: flex-start;
      background: #ECFDF5;
      color: #065F46;
      border: 1px solid #A7F3D0;
      font-size: 0.725rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;
      margin-bottom: 0.2rem;
    }

    .contributors-summary {
      font-size: 0.75rem;
      color: #64748B;
      margin-top: 0.2rem;
    }

    .contrib-label {
      font-weight: 600;
      margin-right: 0.25rem;
    }

    .quote-box-small {
      font-size: 0.725rem;
      color: #475569;
      font-style: italic;
      background: #F8FAFC;
      padding: 0.4rem 0.6rem;
      border-left: 2px solid #003D30;
      margin: 0.35rem 0;
    }

    .action-footer {
      margin-top: auto;
      padding-top: 0.75rem;
    }

    .btn-view-details {
      display: inline-block;
      font-size: 0.8rem;
      font-weight: 600;
      color: #003D30;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    /* Personalized Banner */
    .interests-banner {
      padding: 1.25rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #FEF3C7 0%, #FEF9C3 100%);
      border: 1px solid #FDE68A;
      margin-bottom: 1.25rem;
    }

    .interests-banner-content {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .sparkle-badge {
      font-size: 1.5rem;
    }

    .banner-title {
      font-size: 1rem;
      font-weight: 700;
      color: #78350F;
      margin: 0 0 0.15rem;
    }

    .banner-desc {
      font-size: 0.825rem;
      color: #92400E;
      margin: 0;
    }

    .btn-update-interests {
      background: #78350F;
      color: #FFFFFF;
      border: none;
      border-radius: 9999px;
      padding: 0.5rem 1rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;

      &:hover {
        background: #92400E;
      }
    }

    .categories-pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-top: 0.35rem;
    }

    .cat-tag {
      background: #F1F5F9;
      color: #334155;
      font-size: 0.7rem;
      padding: 2px 6px;
      border-radius: 4px;
    }

    /* RIGHT SIDEBAR */
    .right-sidebar {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .sidebar-card {
      padding: 1.25rem;
    }

    .sidebar-card-header {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .header-trophy-icon,
    .header-clock-icon {
      font-size: 1.25rem;
      line-height: 1;
    }

    .sidebar-card-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0F172A;
      margin: 0 0 0.15rem;
    }

    .sidebar-card-subtitle {
      font-size: 0.75rem;
      color: #64748B;
      margin: 0;
    }

    .sidebar-empty {
      font-size: 0.8rem;
      color: #94A3B8;
      margin: 0;
    }

    /* Top Books List */
    .top-books-list {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }

    .top-book-item {
      display: grid;
      grid-template-columns: 20px 42px 1fr auto;
      gap: 0.6rem;
      align-items: center;
    }

    .crown-rank-icon {
      font-size: 1rem;
      text-align: center;
    }

    .rank-number {
      font-size: 0.8rem;
      font-weight: 700;
      color: #94A3B8;
    }

    .top-book-cover-wrap {
      width: 42px;
      height: 56px;
      border-radius: 4px;
      overflow: hidden;
      background: #F1F5F9;
    }

    .top-book-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .top-book-thumb-fallback {
      width: 100%;
      height: 100%;
      background: #003D30;
      color: #FFFFFF;
      font-size: 0.75rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .top-book-details {
      overflow: hidden;
    }

    .top-book-title {
      font-size: 0.8rem;
      font-weight: 700;
      margin: 0 0 0.15rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      a {
        color: #0F172A;
        text-decoration: none;

        &:hover {
          color: #003D30;
          text-decoration: underline;
        }
      }
    }

    .top-book-faculty-count {
      font-size: 0.7rem;
      color: #64748B;
      margin: 0;
    }

    .top-book-badge {
      background: #ECFDF5;
      color: #065F46;
      border: 1px solid #A7F3D0;
      font-size: 0.675rem;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 9999px;
      white-space: nowrap;
    }

    /* Recent Books List */
    .recent-books-list {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }

    .recent-book-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .recent-cover-wrap {
      width: 40px;
      height: 52px;
      border-radius: 4px;
      overflow: hidden;
      background: #F1F5F9;
      flex-shrink: 0;
    }

    .recent-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .recent-thumb-fallback {
      width: 100%;
      height: 100%;
      background: #005C49;
      color: #FFFFFF;
      font-size: 0.7rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .recent-details {
      overflow: hidden;
    }

    .recent-title {
      font-size: 0.8rem;
      font-weight: 700;
      margin: 0 0 0.15rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      a {
        color: #0F172A;
        text-decoration: none;

        &:hover {
          color: #003D30;
          text-decoration: underline;
        }
      }
    }

    .recent-meta {
      font-size: 0.7rem;
      color: #64748B;
      margin: 0;
    }

    /* Better Recommendations Card */
    .better-rec-card {
      position: relative;
      overflow: hidden;
    }

    .better-rec-header {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .sparkle-icon {
      font-size: 1.25rem;
      line-height: 1;
      color: #003D30;
    }

    .btn-update-interests-green {
      width: 100%;
      background: #003D30;
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      padding: 0.65rem 1rem;
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: background 0.15s ease;

      &:hover {
        background: #005C49;
      }
    }

    .sidebar-book-stack-art {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.5rem;
      margin-right: -0.5rem;

      svg {
        width: 100px;
        height: 60px;
      }
    }

    /* Faculty Management View */
    .header-actions {
      display: flex;
      align-items: center;
    }

    .btn-primary-action {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #003D30;
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      padding: 0.65rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;

      svg {
        width: 16px;
        height: 16px;
      }

      &:hover {
        background: #005C49;
      }
    }

    .faculty-management-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.25rem;
    }

    .faculty-manage-card {
      padding: 1.25rem;
      display: flex;
      gap: 1rem;
    }

    .card-left-cover {
      width: 80px;
      height: 110px;
      border-radius: 6px;
      overflow: hidden;
      background: #F1F5F9;
      flex-shrink: 0;
    }

    .manage-cover {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .card-right-info {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      flex: 1;
    }

    .status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .status-badge {
      background: #ECFDF5;
      color: #065F46;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;

      &.withdrawn {
        background: #FEE2E2;
        color: #991B1B;
      }
    }

    .helpful-tag {
      font-size: 0.725rem;
      color: #64748B;
    }

    .faculty-tag {
      font-size: 0.75rem;
      color: #003D30;
      font-weight: 600;
    }

    .date-tag {
      font-size: 0.725rem;
      color: #94A3B8;
      margin-top: auto;
    }

    .manage-book-title {
      font-size: 0.95rem;
      font-weight: 700;
      margin: 0;

      a {
        color: #0F172A;
        text-decoration: none;

        &:hover {
          color: #003D30;
          text-decoration: underline;
        }
      }
    }

    .manage-book-author {
      font-size: 0.8rem;
      color: #64748B;
      margin: 0;
    }

    .manage-book-message {
      font-size: 0.775rem;
      color: #334155;
      font-style: italic;
      margin: 0.25rem 0;
    }

    .manage-actions-row {
      display: flex;
      gap: 1rem;
      margin-top: auto;
      padding-top: 0.5rem;
    }

    .action-link {
      background: transparent;
      border: none;
      color: #003D30;
      font-size: 0.775rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0;

      &:hover:not(:disabled) {
        text-decoration: underline;
      }

      &.text-danger {
        color: #DC2626;
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    /* Modal Backdrop & Card */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-card {
      width: 100%;
      max-width: 540px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: modalEnter 0.2s ease-out;
    }

    @keyframes modalEnter {
      from {
        opacity: 0;
        transform: scale(0.96);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .modal-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0F172A;
      margin: 0 0 0.25rem;
    }

    .modal-subtitle {
      font-size: 0.825rem;
      color: #64748B;
      margin: 0;
    }

    .modal-close-btn {
      background: transparent;
      border: none;
      font-size: 1.5rem;
      color: #94A3B8;
      cursor: pointer;
      line-height: 1;
    }

    .modal-body {
      padding: 1.25rem 1.5rem;
      overflow-y: auto;
    }

    .category-pills-selection {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .interest-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.825rem;
      font-weight: 500;
      border: 1px solid #CBD5E1;
      background: #FFFFFF;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        border-color: #003D30;
      }

      &.selected {
        background: #003D30;
        color: #FFFFFF;
        border-color: #003D30;
        font-weight: 600;
      }
    }

    .check-icon {
      font-weight: 700;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .btn-cancel {
      padding: 0.5rem 1rem;
      border-radius: 8px;
      border: 1px solid #CBD5E1;
      background: #FFFFFF;
      color: #334155;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;

      &:hover:not(:disabled) {
        background: #F8FAFC;
      }
    }

    .btn-save-interests {
      padding: 0.5rem 1.25rem;
      border-radius: 8px;
      border: none;
      background: #003D30;
      color: #FFFFFF;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;

      &:hover:not(:disabled) {
        background: #005C49;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .btn-danger-action {
      padding: 0.5rem 1.25rem;
      border-radius: 8px;
      border: none;
      background: #DC2626;
      color: #FFFFFF;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;

      &:hover:not(:disabled) {
        background: #B91C1C;
      }
    }

    .field-label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.5rem;
    }

    .form-textarea {
      width: 100%;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 0.75rem;
      font-family: inherit;
      font-size: 0.875rem;
      outline: none;
      resize: vertical;

      &:focus {
        border-color: #003D30;
      }
    }

    .char-count {
      display: block;
      font-size: 0.75rem;
      color: #94A3B8;
      text-align: right;
      margin-top: 0.25rem;
    }

    .error-text {
      color: #DC2626;
      font-size: 0.8rem;
      margin-top: 0.5rem;
    }

    .modal-subtext {
      font-size: 0.85rem;
      color: #64748B;
      margin-top: 0.25rem;
    }

    /* Loading & Empty States */
    .loading-state {
      padding: 3rem 2rem;
      text-align: center;
      color: #64748B;
      font-size: 0.9rem;
    }

    .empty-state {
      padding: 3rem 2rem;
      text-align: center;

      h3 {
        font-size: 1.15rem;
        font-weight: 700;
        color: #0F172A;
        margin: 0 0 0.5rem;
      }

      p {
        font-size: 0.875rem;
        color: #64748B;
        margin: 0 0 1.25rem;
      }
    }

    .empty-icon-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #F1F5F9;
      color: #64748B;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1rem;
      font-size: 1.5rem;
    }

    .empty-state-small {
      padding: 2rem 1rem;
      text-align: center;
      font-size: 0.825rem;
      color: #94A3B8;
    }

    /* Responsive */
    @media (max-width: 1180px) {
      .faculty-books-grid,
      .all-books-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 960px) {
      .faculty-workspace-grid {
        grid-template-columns: 1fr;
        gap: 1.25rem;
      }

      .faculty-directory-col {
        max-height: 380px;
      }

      .faculty-list {
        max-height: 280px;
      }

      .filter-controls-row {
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .search-input-wrap {
        width: 100%;
        flex: 1 1 100%;
      }

      .dropdown-wrap {
        flex: 1 1 calc(50% - 0.5rem);
      }

      .filter-select {
        width: 100%;
      }
    }

    @media (max-width: 640px) {
      .recommendations-container {
        padding: 0 0 1.5rem;
      }

      .faculty-books-grid,
      .all-books-grid {
        grid-template-columns: 1fr;
      }

      .filter-controls-row {
        flex-direction: column;
        align-items: stretch;
      }

      .dropdown-wrap {
        flex: 1 1 100%;
        width: 100%;
      }

      .faculty-banner {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .banner-actions {
        width: 100%;
        justify-content: stretch;

        .banner-btn {
          flex: 1;
          justify-content: center;
        }
      }
    }
  `]
})
export class BookRecommendationsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly recService = inject(RecommendationService);
  private readonly catalogueService = inject(CatalogueService);
  readonly wishlistService = inject(WishlistService);

  readonly isStudent = computed(() => this.auth.profile()?.role === 'STUDENT');
  readonly isFaculty = computed(() => this.auth.profile()?.role === 'FACULTY');
  readonly isLibrarian = computed(() => this.auth.profile()?.role === 'LIBRARIAN');

  // Student Tab state
  readonly studentTab = signal<'faculty' | 'all-books' | 'personalized' | 'department'>('all-books');
  readonly userDepartment = computed(() => this.auth.profile()?.department || null);
  readonly departmentBooks = signal<import('../catalogue/catalogue.service').BookSummary[]>([]);
  readonly loadingDepartmentBooks = signal<boolean>(false);

  // Faculty Directory & Selected Faculty
  readonly facultyDirectory = signal<FacultyDirectoryItem[]>([]);
  readonly selectedFacultyId = signal<string | null>(null);
  readonly selectedFacultyDetail = signal<FacultyDetail | null>(null);
  readonly loadingFaculty = signal(false);
  readonly loadingFacultyDetail = signal(false);
  readonly facultySearchQuery = signal('');
  readonly selectedDepartment = signal('ALL');
  readonly selectedSort = signal('newest');
  readonly departments = signal<string[]>([]);
  readonly followedFacultyIds = signal<Set<string>>(new Set());

  // Pagination for Selected Faculty books (6 per page: 3 columns x 2 rows)
  readonly facultyBooksPage = signal(1);
  readonly facultyBooksPageSize = 6;

  readonly paginatedFacultyBooks = computed<FacultyBookItem[]>(() => {
    const detail = this.selectedFacultyDetail();
    if (!detail || !detail.books) return [];
    const page = this.facultyBooksPage();
    const size = this.facultyBooksPageSize;
    const fromIndex = (page - 1) * size;
    return detail.books.slice(fromIndex, fromIndex + size);
  });

  readonly totalFacultyPages = computed<number>(() => {
    const detail = this.selectedFacultyDetail();
    if (!detail || !detail.books || detail.books.length === 0) return 1;
    return Math.ceil(detail.books.length / this.facultyBooksPageSize);
  });

  readonly facultyBooksPageNumbers = computed<number[]>(() => {
    const total = this.totalFacultyPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  // Right Sidebar Highlights
  readonly topRecommendedBooks = signal<TopRecommendedBook[]>([]);
  readonly recentlyRecommended = signal<RecentRecommendation[]>([]);

  // Tab 2: All Recommended Books
  readonly allRecommendedBooks = signal<AllRecommendedBookItem[]>([]);
  readonly loadingAllBooks = signal(false);
  readonly allBooksSearchQuery = signal('');
  readonly allBooksCategory = signal('ALL');
  readonly allBooksSort = signal('most_recommended');

  // Pagination for All Recommended Books (6 per page: 3 columns x 2 rows)
  readonly allBooksPage = signal(1);
  readonly allBooksPageSize = 6;

  readonly paginatedAllBooks = computed<AllRecommendedBookItem[]>(() => {
    const books = this.allRecommendedBooks();
    const page = this.allBooksPage();
    const size = this.allBooksPageSize;
    const fromIndex = (page - 1) * size;
    return books.slice(fromIndex, fromIndex + size);
  });

  readonly totalAllBooksPages = computed<number>(() => {
    const books = this.allRecommendedBooks();
    if (books.length === 0) return 1;
    return Math.ceil(books.length / this.allBooksPageSize);
  });

  readonly allBooksPageNumbers = computed<number[]>(() => {
    const total = this.totalAllBooksPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  prevAllBooksPage(): void {
    if (this.allBooksPage() > 1) {
      this.allBooksPage.update((p) => p - 1);
    }
  }

  nextAllBooksPage(): void {
    if (this.allBooksPage() < this.totalAllBooksPages()) {
      this.allBooksPage.update((p) => p + 1);
    }
  }

  goToAllBooksPage(page: number): void {
    if (page >= 1 && page <= this.totalAllBooksPages()) {
      this.allBooksPage.set(page);
    }
  }

  getPrimaryFacultyName(book: AllRecommendedBookItem): string {
    if (!book.contributingFaculty || book.contributingFaculty.length === 0) {
      return 'Faculty';
    }
    const name = book.contributingFaculty[0].facultyName;
    if (name.startsWith('Dr.') || name.startsWith('Prof.')) {
      return name;
    }
    return `Prof. ${name}`;
  }

  getFacultyRecommendationSubtitle(name: string): string {
    if (!name) return 'Faculty';
    if (name.startsWith('Dr.') || name.startsWith('Prof.')) {
      return name;
    }
    return `Prof. ${name}`;
  }

  // Tab 3: Personalized for You
  readonly studentInterests = signal<string[]>([]);
  readonly personalizedBooks = signal<AllRecommendedBookItem[]>([]);
  readonly loadingPersonalized = signal(false);

  // Interests modal
  readonly showInterestsModal = signal(false);
  readonly availableCategories = signal<string[]>([
    'Computer Science',
    'Data Science',
    'Artificial Intelligence',
    'Programming',
    'Software Engineering',
    'Algorithms',
    'Mathematics',
    'Cybersecurity',
    'Cloud Computing',
    'Electronics'
  ]);
  readonly modalSelectedCategories = signal<Set<string>>(new Set());
  readonly savingInterests = signal(false);

  // Broken covers cache
  readonly brokenCovers = signal<Set<string>>(new Set());

  // Faculty user view state
  readonly facultyTab = signal<'mine' | 'all'>('mine');
  readonly facultyMine = signal<Recommendation[]>([]);
  readonly facultyAll = signal<Recommendation[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Modals for faculty edit / withdraw
  readonly editingRec = signal<Recommendation | null>(null);
  editMessage = '';
  readonly editError = signal<string | null>(null);

  readonly withdrawingRec = signal<Recommendation | null>(null);
  readonly withdrawError = signal<string | null>(null);
  readonly modalPending = signal(false);

  // Backward compatibility alias for tests
  readonly facultyGroups = signal<FacultyRecommendationGroup[]>([]);

  ngOnInit(): void {
    if (this.isStudent() || this.isLibrarian()) {
      this.initStudentWorkspace();
    } else if (this.isFaculty()) {
      this.loadFacultyMine();
      this.loadFacultyAll();
    }
  }

  initStudentWorkspace(): void {
    this.selectedFacultyId.set(null);
    this.selectedFacultyDetail.set(null);
    this.studentTab.set('all-books');
    this.loadAllRecommendedBooks();
    this.loadFacultyDirectory();
    this.loadDepartments();
    this.loadSidebarHighlights();
    this.loadCategoriesCatalogue();
    this.loadStudentInterests();
    this.loadDepartmentRecommendations();
  }

  selectAllRecommendations(): void {
    this.selectedFacultyId.set(null);
    this.selectedFacultyDetail.set(null);
    this.studentTab.set('all-books');
    this.allBooksPage.set(1);
    if (this.allRecommendedBooks().length === 0) {
      this.loadAllRecommendedBooks();
    }
  }

  setStudentTab(tab: 'faculty' | 'all-books' | 'personalized' | 'department'): void {
    this.studentTab.set(tab);
    if (tab === 'all-books') {
      this.selectAllRecommendations();
    } else if (tab === 'faculty') {
      if (!this.selectedFacultyId() && this.facultyDirectory().length > 0) {
        this.selectFaculty(this.facultyDirectory()[0].id);
      }
    } else if (tab === 'personalized' || tab === 'department') {
      this.loadDepartmentRecommendations();
      this.loadPersonalizedRecommendations();
    }
  }

  // --- Faculty Directory & Selected Faculty ---

  loadFacultyDirectory(): void {
    this.loadingFaculty.set(true);
    this.recService.getFacultyDirectory(
      this.facultySearchQuery(),
      this.selectedDepartment(),
      this.selectedSort()
    )
      .pipe(finalize(() => this.loadingFaculty.set(false)))
      .subscribe({
        next: (items) => {
          this.facultyDirectory.set(items);
          const currentSelected = this.selectedFacultyId();
          if (currentSelected && !items.some((i) => i.id === currentSelected)) {
            this.selectedFacultyId.set(null);
            this.selectedFacultyDetail.set(null);
          }
        },
        error: () => {
          this.facultyDirectory.set([]);
        }
      });
  }

  selectFaculty(facultyId: string): void {
    this.studentTab.set('faculty');
    this.selectedFacultyId.set(facultyId);
    this.facultyBooksPage.set(1);
    this.loadingFacultyDetail.set(true);

    this.recService.getFacultyDetails(facultyId)
      .pipe(finalize(() => this.loadingFacultyDetail.set(false)))
      .subscribe({
        next: (detail) => {
          this.selectedFacultyDetail.set(detail);
          // Check wishlist status for these books
          const bIds = detail.books.map((b) => b.bookId);
          if (bIds.length > 0) {
            this.wishlistService.checkStatus(bIds).subscribe();
          }
        },
        error: () => {
          this.selectedFacultyDetail.set(null);
        }
      });
  }

  onFacultySearch(q: string): void {
    this.facultySearchQuery.set(q);
    this.loadFacultyDirectory();
  }

  clearFacultySearch(): void {
    this.facultySearchQuery.set('');
    this.loadFacultyDirectory();
  }

  onDepartmentChange(dept: string): void {
    this.selectedDepartment.set(dept);
    this.loadFacultyDirectory();
  }

  onSortChange(sort: string): void {
    this.selectedSort.set(sort);
    this.loadFacultyDirectory();
  }

  loadDepartments(): void {
    this.recService.getDepartments().subscribe({
      next: (depts) => {
        this.departments.set(depts);
      },
      error: () => {}
    });
  }

  prevFacultyPage(): void {
    if (this.facultyBooksPage() > 1) {
      this.facultyBooksPage.update((p) => p - 1);
    }
  }

  nextFacultyPage(): void {
    if (this.facultyBooksPage() < this.totalFacultyPages()) {
      this.facultyBooksPage.update((p) => p + 1);
    }
  }

  goToFacultyPage(page: number): void {
    if (page >= 1 && page <= this.totalFacultyPages()) {
      this.facultyBooksPage.set(page);
    }
  }

  toggleFollowFaculty(facultyId: string): void {
    this.followedFacultyIds.update((set) => {
      const next = new Set(set);
      if (next.has(facultyId)) {
        next.delete(facultyId);
      } else {
        next.add(facultyId);
      }
      return next;
    });
  }

  isFacultyFollowed(facultyId: string): boolean {
    return this.followedFacultyIds().has(facultyId);
  }

  viewFacultyProfile(facultyId: string): void {
    if (!facultyId) return;
    this.router.navigate(['/workspace/recommendations/faculty', facultyId]);
  }

  resetFacultyFilter(): void {
    this.facultySearchQuery.set('');
    this.selectedDepartment.set('ALL');
    this.selectedSort.set('newest');
    this.loadFacultyDirectory();
    this.selectAllRecommendations();
  }

  // --- Sidebar Highlights ---

  loadSidebarHighlights(): void {
    this.recService.getTopRecommended(5).subscribe({
      next: (top) => this.topRecommendedBooks.set(top),
      error: () => {}
    });

    this.recService.getRecentlyRecommended(5).subscribe({
      next: (recent) => this.recentlyRecommended.set(recent),
      error: () => {}
    });
  }

  // --- Tab 2: All Recommended Books ---

  loadAllRecommendedBooks(): void {
    this.loadingAllBooks.set(true);
    this.recService.getAllRecommendedBooks(
      this.allBooksSearchQuery(),
      this.allBooksCategory(),
      this.allBooksSort()
    )
      .pipe(finalize(() => this.loadingAllBooks.set(false)))
      .subscribe({
        next: (books) => {
          this.allRecommendedBooks.set(books);
          const bIds = books.map((b) => b.bookId);
          if (bIds.length > 0) {
            this.wishlistService.checkStatus(bIds).subscribe();
          }
        },
        error: () => {
          this.allRecommendedBooks.set([]);
        }
      });
  }

  onAllBooksSearch(q: string): void {
    this.allBooksSearchQuery.set(q);
    this.loadAllRecommendedBooks();
  }

  onAllBooksCategoryChange(cat: string): void {
    this.allBooksCategory.set(cat);
    this.loadAllRecommendedBooks();
  }

  onAllBooksSortChange(sort: string): void {
    this.allBooksSort.set(sort);
    this.loadAllRecommendedBooks();
  }

  getContributorNames(book: AllRecommendedBookItem): string {
    if (!book.contributingFaculty || book.contributingFaculty.length === 0) return 'Faculty';
    const names = book.contributingFaculty.map((c) => c.facultyName);
    if (names.length <= 2) {
      return names.join(', ');
    }
    return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
  }

  // --- Tab 3: Personalized for You & Interests Modal ---

  loadStudentInterests(): void {
    this.recService.getStudentInterests().subscribe({
      next: (res) => {
        this.studentInterests.set(res.categories || []);
      },
      error: () => {}
    });
  }

  loadCategoriesCatalogue(): void {
    this.catalogueService.categories().subscribe({
      next: (cats: Category[]) => {
        if (cats && cats.length > 0) {
          const names = Array.from(new Set(cats.map((c) => c.name))).sort();
          this.availableCategories.set(names);
        }
      },
      error: () => {}
    });
  }

  loadDepartmentRecommendations(): void {
    this.loadingDepartmentBooks.set(true);
    this.catalogueService.departmentRecommendations(20)
      .pipe(finalize(() => this.loadingDepartmentBooks.set(false)))
      .subscribe({
        next: (res) => {
          this.departmentBooks.set(res.books || []);
          const bIds = (res.books || []).map((b) => b.id);
          if (bIds.length > 0) {
            this.wishlistService.checkStatus(bIds).subscribe();
          }
        },
        error: () => {
          this.departmentBooks.set([]);
        }
      });
  }

  loadPersonalizedRecommendations(): void {
    this.loadingPersonalized.set(true);
    this.recService.getPersonalizedRecommendations()
      .pipe(finalize(() => this.loadingPersonalized.set(false)))
      .subscribe({
        next: (books) => {
          this.personalizedBooks.set(books);
          const bIds = books.map((b) => b.bookId);
          if (bIds.length > 0) {
            this.wishlistService.checkStatus(bIds).subscribe();
          }
        },
        error: () => {
          this.personalizedBooks.set([]);
        }
      });
  }

  openInterestsModal(): void {
    const current = new Set(this.studentInterests());
    this.modalSelectedCategories.set(current);
    this.showInterestsModal.set(true);
  }

  closeInterestsModal(): void {
    this.showInterestsModal.set(false);
  }

  toggleCategoryInModal(cat: string): void {
    this.modalSelectedCategories.update((set) => {
      const next = new Set(set);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }

  saveInterests(): void {
    const cats = Array.from(this.modalSelectedCategories());
    this.savingInterests.set(true);
    this.recService.updateStudentInterests(cats)
      .pipe(finalize(() => this.savingInterests.set(false)))
      .subscribe({
        next: (res) => {
          this.studentInterests.set(res.categories);
          this.showInterestsModal.set(false);
          if (this.studentTab() === 'personalized') {
            this.loadPersonalizedRecommendations();
          }
        },
        error: () => {}
      });
  }

  // --- Common Wishlist & Utilities ---

  toggleBookmark(bookId: string): void {
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
    if (!name) return 'F';
    const clean = name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/i, '');
    const parts = clean.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
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

  getRelativeTime(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHrs < 1) return 'Just now';
      if (diffHrs < 24) return `${diffHrs}h ago`;
      const diffDays = Math.floor(diffHrs / 24);
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return this.formatDate(dateStr);
    } catch {
      return dateStr;
    }
  }

  // --- Faculty Management Methods ---

  setFacultyTab(tab: 'mine' | 'all'): void {
    this.facultyTab.set(tab);
  }

  loadFacultyMine(): void {
    this.loading.set(true);
    this.recService.getMyRecommendations()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (recs) => this.facultyMine.set(recs),
        error: () => this.facultyMine.set([])
      });
  }

  loadFacultyAll(): void {
    this.recService.getAllFacultyRecommendations().subscribe({
      next: (recs) => this.facultyAll.set(recs),
      error: () => this.facultyAll.set([])
    });
  }

  openEditModal(rec: Recommendation): void {
    this.editingRec.set(rec);
    this.editMessage = rec.message || '';
    this.editError.set(null);
  }

  closeEditModal(): void {
    if (!this.modalPending()) {
      this.editingRec.set(null);
    }
  }

  submitEdit(): void {
    const rec = this.editingRec();
    if (!rec) return;

    const trimmed = this.editMessage.trim();
    if (this.editMessage.length > 0 && trimmed.length === 0) {
      this.editError.set('Message cannot contain only whitespace.');
      return;
    }

    this.modalPending.set(true);
    this.editError.set(null);

    this.recService.updateRecommendationMessage(rec.id, trimmed ? trimmed : undefined)
      .pipe(finalize(() => this.modalPending.set(false)))
      .subscribe({
        next: (updated) => {
          rec.message = updated.message;
          rec.updatedAt = updated.updatedAt;
          this.editingRec.set(null);
        },
        error: (err) => {
          this.editError.set(err.error?.message || 'Failed to update recommendation.');
        }
      });
  }

  confirmWithdraw(rec: Recommendation): void {
    this.withdrawingRec.set(rec);
    this.withdrawError.set(null);
  }

  cancelWithdraw(): void {
    if (!this.modalPending()) {
      this.withdrawingRec.set(null);
    }
  }

  submitWithdraw(): void {
    const rec = this.withdrawingRec();
    if (!rec) return;

    this.modalPending.set(true);
    this.withdrawError.set(null);

    this.recService.withdrawRecommendation(rec.id)
      .pipe(finalize(() => this.modalPending.set(false)))
      .subscribe({
        next: (updated) => {
          rec.status = updated.status;
          rec.withdrawnAt = updated.withdrawnAt;
          this.withdrawingRec.set(null);
        },
        error: (err) => {
          this.withdrawError.set(err.error?.message || 'Failed to withdraw recommendation.');
        }
      });
  }
}
