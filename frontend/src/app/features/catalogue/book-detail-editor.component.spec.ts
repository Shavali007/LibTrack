import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthService, UserProfile } from '../auth/auth.service';
import { BookDetailComponent, BookEditorComponent } from './book-detail-editor.component';

const book = {
  id: 'book-1', title: 'Available title', isbn: '9780306406157', authors: ['A. Author'], categories: ['Computing'],
  publisher: null, publicationYear: null, coverImageUrl: null, circulationPolicy: 'STANDARD', totalCopies: 1,
  availableCopies: 1, onLoanCopies: 0, lostCopies: 0, damagedCopies: 0, withdrawnCopies: 0,
  description: null, active: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
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
      circulationPolicy: 'STANDARD', ...overrides,
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
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('does not render or submit the quantity on an existing book edit', () => {
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
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('shows an error and never renders misleading zero inventory counts', () => {
    expect(fixture.nativeElement.textContent).toContain('Inventory counts could not be loaded');
    expect(fixture.nativeElement.querySelector('.inventory-counts')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('private API error');
  });
});

