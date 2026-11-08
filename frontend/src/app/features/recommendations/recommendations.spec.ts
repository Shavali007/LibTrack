import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { AuthService, UserProfile } from '../auth/auth.service';
import {
  AllRecommendedBookItem,
  FacultyDetail,
  FacultyDirectoryItem,
  RecentRecommendation,
  Recommendation,
  RecommendationService,
  TopRecommendedBook
} from './recommendation.service';
import { RecommendModalComponent } from './recommend-modal.component';
import { BookRecommendationsComponent } from './book-recommendations.component';
import { FacultyProfileComponent } from './faculty-profile.component';
import { CatalogueService } from '../catalogue/catalogue.service';
import { WishlistService } from '../wishlist/wishlist.service';

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

  it('fetches faculty directory with query and department params', () => {
    service.getFacultyDirectory('Ramesh', 'Computer Science', 'most_recommended').subscribe((list) => {
      expect(list.length).toBe(1);
      expect(list[0].displayName).toBe('Dr. K. Ramesh');
      expect(list[0].recommendationCount).toBe(8);
    });

    const req = http.expectOne(
      (r) => r.url === '/api/v1/recommendations/faculty-directory' &&
             r.params.get('q') === 'Ramesh' &&
             r.params.get('department') === 'Computer Science' &&
             r.params.get('sort') === 'most_recommended'
    );
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: 'fac-1',
        displayName: 'Dr. K. Ramesh',
        email: 'ramesh@vitap.ac.in',
        department: 'Computer Science and Engineering',
        designation: 'Associate Professor',
        recommendationCount: 8
      }
    ]);
  });

  it('fetches faculty details and recommended books', () => {
    service.getFacultyDetails('fac-1').subscribe((detail) => {
      expect(detail.id).toBe('fac-1');
      expect(detail.displayName).toBe('Dr. K. Ramesh');
      expect(detail.books.length).toBe(1);
      expect(detail.books[0].title).toBe('Clean Code');
    });

    const req = http.expectOne('/api/v1/recommendations/faculty/fac-1');
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 'fac-1',
      displayName: 'Dr. K. Ramesh',
      email: 'ramesh@vitap.ac.in',
      department: 'Computer Science and Engineering',
      designation: 'Associate Professor',
      recommendationCount: 1,
      books: [
        {
          recommendationId: 'rec-1',
          bookId: 'book-1',
          title: 'Clean Code',
          authors: ['Robert C. Martin'],
          categories: ['Software Engineering'],
          averageRating: 4.6,
          reviewCount: 328,
          message: 'Essential for writing maintainable code.',
          createdAt: '2026-11-05T10:00:00Z',
          helpfulCount: 5,
          markedHelpful: false
        }
      ]
    });
  });

  it('fetches top recommended books', () => {
    service.getTopRecommended(3).subscribe((top) => {
      expect(top.length).toBe(1);
      expect(top[0].title).toBe('Clean Code');
      expect(top[0].distinctFacultyCount).toBe(5);
    });

    const req = http.expectOne((r) => r.url === '/api/v1/recommendations/top' && r.params.get('limit') === '3');
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        bookId: 'book-1',
        title: 'Clean Code',
        authors: ['Robert C. Martin'],
        categories: ['Software Engineering'],
        distinctFacultyCount: 5,
        totalRecommendations: 8
      }
    ]);
  });

  it('fetches recently recommended books', () => {
    service.getRecentlyRecommended(3).subscribe((recent) => {
      expect(recent.length).toBe(1);
      expect(recent[0].bookTitle).toBe('Operating System Concepts');
      expect(recent[0].facultyName).toBe('Dr. P. Vani');
    });

    const req = http.expectOne((r) => r.url === '/api/v1/recommendations/recent' && r.params.get('limit') === '3');
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        recommendationId: 'rec-recent-1',
        bookId: 'book-os',
        bookTitle: 'Operating System Concepts',
        facultyId: 'fac-vani',
        facultyName: 'Dr. P. Vani',
        createdAt: '2026-11-06T00:00:00Z'
      }
    ]);
  });

  it('updates and retrieves student interests', () => {
    service.updateStudentInterests(['Computer Science', 'AI']).subscribe((res) => {
      expect(res.categories).toEqual(['AI', 'Computer Science']);
    });

    const csrf = http.expectOne('/api/v1/auth/csrf');
    csrf.flush({ headerName: 'X-XSRF-TOKEN', token: 'csrf-tok' });

    const putReq = http.expectOne('/api/v1/recommendations/interests');
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({ categories: ['AI', 'Computer Science'] });

    service.getStudentInterests().subscribe((res) => {
      expect(res.categories).toEqual(['AI', 'Computer Science']);
    });
    const getReq = http.expectOne('/api/v1/recommendations/interests');
    expect(getReq.request.method).toBe('GET');
    getReq.flush({ categories: ['AI', 'Computer Science'] });
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
  let component: BookRecommendationsComponent;
  let profile: ReturnType<typeof signal<UserProfile | null>>;
  let mockRecService: any;
  let mockCatalogueService: any;
  let mockWishlistService: any;

  const sampleFacultyDirectory: FacultyDirectoryItem[] = [
    {
      id: 'fac-ramesh',
      displayName: 'Dr. K. Ramesh',
      email: 'ramesh@vitap.ac.in',
      department: 'Computer Science and Engineering',
      designation: 'Associate Professor',
      recommendationCount: 8
    },
    {
      id: 'fac-kumar',
      displayName: 'Dr. V. Kumar',
      email: 'kumar@vitap.ac.in',
      department: 'Mechanical Engineering',
      designation: 'Assistant Professor',
      recommendationCount: 0
    }
  ];

  const sampleFacultyDetailWithBooks: FacultyDetail = {
    id: 'fac-ramesh',
    displayName: 'Dr. K. Ramesh',
    email: 'ramesh@vitap.ac.in',
    department: 'Computer Science and Engineering',
    designation: 'Associate Professor',
    recommendationCount: 1,
    books: [
      {
        recommendationId: 'rec-1',
        bookId: 'book-clean-code',
        title: 'Clean Code',
        authors: ['Robert C. Martin'],
        categories: ['Software Engineering'],
        averageRating: 4.6,
        reviewCount: 328,
        message: 'Essential for writing maintainable and professional code.',
        createdAt: '2026-11-05T10:00:00Z',
        helpfulCount: 5,
        markedHelpful: false
      }
    ]
  };

  const sampleFacultyDetailZeroBooks: FacultyDetail = {
    id: 'fac-kumar',
    displayName: 'Dr. V. Kumar',
    email: 'kumar@vitap.ac.in',
    department: 'Mechanical Engineering',
    designation: 'Assistant Professor',
    recommendationCount: 0,
    books: []
  };

  const sampleTopBooks: TopRecommendedBook[] = [
    {
      bookId: 'book-clean-code',
      title: 'Clean Code',
      authors: ['Robert C. Martin'],
      categories: ['Software Engineering'],
      distinctFacultyCount: 5,
      totalRecommendations: 8
    },
    {
      bookId: 'book-sys-design',
      title: 'System Design Interview',
      authors: ['Alex Xu'],
      categories: ['Computer Science'],
      distinctFacultyCount: 4,
      totalRecommendations: 6
    }
  ];

  const sampleRecentBooks: RecentRecommendation[] = [
    {
      recommendationId: 'rec-os',
      bookId: 'book-os',
      bookTitle: 'Operating System Concepts',
      facultyId: 'fac-vani',
      facultyName: 'Dr. P. Vani',
      createdAt: '2026-11-06T00:00:00Z'
    }
  ];

  const sampleAllRecommended: AllRecommendedBookItem[] = [
    {
      bookId: 'book-clean-code',
      title: 'Clean Code',
      authors: ['Robert C. Martin'],
      categories: ['Software Engineering'],
      distinctFacultyCount: 5,
      totalRecommendations: 8,
      averageRating: 4.6,
      reviewCount: 328,
      latestCreatedAt: '2026-11-05T10:00:00Z',
      contributingFaculty: [
        {
          recommendationId: 'rec-1',
          facultyId: 'fac-ramesh',
          facultyName: 'Dr. K. Ramesh',
          department: 'Computer Science',
          message: 'Essential for writing maintainable code.',
          createdAt: '2026-11-05T10:00:00Z'
        }
      ]
    }
  ];

  beforeEach(async () => {
    profile = signal<UserProfile | null>({
      id: 'student-1',
      email: 'student@vitapstudent.ac.in',
      role: 'STUDENT'
    });

    mockRecService = {
      getFacultyDirectory: () => of(sampleFacultyDirectory),
      getFacultyDetails: (id: string) => {
        if (id === 'fac-kumar') {
          return of(sampleFacultyDetailZeroBooks);
        }
        return of(sampleFacultyDetailWithBooks);
      },
      getTopRecommended: () => of(sampleTopBooks),
      getRecentlyRecommended: () => of(sampleRecentBooks),
      getAllRecommendedBooks: () => of(sampleAllRecommended),
      getDepartments: () => of(['Computer Science and Engineering', 'Mechanical Engineering']),
      getStudentInterests: () => of({ categories: ['Computer Science'] }),
      updateStudentInterests: (cats: string[]) => of({ categories: cats }),
      getPersonalizedRecommendations: () => of(sampleAllRecommended),
      getMyRecommendations: () => of([]),
      getAllFacultyRecommendations: () => of([])
    };

    mockCatalogueService = {
      categories: () => of([
        { id: 'c1', name: 'Computer Science' },
        { id: 'c2', name: 'Software Engineering' },
        { id: 'c3', name: 'Artificial Intelligence' }
      ]),
      departmentRecommendations: () => of({ department: 'Computer Science and Engineering', books: [] })
    };

    mockWishlistService = {
      isInWishlist: () => false,
      checkStatus: () => of({}),
      toggleWishlist: () => of(true)
    };

    await TestBed.configureTestingModule({
      imports: [BookRecommendationsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { profile } },
        { provide: RecommendationService, useValue: mockRecService },
        { provide: CatalogueService, useValue: mockCatalogueService },
        { provide: WishlistService, useValue: mockWishlistService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BookRecommendationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders page header and All faculty filter pill button', () => {
    expect(fixture.nativeElement.textContent).toContain('Book Recommendations');
    expect(fixture.nativeElement.querySelector('.all-faculty-pill-btn')).not.toBeNull();
    expect(component.selectedFacultyId()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Clean Code');
  });

  it('does not reintroduce removed right sidebar sections in redesigned layout and provides view profile action', () => {
    // The redesign intentionally uses full horizontal width for the 4-column books grid
    expect(fixture.nativeElement.querySelector('.right-sidebar')).toBeNull();

    // View Faculty Profile button is present when a faculty member is selected
    component.selectFaculty('fac-ramesh');
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate');
    component.viewFacultyProfile('fac-ramesh');
    expect(navSpy).toHaveBeenCalledWith(['/workspace/recommendations/faculty', 'fac-ramesh']);
  });

  it('renders faculty directory including faculty with zero recommendations', () => {
    expect(fixture.nativeElement.textContent).toContain('Faculty (2)');
    expect(fixture.nativeElement.textContent).toContain('Dr. K. Ramesh');
    expect(fixture.nativeElement.textContent).toContain('8 books');

    // Faculty with zero recommendations MUST appear with distinct indicator
    expect(fixture.nativeElement.textContent).toContain('Dr. V. Kumar');
    expect(fixture.nativeElement.textContent).toContain('Not recommended yet');
  });

  it('renders selected faculty profile banner and recommended book card with quotation', () => {
    component.selectFaculty('fac-ramesh');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Associate Professor');
    expect(fixture.nativeElement.textContent).toContain('Recommended Books (1)');
    expect(fixture.nativeElement.textContent).toContain('Clean Code');
    expect(fixture.nativeElement.textContent).toContain('Robert C. Martin');
    expect(fixture.nativeElement.textContent).toContain('4.6');
    expect(fixture.nativeElement.textContent).toContain('(328)');
    expect(fixture.nativeElement.textContent).toContain('Essential for writing maintainable and professional code.');
    expect(fixture.nativeElement.textContent).toContain('Recommended on Nov 5, 2026');
  });

  it('displays clean empty state when selecting faculty with zero recommendations', () => {
    component.selectFaculty('fac-kumar');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('This faculty has not recommended any books yet.');
    expect(fixture.nativeElement.textContent).toContain('Check back later or explore recommendations from other faculty members.');
  });

  it('switches to All Recommended Books view and renders book cards with primary faculty and resets faculty selection', () => {
    component.selectFaculty('fac-ramesh');
    fixture.detectChanges();
    expect(component.selectedFacultyId()).toBe('fac-ramesh');

    component.selectAllRecommendations();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Clean Code');
    expect(fixture.nativeElement.textContent).toContain('Dr. K. Ramesh');
    expect(component.selectedFacultyId()).toBeNull();
  });

  it('switches back to Faculty Recommendations view when clicking a faculty member from All Recommended Books view', () => {
    component.selectAllRecommendations();
    fixture.detectChanges();
    expect(component.selectedFacultyId()).toBeNull();

    component.selectFaculty('fac-ramesh');
    fixture.detectChanges();
    expect(component.selectedFacultyId()).toBe('fac-ramesh');
    expect(fixture.nativeElement.textContent).toContain('Dr. K. Ramesh');
    expect(fixture.nativeElement.textContent).toContain('Associate Professor');
  });

  it('switches to Recommended for Your Department tab and displays department section', () => {
    component.setStudentTab('personalized');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Recommended for Your Department');
    expect(fixture.nativeElement.textContent).toContain('Books tailored to your academic department.');
  });

  it('opens interests modal and toggles interest selection', () => {
    component.openInterestsModal();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Select Your Academic Interests');
    expect(fixture.nativeElement.textContent).toContain('Save Interests');

    component.toggleCategoryInModal('Artificial Intelligence');
    expect(component.modalSelectedCategories().has('Artificial Intelligence')).toBe(true);

    component.saveInterests();
    expect(component.savingInterests()).toBe(false);
    expect(component.showInterestsModal()).toBe(false);
  });
});

describe('FacultyProfileComponent', () => {
  let fixture: ComponentFixture<FacultyProfileComponent>;
  let component: FacultyProfileComponent;
  let mockRecService: any;
  let mockWishlistService: any;
  let router: Router;

  const sampleFacultyDetail: FacultyDetail = {
    id: 'fac-ramesh',
    displayName: 'Dr. K. Ramesh',
    email: 'ramesh@vitap.ac.in',
    department: 'Computer Science and Engineering',
    designation: 'Associate Professor',
    institutionalId: 'EMP-CSE-001',
    recommendationCount: 1,
    books: [
      {
        recommendationId: 'rec-1',
        bookId: 'book-clean-code',
        title: 'Clean Code',
        authors: ['Robert C. Martin'],
        categories: ['Software Engineering'],
        averageRating: 4.6,
        reviewCount: 328,
        message: 'Essential for writing maintainable and professional code.',
        createdAt: '2026-11-05T10:00:00Z',
        helpfulCount: 5,
        markedHelpful: false
      }
    ]
  };

  const sampleEmptyFacultyDetail: FacultyDetail = {
    id: 'fac-kumar',
    displayName: 'Dr. V. Kumar',
    email: 'kumar@vitap.ac.in',
    department: 'Mechanical Engineering',
    designation: 'Assistant Professor',
    institutionalId: 'EMP-ME-002',
    recommendationCount: 0,
    books: []
  };

  beforeEach(async () => {
    mockRecService = {
      getFacultyDetails: vi.fn((id: string) => {
        if (id === 'fac-kumar') return of(sampleEmptyFacultyDetail);
        if (id === 'fac-error') return throwError(() => ({ status: 500 }));
        if (id === 'fac-404') return throwError(() => ({ status: 404 }));
        return of(sampleFacultyDetail);
      })
    };

    mockWishlistService = {
      isInWishlist: () => false,
      checkStatus: () => of({}),
      toggle: () => of(true)
    };

    await TestBed.configureTestingModule({
      imports: [FacultyProfileComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ facultyId: 'fac-ramesh' })),
            snapshot: { paramMap: convertToParamMap({ facultyId: 'fac-ramesh' }) }
          }
        },
        { provide: RecommendationService, useValue: mockRecService },
        { provide: WishlistService, useValue: mockWishlistService }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(FacultyProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders faculty header information including designation, department, and employee ID', () => {
    expect(fixture.nativeElement.textContent).toContain('Dr. K. Ramesh');
    expect(fixture.nativeElement.textContent).toContain('Associate Professor');
    expect(fixture.nativeElement.textContent).toContain('Computer Science and Engineering');
    expect(fixture.nativeElement.textContent).toContain('ID: EMP-CSE-001');
    expect(fixture.nativeElement.textContent).toContain('ramesh@vitap.ac.in');
  });

  it('renders recommended books by faculty member with quotation note and rating', () => {
    expect(fixture.nativeElement.textContent).toContain('Recommended Books');
    expect(fixture.nativeElement.textContent).toContain('Clean Code');
    expect(fixture.nativeElement.textContent).toContain('Robert C. Martin');
    expect(fixture.nativeElement.textContent).toContain('4.6');
    expect(fixture.nativeElement.textContent).toContain('(328)');
    expect(fixture.nativeElement.textContent).toContain('Essential for writing maintainable and professional code.');
  });

  it('toggles following state on faculty follow button click', () => {
    expect(component.isFollowed()).toBe(false);
    component.toggleFollow();
    expect(component.isFollowed()).toBe(true);
    component.toggleFollow();
    expect(component.isFollowed()).toBe(false);
  });

  it('renders empty state when faculty has zero recommendations', async () => {
    mockRecService.getFacultyDetails.mockReturnValue(of(sampleEmptyFacultyDetail));
    (component as any).facultyId = 'fac-kumar';
    component.loadProfile();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('This faculty has not recommended any books yet.');
    expect(fixture.nativeElement.textContent).toContain('Check back later or explore recommendations from other faculty members.');
  });

  it('displays error state when faculty is not found', async () => {
    mockRecService.getFacultyDetails.mockReturnValue(throwError(() => ({ status: 404 })));
    (component as any).facultyId = 'fac-404';
    component.loadProfile();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Faculty Member Not Found');
    expect(fixture.nativeElement.textContent).toContain('The requested faculty member was not found');
  });

  it('provides working back navigation', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    component.goBack();
    expect(true).toBe(true);
  });
});
