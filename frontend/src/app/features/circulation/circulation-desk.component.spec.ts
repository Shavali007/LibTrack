import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { CirculationDeskComponent } from './circulation-desk.component';
import {
  BorrowingService,
  CirculationStats,
  CirculationSummary,
  LoanRecord,
  LostDamagedCopy
} from './borrowing.service';

describe('CirculationDeskComponent', () => {
  let fixture: ComponentFixture<CirculationDeskComponent>;
  let component: CirculationDeskComponent;
  let mockBorrowingService: Partial<BorrowingService>;

  const mockSummary: CirculationSummary = {
    activeLoans: 12,
    totalReturnsThisMonth: 48,
    damagedCopies: 2,
    lostCopies: 1,
    totalTransactions: 128,
    historyTotalCount: 128,
    historyGoodCount: 120,
    historyDamagedCount: 1,
    historyLostCount: 2
  };

  const mockActiveLoans: LoanRecord[] = [
    {
      id: 'loan-1',
      borrowRequestId: 'req-1',
      bookId: 'book-1',
      bookTitle: 'Physical Science',
      coverImageUrl: null,
      copyIdentifier: 'EFDC94DF-7E0D-4DE5',
      borrowerEmail: 'maha.23mic7248@vitapstudent.ac.in',
      borrowerDisplayName: 'Maha',
      borrowerRole: 'STUDENT',
      status: 'ACTIVE',
      issueDate: '2026-11-01T10:00:00Z',
      dueDate: '2026-11-22T23:59:59Z',
      actualReturnDate: null,
      renewalCount: 0,
      overdue: false,
      renewalEligible: true,
      returnNote: null,
      history: [],
      daysLeft: 21
    },
    {
      id: 'loan-2',
      borrowRequestId: 'req-2',
      bookId: 'book-2',
      bookTitle: 'Java Programming',
      coverImageUrl: null,
      copyIdentifier: '1006EB51-CCF3-475D',
      borrowerEmail: 'prof.kumar@vitap.ac.in',
      borrowerDisplayName: 'Prof. Anil Kumar',
      borrowerRole: 'FACULTY',
      status: 'ACTIVE',
      issueDate: '2026-11-01T11:00:00Z',
      dueDate: '2026-11-22T23:59:59Z',
      actualReturnDate: null,
      renewalCount: 0,
      overdue: false,
      renewalEligible: true,
      returnNote: null,
      history: [],
      daysLeft: 21
    }
  ];

  const mockHistoryLoans: LoanRecord[] = [
    {
      id: 'loan-3',
      borrowRequestId: 'req-3',
      bookId: 'book-1',
      bookTitle: 'Physical Science',
      coverImageUrl: null,
      copyIdentifier: 'EFDC94DF-7E0D-4DE5',
      borrowerEmail: 'student@vitapstudent.ac.in',
      borrowerDisplayName: 'Student User',
      borrowerRole: 'STUDENT',
      status: 'RETURNED',
      issueDate: '2026-10-01T10:00:00Z',
      dueDate: '2026-10-22T23:59:59Z',
      actualReturnDate: '2026-10-20T14:30:00Z',
      renewalCount: 0,
      overdue: false,
      renewalEligible: false,
      returnNote: null,
      history: [],
      returnCondition: 'GOOD'
    }
  ];

  const mockLostDamagedCopies: LostDamagedCopy[] = [
    {
      copyId: 'copy-3',
      copyIdentifier: 'D3CE7C92-1B69-4DED',
      bookId: 'book-3',
      bookTitle: 'Operating System Concepts',
      coverImageUrl: null,
      location: 'Rack 4B',
      status: 'DAMAGED',
      condition: 'DAMAGED',
      borrowerName: 'Rahul',
      borrowerEmail: 'rahul.23mic7102@vitapstudent.ac.in',
      borrowerRole: 'STUDENT',
      reportedDate: '2026-10-28T16:00:00Z',
      caseNote: 'Water damage on pages 40-55'
    },
    {
      copyId: 'copy-4',
      copyIdentifier: '6F42AC25-E8DC-439C',
      bookId: 'book-4',
      bookTitle: 'Database System Concepts',
      coverImageUrl: null,
      location: 'Rack 2A',
      status: 'LOST',
      condition: 'LOST',
      borrowerName: 'Ananya',
      borrowerEmail: 'ananya.23mic7098@vitapstudent.ac.in',
      borrowerRole: 'STUDENT',
      reportedDate: '2026-10-25T11:00:00Z',
      caseNote: 'Reported lost by member during semester exams'
    }
  ];

  const mockStats: CirculationStats = {
    activeLoans: 12,
    totalReturnsThisMonth: 48,
    totalGoodReturns: 45,
    totalDamagedCopies: 2,
    totalLostCopies: 1,
    overdueLoans: 0,
    activityOverTime: [
      { month: 'Jun', year: 2026, issued: 30, returned: 28 },
      { month: 'Jul', year: 2026, issued: 35, returned: 32 },
      { month: 'Aug', year: 2026, issued: 50, returned: 48 },
      { month: 'Sep', year: 2026, issued: 62, returned: 58 },
      { month: 'Oct', year: 2026, issued: 75, returned: 71 },
      { month: 'Nov', year: 2026, issued: 52, returned: 48 }
    ],
    returnConditions: {
      good: 45,
      damaged: 2,
      lost: 1
    },
    memberBreakdown: {
      studentActive: 10,
      facultyActive: 2,
      studentTotal: 35,
      facultyTotal: 13
    }
  };

  beforeEach(async () => {
    mockBorrowingService = {
      getCirculationSummary: vi.fn().mockReturnValue(of(mockSummary)),
      searchLibrarianLoans: vi.fn().mockImplementation((params) => {
        if (params?.historyOnly) {
          return of({
            content: mockHistoryLoans,
            totalElements: mockHistoryLoans.length,
            totalPages: 1,
            number: 0,
            size: 10
          });
        }
        return of({
          content: mockActiveLoans,
          totalElements: mockActiveLoans.length,
          totalPages: 1,
          number: 0,
          size: 6
        });
      }),
      returnLoan: vi.fn().mockReturnValue(of(mockHistoryLoans[0])),
      updateLoanCondition: vi.fn().mockReturnValue(of({
        ...mockHistoryLoans[0],
        returnCondition: 'DAMAGED',
        inventoryStatus: 'DAMAGED'
      })),
      getLostAndDamagedCopies: vi.fn().mockReturnValue(of({
        content: mockLostDamagedCopies,
        totalElements: mockLostDamagedCopies.length,
        totalPages: 1,
        number: 0,
        size: 10
      })),
      getCirculationStats: vi.fn().mockReturnValue(of(mockStats)),
      downloadLoanReceipt: vi.fn().mockReturnValue(of(new Blob(['test pdf'], { type: 'application/pdf' })))
    };

    await TestBed.configureTestingModule({
      imports: [CirculationDeskComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BorrowingService, useValue: mockBorrowingService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CirculationDeskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders page header and 4 summary cards with data from backend', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Circulation Desk');
    expect(el.textContent).toContain('Manage book loans, process returns');

    // Tab buttons - exactly 3 tabs (Lost & Damaged tab is removed)
    expect(el.textContent).toContain('Active Loans (12)');
    expect(el.textContent).toContain('Circulation History');
    expect(el.textContent).not.toContain('Lost & Damaged');
    expect(el.textContent).toContain('Statistics');

    // Summary cards
    const summaryCards = el.querySelectorAll('.summary-card');
    expect(summaryCards.length).toBe(4);
    expect(summaryCards[0].textContent).toContain('12');
    expect(summaryCards[0].textContent).toContain('Active Loans');
    expect(summaryCards[1].textContent).toContain('48');
    expect(summaryCards[1].textContent).toContain('Returned This Month');
    expect(summaryCards[2].textContent).toContain('2');
    expect(summaryCards[2].textContent).toContain('Damaged Copies');
    expect(summaryCards[3].textContent).toContain('1');
    expect(summaryCards[3].textContent).toContain('Lost Copies');
  });

  it('renders active loans table in Active Loans tab', () => {
    const el = fixture.nativeElement as HTMLElement;
    const rows = el.querySelectorAll('.desk-table tbody tr');
    expect(rows.length).toBe(2);

    expect(rows[0].textContent).toContain('Physical Science');
    expect(rows[0].textContent).toContain('EFDC94DF-7E0D-4DE5');
    expect(rows[0].textContent).toContain('Maha');
    expect(rows[0].textContent).toContain('Student');
    expect(rows[0].textContent).toContain('21 days');

    expect(rows[1].textContent).toContain('Java Programming');
    expect(rows[1].textContent).toContain('Prof. Anil Kumar');
    expect(rows[1].textContent).toContain('Faculty');
  });

  it('allows selecting loans via checkboxes', () => {
    expect(component.selectedLoanIds().size).toBe(0);
    expect(component.isAllActiveSelected()).toBe(false);

    // Select all
    component.toggleSelectAllActive();
    expect(component.selectedLoanIds().size).toBe(2);
    expect(component.isAllActiveSelected()).toBe(true);

    // Unselect single
    component.toggleLoanSelection('loan-1');
    expect(component.selectedLoanIds().size).toBe(1);
    expect(component.isLoanSelected('loan-2')).toBe(true);
    expect(component.isAllActiveSelected()).toBe(false);
  });

  it('filters active loans by search term and role', () => {
    component.activeSearch = 'Physical';
    component.activeRoleFilter = 'STUDENT';
    component.onActiveSearchChange();

    expect(mockBorrowingService.searchLibrarianLoans).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'Physical',
        role: 'STUDENT',
        page: 0
      })
    );
  });

  it('opens return dropdown menu and opens modal for Good condition', () => {
    const loan = mockActiveLoans[0];
    const dummyEvent = new MouseEvent('click');
    component.toggleActionDropdown(loan.id, dummyEvent);
    expect(component.openDropdownLoanId()).toBe(loan.id);

    component.initiateReturn(loan, 'GOOD');
    expect(component.showReturnModal()).toBe(true);
    expect(component.selectedLoanForReturn()?.id).toBe(loan.id);
    expect(component.selectedReturnCondition).toBe('GOOD');
  });

  it('processes Good return successfully without requiring a note', () => {
    const loan = mockActiveLoans[0];
    component.initiateReturn(loan, 'GOOD');
    component.confirmReturn();

    expect(mockBorrowingService.returnLoan).toHaveBeenCalledWith(
      loan.id,
      'GOOD',
      null
    );
    expect(component.showReturnModal()).toBe(false);
    expect(component.notice()).toContain('successfully processed as GOOD');
  });

  it('requires case note for Damaged return and shows validation error if empty', () => {
    const loan = mockActiveLoans[0];
    component.initiateReturn(loan, 'DAMAGED');
    expect(component.selectedReturnCondition).toBe('DAMAGED');

    component.returnCaseNote = '   ';
    component.confirmReturn();

    expect(component.returnModalError).toContain('A case note is required when returning damaged or lost material.');
    expect(mockBorrowingService.returnLoan).not.toHaveBeenCalled();

    // Provide note and resubmit
    component.returnCaseNote = 'Torn front cover and bent spine';
    component.confirmReturn();

    expect(mockBorrowingService.returnLoan).toHaveBeenCalledWith(
      loan.id,
      'DAMAGED',
      'Torn front cover and bent spine'
    );
    expect(component.showReturnModal()).toBe(false);
  });

  it('requires case note for Lost return and shows validation error if empty', () => {
    const loan = mockActiveLoans[0];
    component.initiateReturn(loan, 'LOST');
    expect(component.selectedReturnCondition).toBe('LOST');

    component.returnCaseNote = '';
    component.confirmReturn();

    expect(component.returnModalError).toContain('A case note is required when returning damaged or lost material.');
    expect(mockBorrowingService.returnLoan).not.toHaveBeenCalled();

    // Provide note and submit
    component.returnCaseNote = 'Member reported book lost on campus bus';
    component.confirmReturn();

    expect(mockBorrowingService.returnLoan).toHaveBeenCalledWith(
      loan.id,
      'LOST',
      'Member reported book lost on campus bus'
    );
    expect(component.showReturnModal()).toBe(false);
  });

  it('switches to Circulation History tab, displays Total Transactions summary, and renders columns', () => {
    component.setActiveTab('history');
    fixture.detectChanges();

    expect(component.activeTab()).toBe('history');
    expect(mockBorrowingService.searchLibrarianLoans).toHaveBeenCalledWith(
      expect.objectContaining({
        historyOnly: true,
        page: 0
      })
    );

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Circulation History');
    expect(el.textContent).toContain('Comprehensive log of completed loans, returns and reported cases.');

    // Card 1 shows Total Transactions (128)
    const summaryCards = el.querySelectorAll('.summary-card');
    expect(summaryCards[0].textContent).toContain('128');
    expect(summaryCards[0].textContent).toContain('Total Transactions');

    // Condition filter pills row
    expect(el.textContent).toContain('All Conditions (128)');
    expect(el.textContent).toContain('Good (120)');
    expect(el.textContent).toContain('Damaged (1)');
    expect(el.textContent).toContain('Lost (2)');

    // History table columns and data
    expect(el.textContent).toContain('Physical Science');
    expect(el.textContent).toContain('GOOD');
    expect(el.textContent).toContain('Available');
    expect(el.textContent).toContain('Edit');
  });

  it('filters circulation history by condition using pill buttons', () => {
    component.setActiveTab('history');
    fixture.detectChanges();

    component.setHistoryCondition('DAMAGED');
    expect(component.historyConditionFilter).toBe('DAMAGED');
    expect(mockBorrowingService.searchLibrarianLoans).toHaveBeenCalledWith(
      expect.objectContaining({
        historyOnly: true,
        condition: 'DAMAGED',
        page: 0
      })
    );

    component.setHistoryCondition('LOST');
    expect(component.historyConditionFilter).toBe('LOST');
    expect(mockBorrowingService.searchLibrarianLoans).toHaveBeenCalledWith(
      expect.objectContaining({
        historyOnly: true,
        condition: 'LOST',
        page: 0
      })
    );
  });

  it('handles editing book condition with validation and backend update', () => {
    const historyLoan = mockHistoryLoans[0];
    component.setActiveTab('history');
    fixture.detectChanges();

    // Open Edit modal
    component.openEditModal(historyLoan);
    expect(component.showEditModal()).toBe(true);
    expect(component.selectedLoanForEdit()?.id).toBe(historyLoan.id);
    expect(component.editCondition).toBe('GOOD');

    // Attempt saving without reason
    component.editCondition = 'DAMAGED';
    component.editReason = '   ';
    component.saveConditionChange();

    expect(component.editModalError).toContain('A reason or case note is required when modifying a circulation condition.');
    expect(mockBorrowingService.updateLoanCondition).not.toHaveBeenCalled();

    // Provide valid reason and save
    component.editReason = 'Water damage discovered on return check';
    component.saveConditionChange();

    expect(mockBorrowingService.updateLoanCondition).toHaveBeenCalledWith(
      historyLoan.id,
      'DAMAGED',
      'Water damage discovered on return check'
    );
    expect(component.showEditModal()).toBe(false);
    expect(component.notice()).toContain('updated to DAMAGED.');
  });

  it('switches to Statistics tab and loads analytics data with complete previous layout and metrics', () => {
    component.setActiveTab('statistics');
    fixture.detectChanges();

    expect(component.activeTab()).toBe('statistics');
    expect(mockBorrowingService.getCirculationStats).toHaveBeenCalled();
    expect(mockBorrowingService.getCirculationSummary).toHaveBeenCalled();

    const el = fixture.nativeElement as HTMLElement;

    // 4 Summary cards at the top
    const summaryCards = el.querySelectorAll('.summary-card');
    expect(summaryCards.length).toBe(4);
    expect(summaryCards[0].textContent).toContain('Total Transactions');
    expect(summaryCards[0].textContent).toContain('128');
    expect(summaryCards[1].textContent).toContain('Returned This Month');
    expect(summaryCards[1].textContent).toContain('48');
    expect(summaryCards[2].textContent).toContain('Damaged Copies');
    expect(summaryCards[2].textContent).toContain('2');
    expect(summaryCards[3].textContent).toContain('Lost Copies');
    expect(summaryCards[3].textContent).toContain('1');

    // Section Header
    expect(el.textContent).toContain('Circulation Statistics & Analytics');
    expect(el.textContent).toContain('Real-time database metrics reflecting active circulation');

    // 6 Metric Cards
    const kpiCards = el.querySelectorAll('.kpi-card');
    expect(kpiCards.length).toBe(6);
    expect(kpiCards[0].textContent).toContain('Active Loans');
    expect(kpiCards[0].textContent).toContain('12');
    expect(kpiCards[1].textContent).toContain('Returns This Month');
    expect(kpiCards[1].textContent).toContain('48');
    expect(kpiCards[2].textContent).toContain('Total Good Returns');
    expect(kpiCards[2].textContent).toContain('45');
    expect(kpiCards[3].textContent).toContain('Damaged Copies');
    expect(kpiCards[3].textContent).toContain('2');
    expect(kpiCards[4].textContent).toContain('Lost Material');
    expect(kpiCards[4].textContent).toContain('1');
    expect(kpiCards[5].textContent).toContain('Overdue Loans');
    expect(kpiCards[5].textContent).toContain('0');

    // Past 6 Months Activity
    expect(el.textContent).toContain('Circulation Activity (Past 6 Months)');
    expect(el.textContent).toContain('Jun 2026');
    expect(el.textContent).toContain('30 issued');
    expect(el.textContent).toContain('28 returned');
    expect(el.textContent).toContain('Nov 2026');
    expect(el.textContent).toContain('52 issued');
    expect(el.textContent).toContain('48 returned');

    // Return Condition Distribution
    expect(el.textContent).toContain('Distribution of Return Conditions');
    expect(el.textContent).toContain('Good Condition');
    expect(el.textContent).toContain('45 returns');
    expect(el.textContent).toContain('Damaged Material');
    expect(el.textContent).toContain('2 returns');
    expect(el.textContent).toContain('Reported Lost');
    expect(el.textContent).toContain('1 reports');

    // Member Circulation Breakdown
    expect(el.textContent).toContain('Member Circulation Breakdown');
    expect(el.textContent).toContain('Student');
    expect(el.textContent).toContain('10');
    expect(el.textContent).toContain('35');
    expect(el.textContent).toContain('Faculty');
    expect(el.textContent).toContain('2');
    expect(el.textContent).toContain('13');
  });

  it('exports active loans to CSV without errors', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    expect(() => component.exportActiveLoans()).not.toThrow();
    clickSpy.mockRestore();
  });

  it('exports circulation history to CSV without errors', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    component.setActiveTab('history');
    expect(() => component.exportHistory()).not.toThrow();
    clickSpy.mockRestore();
  });

  it('downloads book issue receipt when requested', () => {
    component.downloadReceipt(mockActiveLoans[0]);
    expect(mockBorrowingService.downloadLoanReceipt).toHaveBeenCalledWith('loan-1');
    expect(component.notice()).toContain('Receipt for "Physical Science" (Copy: EFDC94DF-7E0D-4DE5) downloaded.');
  });
});
