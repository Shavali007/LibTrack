import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { Recommendation, RecommendationService } from './recommendation.service';

export interface RecommendableBook {
  id: string;
  title: string;
  authors: string[];
  coverImageUrl?: string | null;
  categories?: string[];
}

@Component({
  selector: 'app-recommend-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="dismiss()">
      <div class="modal-card surface-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <!-- Modal Header -->
        <div class="modal-header">
          <div class="title-wrap">
            <h2 id="modal-title" class="modal-title">Recommend a Book</h2>
            <p class="modal-subtitle">Suggest a book to students and share your insights.</p>
          </div>
          <button type="button" class="close-btn" (click)="dismiss()" aria-label="Close dialog">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Selected Book Preview Card -->
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
              @if (book.categories && book.categories.length > 0) {
                <span class="preview-category">{{ book.categories[0] }}</span>
              }
            </div>
          </div>
        }

        <!-- Recommendation Message Form Field -->
        <div class="form-group">
          <label for="rec-msg" class="field-label">
            Recommendation Message <span class="muted-label">(Optional)</span>
          </label>
          <textarea
            id="rec-msg"
            [(ngModel)]="message"
            maxlength="300"
            rows="4"
            class="form-textarea"
            placeholder="Share why you recommend this book to students..."
            [disabled]="pending()"
          ></textarea>
          <div class="char-counter" [class.near-limit]="message.length >= 280">
            {{ message.length }} / 300
          </div>
        </div>

        <!-- Visible To Section -->
        <div class="visibility-box">
          <div class="visibility-label">
            <span>Visible To</span>
            <span class="info-icon" title="Recommendations are visible to all students in the library catalogue and recommendation feeds.">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </span>
          </div>
          <div class="visibility-field">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="field-icon">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>All Students</span>
          </div>
        </div>

        @if (error()) {
          <div class="alert alert-error mt-3" role="alert">
            {{ error() }}
          </div>
        }

        <!-- Actions -->
        <div class="modal-actions">
          <button type="button" class="button button-secondary" (click)="dismiss()" [disabled]="pending()">
            Cancel
          </button>
          <button type="button" class="button button-primary btn-submit" (click)="submit()" [disabled]="pending()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            <span>{{ pending() ? 'Recommending…' : 'Recommend Book' }}</span>
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
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 1rem;
    }

    .modal-card {
      width: 100%;
      max-width: 540px;
      background: #FFFFFF;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.14);
      padding: 1.75rem 2rem 2rem;
      border: 1px solid var(--color-line-200, #E5E0D5);
      animation: modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: translateY(8px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
    }

    .modal-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #1F2421;
      margin: 0 0 0.25rem;
      letter-spacing: -0.01em;
    }

    .modal-subtitle {
      font-size: 0.84375rem;
      color: #5A625D;
      margin: 0;
    }

    .close-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      color: #737C76;
      padding: 0.35rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .close-btn:hover {
      background: #F0EFE6;
      color: #1F2421;
    }

    .close-btn svg {
      width: 20px;
      height: 20px;
    }

    .book-preview-card {
      display: flex;
      align-items: center;
      gap: 1.15rem;
      background: #FDFCF9;
      border: 1px solid #E5E0D5;
      border-radius: 12px;
      padding: 0.85rem 1rem;
      margin-bottom: 1.25rem;
    }

    .preview-cover-wrap {
      width: 48px;
      height: 68px;
      border-radius: 6px;
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      background: #EAF2EF;
    }

    .preview-cover {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .preview-cover-fallback {
      width: 100%;
      height: 100%;
      background: #105B48;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .preview-info {
      flex: 1;
      min-width: 0;
    }

    .preview-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: #1F2421;
      margin: 0 0 0.2rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .preview-author {
      font-size: 0.8125rem;
      color: #5A625D;
      margin: 0 0 0.35rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .preview-category {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 600;
      color: #003D30;
      background: #EAF2EF;
      padding: 0.15rem 0.5rem;
      border-radius: 6px;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .field-label {
      display: block;
      font-size: 0.84375rem;
      font-weight: 600;
      color: #1F2421;
      margin-bottom: 0.4rem;
    }

    .muted-label {
      font-weight: 400;
      color: #737C76;
    }

    .form-textarea {
      width: 100%;
      border: 1px solid #D8D2C4;
      border-radius: 10px;
      padding: 0.75rem 0.9rem;
      font-size: 0.875rem;
      color: #1F2421;
      font-family: inherit;
      resize: vertical;
      line-height: 1.45;
      background: #FFFFFF;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      box-sizing: border-box;
    }

    .form-textarea:focus {
      outline: none;
      border-color: #003D30;
      box-shadow: 0 0 0 3px rgba(0, 61, 48, 0.12);
    }

    .char-counter {
      text-align: right;
      font-size: 0.75rem;
      color: #737C76;
      margin-top: 0.35rem;
    }

    .char-counter.near-limit {
      color: #B45309;
      font-weight: 600;
    }

    .visibility-box {
      margin-bottom: 1.5rem;
    }

    .visibility-label {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.84375rem;
      font-weight: 600;
      color: #1F2421;
      margin-bottom: 0.4rem;
    }

    .info-icon {
      color: #737C76;
      display: inline-flex;
      cursor: help;
    }

    .info-icon svg {
      width: 15px;
      height: 15px;
    }

    .visibility-field {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.65rem 0.9rem;
      background: #FDFCF9;
      border: 1px solid #D8D2C4;
      border-radius: 10px;
      font-size: 0.875rem;
      color: #1F2421;
      font-weight: 500;
    }

    .field-icon {
      width: 18px;
      height: 18px;
      color: #5A625D;
    }

    .alert {
      padding: 0.65rem 0.85rem;
      border-radius: 8px;
      font-size: 0.8125rem;
      margin-bottom: 1rem;
    }

    .alert-error {
      background: #FEE2E2;
      color: #991B1B;
      border: 1px solid #FECACA;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }

    .btn-submit {
      background: #003D30 !important;
      color: #FFFFFF !important;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      font-weight: 600;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-submit:hover:not(:disabled) {
      background: #002B22 !important;
    }

    .btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-icon {
      width: 16px;
      height: 16px;
    }
  `]
})
export class RecommendModalComponent {
  private readonly recService = inject(RecommendationService);

  @Input() book: RecommendableBook | null = null;
  @Output() recommended = new EventEmitter<Recommendation>();
  @Output() dismissed = new EventEmitter<void>();

  message = '';
  readonly pending = signal(false);
  readonly error = signal<string | null>(null);
  readonly coverBroken = signal(false);

  dismiss(): void {
    if (!this.pending()) {
      this.dismissed.emit();
    }
  }

  submit(): void {
    if (!this.book) return;

    const trimmed = this.message.trim();
    if (this.message.length > 0 && trimmed.length === 0) {
      this.error.set('Recommendation message cannot contain only whitespace.');
      return;
    }

    this.pending.set(true);
    this.error.set(null);

    this.recService.createRecommendation(this.book.id, trimmed ? trimmed : undefined)
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe({
        next: (rec) => {
          this.recommended.emit(rec);
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
