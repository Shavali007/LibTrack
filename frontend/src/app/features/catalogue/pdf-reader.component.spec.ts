import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthService, UserProfile } from '../auth/auth.service';
import { PdfReaderComponent } from './pdf-reader.component';

describe('PdfReaderComponent', () => {
  let fixture: ComponentFixture<PdfReaderComponent>;
  let http: HttpTestingController;
  let profile: ReturnType<typeof signal<UserProfile | null>>;

  const book = {
    id: 'book-1',
    title: 'Operating Systems Principles',
    authors: ['P. Silberschatz'],
    categories: ['Systems'],
  };

  const edition = {
    id: 'de-1',
    bookId: 'book-1',
    originalFilename: 'os_principles.pdf',
    contentType: 'application/pdf',
    fileSize: 5242880,
    editionLabel: '10th Edition',
    uploadedAt: '2026-03-01T12:00:00Z',
  };

  beforeEach(async () => {
    profile = signal<UserProfile | null>({
      id: 's-1',
      email: 'student@example.com',
      role: 'STUDENT',
    });

    await TestBed.configureTestingModule({
      imports: [PdfReaderComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'book-1' } } } },
        { provide: AuthService, useValue: { profile } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PdfReaderComponent);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/books/book-1').flush(book);
    http.expectOne('/api/v1/books/book-1/digital-edition').flush(edition);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('renders toolbar with book title, back link, download button, and iframe viewer', () => {
    expect(fixture.nativeElement.textContent).toContain('Operating Systems Principles');
    expect(fixture.nativeElement.textContent).toContain('P. Silberschatz');
    expect(fixture.nativeElement.textContent).toContain('os_principles.pdf');
    expect(fixture.nativeElement.textContent).toContain('5.0 MB');

    const backBtn = fixture.nativeElement.querySelector('a.back-button');
    expect(backBtn).not.toBeNull();
    expect(backBtn.getAttribute('href')).toBe('/books/book-1');

    const downloadBtn = fixture.nativeElement.querySelector('a.download-button');
    expect(downloadBtn).not.toBeNull();
    expect(downloadBtn.getAttribute('href')).toBe('/api/v1/books/book-1/digital-edition/download');

    const iframe = fixture.nativeElement.querySelector('iframe.pdf-frame');
    expect(iframe).not.toBeNull();
    expect(iframe.getAttribute('src')).toContain('/assets/pdfjs/viewer.html?file=');
    expect(iframe.getAttribute('src')).toContain(encodeURIComponent('/api/v1/books/book-1/digital-edition/content'));
  });

  it('toggles search panel and searches for keywords in chapters', () => {
    const searchToggleBtn = fixture.nativeElement.querySelector('button.search-toggle-btn');
    expect(searchToggleBtn).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.search-sidebar')).toBeNull();

    // Open search sidebar
    searchToggleBtn.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.search-sidebar')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Search in Book');

    // Enter search query
    fixture.componentInstance.searchQuery.set('scheduling');
    fixture.detectChanges();

    // Trigger search
    fixture.componentInstance.onSearch();
    const searchReq = http.expectOne('/api/v1/books/book-1/chapters/search?query=scheduling&page=0&size=50');
    expect(searchReq.request.method).toBe('GET');

    searchReq.flush({
      query: 'scheduling',
      totalMatches: 2,
      page: 0,
      size: 50,
      totalPages: 1,
      chapters: [
        {
          chapterId: 'ch-1',
          chapterNumber: 5,
          chapterTitle: 'CPU Scheduling',
          startPage: 15,
          endPage: 35,
          isManuallyEdited: false,
          matches: [
            {
              chapterId: 'ch-1',
              chapterNumber: 5,
              chapterTitle: 'CPU Scheduling',
              headingTitle: 'Multi-level Feedback Scheduling',
              pageNumber: 15,
              snippet: 'Process scheduling queues maintain jobs in memory.'
            },
            {
              chapterId: 'ch-1',
              chapterNumber: 5,
              chapterTitle: 'CPU Scheduling',
              headingTitle: 'Shortest Job First',
              pageNumber: 18,
              snippet: 'Multi-level feedback scheduling algorithm.'
            }
          ]
        }
      ]
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Found 2 matches in 1 chapter');
    expect(fixture.nativeElement.textContent).toContain('Ch. 5: CPU Scheduling');
    expect(fixture.nativeElement.textContent).toContain('Multi-level Feedback Scheduling');
    expect(fixture.nativeElement.textContent).toContain('Page 15');
    expect(fixture.nativeElement.textContent).toContain('Process scheduling queues maintain jobs in memory.');

    // Click on match card
    const matchBtn = fixture.nativeElement.querySelector('.match-card') as HTMLButtonElement;
    expect(matchBtn).not.toBeNull();
    matchBtn.click();
    fixture.detectChanges();

    // The iframe src should now update to include #page=15
    const iframe = fixture.nativeElement.querySelector('iframe.pdf-frame');
    expect(iframe.getAttribute('src')).toContain('/assets/pdfjs/viewer.html?file=');
    expect(iframe.getAttribute('src')).toContain('#page=15');
    expect(matchBtn.classList.contains('active')).toBe(true);
    expect(fixture.componentInstance.currentPage()).toBe(15);
    expect(fixture.nativeElement.querySelector('.search-sidebar')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Navigated: p. 15');

    // Simulate manual scroll in PDF.js viewer sending pagechanged event
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'pagechanged', pageNumber: 110, totalPages: 221 }
    }));
    fixture.detectChanges();

    expect(fixture.componentInstance.currentPage()).toBe(110);
    expect(fixture.componentInstance.totalPages()).toBe(221);
    expect(fixture.nativeElement.textContent).toContain('of 221');
  });
});
