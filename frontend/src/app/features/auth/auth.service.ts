import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';

export type AccountRole = 'STUDENT' | 'FACULTY' | 'LIBRARIAN';
export type ProvisionableRole = 'STUDENT' | 'FACULTY';

export interface UserProfile {
  id: string;
  email: string;
  role: AccountRole;
}

export interface ProvisionAccountRequest {
  email: string;
  institutionalId: string;
  password: string;
  role: ProvisionableRole;
  identityVerified: true;
}

interface CsrfResponse {
  headerName: string;
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = '/api/v1/auth';
  readonly profile = signal<UserProfile | null>(null);

  constructor(private readonly http: HttpClient) {}

  loadCurrentUser(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.api}/me`).pipe(
      tap((profile) => this.profile.set(profile)),
    );
  }

  login(credentials: { email: string; password: string }): Observable<UserProfile> {
    return this.csrfHeaders().pipe(
      switchMap((headers) => this.http.post<UserProfile>(`${this.api}/login`, credentials, { headers })),
      tap((profile) => this.profile.set(profile)),
    );
  }

  logout(): Observable<void> {
    return this.csrfHeaders().pipe(
      switchMap((headers) => this.http.post<void>(`${this.api}/logout`, {}, { headers })),
      tap(() => this.profile.set(null)),
    );
  }

  provisionAccount(request: ProvisionAccountRequest): Observable<UserProfile> {
    return this.csrfHeaders().pipe(
      switchMap((headers) => this.http.post<UserProfile>('/api/v1/librarian/accounts', request, { headers })),
    );
  }

  private csrfHeaders(): Observable<HttpHeaders> {
    return this.http.get<CsrfResponse>(`${this.api}/csrf`).pipe(
      tap((csrf) => {
        if (!csrf.token || !csrf.headerName) {
          throw new Error('The security token response was incomplete.');
        }
      }),
      switchMap((csrf) => [new HttpHeaders().set(csrf.headerName, csrf.token)]),
    );
  }
}
