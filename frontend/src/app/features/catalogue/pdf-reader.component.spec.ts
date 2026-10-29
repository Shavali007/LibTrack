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
    expect(iframe.getAttribute('src')).toBe('/api/v1/books/book-1/digital-edition/content');
  });
});
