import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FinePolicyUpdateRequest, LibrarianOperationsService } from './librarian-operations.service';

describe('LibrarianOperationsService', () => {
  let service: LibrarianOperationsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LibrarianOperationsService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(LibrarianOperationsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches reports summary', () => {
    service.getReportsSummary().subscribe(res => {
      expect(res.inventory.totalBooks).toBe(248);
      expect(res.circulation.activeLoans).toBe(42);
    });

    const req = httpMock.expectOne('/api/v1/librarian/reports/summary');
    expect(req.request.method).toBe('GET');
    req.flush({
      inventory: { totalBooks: 248, totalCopies: 1320, availableCopies: 1200, onLoanCopies: 42, lostCopies: 0, damagedCopies: 0, withdrawnCopies: 0 },
      circulation: { totalLoans: 500, activeLoans: 42, overdueLoans: 2, returnedLoans: 456 },
      overdueLoans: [],
      topBooks: []
    });
  });

  it('fetches fines policy', () => {
    service.getFinesPolicy().subscribe(res => {
      expect(res.status).toBe('ACTIVE');
      expect(res.monetaryFinesEnabled).toBe(true);
      expect(res.dailyFineRate).toBe(10);
      expect(res.maximumFinePerBook).toBe(500);
      expect(res.gracePeriodDays).toBe(0);
    });

    const req = httpMock.expectOne('/api/v1/librarian/fines/policy');
    expect(req.request.method).toBe('GET');
    req.flush({
      status: 'ACTIVE',
      policyTitle: 'Current Fine Policy',
      policyDescription: 'Overdue fines accrue ₹10 per day, with manual payment.',
      monetaryFinesEnabled: true,
      dailyFineRate: 10,
      maximumFinePerBook: 500,
      gracePeriodDays: 0,
      loanPeriodDays: 21,
      configured: true,
      overdueLoansCount: 0,
      overdueLoans: []
    });
  });

  it('fetches settings list', () => {
    service.getAllSettings().subscribe(settings => {
      expect(settings.length).toBe(1);
      expect(settings[0].key).toBe('loan.period.student.days');
    });

    const req = httpMock.expectOne('/api/v1/librarian/settings');
    expect(req.request.method).toBe('GET');
    req.flush([{ key: 'loan.period.student.days', value: '14', updatedAt: '2026-10-29T10:00:00Z', updatedByEmail: null }]);
  });

  it('updates the whole fine policy through the CSRF-protected settings endpoint', () => {
    const update: FinePolicyUpdateRequest = {
      dailyFineRate: 5,
      maximumFinePerBook: 200,
      gracePeriodDays: 2,
      loanPeriodDays: 30
    };
    service.updateFinePolicy(update).subscribe();

    const csrf = httpMock.expectOne('/api/v1/auth/csrf');
    expect(csrf.request.method).toBe('GET');
    csrf.flush({ headerName: 'X-XSRF-TOKEN', token: 'csrf-value' });

    const request = httpMock.expectOne('/api/v1/librarian/settings/fine-policy');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(update);
    expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-value');
    request.flush(null);
  });
});
