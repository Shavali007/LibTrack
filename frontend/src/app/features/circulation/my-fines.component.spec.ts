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
        bookId: 'book-1',
        bookTitle: 'Clean Architecture',
        bookIsbn: '978-0134494166',
        copyIdentifier: 'CP-1001',
        issueDate: '2026-10-01',
        dueDate: '2026-10-22',
        actualReturnDate: null,
        loanStatus: 'ACTIVE',
        dailyRate: 10.0,
        maxFine: 500.0,
        overdueDays: 3,
        fineAmount: 30.0,
        status: 'UNPAID',
        assessedAt: '2026-10-25T08:00:00Z',
        paidAt: null,
        payments: []
      }
    ])
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
    expect(text).toContain('Clean Architecture');
    expect(text).toContain('CP-1001');
    expect(text).toContain('3 day(s)');
    expect(text).toContain('₹30.00');
    expect(text).toContain('UNPAID');
    expect(text).toContain('Pay at Circulation Desk');
  });
});
