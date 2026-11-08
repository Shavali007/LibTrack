import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { of } from 'rxjs';
import { AuthService, UserProfile } from '../auth/auth.service';
import { BookDetailComponent, BookEditorComponent } from './book-detail-editor.component';
import { RecommendationService } from '../recommendations/recommendation.service';
import { ReviewService } from '../reviews/review.service';

const mockReviewService = {
  getSummary: () => of({ averageRating: null, totalReviews: 0 }),
  getReviews: () => of({ content: [], totalElements: 0, totalPages: 0, size: 10, number: 0 }),
  checkEligibility: () => of({ eligible: false, reason: 'Test', hasReviewed: false, hasBorrowed: false, hasDigitalAccess: false }),
  submitReview: () => of({}),
  formatRelativeTime: () => 'just now',
  getAvatarColor: () => ({ bg: '#E3F2E9', text: '#15803D' })
};

const book = {
  id: 'book-1', title: 'Available title', isbn: '9780306406157', authors: ['A. Author'], categories: ['Computing'],
  publisher: null, publicationYear: null, coverImageUrl: null, circulationPolicy: 'STANDARD', totalCopies: 1,
  availableCopies: 1, onLoanCopies: 0, lostCopies: 0, damagedCopies: 0, withdrawnCopies: 0,
  description: null, department: 'Computer Science and Engineering', active: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

describe('BookDetailComponent public reservation guard', () => {
  let fixture: ComponentFixture<BookDetailComponent>;
  let http: HttpTestingController;
  let profile: ReturnType<typeof signal<UserProfile | null>>;

  beforeEach(async () => {
    profile = signal<UserProfile | null>(null);
    await TestBed.configureTestingModule({
      imports: [BookDetailComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'book-1' } } } },
        { provide: AuthService, useValue: { profile, login: () => { throw new Error('Login should not be called in this test'); } } },
        { provide: RecommendationService, useValue: { getRecommendationsForBook: () => of([]), markHelpful: () => of({}), removeHelpful: () => of({}) } },
        { provide: ReviewService, useValue: mockReviewService },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(BookDetailComponent);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/books/book-1').flush(book);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('1 total copies · 1 available · 0 on loan');
  });

  afterEach(() => http.verify());

  it('opens sign-in for a visitor and sends no borrowing request before authentication', () => {
    fixture.nativeElement.querySelector('.detail-copy .actions button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Authentication Required: Please sign in to reserve books.');
    expect(fixture.nativeElement.querySelector('dialog.sign-in-dialog')).not.toBeNull();
    http.expectNone('/api/v1/borrow-requests');
  });
});

@Component({ standalone: true, template: '' })
class BookEditorRouteStub {}

describe('BookEditorComponent create validation and API flow', () => {
  let fixture: ComponentFixture<BookEditorComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookEditorComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        provideRouter([{ path: 'books/:bookId', component: BookEditorRouteStub }]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(BookEditorComponent);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function fillValidForm(overrides: Record<string, string> = {}): void {
    fixture.componentInstance.form.patchValue({
      title: 'Python', authors: 'Shavali', categories: 'Programming', isbn: '9780306406157',
      numberOfCopies: '1', publisher: 'Sravan', publicationYear: '2019', coverImageUrl: '', description: 'Nice',
      circulationPolicy: 'STANDARD', department: 'Computer Science and Engineering', ...overrides,
    });
  }

  it('accepts a valid ISBN-10 with its check digit', () => {
    fillValidForm({ isbn: '0306406152' });
    expect(fixture.componentInstance.form.controls.isbn.valid).toBe(true);
  });

  it('shows an ISBN check-digit error and does not make an API request', () => {
    fillValidForm({ isbn: 'ISBN-67' });
    fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#isbn-error')?.textContent).toContain('valid ISBN-10 or ISBN-13');
    expect(fixture.nativeElement.querySelector('#isbn').getAttribute('aria-invalid')).toBe('true');
    http.expectNone('/api/v1/auth/csrf');
  });

  it('shows a publication year field error and does not make an API request', () => {
    fillValidForm({ publicationYear: '999' });
    fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#publication-year-error')?.textContent).toContain('between 1000 and');
    http.expectNone('/api/v1/auth/csrf');
  });

  it('rejects unsafe cover URLs but permits an empty optional cover URL', () => {
    fillValidForm({ coverImageUrl: 'javascript:alert(1)' });
    fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#cover-url-error')?.textContent).toContain('HTTP or HTTPS');
    http.expectNone('/api/v1/auth/csrf');
  });

  it('creates a book with a valid ISBN and optional empty cover after sending CSRF', () => {
    fillValidForm({ coverImageUrl: '' });
    fixture.componentInstance.submit();
    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'catalogue-csrf' });
    const request = http.expectOne('/api/v1/books');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('catalogue-csrf');
    expect(request.request.body.isbn).toBe('9780306406157');
    expect(request.request.body.publicationYear).toBe(2019);
    expect(request.request.body.coverImageUrl).toBeNull();
    expect(request.request.body.numberOfCopies).toBe(1);
    request.flush({ id: 'created-book' }, { status: 201, statusText: 'Created' });
  });

  it('defaults quantity to one and reports invalid whole-number ranges', () => {
    expect(fixture.componentInstance.form.controls.numberOfCopies.value).toBe('1');
    expect(fixture.nativeElement.querySelector('#numberOfCopies')).not.toBeNull();
    for (const quantity of ['', '0', '-1', '501', '1.5']) {
      fillValidForm({ numberOfCopies: quantity });
      fixture.componentInstance.submit();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#number-of-copies-error')?.textContent).toContain('whole number from 1 to 500');
      http.expectNone('/api/v1/auth/csrf');
    }
  });

  it('shows structured backend validation beside the field and sanitizes database errors', () => {
    fillValidForm();
    fixture.componentInstance.submit();
    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'catalogue-csrf' });
    http.expectOne('/api/v1/books').flush({ code: 'VALIDATION_ERROR', message: 'Review fields.', fieldErrors: { isbn: 'ISBN must be a valid ISBN-10 or ISBN-13' } }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#isbn-error')?.textContent).toContain('valid ISBN-10 or ISBN-13');

    fillValidForm({ title: 'Second book' });
    fixture.componentInstance.submit();
    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'catalogue-csrf' });
    http.expectOne('/api/v1/books').flush({ message: 'SQL constraint details from a private database host' }, { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('server or database error');
    expect(fixture.nativeElement.textContent).not.toContain('SQL constraint details');
  });
});

describe('BookEditorComponent edit quantity behavior', () => {
  let fixture: ComponentFixture<BookEditorComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookEditorComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        provideRouter([{ path: 'books/:bookId', component: BookEditorRouteStub }]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'book-1' } } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(BookEditorComponent);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/books/book-1').flush(book);
    http.expectOne('/api/v1/books/book-1/digital-edition').flush(null, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('does not render or submit the quantity on an existing book edit metadata form', () => {
    expect(fixture.nativeElement.querySelector('#numberOfCopies')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Total copies');
    expect(fixture.nativeElement.textContent).toContain('Available');
    expect(fixture.nativeElement.textContent).toContain('Withdrawn');
    expect(fixture.nativeElement.querySelector('a[href="/workspace/librarian/books/book-1/copies"]')).not.toBeNull();
    fixture.componentInstance.form.patchValue({ title: 'Updated title', authors: 'A. Author', categories: 'Computing', numberOfCopies: '25' });
    fixture.componentInstance.submit();
    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'edit-csrf' });
    const update = http.expectOne('/api/v1/books/book-1');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).not.toHaveProperty('numberOfCopies');
    update.flush({ ...book, title: 'Updated title' });
  });

  it('renders reconciliation section, previews changes, and successfully reconciles inventory', () => {
    expect(fixture.nativeElement.querySelector('.reconcile-panel')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#reconcile-target')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Target matches current total');

    // Preview increase
    fixture.componentInstance.onTargetChange('5');
    fixture.componentInstance.reconcileLocation.set('Shelf B');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('+4 copies will be generated');

    // Apply increase
    fixture.componentInstance.applyReconciliation();
    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'reconcile-csrf' });
    const reconcileReq = http.expectOne('/api/v1/books/book-1/inventory/reconcile');
    expect(reconcileReq.request.method).toBe('POST');
    expect(reconcileReq.request.body).toEqual({ targetQuantity: 5, location: 'Shelf B' });
    reconcileReq.flush({ ...book, totalCopies: 5, availableCopies: 5 });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Inventory reconciled successfully. Total copies is now 5');
    expect(fixture.nativeElement.querySelector('.inventory-counts').textContent).toContain('5');
  });

  it('displays reconciliation error message when reduction cannot be performed', () => {
    fixture.componentInstance.onTargetChange('0');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('-1 copies');

    fixture.componentInstance.applyReconciliation();
    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'reconcile-csrf' });
    const reconcileReq = http.expectOne('/api/v1/books/book-1/inventory/reconcile');
    reconcileReq.flush({ message: 'Cannot reduce inventory: copies have loan history.' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cannot reduce inventory: copies have loan history.');
  });
});

describe('BookEditorComponent inventory load failure', () => {
  let fixture: ComponentFixture<BookEditorComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookEditorComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'book-1' } } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(BookEditorComponent);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/books/book-1').flush({ message: 'private API error' }, { status: 500, statusText: 'Internal Server Error' });
    http.expectOne('/api/v1/books/book-1/digital-edition').flush(null, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('shows an error and never renders misleading zero inventory counts', () => {
    expect(fixture.nativeElement.textContent).toContain('Inventory counts could not be loaded');
    expect(fixture.nativeElement.querySelector('.inventory-counts')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('private API error');
  });
});

describe('BookDetailComponent digital edition behavior', () => {
  let fixture: ComponentFixture<BookDetailComponent>;
  let http: HttpTestingController;
  let profile: ReturnType<typeof signal<UserProfile | null>>;

  const digitalBook = {
    ...book,
    hasDigitalEdition: true,
  };

  const edition = {
    id: 'de-1',
    bookId: 'book-1',
    originalFilename: 'algorithms.pdf',
    contentType: 'application/pdf',
    fileSize: 2048576,
    editionLabel: '2nd Ed',
    uploadedAt: '2026-02-01T10:00:00Z',
  };

  beforeEach(async () => {
    profile = signal<UserProfile | null>(null);
    await TestBed.configureTestingModule({
      imports: [BookDetailComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'book-1' } } } },
        { provide: AuthService, useValue: { profile, login: () => {} } },
        { provide: RecommendationService, useValue: { getRecommendationsForBook: () => of([]), markHelpful: () => of({}), removeHelpful: () => of({}) } },
        { provide: ReviewService, useValue: mockReviewService },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(BookDetailComponent);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/books/book-1').flush(digitalBook);
    http.expectOne('/api/v1/books/book-1/digital-edition').flush(edition);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('renders digital edition section with metadata and prompts authentication for visitor', () => {
    expect(fixture.nativeElement.textContent).toContain('PDF Book Edition');
    expect(fixture.nativeElement.textContent).toContain('Digital Available');
    expect(fixture.nativeElement.textContent).toContain('algorithms.pdf');
    expect(fixture.nativeElement.textContent).toContain('2.0 MB');
    expect(fixture.nativeElement.textContent).toContain('2nd Ed');

    const readBtn = fixture.nativeElement.querySelector('.digital-actions button');
    expect(readBtn.textContent).toContain('Sign in to Read Online');
    readBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Authentication Required: Please sign in to read the digital edition.');
    expect(fixture.nativeElement.querySelector('dialog.sign-in-dialog')).not.toBeNull();
  });

  it('exposes direct Read Online and Download links when signed in as student', () => {
    profile.set({ id: 's-1', email: 'student@example.com', role: 'STUDENT' });
    fixture.detectChanges();
    http.expectOne('/api/v1/borrow-requests/eligibility?bookId=book-1').flush({
      eligible: true,
      hasActiveLoan: false,
      hasActiveRequest: false,
      activeRequestStatus: null,
      hasReturnedHistory: false,
      reason: null
    });
    fixture.detectChanges();

    const readLink = fixture.nativeElement.querySelector('.digital-actions a[href="/books/book-1/read"]');
    expect(readLink).not.toBeNull();
    expect(readLink.textContent).toContain('Read Online');

    const downloadLink = fixture.nativeElement.querySelector('.digital-actions a[download]');
    expect(downloadLink).not.toBeNull();
    expect(downloadLink.getAttribute('href')).toBe('/api/v1/books/book-1/digital-edition/download');
  });
});

describe('BookEditorComponent digital edition management', () => {
  let fixture: ComponentFixture<BookEditorComponent>;
  let http: HttpTestingController;

  const edition = {
    id: 'de-1',
    bookId: 'book-1',
    originalFilename: 'course-text.pdf',
    contentType: 'application/pdf',
    fileSize: 1048576,
    editionLabel: '1st Edition',
    uploadedAt: '2026-03-01T12:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookEditorComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'book-1' } } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(BookEditorComponent);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/books/book-1').flush({ ...book, hasDigitalEdition: true });
    http.expectOne('/api/v1/books/book-1/digital-edition').flush(edition);
    http.expectOne('/api/v1/books/book-1/chapters').flush([
      { id: 'ch-1', digitalEditionId: 'de-1', chapterNumber: 1, title: 'Introduction', startPage: 1, endPage: 20, isManuallyEdited: false, createdAt: '2026-03-01T12:00:00Z', updatedAt: '2026-03-01T12:00:00Z' }
    ]);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('renders attached digital edition and chapter management table', () => {
    expect(fixture.nativeElement.querySelector('.digital-editor-card')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('PDF Attached');
    expect(fixture.nativeElement.textContent).toContain('course-text.pdf');
    expect(fixture.nativeElement.textContent).toContain('1.0 MB');
    expect(fixture.nativeElement.textContent).toContain('Chapter Navigation & Indexing');
    expect(fixture.nativeElement.textContent).toContain('Introduction');
    expect(fixture.nativeElement.textContent).toContain('pp. 1–20');
  });

  it('renders attached digital edition and allows deletion with confirmation without touching copies', () => {
    expect(fixture.nativeElement.querySelector('.digital-editor-card')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('PDF Attached');
    expect(fixture.nativeElement.textContent).toContain('course-text.pdf');
    expect(fixture.nativeElement.textContent).toContain('1.0 MB');

    // Click remove digital edition
    fixture.componentInstance.confirmingDelete.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Confirm removing PDF edition?');

    fixture.componentInstance.deleteEdition();
    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'del-csrf' });
    const delReq = http.expectOne('/api/v1/books/book-1/digital-edition');
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush(null);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Digital edition removed successfully.');
    expect(fixture.nativeElement.textContent).toContain('None Attached');
  });
});

describe('BookDetailComponent borrowing eligibility and duplicate restriction', () => {
  let fixture: ComponentFixture<BookDetailComponent>;
  let http: HttpTestingController;
  let profile: ReturnType<typeof signal<UserProfile | null>>;

  beforeEach(async () => {
    profile = signal<UserProfile | null>({ id: 's-1', email: 'student@example.edu', role: 'STUDENT' });
    await TestBed.configureTestingModule({
      imports: [BookDetailComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'book-1' } } } },
        { provide: AuthService, useValue: { profile, login: () => {} } },
        { provide: RecommendationService, useValue: { getRecommendationsForBook: () => of([]), markHelpful: () => of({}), removeHelpful: () => of({}) } },
        { provide: ReviewService, useValue: mockReviewService },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(BookDetailComponent);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/books/book-1').flush(book);
    http.expectOne('/api/v1/wishlist/status?bookIds=book-1').flush({ 'book-1': false });
    http.expectOne('/api/v1/reservations/books/book-1/active').flush(null);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('allows borrowing with enabled button when user previously returned the book', () => {
    const eligReq = http.expectOne('/api/v1/borrow-requests/eligibility?bookId=book-1');
    eligReq.flush({
      eligible: true,
      hasActiveLoan: false,
      hasActiveRequest: false,
      activeRequestStatus: null,
      hasReturnedHistory: true,
      reason: null
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.active-borrowing-box')).toBeNull();
    const actionBtn = fixture.nativeElement.querySelector('.detail-copy .actions button');
    expect(actionBtn.disabled).toBe(false);
    expect(actionBtn.textContent.trim()).toBe('Request this book');
    expect(fixture.nativeElement.textContent).not.toContain('You have already borrowed this book previously');
  });

  it('blocks duplicate borrowing when an active loan exists', () => {
    const eligReq = http.expectOne('/api/v1/borrow-requests/eligibility?bookId=book-1');
    eligReq.flush({
      eligible: false,
      hasActiveLoan: true,
      hasActiveRequest: false,
      activeRequestStatus: null,
      hasReturnedHistory: false,
      reason: 'You currently have an active loan for this book. Please return your current copy before requesting another.'
    });
    fixture.detectChanges();

    const box = fixture.nativeElement.querySelector('.active-borrowing-box');
    expect(box).not.toBeNull();
    expect(box.textContent).toContain('You currently have an active loan for this book');
    const disabledBtn = fixture.nativeElement.querySelector('.detail-copy .actions button.btn-disabled-action');
    expect(disabledBtn).not.toBeNull();
    expect(disabledBtn.disabled).toBe(true);
    expect(disabledBtn.textContent.trim()).toBe('Active Loan in Progress');
  });

  it('blocks duplicate borrowing when a pending request exists', () => {
    const eligReq = http.expectOne('/api/v1/borrow-requests/eligibility?bookId=book-1');
    eligReq.flush({
      eligible: false,
      hasActiveLoan: false,
      hasActiveRequest: true,
      activeRequestStatus: 'PENDING',
      hasReturnedHistory: false,
      reason: 'You already have a pending borrowing request for this book.'
    });
    fixture.detectChanges();

    const box = fixture.nativeElement.querySelector('.active-borrowing-box');
    expect(box).not.toBeNull();
    expect(box.textContent).toContain('You already have a pending borrowing request');
    const disabledBtn = fixture.nativeElement.querySelector('.detail-copy .actions button.btn-disabled-action');
    expect(disabledBtn).not.toBeNull();
    expect(disabledBtn.disabled).toBe(true);
    expect(disabledBtn.textContent.trim()).toBe('Request Pending Review');
  });

  it('blocks duplicate borrowing when an approved request awaits collection', () => {
    const eligReq = http.expectOne('/api/v1/borrow-requests/eligibility?bookId=book-1');
    eligReq.flush({
      eligible: false,
      hasActiveLoan: false,
      hasActiveRequest: true,
      activeRequestStatus: 'APPROVED',
      hasReturnedHistory: false,
      reason: 'You already have an approved request awaiting book issuance.'
    });
    fixture.detectChanges();

    const box = fixture.nativeElement.querySelector('.active-borrowing-box');
    expect(box).not.toBeNull();
    expect(box.textContent).toContain('approved request awaiting book issuance');
    const disabledBtn = fixture.nativeElement.querySelector('.detail-copy .actions button.btn-disabled-action');
    expect(disabledBtn).not.toBeNull();
    expect(disabledBtn.disabled).toBe(true);
    expect(disabledBtn.textContent.trim()).toBe('Request Approved — Awaiting Pick-up');
  });
});
