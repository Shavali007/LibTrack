import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BookReview, ReviewEligibility, ReviewPage, ReviewService, ReviewSummary } from './review.service';
import { WriteReviewModalComponent } from './write-review-modal.component';
import { BookDetailComponent } from '../catalogue/book-detail-editor.component';
import { AuthService, UserProfile } from '../auth/auth.service';
import { RecommendationService } from '../recommendations/recommendation.service';
import { WishlistService } from '../wishlist/wishlist.service';

describe('ReviewService', () => {
  let service: ReviewService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ReviewService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(ReviewService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fetches reviews with pagination', () => {
    let result: ReviewPage | undefined;
    service.getReviews('book-123', 0, 10).subscribe(res => result = res);

    const req = http.expectOne('/api/v1/books/book-123/reviews?page=0&size=10');
    expect(req.request.method).toBe('GET');
    req.flush({
      content: [{ id: 'rev-1', bookId: 'book-123', reviewerDisplayName: 'Alice', rating: 5, comment: 'Great', createdAt: '2026-01-01T00:00:00Z' }],
      totalElements: 1,
      totalPages: 1,
      size: 10,
      number: 0
    });

    expect(result?.content.length).toBe(1);
    expect(result?.content[0].reviewerDisplayName).toBe('Alice');
  });

  it('fetches review summary', () => {
    let summary: ReviewSummary | undefined;
    service.getSummary('book-123').subscribe(res => summary = res);

    const req = http.expectOne('/api/v1/books/book-123/reviews/summary');
    expect(req.request.method).toBe('GET');
    req.flush({ averageRating: 4.8, totalReviews: 32 });

    expect(summary?.averageRating).toBe(4.8);
    expect(summary?.totalReviews).toBe(32);
  });

  it('checks user review eligibility', () => {
    let eligibility: ReviewEligibility | undefined;
    service.checkEligibility('book-123').subscribe(res => eligibility = res);

    const req = http.expectOne('/api/v1/books/book-123/reviews/eligibility');
    expect(req.request.method).toBe('GET');
    req.flush({
      eligible: true,
      reason: 'Eligible',
      hasReviewed: false,
      hasBorrowed: true,
      hasDigitalAccess: true
    });

    expect(eligibility?.eligible).toBe(true);
    expect(eligibility?.hasReviewed).toBe(false);
  });

  it('submits a book review', () => {
    let review: BookReview | undefined;
    service.submitReview('book-123', { rating: 5, comment: 'Comprehensive guide' }).subscribe(res => review = res);

    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'test-csrf' });

    const req = http.expectOne('/api/v1/books/book-123/reviews');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('X-CSRF-TOKEN')).toBe('test-csrf');
    expect(req.request.body).toEqual({ rating: 5, comment: 'Comprehensive guide' });
    req.flush({
      id: 'rev-2',
      bookId: 'book-123',
      reviewerDisplayName: 'Bob',
      rating: 5,
      comment: 'Comprehensive guide',
      createdAt: '2026-11-01T10:00:00Z'
    });

    expect(review?.id).toBe('rev-2');
    expect(review?.rating).toBe(5);
  });

  it('formats relative timestamps correctly', () => {
    const now = new Date();
    expect(service.formatRelativeTime(now.toISOString())).toBe('just now');

    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    expect(service.formatRelativeTime(twoWeeksAgo.toISOString())).toBe('2 weeks ago');

    const oneMonthAgo = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);
    expect(service.formatRelativeTime(oneMonthAgo.toISOString())).toBe('1 month ago');
  });

  it('provides consistent avatar colors based on name', () => {
    const palette1 = service.getAvatarColor('Ananya R.');
    const palette2 = service.getAvatarColor('Ananya R.');
    expect(palette1).toEqual(palette2);
    expect(palette1.bg).toBeTruthy();
    expect(palette1.text).toBeTruthy();
  });
});

describe('WriteReviewModalComponent', () => {
  let fixture: ComponentFixture<WriteReviewModalComponent>;
  let component: WriteReviewModalComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WriteReviewModalComponent],
      providers: [
        ReviewService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WriteReviewModalComponent);
    component = fixture.componentInstance;
    component.book = {
      id: 'b-1',
      title: 'Effective Java',
      authors: ['Joshua Bloch'],
      coverImageUrl: null
    };
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('renders modal header and book preview', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Write a Review');
    expect(el.textContent).toContain('Effective Java');
    expect(el.textContent).toContain('Joshua Bloch');
  });

  it('allows star rating selection and updates live state', () => {
    const stars = fixture.nativeElement.querySelectorAll('.star-button');
    expect(stars.length).toBe(5);

    stars[3].click(); // 4 stars
    fixture.detectChanges();

    expect(component.selectedRating()).toBe(4);
    expect(fixture.nativeElement.textContent).toContain('4 of 5 stars');
  });

  it('enforces rating selection before submit', () => {
    component.submit();
    fixture.detectChanges();

    expect(component.ratingError()).toContain('Please select a star rating');
    http.expectNone('/api/v1/books/b-1/reviews');
  });

  it('prevents whitespace-only comments', () => {
    component.setRating(5);
    component.comment = '    ';
    component.submit();
    fixture.detectChanges();

    expect(component.commentError()).toContain('Review comment cannot be blank or whitespace only.');
    http.expectNone('/api/v1/books/b-1/reviews');
  });

  it('submits review successfully and emits submitted event', () => {
    let emittedReview: BookReview | undefined;
    component.submitted.subscribe((r: BookReview) => emittedReview = r);

    component.setRating(5);
    component.comment = 'Excellent book for Java developers.';
    component.submit();

    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'modal-csrf' });

    const req = http.expectOne('/api/v1/books/b-1/reviews');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('X-CSRF-TOKEN')).toBe('modal-csrf');
    expect(req.request.body).toEqual({ rating: 5, comment: 'Excellent book for Java developers.' });
    req.flush({
      id: 'r-1',
      bookId: 'b-1',
      reviewerDisplayName: 'Priya M.',
      rating: 5,
      comment: 'Excellent book for Java developers.',
      createdAt: new Date().toISOString()
    });

    expect(emittedReview?.id).toBe('r-1');
  });

  it('handles 409 duplicate review error gracefully', () => {
    component.setRating(4);
    component.comment = 'Valid comment for testing error handling';
    component.submit();

    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'modal-csrf' });

    const req = http.expectOne('/api/v1/books/b-1/reviews');
    req.flush({ message: 'User has already reviewed this book' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(component.error()).toContain('You have already submitted a review for this book.');
  });

  it('handles 403 ineligibility error gracefully', () => {
    component.setRating(4);
    component.comment = 'Valid comment for testing error handling';
    component.submit();

    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'modal-csrf' });

    const req = http.expectOne('/api/v1/books/b-1/reviews');
    req.flush({ message: 'Borrowing history and digital edition access required.' }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(component.error()).toContain('Borrowing history and digital edition access required.');
  });
});

describe('BookDetailComponent Reviews Tab UI Integration', () => {
  let fixture: ComponentFixture<BookDetailComponent>;
  let component: BookDetailComponent;
  let profile: ReturnType<typeof signal<UserProfile | null>>;

  const mockBook = {
    id: 'b-test',
    title: 'Java: The Complete Reference',
    isbn: '9781260440232',
    authors: ['Herbert Schildt'],
    categories: ['Programming', 'Computer Science'],
    publisher: 'McGraw-Hill',
    publicationYear: 2021,
    coverImageUrl: null,
    circulationPolicy: 'STANDARD',
    totalCopies: 5,
    availableCopies: 3,
    onLoanCopies: 2,
    lostCopies: 0,
    damagedCopies: 0,
    withdrawnCopies: 0,
    description: 'A comprehensive guide to Java.',
    active: true,
    hasDigitalEdition: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  };

  const sampleReviews: BookReview[] = [
    { id: '1', bookId: 'b-test', reviewerDisplayName: 'Ananya R.', rating: 5, comment: 'Very useful for learning Java. Covers concepts clearly with good examples.', createdAt: new Date(Date.now() - 14 * 86400000).toISOString() },
    { id: '2', bookId: 'b-test', reviewerDisplayName: 'Rohit S.', rating: 4, comment: 'A comprehensive reference for Java. The explanations are simple and easy to follow.', createdAt: new Date(Date.now() - 21 * 86400000).toISOString() },
    { id: '3', bookId: 'b-test', reviewerDisplayName: 'Priya M.', rating: 5, comment: 'Excellent book for both beginners and advanced learners. Highly recommended!', createdAt: new Date(Date.now() - 30 * 86400000).toISOString() }
  ];

  let mockWishlistSignal = signal<boolean>(false);

  beforeEach(async () => {
    mockWishlistSignal.set(false);
    profile = signal<UserProfile | null>({ id: 'u-1', email: 'student@example.com', role: 'STUDENT' });

    await TestBed.configureTestingModule({
      imports: [BookDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'b-test' }, queryParamMap: { get: () => 'reviews' }, fragment: 'reviews' } } },
        { provide: AuthService, useValue: { profile, login: () => {} } },
        {
          provide: WishlistService,
          useValue: {
            isInWishlist: () => mockWishlistSignal(),
            toggleWishlist: () => {
              mockWishlistSignal.update(v => !v);
              return of(mockWishlistSignal());
            },
            checkStatus: () => of({ 'b-test': false })
          }
        },
        { provide: RecommendationService, useValue: { getRecommendationsForBook: () => of([]), markHelpful: () => of({}), removeHelpful: () => of({}) } },
        {
          provide: ReviewService,
          useValue: {
            getSummary: () => of({ averageRating: 4.8, totalReviews: 32 }),
            getReviews: () => of({ content: sampleReviews, totalElements: 3, totalPages: 1, size: 10, number: 0 }),
            checkEligibility: () => of({ eligible: true, reason: 'Eligible', hasReviewed: false, hasBorrowed: true, hasDigitalAccess: true }),
            submitReview: () => of({}),
            formatRelativeTime: (d: string) => {
              if (d === sampleReviews[0].createdAt) return '2 weeks ago';
              if (d === sampleReviews[1].createdAt) return '3 weeks ago';
              return '1 month ago';
            },
            getAvatarColor: (name: string) => name.startsWith('A') ? { bg: '#E3F2E9', text: '#15803D' } : name.startsWith('R') ? { bg: '#E0F2FE', text: '#0369A1' } : { bg: '#F3E8FF', text: '#7E22CE' }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BookDetailComponent);
    component = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/v1/books/b-test').flush(mockBook);
    http.expectOne('/api/v1/books/b-test/digital-edition').flush({ id: 'de-1', originalFilename: 'java.pdf', fileSize: 1024, editionLabel: '1st Ed' });
    fixture.detectChanges();
  });

  it('renders hero rating with 4.8 average and 32 reviews', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('4.8');
    expect(text).toContain('(32 reviews)');
  });

  it('renders three tabs: Details, Digital Edition, and Reviews (32)', () => {
    const tabs = fixture.nativeElement.querySelectorAll('.tab-button');
    expect(tabs.length).toBe(3);
    expect(tabs[0].textContent).toContain('Details');
    expect(tabs[1].textContent).toContain('Digital Edition');
    expect(tabs[2].textContent).toContain('Reviews (32)');
  });

  it('renders Reviews tab with Write a Review button and review cards matching reference screenshot', () => {
    component.setTab('reviews');
    fixture.detectChanges();

    const writeBtn = fixture.nativeElement.querySelector('.btn-write-review');
    expect(writeBtn).not.toBeNull();
    expect(writeBtn.textContent).toContain('Write a Review');

    const cards = fixture.nativeElement.querySelectorAll('.review-item-card');
    expect(cards.length).toBe(3);

    // Check first review card (Ananya R.)
    expect(cards[0].textContent).toContain('Ananya R.');
    expect(cards[0].textContent).toContain('2 weeks ago');
    expect(cards[0].textContent).toContain('Very useful for learning Java.');

    // Check second review card (Rohit S.)
    expect(cards[1].textContent).toContain('Rohit S.');
    expect(cards[1].textContent).toContain('3 weeks ago');
    expect(cards[1].textContent).toContain('A comprehensive reference for Java.');

    // Check third review card (Priya M.)
    expect(cards[2].textContent).toContain('Priya M.');
    expect(cards[2].textContent).toContain('1 month ago');
    expect(cards[2].textContent).toContain('Excellent book for both beginners and advanced learners.');

    // Ensure NO edit or delete buttons appear anywhere in review cards
    const editBtns = fixture.nativeElement.querySelectorAll('.review-item-card button');
    expect(editBtns.length).toBe(0);
  });

  it('toggles wishlist button and updates state', () => {
    const wishlistBtn = fixture.nativeElement.querySelector('.action-pill-btn.in-wishlist, .action-pill-btn:last-of-type');
    expect(wishlistBtn).not.toBeNull();

    expect(component.inWishlist()).toBe(false);
    component.toggleWishlist(mockBook as any);
    expect(component.inWishlist()).toBe(true);

    component.toggleWishlist(mockBook as any);
    expect(component.inWishlist()).toBe(false);
  });

  it('shows already reviewed badge when user has already submitted a review', () => {
    component.reviewEligibility.set({
      eligible: false,
      reason: 'Already reviewed',
      hasReviewed: true,
      hasBorrowed: true,
      hasDigitalAccess: true
    });
    component.setTab('reviews');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('You have already reviewed this book');
    expect(fixture.nativeElement.querySelector('.btn-write-review')).toBeNull();
  });

  it('shows ineligibility message when user has not satisfied borrowing and digital access requirements', () => {
    component.reviewEligibility.set({
      eligible: false,
      reason: 'You can review this book after borrowing it or accessing its digital edition.',
      hasReviewed: false,
      hasBorrowed: false,
      hasDigitalAccess: false
    });
    component.setTab('reviews');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('You can review this book after borrowing it or accessing its digital edition.');
    expect(fixture.nativeElement.querySelector('.btn-write-review')).toBeNull();
  });
});
