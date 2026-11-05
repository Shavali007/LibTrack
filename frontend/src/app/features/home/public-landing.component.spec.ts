import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { CatalogueService, Page, TrendingBook } from '../catalogue/catalogue.service';
import { AuthService, UserProfile } from '../auth/auth.service';
import { PublicLandingComponent } from './public-landing.component';

describe('PublicLandingComponent', () => {
  const emptyPage: Page<TrendingBook> = { content: [], page: 0, size: 4, totalElements: 0, totalPages: 0 };
  const realBook: TrendingBook = { id: 'real-1', title: 'Real catalogue title', isbn: null, authors: ['A. Writer'], categories: ['History'], publisher: null, publicationYear: 2025, coverImageUrl: null, circulationPolicy: 'STANDARD' as const, totalCopies: 3, availableCopies: 2, onLoanCopies: 1, lostCopies: 0, damagedCopies: 0, withdrawnCopies: 0, trendingScore: 5, issuedLoanCount: 1, activeReservationCount: 1, directRequestCount: 0 };

  async function setup(profile: UserProfile | null = null, page: Page<TrendingBook> = emptyPage) {
    await TestBed.configureTestingModule({
      imports: [PublicLandingComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { profile: signal(profile) } }, { provide: CatalogueService, useValue: { trending: vi.fn(() => of(page)) } }],
    }).compileComponents();
    const fixture: ComponentFixture<PublicLandingComponent> = TestBed.createComponent(PublicLandingComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, router: TestBed.inject(Router) };
  }

  it('presents the requested public navigation, exact hero copy, collection heading and footer', async () => {
    const { fixture } = await setup();
    const text = fixture.nativeElement.textContent as string;
    const nav = fixture.nativeElement.querySelector('header nav') as HTMLElement;
    expect(fixture.nativeElement.querySelector('app-public-navigation')).not.toBeNull();
    expect(nav.textContent).toContain('Home');
    expect(nav.textContent).toContain('Explore books');
    expect(nav.textContent).toContain('About');
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toContain('Home');
    expect(nav.textContent).toContain('Sign in');
    expect(nav.textContent).not.toMatch(/Student View|Faculty View|Librarian View/);
    expect(text).toContain('A quieter space for curious minds.');
    expect(text).toContain('Discover books, manage your borrowing, and explore a smarter library experience with LibTrack.');
    expect(text).toContain('LIBRARY COLLECTION');
    expect(text).toContain('Trending Books');
    expect(text).toContain('Popular titles based on recent borrowing and reservation activity.');
    expect(text).toContain('View All Trending Books');
    expect(text).toContain('© 2026 LibTrack Academic Library Systems. All rights reserved.');
    expect(fixture.nativeElement.querySelector('input[name="search"]')).not.toBeNull();
    expect(text).toContain('No books are currently listed in the catalogue.');
    expect((fixture.nativeElement.querySelector('.browse-link') as HTMLAnchorElement).getAttribute('href')).toContain('/books?sort=trending');
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
    const card = fixture.nativeElement.querySelector('.featured-book') as HTMLElement;
    expect(card.children[0].classList.contains('featured-cover')).toBe(true);
    expect(card.children[1].classList.contains('featured-book-copy')).toBe(true);
    expect(card.querySelector('.book-category')?.parentElement).toBe(card.children[1]);
    expect(card.querySelector('.reserve-button')?.parentElement).toBe(card.children[1]);
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

  it('shows an honest trending loading error and retries the API instead of sample records', async () => {
    const trending = vi.fn(() => throwError(() => new Error('offline')));
    await TestBed.configureTestingModule({
      imports: [PublicLandingComponent], providers: [provideRouter([]), { provide: AuthService, useValue: { profile: signal(null) } }, { provide: CatalogueService, useValue: { trending } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(PublicLandingComponent); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Trending books could not be loaded.');
    expect(fixture.nativeElement.textContent).not.toContain('Clean Code');
    (fixture.nativeElement.querySelector('.text-button') as HTMLButtonElement).click();
    expect(trending).toHaveBeenCalledTimes(2);
  });

  it('renders the approved About LibTrack section with heading, description, CTA, and 3 feature cards', async () => {
    const { fixture } = await setup();
    const element = fixture.nativeElement as HTMLElement;
    const about = element.querySelector('section#about') as HTMLElement;
    expect(about).not.toBeNull();

    // Eyebrow and heading
    expect(about.querySelector('.about-eyebrow')?.textContent).toContain('ABOUT LIBTRACK');
    const heading = about.querySelector('.about-heading');
    expect(heading?.textContent).toContain('A Smarter Library');
    expect(heading?.textContent).toContain('Experience for');
    expect(heading?.textContent).toContain('Our Campus');
    expect(heading?.querySelector('.highlight-text')?.textContent).toBe('Our Campus');

    // Description
    expect(about.querySelector('.about-description')?.textContent).toContain(
      'LibTrack is a library management platform that helps students, faculty, and librarians discover books, manage borrowing, and keep library services organized in a simple and efficient way.'
    );

    // Primary CTA Button
    const ctaBtn = about.querySelector('a.about-cta-btn') as HTMLAnchorElement | null;
    expect(ctaBtn).not.toBeNull();
    expect(ctaBtn?.getAttribute('href')).toBe('/books');
    expect(ctaBtn?.textContent).toContain('Explore Our Collection');

    // 3 Feature Cards
    const cards = about.querySelectorAll('.about-card');
    expect(cards).toHaveLength(3);

    // Card 1: Wide Card on Top
    expect(cards[0].classList.contains('card-wide')).toBe(true);
    expect(cards[0].querySelector('.card-title')?.textContent).toBe('Find Books Easily');
    expect(cards[0].querySelector('.card-desc')?.textContent).toBe('Search and explore the library catalogue.');
    expect(cards[0].querySelector('.card-icon-box svg')).not.toBeNull();

    // Cards 2 & 3 in Bottom Row
    expect(cards[1].classList.contains('card-vertical')).toBe(true);
    expect(cards[1].querySelector('.card-title')?.textContent).toBe('Borrow with Ease');
    expect(cards[1].querySelector('.card-desc')?.textContent).toBe('Request and track your book loans.');
    expect(cards[1].querySelector('.card-icon-box svg')).not.toBeNull();

    expect(cards[2].classList.contains('card-vertical')).toBe(true);
    expect(cards[2].querySelector('.card-title')?.textContent).toBe('Manage Efficiently');
    expect(cards[2].querySelector('.card-desc')?.textContent).toBe('Help librarians handle books, members, and circulation smoothly.');
    expect(cards[2].querySelector('.card-icon-box svg')).not.toBeNull();
  });
});


