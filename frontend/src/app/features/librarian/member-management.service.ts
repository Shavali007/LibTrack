import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, switchMap, tap } from 'rxjs';
import { Page, LoanRecord, BorrowRequestRecord } from '../circulation/borrowing.service';

export interface MemberSummary {
  id: string;
  email: string;
  role: 'STUDENT' | 'FACULTY';
  enabled: boolean;
  institutionalId: string | null;
  createdAt: string;
  currentLoans: number;
  displayName?: string | null;
  department?: string | null;
}

export interface MemberDetail {
  id: string;
  email: string;
  role: 'STUDENT' | 'FACULTY';
  enabled: boolean;
  institutionalId: string | null;
  createdAt: string;
  identityVerifiedAt: string | null;
  currentLoans: LoanRecord[];
  borrowingHistory: LoanRecord[];
  borrowRequests: BorrowRequestRecord[];
  displayName?: string | null;
  department?: string | null;
}

@Injectable({ providedIn: 'root' })
export class MemberManagementService {
  private readonly http = inject(HttpClient);

  private csrf(): Observable<HttpHeaders> {
    return this.http.get<{ headerName: string; token: string }>('/api/v1/auth/csrf').pipe(
      tap(x => {
        if (!x.headerName || !x.token) throw new Error('Security token unavailable');
      }),
      switchMap(x => [new HttpHeaders().set(x.headerName, x.token)])
    );
  }

  list(q = '', role = '', enabled: boolean | null = null, department = '', page = 0, size = 15): Observable<Page<MemberSummary>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (q.trim()) params = params.set('q', q.trim());
    if (role) params = params.set('role', role);
    if (enabled !== null) params = params.set('enabled', enabled);
    if (department && department !== 'ALL' && department !== 'All Departments') {
      params = params.set('department', department);
    }
    return this.http.get<Page<MemberSummary>>('/api/v1/librarian/members', { params });
  }

  get(id: string): Observable<MemberDetail> {
    return this.http.get<MemberDetail>(`/api/v1/librarian/members/${id}`);
  }

  updateDepartment(id: string, department: string): Observable<MemberDetail> {
    return this.csrf().pipe(
      switchMap(headers => this.http.post<MemberDetail>(`/api/v1/librarian/members/${id}/department`, { department }, { headers }))
    );
  }

  enable(id: string): Observable<void> {
    return this.csrf().pipe(
      switchMap(headers => this.http.post<void>(`/api/v1/librarian/members/${id}/enable`, {}, { headers }))
    );
  }

  disable(id: string): Observable<void> {
    return this.csrf().pipe(
      switchMap(headers => this.http.post<void>(`/api/v1/librarian/members/${id}/disable`, {}, { headers }))
    );
  }
}
