import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { FinesViewerComponent } from './fines-viewer.component';
import { FineRecord, LibrarianOperationsService } from './librarian-operations.service';

describe('FinesViewerComponent', () => {
  let fixture: ComponentFixture<FinesViewerComponent>;

  const mockFine: FineRecord = {
    id: 'fine-1',
    loanId: 'loan-1',
    borrowerId: 'user-1',
    borrowerName: 'Alice Student',
    borrowerEmail: 'alice@example.edu',
    borrowerInstitutionalId: 'STU-100',
    borrowerRole: 'STUDENT',
    bookId: 'book-1',
    bookTitle: 'Introduction to Algorithms',
    bookIsbn: '978-0262033848',
    bookCoverImageUrl: null,
    copyIdentifier: 'CP-2001',
    issueDate: '2026-10-01',
    dueDate: '2026-10-22',
    actualReturnDate: null,
    loanStatus: 'ACTIVE',
    dailyRate: 10,
    maxFine: 500,
    gracePeriodDays: 0,
    overdueDays: 4,
    fineAmount: 40,
    status: 'UNPAID',
    loanOverdue: true,
    renewed: false,
    originalDueDate: null,
    assessedAt: '2026-10-26T08:00:00Z',
    paidAt: null,
    payments: []
  };

  const mockPaidFine: FineRecord = {
    id: 'fine-2',
    loanId: 'loan-2',
    borrowerId: 'user-2',
    borrowerName: 'Prof. Bob Smith',
    borrowerEmail: 'bob@example.edu',
    borrowerInstitutionalId: 'FAC-200',
    borrowerRole: 'FACULTY',
    bookId: 'book-2',
    bookTitle: 'Operating System Concepts',
    bookIsbn: '978-1118063330',
    bookCoverImageUrl: null,
    copyIdentifier: 'CP-2002',
    issueDate: '2026-09-01',
    dueDate: '2026-09-22',
    actualReturnDate: '2026-09-25',
    loanStatus: 'RETURNED',
    dailyRate: 10,
    maxFine: 500,
    gracePeriodDays: 0,
    overdueDays: 3,
    fineAmount: 30,
    status: 'PAID',
    loanOverdue: false,
    renewed: false,
    originalDueDate: null,
    assessedAt: '2026-09-25T08:00:00Z',
    paidAt: '2026-09-25T10:00:00Z',
    payments: [
      {
        id: 'pay-1',
        amount: 30,
        paymentDate: '2026-09-25T10:00:00Z',
        receiptNumber: 'REC-2026-009',
        recordedByEmail: 'librarian@example.edu'
      }
    ]
  };

  const mockOpsService: Partial<LibrarianOperationsService> = {
    getFinesPolicy: () => of({
      status: 'ACTIVE',
      policyTitle: 'Current Fine Policy',
      policyDescription: 'Overdue loans accrue ₹10 per day after a 0 day grace period, capped at ₹500 per book.',
      monetaryFinesEnabled: true,
      dailyFineRate: 10,
      maximumFinePerBook: 500,
      gracePeriodDays: 0,
      loanPeriodDays: 21,
      configured: true,
      overdueLoansCount: 1,
      overdueLoans: []
    }),
    getFinesSummary: () => of({
      totalFines: 2,
      unpaidFines: 1,
      paidFines: 1,
      totalCollected: 30.0,
      totalOutstanding: 40.0,
      currentlyOverdueLoans: 1
    }),
    getAllFines: () => of([mockFine, mockPaidFine]),
    recordPayment: () => of({ ...mockFine, status: 'PAID' })
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinesViewerComponent],
      providers: [
        { provide: LibrarianOperationsService, useValue: mockOpsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FinesViewerComponent);
    fixture.detectChanges();
  });

  it('renders API-provided fine policy values and manual payment guidance', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Current Fine Policy');
    expect(text).toContain('Policy: ACTIVE');
    expect(text).toContain('Daily overdue fine: ₹10.00 per day');
    expect(text).toContain('Maximum fine per book: ₹500.00');
    expect(text).toContain('Grace period: 0 day(s)');
    expect(text).toContain('Manual full payment at the circulation desk');
  });

  it('renders 4 summary cards and administrative ledger', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Fine Management');
    expect(text).toContain('Total Outstanding');
    expect(text).toContain('Total Collected');
    expect(text).toContain('Total Assessments');
    expect(text).toContain('Currently Overdue Loans');
    expect(text).toContain('Alice Student');
    expect(text).toContain('Prof. Bob Smith');
    expect(text).toContain('Introduction to Algorithms');
    expect(text).toContain('CP-2001');
    expect(text).toContain('STUDENT');
    expect(text).toContain('FACULTY');
  });

  it('filters fines by status, role and search query', () => {
    const component = fixture.componentInstance;
    expect(component.filteredFines().length).toBe(2);

    // Status filter: UNPAID
    component.setStatusFilter('UNPAID');
    fixture.detectChanges();
    expect(component.filteredFines().length).toBe(1);
    expect(component.filteredFines()[0].id).toBe('fine-1');

    // Role filter: FACULTY
    component.setStatusFilter('ALL');
    component.setRoleFilter('FACULTY');
    fixture.detectChanges();
    expect(component.filteredFines().length).toBe(1);
    expect(component.filteredFines()[0].borrowerRole).toBe('FACULTY');

    // Search query: algorithms
    component.setRoleFilter('ALL');
    component.onSearchChange('algorithms');
    fixture.detectChanges();
    expect(component.filteredFines().length).toBe(1);
    expect(component.filteredFines()[0].bookTitle).toContain('Algorithms');
  });

  it('opens and closes details and payment modals', () => {
    const component = fixture.componentInstance;
    component.openDetailsModal(mockFine);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('CIRCULATION AUDIT');
    expect(fixture.nativeElement.textContent).toContain('Applied Loan Terms');

    component.closeDetailsModal();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Applied Loan Terms');

    component.openPaymentModal(mockFine);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Record Fine Payment');
    expect(fixture.nativeElement.textContent).toContain('CIRCULATION DESK CASHIER');

    component.closeModal();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('CIRCULATION DESK CASHIER');
  });
});
