import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, switchMap, tap } from 'rxjs';
import { Page } from '../circulation/borrowing.service';

export type ApprovalStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface MemberRequestCounts {
  pending: number;
  approved: number;
  rejected: number;
}

export interface MemberRequestSummary {
  id: string;
  fullName: string;
  email: string;
  institutionalId: string | null;
  role: 'STUDENT' | 'FACULTY';
  requestedOn: string;
  approvalStatus: ApprovalStatus;
  reviewedAt: string | null;
  reviewedByLibrarianName: string | null;
  rejectionReason: string | null;
  librarianRemarks: string | null;
}

export interface MemberApprovalAuditItem {
  id: string;
  decision: string;
  reviewedByAccountId: string;
  reviewerName: string | null;
  reviewedAt: string;
  rejectionReason: string | null;
  remarks: string | null;
}

export interface MemberRequestDetail {
  id: string;
  fullName: string;
  institutionalId: string | null;
  email: string;
  role: 'STUDENT' | 'FACULTY';
  approvalStatus: ApprovalStatus;
  requestedOn: string;
  reviewedAt: string | null;
  reviewedByAccountId: string | null;
  reviewedByLibrarianName: string | null;
  rejectionReason: string | null;
  librarianRemarks: string | null;
  auditHistory: MemberApprovalAuditItem[];
}

export interface ApproveMemberPayload {
  remarks?: string;
}

export interface RejectMemberPayload {
  reason: string;
  remarks?: string;
}

@Injectable({ providedIn: 'root' })
export class MemberRequestsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/librarian/member-requests';

  readonly counts = signal<MemberRequestCounts>({ pending: 0, approved: 0, rejected: 0 });
  readonly pendingCount = computed(() => this.counts().pending);

  private csrf(): Observable<HttpHeaders> {
    return this.http.get<{ headerName: string; token: string }>('/api/v1/auth/csrf').pipe(
      tap(x => {
        if (!x.headerName || !x.token) throw new Error('Security token unavailable');
      }),
      switchMap(x => [new HttpHeaders().set(x.headerName, x.token)])
    );
  }

  getCounts(): Observable<MemberRequestCounts> {
    return this.http.get<MemberRequestCounts>(`${this.baseUrl}/counts`).pipe(
      tap(counts => this.counts.set(counts))
    );
  }

  list(
    status: ApprovalStatus | '' = 'PENDING_APPROVAL',
    role = '',
    q = '',
    page = 0,
    size = 20
  ): Observable<Page<MemberRequestSummary>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (status) params = params.set('status', status);
    if (role) params = params.set('role', role);
    if (q.trim()) params = params.set('q', q.trim());
    return this.http.get<Page<MemberRequestSummary>>(this.baseUrl, { params });
  }

  get(id: string): Observable<MemberRequestDetail> {
    return this.http.get<MemberRequestDetail>(`${this.baseUrl}/${id}`);
  }

  approve(id: string, remarks?: string): Observable<MemberRequestDetail> {
    return this.csrf().pipe(
      switchMap(headers =>
        this.http.post<MemberRequestDetail>(
          `${this.baseUrl}/${id}/approve`,
          { remarks },
          { headers }
        )
      ),
      tap(() => this.getCounts().subscribe({ error: () => {} }))
    );
  }

  reject(id: string, reason: string, remarks?: string): Observable<MemberRequestDetail> {
    return this.csrf().pipe(
      switchMap(headers =>
        this.http.post<MemberRequestDetail>(
          `${this.baseUrl}/${id}/reject`,
          { reason, remarks },
          { headers }
        )
      ),
      tap(() => this.getCounts().subscribe({ error: () => {} }))
    );
  }
}
