import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { BookReview, ReviewService } from './review.service';

export interface ReviewModalBook {
  id: string;
  title: string;
  authors: string[];
  coverImageUrl?: string | null;
}

@Component({
  selector: 'app-write-review-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="dismiss()">
      <div class="modal-card surface-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="review-modal-title">
        <!-- Modal Header -->
        <div class="modal-header">
          <div class="title-wrap">
            <h2 id="review-modal-title" class="modal-title">Write a Review</h2>
            <p class="modal-subtitle">Share your reading thoughts and ratings with fellow library members.</p>
          </div>
          <button type="button" class="close-btn" (click)="dismiss()" aria-label="Close dialog">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Book Preview Card -->
        @if (book) {
          <div class="book-preview-card">
            <div class="preview-cover-wrap">
              @if (book.coverImageUrl && !coverBroken()) {
                <img [src]="book.coverImageUrl" [alt]="'Cover of ' + book.title" class="preview-cover" (error)="coverBroken.set(true)">
              } @else {
                <div class="preview-cover-fallback" aria-hidden="true">
                  <span>{{ book.title.substring(0, 3).toUpperCase() }}</span>
                </div>
              }
            </div>
            <div class="preview-info">
              <h3 class="preview-title">{{ book.title }}</h3>
              <p class="preview-author">{{ book.authors.join(', ') || 'Unknown Author' }}</p>
            </div>
          </div>
        }

        <!-- Star Rating Selector -->
        <div class="form-group rating-group">
          <label class="field-label">
            Rating <span class="required-mark">*</span>
          </label>
          <div class="star-rating-selector" (mouseleave)="hoverRating.set(0)" role="radiogroup" aria-label="Book Rating">
            @for (star of [1, 2, 3, 4, 5]; track star) {
              <button
                type="button"
                class="star-button"
                [class.filled]="(hoverRating() || selectedRating()) >= star"
                (mouseenter)="hoverRating.set(star)"
                (click)="setRating(star)"
                [attr.aria-label]="star + ' star' + (star > 1 ? 's' : '')"
                [attr.aria-checked]="selectedRating() === star"
                role="radio"
              >
                ★
              </button>
            }
          </div>
          <div class="rating-descriptor">
            @if (selectedRating() > 0) {
              <span class="selected-text">{{ ratingLabel(hoverRating() || selectedRating()) }}</span>
            } @else {
              <span class="hint-text">Select a rating from 1 to 5 stars</span>
            }
          </div>
          @if (ratingError()) {
            <p class="field-error">{{ ratingError() }}</p>
          }
        </div>

        <!-- Review Comment Textarea -->
        <div class="form-group">
          <label for="review-comment" class="field-label">
            Your Review <span class="required-mark">*</span>
          </label>
          <textarea
            id="review-comment"
            [(ngModel)]="comment"
            maxlength="1000"
            rows="4"
            class="form-textarea"
            placeholder="Share your experience with this book..."
            [disabled]="pending()"
          ></textarea>
          <div class="char-counter" [class.near-limit]="comment.length >= 950">
            {{ comment.length }} / 1000
          </div>
          @if (commentError()) {
            <p class="field-error">{{ commentError() }}</p>
          }
        </div>

        @if (error()) {
          <div class="alert alert-error" role="alert">
            {{ error() }}
          </div>
        }

        <!-- Actions -->
        <div class="modal-actions">
          <button type="button" class="button button-secondary" (click)="dismiss()" [disabled]="pending()">
            Cancel
          </button>
          <button
            type="button"
            class="button button-primary btn-submit"
            (click)="submit()"
            [disabled]="pending() || selectedRating() === 0 || !comment.trim()"
          >
            <span>{{ pending() ? 'Submitting…' : 'Submit Review' }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(4px);
      display: grid;
      place-items: center;
      z-index: 1000;
      padding: 1.5rem;
    }
    .modal-card {
      width: 100%;
      max-width: 32rem;
      border-radius: 16px;
      padding: 1.75rem;
      background: #ffffff;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      animation: modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.96) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.25rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--color-line-200);
    }
    .modal-title {
      font-family: var(--font-serif);
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--color-forest-950);
      margin: 0 0 0.25rem;
    }
    .modal-subtitle {
      font-size: 0.8125rem;
      color: var(--color-charcoal-500);
      margin: 0;
    }
    .close-btn {
      background: transparent;
      border: none;
      color: var(--color-charcoal-400);
      cursor: pointer;
      padding: 0.4rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
    }
    .close-btn:hover {
      background: var(--color-forest-50);
      color: var(--color-forest-900);
    }
    .close-btn svg {
      width: 20px;
      height: 20px;
    }
    .book-preview-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: #F8FAF9;
      border: 1px solid var(--color-line-200);
      border-radius: 12px;
      padding: 0.875rem 1rem;
      margin-bottom: 1.25rem;
    }
    .preview-cover-wrap {
      width: 44px;
      height: 60px;
      flex-shrink: 0;
      border-radius: 6px;
      overflow: hidden;
      background: #E2E8F0;
      border: 1px solid var(--color-line-200);
    }
    .preview-cover {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .preview-cover-fallback {
      width: 100%;
      height: 100%;
      background: #003D30;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.75rem;
    }
    .preview-info {
      flex: 1;
      min-width: 0;
    }
    .preview-title {
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--color-charcoal-900);
      margin: 0 0 0.2rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .preview-author {
      font-size: 0.8125rem;
      color: var(--color-charcoal-500);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .form-group {
      margin-bottom: 1.25rem;
    }
    .rating-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .field-label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-charcoal-800);
      margin-bottom: 0.35rem;
    }
    .required-mark {
      color: #DC2626;
    }
    .muted-label {
      font-weight: 400;
      color: var(--color-charcoal-500);
    }
    .star-rating-selector {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .star-button {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.85rem;
      line-height: 1;
      padding: 0.15rem;
      color: #D1D5DB;
      transition: color 0.15s, transform 0.15s;
    }
    .star-button:hover,
    .star-button.filled {
      color: #F59E0B;
    }
    .star-button:active {
      transform: scale(1.15);
    }
    .rating-descriptor {
      font-size: 0.8125rem;
      margin-top: 0.2rem;
    }
    .selected-text {
      font-weight: 600;
      color: #B45309;
    }
    .hint-text {
      color: var(--color-charcoal-400);
    }
    .form-textarea {
      width: 100%;
      border: 1px solid var(--color-line-200);
      border-radius: 8px;
      padding: 0.75rem;
      font-family: inherit;
      font-size: 0.875rem;
      color: var(--color-charcoal-900);
      background: #ffffff;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      resize: vertical;
      box-sizing: border-box;
    }
    .form-textarea:focus {
      border-color: #003D30;
      box-shadow: 0 0 0 3px rgba(0, 61, 48, 0.12);
    }
    .char-counter {
      text-align: right;
      font-size: 0.75rem;
      color: var(--color-charcoal-400);
      margin-top: 0.35rem;
    }
    .char-counter.near-limit {
      color: #DC2626;
      font-weight: 600;
    }
    .field-error {
      color: #DC2626;
      font-size: 0.75rem;
      margin-top: 0.35rem;
    }
    .alert-error {
      background: #FEE2E2;
      border: 1px solid #FCA5A5;
      color: #991B1B;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.8125rem;
      margin-bottom: 1.25rem;
    }
    .modal-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--color-line-200);
    }
    .btn-submit {
      background: #003D30;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 0.6rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-submit:hover:not(:disabled) {
      background: #002B22;
    }
    .btn-submit:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
  `]
})
export class WriteReviewModalComponent {
  private readonly reviewService = inject(ReviewService);

  @Input() book!: ReviewModalBook;
  @Output() dismissed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<BookReview>();

  readonly selectedRating = signal<number>(0);
  readonly hoverRating = signal<number>(0);
  readonly coverBroken = signal<boolean>(false);
  readonly pending = signal<boolean>(false);
  readonly error = signal<string>('');
  readonly ratingError = signal<string>('');
  readonly commentError = signal<string>('');

  comment = '';

  setRating(rating: number): void {
    this.selectedRating.set(rating);
    this.ratingError.set('');
  }

  ratingLabel(stars: number): string {
    switch (stars) {
      case 1: return '1 of 5 stars — Poor';
      case 2: return '2 of 5 stars — Fair';
      case 3: return '3 of 5 stars — Good';
      case 4: return '4 of 5 stars — Very Good';
      case 5: return '5 of 5 stars — Excellent';
      default: return '';
    }
  }

  dismiss(): void {
    if (!this.pending()) {
      this.dismissed.emit();
    }
  }

  submit(): void {
    this.error.set('');
    this.ratingError.set('');
    this.commentError.set('');

    const rating = this.selectedRating();
    if (rating < 1 || rating > 5) {
      this.ratingError.set('Please select a star rating (1 to 5 stars).');
      return;
    }

    const trimmedComment = this.comment.trim();
    if (!trimmedComment) {
      if (this.comment.length > 0) {
        this.commentError.set('Review comment cannot be blank or whitespace only.');
      } else {
        this.commentError.set('Review comment is mandatory.');
      }
      return;
    }

    if (trimmedComment.length > 1000) {
      this.commentError.set('Review comment cannot exceed 1000 characters.');
      return;
    }

    this.pending.set(true);
    this.reviewService.submitReview(this.book.id, {
      rating,
      comment: trimmedComment
    }).pipe(
      finalize(() => this.pending.set(false))
    ).subscribe({
      next: (review) => {
        this.submitted.emit(review);
      },
      error: (err) => {
        if (err instanceof HttpErrorResponse) {
          if (err.status === 409) {
            this.error.set('You have already submitted a review for this book.');
          } else if (err.status === 403) {
            this.error.set(err.error?.message || 'You can review this book after borrowing it or accessing its digital edition.');
          } else if (err.error?.message) {
            this.error.set(err.error.message);
          } else {
            this.error.set('Failed to submit review. Please try again.');
          }
        } else {
          this.error.set('Failed to submit review. Please try again.');
        }
      }
    });
  }
}
