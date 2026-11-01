import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import {
  FacultyRecommendationGroup,
  FacultyRecommendationItem,
  Recommendation,
  RecommendationService
} from './recommendation.service';
import { BookSummary, CatalogueService } from '../catalogue/catalogue.service';
import { ReviewService, ReviewSummary } from '../reviews/review.service';
import { WishlistService } from '../wishlist/wishlist.service';

@Component({
  selector: 'app-book-recommendations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="recommendations-container">
      <!-- ======================================================== -->
      <!-- STUDENT VIEW (Screen 1 in Reference Mockup)             -->
      <!-- ======================================================== -->
      @if (isStudent()) {
        <!-- Page Header -->
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
              <h1 class="page-title">Book Recommendations</h1>
              <p class="page-subtitle">Discover books based on your reading activity and expert suggestions.</p>
            </div>
          </div>
        </header>

        <!-- Segmented Tab Bar matching Screen 1 -->
        <div class="pill-tabs-row" role="tablist" aria-label="Recommendation sections">
          <button
            type="button"
            role="tab"
            class="pill-tab-btn"
            [class.active]="studentTab() === 'for-you'"
            [attr.aria-selected]="studentTab() === 'for-you'"
            (click)="setStudentTab('for-you')"
          >
            Recommended for You
          </button>
          <button
            type="button"
            role="tab"
            class="pill-tab-btn"
            [class.active]="studentTab() === 'faculty'"
            [attr.aria-selected]="studentTab() === 'faculty'"
            (click)="setStudentTab('faculty')"
          >
            Recommended by Faculty
          </button>
          <button
            type="button"
            role="tab"
            class="pill-tab-btn"
            [class.active]="studentTab() === 'popular'"
            [attr.aria-selected]="studentTab() === 'popular'"
            (click)="setStudentTab('popular')"
          >
            Popular Books
          </button>
        </div>

        <!-- TAB 1: RECOMMENDED BY FACULTY -->
        @if (studentTab() === 'faculty') {
          <section class="section-block">
            <div class="section-title-row">
              <div class="section-heading-wrap">
                <span class="faculty-cap-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                  </svg>
                </span>
                <div>
                  <h2 class="section-title">Recommended by Faculty</h2>
                  <p class="section-desc">Curated book suggestions from our faculty members.</p>
                </div>
              </div>
              <a routerLink="/workspace/books" [queryParams]="{ facultyRecommended: 'true' }" class="view-all-link">
                View All <span aria-hidden="true">&rarr;</span>
              </a>
            </div>

            @if (loading()) {
              <div class="loading-state" role="status">Loading faculty recommendations…</div>
            } @else if (error()) {
              <div class="alert alert-error" role="alert">
                {{ error() }}
                <button type="button" class="text-button" (click)="loadStudentFeed()">Retry</button>
              </div>
            } @else if (facultyGroups().length === 0) {
              <div class="empty-state surface-card">
                <div class="empty-icon-circle" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                  </svg>
                </div>
                <h3>No faculty recommendations yet</h3>
                <p>Faculty suggestions will appear here as professors curate books for students.</p>
              </div>
            } @else {
              <!-- Recommendation Cards Grid matching Screen 1 -->
              <div class="recommendations-grid">
                @for (group of facultyGroups(); track group.bookId) {
                  <article class="rec-card surface-card">
                    <!-- Top Book Row -->
                    <div class="rec-card-top">
                      <div class="rec-cover-wrap">
                        @if (group.bookCoverImageUrl && !brokenCovers().has(group.bookId)) {
                          <img
                            [src]="group.bookCoverImageUrl"
                            [alt]="'Cover of ' + group.bookTitle"
                            class="rec-cover"
                            loading="lazy"
                            (error)="markCoverBroken(group.bookId)"
                          >
                        } @else {
                          <div class="rec-cover-fallback" aria-hidden="true">
                            <span>{{ group.bookTitle.substring(0, 3).toUpperCase() }}</span>
                          </div>
                        }
                      </div>

                      <div class="rec-book-meta">
                        <div class="rec-header-row">
                          <h3 class="rec-book-title">
                            <a [routerLink]="['/workspace/books', group.bookId]">{{ group.bookTitle }}</a>
                          </h3>
                          <button
                            type="button"
                            class="bookmark-btn"
                            aria-label="Bookmark book"
                            (click)="toggleBookmark(group.bookId)"
                            [class.is-bookmarked]="wishlistService.isInWishlist(group.bookId)"
                          >
                            <svg viewBox="0 0 24 24" [attr.fill]="wishlistService.isInWishlist(group.bookId) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            </svg>
                          </button>
                        </div>
                        <p class="rec-book-author">{{ group.bookAuthors.join(', ') || 'Unknown Author' }}</p>
                        <div class="rec-rating-row" [class.no-reviews]="!hasReviews(group.bookId)">
                          @if (hasReviews(group.bookId)) {
                            <span class="rating-star" aria-hidden="true">★</span>
                            <strong class="rating-score">{{ getAverageRating(group.bookId) }}</strong>
                            <span class="rating-count">({{ getReviewCount(group.bookId) }})</span>
                          } @else {
                            <span class="rating-star empty" aria-hidden="true">☆</span>
                            <strong class="rating-score">0</strong>
                            <span class="rating-count">(0)</span>
                          }
                        </div>
                      </div>
                    </div>

                    <!-- Faculty Quote Bubble matching Screen 1 -->
                    @if (getActiveRecommendation(group); as rec) {
                      <div class="quote-bubble">
                        <span class="quote-mark" aria-hidden="true">“</span>
                        <p class="quote-text">
                          {{ rec.message ? rec.message : 'A highly recommended book for academic coursework and independent research.' }}
                        </p>
                      </div>

                      <!-- Multiple Recommendations Switcher if more than 1 faculty recommended this book -->
                      @if (group.recommendations.length > 1) {
                        <div class="multi-recs-indicator">
                          <span class="multi-label">Recommended by {{ group.recommendations.length }} faculty members</span>
                          <div class="multi-nav-buttons">
                            @for (r of group.recommendations; track r.recommendationId; let idx = $index) {
                              <button
                                type="button"
                                class="pill-dot"
                                [class.active]="selectedRecIndex(group.bookId) === idx"
                                (click)="selectRecIndex(group.bookId, idx)"
                                [attr.aria-label]="'View recommendation ' + (idx + 1)"
                              ></button>
                            }
                          </div>
                        </div>
                      }

                      <!-- Faculty Member Info Row -->
                      <div class="faculty-author-row">
                        <div class="faculty-avatar">
                          {{ getInitials(rec.facultyName) }}
                        </div>
                        <div class="faculty-names">
                          <strong class="faculty-name">{{ rec.facultyName }}</strong>
                          <span class="faculty-dept">{{ rec.facultyDepartment || 'Faculty Member' }}</span>
                        </div>
                      </div>

                      <!-- Card Actions Footer matching Screen 1 -->
                      <div class="rec-card-footer">
                        <a [routerLink]="['/workspace/books', group.bookId]" class="btn-view-details">
                          View Details
                        </a>
                        <button
                          type="button"
                          class="btn-helpful"
                          [class.is-helpful]="rec.markedHelpful"
                          (click)="toggleHelpful(rec)"
                          [attr.aria-pressed]="rec.markedHelpful"
                        >
                          <svg viewBox="0 0 24 24" [attr.fill]="rec.markedHelpful ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" class="helpful-icon">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                          </svg>
                          <span>Helpful ({{ rec.helpfulCount }})</span>
                        </button>
                      </div>
                    }
                  </article>
                }
              </div>
            }
          </section>
        } @else {
          <!-- TAB 2 / 3: Recommended For You & Popular Books -->
          <section class="section-block">
            <div class="section-title-row">
              <div class="section-heading-wrap">
                <h2 class="section-title">
                  {{ studentTab() === 'for-you' ? 'Recommended for You' : 'Popular Books in Library' }}
                </h2>
                <p class="section-desc">
                  {{ studentTab() === 'for-you'
                    ? 'Handpicked selections matched to your academic disciplines.'
                    : 'The most requested and borrowed titles this semester.' }}
                </p>
              </div>
              <a routerLink="/workspace/books" class="view-all-link">
                Browse Catalogue <span aria-hidden="true">&rarr;</span>
              </a>
            </div>

            @if (loadingCatalogue()) {
              <div class="loading-state" role="status">Loading books…</div>
            } @else if (catalogueBooks().length === 0) {
              <div class="empty-state surface-card">
                <p>No books available to display right now.</p>
              </div>
            } @else {
              <div class="recommendations-grid">
                @for (b of catalogueBooks(); track b.id) {
                  <article class="rec-card surface-card">
                    <div class="rec-card-top">
                      <div class="rec-cover-wrap">
                        @if (b.coverImageUrl && !brokenCovers().has(b.id)) {
                          <img [src]="b.coverImageUrl" [alt]="'Cover of ' + b.title" class="rec-cover" loading="lazy" (error)="markCoverBroken(b.id)">
                        } @else {
                          <div class="rec-cover-fallback" aria-hidden="true">
                            <span>{{ b.title.substring(0, 3).toUpperCase() }}</span>
                          </div>
                        }
                      </div>
                      <div class="rec-book-meta">
                        <h3 class="rec-book-title">
                          <a [routerLink]="['/workspace/books', b.id]">{{ b.title }}</a>
                        </h3>
                        <p class="rec-book-author">{{ b.authors.join(', ') || 'Unknown Author' }}</p>
                        @if (b.categories && b.categories.length > 0) {
                          <span class="preview-category">{{ b.categories[0] }}</span>
                        }
                      </div>
                    </div>
                    <div class="rec-card-footer" style="margin-top: 1.5rem;">
                      <a [routerLink]="['/workspace/books', b.id]" class="btn-view-details">
                        View Details
                      </a>
                      <span class="copies-badge">{{ b.availableCopies }} copies available</span>
                    </div>
                  </article>
                }
              </div>
            }
          </section>
        }
      }

      <!-- ======================================================== -->
      <!-- FACULTY VIEW (Screen 3 in Reference Mockup)             -->
      <!-- ======================================================== -->
      @if (isFaculty()) {
        <!-- Page Header -->
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
              <h1 class="page-title">My Recommendations</h1>
              <p class="page-subtitle">Manage the books you have recommended to students.</p>
            </div>
          </div>
          <div class="header-actions">
            <a routerLink="/workspace/recommendations/new" class="btn-primary-action">
              <span class="btn-plus-icon">+</span> Recommend a Book
            </a>
          </div>
        </header>

        <!-- Segmented Tab Bar matching Screen 3 -->
        <div class="pill-tabs-row" role="tablist" aria-label="Faculty recommendation views">
          <button
            type="button"
            role="tab"
            class="pill-tab-btn"
            [class.active]="facultyTab() === 'mine'"
            [attr.aria-selected]="facultyTab() === 'mine'"
            (click)="facultyTab.set('mine')"
          >
            My Recommendations ({{ myRecommendations().length }})
          </button>
          <button
            type="button"
            role="tab"
            class="pill-tab-btn"
            [class.active]="facultyTab() === 'all'"
            [attr.aria-selected]="facultyTab() === 'all'"
            (click)="facultyTab.set('all')"
          >
            All Faculty Recommendations
          </button>
        </div>

        <!-- TAB 1: MY RECOMMENDATIONS TABLE -->
        @if (facultyTab() === 'mine') {
          @if (loading()) {
            <div class="loading-state" role="status">Loading your recommendations…</div>
          } @else if (error()) {
            <div class="alert alert-error" role="alert">
              {{ error() }}
              <button type="button" class="text-button" (click)="loadFacultyMine()">Retry</button>
            </div>
          } @else if (myRecommendations().length === 0) {
            <div class="empty-state surface-card">
              <div class="empty-icon-circle" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                </svg>
              </div>
              <h3>No recommendations made yet</h3>
              <p>Share your academic expertise by recommending books from the library catalogue to students.</p>
              <a routerLink="/workspace/recommendations/new" class="btn-primary-action" style="margin-top: 1rem;">
                + Recommend a Book
              </a>
            </div>
          } @else {
            <div class="table-card surface-card">
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th scope="col" style="width: 28%;">Book</th>
                      <th scope="col" style="width: 36%;">Recommendation Message</th>
                      <th scope="col" style="width: 14%;">Date</th>
                      <th scope="col" style="width: 12%;">Status</th>
                      <th scope="col" style="width: 10%; text-align: right;">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (rec of myRecommendations(); track rec.id) {
                      <tr>
                        <!-- Book Cell -->
                        <td>
                          <div class="book-cell">
                            <div class="table-thumb-wrap">
                              @if (rec.bookCoverImageUrl && !brokenCovers().has(rec.bookId)) {
                                <img [src]="rec.bookCoverImageUrl" [alt]="'Cover of ' + rec.bookTitle" class="table-thumb" (error)="markCoverBroken(rec.bookId)">
                              } @else {
                                <div class="table-thumb-fallback">
                                  {{ rec.bookTitle.substring(0, 2).toUpperCase() }}
                                </div>
                              }
                            </div>
                            <div class="table-book-info">
                              <a [routerLink]="['/workspace/books', rec.bookId]" class="table-book-title">{{ rec.bookTitle }}</a>
                              <span class="table-book-author">{{ rec.bookAuthors.join(', ') || 'Unknown Author' }}</span>
                            </div>
                          </div>
                        </td>

                        <!-- Message Cell -->
                        <td>
                          <div class="table-message-cell">
                            @if (rec.message) {
                              <p class="table-message-text">{{ rec.message }}</p>
                            } @else {
                              <span class="table-message-empty">No message provided</span>
                            }
                          </div>
                        </td>

                        <!-- Date Cell -->
                        <td>
                          <span class="table-date">{{ formatDate(rec.createdAt) }}</span>
                        </td>

                        <!-- Status Cell -->
                        <td>
                          <span class="status-pill" [class.status-active]="rec.status === 'ACTIVE'" [class.status-withdrawn]="rec.status === 'WITHDRAWN'">
                            <span class="status-dot"></span>
                            {{ rec.status === 'ACTIVE' ? 'Active' : 'Withdrawn' }}
                          </span>
                        </td>

                        <!-- Actions Cell -->
                        <td style="text-align: right;">
                          <div class="row-actions">
                            @if (rec.status === 'ACTIVE') {
                              <button
                                type="button"
                                class="action-icon-btn"
                                title="Edit recommendation message"
                                (click)="openEditModal(rec)"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              <button
                                type="button"
                                class="action-icon-btn action-danger"
                                title="Withdraw recommendation"
                                (click)="confirmWithdraw(rec)"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              </button>
                            } @else {
                              <span class="withdrawn-hint">—</span>
                            }
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        }

        <!-- TAB 2: ALL FACULTY RECOMMENDATIONS -->
        @if (facultyTab() === 'all') {
          @if (loadingAll()) {
            <div class="loading-state" role="status">Loading all recommendations…</div>
          } @else if (allRecommendations().length === 0) {
            <div class="empty-state surface-card">
              <p>No faculty recommendations found.</p>
            </div>
          } @else {
            <div class="table-card surface-card">
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th scope="col" style="width: 26%;">Book</th>
                      <th scope="col" style="width: 20%;">Faculty Member</th>
                      <th scope="col" style="width: 32%;">Recommendation Message</th>
                      <th scope="col" style="width: 12%;">Date</th>
                      <th scope="col" style="width: 10%;">Helpful</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (rec of allRecommendations(); track rec.id) {
                      <tr>
                        <td>
                          <div class="book-cell">
                            <div class="table-thumb-wrap">
                              @if (rec.bookCoverImageUrl && !brokenCovers().has(rec.bookId)) {
                                <img [src]="rec.bookCoverImageUrl" [alt]="'Cover of ' + rec.bookTitle" class="table-thumb" (error)="markCoverBroken(rec.bookId)">
                              } @else {
                                <div class="table-thumb-fallback">
                                  {{ rec.bookTitle.substring(0, 2).toUpperCase() }}
                                </div>
                              }
                            </div>
                            <div class="table-book-info">
                              <a [routerLink]="['/workspace/books', rec.bookId]" class="table-book-title">{{ rec.bookTitle }}</a>
                              <span class="table-book-author">{{ rec.bookAuthors.join(', ') || 'Unknown Author' }}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div class="faculty-compact">
                            <strong class="faculty-name-compact">{{ rec.facultyName }}</strong>
                            <span class="faculty-dept-compact">{{ rec.facultyDepartment || 'Faculty' }}</span>
                          </div>
                        </td>
                        <td>
                          <div class="table-message-cell">
                            @if (rec.message) {
                              <p class="table-message-text">{{ rec.message }}</p>
                            } @else {
                              <span class="table-message-empty">No message provided</span>
                            }
                          </div>
                        </td>
                        <td>
                          <span class="table-date">{{ formatDate(rec.createdAt) }}</span>
                        </td>
                        <td>
                          <span class="helpful-badge">
                            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="badge-icon">
                              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                            </svg>
                            {{ rec.helpfulCount }}
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        }
      }

      <!-- ======================================================== -->
      <!-- LIBRARIAN VIEW (Read-Only All Recommendations)           -->
      <!-- ======================================================== -->
      @if (isLibrarian()) {
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
              <h1 class="page-title">Faculty Book Recommendations</h1>
              <p class="page-subtitle">View and audit all recommendations made by faculty members.</p>
            </div>
          </div>
        </header>

        @if (loadingAll()) {
          <div class="loading-state" role="status">Loading faculty recommendations…</div>
        } @else if (allRecommendations().length === 0) {
          <div class="empty-state surface-card">
            <p>No faculty recommendations have been created yet.</p>
          </div>
        } @else {
          <div class="table-card surface-card">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th scope="col" style="width: 26%;">Book</th>
                    <th scope="col" style="width: 20%;">Faculty Member</th>
                    <th scope="col" style="width: 30%;">Recommendation Message</th>
                    <th scope="col" style="width: 12%;">Date</th>
                    <th scope="col" style="width: 12%;">Helpful Reactions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (rec of allRecommendations(); track rec.id) {
                    <tr>
                      <td>
                        <div class="book-cell">
                          <div class="table-thumb-wrap">
                            @if (rec.bookCoverImageUrl && !brokenCovers().has(rec.bookId)) {
                              <img [src]="rec.bookCoverImageUrl" [alt]="'Cover of ' + rec.bookTitle" class="table-thumb" (error)="markCoverBroken(rec.bookId)">
                            } @else {
                              <div class="table-thumb-fallback">
                                {{ rec.bookTitle.substring(0, 2).toUpperCase() }}
                              </div>
                            }
                          </div>
                          <div class="table-book-info">
                            <a [routerLink]="['/workspace/books', rec.bookId]" class="table-book-title">{{ rec.bookTitle }}</a>
                            <span class="table-book-author">{{ rec.bookAuthors.join(', ') || 'Unknown Author' }}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="faculty-compact">
                          <strong class="faculty-name-compact">{{ rec.facultyName }}</strong>
                          <span class="faculty-dept-compact">{{ rec.facultyDepartment || 'Faculty' }}</span>
                        </div>
                      </td>
                      <td>
                        <div class="table-message-cell">
                          @if (rec.message) {
                            <p class="table-message-text">{{ rec.message }}</p>
                          } @else {
                            <span class="table-message-empty">No message provided</span>
                          }
                        </div>
                      </td>
                      <td>
                        <span class="table-date">{{ formatDate(rec.createdAt) }}</span>
                      </td>
                      <td>
                        <span class="helpful-badge">
                          <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="badge-icon">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                          </svg>
                          {{ rec.helpfulCount }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      }

      <!-- ======================================================== -->
      <!-- EDIT RECOMMENDATION MESSAGE MODAL                       -->
      <!-- ======================================================== -->
      @if (editingRec()) {
        <div class="modal-backdrop" (click)="closeEditModal()">
          <div class="modal-card surface-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="edit-dialog-title">
            <div class="modal-header">
              <h2 id="edit-dialog-title" class="modal-title">Edit Recommendation</h2>
              <button type="button" class="close-btn" (click)="closeEditModal()" aria-label="Close dialog">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <p class="edit-book-label">Book: <strong>{{ editingRec()?.bookTitle }}</strong></p>

            <div class="form-group">
              <label for="edit-msg" class="field-label">
                Recommendation Message <span class="muted-label">(Optional)</span>
              </label>
              <textarea
                id="edit-msg"
                [(ngModel)]="editMessage"
                maxlength="300"
                rows="4"
                class="form-textarea"
                placeholder="Share why you recommend this book to students..."
                [disabled]="modalPending()"
              ></textarea>
              <div class="char-counter" [class.near-limit]="editMessage.length >= 280">
                {{ editMessage.length }} / 300
              </div>
            </div>

            @if (editError()) {
              <div class="alert alert-error" role="alert">{{ editError() }}</div>
            }

            <div class="modal-actions">
              <button type="button" class="btn-cancel" (click)="closeEditModal()" [disabled]="modalPending()">Cancel</button>
              <button type="button" class="btn-submit" (click)="submitEdit()" [disabled]="modalPending()">
                {{ modalPending() ? 'Saving…' : 'Save Changes' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ======================================================== -->
      <!-- WITHDRAW CONFIRMATION MODAL                             -->
      <!-- ======================================================== -->
      @if (withdrawingRec()) {
        <div class="modal-backdrop" (click)="cancelWithdraw()">
          <div class="modal-card surface-card" (click)="$event.stopPropagation()" role="alertdialog" aria-modal="true" aria-labelledby="withdraw-title">
            <div class="modal-header">
              <h2 id="withdraw-title" class="modal-title" style="color: var(--color-error, #b91c1c);">Withdraw Recommendation</h2>
              <button type="button" class="close-btn" (click)="cancelWithdraw()" aria-label="Close dialog">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <p class="modal-text">
              Are you sure you want to withdraw your recommendation for <strong>{{ withdrawingRec()?.bookTitle }}</strong>?
              Students will no longer see this recommendation in their curated feed or catalogue badges.
            </p>

            @if (withdrawError()) {
              <div class="alert alert-error" role="alert">{{ withdrawError() }}</div>
            }

            <div class="modal-actions">
              <button type="button" class="btn-cancel" (click)="cancelWithdraw()" [disabled]="modalPending()">Cancel</button>
              <button type="button" class="btn-danger-action" (click)="submitWithdraw()" [disabled]="modalPending()">
                {{ modalPending() ? 'Withdrawing…' : 'Withdraw Recommendation' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .recommendations-container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 1.5rem 2rem 3rem;
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .header-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: var(--color-primary-soft, #EAF2EF);
      color: var(--color-primary, #003D30);
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
      font-family: var(--font-serif, 'Playfair Display', Georgia, serif);
      font-size: var(--type-page-title-size, 1.6875rem);
      font-weight: var(--type-page-title-weight, 600);
      line-height: var(--type-page-title-line-height, 1.25);
      color: var(--color-charcoal-900, #1F2421);
      margin: 0;
    }

    .page-subtitle {
      font-size: var(--type-page-subtitle-size, 0.84375rem);
      color: var(--color-charcoal-600, #5A625D);
      margin: 0.25rem 0 0;
    }

    .btn-primary-action {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--color-primary, #003D30);
      color: #ffffff;
      padding: 0.625rem 1.25rem;
      border-radius: 8px;
      font-size: var(--type-button-size, 0.84375rem);
      font-weight: 600;
      text-decoration: none;
      transition: background 0.15s ease, transform 0.1s ease;

      &:hover {
        background: var(--color-primary-hover, #002B22);
      }

      .btn-plus-icon {
        font-size: 1.1rem;
        line-height: 1;
      }
    }

    /* Pill Tabs Row matching Mockup */
    .pill-tabs-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--color-line-200, #E5E0D5);
      padding-bottom: 0.75rem;
      overflow-x: auto;
    }

    .pill-tab-btn {
      background: transparent;
      border: 1px solid transparent;
      padding: 0.5rem 1.125rem;
      border-radius: 9999px;
      font-size: var(--type-button-size, 0.84375rem);
      font-weight: 500;
      color: var(--color-charcoal-600, #5A625D);
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;

      &:hover {
        background: var(--color-bg-canvas, #FDFCF9);
        color: var(--color-charcoal-900, #1F2421);
      }

      &.active {
        background: var(--color-primary, #003D30);
        color: #ffffff;
        font-weight: 600;
      }
    }

    /* Section block */
    .section-block {
      margin-top: 1rem;
    }

    .section-title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .section-heading-wrap {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .faculty-cap-icon {
      font-size: 1.25rem;
      color: var(--color-primary, #003D30);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--color-primary-soft, #EAF2EF);

      svg {
        width: 18px;
        height: 18px;
      }
    }

    .section-title {
      font-family: var(--font-sans, -apple-system, sans-serif);
      font-size: var(--type-section-heading-size, 1.25rem);
      font-weight: 600;
      color: var(--color-charcoal-900, #1F2421);
      margin: 0;
    }

    .section-desc {
      font-size: var(--type-description-size, 0.84375rem);
      color: var(--color-charcoal-600, #5A625D);
      margin: 0.2rem 0 0;
    }

    .view-all-link {
      font-size: var(--type-button-size, 0.84375rem);
      font-weight: 600;
      color: var(--color-primary, #003D30);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;

      &:hover {
        text-decoration: underline;
      }
    }

    /* Cards Grid matching Screen 1 */
    .recommendations-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }

    .rec-card {
      background: var(--color-surface, #ffffff);
      border: 1px solid var(--color-line-200, #E5E0D5);
      border-radius: 14px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      transition: box-shadow 0.2s ease, transform 0.15s ease;

      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }
    }

    .rec-card-top {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }

    .rec-cover-wrap {
      width: 82px;
      height: 116px;
      border-radius: 6px;
      overflow: hidden;
      flex-shrink: 0;
      background: var(--color-bg-canvas, #FDFCF9);
      border: 1px solid var(--color-line-100, #EFECE6);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .rec-cover {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .rec-cover-fallback {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1f2e2b 0%, #003D30 100%);
      color: #ffffff;
      font-weight: 700;
      font-size: 0.875rem;
      letter-spacing: 0.05em;
    }

    .rec-book-meta {
      flex: 1;
      min-width: 0;
    }

    .rec-header-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .rec-book-title {
      font-size: var(--type-card-heading-size, 1.0625rem);
      font-weight: 600;
      margin: 0;
      line-height: 1.3;

      a {
        color: var(--color-charcoal-900, #1F2421);
        text-decoration: none;

        &:hover {
          color: var(--color-primary, #003D30);
          text-decoration: underline;
        }
      }
    }

    .bookmark-btn {
      background: transparent;
      border: none;
      color: var(--color-charcoal-500, #737C76);
      cursor: pointer;
      padding: 0.2rem;
      border-radius: 4px;
      transition: color 0.15s ease;

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover, &.is-bookmarked {
        color: var(--color-primary, #003D30);
      }
    }

    .rec-book-author {
      font-size: var(--type-description-size, 0.84375rem);
      color: var(--color-charcoal-600, #5A625D);
      margin: 0.25rem 0 0.5rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rec-rating-row {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8125rem;
    }

    .rating-star {
      color: #f59e0b;
    }

    .rating-star.empty {
      color: var(--color-charcoal-400, #9CA3AF);
    }

    .rating-score {
      color: var(--color-charcoal-900, #1F2421);
    }

    .rec-rating-row.no-reviews .rating-score {
      color: var(--color-charcoal-500, #737C76);
    }

    .rating-count {
      color: var(--color-charcoal-500, #737C76);
    }

    /* Quote Bubble matching Screen 1 */
    .quote-bubble {
      margin-top: 1rem;
      background: #F4F8F6;
      border: 1px solid #D6E6DF;
      border-radius: 10px;
      padding: 0.75rem 1rem;
      position: relative;
    }

    .quote-mark {
      color: var(--color-primary, #003D30);
      font-family: Georgia, serif;
      font-size: 1.4rem;
      line-height: 1;
      margin-right: 0.25rem;
      vertical-align: -0.2rem;
    }

    .quote-text {
      margin: 0;
      font-size: 0.8125rem;
      line-height: 1.45;
      color: var(--color-charcoal-900, #1F2421);
      display: inline;
      font-style: normal;
    }

    .multi-recs-indicator {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.5rem;
      padding: 0 0.25rem;
    }

    .multi-label {
      font-size: 0.75rem;
      color: var(--color-charcoal-500, #737C76);
    }

    .multi-nav-buttons {
      display: flex;
      gap: 0.35rem;
    }

    .pill-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      border: none;
      background: var(--color-line-300, #D8D2C4);
      cursor: pointer;
      padding: 0;
      transition: background 0.15s ease;

      &.active {
        background: var(--color-primary, #003D30);
        width: 14px;
        border-radius: 4px;
      }
    }

    /* Faculty Author Row */
    .faculty-author-row {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      margin-top: 0.875rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--color-line-100, #EFECE6);
    }

    .faculty-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--color-primary, #003D30);
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .faculty-names {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .faculty-name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-charcoal-900, #1F2421);
    }

    .faculty-dept {
      font-size: 0.71875rem;
      color: var(--color-charcoal-500, #737C76);
    }

    /* Rec Card Footer */
    .rec-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--color-line-100, #EFECE6);
    }

    .btn-view-details {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-primary, #003D30);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    .btn-helpful {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: transparent;
      border: 1px solid var(--color-line-200, #E5E0D5);
      border-radius: 6px;
      padding: 0.35rem 0.625rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-charcoal-600, #5A625D);
      cursor: pointer;
      transition: all 0.15s ease;

      .helpful-icon {
        width: 14px;
        height: 14px;
      }

      &:hover {
        background: var(--color-bg-canvas, #FDFCF9);
        border-color: var(--color-primary-border, #C2D6CF);
      }

      &.is-helpful {
        background: var(--color-primary-soft, #EAF2EF);
        border-color: var(--color-primary-border, #C2D6CF);
        color: var(--color-primary, #003D30);
        font-weight: 600;
      }
    }

    .preview-category {
      display: inline-block;
      margin-top: 0.35rem;
      font-size: 0.71875rem;
      font-weight: 500;
      background: var(--color-primary-soft, #EAF2EF);
      color: var(--color-primary, #003D30);
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
    }

    .copies-badge {
      font-size: 0.75rem;
      color: var(--color-charcoal-600, #5A625D);
    }

    /* Data Table Styling matching Mockup Screen 3 */
    .table-card {
      background: var(--color-surface, #ffffff);
      border: 1px solid var(--color-line-200, #E5E0D5);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .table-responsive {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;

      th {
        background: #F4F8F6;
        padding: 0.875rem 1.25rem;
        font-size: var(--type-table-th-size, 0.75rem);
        font-weight: var(--type-table-th-weight, 600);
        color: var(--color-charcoal-900, #1F2421);
        border-bottom: 1px solid var(--color-line-200, #E5E0D5);
        white-space: nowrap;
      }

      td {
        padding: 1rem 1.25rem;
        font-size: var(--type-table-td-size, 0.84375rem);
        color: var(--color-charcoal-900, #1F2421);
        border-bottom: 1px solid var(--color-line-100, #EFECE6);
        vertical-align: middle;
      }

      tbody tr:last-child td {
        border-bottom: none;
      }

      tbody tr:hover {
        background: #FCFBF9;
      }
    }

    .book-cell {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }

    .table-thumb-wrap {
      width: 44px;
      height: 60px;
      border-radius: 4px;
      overflow: hidden;
      flex-shrink: 0;
      background: var(--color-bg-canvas, #FDFCF9);
      border: 1px solid var(--color-line-100, #EFECE6);
    }

    .table-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .table-thumb-fallback {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-primary-soft, #EAF2EF);
      color: var(--color-primary, #003D30);
      font-weight: 700;
      font-size: 0.75rem;
    }

    .table-book-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .table-book-title {
      font-weight: 600;
      color: var(--color-charcoal-900, #1F2421);
      text-decoration: none;
      line-height: 1.3;

      &:hover {
        color: var(--color-primary, #003D30);
        text-decoration: underline;
      }
    }

    .table-book-author {
      font-size: 0.75rem;
      color: var(--color-charcoal-600, #5A625D);
      margin-top: 0.15rem;
    }

    .table-message-cell {
      max-width: 420px;
    }

    .table-message-text {
      margin: 0;
      font-size: 0.84375rem;
      line-height: 1.45;
      color: var(--color-charcoal-600, #5A625D);
    }

    .table-message-empty {
      font-style: italic;
      color: var(--color-charcoal-500, #737C76);
      font-size: 0.8125rem;
    }

    .table-date {
      font-size: 0.8125rem;
      color: var(--color-charcoal-600, #5A625D);
      white-space: nowrap;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      font-size: var(--type-badge-size, 0.75rem);
      font-weight: 600;
    }

    .status-active {
      background: var(--color-primary-soft, #EAF2EF);
      color: var(--color-primary, #003D30);
    }

    .status-withdrawn {
      background: #F1F0EC;
      color: var(--color-charcoal-500, #737C76);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .row-actions {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
    }

    .action-icon-btn {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: transparent;
      border: 1px solid transparent;
      color: var(--color-charcoal-600, #5A625D);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;

      svg {
        width: 16px;
        height: 16px;
      }

      &:hover {
        background: var(--color-bg-canvas, #FDFCF9);
        border-color: var(--color-line-200, #E5E0D5);
        color: var(--color-charcoal-900, #1F2421);
      }

      &.action-danger:hover {
        background: #FEE2E2;
        border-color: #FECACA;
        color: #991B1B;
      }
    }

    .withdrawn-hint {
      color: var(--color-charcoal-500, #737C76);
    }

    .faculty-compact {
      display: flex;
      flex-direction: column;
    }

    .faculty-name-compact {
      font-size: 0.84375rem;
      color: var(--color-charcoal-900, #1F2421);
    }

    .faculty-dept-compact {
      font-size: 0.71875rem;
      color: var(--color-charcoal-500, #737C76);
    }

    .helpful-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.8125rem;
      color: var(--color-primary, #003D30);
      font-weight: 600;

      .badge-icon {
        width: 14px;
        height: 14px;
      }
    }

    /* Modal Backdrop and Cards */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 20, 0.45);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-card {
      background: #ffffff;
      border-radius: 12px;
      width: 100%;
      max-width: 480px;
      padding: 1.5rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      border: 1px solid var(--color-line-200, #E5E0D5);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .modal-title {
      font-size: var(--type-modal-title-size, 1.1875rem);
      font-weight: 600;
      margin: 0;
      color: var(--color-charcoal-900, #1F2421);
    }

    .close-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--color-charcoal-500, #737C76);
      padding: 0.25rem;

      svg {
        width: 20px;
        height: 20px;
      }

      &:hover {
        color: var(--color-charcoal-900, #1F2421);
      }
    }

    .edit-book-label {
      font-size: 0.875rem;
      color: var(--color-charcoal-600, #5A625D);
      margin: 0 0 1rem;

      strong {
        color: var(--color-charcoal-900, #1F2421);
      }
    }

    .modal-text {
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--color-charcoal-600, #5A625D);
      margin: 0 0 1.25rem;

      strong {
        color: var(--color-charcoal-900, #1F2421);
      }
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .field-label {
      display: block;
      font-size: var(--type-form-label-size, 0.84375rem);
      font-weight: 600;
      color: var(--color-charcoal-900, #1F2421);
      margin-bottom: 0.375rem;
    }

    .muted-label {
      font-weight: 400;
      color: var(--color-charcoal-500, #737C76);
    }

    .form-textarea {
      width: 100%;
      border: 1px solid var(--color-line-300, #D8D2C4);
      border-radius: 8px;
      padding: 0.625rem 0.75rem;
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
      margin-top: 0.25rem;

      &.near-limit {
        color: #d97706;
      }
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }

    .btn-cancel {
      background: transparent;
      border: 1px solid var(--color-line-200, #E5E0D5);
      border-radius: 8px;
      padding: 0.5rem 1rem;
      font-size: 0.84375rem;
      font-weight: 500;
      color: var(--color-charcoal-600, #5A625D);
      cursor: pointer;

      &:hover {
        background: var(--color-bg-canvas, #FDFCF9);
      }
    }

    .btn-submit {
      background: var(--color-primary, #003D30);
      border: none;
      border-radius: 8px;
      padding: 0.5rem 1.25rem;
      font-size: 0.84375rem;
      font-weight: 600;
      color: #ffffff;
      cursor: pointer;

      &:hover {
        background: var(--color-primary-hover, #002B22);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .btn-danger-action {
      background: #dc2626;
      border: none;
      border-radius: 8px;
      padding: 0.5rem 1.25rem;
      font-size: 0.84375rem;
      font-weight: 600;
      color: #ffffff;
      cursor: pointer;

      &:hover {
        background: #b91c1c;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    /* Shared alert / loading / empty */
    .loading-state {
      padding: 2.5rem;
      text-align: center;
      color: var(--color-charcoal-600, #5A625D);
      font-size: 0.875rem;
    }

    .empty-state {
      padding: 3rem 2rem;
      text-align: center;
      border-radius: 12px;
      border: 1px solid var(--color-line-200, #E5E0D5);

      h3 {
        margin: 0.75rem 0 0.35rem;
        font-size: 1.125rem;
        color: var(--color-charcoal-900, #1F2421);
      }

      p {
        margin: 0;
        font-size: 0.875rem;
        color: var(--color-charcoal-600, #5A625D);
      }
    }

    .empty-icon-circle {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--color-primary-soft, #EAF2EF);
      color: var(--color-primary, #003D30);
      display: inline-flex;
      align-items: center;
      justify-content: center;

      svg {
        width: 24px;
        height: 24px;
      }
    }

    .alert-error {
      background: #FEE2E2;
      border: 1px solid #FECACA;
      color: #991B1B;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      font-size: 0.84375rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .text-button {
      background: transparent;
      border: none;
      color: inherit;
      text-decoration: underline;
      cursor: pointer;
      font-weight: 600;
    }
  `]
})
export class BookRecommendationsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly recService = inject(RecommendationService);
  private readonly catalogueService = inject(CatalogueService);
  private readonly reviewService = inject(ReviewService);
  readonly wishlistService = inject(WishlistService);

  readonly isStudent = computed(() => this.auth.profile()?.role === 'STUDENT');
  readonly isFaculty = computed(() => this.auth.profile()?.role === 'FACULTY');
  readonly isLibrarian = computed(() => this.auth.profile()?.role === 'LIBRARIAN');

  // Student view state
  readonly studentTab = signal<'for-you' | 'faculty' | 'popular'>('faculty');
  readonly facultyGroups = signal<FacultyRecommendationGroup[]>([]);
  readonly activeRecIndices = signal<Record<string, number>>({});
  readonly bookmarkedIds = signal<Set<string>>(new Set());
  readonly reviewSummaries = signal<Map<string, ReviewSummary>>(new Map());
  readonly catalogueBooks = signal<BookSummary[]>([]);
  readonly loadingCatalogue = signal(false);

  // Faculty view state
  readonly facultyTab = signal<'mine' | 'all'>('mine');
  readonly myRecommendations = signal<Recommendation[]>([]);

  // All recommendations state (shared for faculty tab 2 & librarian)
  readonly allRecommendations = signal<Recommendation[]>([]);
  readonly loadingAll = signal(false);

  // General loading & error
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly brokenCovers = signal<Set<string>>(new Set());

  // Edit message modal state
  readonly editingRec = signal<Recommendation | null>(null);
  editMessage = '';
  readonly editError = signal<string | null>(null);

  // Withdraw dialog state
  readonly withdrawingRec = signal<Recommendation | null>(null);
  readonly withdrawError = signal<string | null>(null);

  readonly modalPending = signal(false);

  ngOnInit(): void {
    if (this.isStudent()) {
      this.loadStudentFeed();
    } else if (this.isFaculty()) {
      this.loadFacultyMine();
      this.loadAllRecommendations();
    } else if (this.isLibrarian()) {
      this.loadAllRecommendations();
    }
  }

  setStudentTab(tab: 'for-you' | 'faculty' | 'popular'): void {
    this.studentTab.set(tab);
    if (tab === 'for-you' || tab === 'popular') {
      if (this.catalogueBooks().length === 0) {
        this.loadCatalogueBooks();
      }
    }
  }

  loadStudentFeed(): void {
    this.loading.set(true);
    this.error.set(null);
    this.recService.getFacultyRecommendationsForStudents()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (groups) => {
          this.facultyGroups.set(groups);
          const bookIds = groups.map((g) => g.bookId).filter(Boolean);
          if (bookIds.length > 0) {
            this.reviewService.getBatchSummaries(bookIds).subscribe({
              next: (summaries) => {
                const map = new Map(this.reviewSummaries());
                summaries.forEach((s) => {
                  if (s.bookId) map.set(s.bookId, s);
                });
                this.reviewSummaries.set(map);
              }
            });
            this.wishlistService.checkStatus(bookIds).subscribe();
          }
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Could not load faculty recommendations.');
        }
      });
  }

  loadCatalogueBooks(): void {
    this.loadingCatalogue.set(true);
    this.catalogueService.search({}, 0)
      .pipe(finalize(() => this.loadingCatalogue.set(false)))
      .subscribe({
        next: (page) => {
          this.catalogueBooks.set(page.content);
          const bookIds = page.content.map((b) => b.id).filter(Boolean);
          if (bookIds.length > 0) {
            this.reviewService.getBatchSummaries(bookIds).subscribe({
              next: (summaries) => {
                const map = new Map(this.reviewSummaries());
                summaries.forEach((s) => {
                  if (s.bookId) map.set(s.bookId, s);
                });
                this.reviewSummaries.set(map);
              }
            });
            this.wishlistService.checkStatus(bookIds).subscribe();
          }
        },
        error: () => {}
      });
  }

  loadFacultyMine(): void {
    this.loading.set(true);
    this.error.set(null);
    this.recService.getMyRecommendations()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (recs) => {
          this.myRecommendations.set(recs);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Could not load your recommendations.');
        }
      });
  }

  loadAllRecommendations(): void {
    this.loadingAll.set(true);
    this.recService.getAllFacultyRecommendations()
      .pipe(finalize(() => this.loadingAll.set(false)))
      .subscribe({
        next: (recs) => {
          this.allRecommendations.set(recs);
        },
        error: () => {}
      });
  }

  // Active recommendation switcher for grouped book cards
  selectedRecIndex(bookId: string): number {
    return this.activeRecIndices()[bookId] || 0;
  }

  selectRecIndex(bookId: string, index: number): void {
    this.activeRecIndices.update((current) => ({
      ...current,
      [bookId]: index
    }));
  }

  getActiveRecommendation(group: FacultyRecommendationGroup): FacultyRecommendationItem | null {
    if (!group.recommendations || group.recommendations.length === 0) return null;
    const index = this.selectedRecIndex(group.bookId);
    return group.recommendations[index] || group.recommendations[0];
  }

  toggleHelpful(rec: FacultyRecommendationItem): void {
    if (!this.isStudent()) return;

    if (rec.markedHelpful) {
      this.recService.removeHelpful(rec.recommendationId).subscribe({
        next: (res) => {
          rec.helpfulCount = res.helpfulCount;
          rec.markedHelpful = res.markedHelpful;
        }
      });
    } else {
      this.recService.markHelpful(rec.recommendationId).subscribe({
        next: (res) => {
          rec.helpfulCount = res.helpfulCount;
          rec.markedHelpful = res.markedHelpful;
        }
      });
    }
  }

  toggleBookmark(bookId: string): void {
    this.wishlistService.toggleWishlist(bookId).subscribe();
  }

  getAverageRating(bookId: string): string {
    const s = this.reviewSummaries().get(bookId);
    if (!s || s.totalReviews === 0 || s.averageRating == null) {
      return '0';
    }
    return s.averageRating.toFixed(1);
  }

  getReviewCount(bookId: string): number {
    const s = this.reviewSummaries().get(bookId);
    return s ? s.totalReviews : 0;
  }

  hasReviews(bookId: string): boolean {
    const s = this.reviewSummaries().get(bookId);
    return !!(s && s.totalReviews > 0);
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

  // Edit modal
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

  // Withdraw modal
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
