import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardStats {
  totalBooks: number;
  bookCopies: number;
  activeMembers: number;
  pendingRequests: number;
}

export interface CirculationOverviewItem {
  month: string;
  year: number;
  issued: number;
  returned: number;
}

export interface RecentActivityItem {
  id: string;
  activityType: 'ISSUED' | 'RETURNED' | 'APPROVED' | 'REJECTED';
  bookTitle: string;
  memberIdentifier: string;
  memberEmail: string;
  timestamp: string;
  details: string;
}

@Injectable({ providedIn: 'root' })
export class LibrarianDashboardService {
  private readonly http = inject(HttpClient);

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>('/api/v1/librarian/dashboard/stats');
  }

  getOverview(months = 5): Observable<CirculationOverviewItem[]> {
    return this.http.get<CirculationOverviewItem[]>(`/api/v1/librarian/dashboard/overview?months=${months}`);
  }

  getRecentActivity(limit = 5): Observable<RecentActivityItem[]> {
    return this.http.get<RecentActivityItem[]>(`/api/v1/librarian/dashboard/recent-activity?limit=${limit}`);
  }
}
