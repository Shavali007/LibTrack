import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';
export type CirculationPolicy = 'STANDARD' | 'REFERENCE_ONLY' | 'SERIAL_RESTRICTED' | 'APPROVED_OVERNIGHT_EXCEPTION';
export type CopyStatus = 'AVAILABLE' | 'ON_LOAN' | 'LOST' | 'DAMAGED' | 'WITHDRAWN';
export interface InventorySummary { totalCopies: number; availableCopies: number; onLoanCopies: number; lostCopies: number; damagedCopies: number; withdrawnCopies: number; }
export interface BookSummary extends InventorySummary { id: string; title: string; isbn: string | null; authors: string[]; categories: string[]; publisher: string | null; publicationYear: number | null; coverImageUrl: string | null; circulationPolicy: CirculationPolicy; hasDigitalEdition?: boolean; }
export interface BookDetail extends BookSummary { description: string | null; active: boolean; createdAt: string; updatedAt: string; }
export interface Page<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number; }
export interface Category { id: string; name: string; }
export interface BookCopy { id: string; bookId: string; copyIdentifier: string; location: string | null; status: CopyStatus; }
export interface DigitalEdition { id: string; bookId: string; originalFilename: string; contentType: string; fileSize: number; editionLabel?: string | null; uploadedAt: string; }
export interface BookWrite { title: string; isbn: string | null; description: string | null; publisher: string | null; publicationYear: number | null; coverImageUrl: string | null; circulationPolicy: CirculationPolicy; authors: string[]; categories: string[]; }
export interface BookCreate extends BookWrite { numberOfCopies: number; location?: string | null; }
@Injectable({ providedIn: 'root' }) export class CatalogueService {
  private readonly http = inject(HttpClient);
  private csrfHeaders(): Observable<HttpHeaders> {
    return this.http.get<{ headerName: string; token: string }>('/api/v1/auth/csrf').pipe(
      tap(csrf => { if (!csrf.headerName || !csrf.token) throw new Error('Security token unavailable.'); }),
      switchMap(csrf => [new HttpHeaders().set(csrf.headerName, csrf.token)]),
    );
  }
  private post<T>(url: string, body: unknown): Observable<T> {
    return this.csrfHeaders().pipe(switchMap(headers => this.http.post<T>(url, body, { headers })));
  }
  private put<T>(url: string, body: unknown): Observable<T> {
    return this.csrfHeaders().pipe(switchMap(headers => this.http.put<T>(url, body, { headers })));
  }
  private patch<T>(url: string, body: unknown): Observable<T> {
    return this.csrfHeaders().pipe(switchMap(headers => this.http.patch<T>(url, body, { headers })));
  }
  private delete<T>(url: string): Observable<T> {
    return this.csrfHeaders().pipe(switchMap(headers => this.http.delete<T>(url, { headers })));
  }
  search(filters: Record<string, string | number | boolean | null>, page = 0): Observable<Page<BookSummary>> { let params = new HttpParams().set('page', page).set('size', 12).set('sort', 'title').set('direction', 'asc'); for (const [key, value] of Object.entries(filters)) if (value !== null && value !== '') params = params.set(key, String(value)); return this.http.get<Page<BookSummary>>('/api/v1/books', { params }); }
  categories(): Observable<Category[]> { return this.http.get<Category[]>('/api/v1/categories'); }
  get(id: string): Observable<BookDetail> { return this.http.get<BookDetail>(`/api/v1/books/${id}`); }
  create(body: BookCreate): Observable<BookDetail> { return this.post<BookDetail>('/api/v1/books', body); }
  update(id: string, body: BookWrite): Observable<BookDetail> { return this.patch<BookDetail>(`/api/v1/books/${id}`, body); }
  deactivate(id: string): Observable<void> { return this.post<void>(`/api/v1/books/${id}/deactivate`, {}); }
  copies(id: string): Observable<BookCopy[]> { return this.http.get<BookCopy[]>(`/api/v1/books/${id}/copies`); }
  addCopy(id: string, body: { copyIdentifier: string; location: string | null }): Observable<BookCopy> { return this.post<BookCopy>(`/api/v1/books/${id}/copies`, body); }
  addCopies(id: string, body: { numberOfCopies: number; location: string | null }): Observable<BookCopy[]> { return this.post<BookCopy[]>(`/api/v1/books/${id}/copies/bulk`, body); }
  updateCopy(bookId: string, copyId: string, body: { copyIdentifier: string; location: string | null; status: Exclude<CopyStatus, 'ON_LOAN'> }): Observable<BookCopy> { return this.patch<BookCopy>(`/api/v1/books/${bookId}/copies/${copyId}`, body); }
  reconcileInventory(bookId: string, body: { targetQuantity: number; location?: string | null }): Observable<BookDetail> { return this.post<BookDetail>(`/api/v1/books/${bookId}/inventory/reconcile`, body); }

  getDigitalEdition(bookId: string): Observable<DigitalEdition> {
    return this.http.get<DigitalEdition>(`/api/v1/books/${bookId}/digital-edition`);
  }
  uploadDigitalEdition(bookId: string, file: File, editionLabel?: string): Observable<DigitalEdition> {
    const formData = new FormData();
    formData.append('file', file);
    if (editionLabel && editionLabel.trim()) {
      formData.append('editionLabel', editionLabel.trim());
    }
    return this.post<DigitalEdition>(`/api/v1/books/${bookId}/digital-edition`, formData);
  }
  replaceDigitalEdition(bookId: string, file: File, editionLabel?: string): Observable<DigitalEdition> {
    const formData = new FormData();
    formData.append('file', file);
    if (editionLabel && editionLabel.trim()) {
      formData.append('editionLabel', editionLabel.trim());
    }
    return this.put<DigitalEdition>(`/api/v1/books/${bookId}/digital-edition`, formData);
  }
  deleteDigitalEdition(bookId: string): Observable<void> {
    return this.delete<void>(`/api/v1/books/${bookId}/digital-edition`);
  }
  digitalEditionContentUrl(bookId: string): string {
    return `/api/v1/books/${bookId}/digital-edition/content`;
  }
  digitalEditionDownloadUrl(bookId: string): string {
    return `/api/v1/books/${bookId}/digital-edition/download`;
  }
}
