import { Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { BookDetail, CatalogueService, DigitalEdition } from './catalogue.service';

@Component({
  selector: 'app-pdf-reader',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="reader-shell">
      <header class="reader-toolbar">
        <div class="toolbar-left">
          <a class="button button-secondary back-button" [routerLink]="backLink()" [queryParams]="savedQueryParams()" aria-label="Back to book details">
            ← Back to book
          </a>
          @if (book(); as b) {
            <div class="book-meta">
              <h1 class="book-title">{{ b.title }}</h1>
              <span class="book-author">{{ b.authors.join(', ') }}</span>
            </div>
          }
        </div>
        <div class="toolbar-right">
          @if (edition(); as ed) {
            <span class="file-info">{{ ed.originalFilename }} ({{ formatBytes(ed.fileSize) }})</span>
            <a class="button button-primary download-button" [href]="downloadUrl()" download>
              Download PDF
            </a>
          }
        </div>
      </header>

      @if (loading()) {
        <div class="reader-loading" role="status" aria-live="polite">
          <div class="spinner"></div>
          <p>Loading digital edition…</p>
        </div>
      } @else if (error()) {
        <div class="reader-error" role="alert">
          <div class="alert alert-error">
            <h2>Digital Edition Unavailable</h2>
            <p>{{ error() }}</p>
            <a class="button button-secondary" [routerLink]="backLink()" [queryParams]="savedQueryParams()">Return to Book Details</a>
          </div>
        </div>
      } @else {
        <main class="reader-viewport">
          <iframe
            class="pdf-frame"
            [src]="safeContentUrl()"
            title="Digital PDF Reader"
            allow="fullscreen"
          ></iframe>
        </main>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
      background: var(--color-charcoal-900, #1a1a1a);
    }
    .reader-shell {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .reader-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.6rem 1.2rem;
      background: #242424;
      color: #f5f5f5;
      border-bottom: 1px solid #383838;
      z-index: 10;
    }
    .toolbar-left, .toolbar-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .book-meta {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .book-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 35vw;
    }
    .book-author {
      font-size: 0.78rem;
      color: #a0a0a0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 35vw;
    }
    .file-info {
      font-size: 0.8rem;
      color: #b0b0b0;
    }
    .reader-loading, .reader-error {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      color: #f5f5f5;
    }
    .reader-error .alert {
      max-width: 28rem;
      text-align: center;
    }
    .reader-viewport {
      flex: 1;
      position: relative;
      background: #525659;
    }
    .pdf-frame {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }
    @media (max-width: 768px) {
      .file-info { display: none; }
      .book-title, .book-author { max-width: 45vw; }
    }
  `]
})
export class PdfReaderComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(CatalogueService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly auth = inject(AuthService);

  readonly bookId = signal<string>(this.route.snapshot.paramMap.get('bookId') || '');
  readonly book = signal<BookDetail | null>(null);
  readonly edition = signal<DigitalEdition | null>(null);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string>('');

  backLink(): string[] {
    return this.router.url.startsWith('/workspace')
      ? ['/workspace/books', this.bookId()]
      : ['/books', this.bookId()];
  }

  savedQueryParams(): Record<string, string> {
    return this.route.snapshot.queryParams;
  }

  readonly safeContentUrl = computed<SafeResourceUrl>(() => {
    const url = this.service.digitalEditionContentUrl(this.bookId());
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  readonly downloadUrl = computed<string>(() => {
    return this.service.digitalEditionDownloadUrl(this.bookId());
  });

  constructor() {
    this.loadData();
  }

  loadData(): void {
    const id = this.bookId();
    if (!id) {
      this.error.set('No book specified.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.service.get(id).subscribe({
      next: b => this.book.set(b),
      error: () => { /* continue to load edition */ }
    });

    this.service.getDigitalEdition(id).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: ed => this.edition.set(ed),
      error: err => {
        if (err.status === 404) {
          this.error.set('No digital edition is available for this book.');
        } else if (err.status === 401 || err.status === 403) {
          this.error.set('You do not have permission to view this digital edition.');
        } else {
          this.error.set('Failed to load digital edition. Please check your connection and try again.');
        }
      }
    });
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }
}
