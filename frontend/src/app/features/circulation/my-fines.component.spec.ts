import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { MyFinesComponent } from './my-fines.component';
import { BorrowingService } from './borrowing.service';

describe('MyFinesComponent', () => {
  let fixture: ComponentFixture<MyFinesComponent>;

  const mockBorrowingService: Partial<BorrowingService> = {
    myFines: () => of([
      {
        id: 'fine-1',
        loanId: 'loan-1',
        borrowerId: 'user-1',
        borrowerName: 'Test Student',
        borrowerEmail: 'student@example.edu',
        borrowerInstitutionalId: 'ST-001',
        borrowerRole: 'STUDENT',
        bookId: 'book-1',
        bookTitle: 'Clean Architecture',
        bookIsbn: '978-0134494166',
        bookCoverImageUrl: null,
        copyIdentifier: 'CP-1001',
        issueDate: '2026-10-01',
        dueDate: '2026-10-22',
        actualReturnDate: null,
        loanStatus: 'ACTIVE',
        dailyRate: 10.0,
        maxFine: 500.0,
        gracePeriodDays: 0,
        overdueDays: 3,
        fineAmount: 30.0,
        status: 'UNPAID',
        loanOverdue: true,
        renewed: false,
        originalDueDate: null,
        assessedAt: '2026-10-25T08:00:00Z',
        paidAt: null,
        payments: []
      }
    ]),
    myFineSummary: () => of({
      totalOutstanding: 30.0,
      unpaidCount: 1,
      totalPaid: 0.0,
      paidCount: 0,
      totalAssessments: 1,
      currentOverdueCount: 1
    })
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyFinesComponent],
      providers: [
        { provide: BorrowingService, useValue: mockBorrowingService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MyFinesComponent);
    fixture.detectChanges();
  });

  it('renders outstanding fines and calculations', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('My Fines & Overdue Charges');
    expect(text).toContain('Total Outstanding');
    expect(text).toContain('Total Paid');
    expect(text).toContain('Total Assessments');
    expect(text).toContain('Current Overdues');
    expect(text).toContain('Clean Architecture');
    expect(text).toContain('CP-1001');
    expect(text).toContain('3 day(s)');
    expect(text).toContain('Terms Applied to This Loan');
    expect(text).toContain('Maximum ₹500.00 · 0 grace day(s)');
    expect(text).toContain('₹30.00');
    expect(text).toContain('UNPAID');
    expect(text).toContain('Pay at Circulation Desk');
  });

  it('filters fines by tab selection', () => {
    const component = fixture.componentInstance;
    expect(component.filteredFines().length).toBe(1);

    component.setTab('PAID');
    fixture.detectChanges();
    expect(component.filteredFines().length).toBe(0);

    component.setTab('UNPAID');
    fixture.detectChanges();
    expect(component.filteredFines().length).toBe(1);
  });

  it('opens and closes fine details modal', () => {
    const component = fixture.componentInstance;
    const fine = component.fines()[0];
    component.openDetails(fine);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Fine Assessment Details');
    expect(text).toContain('Why was this fine generated?');
    expect(text).toContain('Billable Overdue Days:');

    component.closeDetails();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Fine Assessment Details');
  });
});
