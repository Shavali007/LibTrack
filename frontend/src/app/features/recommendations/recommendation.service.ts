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

export interface FacultyDirectoryItem {
  id: string;
  displayName: string;
  email: string;
  department: string;
  designation?: string;
  institutionalId?: string;
  recommendationCount: number;
}

export interface FacultyBookItem {
  recommendationId: string;
  bookId: string;
  title: string;
  isbn?: string;
  coverImageUrl?: string;
  authors: string[];
  categories: string[];
  publicationYear?: number;
  averageRating?: number;
  reviewCount: number;
  message?: string;
  createdAt: string;
  helpfulCount: number;
  markedHelpful: boolean;
}

export interface FacultyDetail {
  id: string;
  displayName: string;
  email: string;
  department: string;
  designation?: string;
  institutionalId?: string;
  recommendationCount: number;
  books: FacultyBookItem[];
}

export interface TopRecommendedBook {
  bookId: string;
  title: string;
  coverImageUrl?: string;
  authors: string[];
  categories: string[];
  distinctFacultyCount: number;
  totalRecommendations: number;
}

export interface RecentRecommendation {
  recommendationId: string;
  bookId: string;
  bookTitle: string;
  coverImageUrl?: string;
  facultyId: string;
  facultyName: string;
  facultyDepartment?: string;
  createdAt: string;
}

export interface ContributingFaculty {
  recommendationId: string;
  facultyId: string;
  facultyName: string;
  department?: string;
  message?: string;
  createdAt: string;
}

export interface AllRecommendedBookItem {
  bookId: string;
  title: string;
  isbn?: string;
  coverImageUrl?: string;
  authors: string[];
  categories: string[];
  publicationYear?: number;
  distinctFacultyCount: number;
  totalRecommendations: number;
  averageRating?: number;
  reviewCount: number;
  latestCreatedAt: string;
  contributingFaculty: ContributingFaculty[];
}

export interface StudentInterestsResponse {
  categories: string[];
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

  getFacultyDirectory(q?: string, department?: string, sort?: string): Observable<FacultyDirectoryItem[]> {
    let params: Record<string, string> = {};
    if (q) params['q'] = q;
    if (department && department !== 'ALL' && department !== 'All Departments') params['department'] = department;
    if (sort) params['sort'] = sort;
    return this.http.get<FacultyDirectoryItem[]>('/api/v1/recommendations/faculty-directory', { params });
  }

  getFacultyDetails(facultyId: string): Observable<FacultyDetail> {
    return this.http.get<FacultyDetail>(`/api/v1/recommendations/faculty/${facultyId}`);
  }

  getTopRecommended(limit = 5): Observable<TopRecommendedBook[]> {
    return this.http.get<TopRecommendedBook[]>('/api/v1/recommendations/top', { params: { limit: limit.toString() } });
  }

  getRecentlyRecommended(limit = 5): Observable<RecentRecommendation[]> {
    return this.http.get<RecentRecommendation[]>('/api/v1/recommendations/recent', { params: { limit: limit.toString() } });
  }

  getAllRecommendedBooks(q?: string, category?: string, sort = 'most_recommended', page = 0, size = 20): Observable<AllRecommendedBookItem[]> {
    let params: Record<string, string> = {
      sort,
      page: page.toString(),
      size: size.toString()
    };
    if (q) params['q'] = q;
    if (category && category !== 'ALL' && category !== 'All Categories') params['category'] = category;
    return this.http.get<AllRecommendedBookItem[]>('/api/v1/recommendations/all-books', { params });
  }

  getDepartments(): Observable<string[]> {
    return this.http.get<string[]>('/api/v1/recommendations/departments');
  }

  getStudentInterests(): Observable<StudentInterestsResponse> {
    return this.http.get<StudentInterestsResponse>('/api/v1/recommendations/interests');
  }

  updateStudentInterests(categories: string[]): Observable<StudentInterestsResponse> {
    return this.csrfHeaders().pipe(
      switchMap((headers) =>
        this.http.put<StudentInterestsResponse>(
          '/api/v1/recommendations/interests',
          { categories },
          { headers }
        )
      )
    );
  }

  getPersonalizedRecommendations(): Observable<AllRecommendedBookItem[]> {
    return this.http.get<AllRecommendedBookItem[]>('/api/v1/recommendations/personalized');
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
