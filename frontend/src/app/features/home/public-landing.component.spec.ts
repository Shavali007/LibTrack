import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { BookSummary, CatalogueService, Page } from '../catalogue/catalogue.service';
import { AuthService, UserProfile } from '../auth/auth.service';
import { PublicLandingComponent } from './public-landing.component';

describe('PublicLandingComponent', () => {
  const emptyPage: Page<BookSummary> = { content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 };
  const realBook: BookSummary = { id: 'real-1', title: 'Real catalogue title', isbn: null, authors: ['A. Writer'], categories: ['History'], publisher: null, publicationYear: 2025, coverImageUrl: null, circulationPolicy: 'STANDARD' as const, totalCopies: 3, availableCopies: 2 };

  async function setup(profile: UserProfile | null = null, page: Page<BookSummary> = emptyPage) {
    await TestBed.configureTestingModule({
      imports: [PublicLandingComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { profile: signal(profile) } }, { provide: CatalogueService, useValue: { search: vi.fn(() => of(page)) } }],
    }).compileComponents();
    const fixture: ComponentFixture<PublicLandingComponent> = TestBed.createComponent(PublicLandingComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, router: TestBed.inject(Router) };
  }

  it('presents the requested public navigation, exact hero copy, collection heading and footer', async () => {
    const { fixture } = await setup();
    const text = fixture.nativeElement.textContent as string;
    const nav = fixture.nativeElement.querySelector('header nav') as HTMLElement;
    expect(nav.textContent).toContain('Home');
    expect(nav.textContent).toContain('Explore books');
    expect(nav.textContent).toContain('About');
    expect(nav.textContent).toContain('Sign in');
    expect(nav.textContent).not.toMatch(/Student View|Faculty View|Librarian View/);
    expect(text).toContain('A quieter space for curious minds.');
    expect(text).toContain('Discover books, manage your borrowing, and explore a smarter library experience with LibTrack.');
    expect(text).toContain('LIBRARY COLLECTION');
    expect(text).toContain('Featured Volumes');
    expect(text).toContain('Browse Full Catalog');
    expect(text).toContain('© 2026 LibTrack Academic Library Systems. All rights reserved.');
    expect(fixture.nativeElement.querySelector('input[name="search"]')).not.toBeNull();
    expect(text).toContain('No books are currently listed in the catalogue.');
  });

  it('preserves the search query when navigating to the existing catalogue', async () => {
    const { fixture, component, router } = await setup();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const input = fixture.nativeElement.querySelector('#landing-search') as HTMLInputElement;
    input.value = '  python 101  ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.hero-search') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(navigate).toHaveBeenCalledWith(['/books'], { queryParams: { q: 'python 101' } });
  });

  it('renders only real API books with category and availability counts', async () => {
    const { fixture } = await setup(null, { content: [realBook], page: 0, size: 12, totalElements: 1, totalPages: 1 });
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Real catalogue title');
    expect(text).toContain('A. Writer');
    expect(text).toContain('History');
    expect(text).toContain('Available · 2 of 3');
    expect(fixture.nativeElement.querySelectorAll('.featured-book')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.reserve-button')).not.toBeNull();
  });

  it('retains the selected book, explains that no request was sent, and routes to details after sign-in', async () => {
    const { component, router } = await setup(null, { content: [realBook], page: 0, size: 12, totalElements: 1, totalPages: 1 });
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.holdBook(realBook);
    expect(component.showDialog()).toBe(true);
    expect(component.selectedBook()?.id).toBe(realBook.id);
    expect(component.signInContext()).toContain('No request has been sent');
    component.onAuthenticated({ id: 'student-1', email: 'student@example.edu', role: 'STUDENT' });
    expect(navigate).toHaveBeenCalledWith(['/books', realBook.id]);
  });

  it('shows an honest catalogue loading error instead of sample records', async () => {
    await TestBed.configureTestingModule({
      imports: [PublicLandingComponent], providers: [provideRouter([]), { provide: AuthService, useValue: { profile: signal(null) } }, { provide: CatalogueService, useValue: { search: () => throwError(() => new Error('offline')) } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(PublicLandingComponent); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('The featured catalogue could not be loaded.');
    expect(fixture.nativeElement.textContent).not.toContain('Clean Code');
  });
});


