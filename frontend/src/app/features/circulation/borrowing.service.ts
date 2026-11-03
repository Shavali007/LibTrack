import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';
import { FineRecord } from '../librarian/librarian-operations.service';

export type BorrowRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ISSUED';
export type LoanStatus = 'ACTIVE' | 'RETURNED' | 'LOST';
export type ReturnCondition = 'GOOD' | 'DAMAGED' | 'LOST';

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface RequestEvent {
  eventType: string;
  actorEmail: string;
  occurredAt: string;
  reason: string | null;
}

export interface BorrowRequestRecord {
  id: string;
  bookId: string;
  bookTitle: string;
  coverImageUrl: string | null;
  borrowerEmail: string;
  borrowerInstitutionalId?: string | null;
  borrowerRole?: string | null;
  borrowerDisplayName?: string | null;
  status: BorrowRequestStatus;
  submittedAt: string;
  decidedAt: string | null;
  decisionReason: string | null;
  history: RequestEvent[];
}

export interface LoanEvent {
  eventType: string;
  actorEmail: string;
  occurredAt: string;
  effectiveDate: string;
  previousDueDate: string | null;
  newDueDate: string | null;
  copyStatus: string | null;
  note: string | null;
}

export interface LoanRecord {
  id: string;
  borrowRequestId: string;
  bookId: string;
  bookTitle: string;
  coverImageUrl: string | null;
  copyIdentifier: string;
  borrowerEmail: string;
  borrowerDisplayName?: string | null;
  borrowerRole?: string | null;
  status: LoanStatus;
  issueDate: string;
  dueDate: string;
  actualReturnDate: string | null;
  renewalCount: number;
  overdue: boolean;
  renewalEligible: boolean;
  returnNote: string | null;
  history: LoanEvent[];
  returnCondition?: string | null;
  processedByEmail?: string | null;
  daysLeft?: number | null;
  inventoryStatus?: string | null;
}

export interface CirculationSummary {
  activeLoans: number;
  totalTransactions?: number;
  totalReturnsThisMonth: number;
  damagedCopies: number;
  lostCopies: number;
  historyTotalCount?: number;
  historyGoodCount?: number;
  historyDamagedCount?: number;
  historyLostCount?: number;
}

export interface LostDamagedCopy {
  copyId: string;
  bookId: string;
  bookTitle: string;
  coverImageUrl: string | null;
  copyIdentifier: string;
  location: string | null;
  status: string;
  condition: string;
  borrowerName: string | null;
  borrowerEmail: string | null;
  borrowerRole: string | null;
  reportedDate: string | null;
  caseNote: string | null;
}

export interface CirculationStats {
  activeLoans: number;
  totalReturnsThisMonth: number;
  totalGoodReturns: number;
  totalDamagedCopies: number;
  totalLostCopies: number;
  overdueLoans: number;
  activityOverTime: { month: string; year: number; issued: number; returned: number }[];
  returnConditions: { good: number; damaged: number; lost: number };
  memberBreakdown: { studentActive: number; facultyActive: number; studentTotal: number; facultyTotal: number };
}

export interface LoanFilterParams {
  status?: string;
  overdueOnly?: boolean;
  search?: string;
  role?: string;
  bookId?: string;
  fromDate?: string;
  toDate?: string;
  condition?: string;
  historyOnly?: boolean;
  page?: number;
  size?: number;
}

export interface Holiday {
  id: string;
  fromDate?: string;
  toDate?: string;
  durationDays?: number;
  holidayDate?: string;
  name: string;
  createdByEmail: string;
  createdAt: string;
}

export interface CirculationCopy {
  id: string;
  bookId: string;
  copyIdentifier: string;
  location: string | null;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class BorrowingService {
  private readonly http = inject(HttpClient);

  private csrf(): Observable<HttpHeaders> {
    return this.http.get<{ headerName: string; token: string }>('/api/v1/auth/csrf').pipe(
      tap(x => {
        if (!x.headerName || !x.token) throw new Error('Security token unavailable');
      }),
      switchMap(x => [new HttpHeaders().set(x.headerName, x.token)])
    );
  }

  private post<T>(path: string, body: unknown): Observable<T> {
    return this.csrf().pipe(switchMap(headers => this.http.post<T>(path, body, { headers })));
  }

  private put<T>(path: string, body: unknown): Observable<T> {
    return this.csrf().pipe(switchMap(headers => this.http.put<T>(path, body, { headers })));
  }

  private delete(path: string): Observable<void> {
    return this.csrf().pipe(switchMap(headers => this.http.delete<void>(path, { headers })));
  }

  myRequests(page = 0): Observable<Page<BorrowRequestRecord>> {
    return this.http.get<Page<BorrowRequestRecord>>('/api/v1/borrow-requests/mine', {
      params: new HttpParams().set('page', page).set('size', 20)
    });
  }

  queue(status = ''): Observable<Page<BorrowRequestRecord>> {
    let params = new HttpParams().set('size', 100);
    if (status) params = params.set('status', status);
    return this.http.get<Page<BorrowRequestRecord>>('/api/v1/borrow-requests', { params });
  }

  submit(bookId: string): Observable<BorrowRequestRecord> {
    return this.post('/api/v1/borrow-requests', { bookId });
  }

  decide(id: string, decision: 'APPROVE' | 'REJECT', reason: string | null): Observable<BorrowRequestRecord> {
    return this.post(`/api/v1/borrow-requests/${id}/decision`, { decision, reason });
  }

  issue(id: string, copyId: string, note: string | null = null): Observable<LoanRecord> {
    return this.post(`/api/v1/borrow-requests/${id}/issue`, { copyId, note });
  }

  currentLoans(): Observable<Page<LoanRecord>> {
    return this.http.get<Page<LoanRecord>>('/api/v1/loans/mine');
  }

  loanHistory(): Observable<Page<LoanRecord>> {
    return this.http.get<Page<LoanRecord>>('/api/v1/loans/mine/history');
  }

  librarianLoans(overdueOnly = false): Observable<Page<LoanRecord>> {
    return this.http.get<Page<LoanRecord>>('/api/v1/loans', {
      params: new HttpParams().set('status', 'ACTIVE').set('overdueOnly', overdueOnly)
    });
  }

  searchLibrarianLoans(filters: LoanFilterParams): Observable<Page<LoanRecord>> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.overdueOnly !== undefined) params = params.set('overdueOnly', filters.overdueOnly);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.role) params = params.set('role', filters.role);
    if (filters.bookId) params = params.set('bookId', filters.bookId);
    if (filters.fromDate) params = params.set('fromDate', filters.fromDate);
    if (filters.toDate) params = params.set('toDate', filters.toDate);
    if (filters.condition) params = params.set('condition', filters.condition);
    if (filters.historyOnly !== undefined) params = params.set('historyOnly', filters.historyOnly);
    if (filters.page !== undefined) params = params.set('page', filters.page);
    if (filters.size !== undefined) params = params.set('size', filters.size);
    return this.http.get<Page<LoanRecord>>('/api/v1/loans', { params });
  }

  getCirculationSummary(): Observable<CirculationSummary> {
    return this.http.get<CirculationSummary>('/api/v1/circulation/summary');
  }

  getLostAndDamagedCopies(condition?: string, search?: string, page = 0, size = 10): Observable<Page<LostDamagedCopy>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (condition) params = params.set('condition', condition);
    if (search) params = params.set('search', search);
    return this.http.get<Page<LostDamagedCopy>>('/api/v1/circulation/lost-damaged', { params });
  }

  getCirculationStats(): Observable<CirculationStats> {
    return this.http.get<CirculationStats>('/api/v1/circulation/stats');
  }

  renew(id: string): Observable<LoanRecord> {
    return this.post(`/api/v1/loans/${id}/renew`, {});
  }

  returnLoan(id: string, condition: ReturnCondition, note: string | null): Observable<LoanRecord> {
    return this.post(`/api/v1/loans/${id}/return`, { condition, note });
  }

  updateLoanCondition(loanId: string, condition: ReturnCondition, reason: string): Observable<LoanRecord> {
    return this.put(`/api/v1/circulation/loans/${loanId}/condition`, { condition, reason });
  }

  holidays(): Observable<Holiday[]> {
    return this.http.get<Holiday[]>('/api/v1/holidays');
  }

  addHoliday(fromDateOrDate: string, toDateOrName: string, maybeName?: string): Observable<Holiday> {
    const fromDate = fromDateOrDate;
    const toDate = maybeName !== undefined ? toDateOrName : fromDateOrDate;
    const name = maybeName !== undefined ? maybeName : toDateOrName;
    return this.post('/api/v1/holidays', { fromDate, toDate, name });
  }

  deleteHoliday(id: string): Observable<void> {
    return this.delete(`/api/v1/holidays/${id}`);
  }

  myFines(): Observable<FineRecord[]> {
    return this.http.get<FineRecord[]>('/api/v1/fines/mine');
  }
}
