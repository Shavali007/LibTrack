import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, finalize } from 'rxjs';
import { AuthService } from '../../features/auth/auth.service';
import { LibrarianOperationsService } from '../../features/librarian/librarian-operations.service';
import { MemberRequestsService } from '../../features/librarian/member-requests.service';
import { NotificationClientService, NotificationItem } from '../../features/notifications/notification.service';
import { CatalogueService } from '../../features/catalogue/catalogue.service';
import { ToastService } from './toast.component';
import { UserProfileDropdownComponent } from './user-profile-dropdown.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, FormsModule, CommonModule, UserProfileDropdownComponent],
  template: `
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <div class="app-frame" [class.reader-mode]="isReaderRoute()">
      <!-- Fixed Dark Emerald Left Sidebar matching Reference (width: ~293px) -->
      <aside class="sidebar" aria-label="Application navigation">
        <!-- Logo / Brand Lockup Card matching IMAGE 1 -->
        <div class="brand-card">
          <a class="brand-lockup" routerLink="/" aria-label="LibTrack public home">
            <span class="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" class="brand-svg">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </span>
            <span class="brand-copy">
              <strong class="brand-title">LibTrack</strong>
              <small class="brand-sub">VIT-AP Library</small>
            </span>
          </a>
        </div>

        <!-- Navigation Links -->
        <nav class="primary-nav" aria-label="Main navigation">
          @if (auth.profile()?.role === 'LIBRARIAN') {
            <!-- 1. Dashboard -->
            <a class="nav-link" routerLink="/workspace" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </span>
              <span>Dashboard</span>
            </a>

            <!-- 2. Books & Catalogue -->
            <a class="nav-link" routerLink="/workspace/books" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
              </span>
              <span>Books & Catalogue</span>
            </a>

            <!-- 3. Borrow Requests -->
            <a class="nav-link" routerLink="/workspace/librarian/requests" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </span>
              <span>Borrow Requests</span>
            </a>

            <!-- 4. Members (Expandable Group matching Mockup) -->
            <div class="nav-group" [class.is-expanded]="membersExpanded()">
              <button
                type="button"
                class="nav-link nav-group-btn"
                [class.group-active]="isMembersRouteActive()"
                (click)="toggleMembersGroup()"
                aria-label="Toggle Members navigation"
              >
                <span class="nav-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </span>
                <span class="nav-group-label">Members</span>
                <span class="nav-chevron" [class.rotated]="membersExpanded()" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </span>
              </button>

              @if (membersExpanded()) {
                <div class="nav-sub-items">
                  <a
                    class="nav-sub-link"
                    routerLink="/workspace/librarian/members"
                    routerLinkActive="active"
                    [routerLinkActiveOptions]="{ exact: true }"
                  >
                    <span class="sub-bullet">•</span>
                    <span>All Members</span>
                  </a>
                  <a
                    class="nav-sub-link"
                    routerLink="/workspace/librarian/member-requests"
                    routerLinkActive="active"
                  >
                    <span class="sub-bullet">•</span>
                    <span>Member Requests</span>
                    @if (pendingRequestsCount() > 0) {
                      <span class="sub-badge">({{ pendingRequestsCount() }})</span>
                    }
                  </a>
                </div>
              }
            </div>

            <!-- 5. Circulation Desk -->
            <a class="nav-link" routerLink="/workspace/librarian/circulation" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
              </span>
              <span>Circulation Desk</span>
            </a>

            <!-- 6. Fines -->
            <a class="nav-link" routerLink="/workspace/librarian/fines" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon font-symbol" aria-hidden="true">₹</span>
              <span>Fines</span>
            </a>

            <!-- 7. Reports -->
            <a class="nav-link" routerLink="/workspace/librarian/reports" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
              </span>
              <span>Reports</span>
            </a>

            <!-- 8. Feedback -->
            <a class="nav-link" routerLink="/workspace/librarian/feedback" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </span>
              <span>Feedback</span>
            </a>

            <!-- 9. Notifications -->
            <a class="nav-link" routerLink="/workspace/librarian/notifications" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
              </span>
              <span>Notifications</span>
              @if (unreadCount() > 0) {
                <span class="notification-dot" aria-hidden="true"></span>
              }
            </a>

            <!-- 10. Recommendations -->
            <a class="nav-link" routerLink="/workspace/recommendations" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                </svg>
              </span>
              <span>Recommendations</span>
            </a>

            <!-- 11. Library Policies -->
            <a class="nav-link" routerLink="/workspace/library-policies" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
              </span>
              <span>Library Policies</span>
            </a>

            <!-- 11. Settings -->
            <a class="nav-link" routerLink="/workspace/librarian/settings" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </span>
              <span>Settings</span>
            </a>
          } @else if (auth.profile()?.role === 'FACULTY') {
            <!-- Faculty Navigation (8 items: No Reservations) -->
            <!-- 1. Dashboard -->
            <a class="nav-link" routerLink="/workspace" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </span>
              <span>Dashboard</span>
            </a>

            <!-- 2. Books & Catalogue -->
            <a class="nav-link" routerLink="/workspace/books" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
              </span>
              <span>Books & Catalogue</span>
            </a>

            <!-- 3. Borrow Requests -->
            <a class="nav-link" routerLink="/workspace/my/requests" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </span>
              <span>Borrow Requests</span>
            </a>

            <!-- 4. My Books -->
            <a class="nav-link" routerLink="/workspace/my/borrowings" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
              </span>
              <span>My Books</span>
            </a>

            <!-- 5. My Wishlist -->
            <a class="nav-link" routerLink="/workspace/wishlist" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
              </span>
              <span>My Wishlist</span>
            </a>

            <!-- 6. Recommendations -->
            <a class="nav-link" routerLink="/workspace/recommendations" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                </svg>
              </span>
              <span>Recommendations</span>
            </a>

            <!-- 7. Library Policies -->
            <a class="nav-link" routerLink="/workspace/library-policies" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
              </span>
              <span>Library Policies</span>
            </a>

            <!-- 8. Fines -->
            <a class="nav-link" routerLink="/workspace/my/fines" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 3h12"></path>
                  <path d="M6 8h12"></path>
                  <path d="m6 13 8.5 8"></path>
                  <path d="M6 13h3a4 4 0 0 0 0-8"></path>
                </svg>
              </span>
              <span>Fines</span>
            </a>

            <!-- 9. Notifications -->
            <a class="nav-link" routerLink="/workspace/notifications" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
              </span>
              <span>Notifications</span>
              @if (unreadCount() > 0) {
                <span class="sidebar-badge-count">{{ unreadCount() }}</span>
              }
            </a>
            <!-- Settings -->
            <a class="nav-link" routerLink="/workspace/settings" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </span>
              <span>Settings</span>
            </a>
          } @else {
            <!-- Student Navigation (9 items in hierarchy) -->
            <!-- 1. Dashboard -->
            <a class="nav-link" routerLink="/workspace" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </span>
              <span>Dashboard</span>
            </a>

            <!-- 2. Books & Catalogue -->
            <a class="nav-link" routerLink="/workspace/books" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
              </span>
              <span>Books & Catalogue</span>
            </a>

            <!-- 3. Borrow Requests -->
            <a class="nav-link" routerLink="/workspace/my/requests" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </span>
              <span>Borrow Requests</span>
            </a>

            <!-- 4. My Books -->
            <a class="nav-link" routerLink="/workspace/my/borrowings" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
              </span>
              <span>My Books</span>
            </a>

            <!-- 5. My Wishlist -->
            <a class="nav-link" routerLink="/workspace/wishlist" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
              </span>
              <span>My Wishlist</span>
            </a>

            <!-- 6. Reservations (Student Only) -->
            <a class="nav-link" routerLink="/workspace/my/reservations" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </span>
              <span>Reservations</span>
            </a>

            <!-- 7. Recommendations -->
            <a class="nav-link" routerLink="/workspace/recommendations" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                </svg>
              </span>
              <span>Recommendations</span>
            </a>

            <!-- 8. Library Policies -->
            <a class="nav-link" routerLink="/workspace/library-policies" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
              </span>
              <span>Library Policies</span>
            </a>

            <!-- 9. Fines -->
            <a class="nav-link" routerLink="/workspace/my/fines" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 3h12"></path>
                  <path d="M6 8h12"></path>
                  <path d="m6 13 8.5 8"></path>
                  <path d="M6 13h3a4 4 0 0 0 0-8"></path>
                </svg>
              </span>
              <span>Fines</span>
            </a>

            <!-- 10. Notifications -->
            <a class="nav-link" routerLink="/workspace/notifications" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
              </span>
              <span>Notifications</span>
              @if (unreadCount() > 0) {
                <span class="sidebar-badge-count">{{ unreadCount() }}</span>
              }
            </a>
            <!-- Settings -->
            <a class="nav-link" routerLink="/workspace/settings" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </span>
              <span>Settings</span>
            </a>
          }
        </nav>

        <!-- Bottom Academic Promo Card matching IMAGE 1 -->
        <div class="sidebar-bottom-card" aria-hidden="true">
          <div class="bottom-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
          </div>
          <div class="bottom-copy">
            <p>Read</p>
            <p>Learn</p>
            <p>Grow Together</p>
          </div>
        </div>
      </aside>

      <!-- Main Workspace -->
      <div class="workspace">
        <!-- Clean White Top Header matching IMAGE 1 (height: ~74px) -->
        <header class="topbar">
          <!-- Search input with icon and Ctrl+K badge (~670px wide) -->
          <div class="topbar-search-wrap">
            <div class="search-lens-box" aria-hidden="true">
              <svg class="search-lens-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <input
              #searchInput
              type="search"
              [(ngModel)]="searchQuery"
              (keyup.enter)="onSearchSubmit()"
              placeholder="Search books by title, author, subject or ISBN..."
              aria-label="Search books"
              class="topbar-search-input"
            />
            <kbd class="shortcut-pill" (click)="focusSearch(searchInput)">Ctrl K</kbd>
          </div>

          <!-- Right Area: Notifications & User Profile -->
          <div class="topbar-right">
            <!-- Global Home Button -->
            <a
              routerLink="/"
              class="topbar-home-btn"
              aria-label="Home"
              title="Return to Public Home"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="home-icon" aria-hidden="true">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <span class="home-text">Home</span>
            </a>

            <!-- Notification Bell Quick Access Dropdown -->
            <div class="topbar-bell-menu">
              <button
                type="button"
                class="topbar-bell-btn"
                (click)="toggleNotificationDropdown($event)"
                [attr.aria-expanded]="notifDropdownOpen()"
                [title]="unreadBadgeText + ' unread notifications'"
                aria-label="Notifications quick access"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="bell-svg">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                @if (unreadCount() > 0) {
                  <span class="bell-badge">{{ unreadBadgeText }}</span>
                }
              </button>

              @if (notifDropdownOpen()) {
                <div class="notif-dropdown-card surface-card" (click)="$event.stopPropagation()" role="region" aria-label="Notifications preview">
                  <div class="nd-header">
                    <div class="nd-title-row">
                      <strong class="nd-heading">Notifications</strong>
                      @if (unreadCount() > 0) {
                        <span class="nd-count-pill">{{ unreadCount() }} unread</span>
                      }
                    </div>
                    <div class="nd-header-actions">
                      <button
                        type="button"
                        class="nd-action-btn"
                        (click)="markAllDropdownRead()"
                        [disabled]="unreadCount() === 0 || notifPending()"
                      >
                        ✓ Mark all as read
                      </button>
                    </div>
                  </div>

                  <div class="nd-body">
                    @if (notifLoading()) {
                      <div class="nd-loading">
                        <p>Loading notifications…</p>
                      </div>
                    } @else if (dropdownNotifications().length === 0) {
                      <div class="nd-empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="nd-empty-svg">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        <p>No notifications right now.</p>
                      </div>
                    } @else {
                      <div class="nd-items-list">
                        @for (item of dropdownNotifications(); track item.id) {
                          <div
                            class="nd-item"
                            [class.nd-item-unread]="!isItemRead(item)"
                            (click)="onDropdownItemClick(item)"
                            tabindex="0"
                            (keydown.enter)="onDropdownItemClick(item)"
                          >
                            <div class="nd-item-icon" [ngClass]="'icon-' + getNotifCategoryIcon(item)">
                              @switch (getNotifCategoryIcon(item)) {
                                @case ('calendar') {
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                  </svg>
                                }
                                @case ('check-circle') {
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                  </svg>
                                }
                                @case ('arrow-return') {
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="9 14 4 9 9 4"></polyline>
                                    <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                                  </svg>
                                }
                                @case ('alert-triangle') {
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                    <line x1="12" y1="9" x2="12" y2="13"></line>
                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                  </svg>
                                }
                                @case ('star') {
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                  </svg>
                                }
                                @default {
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                                  </svg>
                                }
                              }
                            </div>
                            <div class="nd-item-details">
                              <div class="nd-item-top">
                                <span class="nd-item-title">{{ item.title }}</span>
                                @if (!isItemRead(item)) {
                                  <span class="nd-dot" aria-hidden="true">•</span>
                                }
                                <time class="nd-item-time">{{ getRelativeTime(item.createdAt) }}</time>
                              </div>
                              <p class="nd-item-msg">{{ item.message }}</p>
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>

                  <div class="nd-footer">
                    <a
                      [routerLink]="'/workspace/notifications'"
                      class="nd-view-all"
                      (click)="closeNotifDropdown()"
                    >
                      View all notifications →
                    </a>
                  </div>
                </div>
              }
            </div>

            <!-- Reusable Profile Dropdown Component -->
            <app-user-profile-dropdown />
          </div>
        </header>

        <!-- Main Content Viewport (horizontal padding: ~46px) -->
        <main class="main-content" id="main-content" tabindex="-1">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: #FAF9F6; }
    .app-frame {
      display: flex;
      min-height: 100vh;
      background: #FAF9F6;
    }

    /* Fixed Dark Emerald Sidebar (Width: ~293px) */
    .sidebar {
      position: fixed;
      inset: 0 auto 0 0;
      z-index: 40;
      display: flex;
      width: 293px;
      flex-direction: column;
      padding: 1.15rem 0.95rem 1.15rem;
      background: linear-gradient(180deg, #003D30 0%, #00372B 50%, #002F26 100%);
      color: #F5F8F5;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
      box-shadow: 2px 0 12px rgba(0, 0, 0, 0.08);
      position: fixed;
    }
    .sidebar::before {
      content: "";
      position: absolute;
      inset: 0;
      background-image: radial-gradient(circle at 100% 70%, rgba(255, 255, 255, 0.04) 0%, transparent 55%);
      pointer-events: none;
    }

    /* Brand Header in Sidebar matching IMAGE 1 */
    .brand-card {
      background: #FFFFFF;
      border-radius: 12px;
      padding: 0.95rem 1.15rem;
      margin: 0.15rem 0.25rem 1.5rem;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
      flex-shrink: 0;
    }
    .brand-lockup {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      text-decoration: none;
    }
    .brand-mark {
      display: grid;
      place-items: center;
      color: #003D30;
      flex-shrink: 0;
    }
    .brand-svg {
      width: 2rem;
      height: 2rem;
    }
    .brand-copy {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }
    .brand-title {
      font-family: var(--font-serif);
      font-size: 1.4rem;
      font-weight: 700;
      color: #003D30;
      letter-spacing: -0.01em;
    }
    .brand-sub {
      color: #5A6B63;
      font-size: 0.8rem;
      font-weight: 500;
    }

    /* Primary Nav List */
    .primary-nav {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      flex: 1;
      flex-shrink: 0;
    }

    .nav-link {
      position: relative;
      display: flex;
      min-height: 2.85rem;
      align-items: center;
      gap: 0.85rem;
      padding: 0.6rem 1.15rem;
      border-radius: 10px;
      color: #FFFFFF;
      font-size: 15.5px;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .nav-link:hover {
      color: #FFFFFF;
      background: #104C3E;
    }

    .nav-link.active {
      background: #105B48;
      border: 1px solid #16765C;
      color: #FFFFFF;
      font-weight: 600;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    }

    .nav-group {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .nav-group-btn {
      width: 100%;
      border: 0;
      background: transparent;
      cursor: pointer;
      text-align: left;
    }

    .nav-group-btn.group-active {
      background: #104C3E;
      color: #FFFFFF;
    }

    .nav-group-label {
      flex: 1;
    }

    .nav-chevron {
      display: grid;
      place-items: center;
      width: 1rem;
      height: 1rem;
      color: rgba(255, 255, 255, 0.7);
      transition: transform 0.2s ease;
    }

    .nav-chevron.rotated {
      transform: rotate(180deg);
    }

    .nav-chevron svg {
      width: 1rem;
      height: 1rem;
    }

    .nav-sub-items {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      padding-left: 1.5rem;
      margin-top: 0.15rem;
      margin-bottom: 0.35rem;
    }

    .nav-sub-link {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.5rem 0.95rem;
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.82);
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .nav-sub-link:hover {
      color: #FFFFFF;
      background: #104C3E;
    }

    .nav-sub-link.active {
      background: #105B48;
      color: #FFFFFF;
      font-weight: 600;
      box-shadow: inset 0 0 0 1px #16765C;
    }

    .sub-bullet {
      font-size: 1.1rem;
      line-height: 1;
      opacity: 0.85;
    }

    .sub-badge {
      font-size: 0.75rem;
      font-weight: 700;
      color: #6ee7b7;
      margin-left: 0.35rem;
    }

    .nav-icon {
      width: 1.25rem;
      height: 1.25rem;
      display: grid;
      place-items: center;
      color: #FFFFFF;
      flex-shrink: 0;
    }
    .nav-icon svg {
      width: 1.25rem;
      height: 1.25rem;
    }
    .font-symbol {
      font-size: 1.35rem;
      font-weight: 700;
      line-height: 1;
    }

    .notification-dot {
      margin-left: auto;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #E53935;
      box-shadow: 0 0 0 2px #003D30;
    }

    .sidebar-badge-count {
      margin-left: auto;
      background: #E5A93C;
      color: #1A1A1A;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.1rem 0.48rem;
      border-radius: 9999px;
      line-height: 1.2;
    }

    /* Sidebar bottom promo card matching IMAGE 1 */
    .sidebar-bottom-card {
      margin-top: auto;
      margin-bottom: 0.25rem;
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 1rem 1.15rem;
      border-radius: 12px;
      background: rgba(0, 47, 38, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #FFFFFF;
      flex-shrink: 0;
    }
    .bottom-icon svg {
      width: 1.85rem;
      height: 1.85rem;
      color: #FFFFFF;
      flex-shrink: 0;
    }
    .bottom-copy p {
      margin: 0;
      font-size: 0.82rem;
      line-height: 1.35;
      color: #D1E3DC;
    }
    .bottom-copy p:last-child {
      color: #FFFFFF;
      font-weight: 600;
    }

    /* Workspace */
    .workspace {
      flex: 1;
      margin-left: 293px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: #FAF9F6;
    }

    /* Clean White Topbar matching IMAGE 1 (Height: ~74px) */
    .topbar {
      position: sticky;
      top: 0;
      z-index: 30;
      display: flex;
      height: 74px;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      padding: 0 46px;
      background: #FFFFFF;
      border-bottom: 1px solid #E5E8E2;
    }

    /* Global Search Box in Topbar (~670px wide) - Robust Flex Layout */
    .topbar-search-wrap {
      display: flex;
      align-items: center;
      width: 100%;
      max-width: 670px;
      height: 44px;
      padding: 0 0.85rem;
      gap: 0.75rem;
      border: 1px solid #E5E8E2;
      border-radius: 8px;
      background: #FAF9F6;
      transition: all 0.15s ease;
      box-sizing: border-box;
    }
    .topbar-search-wrap:focus-within {
      background: #FFFFFF;
      border-color: #003D30;
      box-shadow: 0 0 0 3px rgba(0, 61, 48, 0.1);
    }
    .search-lens-box {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.25rem;
      height: 1.25rem;
      flex-shrink: 0;
      color: #718096;
      pointer-events: none;
    }
    .search-lens-svg {
      width: 1.15rem;
      height: 1.15rem;
    }
    .topbar-search-wrap input.topbar-search-input {
      flex: 1;
      min-width: 0;
      height: 100%;
      min-height: unset;
      border: none !important;
      background: transparent !important;
      padding: 0 !important;
      margin: 0 !important;
      outline: none !important;
      box-shadow: none !important;
      font-size: 14.5px;
      color: #2D3748;
    }
    .topbar-search-wrap input.topbar-search-input::placeholder {
      color: #718096;
    }
    .shortcut-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.2rem 0.55rem;
      border-radius: 4px;
      border: 1px solid #CBD5E0;
      background: #FFFFFF;
      color: #718096;
      font-size: 12px;
      font-family: inherit;
      font-weight: 600;
      cursor: pointer;
      flex-shrink: 0;
      white-space: nowrap;
      margin-left: auto;
    }

    /* Topbar Right Area */
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    /* Global Home Pill Button */
    .topbar-home-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      height: 2.4rem;
      min-height: 2.4rem;
      padding: 0 0.95rem;
      border-radius: 9999px;
      background: #FAF9F6;
      border: 1px solid #E5E8E2;
      color: #003D30;
      font-family: var(--font-sans);
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1;
      text-decoration: none;
      box-sizing: border-box;
      flex-shrink: 0;
      cursor: pointer;
      transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
    }
    .topbar-home-btn:hover {
      background: #EAF2EF;
      border-color: #C2D6CF;
      color: #002B22;
    }
    .topbar-home-btn:focus-visible {
      outline: 2px solid #003D30;
      outline-offset: 2px;
    }
    .topbar-home-btn .home-icon {
      width: 1.15rem;
      height: 1.15rem;
      flex-shrink: 0;
    }
    .topbar-home-btn .home-text {
      font-size: 0.875rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    .topbar-bell-btn {
      position: relative;
      display: grid;
      width: 2.4rem;
      height: 2.4rem;
      place-items: center;
      border-radius: 50%;
      color: #4A5568;
      text-decoration: none;
      transition: background-color 0.15s ease;
    }
    .topbar-bell-btn:hover {
      background: #F1F3EE;
      color: #1A202C;
    }
    .bell-svg {
      width: 1.35rem;
      height: 1.35rem;
    }
    .bell-badge {
      position: absolute;
      top: 3px;
      right: 3px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: 8px;
      background: #E53935;
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 700;
      display: grid;
      place-items: center;
      line-height: 1;
    }

    /* Notification Bell Dropdown */
    .topbar-bell-menu {
      position: relative;
    }
    .notif-dropdown-card {
      position: absolute;
      top: calc(100% + 0.65rem);
      right: 0;
      width: 380px;
      max-width: 90vw;
      background: #FFFFFF;
      border: 1px solid #E5E0D5;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
      z-index: 100;
      overflow: hidden;
      animation: fadeIn 0.15s ease-out;
    }
    .nd-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #EFECE6;
      background: #FDFCF9;
    }
    .nd-title-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .nd-heading {
      font-size: 0.9375rem;
      color: #1F2421;
    }
    .nd-count-pill {
      font-size: 0.72rem;
      font-weight: 600;
      background: #EAF2EF;
      color: #003D30;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
    }
    .nd-action-btn {
      background: none;
      border: none;
      font-size: 0.75rem;
      font-weight: 600;
      color: #003D30;
      cursor: pointer;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
    }
    .nd-action-btn:hover:not(:disabled) {
      background: #EAF2EF;
    }
    .nd-action-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .nd-body {
      max-height: 380px;
      overflow-y: auto;
    }
    .nd-loading, .nd-empty {
      padding: 2rem 1rem;
      text-align: center;
      color: #718096;
      font-size: 0.84375rem;
    }
    .nd-empty-svg {
      width: 32px;
      height: 32px;
      margin-bottom: 0.5rem;
      color: #A0AEC0;
    }
    .nd-items-list {
      display: flex;
      flex-direction: column;
    }
    .nd-item {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #F6F4EE;
      cursor: pointer;
      transition: background 0.15s ease;
      outline: none;
    }
    .nd-item:hover {
      background: #F9F8F5;
    }
    .nd-item.nd-item-unread {
      background: #F4F8F6;
    }
    .nd-item-icon {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .nd-item-icon svg {
      width: 17px;
      height: 17px;
    }
    .nd-item-icon.icon-book, .nd-item-icon.icon-book-due, .nd-item-icon.icon-book-open { background: #EAF2EF; color: #003D30; }
    .nd-item-icon.icon-calendar { background: #F0EBF8; color: #6D28D9; }
    .nd-item-icon.icon-check-circle { background: #ECFDF5; color: #059669; }
    .nd-item-icon.icon-arrow-return { background: #FFF4EB; color: #EA580C; }
    .nd-item-icon.icon-alert-triangle { background: #FEE2E2; color: #DC2626; }
    .nd-item-icon.icon-star { background: #FEF9C3; color: #D97706; }
    .nd-item-details {
      min-width: 0;
    }
    .nd-item-top {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin-bottom: 0.15rem;
    }
    .nd-item-title {
      font-size: 0.84375rem;
      font-weight: 600;
      color: #1F2421;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .nd-dot {
      color: #DC2626;
      font-size: 1rem;
      line-height: 1;
    }
    .nd-item-time {
      margin-left: auto;
      font-size: 0.7rem;
      color: #718096;
      white-space: nowrap;
    }
    .nd-item-msg {
      font-size: 0.78125rem;
      color: #4A5568;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .nd-footer {
      padding: 0.65rem 1rem;
      border-top: 1px solid #EFECE6;
      background: #FDFCF9;
      text-align: center;
    }
    .nd-view-all {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #003D30;
      text-decoration: none;
    }
    .nd-view-all:hover {
      text-decoration: underline;
    }

    /* Main Content Area (Horizontal padding: ~44px, Vertical padding: 24px top / 28px bottom) */
    .main-content {
      padding: 24px 44px 28px;
      width: 100%;
      background: #FAF9F6;
    }

    /* Responsive */
    @media (max-width: 900px) {
      .sidebar {
        width: 60px;
        padding: 0.85rem 0.4rem;
      }
      .brand-card {
        padding: 0.5rem;
        margin: 0.15rem 0 1.25rem;
        display: flex;
        justify-content: center;
      }
      .brand-lockup {
        justify-content: center;
      }
      .brand-copy, .nav-link span:not(.nav-icon), .sidebar-bottom-card, .user-text, .sidebar-badge-count, .notification-dot, .nav-group-label, .nav-chevron, .nav-sub-items {
        display: none !important;
      }
      .nav-link {
        justify-content: center;
        padding: 0.6rem 0;
      }
      .workspace {
        margin-left: 60px;
      }
      .topbar {
        padding: 0 1rem;
        gap: 0.85rem;
      }
      .topbar-right {
        gap: 0.85rem;
      }
      .main-content {
        padding: 1.25rem 1rem 2rem;
      }
    }
    @media (max-width: 640px) {
      .topbar {
        gap: 0.5rem;
      }
      .topbar-right {
        gap: 0.5rem;
      }
      .topbar-home-btn {
        width: 2.4rem;
        padding: 0;
        border-radius: 50%;
      }
      .topbar-home-btn .home-text {
        display: none;
      }
    }
    /* Immersive Reader Workspace Mode */
    .app-frame.reader-mode .sidebar {
      display: none !important;
    }
    .app-frame.reader-mode .workspace {
      margin-left: 0 !important;
      width: 100vw !important;
      min-height: 100vh !important;
      height: 100vh !important;
      overflow: hidden !important;
      background: transparent !important;
    }
    .app-frame.reader-mode .topbar {
      display: none !important;
    }
    .app-frame.reader-mode .main-content {
      padding: 0 !important;
      max-width: 100% !important;
      height: 100vh !important;
      overflow: hidden !important;
      background: transparent !important;
    }
  `]
})
export class AppShellComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ops = inject(LibrarianOperationsService);
  private readonly memberRequestsService = inject(MemberRequestsService);
  readonly notifService = inject(NotificationClientService);
  private readonly catalogueService = inject(CatalogueService);
  private readonly toastService = inject(ToastService);

  readonly pending = signal(false);
  readonly userMenuOpen = signal(false);
  readonly notifDropdownOpen = signal(false);
  readonly notifLoading = signal(false);
  readonly notifPending = signal(false);
  readonly dropdownNotifications = signal<NotificationItem[]>([]);
  readonly pendingRequestsCount = signal(0);
  readonly membersExpanded = signal(true);
  readonly isReaderRoute = signal(false);
  searchQuery = '';

  get unreadCount() {
    return this.notifService.unreadCount;
  }

  get unreadBadgeText(): string {
    const c = this.unreadCount();
    return c > 99 ? '99+' : c.toString();
  }

  toggleNotificationDropdown(event: Event): void {
    event.stopPropagation();
    if (this.notifDropdownOpen()) {
      this.closeNotifDropdown();
    } else {
      this.openNotifDropdown();
    }
  }

  openNotifDropdown(): void {
    this.userMenuOpen.set(false);
    this.notifDropdownOpen.set(true);
    this.notifLoading.set(true);
    this.notifService.getLatestDropdown(5).subscribe({
      next: (items) => {
        this.dropdownNotifications.set(items);
        this.notifLoading.set(false);
      },
      error: () => {
        this.notifLoading.set(false);
      }
    });
  }

  closeNotifDropdown(): void {
    this.notifDropdownOpen.set(false);
  }

  markAllDropdownRead(): void {
    this.notifPending.set(true);
    this.notifService.markAllAsRead().subscribe({
      next: () => {
        this.notifPending.set(false);
        this.dropdownNotifications.update((items) =>
          items.map((i) => ({ ...i, read: true, isRead: true }))
        );
      },
      error: () => this.notifPending.set(false)
    });
  }

  onDropdownItemClick(item: NotificationItem): void {
    if (!this.isItemRead(item)) {
      this.notifService.markAsRead(item.id).subscribe();
    }
    this.closeNotifDropdown();

    const bookId = item.relatedEntityType === 'BOOK'
      ? (item.relatedEntityId || item.metadata?.bookId)
      : (item.metadata?.bookId || (item.actionRoute?.startsWith('/workspace/books/') ? item.actionRoute.replace('/workspace/books/', '') : null));

    if (bookId) {
      this.catalogueService.get(bookId).subscribe({
        next: (b) => {
          if (b && b.active) {
            void this.router.navigate(['/workspace/books', bookId]);
          } else {
            this.toastService.show('This book is currently unavailable in the library catalogue.', 'warning');
          }
        },
        error: () => {
          this.toastService.show('This book is currently unavailable in the library catalogue.', 'warning');
        }
      });
      return;
    }

    if (item.actionRoute) {
      void this.router.navigateByUrl(item.actionRoute);
    } else {
      void this.router.navigate(['/workspace/notifications']);
    }
  }

  isItemRead(item: NotificationItem): boolean {
    return item.isRead ?? item.read ?? false;
  }

  getNotifCategoryIcon(item: NotificationItem): string {
    return this.notifService.getCategoryIcon(item.category, item.title);
  }

  getRelativeTime(dateStr: string): string {
    return this.notifService.getRelativeTime(dateStr);
  }

  toggleMembersGroup(): void {
    this.membersExpanded.update((v) => !v);
  }

  isMembersRouteActive(): boolean {
    return this.router.url.includes('/workspace/librarian/member');
  }

  @HostListener('document:keydown', ['$event'])
  handleGlobalShortcuts(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      const input = document.querySelector('.topbar-search-input') as HTMLInputElement;
      if (input) input.focus();
    }
    if (event.key === 'Escape') {
      if (this.notifDropdownOpen()) this.notifDropdownOpen.set(false);
      if (this.userMenuOpen()) this.userMenuOpen.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  handleOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-profile-menu') && this.userMenuOpen()) {
      this.userMenuOpen.set(false);
    }
    if (!target.closest('.topbar-bell-menu') && this.notifDropdownOpen()) {
      this.notifDropdownOpen.set(false);
    }
  }

  ngOnInit(): void {
    this.isReaderRoute.set(this.router.url.includes('/read'));
    this.loadUnreadNotifications();
    if (this.auth.profile()?.role === 'LIBRARIAN') {
      this.loadPendingRequestsCount();
    }
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe((event) => {
      this.isReaderRoute.set(event.urlAfterRedirects.includes('/read') || this.router.url.includes('/read'));
      this.loadUnreadNotifications();
      if (this.auth.profile()?.role === 'LIBRARIAN') {
        this.loadPendingRequestsCount();
      }
    });
  }

  loadPendingRequestsCount(): void {
    this.memberRequestsService.getCounts().subscribe({
      next: (counts) => this.pendingRequestsCount.set(counts.pending),
      error: () => {}
    });
  }

  get initials(): string {
    const role = this.auth.profile()?.role;
    if (role === 'STUDENT') return 'S';
    if (role === 'FACULTY') return 'F';
    const profile = this.auth.profile();
    if (profile?.displayName) {
      return profile.displayName.charAt(0).toUpperCase();
    }
    const email = profile?.email || '';
    if (!email) return 'U';
    if (role === 'LIBRARIAN') return 'S';
    return email.slice(0, 1).toUpperCase();
  }

  get userDisplayName(): string {
    const role = this.auth.profile()?.role;
    if (role === 'STUDENT') return 'Student';
    if (role === 'FACULTY') return 'Faculty';
    return this.auth.profile()?.displayName || this.roleHeading;
  }

  get roleHeading(): string {
    const role = this.auth.profile()?.role;
    if (role === 'LIBRARIAN') return 'Librarian';
    if (role === 'FACULTY') return 'Faculty Member';
    return 'Student';
  }

  get roleSubheading(): string {
    const role = this.auth.profile()?.role;
    if (role === 'STUDENT' || role === 'FACULTY') return '';
    const profile = this.auth.profile();
    if (role === 'LIBRARIAN') return 'Library Administrator';
    if (profile?.displayName) return this.roleHeading;
    return profile?.email || '';
  }

  loadUnreadNotifications(): void {
    this.notifService.refreshCounts();
  }

  focusSearch(input: HTMLInputElement): void {
    input.focus();
  }

  onSearchSubmit(): void {
    const q = this.searchQuery.trim();
    void this.router.navigate(['/workspace/books'], {
      queryParams: { q: q || null },
      queryParamsHandling: 'merge'
    });
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
  }

  signOut(): void {
    this.pending.set(true);
    this.auth.logout().pipe(finalize(() => this.pending.set(false))).subscribe({
      next: () => void this.router.navigate(['/'])
    });
  }
}
