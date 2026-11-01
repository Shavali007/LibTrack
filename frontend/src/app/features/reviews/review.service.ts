import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, switchMap, tap } from 'rxjs';

export interface BookReview {
  id: string;
  bookId: string;
  reviewerDisplayName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface ReviewSummary {
  bookId?: string;
  averageRating: number | null;
  totalReviews: number;
  reviewCount?: number;
}

export interface ReviewEligibility {
  bookId?: string;
  eligible: boolean;
  reason?: string | null;
  hasReviewed: boolean;
  alreadyReviewed?: boolean;
  hasBorrowed: boolean;
  hasBorrowHistory?: boolean;
  hasDigitalAccess: boolean;
}

export interface CreateReviewRequest {
  rating: number;
  comment?: string | null;
}

export interface ReviewPage {
  content: BookReview[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private readonly http = inject(HttpClient);

  getReviews(bookId: string, page = 0, size = 10): Observable<ReviewPage> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<ReviewPage>(`/api/v1/books/${bookId}/reviews`, { params });
  }

  getSummary(bookId: string): Observable<ReviewSummary> {
    return this.http.get<ReviewSummary>(`/api/v1/books/${bookId}/reviews/summary`);
  }

  getBatchSummaries(bookIds: string[]): Observable<ReviewSummary[]> {
    if (!bookIds || bookIds.length === 0) {
      return of([]);
    }
    const params = new HttpParams().set('bookIds', bookIds.join(','));
    return this.http.get<ReviewSummary[]>('/api/v1/books/reviews/summaries', { params });
  }

  checkEligibility(bookId: string): Observable<ReviewEligibility> {
    return this.http.get<ReviewEligibility>(`/api/v1/books/${bookId}/reviews/eligibility`);
  }

  private csrfHeaders(): Observable<HttpHeaders> {
    return this.http.get<{ headerName: string; token: string }>('/api/v1/auth/csrf').pipe(
      tap((x) => {
        if (!x.headerName || !x.token) throw new Error('Security token unavailable');
      }),
      switchMap((x) => [new HttpHeaders().set(x.headerName, x.token)])
    );
  }

  submitReview(bookId: string, request: CreateReviewRequest): Observable<BookReview> {
    return this.csrfHeaders().pipe(
      switchMap((headers) => this.http.post<BookReview>(`/api/v1/books/${bookId}/reviews`, request, { headers }))
    );
  }

  formatRelativeTime(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
      const diffDay = Math.floor(diffHour / 24);
      if (diffDay < 7) return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
      const diffWeek = Math.floor(diffDay / 7);
      if (diffWeek < 5) return `${diffWeek} ${diffWeek === 1 ? 'week' : 'weeks'} ago`;
      const diffMonth = Math.floor(diffDay / 30);
      if (diffMonth < 12) return `${diffMonth} ${diffMonth === 1 ? 'month' : 'months'} ago`;
      const diffYear = Math.floor(diffDay / 365);
      return `${diffYear} ${diffYear === 1 ? 'year' : 'years'} ago`;
    } catch {
      return dateStr;
    }
  }

  getAvatarColor(name: string): { bg: string; text: string } {
    const palettes = [
      { bg: '#E3F2E9', text: '#15803D' }, // Soft green (like Ananya R.)
      { bg: '#E0F2FE', text: '#0369A1' }, // Soft blue (like Rohit S.)
      { bg: '#F3E8FF', text: '#7E22CE' }, // Soft purple (like Priya M.)
      { bg: '#FEF3C7', text: '#B45309' }, // Soft amber
      { bg: '#FFE4E6', text: '#BE123C' }, // Soft rose
      { bg: '#EDE9FE', text: '#6D28D9' }  // Soft indigo
    ];
    let hash = 0;
    const str = name || 'Anonymous';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % palettes.length;
    return palettes[index];
  }
}
