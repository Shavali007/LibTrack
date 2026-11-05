import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService, UserProfile } from '../auth/auth.service';
import { CatalogueService } from '../catalogue/catalogue.service';
import { BorrowingService, LoanRecord } from './borrowing.service';
import { MyBorrowingsComponent } from './my-borrowings.component';

describe('MyBorrowingsComponent UI/UX Redesign', () => {
  let fixture: ComponentFixture<MyBorrowingsComponent>;
  let component: MyBorrowingsComponent;
  let profile: ReturnType<typeof signal<UserProfile | null>>;

  const mockCurrentLoans: LoanRecord[] = [
    {
      id: 'loan-1',
      borrowRequestId: 'req-1',
      bookId: 'book-1',
      bookTitle: 'Python Programming',
      coverImageUrl: 'https://example.com/python.jpg',
      copyIdentifier: 'CP-10452',
      borrowerEmail: 'student@example.edu',
      status: 'ACTIVE',
      issueDate: '2026-11-03',
      dueDate: '2026-11-23',
      actualReturnDate: null,
      renewalCount: 0,
      overdue: false,
      renewalEligible: true,
      returnNote: null,
      history: [],
      daysLeft: 20
    },
    {
      id: 'loan-2',
      borrowRequestId: 'req-2',
      bookId: 'book-2',
      bookTitle: 'Clean Code',
      coverImageUrl: 'https://example.com/cleancode.jpg',
      copyIdentifier: 'CP-10453',
      borrowerEmail: 'student@example.edu',
      status: 'ACTIVE',
      issueDate: '2026-10-28',
      dueDate: '2026-11-28',
      actualReturnDate: null,
      renewalCount: 0,
      overdue: false,
      renewalEligible: false,
      returnNote: null,
      history: [],
      daysLeft: 25
    }
  ];

  const mockPastLoans: LoanRecord[] = [
    {
      id: 'loan-3',
      borrowRequestId: 'req-3',
      bookId: 'book-3',
      bookTitle: 'Introduction to Algorithms',
      coverImageUrl: 'https://example.com/algorithms.jpg',
      copyIdentifier: 'CP-10450',
      borrowerEmail: 'student@example.edu',
      status: 'RETURNED',
      issueDate: '2026-10-01',
      dueDate: '2026-10-21',
      actualReturnDate: '2026-10-20',
      renewalCount: 1,
      overdue: false,
      renewalEligible: false,
      returnNote: 'Returned in good condition',
      history: [],
      daysLeft: 0
    }
  ];

  const mockBorrowingService = {
    currentLoans: () => of({
      content: mockCurrentLoans,
      page: 0,
      size: 20,
      totalElements: mockCurrentLoans.length,
      totalPages: 1
    }),
    loanHistory: () => of({
      content: mockPastLoans,
      page: 0,
      size: 20,
      totalElements: mockPastLoans.length,
      totalPages: 1
    }),
    renew: vi.fn(() => of({} as LoanRecord)),
    downloadLoanReceipt: vi.fn(() => of(new Blob(['pdf-data'], { type: 'application/pdf' })))
  };

  const mockCatalogueService = {
    get: (id: string) => {
      const authorsMap: Record<string, string[]> = {
        'book-1': ['Joseph'],
        'book-2': ['Robert C. Martin'],
        'book-3': ['Cormen', 'Leiserson', 'Rivest', 'Stein']
      };
      return of({
        id,
        title: 'Title',
        authors: authorsMap[id] || ['Unknown Author'],
        categories: ['Programming'],
        circulationPolicy: 'STANDARD',
        numberOfCopies: 10,
        availableCopies: 8
      });
    }
  };

  const mockHttpClient = {
    get: vi.fn((url: string) => {
      if (url === '/api/v1/policies') {
        return of({
          borrowing: {
            studentMaxBooks: 5,
            facultyMaxBooks: 8
          }
        });
      }
      return of({});
    })
  };

  beforeEach(async () => {
    profile = signal<UserProfile | null>({
      id: 'student-1',
      email: 'student@example.edu',
      role: 'STUDENT'
    });

    await TestBed.configureTestingModule({
      imports: [MyBorrowingsComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { profile } },
        { provide: BorrowingService, useValue: mockBorrowingService },
        { provide: CatalogueService, useValue: mockCatalogueService },
        { provide: HttpClient, useValue: mockHttpClient }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MyBorrowingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders page header matching the design mockup with dynamic borrow limit', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.eyebrow')?.textContent).toContain('YOUR LIBRARY');
    expect(el.querySelector('.page-title')?.textContent).toContain('My Borrowings');
    expect(el.querySelector('.page-desc')?.textContent).toContain('Current physical loans and your completed borrowing history.');
    expect(el.querySelector('.limit-badge')?.textContent).toContain('Borrow Limit: 5');
  });

  it('renders borrow limit for FACULTY role accurately from backend policy', () => {
    profile.set({ id: 'fac-1', email: 'prof@example.edu', role: 'FACULTY' });
    component.loadPolicies();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(component.borrowLimit()).toBe(8);
    expect(el.querySelector('.limit-badge')?.textContent).toContain('Borrow Limit: 8');
  });

  it('renders borrowing filter tabs with accurate dynamic counts', () => {
    const el = fixture.nativeElement as HTMLElement;
    const tabs = Array.from(el.querySelectorAll('.filter-tab')) as HTMLButtonElement[];
    expect(tabs).toHaveLength(3);

    expect(tabs[0].textContent).toContain('Current Loans (2)');
    expect(tabs[1].textContent).toContain('Past Loans (1)');
    expect(tabs[2].textContent).toContain('All (3)');

    // Default active tab is 'Current Loans'
    expect(tabs[0].classList.contains('active')).toBe(true);
  });

  it('switches between Current Loans, Past Loans, and All tabs without page reload', () => {
    const el = fixture.nativeElement as HTMLElement;
    const tabs = Array.from(el.querySelectorAll('.filter-tab')) as HTMLButtonElement[];

    // Default Current tab shows 2 cards
    let cards = el.querySelectorAll('.borrowing-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('Python Programming');
    expect(cards[1].textContent).toContain('Clean Code');

    // Click Past Loans tab
    tabs[1].click();
    fixture.detectChanges();

    expect(component.selectedTab()).toBe('PAST');
    cards = el.querySelectorAll('.borrowing-card');
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain('Introduction to Algorithms');

    // Click All tab
    tabs[2].click();
    fixture.detectChanges();

    expect(component.selectedTab()).toBe('ALL');
    cards = el.querySelectorAll('.borrowing-card');
    expect(cards).toHaveLength(3);
  });

  it('renders borrowing card details: cover, title, author, copy ID, due date, remaining days, and status', () => {
    const el = fixture.nativeElement as HTMLElement;
    const firstCard = el.querySelector('.borrowing-card') as HTMLElement;
    expect(firstCard).not.toBeNull();

    // Cover
    const cover = firstCard.querySelector('.book-cover-img') as HTMLImageElement;
    expect(cover).not.toBeNull();
    expect(cover.getAttribute('src')).toBe('https://example.com/python.jpg');

    // Title & Author
    expect(firstCard.querySelector('.book-title')?.textContent).toContain('Python Programming');
    expect(firstCard.querySelector('.book-author')?.textContent).toContain('Joseph');

    // Status pill
    const statusPill = firstCard.querySelector('.loan-status-pill');
    expect(statusPill?.textContent).toContain('On Loan');
    expect(statusPill?.classList.contains('pill-on-loan')).toBe(true);

    // Meta details
    expect(firstCard.textContent).toContain('Copy ID');
    expect(firstCard.textContent).toContain('CP-10452');
    expect(firstCard.textContent).toContain('Due Date');
    expect(firstCard.textContent).toContain('Nov 23, 2026');
    expect(firstCard.textContent).toContain('Remaining');
    expect(firstCard.textContent).toContain('20 days');
  });

  it('shows Renew Once button only when renewalEligible is true', () => {
    const el = fixture.nativeElement as HTMLElement;
    const cards = el.querySelectorAll('.borrowing-card');

    // Card 1 has renewalEligible = true
    const card1RenewBtn = cards[0].querySelector('.btn-renew');
    expect(card1RenewBtn).not.toBeNull();
    expect(card1RenewBtn?.textContent).toContain('Renew Once');

    // Card 2 has renewalEligible = false
    const card2RenewBtn = cards[1].querySelector('.btn-renew');
    expect(card2RenewBtn).toBeNull();
  });

  it('handles renewal click and invokes BorrowingService.renew()', () => {
    const el = fixture.nativeElement as HTMLElement;
    const renewBtn = el.querySelector('.btn-renew') as HTMLButtonElement;
    expect(renewBtn).not.toBeNull();

    renewBtn.click();
    fixture.detectChanges();

    expect(mockBorrowingService.renew).toHaveBeenCalledWith('loan-1');
  });

  it('provides a receipt download button on borrowing cards', () => {
    const el = fixture.nativeElement as HTMLElement;
    const receiptBtn = el.querySelector('.btn-receipt') as HTMLButtonElement;
    expect(receiptBtn).not.toBeNull();

    receiptBtn.click();
    fixture.detectChanges();

    expect(mockBorrowingService.downloadLoanReceipt).toHaveBeenCalledWith('loan-1');
  });

  it('renders Overdue · Renewal unavailable badge when active loan is overdue', () => {
    component.current.set([
      {
        id: 'loan-overdue',
        borrowRequestId: 'req-od',
        bookId: 'book-1',
        bookTitle: 'Overdue Python Book',
        coverImageUrl: null,
        copyIdentifier: 'CP-99999',
        borrowerEmail: 'student@example.edu',
        status: 'ACTIVE',
        issueDate: '2026-10-01',
        dueDate: '2026-10-22',
        actualReturnDate: null,
        renewalCount: 0,
        overdue: true,
        renewalEligible: false,
        returnNote: null,
        history: [],
        daysLeft: -15
      }
    ]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const card = el.querySelector('.borrowing-card');
    expect(card).not.toBeNull();

    const renewBtn = card?.querySelector('.btn-renew');
    expect(renewBtn).toBeNull();

    const overdueBadge = card?.querySelector('.pill-overdue-note');
    expect(overdueBadge).not.toBeNull();
    expect(overdueBadge?.textContent).toContain('Overdue · Renewal unavailable');
  });

  it('displays the server conflict message when renewal fails with 409', () => {
    const errorMsg = 'Renewal is unavailable because this loan has passed its due date. Please return the book to the circulation desk.';
    mockBorrowingService.renew.mockReturnValueOnce(throwError(() => ({
      status: 409,
      error: { message: errorMsg }
    })));

    component.renew(mockCurrentLoans[0]);
    fixture.detectChanges();

    expect(component.error()).toBe(errorMsg);
  });
});
