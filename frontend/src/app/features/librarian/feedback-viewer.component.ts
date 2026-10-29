import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { finalize } from 'rxjs';
import { FeedbackRecord, LibrarianOperationsService } from './librarian-operations.service';

@Component({
  selector: 'app-feedback-viewer',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <header class="page-heading">
      <div>
        <p class="eyebrow">LIBRARIAN WORKSPACE · COMMUNITY</p>
        <h1>Member Feedback & Suggestions</h1>
        <p class="muted">Review inquiries, book acquisition requests, facility reports, and suggestions from students and faculty.</p>
      </div>
    </header>

    @if (error()) {
      <p class="alert alert-error" role="alert">{{ error() }}</p>
    }
    @if (notice()) {
      <p class="alert alert-success" role="status">{{ notice() }}</p>
    }

    <!-- Filter Category Tabs -->
    <div class="category-tabs" role="tablist">
      <button
        class="tab-btn"
        [class.active]="selectedCategory() === 'ALL'"
        type="button"
        (click)="selectedCategory.set('ALL')"
      >
        All ({{ feedbackList().length }})
      </button>
      <button
        class="tab-btn"
        [class.active]="selectedCategory() === 'BOOK_REQUEST'"
        type="button"
        (click)="selectedCategory.set('BOOK_REQUEST')"
      >
        Book Requests
      </button>
      <button
        class="tab-btn"
        [class.active]="selectedCategory() === 'FACILITIES'"
        type="button"
        (click)="selectedCategory.set('FACILITIES')"
      >
        Facilities
      </button>
      <button
        class="tab-btn"
        [class.active]="selectedCategory() === 'CIRCULATION'"
        type="button"
        (click)="selectedCategory.set('CIRCULATION')"
      >
        Circulation
      </button>
      <button
        class="tab-btn"
        [class.active]="selectedCategory() === 'TECHNICAL'"
        type="button"
        (click)="selectedCategory.set('TECHNICAL')"
      >
        Technical
      </button>
    </div>

    @if (loading()) {
      <div class="loading-state" role="status">Loading feedback entries…</div>
    } @else if (!filteredFeedback().length) {
      <section class="empty-state surface-card">
        <h2>No feedback in this category</h2>
        <p>Member inquiries and suggestions will appear here once submitted.</p>
      </section>
    } @else {
      <div class="feedback-grid">
        @for (item of filteredFeedback(); track item.id) {
          <article class="surface-card feedback-card">
            <header class="feedback-header">
              <div class="member-meta">
                <strong>{{ item.institutionalId || item.memberEmail.split('@')[0] }}</strong>
                <span class="role-badge" [class.role-student]="item.role === 'STUDENT'" [class.role-faculty]="item.role === 'FACULTY'">
                  {{ item.role === 'STUDENT' ? 'Student' : 'Faculty' }}
                </span>
                <span class="email-sub muted">{{ item.memberEmail }}</span>
              </div>
              <div class="feedback-tags">
                <span class="category-pill">{{ item.category }}</span>
                <time class="muted time-label" [attr.datetime]="item.createdAt">{{ item.createdAt | date:'d MMM y, h:mm a' }}</time>
              </div>
            </header>
            <h3 class="feedback-subject">{{ item.subject }}</h3>
            <p class="feedback-message">{{ item.message }}</p>
          </article>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .page-heading {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
    }
    .page-heading h1 { margin: 0.2rem 0; font-size: 1.85rem; }
    .category-tabs {
      display: flex;
      gap: 0.5rem;
      border-bottom: 2px solid var(--color-line-200);
      margin-bottom: 1.5rem;
      overflow-x: auto;
    }
    .tab-btn {
      background: transparent;
      border: 0;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      padding: 0.6rem 0.9rem;
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--color-charcoal-600);
      cursor: pointer;
      white-space: nowrap;
    }
    .tab-btn.active {
      color: #1b4332;
      border-bottom-color: #1b4332;
      font-weight: 700;
    }
    .feedback-grid {
      display: grid;
      gap: 1rem;
    }
    .feedback-card {
      padding: 1.25rem 1.4rem;
      border-radius: var(--radius-panel);
      border: 1px solid var(--color-line-200);
      background: var(--color-paper);
    }
    .feedback-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .member-meta {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }
    .role-badge {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
    }
    .role-student { background: #e0f2fe; color: #0369a1; }
    .role-faculty { background: #fef3c7; color: #92400e; }
    .email-sub { font-size: 0.82rem; }
    .feedback-tags {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .category-pill {
      background: #e8f3ee;
      color: #1b4332;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .time-label { font-size: 0.78rem; }
    .feedback-subject {
      margin: 0 0 0.4rem;
      font-size: 1.1rem;
      color: var(--color-charcoal-900);
    }
    .feedback-message {
      margin: 0;
      font-size: 0.9rem;
      line-height: 1.5;
      color: var(--color-charcoal-700);
      white-space: pre-wrap;
    }
  `]
})
export class FeedbackViewerComponent implements OnInit {
  private readonly opsService = inject(LibrarianOperationsService);

  readonly feedbackList = signal<FeedbackRecord[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly notice = signal('');

  readonly selectedCategory = signal<string>('ALL');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.opsService.getAllFeedback()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.feedbackList.set(items),
        error: () => this.error.set('Failed to load member feedback.')
      });
  }

  filteredFeedback(): FeedbackRecord[] {
    const cat = this.selectedCategory();
    if (cat === 'ALL') return this.feedbackList();
    return this.feedbackList().filter(f => f.category === cat);
  }
}
