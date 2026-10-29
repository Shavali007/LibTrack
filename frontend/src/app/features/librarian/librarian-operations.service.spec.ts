import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LibrarianOperationsService } from './librarian-operations.service';

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
      expect(res.status).toBe('UNCONFIGURED');
      expect(res.monetaryFinesEnabled).toBe(false);
    });

    const req = httpMock.expectOne('/api/v1/librarian/fines/policy');
    expect(req.request.method).toBe('GET');
    req.flush({
      status: 'UNCONFIGURED',
      policyTitle: 'Institutional Monetary Fines Policy',
      policyDescription: 'No fine policy enabled.',
      monetaryFinesEnabled: false,
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
});
