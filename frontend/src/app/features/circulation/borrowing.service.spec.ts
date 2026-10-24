import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BorrowingService } from './borrowing.service';

describe('BorrowingService', () => {
  let service: BorrowingService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(BorrowingService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('loads only the current member request endpoint', () => {
    service.myRequests().subscribe(result => expect(result.content).toEqual([]));
    const request = http.expectOne(r => r.url === '/api/v1/borrow-requests/mine' && r.params.get('size') === '20');
    expect(request.request.method).toBe('GET');
    request.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  });

  it('fetches session CSRF before a borrow request and sends the book id', () => {
    service.submit('book-1').subscribe(result => expect(result.id).toBe('request-1'));
    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'csrf-test' });
    const request = http.expectOne('/api/v1/borrow-requests');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ bookId: 'book-1' });
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('csrf-test');
    request.flush({ id: 'request-1' });
  });

  it('uses a CSRF-protected online renewal without browser token storage', () => {
    service.renew('loan-1').subscribe(result => expect(result.renewalCount).toBe(1));
    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'csrf-test' });
    const request = http.expectOne('/api/v1/loans/loan-1/renew');
    expect(request.request.body).toEqual({});
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('csrf-test');
    request.flush({ renewalCount: 1 });
  });

  it('requires session CSRF for recording a return and carries the selected condition', () => {
    service.returnLoan('loan-1', 'DAMAGED', 'Cover damaged').subscribe();
    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'csrf-test' });
    const request = http.expectOne('/api/v1/loans/loan-1/return');
    expect(request.request.body).toEqual({ condition: 'DAMAGED', note: 'Cover damaged' });
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('csrf-test');
    request.flush({});
  });
});
