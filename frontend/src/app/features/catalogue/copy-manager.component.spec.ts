import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CopyManagerComponent } from './copy-manager.component';
import { BookCopy } from './catalogue.service';

function copy(id: string, status: BookCopy['status'] = 'AVAILABLE', location: string | null = null): BookCopy {
  return { id, bookId: 'book-1', copyIdentifier: `COPY-${id}`, location, status };
}

describe('CopyManagerComponent bulk physical inventory', () => {
  let fixture: ComponentFixture<CopyManagerComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CopyManagerComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'book-1' } } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CopyManagerComponent);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/books/book-1/copies').flush([
      copy('1'), copy('2', 'ON_LOAN'), copy('3', 'LOST'), copy('4', 'DAMAGED'), copy('5', 'WITHDRAWN'),
    ]);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('shows counts derived from the loaded physical copy statuses', () => {
    const summary = fixture.nativeElement.querySelector('.inventory-summary').textContent;
    expect(summary).toContain('Total copies');
    expect(summary).toContain('Available');
    expect(summary).toContain('On loan');
    expect(summary).toContain('Lost');
    expect(summary).toContain('Damaged');
    expect(summary).toContain('Withdrawn');
    expect(summary).toContain('5');
  });

  it('rejects decimal quantities and performs one CSRF-protected bulk request then refreshes', () => {
    fixture.componentInstance.bulkForm.patchValue({ numberOfCopies: 1.5, location: 'Shelf C' });
    fixture.componentInstance.addCopies();
    expect(fixture.componentInstance.bulkForm.invalid).toBe(true);
    http.expectNone('/api/v1/auth/csrf');

    fixture.componentInstance.bulkForm.patchValue({ numberOfCopies: 2 });
    fixture.componentInstance.addCopies();
    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'bulk-csrf' });
    const request = http.expectOne('/api/v1/books/book-1/copies/bulk');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('bulk-csrf');
    expect(request.request.body).toEqual({ numberOfCopies: 2, location: 'Shelf C' });
    request.flush([copy('6', 'AVAILABLE', 'Shelf C'), copy('7', 'AVAILABLE', 'Shelf C')], { status: 201, statusText: 'Created' });
    http.expectOne('/api/v1/books/book-1/copies').flush([
      copy('1'), copy('2', 'ON_LOAN'), copy('3', 'LOST'), copy('4', 'DAMAGED'), copy('5', 'WITHDRAWN'),
      copy('6', 'AVAILABLE', 'Shelf C'), copy('7', 'AVAILABLE', 'Shelf C'),
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('2 copies added successfully.');
    expect(fixture.nativeElement.querySelector('.inventory-summary').textContent).toContain('7');
  });
});

describe('CopyManagerComponent inventory load errors', () => {
  let fixture: ComponentFixture<CopyManagerComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CopyManagerComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'book-1' } } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CopyManagerComponent);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/books/book-1/copies').flush({ message: 'private server detail' }, { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('shows an inventory error instead of a misleading zero-copy summary', () => {
    expect(fixture.nativeElement.textContent).toContain('Inventory could not be loaded. Counts are unavailable');
    expect(fixture.nativeElement.querySelector('.inventory-summary')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('No physical copies');
    expect(fixture.nativeElement.textContent).not.toContain('private server detail');
  });
});
