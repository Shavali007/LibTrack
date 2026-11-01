import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { BookCopy, CatalogueService, CopyStatus } from './catalogue.service';

function validWholeQuantity(control: AbstractControl): ValidationErrors | null {
  const value = Number(control.value);
  return Number.isInteger(value) && value >= 1 && value <= 500 ? null : { invalidWholeQuantity: true };
}

@Component({
  selector: 'app-copy-manager',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
  template: `
    <header class="page-heading">
      <a class="back-link" [routerLink]="['/workspace/books', bookId]">← Back to book</a>
      <h1>Manage physical copies</h1>
      <p class="muted">Every physical copy has its own globally unique identifier and circulation status.</p>
    </header>
    @if(error()){<p class="alert alert-error" role="alert">{{error()}}</p>}
    @if(notice()){<p class="alert alert-success" role="status" aria-live="polite">{{notice()}}</p>}

    <section class="surface-card add-panel" aria-labelledby="bulk-title">
      <h2 id="bulk-title">Add copies in bulk</h2>
      <p class="field-hint">Create 1–500 available copies. Existing inventory and circulation records are preserved.</p>
      <form [formGroup]="bulkForm" (ngSubmit)="addCopies()">
        <div class="field">
          <label for="bulk-quantity">Number of copies <span class="required-mark">*</span></label>
          <input id="bulk-quantity" type="number" min="1" max="500" step="1" formControlName="numberOfCopies" required
            [attr.aria-invalid]="bulkForm.controls.numberOfCopies.touched && bulkForm.controls.numberOfCopies.invalid"
            aria-describedby="bulk-quantity-help">
          <p id="bulk-quantity-help" class="field-hint">Enter a whole number from 1 to 500.</p>
          @if(bulkForm.controls.numberOfCopies.touched && bulkForm.controls.numberOfCopies.invalid){
            <p class="field-error" role="alert">Enter a whole number from 1 to 500.</p>
          }
        </div>
        <div class="field">
          <label for="bulk-location">Shelf / location</label>
          <input id="bulk-location" formControlName="location" maxlength="120" autocomplete="off" placeholder="Optional location">
        </div>
        <button class="button button-primary" type="submit" [disabled]="bulkForm.invalid||pending()">{{pending()?'Adding…':'Add Copies'}}</button>
      </form>
    </section>

    <details class="surface-card manual-panel">
      <summary>Add one copy with a specified identifier</summary>
      <form [formGroup]="singleForm" (ngSubmit)="addOne()">
        <div class="field">
          <label for="identifier">Copy identifier <span class="required-mark">*</span></label>
          <input id="identifier" formControlName="copyIdentifier" required autocomplete="off"
            [attr.aria-invalid]="singleForm.controls.copyIdentifier.touched && singleForm.controls.copyIdentifier.invalid"
            aria-describedby="single-identifier-help">
          <p id="single-identifier-help" class="field-hint">Use this for accession numbers already assigned by the library (e.g. LIB-001).</p>
          @if(singleForm.controls.copyIdentifier.touched && singleForm.controls.copyIdentifier.invalid){
            <p class="field-error" role="alert">Enter a valid identifier (letters, numbers, dots, dashes, slashes, underscores; 2–100 characters).</p>
          }
        </div>
        <div class="field">
          <label for="single-location">Shelf / location</label>
          <input id="single-location" formControlName="location" maxlength="120" placeholder="Optional location">
        </div>
        <button class="button button-secondary" type="submit" [disabled]="singleForm.invalid||pending()">Add one copy</button>
      </form>
    </details>

    <h2 class="inventory-title">Inventory</h2>
    @if(loading()){
      <div class="loading-state" role="status">Loading copies…</div>
    }@else if(loadError()){
      <div class="alert alert-error" role="alert">{{loadError()}} <button class="text-button" type="button" (click)="load()">Retry</button></div>
    }@else{
      <section class="surface-card inventory-summary" aria-label="Physical inventory status counts">
        @for(item of summaryItems();track item.label){<div><span>{{item.label}}</span><strong>{{item.count}}</strong></div>}
        <p class="field-hint">Total includes withdrawn copy records. Only available copies can be requested.</p>
      </section>
      @if(!copies().length){
        <div class="empty-state"><h3>No physical copies</h3><p>Add copies above to begin tracking inventory.</p></div>
      }@else{
        <div class="data-table-wrap"><table class="data-table">
          <caption class="sr-only">Physical copy inventory</caption>
          <thead><tr><th scope="col">Identifier</th><th scope="col">Location</th><th scope="col">Status</th><th scope="col">Update</th></tr></thead>
          <tbody>@for(copy of copies();track copy.id){<tr>
            <td><input [ngModel]="draft(copy).copyIdentifier" (ngModelChange)="edit(copy,'copyIdentifier',$event)" [ngModelOptions]="{standalone:true}" [attr.aria-label]="'Identifier for '+copy.copyIdentifier" [disabled]="pending()||copy.status==='ON_LOAN'"></td>
            <td><input [ngModel]="draft(copy).location" (ngModelChange)="edit(copy,'location',$event)" [ngModelOptions]="{standalone:true}" [attr.aria-label]="'Location for '+copy.copyIdentifier" [disabled]="pending()||copy.status==='ON_LOAN'"></td>
            <td><span class="status-badge" [class.status-badge-success]="draft(copy).status==='AVAILABLE'" [class.status-badge-warning]="draft(copy).status==='LOST'||draft(copy).status==='DAMAGED'" [class.status-badge-neutral]="draft(copy).status==='ON_LOAN'||draft(copy).status==='WITHDRAWN'">{{draft(copy).status.replace('_',' ')}}</span></td>
            <td class="update-cell"><select [attr.aria-label]="'Set status for '+copy.copyIdentifier" [ngModel]="draft(copy).status" (ngModelChange)="edit(copy,'status',$event)" [ngModelOptions]="{standalone:true}" [disabled]="pending()||copy.status==='ON_LOAN'"><option value="AVAILABLE">Available</option><option value="LOST">Lost</option><option value="DAMAGED">Damaged</option><option value="WITHDRAWN">Withdrawn</option></select><button class="button button-secondary save-copy" type="button" (click)="save(copy)" [disabled]="pending()||draft(copy).status==='ON_LOAN'">Save changes</button></td>
          </tr>}</tbody>
        </table></div>
      }
    }
  `,
  styles: [`
    :host{display:block}.page-heading{margin:1rem 0 1.3rem}.page-heading h1{margin-bottom:.4rem}.page-heading p{margin-bottom:0}
    .add-panel,.manual-panel{max-width:58rem;padding:1.2rem;margin-bottom:1rem}.add-panel h2{font-family:var(--font-sans);font-size:var(--type-card-heading-size);font-weight:var(--type-card-heading-weight)}.add-panel>p{margin:.2rem 0 1rem}
    .add-panel form,.manual-panel form{display:grid;grid-template-columns:minmax(9rem,.7fr) minmax(12rem,1fr) auto;align-items:end;gap:1rem}.manual-panel summary{font-weight:600;cursor:pointer}.manual-panel[open] summary{margin-bottom:1rem}
    .inventory-title{margin:1.6rem 0 .8rem;font-family:var(--font-sans);font-size:var(--type-section-heading-size);font-weight:var(--type-section-heading-weight)}.inventory-summary{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:.65rem;margin-bottom:1rem;padding:1rem}.inventory-summary>div{display:flex;flex-direction:column;gap:.25rem;padding:.65rem;border:1px solid var(--color-line-200);border-radius:var(--radius-control);background:var(--color-ivory-100)}.inventory-summary span{font-size:.78rem;color:var(--color-charcoal-600)}.inventory-summary strong{font-size:1.2rem;color:var(--color-forest-950)}.inventory-summary>p{grid-column:1/-1;margin:0}
    .update-cell{min-width:12rem}.save-copy{min-height:2.2rem;margin:.35rem 0;padding:.35rem .65rem;font-size:.78rem}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}.text-button{border:0;color:var(--color-forest-900);background:transparent;text-decoration:underline;cursor:pointer}
    @media(max-width:900px){.inventory-summary{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:700px){.add-panel form,.manual-panel form{grid-template-columns:1fr}.add-panel button,.manual-panel button{width:100%}.inventory-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.data-table th,.data-table td{padding:.55rem;font-size:.8rem}}
  `],
})
export class CopyManagerComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly service = inject(CatalogueService);
  readonly bookId = this.route.snapshot.paramMap.get('bookId') || '';
  readonly copies = signal<BookCopy[]>([]);
  readonly loading = signal(true);
  readonly pending = signal(false);
  readonly error = signal('');
  readonly loadError = signal('');
  readonly notice = signal('');
  readonly drafts = signal<Record<string, { copyIdentifier: string; location: string; status: CopyStatus }>>({});
  readonly summary = computed(() => {
    const inventory = this.copies();
    const count = (status: CopyStatus) => inventory.filter(copy => copy.status === status).length;
    return {
      totalCopies: inventory.length,
      availableCopies: count('AVAILABLE'),
      onLoanCopies: count('ON_LOAN'),
      lostCopies: count('LOST'),
      damagedCopies: count('DAMAGED'),
      withdrawnCopies: count('WITHDRAWN'),
    };
  });
  readonly summaryItems = computed(() => {
    const counts = this.summary();
    return [
      { label: 'Total copies', count: counts.totalCopies },
      { label: 'Available', count: counts.availableCopies },
      { label: 'On loan', count: counts.onLoanCopies },
      { label: 'Lost', count: counts.lostCopies },
      { label: 'Damaged', count: counts.damagedCopies },
      { label: 'Withdrawn', count: counts.withdrawnCopies },
    ];
  });
  readonly bulkForm = this.fb.group({
    numberOfCopies: [1, [Validators.required, Validators.min(1), Validators.max(500), validWholeQuantity]],
    location: ['', [Validators.maxLength(120)]],
  });
  readonly singleForm = this.fb.group({
    copyIdentifier: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[A-Za-z0-9][A-Za-z0-9._/-]{1,99}$/)]],
    location: ['', [Validators.maxLength(120)]],
  });

  constructor() { this.load(); }

  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.service.copies(this.bookId).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: inventory => this.copies.set(inventory),
      error: response => {
        this.copies.set([]);
        this.loadError.set(response.status === 401 ? 'Sign in to continue.' : 'Inventory could not be loaded. Counts are unavailable until the request succeeds.');
      },
    });
  }

  addCopies(): void {
    if (this.bulkForm.invalid || this.pending()) {
      this.bulkForm.markAllAsTouched();
      return;
    }
    const value = this.bulkForm.getRawValue();
    this.pending.set(true);
    this.error.set('');
    this.notice.set('');
    this.service.addCopies(this.bookId, { numberOfCopies: Number(value.numberOfCopies), location: value.location.trim() || null })
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe({
        next: added => {
          this.notice.set(`${added.length} ${added.length === 1 ? 'copy' : 'copies'} added successfully.`);
          this.bulkForm.reset({ numberOfCopies: 1, location: '' });
          this.load();
        },
        error: response => this.error.set(response.status === 409 ? 'A generated copy identifier conflicted with existing inventory. No copies were added; retry the operation.' : this.safeMutationError(response.status)),
      });
  }

  addOne(): void {
    if (this.singleForm.invalid || this.pending()) {
      this.singleForm.markAllAsTouched();
      return;
    }
    this.pending.set(true);
    this.error.set('');
    this.notice.set('');
    const value = this.singleForm.getRawValue();
    this.service.addCopy(this.bookId, { copyIdentifier: value.copyIdentifier.trim(), location: value.location.trim() || null })
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe({
        next: () => {
          this.notice.set('Copy added.');
          this.singleForm.reset({ copyIdentifier: '', location: '' });
          this.load();
        },
        error: response => this.error.set(response.status === 409 ? 'That copy identifier is already in use.' : this.safeMutationError(response.status)),
      });
  }

  draft(copy: BookCopy) { return this.drafts()[copy.id] ?? { copyIdentifier: copy.copyIdentifier, location: copy.location || '', status: copy.status }; }
  edit(copyOrId: BookCopy | string, key: 'copyIdentifier' | 'location' | 'status', value: string): void {
    const id = typeof copyOrId === 'string' ? copyOrId : copyOrId.id;
    const existing = this.drafts()[id];
    let base: { copyIdentifier: string; location: string; status: CopyStatus };
    if (existing) {
      base = existing;
    } else {
      const found = typeof copyOrId === 'string' ? this.copies().find(c => c.id === id) : copyOrId;
      base = found
        ? { copyIdentifier: found.copyIdentifier, location: found.location || '', status: found.status }
        : { copyIdentifier: '', location: '', status: 'AVAILABLE' };
    }
    this.drafts.update(all => ({ ...all, [id]: { ...base, [key]: value } }));
  }
  save(copy: BookCopy): void {
    const value = this.draft(copy);
    if (value.status === 'ON_LOAN' || this.pending()) return;
    const trimmedIdentifier = value.copyIdentifier.trim();
    if (!trimmedIdentifier) {
      this.error.set('Copy identifier is required.');
      return;
    }
    this.error.set('');
    this.notice.set('');
    this.pending.set(true);
    this.service.updateCopy(this.bookId, copy.id, {
      copyIdentifier: trimmedIdentifier,
      location: value.location.trim() || null,
      status: value.status as Exclude<CopyStatus, 'ON_LOAN'>,
    }).pipe(finalize(() => this.pending.set(false))).subscribe({
      next: () => {
        this.notice.set('Copy details updated.');
        this.drafts.update(all => { const next = { ...all }; delete next[copy.id]; return next; });
        this.load();
      },
      error: response => this.error.set(response.status === 409 ? 'That copy identifier is already in use.' : this.safeMutationError(response.status)),
    });
  }

  private safeMutationError(status: number): string {
    if (status === 401) return 'Sign in to manage inventory.';
    if (status === 403) return 'Only Librarians can manage physical copies.';
    if (status === 404) return 'The book record or inventory service was not found.';
    if (status === 400) return 'Invalid inventory details. Review the quantity and location.';
    return 'The inventory change could not be saved. Please try again.';
  }
}
