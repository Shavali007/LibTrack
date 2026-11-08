import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, Subscription, interval, of, switchMap, tap } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface NotificationMetadata {
  bookId?: string | null;
  bookTitle?: string | null;
  bookAuthor?: string | null;
  bookSubject?: string | null;
  bookCoverUrl?: string | null;
  categoryId?: string | null;
  loanId?: string | null;
  loanDisplayCode?: string | null;
  dueDate?: string | null;
  daysRemaining?: number | null;
  canRenew?: boolean | null;
  queuePosition?: number | null;
  pickupDeadline?: string | null;
  fineAmount?: number | null;
  applicantName?: string | null;
  applicantEmail?: string | null;
  status?: string | null;
  infoAlert?: string | null;
}

export interface NotificationItem {
  id: string;
  recipientAccountId?: string | null;
  targetRole?: string | null;
  title: string;
  message: string;
  fullMessage?: string | null;
  category: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  actionRoute?: string | null;
  read: boolean;
  isRead?: boolean;
  readAt?: string | null;
  createdAt: string;
  metadata?: NotificationMetadata | null;
}

export interface NotificationCounts {
  all: number;
  unread: number;
  read: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationClientService implements OnDestroy {
  private readonly http = inject(HttpClient);

  readonly unreadCount = signal<number>(0);
  readonly counts = signal<NotificationCounts>({ all: 0, unread: 0, read: 0 });
  readonly latestDropdownItems = signal<NotificationItem[]>([]);

  private pollingSub?: Subscription;

  constructor() {
    this.startPolling(20000);
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  startPolling(intervalMs: number = 20000): void {
    this.stopPolling();
    this.refreshCounts();
    this.pollingSub = interval(intervalMs).subscribe(() => {
      this.refreshCounts();
    });
  }

  stopPolling(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = undefined;
    }
  }

  refreshCounts(): void {
    this.getNotificationCounts().subscribe({
      next: (res) => {
        this.counts.set(res);
        this.unreadCount.set(res.unread);
      },
      error: () => {
        // Silent fallback for unauthenticated states
      }
    });
  }

  private csrfHeaders(): Observable<HttpHeaders> {
    return this.http.get<{ headerName: string; token: string }>('/api/v1/auth/csrf').pipe(
      tap((x) => {
        if (!x.headerName || !x.token) throw new Error('Security token unavailable');
      }),
      switchMap((x) => [new HttpHeaders().set(x.headerName, x.token)])
    );
  }

  getNotifications(filter: 'ALL' | 'UNREAD' | 'READ' = 'ALL', sort: 'LATEST' | 'OLDEST' = 'LATEST'): Observable<NotificationItem[]> {
    let params = new HttpParams().set('filter', filter).set('sort', sort);
    return this.http.get<NotificationItem[]>('/api/v1/notifications', { params }).pipe(
      tap((items) => {
        if (filter === 'ALL' && sort === 'LATEST') {
          this.latestDropdownItems.set(items.slice(0, 5));
        }
      })
    );
  }

  getLatestDropdown(limit: number = 5): Observable<NotificationItem[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<NotificationItem[]>('/api/v1/notifications', { params }).pipe(
      tap((items) => this.latestDropdownItems.set(items)),
      catchError(() => of([]))
    );
  }

  getNotificationCounts(): Observable<NotificationCounts> {
    return this.http.get<NotificationCounts>('/api/v1/notifications/counts').pipe(
      tap((res) => {
        this.counts.set(res);
        this.unreadCount.set(res.unread);
      })
    );
  }

  getUnreadCount(): Observable<{ unreadCount: number }> {
    return this.http.get<{ unreadCount: number }>('/api/v1/notifications/unread-count').pipe(
      tap((res) => this.unreadCount.set(res.unreadCount))
    );
  }

  getNotification(id: string): Observable<NotificationItem> {
    return this.http.get<NotificationItem>(`/api/v1/notifications/${id}`);
  }

  markAsRead(id: string): Observable<void> {
    return this.csrfHeaders().pipe(
      switchMap((headers) => this.http.patch<void>(`/api/v1/notifications/${id}/read`, {}, { headers })),
      tap(() => {
        this.unreadCount.update((cnt) => Math.max(0, cnt - 1));
        this.counts.update((c) => ({
          all: c.all,
          unread: Math.max(0, c.unread - 1),
          read: c.read + 1
        }));
      })
    );
  }

  markAsUnread(id: string): Observable<void> {
    return this.csrfHeaders().pipe(
      switchMap((headers) => this.http.patch<void>(`/api/v1/notifications/${id}/unread`, {}, { headers })),
      tap(() => {
        this.unreadCount.update((cnt) => cnt + 1);
        this.counts.update((c) => ({
          all: c.all,
          unread: c.unread + 1,
          read: Math.max(0, c.read - 1)
        }));
      })
    );
  }

  markAllAsRead(): Observable<void> {
    return this.csrfHeaders().pipe(
      switchMap((headers) => this.http.patch<void>('/api/v1/notifications/read-all', {}, { headers })),
      tap(() => {
        this.unreadCount.set(0);
        this.counts.update((c) => ({
          all: c.all,
          unread: 0,
          read: c.all
        }));
      })
    );
  }

  clearAll(): Observable<void> {
    return this.csrfHeaders().pipe(
      switchMap((headers) => this.http.delete<void>('/api/v1/notifications', { headers })),
      tap(() => {
        this.unreadCount.set(0);
        this.counts.set({ all: 0, unread: 0, read: 0 });
        this.latestDropdownItems.set([]);
      })
    );
  }

  getRelativeTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getCategoryIcon(category: string, title?: string): string {
    const cat = (category || '').toUpperCase();
    const t = (title || '').toLowerCase();

    if (cat.includes('WISHLIST') || cat.includes('NEW_BOOK')) return 'book-open';
    if (cat.includes('RESERVATION') || t.includes('reservation')) return 'calendar';
    if (cat.includes('DUE') || t.includes('due')) return 'book-due';
    if (t.includes('approved') || t.includes('accepted')) return 'check-circle';
    if (t.includes('rejected') || t.includes('cancel')) return 'x-circle';
    if (cat.includes('BORROW_REQUEST') || t.includes('request')) return 'file-text';
    if (cat.includes('LOAN') || t.includes('issued') || t.includes('borrow')) return 'book';
    if (cat.includes('RETURN') || t.includes('return')) return 'arrow-return';
    if (cat.includes('OVERDUE') || t.includes('overdue')) return 'alert-triangle';
    if (cat.includes('FINE') || t.includes('fine')) return 'dollar-sign';
    if (cat.includes('RECOMMEND') || t.includes('recommend')) return 'star';
    if (cat.includes('MEMBER') || t.includes('registration') || t.includes('account')) return 'user';
    return 'bell';
  }
}
