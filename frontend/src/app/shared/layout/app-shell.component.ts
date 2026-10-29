import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../features/auth/auth.service';
import { BorrowingService } from '../../features/circulation/borrowing.service';
import { LibrarianOperationsService } from '../../features/librarian/librarian-operations.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, FormsModule],
  template: `
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <div class="app-frame">
      <!-- Sidebar matching mockup -->
      <aside class="sidebar" aria-label="Application navigation">
        <a class="brand-lockup" routerLink="/" aria-label="LibTrack public home">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="brand-svg">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </span>
          <span class="brand-copy">
            <strong>LibTrack</strong>
            <small>VIT-AP Library</small>
          </span>
        </a>

        <nav class="primary-nav" aria-label="Main navigation">
          @if (auth.profile()?.role === 'LIBRARIAN') {
            <!-- Librarian Navigation matching reference image -->
            <a class="nav-link" routerLink="/workspace" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">⌂</span>
              <span>Dashboard</span>
            </a>
            <a class="nav-link" routerLink="/workspace/books" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">▤</span>
              <span>Books & Copies</span>
            </a>
            <a class="nav-link" routerLink="/workspace/librarian/members" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">👥</span>
              <span>Members</span>
            </a>
            <a class="nav-link" routerLink="/workspace/librarian/requests" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">≡</span>
              <span>Borrow Requests</span>
            </a>
            <a class="nav-link" routerLink="/workspace/librarian/circulation" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">↔</span>
              <span>Circulation Desk</span>
            </a>
            <a class="nav-link" routerLink="/workspace/librarian/fines" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">₹</span>
              <span>Fines</span>
            </a>
            <a class="nav-link" routerLink="/workspace/librarian/reports" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">◫</span>
              <span>Reports</span>
            </a>
            <a class="nav-link" routerLink="/workspace/librarian/feedback" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">💬</span>
              <span>Feedback</span>
            </a>
            <a class="nav-link" routerLink="/workspace/librarian/notifications" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">🔔</span>
              <span>Notifications</span>
              @if (unreadCount() > 0) {
                <span class="nav-badge">{{ unreadCount() }}</span>
              }
            </a>
            <a class="nav-link" routerLink="/workspace/librarian/settings" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">⚙</span>
              <span>Settings</span>
            </a>
          } @else {
            <!-- Student / Faculty Navigation -->
            <span class="nav-section-label">WORKSPACE</span>
            <a class="nav-link" routerLink="/workspace" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">⌂</span>
              <span>Overview</span>
            </a>
            <a class="nav-link" routerLink="/workspace/books" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">⌕</span>
              <span>Search books</span>
            </a>
            <a class="nav-link" routerLink="/workspace/my/borrowings" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">↗</span>
              <span>My borrowings</span>
            </a>
            <a class="nav-link" routerLink="/workspace/my/requests" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">≡</span>
              <span>My requests</span>
            </a>
            <a class="nav-link" routerLink="/workspace/my/fines" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">₹</span>
              <span>My fines</span>
            </a>
            <a class="nav-link" routerLink="/workspace/my/feedback" routerLinkActive="active" ariaCurrentWhenActive="page">
              <span class="nav-icon" aria-hidden="true">💬</span>
              <span>Feedback</span>
            </a>
          }
        </nav>

        @if (auth.profile()?.role === 'LIBRARIAN') {
          <!-- Promotional Promo Card from mockup -->
          <div class="sidebar-promo-card">
            <div class="promo-content">
              <h3>Manage Resources.</h3>
              <h3>Empower Readers.</h3>
            </div>
            <div class="promo-art" aria-hidden="true">🌿</div>
          </div>
        } @else {
          <div class="sidebar-footer">
            <span class="status-dot" aria-hidden="true"></span>
            <span>Library workspace</span>
          </div>
        }
      </aside>

      <!-- Workspace Area -->
      <div class="workspace">
        <header class="topbar">
          <a class="mobile-brand" routerLink="/">LibTrack</a>

          <!-- Global Search in Topbar matching mockup -->
          <div class="topbar-search">
            <span class="topbar-search-icon" aria-hidden="true">⌕</span>
            <input
              type="search"
              [(ngModel)]="searchQuery"
              (keyup.enter)="onSearchSubmit()"
              placeholder="Search books by title, author, subject or ISBN…"
              aria-label="Search books"
            />
            <div class="category-dropdown-wrap">
              <select [(ngModel)]="searchCategory" (change)="onSearchSubmit()" aria-label="Search category">
                <option value="">All</option>
                <option value="Computing">Computing</option>
                <option value="Engineering">Engineering</option>
                <option value="Mathematics">Mathematics</option>
              </select>
            </div>
          </div>

          <!-- Account Controls on Right -->
          <div class="account-area">
            <!-- Notifications Bell -->
            <a
              routerLink="/workspace/librarian/notifications"
              class="topbar-bell-btn"
              [title]="unreadCount() + ' notifications'"
              aria-label="Notifications"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="bell-svg">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              @if (unreadCount() > 0) {
                <span class="bell-dot" aria-hidden="true"></span>
              }
            </a>

            <!-- Avatar & User Menu -->
            <div class="user-pill">
              <span class="avatar" aria-hidden="true">{{ initials }}</span>
              <div class="account-copy">
                <strong>{{ roleLabel }}</strong>
              </div>
              <button
                class="button button-quiet signout-button"
                type="button"
                (click)="signOut()"
                [disabled]="pending()"
                aria-label="Sign out of LibTrack"
              >
                {{ pending() ? 'Signing out…' : 'Sign out' }}
              </button>
            </div>
          </div>
        </header>

        @if (error()) {
          <div class="shell-alert">
            <p class="alert alert-error" role="alert">{{ error() }}</p>
          </div>
        }

        <main class="main-content" id="main-content" tabindex="-1">
          <router-outlet />
        </main>

        <footer class="workspace-footer">
          <span>LibTrack · VIT-AP Library</span>
          <span>Academic library services</span>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }
    .app-frame { min-height: 100vh; }

    /* Sidebar */
    .sidebar {
      position: fixed;
      inset: 0 auto 0 0;
      z-index: 20;
      display: flex;
      width: var(--layout-sidebar);
      flex-direction: column;
      padding: 1.25rem 0.85rem 1rem;
      border-right: 1px solid var(--color-line-200);
      background: var(--color-paper);
      overflow-y: auto;
    }
    .brand-lockup {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.25rem 0.5rem 1.4rem;
      color: var(--color-forest-950);
      text-decoration: none;
    }
    .brand-mark {
      display: grid;
      width: 2.4rem;
      height: 2.4rem;
      place-items: center;
      border-radius: 6px;
      color: white;
      background: #1b4332;
    }
    .brand-svg {
      width: 1.35rem;
      height: 1.35rem;
    }
    .brand-copy {
      display: grid;
      gap: 0.1rem;
      line-height: 1.1;
    }
    .brand-copy strong {
      font: 700 1.25rem/1 var(--font-serif);
      color: #1b4332;
    }
    .brand-copy small {
      color: var(--color-sage-700);
      font-size: 0.62rem;
      font-weight: 750;
      letter-spacing: 0.08em;
    }

    .primary-nav {
      display: grid;
      align-content: start;
      gap: 0.2rem;
    }
    .nav-section-label {
      padding: 0.6rem 0.7rem 0.3rem;
      color: var(--color-charcoal-600);
      font-size: 0.65rem;
      font-weight: 750;
      letter-spacing: 0.12em;
    }
    .nav-link {
      position: relative;
      display: flex;
      min-height: 2.45rem;
      align-items: center;
      gap: 0.75rem;
      padding: 0.45rem 0.75rem;
      border-radius: 6px;
      color: var(--color-charcoal-700);
      font-size: 0.88rem;
      font-weight: 560;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .nav-link:hover {
      color: var(--color-forest-950);
      background: #f4f5ef;
    }
    .nav-link.active {
      background: #1b4332;
      color: #ffffff;
      font-weight: 650;
    }
    .nav-link.active .nav-icon {
      color: #ffffff;
    }
    .nav-icon {
      width: 1.15rem;
      color: var(--color-sage-700);
      font-size: 1.1rem;
      text-align: center;
      display: grid;
      place-items: center;
    }
    .nav-badge {
      margin-left: auto;
      display: inline-grid;
      place-items: center;
      min-width: 1.25rem;
      height: 1.25rem;
      padding: 0 0.35rem;
      border-radius: 999px;
      background: #dc2626;
      color: white;
      font-size: 0.72rem;
      font-weight: 700;
    }

    /* Sidebar Promo Card */
    .sidebar-promo-card {
      margin-top: auto;
      padding: 1.1rem 1rem;
      border-radius: var(--radius-panel);
      background: linear-gradient(145deg, #1f2924 0%, #151d19 100%);
      color: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .promo-content h3 {
      font: 500 0.82rem/1.3 var(--font-serif);
      color: #e5ded5;
      margin: 0;
    }
    .promo-art {
      font-size: 1.4rem;
      opacity: 0.8;
    }

    .sidebar-footer {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      margin-top: auto;
      padding: 0.75rem 0.65rem 0.25rem;
      border-top: 1px solid var(--color-line-200);
      color: var(--color-charcoal-600);
      font-size: 0.75rem;
    }
    .status-dot {
      width: 0.45rem;
      height: 0.45rem;
      border-radius: 50%;
      background: var(--color-forest-700);
    }

    /* Workspace & Topbar */
    .workspace {
      min-height: 100vh;
      margin-left: var(--layout-sidebar);
    }
    .topbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      min-height: 4.25rem;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      padding: 0.5rem var(--layout-gutter);
      border-bottom: 1px solid var(--color-line-200);
      background: var(--color-paper);
    }
    .mobile-brand {
      display: none;
      color: var(--color-forest-950);
      font: 600 1.15rem var(--font-serif);
      text-decoration: none;
    }

    /* Topbar Search */
    .topbar-search {
      position: relative;
      flex: 1;
      max-width: 36rem;
      display: flex;
      align-items: center;
      background: var(--color-ivory-50);
      border: 1px solid var(--color-line-200);
      border-radius: var(--radius-control);
      transition: border-color 0.15s ease;
    }
    .topbar-search:focus-within {
      border-color: #1b4332;
      box-shadow: 0 0 0 2px rgba(27, 67, 50, 0.1);
    }
    .topbar-search-icon {
      position: absolute;
      left: 0.75rem;
      color: var(--color-sage-500);
      font-size: 1.1rem;
      pointer-events: none;
    }
    .topbar-search input {
      width: 100%;
      border: 0;
      background: transparent;
      padding: 0.6rem 0.75rem 0.6rem 2.25rem;
      font-size: 0.85rem;
      outline: none;
    }
    .category-dropdown-wrap {
      border-left: 1px solid var(--color-line-200);
      padding: 0 0.5rem;
    }
    .category-dropdown-wrap select {
      border: 0;
      background: transparent;
      font-size: 0.8rem;
      color: var(--color-charcoal-700);
      outline: none;
      cursor: pointer;
      padding: 0.35rem 0.25rem;
    }

    /* Account Area */
    .account-area {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .topbar-bell-btn {
      position: relative;
      display: grid;
      place-items: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 50%;
      color: var(--color-charcoal-700);
      text-decoration: none;
      transition: background 0.15s ease;
    }
    .topbar-bell-btn:hover {
      background: var(--color-ivory-50);
      color: var(--color-forest-950);
    }
    .bell-svg {
      width: 1.25rem;
      height: 1.25rem;
    }
    .bell-dot {
      position: absolute;
      top: 0.35rem;
      right: 0.35rem;
      width: 0.5rem;
      height: 0.5rem;
      background: #dc2626;
      border-radius: 50%;
      border: 1.5px solid white;
    }
    .user-pill {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .avatar {
      display: grid;
      width: 2.25rem;
      height: 2.25rem;
      place-items: center;
      border-radius: 50%;
      color: white;
      background: #1e3a8a;
      font-size: 0.82rem;
      font-weight: 700;
    }
    .account-copy strong {
      font-size: 0.85rem;
      color: var(--color-charcoal-900);
      text-transform: capitalize;
    }
    .signout-button {
      min-height: 2.2rem;
      font-size: 0.78rem;
    }

    .main-content {
      width: min(100%, var(--layout-content));
      min-height: calc(100vh - 8rem);
      margin: 0 auto;
      padding: clamp(1.25rem, 3vw, 2.25rem) var(--layout-gutter);
    }
    .main-content:focus { outline: none; }
    .shell-alert {
      width: min(100%, var(--layout-content));
      margin: 1rem auto 0;
      padding: 0 var(--layout-gutter);
    }
    .shell-alert p { margin: 0; }
    .workspace-footer {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem var(--layout-gutter);
      border-top: 1px solid var(--color-line-200);
      color: var(--color-charcoal-600);
      font-size: 0.75rem;
    }

    @media (max-width: 860px) {
      .sidebar {
        position: static;
        width: auto;
        padding: 0.5rem 1rem;
        border-right: 0;
        border-bottom: 1px solid var(--color-line-200);
      }
      .brand-lockup, .sidebar-promo-card, .sidebar-footer { display: none; }
      .primary-nav {
        display: flex;
        gap: 0.3rem;
        overflow-x: auto;
      }
      .nav-link {
        min-height: 2.25rem;
        white-space: nowrap;
      }
      .workspace { margin-left: 0; }
      .mobile-brand { display: inline; }
      .topbar-search { display: none; }
    }
  `]
})
export class AppShellComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly borrowingService = inject(BorrowingService);
  private readonly opsService = inject(LibrarianOperationsService);

  readonly pending = signal(false);
  readonly error = signal<string | null>(null);
  readonly unreadCount = signal(0);

  searchQuery = '';
  searchCategory = '';

  ngOnInit(): void {
    if (this.auth.profile()?.role === 'LIBRARIAN') {
      this.opsService.getUnreadCount().subscribe({
        next: (res) => this.unreadCount.set(res.unreadCount),
        error: () => {
          this.borrowingService.queue('PENDING').subscribe({
            next: (page) => this.unreadCount.set(page.totalElements),
            error: () => {}
          });
        }
      });
    }
  }

  get roleLabel(): string {
    const role = this.auth.profile()?.role;
    if (role === 'LIBRARIAN') return 'Librarian';
    if (role === 'FACULTY') return 'Faculty';
    return 'Student';
  }

  get initials(): string {
    return this.auth.profile()?.email?.slice(0, 1).toUpperCase() || 'L';
  }

  onSearchSubmit(): void {
    const query = this.searchQuery.trim();
    const queryParams: Record<string, string> = {};
    if (query) queryParams['q'] = query;
    if (this.searchCategory) queryParams['category'] = this.searchCategory;
    void this.router.navigate(['/workspace/books'], { queryParams });
  }

  signOut(): void {
    if (this.pending()) return;
    this.pending.set(true);
    this.error.set(null);
    this.auth.logout()
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/login'),
        error: () => this.error.set('Sign-out could not be confirmed. Please try again.')
      });
  }
}
