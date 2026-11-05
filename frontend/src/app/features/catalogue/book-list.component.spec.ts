import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { of } from 'rxjs';
import { AuthService, UserProfile } from '../auth/auth.service';
import { BookListComponent } from './book-list.component';
import { RecommendationService } from '../recommendations/recommendation.service';

describe('BookListComponent', () => {
  let fixture: ComponentFixture<BookListComponent>;
  let http: HttpTestingController;
  let profile: ReturnType<typeof signal<UserProfile | null>>;

  beforeEach(async () => {
    profile = signal<UserProfile | null>({ id: 'user', email: 'lib@example.edu', role: 'LIBRARIAN' });
    await TestBed.configureTestingModule({
      imports: [BookListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { profile } },
        { provide: RecommendationService, useValue: { getRecommendedBookIds: () => of([]), createRecommendation: () => of({}) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(BookListComponent);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('renders only catalogue records returned by the API and exposes librarian tools', () => {
    http.expectOne('/api/v1/categories').flush([]);
    http.expectOne('/api/v1/books/statistics').flush({ totalBooks: 0, totalCategories: 0, availableCopies: 0, availableBooks: 0, unavailableBooks: 0, minimumPublicationYear: null, maximumPublicationYear: null });
    http.expectOne(request => request.url === '/api/v1/books').flush({
      content: [{ id: 'b-1', title: 'Real API Book', isbn: null, authors: ['A. Author'], categories: ['Computing'], publisher: null,
        publicationYear: null, coverImageUrl: null, circulationPolicy: 'STANDARD', totalCopies: 2, availableCopies: 1,
        onLoanCopies: 1, lostCopies: 0, damagedCopies: 0, withdrawnCopies: 0 }],
      page: 0, size: 12, totalElements: 1, totalPages: 1,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Real API Book');
    expect(fixture.nativeElement.textContent).toContain('1 Available / 2 Copies');
    expect(fixture.nativeElement.querySelector('app-public-navigation')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-public-navigation [aria-current="page"]')?.textContent).toContain('Explore books');
    expect(fixture.nativeElement.querySelector('a[href="/workspace/librarian/books/new"]')).not.toBeNull();
  });

  it('shows an honest empty state when the API returns no books', () => {
    http.expectOne('/api/v1/categories').flush([]);
    http.expectOne('/api/v1/books/statistics').flush({ totalBooks: 0, totalCategories: 0, availableCopies: 0, availableBooks: 0, unavailableBooks: 0, minimumPublicationYear: null, maximumPublicationYear: null });
    http.expectOne(request => request.url === '/api/v1/books').flush({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No books found');
    expect(fixture.nativeElement.textContent).not.toContain('Clean Code');
  });

  it('distinguishes loading from a successfully empty catalogue', () => {
    expect(fixture.nativeElement.textContent).toContain('Loading catalogue totals…');
    http.expectOne('/api/v1/categories').flush([]);
    http.expectOne('/api/v1/books/statistics').flush({ totalBooks: 0, totalCategories: 0, availableCopies: 0, availableBooks: 0, unavailableBooks: 0, minimumPublicationYear: null, maximumPublicationYear: null });
    http.expectOne(request => request.url === '/api/v1/books').flush({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('The catalogue currently has no active books.');
    expect(fixture.nativeElement.textContent).not.toContain('Loading catalogue totals');
  });

  it('shows a distinct error when catalogue statistics cannot be loaded', () => {
    expect(fixture.nativeElement.textContent).toContain('Loading catalogue totals…');
    http.expectOne('/api/v1/categories').flush([]);
    http.expectOne('/api/v1/books/statistics').flush({ message: 'unavailable' }, { status: 503, statusText: 'Service Unavailable' });
    http.expectOne(request => request.url === '/api/v1/books').flush({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Catalogue totals are temporarily unavailable.');
    expect(fixture.nativeElement.textContent).not.toContain('Loading catalogue totals');
    (fixture.nativeElement.querySelector('.stats-note button') as HTMLButtonElement).click();
    http.expectOne('/api/v1/books/statistics').flush({ totalBooks: 12, totalCategories: 4, availableCopies: 17, availableBooks: 9, unavailableBooks: 3, minimumPublicationYear: 2001, maximumPublicationYear: 2025 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.stats-note')).toBeNull();
    expect(fixture.nativeElement.querySelector('.catalogue-stats')?.textContent).toContain('12');
    expect(fixture.nativeElement.querySelector('.catalogue-stats')?.textContent).toContain('17');
  });

  it('opens sign-in for a public visitor without navigating away from the catalogue', () => {
    profile.set(null);
    fixture.detectChanges();
    http.expectOne('/api/v1/categories').flush([]);
    http.expectOne('/api/v1/books/statistics').flush({ totalBooks: 0, totalCategories: 0, availableCopies: 0, availableBooks: 0, unavailableBooks: 0, minimumPublicationYear: null, maximumPublicationYear: null });
    http.expectOne(request => request.url === '/api/v1/books').flush({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dialog.sign-in-dialog')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="tablist"]')).not.toBeNull();
  });

  it('submits the current partial ISBN and replaces prior results with the latest response', () => {
    http.expectOne('/api/v1/categories').flush([]);
    http.expectOne('/api/v1/books/statistics').flush({ totalBooks: 0, totalCategories: 0, availableCopies: 0, availableBooks: 0, unavailableBooks: 0, minimumPublicationYear: null, maximumPublicationYear: null });
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
    http.expectOne('/api/v1/books/statistics').flush({ totalBooks: 0, totalCategories: 0, availableCopies: 0, availableBooks: 0, unavailableBooks: 0, minimumPublicationYear: null, maximumPublicationYear: null });
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
    http.expectOne('/api/v1/categories').flush([{ id: 'cat-programming', name: 'programming', bookCount: 2 }]);
    http.expectOne('/api/v1/books/statistics').flush({ totalBooks: 2, totalCategories: 1, availableCopies: 1, availableBooks: 1, unavailableBooks: 1, minimumPublicationYear: 2019, maximumPublicationYear: 2025 });
    fixture.detectChanges();
    http.expectOne(request => request.url === '/api/v1/books').flush({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
    const categoryChip = [...fixture.nativeElement.querySelectorAll('.category-chip')].find((button: HTMLButtonElement) => button.textContent?.trim() === 'programming') as HTMLButtonElement;
    categoryChip.click();
    http.expectOne(request => request.url === '/api/v1/books' && request.params.get('category') === 'programming').flush({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
    fixture.detectChanges();
    const unavailableCheck = fixture.nativeElement.querySelector('input[aria-label="Not Available"]') as HTMLInputElement;
    unavailableCheck.checked = false; unavailableCheck.dispatchEvent(new Event('change', { bubbles: true }));
    (fixture.nativeElement.querySelector('.apply-filters') as HTMLButtonElement).click();
    http.expectOne(request => request.url === '/api/v1/books' && request.params.get('category') === 'programming' && request.params.get('available') === 'true').flush({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.filters-heading .text-button') as HTMLButtonElement).click();
    http.expectOne(request => request.url === '/api/v1/books' && !request.params.has('q') && !request.params.has('category') && !request.params.has('available')).flush({ content: [{ id: 'complete', title: 'Complete catalogue result', isbn: null, authors: ['Reader'], categories: ['General'], publisher: null, publicationYear: null, coverImageUrl: null, circulationPolicy: 'STANDARD', totalCopies: 1, availableCopies: 1 }], page: 0, size: 12, totalElements: 4, totalPages: 1 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('4 catalogue records');
    expect(fixture.nativeElement.textContent).toContain('Complete catalogue result');
  });

  it('does not let a slower older search replace the newest response', () => {
    http.expectOne('/api/v1/categories').flush([]);
    http.expectOne('/api/v1/books/statistics').flush({ totalBooks: 0, totalCategories: 0, availableCopies: 0, availableBooks: 0, unavailableBooks: 0, minimumPublicationYear: null, maximumPublicationYear: null });
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
  });

  it('uses live statistics, applies publication-year filters, supports backend sorting and switches card views', () => {
    http.expectOne('/api/v1/categories').flush([{ id: 'cat-history', name: 'History', bookCount: 3 }]);
    http.expectOne('/api/v1/books/statistics').flush({ totalBooks: 3, totalCategories: 1, availableCopies: 5, availableBooks: 2, unavailableBooks: 1, minimumPublicationYear: 2018, maximumPublicationYear: 2024 });
    const book = { id: 'year-book', title: 'Year Book', isbn: null, authors: ['Author'], categories: ['History'], publisher: null, publicationYear: 2021, coverImageUrl: null, circulationPolicy: 'STANDARD', totalCopies: 1, availableCopies: 1, onLoanCopies: 0, lostCopies: 0, damagedCopies: 0, withdrawnCopies: 0 };
    http.expectOne(request => request.url === '/api/v1/books').flush({ content: [book], page: 0, size: 12, totalElements: 1, totalPages: 1 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('5');
    expect(fixture.nativeElement.textContent).toContain('History (3)');
    const years = fixture.nativeElement.querySelectorAll('.year-filter input[type="range"]') as NodeListOf<HTMLInputElement>;
    years[0].value = '2020'; years[0].dispatchEvent(new Event('input', { bubbles: true }));
    years[1].value = '2022'; years[1].dispatchEvent(new Event('input', { bubbles: true }));
    (fixture.nativeElement.querySelector('.apply-filters') as HTMLButtonElement).click();
    http.expectOne(request => request.url === '/api/v1/books' && request.params.get('publicationYearFrom') === '2020' && request.params.get('publicationYearTo') === '2022').flush({ content: [book], page: 0, size: 12, totalElements: 1, totalPages: 1 });
    fixture.detectChanges();
    const sort = fixture.nativeElement.querySelector('#catalogue-sort') as HTMLSelectElement;
    sort.value = 'publicationYear:desc'; sort.dispatchEvent(new Event('change', { bubbles: true }));
    http.expectOne(request => request.url === '/api/v1/books' && request.params.get('sort') === 'publicationYear' && request.params.get('direction') === 'desc' && request.params.get('publicationYearFrom') === '2020').flush({ content: [book], page: 0, size: 12, totalElements: 1, totalPages: 1 });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[aria-label="List view"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.book-grid').classList.contains('list-view')).toBe(true);
  });

  it('filters Faculty Recommended through the catalogue API and retains API pagination', () => {
    http.expectOne('/api/v1/categories').flush([]);
    http.expectOne('/api/v1/books/statistics').flush({ totalBooks: 1, totalCategories: 0, availableCopies: 1, availableBooks: 1, unavailableBooks: 0, minimumPublicationYear: null, maximumPublicationYear: null });
    http.expectOne(request => request.url === '/api/v1/books').flush({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
    fixture.componentInstance.recommendedBookIds.set(new Set(['recommended-book']));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.faculty-filter-chip') as HTMLButtonElement).click();
    const request = http.expectOne(request => request.url === '/api/v1/books' && request.params.getAll('bookIds')?.includes('recommended-book') === true);
    request.flush({ content: [{ id: 'recommended-book', title: 'Recommended', isbn: null, authors: ['Faculty'], categories: ['Science'], publisher: null, publicationYear: 2020, coverImageUrl: null, circulationPolicy: 'STANDARD', totalCopies: 1, availableCopies: 1 }], page: 0, size: 12, totalElements: 1, totalPages: 1 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Recommended');
    expect(fixture.nativeElement.textContent).toContain('1 catalogue record');
  });

  it('loads the ranked public API when Trending is selected and keeps the selection visible', () => {
    http.expectOne('/api/v1/categories').flush([]);
    http.expectOne('/api/v1/books/statistics').flush({ totalBooks: 2, totalCategories: 1, availableCopies: 1, availableBooks: 1, unavailableBooks: 1, minimumPublicationYear: null, maximumPublicationYear: null });
    http.expectOne(request => request.url === '/api/v1/books').flush({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
    fixture.componentInstance.changeSort('trending');
    const request = http.expectOne(request => request.url === '/api/v1/books/trending');
    expect(request.request.params.get('days')).toBe('30');
    expect(request.request.params.get('limit')).toBe('12');
    request.flush({ content: [{ id: 'trending-book', title: 'Recent demand', isbn: null, authors: ['Reader'], categories: ['History'], publisher: null, publicationYear: 2024, coverImageUrl: null, circulationPolicy: 'STANDARD', totalCopies: 2, availableCopies: 1, onLoanCopies: 1, lostCopies: 0, damagedCopies: 0, withdrawnCopies: 0, trendingScore: 5, issuedLoanCount: 1, activeReservationCount: 1, directRequestCount: 0 }], page: 0, size: 12, totalElements: 1, totalPages: 1 });
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('#catalogue-sort') as HTMLSelectElement).value).toBe('trending');
    expect(fixture.nativeElement.textContent).toContain('Recent demand');
  });
});
