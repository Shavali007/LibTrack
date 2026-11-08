import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LibrarianDashboardComponent } from './librarian-dashboard.component';
import { LibrarianDashboardService } from './librarian-dashboard.service';
import { BorrowingService } from '../circulation/borrowing.service';

describe('LibrarianDashboardComponent', () => {
  let fixture: ComponentFixture<LibrarianDashboardComponent>;
  let component: LibrarianDashboardComponent;
  let mockDashboardService: Partial<LibrarianDashboardService>;
  let mockBorrowingService: Partial<BorrowingService>;

  beforeEach(async () => {
    mockDashboardService = {
      getStats: () => of({ totalBooks: 248, bookCopies: 1320, activeMembers: 86, pendingRequests: 12 }),
      getOverview: () => of([
        { month: 'Aug', year: 2026, issued: 20, returned: 58 },
        { month: 'Sep', year: 2026, issued: 25, returned: 18 },
        { month: 'Oct', year: 2026, issued: 58, returned: 24 },
        { month: 'Nov', year: 2026, issued: 59, returned: 25 },
        { month: 'Dec', year: 2026, issued: 40, returned: 52 },
      ]),
      getRecentActivity: () => of([
        {
          id: 'loan-1',
          activityType: 'ISSUED',
          bookTitle: 'Clean Code',
          memberIdentifier: '23MIC7248',
          memberEmail: 'hm.shavali@vitapstudent.ac.in',
          timestamp: '2026-10-12T10:00:00Z',
          details: 'Issued until 2026-10-26'
        }
      ]),
    };

    mockBorrowingService = {
      queue: () => of({
        content: [
          {
            id: 'req-1',
            bookId: 'book-1',
            bookTitle: 'Clean Code',
            coverImageUrl: null,
            borrowerEmail: 'hm.shavali@vitapstudent.ac.in',
            borrowerInstitutionalId: '23MIC7248',
            borrowerRole: 'STUDENT',
            status: 'PENDING',
            submittedAt: '2026-10-12T10:00:00Z',
            decidedAt: null,
            decisionReason: null,
            history: [],
          },
        ],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      }),
      decide: () => of({
        id: 'req-1',
        bookId: 'book-1',
        bookTitle: 'Clean Code',
        coverImageUrl: null,
        borrowerEmail: 'hm.shavali@vitapstudent.ac.in',
        borrowerInstitutionalId: '23MIC7248',
        borrowerRole: 'STUDENT',
        status: 'APPROVED',
        submittedAt: '2026-10-12T10:00:00Z',
        decidedAt: '2026-10-12T10:30:00Z',
        decisionReason: null,
        history: [],
      }),
    };

    await TestBed.configureTestingModule({
      imports: [LibrarianDashboardComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LibrarianDashboardService, useValue: mockDashboardService },
        { provide: BorrowingService, useValue: mockBorrowingService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LibrarianDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('displays exactly four statistic cards: Total Books, Book Copies, Active Members, and Pending Requests', () => {
    const el = fixture.nativeElement as HTMLElement;
    const statCards = el.querySelectorAll('.stat-card');
    expect(statCards.length).toBe(4);

    const text = el.textContent as string;
    expect(text).toContain('Total Books');
    expect(text).toContain('248');
    expect(text).toContain('Book Copies');
    expect(text).toContain('1,320');
    expect(text).toContain('Active Members');
    expect(text).toContain('86');
    expect(text).toContain('Pending Requests');
    expect(text).toContain('12');
  });

  it('renders pending borrow requests table with institutional ID, name and functional actions', () => {
    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent as string;
    expect(text).toContain('Clean Code');
    expect(text).toContain('23MIC7248');
    expect(text).toContain('hm.shavali@vitapstudent.ac.in');

    const approveBtn = el.querySelector('.btn-approve');
    const rejectBtn = el.querySelector('.btn-reject');
    expect(approveBtn).not.toBeNull();
    expect(rejectBtn).not.toBeNull();
  });

  it('ends after Pending Borrow Requests and Library Overview, removing Recent Activity and Quick Actions', () => {
    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent as string;

    // Circulation Desk embedded panel should NOT be on dashboard (preserved in dedicated route)
    expect(el.querySelector('.desk-tabs')).toBeNull();
    expect(text).not.toContain('Issue Book');

    // Recent Library Activity and Quick Actions must be completely removed from template
    expect(text).not.toContain('Recent Library Activity');
    expect(text).not.toContain('Quick Actions');
    expect(text).not.toContain('Add New Book');

    // Unverified trend badges must not be present
    expect(text).not.toContain('+12% this month');
    expect(text).not.toContain('Physical stock');
    expect(text).not.toContain('Verified users');
    expect(text).not.toContain('Awaiting review');

    // Bottom sections present
    expect(text).toContain('Pending Borrow Requests');
    expect(text).toContain('Library Overview');
    expect(el.querySelector('.pending-section')).not.toBeNull();
    expect(el.querySelector('.chart-panel')).not.toBeNull();
  });

  it('renders welcome banner with LIBRARIAN WORKSPACE, heading, description, and shared banner asset', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.welcome-eyebrow')?.textContent).toContain('LIBRARIAN WORKSPACE');
    expect(el.querySelector('.welcome-title')?.textContent).toContain('Welcome back, Librarian!');
    expect(el.querySelector('.welcome-subtitle')?.textContent).toContain('Manage library resources, support learners and keep the library running smoothly.');
    const asset = el.querySelector('.banner-right-asset') as HTMLImageElement;
    expect(asset).not.toBeNull();
    expect(asset.getAttribute('src')).toBe('/assets/banner-student-right.png');
    expect(el.textContent).toContain('A library is not just a place to read, but a place to grow.');
  });
});
