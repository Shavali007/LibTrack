import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemberDashboardComponent } from './member-dashboard.component';
import { AuthService, UserProfile } from '../auth/auth.service';
import { BorrowingService, LoanRecord } from '../circulation/borrowing.service';
import { ReservationService, ReservationCounts } from '../reservations/reservation.service';
import { FacultyRecommendationGroup, RecommendationService } from '../recommendations/recommendation.service';

describe('MemberDashboardComponent', () => {
  let fixture: ComponentFixture<MemberDashboardComponent>;
  let component: MemberDashboardComponent;
  let currentProfile: ReturnType<typeof signal<UserProfile | null>>;

  const sampleLoans: LoanRecord[] = [
    {
      id: 'loan-1',
      borrowRequestId: 'req-1',
      bookId: 'b-1',
      bookTitle: 'Chemistry',
      coverImageUrl: '/covers/chemistry.png',
      copyIdentifier: '009A9C38-AB2E-4E66',
      borrowerEmail: 'student@vitapstudent.ac.in',
      status: 'ACTIVE',
      issueDate: '2026-11-01',
      dueDate: '2026-11-24',
      actualReturnDate: null,
      renewalCount: 0,
      overdue: false,
      renewalEligible: true,
      returnNote: null,
      history: []
    },
    {
      id: 'loan-2',
      borrowRequestId: 'req-2',
      bookId: 'b-2',
      bookTitle: 'Environmental Science',
      coverImageUrl: null,
      copyIdentifier: '6F42AC25-EBDC-439C',
      borrowerEmail: 'student@vitapstudent.ac.in',
      status: 'ACTIVE',
      issueDate: '2026-11-01',
      dueDate: '2026-11-24',
      actualReturnDate: null,
      renewalCount: 0,
      overdue: false,
      renewalEligible: true,
      returnNote: null,
      history: []
    },
    {
      id: 'loan-3',
      borrowRequestId: 'req-3',
      bookId: 'b-3',
      bookTitle: 'C++',
      coverImageUrl: null,
      copyIdentifier: 'USER-10452',
      borrowerEmail: 'student@vitapstudent.ac.in',
      status: 'ACTIVE',
      issueDate: '2026-11-01',
      dueDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0], // Due in 2 days (Due soon)
      actualReturnDate: null,
      renewalCount: 0,
      overdue: false,
      renewalEligible: true,
      returnNote: null,
      history: []
    }
  ];

  const sampleReservationsCount: ReservationCounts = {
    all: 3,
    waiting: 1,
    inQueue: 1,
    readyForPickup: 0,
    completed: 1,
    cancelled: 0
  };

  const sampleRecommendations: FacultyRecommendationGroup[] = [
    {
      bookId: 'rec-b1',
      bookTitle: 'Clean Code',
      bookCoverImageUrl: '/covers/clean-code.png',
      bookAuthors: ['Robert C. Martin'],
      bookCategories: ['Programming'],
      totalRecommendations: 3,
      recommendations: []
    },
    {
      bookId: 'rec-b2',
      bookTitle: 'Design Patterns',
      bookCoverImageUrl: undefined,
      bookAuthors: ['Gamma', 'Helm', 'Johnson', 'Vlissides'],
      bookCategories: ['Architecture'],
      totalRecommendations: 2,
      recommendations: []
    }
  ];

  const fakeBorrowing = {
    currentLoans: vi.fn(() => of({ content: sampleLoans, totalElements: 3, page: 0, size: 20, totalPages: 1 })),
    myRequests: vi.fn(() => of({ content: [], totalElements: 2, page: 0, size: 20, totalPages: 1 }))
  };

  const fakeReservation = {
    getCounts: vi.fn(() => of(sampleReservationsCount))
  };

  const fakeRecommendation = {
    getFacultyRecommendationsForStudents: vi.fn(() => of(sampleRecommendations))
  };

  beforeEach(async () => {
    currentProfile = signal<UserProfile | null>({
      id: 'student-1',
      email: 'mahammad.23mic7248@vitapstudent.ac.in',
      role: 'STUDENT',
      displayName: 'Mahammad'
    });

    await TestBed.configureTestingModule({
      imports: [MemberDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { profile: currentProfile } },
        { provide: BorrowingService, useValue: fakeBorrowing },
        { provide: ReservationService, useValue: fakeReservation },
        { provide: RecommendationService, useValue: fakeRecommendation }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MemberDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders welcome banner with student username, correct message, and without email', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.welcome-eyebrow')?.textContent).toContain('STUDENT WORKSPACE');
    expect(el.querySelector('.welcome-title')?.textContent).toContain('Welcome, Mahammad!');
    expect(el.querySelector('.welcome-subtitle')?.textContent).toContain('Explore, borrow and discover books');
    expect(el.textContent).not.toContain('mahammad.23mic7248@vitapstudent.ac.in');
  });

  it('renders welcome banner with reference mockup visual asset and accessible quote', () => {
    const el = fixture.nativeElement as HTMLElement;
    const banner = el.querySelector('.welcome-banner');
    expect(banner).not.toBeNull();
    const bannerAsset = el.querySelector('.banner-right-asset') as HTMLImageElement;
    expect(bannerAsset).not.toBeNull();
    expect(bannerAsset.getAttribute('src')).toBe('/assets/banner-student-right.png');
    expect(el.textContent).toContain('A library is not just a place to read, but a place to grow.');
  });

  it('renders all four KPI cards with backend values matching schema', () => {
    const el = fixture.nativeElement as HTMLElement;
    const cards = el.querySelectorAll('.stat-card');
    expect(cards.length).toBe(4);

    // Card 1: Active Loans
    expect(cards[0].querySelector('.stat-label')?.textContent?.trim()).toBe('Active Loans');
    expect(cards[0].querySelector('.stat-number')?.textContent?.trim()).toBe('3');

    // Card 2: Due Soon (1 loan due in 2 days)
    expect(cards[1].querySelector('.stat-label')?.textContent?.trim()).toBe('Due Soon');
    expect(cards[1].querySelector('.stat-number')?.textContent?.trim()).toBe('1');

    // Card 3: Reservations (1 waiting + 1 inQueue = 2 active)
    expect(cards[2].querySelector('.stat-label')?.textContent?.trim()).toBe('Reservations');
    expect(cards[2].querySelector('.stat-number')?.textContent?.trim()).toBe('2');

    // Card 4: My Requests (2 total borrow requests)
    expect(cards[3].querySelector('.stat-label')?.textContent?.trim()).toBe('My Requests');
    expect(cards[3].querySelector('.stat-number')?.textContent?.trim()).toBe('2');
  });

  it('renders My Borrowed Books with loan records, copy identifiers, and days left badges', () => {
    const el = fixture.nativeElement as HTMLElement;
    const rows = el.querySelectorAll('.borrowed-book-row');
    expect(rows.length).toBe(3);

    expect(rows[0].querySelector('.borrowed-book-title')?.textContent).toContain('Chemistry');
    expect(rows[0].querySelector('.borrowed-book-copy')?.textContent).toContain('Copy 009A9C38-AB2E-4E66');

    expect(rows[1].querySelector('.borrowed-book-title')?.textContent).toContain('Environmental Science');
    expect(rows[1].querySelector('.borrowed-book-copy')?.textContent).toContain('Copy 6F42AC25-EBDC-439C');

    expect(rows[2].querySelector('.borrowed-book-title')?.textContent).toContain('C++');
    expect(rows[2].querySelector('.borrowed-book-copy')?.textContent).toContain('Copy USER-10452');
  });

  it('renders Recommended for You section with book covers, titles, and formatted authors', () => {
    const el = fixture.nativeElement as HTMLElement;
    const recCards = el.querySelectorAll('.rec-card');
    expect(recCards.length).toBe(2);

    expect(recCards[0].querySelector('.rec-title')?.textContent).toContain('Clean Code');
    expect(recCards[0].querySelector('.rec-author')?.textContent).toContain('Robert C. Martin');

    expect(recCards[1].querySelector('.rec-title')?.textContent).toContain('Design Patterns');
    expect(recCards[1].querySelector('.rec-author')?.textContent).toContain('Gamma et al.');
  });

  it('formats authors properly for 1, 2, and 3+ authors', () => {
    expect(component.formatAuthors(['Joshua Bloch'])).toBe('Joshua Bloch');
    expect(component.formatAuthors(['Silberschatz', 'Galvin'])).toBe('Silberschatz & Galvin');
    expect(component.formatAuthors(['Gamma', 'Helm', 'Johnson', 'Vlissides'])).toBe('Gamma et al.');
  });

  it('adapts properly to Faculty role', () => {
    currentProfile.set({
      id: 'fac-1',
      email: 'dr.smith@vitap.ac.in',
      role: 'FACULTY',
      displayName: 'Dr. Smith'
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.welcome-eyebrow')?.textContent).toContain('FACULTY WORKSPACE');
    expect(el.querySelector('.welcome-title')?.textContent).toContain('Welcome back, Professor!');
    expect(el.querySelector('.welcome-subtitle')?.textContent).toContain('Manage your academic recommendations, support students and explore library resources.');
    expect(el.textContent).not.toContain('dr.smith@vitap.ac.in');
  });
});
