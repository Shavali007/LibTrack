import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, switchMap, tap } from 'rxjs';

export type ReservationStatusType =
  | 'WAITING_FOR_AVAILABILITY'
  | 'IN_QUEUE'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface ReservationItem {
  id: string;
  bookId: string;
  bookTitle: string;
  bookAuthors: string[];
  bookCategory: string;
  bookCoverImageUrl?: string | null;
  reservedOn: string;
  queuePosition?: number | null;
  status: ReservationStatusType;
  statusDisplay: string;
  availabilityHoldText: string;
  holdExpiresAt?: string | null;
  assignedCopyId?: string | null;
  borrowRequestId?: string | null;
  canCancel: boolean;
  canBorrowNow: boolean;
}

export interface ReservationCounts {
  all: number;
  waiting: number;
  inQueue: number;
  readyForPickup: number;
  completed: number;
  cancelled: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private readonly http = inject(HttpClient);

  getMyReservations(tab?: string): Observable<ReservationItem[]> {
    let params = new HttpParams();
    if (tab && tab !== 'all') {
      params = params.set('tab', tab);
    }
    return this.http.get<ReservationItem[]>('/api/v1/reservations/mine', { params });
  }

  getCounts(): Observable<ReservationCounts> {
    return this.http.get<ReservationCounts>('/api/v1/reservations/counts');
  }

  getActiveForBook(bookId: string): Observable<ReservationItem | null> {
    return this.http.get<ReservationItem | null>(`/api/v1/reservations/books/${bookId}/active`);
  }

  private csrfHeaders(): Observable<HttpHeaders> {
    return this.http.get<{ headerName: string; token: string }>('/api/v1/auth/csrf').pipe(
      tap((x) => {
        if (!x.headerName || !x.token) throw new Error('Security token unavailable');
      }),
      switchMap((x) => [new HttpHeaders().set(x.headerName, x.token)])
    );
  }

  createReservation(bookId: string): Observable<ReservationItem> {
    return this.csrfHeaders().pipe(
      switchMap((headers) => this.http.post<ReservationItem>('/api/v1/reservations', { bookId }, { headers }))
    );
  }

  cancelReservation(id: string): Observable<ReservationItem> {
    return this.csrfHeaders().pipe(
      switchMap((headers) => this.http.post<ReservationItem>(`/api/v1/reservations/${id}/cancel`, {}, { headers }))
    );
  }
}
