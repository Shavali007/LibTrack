import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';

export interface InventoryReport {
  totalBooks: number;
  totalCopies: number;
  availableCopies: number;
  onLoanCopies: number;
  lostCopies: number;
  damagedCopies: number;
  withdrawnCopies: number;
}

export interface CirculationReport {
  totalLoans: number;
  activeLoans: number;
  overdueLoans: number;
  returnedLoans: number;
}

export interface OverdueLoanItem {
  loanId: string;
  bookTitle: string;
  bookIsbn: string | null;
  copyIdentifier: string;
  borrowerName: string;
  borrowerEmail: string;
  borrowerInstitutionalId: string | null;
  issueDate: string;
  dueDate: string;
  daysOverdue: number;
}

export interface TopBorrowedBookItem {
  bookId: string;
  title: string;
  author: string;
  isbn: string | null;
  loanCount: number;
}

export interface ReportSummary {
  inventory: InventoryReport;
  circulation: CirculationReport;
  overdueLoans: OverdueLoanItem[];
  topBooks: TopBorrowedBookItem[];
}

export interface FeedbackRecord {
  id: string;
  accountId: string;
  memberEmail: string;
  institutionalId: string | null;
  role: string;
  category: string;
  subject: string;
  message: string;
  createdAt: string;
  memberDisplayName?: string | null;
}

export interface FeedbackSubmitRequest {
  category: string;
  subject: string;
  message: string;
}

export interface NotificationRecord {
  id: string;
  recipientAccountId: string | null;
  targetRole: string | null;
  title: string;
  message: string;
  category: string;
  read: boolean;
  createdAt: string;
}

export interface CreateNotificationRequest {
  recipientAccountId?: string | null;
  targetRole?: string | null;
  title: string;
  message: string;
  category: string;
}

export interface SettingRecord {
  key: string;
  value: string;
  updatedAt: string;
  updatedByEmail: string | null;
}

export interface FinePaymentRecord {
  id: string;
  amount: number;
  paymentDate: string;
  receiptNumber: string;
  recordedByEmail: string;
}

export interface FineRecord {
  id: string;
  loanId: string;
  borrowerId: string;
  borrowerName: string;
  borrowerEmail: string;
  borrowerInstitutionalId: string | null;
  bookId: string;
  bookTitle: string;
  bookIsbn: string | null;
  copyIdentifier: string;
  issueDate: string;
  dueDate: string;
  actualReturnDate: string | null;
  loanStatus: string;
  dailyRate: number;
  maxFine: number;
  overdueDays: number;
  fineAmount: number;
  status: 'UNPAID' | 'PAID';
  assessedAt: string;
  paidAt: string | null;
  payments: FinePaymentRecord[];
}

export interface FineSummary {
  totalFines: number;
  unpaidFines: number;
  paidFines: number;
  totalCollected: number;
  totalOutstanding: number;
}

export interface LibraryInfoRecord {
  libraryName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  openTime: string;
  closeTime: string;
}

export interface HolidayRecord {
  id: string;
  fromDate?: string;
  toDate?: string;
  durationDays?: number;
  holidayDate?: string;
  name: string;
  createdByEmail?: string;
  createdAt?: string;
}

export interface BorrowingPolicyDto {
  studentMaxBooks: number;
  facultyMaxBooks: number;
  studentLoanDays: number;
  facultyLoanDays: number;
  studentMaxRenewals: number;
  facultyMaxRenewals: number;
  studentRenewalExtensionDays: number;
  facultyRenewalExtensionDays: number;
  studentMaxReservations?: number;
  facultyMaxReservations?: number;
  reservationHoldPeriod?: string;
}

export interface RenewalPolicyDto {
  maxRenewals: string;
  extensionPeriod: string;
  eligibility: string;
  approval: string;
  overdueLoans: string;
}

export interface FinePolicyDto {
  overdueFinePerDay: string;
  maxFinePerBook: string;
  gracePeriod: string;
  payment: string;
  lostDamagedBooks: string;
}

export interface MembershipPolicyDto {
  eligibleMembers: string;
  registration: string;
  accountApproval: string;
  pendingAccounts: string;
  rejectedAccounts: string;
  disabledAccounts: string;
  duplicateAccounts: string;
}

export interface LibraryPoliciesRecord {
  borrowing: BorrowingPolicyDto;
  renewal: RenewalPolicyDto;
  fines: FinePolicyDto;
  membership: MembershipPolicyDto;
  usageGuidelines: string[];
}

export interface FinesPolicyResponse {
  status: string;
  policyTitle: string;
  policyDescription: string;
  monetaryFinesEnabled: boolean;
  overdueLoansCount: number;
  overdueLoans: OverdueLoanItem[];
}

@Injectable({ providedIn: 'root' })
export class LibrarianOperationsService {
  private readonly http = inject(HttpClient);

  private csrfHeaders(): Observable<HttpHeaders> {
    return this.http.get<{ headerName: string; token: string }>('/api/v1/auth/csrf').pipe(
      tap(csrf => {
        if (!csrf.headerName || !csrf.token) throw new Error('Security token unavailable.');
      }),
      switchMap(csrf => [new HttpHeaders().set(csrf.headerName, csrf.token)])
    );
  }

  // --- Reports ---
  getReportsSummary(): Observable<ReportSummary> {
    return this.http.get<ReportSummary>('/api/v1/librarian/reports/summary');
  }

  // --- Feedback ---
  getAllFeedback(): Observable<FeedbackRecord[]> {
    return this.http.get<FeedbackRecord[]>('/api/v1/librarian/feedback');
  }

  getMyFeedback(): Observable<FeedbackRecord[]> {
    return this.http.get<FeedbackRecord[]>('/api/v1/feedback/mine');
  }

  submitFeedback(request: FeedbackSubmitRequest): Observable<FeedbackRecord> {
    return this.csrfHeaders().pipe(
      switchMap(headers => this.http.post<FeedbackRecord>('/api/v1/feedback', request, { headers }))
    );
  }

  // --- Notifications ---
  getNotifications(): Observable<NotificationRecord[]> {
    return this.http.get<NotificationRecord[]>('/api/v1/notifications');
  }

  getUnreadCount(): Observable<{ unreadCount: number }> {
    return this.http.get<{ unreadCount: number }>('/api/v1/notifications/unread-count');
  }

  markNotificationRead(id: string): Observable<void> {
    return this.csrfHeaders().pipe(
      switchMap(headers => this.http.post<void>(`/api/v1/notifications/${id}/read`, {}, { headers }))
    );
  }

  markAllNotificationsRead(): Observable<void> {
    return this.csrfHeaders().pipe(
      switchMap(headers => this.http.post<void>('/api/v1/notifications/mark-all-read', {}, { headers }))
    );
  }

  createNotification(request: CreateNotificationRequest): Observable<NotificationRecord> {
    return this.csrfHeaders().pipe(
      switchMap(headers => this.http.post<NotificationRecord>('/api/v1/librarian/notifications', request, { headers }))
    );
  }

  // --- Settings ---
  getAllSettings(): Observable<SettingRecord[]> {
    return this.http.get<SettingRecord[]>('/api/v1/librarian/settings');
  }

  updateSetting(key: string, value: string): Observable<SettingRecord> {
    return this.csrfHeaders().pipe(
      switchMap(headers => this.http.put<SettingRecord>(`/api/v1/librarian/settings/${encodeURIComponent(key)}`, { value }, { headers }))
    );
  }

  getLibraryInfo(): Observable<LibraryInfoRecord> {
    return this.http.get<LibraryInfoRecord>('/api/v1/librarian/settings/library-info');
  }

  updateLibraryInfo(info: LibraryInfoRecord): Observable<LibraryInfoRecord> {
    return this.csrfHeaders().pipe(
      switchMap(headers => this.http.put<LibraryInfoRecord>('/api/v1/librarian/settings/library-info', info, { headers }))
    );
  }

  // --- Holiday Calendar ---
  getHolidays(): Observable<HolidayRecord[]> {
    return this.http.get<HolidayRecord[]>('/api/v1/holidays');
  }

  addHoliday(fromDateOrDate: string, toDateOrName: string, maybeName?: string): Observable<HolidayRecord> {
    const fromDate = fromDateOrDate;
    const toDate = maybeName !== undefined ? toDateOrName : fromDateOrDate;
    const name = maybeName !== undefined ? maybeName : toDateOrName;
    return this.csrfHeaders().pipe(
      switchMap(headers => this.http.post<HolidayRecord>('/api/v1/holidays', { fromDate, toDate, name }, { headers }))
    );
  }

  updateHoliday(id: string, fromDateOrDate: string, toDateOrName: string, maybeName?: string): Observable<HolidayRecord> {
    const fromDate = fromDateOrDate;
    const toDate = maybeName !== undefined ? toDateOrName : fromDateOrDate;
    const name = maybeName !== undefined ? maybeName : toDateOrName;
    return this.csrfHeaders().pipe(
      switchMap(headers => this.http.put<HolidayRecord>(`/api/v1/holidays/${encodeURIComponent(id)}`, { fromDate, toDate, name }, { headers }))
    );
  }

  deleteHoliday(id: string): Observable<void> {
    return this.csrfHeaders().pipe(
      switchMap(headers => this.http.delete<void>(`/api/v1/holidays/${encodeURIComponent(id)}`, { headers }))
    );
  }

  // --- Fixed Library Policies ---
  getPolicies(): Observable<LibraryPoliciesRecord> {
    return this.http.get<LibraryPoliciesRecord>('/api/v1/policies');
  }

  // --- Fines ---
  getFinesPolicy(): Observable<FinesPolicyResponse> {
    return this.http.get<FinesPolicyResponse>('/api/v1/librarian/fines/policy');
  }

  getAllFines(): Observable<FineRecord[]> {
    return this.http.get<FineRecord[]>('/api/v1/librarian/fines');
  }

  getFinesSummary(): Observable<FineSummary> {
    return this.http.get<FineSummary>('/api/v1/librarian/fines/summary');
  }

  recordPayment(fineId: string, amount: number, receiptNumber: string): Observable<FineRecord> {
    return this.csrfHeaders().pipe(
      switchMap(headers => this.http.post<FineRecord>(
        `/api/v1/librarian/fines/${fineId}/payments`,
        { amount, receiptNumber },
        { headers }
      ))
    );
  }
}
