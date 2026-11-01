import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { of } from 'rxjs';
import { AuthService, UserProfile } from '../auth/auth.service';
import {
  FacultyRecommendationGroup,
  Recommendation,
  RecommendationService
} from './recommendation.service';
import { RecommendModalComponent } from './recommend-modal.component';
import { BookRecommendationsComponent } from './book-recommendations.component';

describe('RecommendationService', () => {
  let service: RecommendationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(RecommendationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fetches recommended book ids', () => {
    service.getRecommendedBookIds().subscribe((ids) => {
      expect(ids).toEqual(['book-1', 'book-2']);
    });

    const req = http.expectOne('/api/v1/recommendations/recommended-book-ids');
    expect(req.request.method).toBe('GET');
    req.flush(['book-1', 'book-2']);
  });

  it('creates recommendation with CSRF header', () => {
    service.createRecommendation('book-1', 'Great book!').subscribe((rec) => {
      expect(rec.id).toBe('rec-1');
      expect(rec.message).toBe('Great book!');
    });

    const csrfReq = http.expectOne('/api/v1/auth/csrf');
    expect(csrfReq.request.method).toBe('GET');
    csrfReq.flush({ headerName: 'X-XSRF-TOKEN', token: 'mock-token' });

    const postReq = http.expectOne('/api/v1/recommendations');
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.headers.get('X-XSRF-TOKEN')).toBe('mock-token');
    expect(postReq.request.body).toEqual({ bookId: 'book-1', message: 'Great book!' });
    postReq.flush({
      id: 'rec-1',
      bookId: 'book-1',
      bookTitle: 'Test Title',
      bookAuthors: ['Author'],
      bookCategories: ['Tech'],
      facultyId: 'fac-1',
      facultyName: 'Dr. Smith',
      facultyEmail: 'smith@vitap.ac.in',
      message: 'Great book!',
      status: 'ACTIVE',
      createdAt: '2026-11-01T10:00:00Z',
      updatedAt: '2026-11-01T10:00:00Z',
      helpfulCount: 0,
      markedHelpful: false
    });
  });

  it('marks and unmarks helpful reaction', () => {
    service.markHelpful('rec-1').subscribe((res) => {
      expect(res.helpfulCount).toBe(1);
      expect(res.markedHelpful).toBe(true);
    });

    const csrf1 = http.expectOne('/api/v1/auth/csrf');
    csrf1.flush({ headerName: 'X-XSRF-TOKEN', token: 'tok' });

    const postHelpful = http.expectOne('/api/v1/recommendations/rec-1/helpful');
    expect(postHelpful.request.method).toBe('POST');
    postHelpful.flush({ recommendationId: 'rec-1', helpfulCount: 1, markedHelpful: true });

    service.removeHelpful('rec-1').subscribe((res) => {
      expect(res.helpfulCount).toBe(0);
      expect(res.markedHelpful).toBe(false);
    });

    const csrf2 = http.expectOne('/api/v1/auth/csrf');
    csrf2.flush({ headerName: 'X-XSRF-TOKEN', token: 'tok' });

    const delHelpful = http.expectOne('/api/v1/recommendations/rec-1/helpful');
    expect(delHelpful.request.method).toBe('DELETE');
    delHelpful.flush({ recommendationId: 'rec-1', helpfulCount: 0, markedHelpful: false });
  });
});

describe('RecommendModalComponent', () => {
  let fixture: ComponentFixture<RecommendModalComponent>;
  let component: RecommendModalComponent;
  let recServiceMock: { createRecommendation: any };

  beforeEach(async () => {
    recServiceMock = {
      createRecommendation: () => of({
        id: 'rec-123',
        bookId: 'b-1',
        bookTitle: 'Clean Code',
        bookAuthors: ['Robert Martin'],
        facultyId: 'f-1',
        facultyName: 'Prof. X',
        facultyEmail: 'x@vitap.ac.in',
        status: 'ACTIVE',
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
        helpfulCount: 0,
        markedHelpful: false
      })
    };

    await TestBed.configureTestingModule({
      imports: [RecommendModalComponent],
      providers: [
        { provide: RecommendationService, useValue: recServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RecommendModalComponent);
    component = fixture.componentInstance;
    component.book = {
      id: 'b-1',
      title: 'Clean Code',
      authors: ['Robert Martin'],
      categories: ['Software Engineering']
    };
    fixture.detectChanges();
  });

  it('renders book preview details and 300 char counter', () => {
    expect(fixture.nativeElement.textContent).toContain('Clean Code');
    expect(fixture.nativeElement.textContent).toContain('Robert Martin');
    expect(fixture.nativeElement.textContent).toContain('0 / 300');
  });

  it('rejects whitespace-only message', () => {
    component.message = '     ';
    component.submit();
    expect(component.error()).toBe('Recommendation message cannot contain only whitespace.');
  });

  it('emits recommended event on valid submission', () => {
    let emitted: Recommendation | null = null;
    component.recommended.subscribe((r) => (emitted = r));

    component.message = 'Highly recommended for students';
    component.submit();

    expect(emitted).not.toBeNull();
    expect((emitted as any)?.id).toBe('rec-123');
  });
});

describe('BookRecommendationsComponent', () => {
  let fixture: ComponentFixture<BookRecommendationsComponent>;
  let profile: ReturnType<typeof signal<UserProfile | null>>;
  let mockRecService: any;

  beforeEach(async () => {
    profile = signal<UserProfile | null>({
      id: 'student-1',
      email: 'student@vitapstudent.ac.in',
      role: 'STUDENT'
    });

    const mockGroup: FacultyRecommendationGroup = {
      bookId: 'b-1',
      bookTitle: 'Clean Code',
      bookAuthors: ['Robert C. Martin'],
      bookCategories: ['Programming'],
      totalRecommendations: 1,
      recommendations: [
        {
          recommendationId: 'rec-1',
          facultyId: 'fac-1',
          facultyName: 'Dr. Rao Manmadha',
          facultyEmail: 'rao@vitap.ac.in',
          facultyDepartment: 'Computer Science',
          message: 'A must-read for writing maintainable and professional code.',
          createdAt: '2026-10-28T00:00:00Z',
          helpfulCount: 5,
          markedHelpful: false
        }
      ]
    };

    mockRecService = {
      getFacultyRecommendationsForStudents: () => of([mockGroup]),
      getMyRecommendations: () => of([]),
      getAllFacultyRecommendations: () => of([]),
      markHelpful: () => of({ recommendationId: 'rec-1', helpfulCount: 6, markedHelpful: true }),
      removeHelpful: () => of({ recommendationId: 'rec-1', helpfulCount: 5, markedHelpful: false }),
      updateRecommendationMessage: () => of({}),
      withdrawRecommendation: () => of({})
    };

    await TestBed.configureTestingModule({
      imports: [BookRecommendationsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { profile } },
        { provide: RecommendationService, useValue: mockRecService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BookRecommendationsComponent);
    fixture.detectChanges();
  });

  it('renders student feed with 3 tabs and quote bubble', () => {
    expect(fixture.nativeElement.textContent).toContain('Book Recommendations');
    expect(fixture.nativeElement.textContent).toContain('Recommended for You');
    expect(fixture.nativeElement.textContent).toContain('Recommended by Faculty');
    expect(fixture.nativeElement.textContent).toContain('Popular Books');
    expect(fixture.nativeElement.textContent).toContain('Clean Code');
    expect(fixture.nativeElement.textContent).toContain('Dr. Rao Manmadha');
    expect(fixture.nativeElement.textContent).toContain('A must-read for writing maintainable and professional code.');
    expect(fixture.nativeElement.textContent).toContain('Helpful (5)');
  });

  it('toggles helpful button for student', () => {
    const helpfulBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-helpful');
    expect(helpfulBtn).not.toBeNull();
    helpfulBtn.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Helpful (6)');
  });
});
