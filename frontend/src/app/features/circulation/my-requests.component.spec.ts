import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { CatalogueService } from '../catalogue/catalogue.service';
import { BorrowRequestRecord, BorrowingService } from './borrowing.service';
import { MyRequestsComponent } from './my-requests.component';

describe('MyRequestsComponent UI/UX Redesign', () => {
  let fixture: ComponentFixture<MyRequestsComponent>;
  let component: MyRequestsComponent;

  const mockRequests: BorrowRequestRecord[] = [
    {
      id: 'req-1',
      bookId: 'book-1',
      bookTitle: 'Database System Concepts',
      coverImageUrl: 'https://example.com/db.jpg',
      borrowerEmail: 'student@example.edu',
      status: 'PENDING',
      submittedAt: '2026-11-03T10:00:00Z',
      decidedAt: null,
      decisionReason: null,
      history: [
        {
          eventType: 'REQUEST_SUBMITTED',
          actorEmail: 'student@example.edu',
          occurredAt: '2026-11-03T10:00:00Z',
          reason: 'For database coursework'
        }
      ]
    },
    {
      id: 'req-2',
      bookId: 'book-2',
      bookTitle: 'Computer Networks',
      coverImageUrl: 'https://example.com/networks.jpg',
      borrowerEmail: 'student@example.edu',
      status: 'APPROVED',
      submittedAt: '2026-11-02T14:30:00Z',
      decidedAt: '2026-11-02T16:00:00Z',
      decisionReason: 'Approved for circulation pick-up',
      history: [
        {
          eventType: 'REQUEST_SUBMITTED',
          actorEmail: 'student@example.edu',
          occurredAt: '2026-11-02T14:30:00Z',
          reason: null
        },
        {
          eventType: 'REQUEST_APPROVED',
          actorEmail: 'librarian@example.edu',
          occurredAt: '2026-11-02T16:00:00Z',
          reason: 'Approved for circulation pick-up'
        }
      ]
    },
    {
      id: 'req-3',
      bookId: 'book-3',
      bookTitle: 'Clean Code',
      coverImageUrl: 'https://example.com/cleancode.jpg',
      borrowerEmail: 'student@example.edu',
      status: 'REJECTED',
      submittedAt: '2026-10-28T09:15:00Z',
      decidedAt: '2026-10-29T11:00:00Z',
      decisionReason: 'Multiple copies already reserved',
      history: [
        {
          eventType: 'REQUEST_REJECTED',
          actorEmail: 'librarian@example.edu',
          occurredAt: '2026-10-29T11:00:00Z',
          reason: 'Multiple copies already reserved'
        }
      ]
    },
    {
      id: 'req-4',
      bookId: 'book-4',
      bookTitle: 'Operating System Concepts',
      coverImageUrl: null,
      borrowerEmail: 'student@example.edu',
      status: 'ISSUED',
      submittedAt: '2026-10-20T12:00:00Z',
      decidedAt: '2026-10-21T10:00:00Z',
      decisionReason: 'Issued to student',
      history: []
    }
  ];

  const mockBorrowingService = {
    myRequests: () => of({
      content: mockRequests,
      page: 0,
      size: 20,
      totalElements: mockRequests.length,
      totalPages: 1
    })
  };

  const mockCatalogueService = {
    get: (id: string) => {
      const authorsMap: Record<string, string[]> = {
        'book-1': ['Silberschatz', 'Galvin'],
        'book-2': ['Tanenbaum, A. S.'],
        'book-3': ['Robert C. Martin'],
        'book-4': ['Abraham Silberschatz']
      };
      return of({
        id,
        title: 'Book Title',
        authors: authorsMap[id] || ['Unknown Author'],
        categories: ['Computing'],
        circulationPolicy: 'STANDARD',
        numberOfCopies: 5,
        availableCopies: 3
      });
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyRequestsComponent],
      providers: [
        provideRouter([]),
        { provide: BorrowingService, useValue: mockBorrowingService },
        { provide: CatalogueService, useValue: mockCatalogueService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MyRequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the page header matching the design mockup', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.eyebrow')?.textContent).toContain('YOUR LIBRARY');
    expect(el.querySelector('.page-title')?.textContent).toContain('My Requests');
    expect(el.querySelector('.page-desc')?.textContent).toContain('Borrowing requests and their review history.');
    expect(el.querySelector('.total-badge')?.textContent).toContain('Total Requests: 4');
  });

  it('renders status filter tabs with accurate dynamic counts', () => {
    const el = fixture.nativeElement as HTMLElement;
    const tabs = Array.from(el.querySelectorAll('.filter-tab')) as HTMLButtonElement[];
    expect(tabs).toHaveLength(5);

    expect(tabs[0].textContent).toContain('All (4)');
    expect(tabs[1].textContent).toContain('Pending (1)');
    expect(tabs[2].textContent).toContain('Approved (2)'); // APPROVED + ISSUED
    expect(tabs[3].textContent).toContain('Rejected (1)');
    expect(tabs[4].textContent).toContain('Cancelled (0)');

    // Default active tab is 'All'
    expect(tabs[0].classList.contains('active')).toBe(true);
  });

  it('filters requests correctly when clicking filter tabs', () => {
    const el = fixture.nativeElement as HTMLElement;
    const tabs = Array.from(el.querySelectorAll('.filter-tab')) as HTMLButtonElement[];

    // Click Pending tab
    tabs[1].click();
    fixture.detectChanges();

    expect(component.selectedFilter()).toBe('PENDING');
    let cards = el.querySelectorAll('.request-card');
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain('Database System Concepts');

    // Click Approved tab
    tabs[2].click();
    fixture.detectChanges();

    expect(component.selectedFilter()).toBe('APPROVED');
    cards = el.querySelectorAll('.request-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('Computer Networks');

    // Click Rejected tab
    tabs[3].click();
    fixture.detectChanges();

    expect(component.selectedFilter()).toBe('REJECTED');
    cards = el.querySelectorAll('.request-card');
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain('Clean Code');
  });

  it('renders compact horizontal request cards with book thumbnail, title, author, date, and status', () => {
    const el = fixture.nativeElement as HTMLElement;
    const firstCard = el.querySelector('.request-card') as HTMLElement;
    expect(firstCard).not.toBeNull();

    // Area 1: Thumbnail
    const img = firstCard.querySelector('.book-thumb') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('https://example.com/db.jpg');

    // Area 2: Title & Author
    expect(firstCard.querySelector('.book-title')?.textContent).toContain('Database System Concepts');
    expect(firstCard.querySelector('.book-author')?.textContent).toContain('Silberschatz, Galvin');

    // Area 3: Requested Date
    expect(firstCard.querySelector('.meta-label')?.textContent).toContain('Requested On');
    expect(firstCard.querySelector('.meta-value')?.textContent).toContain('Nov 3, 2026');

    // Area 4: Status badge
    expect(firstCard.querySelector('.status-col-label')?.textContent).toContain('Status');
    const badge = firstCard.querySelector('.status-badge');
    expect(badge?.textContent).toContain('Pending');
    expect(badge?.classList.contains('badge-pending')).toBe(true);

    // Area 5: Chevron
    expect(firstCard.querySelector('.card-chevron')).not.toBeNull();
  });

  it('expands request details and history timeline when clicking the card summary', () => {
    const el = fixture.nativeElement as HTMLElement;
    const secondCardSummary = el.querySelectorAll('.card-summary')[1] as HTMLElement;

    // Initially drawer is not visible
    expect(el.querySelector('.request-details-drawer')).toBeNull();

    // Click card summary to expand
    secondCardSummary.click();
    fixture.detectChanges();

    const drawer = el.querySelector('.request-details-drawer');
    expect(drawer).not.toBeNull();
    expect(drawer?.textContent).toContain('Request Review & History');
    expect(drawer?.textContent).toContain('Approved for circulation pick-up');
    expect(drawer?.textContent).toContain('librarian@example.edu');

    // Click again to collapse
    secondCardSummary.click();
    fixture.detectChanges();
    expect(el.querySelector('.request-details-drawer')).toBeNull();
  });

  it('renders an empty state when user has no requests', () => {
    component.requests.set([]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.empty-state')).not.toBeNull();
    expect(el.querySelector('.empty-state h2')?.textContent).toContain('No borrowing requests');
    expect(el.querySelector('.empty-state a')?.getAttribute('href')).toBe('/workspace/books');
  });

  it('renders error state with retry button when API fails', () => {
    component.error.set('Your requests could not be loaded. Please try again.');
    component.loading.set(false);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.alert-error')?.textContent).toContain('Your requests could not be loaded');
    expect(el.querySelector('.btn-retry')).not.toBeNull();
  });
});
