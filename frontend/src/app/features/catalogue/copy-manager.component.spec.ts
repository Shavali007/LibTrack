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

  it('updates copy status without losing copyIdentifier', () => {
    const firstCopy = copy('1', 'AVAILABLE', 'Shelf A');
    fixture.componentInstance.edit(firstCopy, 'status', 'DAMAGED');
    fixture.componentInstance.save(firstCopy);

    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'csrf' });
    const patchReq = http.expectOne('/api/v1/books/book-1/copies/1');
    expect(patchReq.request.method).toBe('PATCH');
    expect(patchReq.request.body.copyIdentifier).toBe('COPY-1');
    expect(patchReq.request.body.status).toBe('DAMAGED');
    patchReq.flush({ ...firstCopy, status: 'DAMAGED' });
    http.expectOne('/api/v1/books/book-1/copies').flush([
      { ...firstCopy, status: 'DAMAGED' },
      copy('2', 'ON_LOAN'), copy('3', 'LOST'), copy('4', 'DAMAGED'), copy('5', 'WITHDRAWN'),
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Copy details updated.');
  });

  it('adds one copy with specified identifier and optional empty location', () => {
    fixture.componentInstance.singleForm.patchValue({ copyIdentifier: 'ACC-101', location: '' });
    fixture.componentInstance.addOne();

    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'csrf' });
    const postReq = http.expectOne('/api/v1/books/book-1/copies');
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({ copyIdentifier: 'ACC-101', location: null });
    postReq.flush(copy('101', 'AVAILABLE', null), { status: 201, statusText: 'Created' });
    http.expectOne('/api/v1/books/book-1/copies').flush([
      copy('1'), copy('2', 'ON_LOAN'), copy('3', 'LOST'), copy('4', 'DAMAGED'), copy('5', 'WITHDRAWN'),
      copy('101', 'AVAILABLE', null),
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Copy added.');
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
