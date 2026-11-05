import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService, UserProfile } from '../../features/auth/auth.service';
import { LibrarianOperationsService } from '../../features/librarian/librarian-operations.service';
import { MemberRequestsService } from '../../features/librarian/member-requests.service';
import { NotificationClientService } from '../../features/notifications/notification.service';
import { AppShellComponent } from './app-shell.component';

describe('AppShellComponent global and sidebar navigation', () => {
  let profile: ReturnType<typeof signal<UserProfile | null>>;
  let unreadCount: ReturnType<typeof signal<number>>;

  beforeEach(() => {
    profile = signal<UserProfile | null>({ id: 'student-1', email: 'student@example.edu', role: 'STUDENT' });
    unreadCount = signal(0);
  });

  async function createComponent(): Promise<ComponentFixture<AppShellComponent>> {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { profile } },
        { provide: LibrarianOperationsService, useValue: {} },
        { provide: MemberRequestsService, useValue: { getCounts: () => of({ pending: 0, approved: 0, rejected: 0 }) } },
        {
          provide: NotificationClientService,
          useValue: {
            unreadCount,
            refreshCounts: vi.fn(),
            getLatestDropdown: () => of([]),
            markAllAsRead: () => of(undefined),
            markAsRead: () => of(undefined),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders a global Home pill button in the topbar header before the notification bell', async () => {
    const fixture = await createComponent();
    const element = fixture.nativeElement as HTMLElement;

    // Brand lockup links to public home
    expect(element.querySelector('.brand-lockup')?.getAttribute('href')).toBe('/');

    // Global Home button in topbar
    const homeBtn = element.querySelector('.topbar-right .topbar-home-btn') as HTMLAnchorElement | null;
    expect(homeBtn).not.toBeNull();
    expect(homeBtn?.getAttribute('href')).toBe('/');
    expect(homeBtn?.getAttribute('aria-label')).toBe('Home');
    expect(homeBtn?.textContent).toContain('Home');
    expect(homeBtn?.querySelector('svg.home-icon')).not.toBeNull();

    // Verify position: before the notification bell menu
    const bellMenu = element.querySelector('.topbar-right .topbar-bell-menu');
    expect(bellMenu).not.toBeNull();
    const isBefore = (homeBtn!.compareDocumentPosition(bellMenu!) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    expect(isBefore).toBe(true);

    fixture.destroy();
  });

  it('excludes Public Home and Explore Books from sidebar for STUDENT role', async () => {
    profile.set({ id: 'student-1', email: 'student@example.edu', role: 'STUDENT' });
    const fixture = await createComponent();
    const element = fixture.nativeElement as HTMLElement;

    const sidebar = element.querySelector('aside.sidebar');
    expect(sidebar).not.toBeNull();

    // Public Home and Explore Books must NOT be present in the sidebar
    expect(sidebar?.querySelector('a[aria-label="Public Home"]')).toBeNull();
    expect(sidebar?.querySelector('a[aria-label="Explore Books"]')).toBeNull();
    expect(sidebar?.textContent).not.toContain('Public Home');
    expect(sidebar?.textContent).not.toContain('Explore Books');

    fixture.destroy();
  });

  it('renders all 10 student navigation items in the exact required order for STUDENT role', async () => {
    unreadCount.set(4);
    profile.set({ id: 'student-1', email: 'student@example.edu', role: 'STUDENT' });
    const fixture = await createComponent();
    const element = fixture.nativeElement as HTMLElement;

    const navLinks = Array.from(element.querySelectorAll('aside.sidebar .primary-nav > a.nav-link')) as HTMLAnchorElement[];
    expect(navLinks).toHaveLength(10);

    const expectedItems = [
      { text: 'Dashboard', href: '/workspace' },
      { text: 'Books & Catalogue', href: '/workspace/books' },
      { text: 'Borrow Requests', href: '/workspace/my/requests' },
      { text: 'My Books', href: '/workspace/my/borrowings' },
      { text: 'My Wishlist', href: '/workspace/wishlist' },
      { text: 'Reservations', href: '/workspace/my/reservations' },
      { text: 'Recommendations', href: '/workspace/recommendations' },
      { text: 'Library Policies', href: '/workspace/library-policies' },
      { text: 'Fines', href: '/workspace/my/fines' },
      { text: 'Notifications', href: '/workspace/notifications' },
    ];

    expectedItems.forEach((expected, index) => {
      const link = navLinks[index];
      expect(link.textContent).toContain(expected.text);
      expect(link.getAttribute('href')).toBe(expected.href);
      expect(link.querySelector('svg')).not.toBeNull();
    });

    // Verify unread badge count appears on notifications link
    const notificationsLink = navLinks[9];
    const badge = notificationsLink.querySelector('.sidebar-badge-count');
    expect(badge).not.toBeNull();
    expect(badge?.textContent?.trim()).toBe('4');

    // Bottom academic promo card
    const bottomCard = element.querySelector('.sidebar-bottom-card');
    expect(bottomCard).not.toBeNull();
    expect(bottomCard?.textContent).toContain('Read');
    expect(bottomCard?.textContent).toContain('Learn');
    expect(bottomCard?.textContent).toContain('Grow Together');

    fixture.destroy();
  });

  it('excludes Public Home and Explore Books from sidebar for FACULTY role', async () => {
    profile.set({ id: 'faculty-1', email: 'faculty@example.edu', role: 'FACULTY' });
    const fixture = await createComponent();
    const element = fixture.nativeElement as HTMLElement;

    const sidebar = element.querySelector('aside.sidebar');
    expect(sidebar).not.toBeNull();

    expect(sidebar?.querySelector('a[aria-label="Public Home"]')).toBeNull();
    expect(sidebar?.querySelector('a[aria-label="Explore Books"]')).toBeNull();
    expect(sidebar?.textContent).not.toContain('Public Home');
    expect(sidebar?.textContent).not.toContain('Explore Books');

    // Global Home button remains available
    const homeBtn = element.querySelector('.topbar-home-btn');
    expect(homeBtn).not.toBeNull();

    fixture.destroy();
  });

  it('renders exactly 9 faculty navigation items in order and excludes Reservations for FACULTY role', async () => {
    unreadCount.set(2);
    profile.set({ id: 'faculty-1', email: 'faculty@example.edu', role: 'FACULTY' });
    const fixture = await createComponent();
    const element = fixture.nativeElement as HTMLElement;

    const navLinks = Array.from(element.querySelectorAll('aside.sidebar .primary-nav > a.nav-link')) as HTMLAnchorElement[];
    expect(navLinks).toHaveLength(9);

    const expectedItems = [
      { text: 'Dashboard', href: '/workspace' },
      { text: 'Books & Catalogue', href: '/workspace/books' },
      { text: 'Borrow Requests', href: '/workspace/my/requests' },
      { text: 'My Books', href: '/workspace/my/borrowings' },
      { text: 'My Wishlist', href: '/workspace/wishlist' },
      { text: 'Recommendations', href: '/workspace/recommendations' },
      { text: 'Library Policies', href: '/workspace/library-policies' },
      { text: 'Fines', href: '/workspace/my/fines' },
      { text: 'Notifications', href: '/workspace/notifications' },
    ];

    expectedItems.forEach((expected, index) => {
      const link = navLinks[index];
      expect(link.textContent).toContain(expected.text);
      expect(link.getAttribute('href')).toBe(expected.href);
      expect(link.querySelector('svg')).not.toBeNull();
    });

    // Reservations must NOT be in the faculty sidebar
    expect(element.querySelector('aside.sidebar')?.textContent).not.toContain('Reservations');
    expect(element.querySelector('aside.sidebar a[href="/workspace/my/reservations"]')).toBeNull();

    // Verify unread badge count appears on notifications link
    const notificationsLink = navLinks[8];
    const badge = notificationsLink.querySelector('.sidebar-badge-count');
    expect(badge).not.toBeNull();
    expect(badge?.textContent?.trim()).toBe('2');

    fixture.destroy();
  });

  it('excludes Public Home and Explore Books from sidebar for LIBRARIAN role', async () => {
    profile.set({ id: 'lib-1', email: 'librarian@example.edu', role: 'LIBRARIAN' });
    const fixture = await createComponent();
    const element = fixture.nativeElement as HTMLElement;

    const sidebar = element.querySelector('aside.sidebar');
    expect(sidebar).not.toBeNull();

    expect(sidebar?.querySelector('a[aria-label="Public Home"]')).toBeNull();
    expect(sidebar?.querySelector('a[aria-label="Explore Books"]')).toBeNull();
    expect(sidebar?.textContent).not.toContain('Public Home');
    expect(sidebar?.textContent).not.toContain('Explore Books');

    // Preserves standard librarian sidebar items
    expect(sidebar?.textContent).toContain('Dashboard');
    expect(sidebar?.textContent).toContain('Circulation Desk');
    expect(sidebar?.textContent).toContain('Fines');
    expect(sidebar?.textContent).toContain('Reports');
    expect(sidebar?.textContent).toContain('Settings');

    // Global Home button remains available
    const homeBtn = element.querySelector('.topbar-home-btn');
    expect(homeBtn).not.toBeNull();

    fixture.destroy();
  });

  it('verifies Fines sidebar navigation for Student, Faculty, and Librarian', async () => {
    // 1. Student
    profile.set({ id: 'student-1', email: 'student@example.edu', role: 'STUDENT' });
    const fixture = await createComponent();
    const element = fixture.nativeElement as HTMLElement;
    let finesLink = element.querySelector('aside.sidebar a[href="/workspace/my/fines"]');
    expect(finesLink).not.toBeNull();
    expect(finesLink?.textContent).toContain('Fines');

    // 2. Faculty
    profile.set({ id: 'faculty-1', email: 'faculty@example.edu', role: 'FACULTY' });
    fixture.detectChanges();
    finesLink = element.querySelector('aside.sidebar a[href="/workspace/my/fines"]');
    expect(finesLink).not.toBeNull();
    expect(finesLink?.textContent).toContain('Fines');

    // 3. Librarian
    profile.set({ id: 'lib-1', email: 'librarian@example.edu', role: 'LIBRARIAN' });
    fixture.detectChanges();
    const libFinesLink = element.querySelector('aside.sidebar a[href="/workspace/librarian/fines"]');
    expect(libFinesLink).not.toBeNull();
    expect(libFinesLink?.textContent).toContain('Fines');

    fixture.destroy();
  });
});
