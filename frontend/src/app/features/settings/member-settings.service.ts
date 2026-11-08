import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, switchMap, tap } from 'rxjs';

export interface NotificationPreferences {
  borrowRequestUpdates: boolean;
  loanDueReminders: boolean;
  overdueFineAlerts: boolean;
  bookRecommendations: boolean;
  newBookArrivals: boolean;
  wishlistBookAlerts: boolean;
  departmentBookArrivals: boolean;
  libraryAnnouncements: boolean;
}

export interface UserSettings {
  id: string;
  displayName: string;
  username: string;
  email: string;
  institutionalId: string | null;
  department: string | null;
  designation: string | null;
  role: 'STUDENT' | 'FACULTY' | 'LIBRARIAN';
  notificationPreferences: NotificationPreferences;
}

export interface UpdateUsernameRequest {
  username: string;
}

export interface UsernameResponse {
  username: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

interface CsrfResponse {
  headerName: string;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class MemberSettingsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/users/me';

  private csrfHeaders(): Observable<HttpHeaders> {
    return this.http.get<CsrfResponse>('/api/v1/auth/csrf').pipe(
      tap((csrf) => {
        if (!csrf.token || !csrf.headerName) {
          throw new Error('The security token response was incomplete.');
        }
      }),
      switchMap((csrf) => [new HttpHeaders().set(csrf.headerName, csrf.token)])
    );
  }

  getUserSettings(): Observable<UserSettings> {
    return this.http.get<UserSettings>(`${this.baseUrl}/settings`);
  }

  updateUsername(username: string): Observable<UsernameResponse> {
    return this.csrfHeaders().pipe(
      switchMap((headers) => this.http.put<UsernameResponse>(`${this.baseUrl}/username`, { username }, { headers }))
    );
  }

  getNotificationPreferences(): Observable<NotificationPreferences> {
    return this.http.get<NotificationPreferences>(`${this.baseUrl}/notifications`);
  }

  updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Observable<NotificationPreferences> {
    return this.csrfHeaders().pipe(
      switchMap((headers) => this.http.put<NotificationPreferences>(`${this.baseUrl}/notifications`, preferences, { headers }))
    );
  }

  changePassword(request: ChangePasswordRequest): Observable<ChangePasswordResponse> {
    return this.csrfHeaders().pipe(
      switchMap((headers) => this.http.put<ChangePasswordResponse>(`${this.baseUrl}/password`, request, { headers }))
    );
  }
}
