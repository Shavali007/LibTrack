import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { FinesViewerComponent } from './fines-viewer.component';
import { LibrarianOperationsService } from './librarian-operations.service';

describe('FinesViewerComponent', () => {
  let fixture: ComponentFixture<FinesViewerComponent>;

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
      overdueLoansCount: 0,
      overdueLoans: []
    })
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
});
