import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of, switchMap, tap, throwError } from 'rxjs';

export interface WishlistBook {
  id: string;
  bookId: string;
  title: string;
  authors: string[];
  coverImageUrl: string | null;
  category: string;
  publisher: string | null;
  publicationYear: number | null;
  availableCopies: number;
  available: boolean;
  averageRating: number;
  reviewCount: number;
  addedAt: string;
}

interface CsrfResponse {
  headerName: string;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private readonly http = inject(HttpClient);

  readonly items = signal<WishlistBook[]>([]);
  readonly savedBookIds = signal<Set<string>>(new Set());
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  private csrfHeaders(): Observable<HttpHeaders> {
    return this.http.get<CsrfResponse>('/api/v1/auth/csrf').pipe(
      map((res) => {
        const header = res.headerName || 'X-CSRF-TOKEN';
        return new HttpHeaders().set(header, res.token || '');
      }),
      catchError(() => of(new HttpHeaders()))
    );
  }

  loadMyWishlist(): Observable<WishlistBook[]> {
    this.loading.set(true);
    this.error.set(null);
    return this.http.get<WishlistBook[]>('/api/v1/wishlist').pipe(
      tap((books) => {
        this.items.set(books);
        const ids = new Set(books.map((b) => b.bookId));
        this.savedBookIds.set(ids);
        this.loading.set(false);
      }),
      catchError((err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Could not load your saved books.');
        return throwError(() => err);
      })
    );
  }

  checkStatus(bookIds: string[]): Observable<Record<string, boolean>> {
    if (!bookIds || bookIds.length === 0) {
      return of({});
    }
    const params = new HttpParams().set('bookIds', bookIds.join(','));
    return this.http.get<Record<string, boolean>>('/api/v1/wishlist/status', { params }).pipe(
      tap((statusMap) => {
        this.savedBookIds.update((current) => {
          const next = new Set(current);
          Object.entries(statusMap).forEach(([id, isSaved]) => {
            if (isSaved) {
              next.add(id);
            } else {
              next.delete(id);
            }
          });
          return next;
        });
      }),
      catchError(() => of({}))
    );
  }

  addToWishlist(bookId: string): Observable<WishlistBook> {
    return this.csrfHeaders().pipe(
      switchMap((headers) =>
        this.http.post<WishlistBook>(`/api/v1/wishlist/${bookId}`, {}, { headers })
      ),
      tap((savedBook) => {
        this.savedBookIds.update((set) => new Set(set).add(bookId));
        this.items.update((list) => {
          const exists = list.some((i) => i.bookId === bookId);
          if (exists) return list;
          return [savedBook, ...list];
        });
      })
    );
  }

  removeFromWishlist(bookId: string): Observable<void> {
    return this.csrfHeaders().pipe(
      switchMap((headers) =>
        this.http.delete<void>(`/api/v1/wishlist/${bookId}`, { headers })
      ),
      tap(() => {
        this.savedBookIds.update((set) => {
          const next = new Set(set);
          next.delete(bookId);
          return next;
        });
        this.items.update((list) => list.filter((i) => i.bookId !== bookId));
      })
    );
  }

  toggleWishlist(bookId: string): Observable<boolean> {
    if (this.isInWishlist(bookId)) {
      return this.removeFromWishlist(bookId).pipe(map(() => false));
    } else {
      return this.addToWishlist(bookId).pipe(map(() => true));
    }
  }

  isInWishlist(bookId: string): boolean {
    return this.savedBookIds().has(bookId);
  }

  reset(): void {
    this.items.set([]);
    this.savedBookIds.set(new Set());
    this.loading.set(false);
    this.error.set(null);
  }
}
