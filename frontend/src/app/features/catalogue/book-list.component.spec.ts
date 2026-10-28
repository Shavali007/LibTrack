import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthService, UserProfile } from '../auth/auth.service';
import { BookListComponent } from './book-list.component';

describe('BookListComponent', () => {
  let fixture: ComponentFixture<BookListComponent>;
  let http: HttpTestingController;
  let profile: ReturnType<typeof signal<UserProfile | null>>;

  beforeEach(async () => {
    profile = signal<UserProfile | null>({ id: 'user', email: 'lib@example.edu', role: 'LIBRARIAN' });
    await TestBed.configureTestingModule({
      imports: [BookListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), { provide: AuthService, useValue: { profile } }],
    }).compileComponents();
    fixture = TestBed.createComponent(BookListComponent);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('renders only catalogue records returned by the API and exposes librarian tools', () => {
    http.expectOne('/api/v1/categories').flush([]);
    http.expectOne(request => request.url === '/api/v1/books').flush({
      content: [{ id: 'b-1', title: 'Real API Book', isbn: null, authors: ['A. Author'], categories: ['Computing'], publisher: null,
        publicationYear: null, coverImageUrl: null, circulationPolicy: 'STANDARD', totalCopies: 2, availableCopies: 1 }],
      page: 0, size: 12, totalElements: 1, totalPages: 1,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Real API Book');
    expect(fixture.nativeElement.textContent).toContain('1 of 2 copies');
    expect(fixture.nativeElement.querySelector('a[href="/workspace/librarian/books/new"]')).not.toBeNull();
  });

  it('shows an honest empty state when the API returns no books', () => {
    http.expectOne('/api/v1/categories').flush([]);
    http.expectOne(request => request.url === '/api/v1/books').flush({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No books found');
    expect(fixture.nativeElement.textContent).not.toContain('Clean Code');
  });

  it('opens sign-in for a public visitor without navigating away from the catalogue', () => {
    profile.set(null);
    fixture.detectChanges();
    http.expectOne('/api/v1/categories').flush([]);
    http.expectOne(request => request.url === '/api/v1/books').flush({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dialog.sign-in-dialog')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="tablist"]')).not.toBeNull();
  });

  it('submits the current partial ISBN and replaces prior results with the latest response', () => {
    http.expectOne('/api/v1/categories').flush([]);
    http.expectOne(request => request.url === '/api/v1/books').flush({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#q') as HTMLInputElement;
    input.value = '9780306406';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(http.match(request => request.url === '/api/v1/books')).toHaveLength(0);
    (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    const partial = http.expectOne(request => request.url === '/api/v1/books' && request.params.get('q') === '9780306406');
    partial.flush({ content: [{ id: 'python', title: 'python', isbn: '9780306406157', authors: ['shavali'], categories: ['programming'], publisher: null, publicationYear: 2019, coverImageUrl: null, circulationPolicy: 'STANDARD', totalCopies: 1, availableCopies: 1 }], page: 0, size: 12, totalElements: 1, totalPages: 1 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('python');
    input.value = '0000000000';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    http.expectOne(request => request.url === '/api/v1/books' && request.params.get('q') === '0000000000').flush({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No books found');
    expect(fixture.nativeElement.textContent).not.toContain('python');
  });

  it('submits an exact ISBN and uses the last submitted query for pagination', () => {
    http.expectOne('/api/v1/categories').flush([]);
    http.expectOne(request => request.url === '/api/v1/books').flush({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
    const input = fixture.nativeElement.querySelector('#q') as HTMLInputElement;
    input.value = '9780306406157';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    http.expectOne(request => request.url === '/api/v1/books' && request.params.get('q') === '9780306406157').flush({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
    input.value = 'unsubmitted draft';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    fixture.componentInstance.load(1);
    http.expectOne(request => request.url === '/api/v1/books' && request.params.get('q') === '9780306406157' && request.params.get('page') === '1').flush({ content: [], page: 1, size: 12, totalElements: 13, totalPages: 2 });
  });

  it('preserves category and availability filters and clearing them loads the complete catalogue', () => {
    http.expectOne('/api/v1/categories').flush([{ id: 'cat-programming', name: 'programming' }]);
    fixture.detectChanges();
    http.expectOne(request => request.url === '/api/v1/books').flush({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
    const category = fixture.nativeElement.querySelector('#category') as HTMLSelectElement;
    const availability = fixture.nativeElement.querySelector('#availability') as HTMLSelectElement;
    category.value = 'programming'; category.dispatchEvent(new Event('change', { bubbles: true }));
    availability.value = 'true'; availability.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    http.expectOne(request => request.url === '/api/v1/books' && request.params.get('category') === 'programming' && request.params.get('available') === 'true').flush({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.filter-actions .text-button') as HTMLButtonElement).click();
    http.expectOne(request => request.url === '/api/v1/books' && !request.params.has('q') && !request.params.has('category') && !request.params.has('available')).flush({ content: [{ id: 'complete', title: 'Complete catalogue result', isbn: null, authors: ['Reader'], categories: ['General'], publisher: null, publicationYear: null, coverImageUrl: null, circulationPolicy: 'STANDARD', totalCopies: 1, availableCopies: 1 }], page: 0, size: 12, totalElements: 4, totalPages: 1 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('4 catalogue records');
    expect(fixture.nativeElement.textContent).toContain('Complete catalogue result');
  });

  it('does not let a slower older search replace the newest response', () => {
    http.expectOne('/api/v1/categories').flush([]);
    http.expectOne(request => request.url === '/api/v1/books').flush({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
    const input = fixture.nativeElement.querySelector('#q') as HTMLInputElement;
    const submit = () => { input.dispatchEvent(new Event('input', { bubbles: true })); (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).click(); };
    input.value = 'older'; submit();
    const older = http.expectOne(request => request.params.get('q') === 'older');
    input.value = 'newer'; submit();
    const newer = http.expectOne(request => request.params.get('q') === 'newer');
    newer.flush({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
    older.flush({ content: [{ id: 'stale', title: 'Stale result', isbn: null, authors: [], categories: [], publisher: null, publicationYear: null, coverImageUrl: null, circulationPolicy: 'STANDARD', totalCopies: 0, availableCopies: 0 }], page: 0, size: 12, totalElements: 1, totalPages: 1 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No books found');
    expect(fixture.nativeElement.textContent).not.toContain('Stale result');
  });});
