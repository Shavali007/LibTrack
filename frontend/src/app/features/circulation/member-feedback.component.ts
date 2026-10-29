import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { FeedbackRecord, FeedbackSubmitRequest, LibrarianOperationsService } from '../librarian/librarian-operations.service';

@Component({
  selector: 'app-member-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <header class="page-heading">
      <div>
        <p class="eyebrow">COMMUNITY & SUPPORT</p>
        <h1>Submit Feedback & Suggestions</h1>
        <p class="muted">Recommend new book acquisitions, report study space or digital resource issues, or send suggestions to library staff.</p>
      </div>
    </header>

    @if (error()) {
      <p class="alert alert-error" role="alert">{{ error() }}</p>
    }
    @if (notice()) {
      <p class="alert alert-success" role="status">{{ notice() }}</p>
    }

    <div class="feedback-layout">
      <!-- Feedback Submission Form -->
      <section class="surface-card form-card">
        <h2>New Inquiry or Suggestion</h2>
        <form (ngSubmit)="submit()">
          <div class="field">
            <label for="mb-category">Category <span class="required-mark">*</span></label>
            <select id="mb-category" [(ngModel)]="category" name="category" required>
              <option value="BOOK_REQUEST">Book Acquisition Request</option>
              <option value="FACILITIES">Library Facilities & Study Spaces</option>
              <option value="CIRCULATION">Circulation & Borrowing Inquiries</option>
              <option value="TECHNICAL">Digital Edition & Technical Issues</option>
              <option value="GENERAL">General Suggestion</option>
            </select>
          </div>

          <div class="field">
            <label for="mb-subject">Subject <span class="required-mark">*</span></label>
            <input
              id="mb-subject"
              type="text"
              [(ngModel)]="subject"
              name="subject"
              placeholder="e.g. Request for Database Systems 8th Edition"
              maxlength="200"
              required
            />
          </div>

          <div class="field">
            <label for="mb-message">Message Details <span class="required-mark">*</span></label>
            <textarea
              id="mb-message"
              [(ngModel)]="message"
              name="message"
              rows="5"
              placeholder="Provide specific details such as title, author, edition, or the facility problem observed…"
              maxlength="4000"
              required
            ></textarea>
          </div>

          <button
            class="button button-primary submit-btn"
            type="submit"
            [disabled]="submitting() || !subject.trim() || !message.trim()"
          >
            {{ submitting() ? 'Submitting…' : 'Submit Feedback' }}
          </button>
        </form>
      </section>

      <!-- Previous Submissions List -->
      <section class="surface-card history-card">
        <h2>My Submitted Inquiries</h2>
        @if (loading()) {
          <div class="loading-state" role="status">Loading submissions…</div>
        } @else if (!myList().length) {
          <div class="empty-state-mini">
            <p>You haven't submitted any feedback yet. Your past inquiries and suggestions will appear here.</p>
          </div>
        } @else {
          <div class="history-list">
            @for (item of myList(); track item.id) {
              <article class="history-item">
                <header class="history-header">
                  <span class="category-pill">{{ item.category }}</span>
                  <time class="muted time-label" [attr.datetime]="item.createdAt">{{ item.createdAt | date:'d MMM y, h:mm a' }}</time>
                </header>
                <h3 class="history-subject">{{ item.subject }}</h3>
                <p class="history-message">{{ item.message }}</p>
              </article>
            }
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page-heading {
      margin-bottom: 1.5rem;
    }
    .page-heading h1 {
      margin: 0.2rem 0;
      font-size: 1.85rem;
    }
    .feedback-layout {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      gap: 1.5rem;
      align-items: flex-start;
    }
    .form-card, .history-card {
      border: 1px solid var(--color-line-200);
      border-radius: var(--radius-panel);
      padding: 1.4rem;
      background: var(--color-paper);
    }
    .form-card h2, .history-card h2 {
      margin: 0 0 1.2rem;
      font-size: 1.25rem;
      color: var(--color-forest-950);
    }
    .field {
      margin-bottom: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .field label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--color-charcoal-800);
    }
    .required-mark {
      color: #dc2626;
    }
    .field input, .field select, .field textarea {
      padding: 0.6rem 0.8rem;
      border: 1px solid var(--color-line-200);
      border-radius: var(--radius-control);
      font-size: 0.88rem;
      font-family: inherit;
    }
    .field textarea {
      resize: vertical;
    }
    .submit-btn {
      margin-top: 0.5rem;
      width: 100%;
      justify-content: center;
      padding: 0.7rem;
    }
    .history-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .history-item {
      padding: 1rem;
      border: 1px solid var(--color-line-200);
      border-radius: var(--radius-control);
      background: var(--color-ivory-50);
    }
    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .category-pill {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 650;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      padding: 0.2rem 0.6rem;
      border-radius: var(--radius-pill);
      background: var(--color-sage-100);
      color: var(--color-forest-900);
      border: 1px solid var(--color-sage-300);
    }
    .time-label {
      font-size: 0.75rem;
    }
    .history-subject {
      margin: 0 0 0.35rem;
      font-size: 0.95rem;
      color: var(--color-charcoal-900);
    }
    .history-message {
      margin: 0;
      font-size: 0.82rem;
      line-height: 1.45;
      color: var(--color-charcoal-700);
      white-space: pre-wrap;
    }
    .empty-state-mini {
      padding: 2rem 1rem;
      text-align: center;
      color: var(--color-charcoal-600);
      font-size: 0.88rem;
    }
    @media (max-width: 860px) {
      .feedback-layout {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class MemberFeedbackComponent implements OnInit {
  private readonly opsService = inject(LibrarianOperationsService);

  readonly myList = signal<FeedbackRecord[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  category = 'BOOK_REQUEST';
  subject = '';
  message = '';

  ngOnInit(): void {
    this.loadMine();
  }

  loadMine(): void {
    this.loading.set(true);
    this.error.set('');
    this.opsService.getMyFeedback()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.myList.set(items),
        error: () => this.error.set('Could not load your feedback history.')
      });
  }

  submit(): void {
    if (this.submitting() || !this.subject.trim() || !this.message.trim()) return;
    this.submitting.set(true);
    this.error.set('');
    this.notice.set('');

    const req: FeedbackSubmitRequest = {
      category: this.category,
      subject: this.subject.trim(),
      message: this.message.trim()
    };

    this.opsService.submitFeedback(req)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.notice.set('Feedback submitted successfully. Thank you for your contribution!');
          this.subject = '';
          this.message = '';
          this.loadMine();
        },
        error: () => this.error.set('Could not submit feedback. Please try again.')
      });
  }
}
