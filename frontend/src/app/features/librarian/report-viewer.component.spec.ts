import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { LibrarianOperationsService } from './librarian-operations.service';
import { ReportViewerComponent } from './report-viewer.component';

describe('ReportViewerComponent', () => {
  let fixture: ComponentFixture<ReportViewerComponent>;

  const mockOpsService: Partial<LibrarianOperationsService> = {
    getReportsSummary: () => of({
      inventory: { totalBooks: 248, totalCopies: 1320, availableCopies: 1200, onLoanCopies: 42, lostCopies: 1, damagedCopies: 2, withdrawnCopies: 3 },
      circulation: { totalLoans: 500, activeLoans: 42, overdueLoans: 1, returnedLoans: 456 },
      overdueLoans: [{
        loanId: 'l1',
        bookTitle: 'Clean Code',
        bookIsbn: '9780132350884',
        copyIdentifier: 'CC-001',
        borrowerName: '23MIC7248',
        borrowerEmail: 'student@vitapstudent.ac.in',
        borrowerInstitutionalId: '23MIC7248',
        issueDate: '2026-10-01',
        dueDate: '2026-10-15',
        daysOverdue: 14
      }],
      topBooks: [{
        bookId: 'b1',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        isbn: '9780132350884',
        loanCount: 25
      }]
    })
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportViewerComponent],
      providers: [
        { provide: LibrarianOperationsService, useValue: mockOpsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportViewerComponent);
    fixture.detectChanges();
  });

  it('renders inventory metrics and overdue items correctly', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Total Titles');
    expect(text).toContain('248');
    expect(text).toContain('Total Physical Copies');
    expect(text).toContain('1320');
    expect(text).toContain('Clean Code');
    expect(text).toContain('Robert C. Martin');
    expect(text).toContain('14d late');
  });
});
