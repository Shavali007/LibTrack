import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';

export interface Recommendation {
  id: string;
  bookId: string;
  bookTitle: string;
  bookIsbn?: string;
  bookCoverImageUrl?: string;
  bookAuthors: string[];
  bookCategories: string[];
  publicationYear?: number;
  facultyId: string;
  facultyName: string;
  facultyEmail: string;
  facultyDepartment?: string;
  message?: string;
  status: 'ACTIVE' | 'WITHDRAWN';
  createdAt: string;
  updatedAt: string;
  withdrawnAt?: string;
  helpfulCount: number;
  markedHelpful: boolean;
}

export interface FacultyRecommendationItem {
  recommendationId: string;
  facultyId: string;
  facultyName: string;
  facultyEmail: string;
  facultyDepartment?: string;
  message?: string;
  createdAt: string;
  helpfulCount: number;
  markedHelpful: boolean;
}

export interface FacultyRecommendationGroup {
  bookId: string;
  bookTitle: string;
  bookIsbn?: string;
  bookCoverImageUrl?: string;
  bookAuthors: string[];
  bookCategories: string[];
  publicationYear?: number;
  totalRecommendations: number;
  recommendations: FacultyRecommendationItem[];
}

export interface HelpfulResult {
  recommendationId: string;
  helpfulCount: number;
  markedHelpful: boolean;
}

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private readonly http = inject(HttpClient);

  private csrfHeaders(): Observable<HttpHeaders> {
    return this.http.get<{ headerName: string; token: string }>('/api/v1/auth/csrf').pipe(
      tap((x) => {
        if (!x.headerName || !x.token) throw new Error('Security token unavailable');
      }),
      switchMap((x) => [new HttpHeaders().set(x.headerName, x.token)])
    );
  }

  createRecommendation(bookId: string, message?: string): Observable<Recommendation> {
    return this.csrfHeaders().pipe(
      switchMap((headers) =>
        this.http.post<Recommendation>(
          '/api/v1/recommendations',
          { bookId, message: message?.trim() ? message.trim() : null },
          { headers }
        )
      )
    );
  }

  getMyRecommendations(): Observable<Recommendation[]> {
    return this.http.get<Recommendation[]>('/api/v1/recommendations/mine');
  }

  getAllFacultyRecommendations(): Observable<Recommendation[]> {
    return this.http.get<Recommendation[]>('/api/v1/recommendations/all');
  }

  updateRecommendationMessage(id: string, message?: string): Observable<Recommendation> {
    return this.csrfHeaders().pipe(
      switchMap((headers) =>
        this.http.put<Recommendation>(
          `/api/v1/recommendations/${id}`,
          { message: message?.trim() ? message.trim() : null },
          { headers }
        )
      )
    );
  }

  withdrawRecommendation(id: string): Observable<Recommendation> {
    return this.csrfHeaders().pipe(
      switchMap((headers) =>
        this.http.post<Recommendation>(
          `/api/v1/recommendations/${id}/withdraw`,
          {},
          { headers }
        )
      )
    );
  }

  getFacultyRecommendationsForStudents(): Observable<FacultyRecommendationGroup[]> {
    return this.http.get<FacultyRecommendationGroup[]>('/api/v1/recommendations/faculty');
  }

  getRecommendationsForBook(bookId: string): Observable<Recommendation[]> {
    return this.http.get<Recommendation[]>(`/api/v1/recommendations/books/${bookId}`);
  }

  getRecommendedBookIds(): Observable<string[]> {
    return this.http.get<string[]>('/api/v1/recommendations/recommended-book-ids');
  }

  markHelpful(id: string): Observable<HelpfulResult> {
    return this.csrfHeaders().pipe(
      switchMap((headers) =>
        this.http.post<HelpfulResult>(
          `/api/v1/recommendations/${id}/helpful`,
          {},
          { headers }
        )
      )
    );
  }

  removeHelpful(id: string): Observable<HelpfulResult> {
    return this.csrfHeaders().pipe(
      switchMap((headers) =>
        this.http.delete<HelpfulResult>(
          `/api/v1/recommendations/${id}/helpful`,
          { headers }
        )
      )
    );
  }
}
