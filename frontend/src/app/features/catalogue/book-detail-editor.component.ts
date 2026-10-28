import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService, UserProfile } from '../auth/auth.service';
import { SignInDialogComponent } from '../auth/sign-in-dialog.component';
import { BookDetail, CatalogueService } from './catalogue.service';
import { BorrowingService } from '../circulation/borrowing.service';
import { ToastService } from '../../shared/layout/toast.component';

function validIsbn(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  const isbn = value.replace(/[\s-]/g, '').toUpperCase();
  if (isbn.length === 10) {
    let sum = 0;
    for (let index = 0; index < 10; index++) {
      const character = isbn[index];
      const digit = index === 9 && character === 'X' ? 10 : Number(character);
      if (!/^[0-9]$/.test(character) && !(index === 9 && character === 'X')) return { invalidIsbn: true };
      sum += (10 - index) * digit;
    }
    return sum % 11 === 0 ? null : { invalidIsbn: true };
  }
  if (isbn.length === 13 && /^[0-9]{13}$/.test(isbn)) {
    const sum = [...isbn].reduce((total, character, index) => total + Number(character) * (index % 2 ? 3 : 1), 0);
    return sum % 10 === 0 ? null : { invalidIsbn: true };
  }
  return { invalidIsbn: true };
}

function validPublicationYear(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  const year = Number(value);
  return Number.isInteger(year) && year >= 1000 && year <= new Date().getFullYear() ? null : { invalidPublicationYear: true };
}

function validCoverImageUrl(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && !!url.hostname && !url.username && !url.password
      ? null : { invalidCoverImageUrl: true };
  } catch { return { invalidCoverImageUrl: true }; }
}


@Component({selector:'app-book-detail',standalone:true,imports:[RouterLink,SignInDialogComponent],template:`
@if(loading()){<div class="loading-state" role="status">Loading book record…</div>}
@else if(loadError()){<div class="alert alert-error" role="alert">{{loadError()}} <button class="text-button" type="button" (click)="reload()">Retry</button></div>}
@else if(book();as b){
  <header class="catalogue-header"><a class="brand" routerLink="/" aria-label="LibTrack home"><span aria-hidden="true">▤</span><strong>LibTrack</strong></a><nav aria-label="Catalogue navigation"><a routerLink="/books">Explore books</a>@if(auth.profile()){<a routerLink="/workspace">My workspace</a>}@else{<button class="button button-secondary" type="button" (click)="openSignIn()">Sign in</button>}</nav></header>
  <a class="back-link" routerLink="/books">← Back to catalogue</a>
  <article class="detail-layout"><div class="cover-wrap">@if(b.coverImageUrl&&!broken()){<img class="book-cover-large" [src]="b.coverImageUrl" [alt]="'Cover of '+b.title" (error)="broken.set(true)">}@else{<div class="cover-fallback" aria-hidden="true"><span>LIBTRACK</span><strong>{{b.title}}</strong><small>{{b.authors.join(' · ')}}</small></div>}</div>
    <section class="detail-copy"><p class="eyebrow">{{b.categories.join(' · ')||'CATALOGUE RECORD'}}</p><h1>{{b.title}}</h1><p class="authors">{{b.authors.join(', ')}}</p><p class="muted">{{b.publisher||'Publisher not listed'}}@if(b.publicationYear){ · {{b.publicationYear}}}</p>@if(b.isbn){<p><strong>ISBN</strong> {{b.isbn}}</p>}@if(b.description){<p class="description">{{b.description}}</p>}
      <div class="availability-row"><span class="status-badge" [class.status-badge-success]="b.availableCopies>0" [class.status-badge-neutral]="b.availableCopies===0">{{b.availableCopies>0?'Available':'Unavailable'}}</span><strong>{{b.availableCopies}} / {{b.totalCopies}} copies available</strong></div>
      <p><strong>Loan policy:</strong> {{policyLabel(b.circulationPolicy)}}</p><p class="policy-note">Only standard circulation is eligible for take-home requests. Reference, serial, and overnight exception policies remain unavailable until their operating rules are defined.</p>
      @if(auth.profile()?.role==='STUDENT'||auth.profile()?.role==='FACULTY'){<div class="actions"><button class="button button-primary" type="button" (click)="requestBook()" [disabled]="pending()||!b.active||b.circulationPolicy!=='STANDARD'||b.availableCopies<1">{{pending()?'Submitting…':'Request this book'}}</button></div>}
      @else if(!auth.profile()){<div class="actions"><button class="button button-primary" type="button" (click)="requireAuthentication()" [disabled]="!b.active||b.circulationPolicy!=='STANDARD'||b.availableCopies<1">Sign in to request this book</button></div>}
      @else{<p class="muted">Librarian accounts cannot submit member borrowing requests.</p>}
      @if(notice()){<p class="alert" role="status" aria-live="polite">{{notice()}}</p>}
      @if(error()){<p class="alert alert-error" role="alert">{{error()}}</p>}
      @if(auth.profile()?.role==='LIBRARIAN'){<div class="actions"><a class="button button-primary" [routerLink]="['/workspace/librarian/books',b.id,'edit']">Edit record</a><a class="button button-secondary" [routerLink]="['/workspace/librarian/books',b.id,'copies']">Manage copies</a><button class="button button-danger" type="button" (click)="deactivate()" [disabled]="!b.active||pending()">{{b.active?'Deactivate record':'Record inactive'}}</button></div>}
    </section>
  </article>
}
@if(showSignIn()){<app-sign-in-dialog initialRole="STUDENT" [contextMessage]="signInContext()" (dismissed)="showSignIn.set(false)" (authenticated)="onSignedIn($event)" />}
`,styles:[`
:host{display:block}.catalogue-header{position:sticky;top:0;z-index:5;display:flex;min-height:3.7rem;align-items:center;justify-content:space-between;margin-bottom:1.5rem;padding-bottom:.7rem;border-bottom:1px solid var(--color-line-200)}.brand{display:flex;align-items:center;gap:.5rem;color:var(--color-forest-950);text-decoration:none}.brand>span{display:grid;width:2rem;height:2rem;place-items:center;border-radius:5px;color:white;background:var(--color-forest-900)}.brand strong{font:600 1.25rem var(--font-serif)}.catalogue-header nav{display:flex;align-items:center;gap:1rem}.catalogue-header nav>a{font-size:.85rem;text-decoration:none}.back-link{display:inline-block;margin-bottom:1.2rem}.detail-layout{display:grid;grid-template-columns:minmax(12rem,19rem) minmax(0,1fr);gap:clamp(1.5rem,5vw,4rem);padding:clamp(1rem,3vw,2rem);border:1px solid var(--color-line-200);border-radius:var(--radius-panel);background:var(--color-paper)}.cover-wrap{display:grid;min-height:18rem;place-items:center;padding:1rem;background:#f0efe7}.book-cover-large{width:auto;max-width:100%;height:17rem;aspect-ratio:2/3;object-fit:cover;box-shadow:var(--shadow-panel)}.cover-fallback{display:flex;width:12rem;height:17rem;flex-direction:column;justify-content:space-between;padding:1.2rem;border-left:6px solid var(--color-sage-500);color:var(--color-forest-950);background:linear-gradient(145deg,var(--color-sage-100),var(--color-ivory-100));box-shadow:var(--shadow-panel)}.cover-fallback strong{font:600 1.5rem/1.2 var(--font-serif)}.cover-fallback span,.cover-fallback small{font-size:.7rem;letter-spacing:.1em}.detail-copy h1{margin-bottom:.5rem}.authors{font-size:1.05rem}.description{max-width:52rem;white-space:pre-line}.availability-row{display:flex;align-items:center;gap:.8rem;margin:1.2rem 0;padding:1rem;border-block:1px solid var(--color-line-200)}.policy-note{color:var(--color-charcoal-600);font-size:.82rem}.actions{display:flex;flex-wrap:wrap;gap:.65rem;margin-top:1.5rem}.text-button{padding:.2rem;border:0;color:var(--color-forest-900);background:transparent;text-decoration:underline;cursor:pointer}@media(max-width:680px){.detail-layout{grid-template-columns:1fr}.cover-wrap{min-height:14rem}.book-cover-large,.cover-fallback{height:13rem}.cover-fallback{width:9rem}.actions>*{flex:1 1 auto}}
`]} )
export class BookDetailComponent {
  readonly auth=inject(AuthService);private readonly toast=inject(ToastService);private readonly service=inject(CatalogueService);private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);readonly book=signal<BookDetail|null>(null);readonly loading=signal(true);readonly loadError=signal('');readonly error=signal('');readonly pending=signal(false);readonly broken=signal(false);readonly notice=signal('');readonly showSignIn=signal(false);private readonly borrowing=inject(BorrowingService);private id='';
  constructor(){this.id=this.route.snapshot.paramMap.get('bookId')||'';this.reload()}
  reload(){this.loading.set(true);this.loadError.set('');this.service.get(this.id).pipe(finalize(()=>this.loading.set(false))).subscribe({next:b=>this.book.set(b),error:e=>this.loadError.set(e.status===404?'This book record is unavailable.':'The book record could not be loaded.')})}
  policyLabel(p:string){const labels:Record<string,string>={STANDARD:'Standard circulation',REFERENCE_ONLY:'Reference only',SERIAL_RESTRICTED:'Serial material · restricted',APPROVED_OVERNIGHT_EXCEPTION:'Approved overnight exception'};return labels[p]??p}
  openSignIn(){this.showSignIn.set(true)}
  signInContext(){const title=this.book()?.title;return title?`You selected “${title}”. No request has been sent. After sign-in, review eligibility and submit the request yourself.`:''}
  requireAuthentication(){this.notice.set('Authentication Required: Please sign in to reserve books. No borrowing request was sent.');this.toast.show('Sign in is required before you can request this book. No request was sent.','warning');this.showSignIn.set(true)}
  onSignedIn(profile:UserProfile){this.showSignIn.set(false);this.notice.set(profile.role==='STUDENT'||profile.role==='FACULTY'?'Signed in. This book is still selected; you can now submit your request.':'You are signed in as a Librarian. Member borrowing is not available to this account.')}
  requestBook(){const role=this.auth.profile()?.role;if(!role){this.requireAuthentication();return}if(role==='LIBRARIAN'){this.error.set('Librarian accounts cannot submit member borrowing requests.');return}const b=this.book();if(!b||!b.active||b.circulationPolicy!=='STANDARD'||b.availableCopies<1||this.pending())return;this.pending.set(true);this.error.set('');this.notice.set('');this.borrowing.submit(b.id).pipe(finalize(()=>this.pending.set(false))).subscribe({next:()=>{this.notice.set('Request submitted. Track its review in My requests.');this.toast.show('Request submitted. Track its review in My requests.','success')},error:e=>{const message=e.status===409?'This book is no longer eligible or available. Refresh the record.':'Your request could not be submitted. Please try again.';this.error.set(message);this.toast.show(message,'error')}})}
  deactivate(){if(!this.id||this.pending())return;this.pending.set(true);this.service.deactivate(this.id).pipe(finalize(()=>this.pending.set(false))).subscribe({next:()=>void this.router.navigateByUrl('/books'),error:()=>this.error.set('The book could not be deactivated.')})}
}
@Component({selector:'app-book-editor',standalone:true,imports:[ReactiveFormsModule,RouterLink],template:`
<header class="page-heading"><p class="eyebrow">LIBRARIAN · CATALOGUE</p><h1>{{editing?'Edit book':'Add a book'}}</h1><p class="muted">Maintain the verified catalogue record. Availability is calculated from managed copies.</p></header>@if(error()){<p class="alert alert-error" role="alert">{{error()}}</p>}@if(loading()){<div class="loading-state" role="status">Loading record…</div>}@else{<form class="editor surface-card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
<div class="field"><label for="title">Title <span class="required-mark">*</span></label><input id="title" formControlName="title" maxlength="240" required [attr.aria-invalid]="invalid('title')" aria-describedby="title-help"><p id="title-help" class="field-hint">Use the title printed on this edition.</p></div><div class="field"><label for="authors">Author names <span class="required-mark">*</span></label><input id="authors" formControlName="authors" required aria-describedby="authors-help"><p id="authors-help" class="field-hint">Separate multiple names with commas.</p></div><div class="field"><label for="categories">Categories <span class="required-mark">*</span></label><input id="categories" formControlName="categories" required aria-describedby="categories-help"><p id="categories-help" class="field-hint">Separate categories with commas.</p></div><div class="two-col"><div class="field"><label for="isbn">ISBN</label><input id="isbn" formControlName="isbn" maxlength="17" autocomplete="off" [attr.aria-invalid]="!!fieldMessage('isbn')" [attr.aria-describedby]="fieldMessage('isbn') ? 'isbn-error' : 'isbn-help'" (input)="clearFieldError('isbn')"><p id="isbn-help" class="field-hint">ISBN-10 or ISBN-13; checksum validated on save.</p>@if(fieldMessage('isbn')){<p id="isbn-error" class="field-error" role="alert">{{fieldMessage('isbn')}}</p>}</div><div class="field"><label for="publicationYear">Publication year</label><input id="publicationYear" type="number" formControlName="publicationYear" min="1000" [max]="year" [attr.aria-invalid]="!!fieldMessage('publicationYear')" [attr.aria-describedby]="fieldMessage('publicationYear') ? 'publication-year-error' : null" (input)="clearFieldError('publicationYear')">@if(fieldMessage('publicationYear')){<p id="publication-year-error" class="field-error" role="alert">{{fieldMessage('publicationYear')}}</p>}</div></div><div class="two-col"><div class="field"><label for="publisher">Publisher</label><input id="publisher" formControlName="publisher" maxlength="200"></div><div class="field"><label for="coverImageUrl">Cover image URL</label><input id="coverImageUrl" type="url" formControlName="coverImageUrl" maxlength="2048" placeholder="https://…" [attr.aria-invalid]="!!fieldMessage('coverImageUrl')" [attr.aria-describedby]="fieldMessage('coverImageUrl') ? 'cover-url-error' : 'cover-url-help'" (input)="clearFieldError('coverImageUrl')"><p id="cover-url-help" class="field-hint">Optional. Use an absolute HTTP or HTTPS image URL.</p>@if(fieldMessage('coverImageUrl')){<p id="cover-url-error" class="field-error" role="alert">{{fieldMessage('coverImageUrl')}}</p>}</div></div><div class="field"><label for="description">Description</label><textarea id="description" rows="5" formControlName="description" maxlength="4000"></textarea></div><div class="field"><label for="circulationPolicy">Catalogue circulation policy</label><select id="circulationPolicy" formControlName="circulationPolicy"><option value="STANDARD">Standard circulation</option><option value="REFERENCE_ONLY">Reference only</option><option value="SERIAL_RESTRICTED">Serial material · restricted</option><option value="APPROVED_OVERNIGHT_EXCEPTION">Approved overnight exception</option></select><p class="field-hint">This is catalogue metadata; circulation rules are not yet enforced.</p></div><div class="actions"><button class="button button-primary" type="submit" [disabled]="form.invalid||pending()">{{pending()?'Saving…':(editing?'Save changes':'Create book')}}</button><a class="button button-secondary" routerLink="/books">Cancel</a></div></form>}
`,styles:[`:host{display:block}.page-heading{margin-bottom:1.3rem}.page-heading h1{margin-bottom:.4rem}.page-heading p{margin-bottom:0}.editor{display:grid;max-width:52rem;gap:1rem;padding:clamp(1rem,3vw,2rem)}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:1rem}textarea{resize:vertical}.actions{display:flex;gap:.65rem;margin-top:.35rem}@media(max-width:600px){.two-col{grid-template-columns:1fr}.actions>*{flex:1}}`]} )
export class BookEditorComponent {
 private readonly fb=inject(NonNullableFormBuilder);private readonly service=inject(CatalogueService);private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);readonly year=new Date().getFullYear();readonly id=this.route.snapshot.paramMap.get('bookId');readonly editing=!!this.id;readonly loading=signal(!!this.id);readonly pending=signal(false);readonly error=signal('');readonly serverFieldErrors=signal<Record<string,string>>({});readonly form=this.fb.group({title:['',[Validators.required,Validators.maxLength(240)]],authors:['',[Validators.required]],categories:['',[Validators.required]],isbn:['',[Validators.maxLength(17),validIsbn]],publisher:[''],publicationYear:['',[validPublicationYear]],coverImageUrl:['',[Validators.maxLength(2048),validCoverImageUrl]],description:[''],circulationPolicy:['STANDARD' as 'STANDARD'|'REFERENCE_ONLY'|'SERIAL_RESTRICTED'|'APPROVED_OVERNIGHT_EXCEPTION',[Validators.required]]});
 constructor(){if(this.id)this.service.get(this.id).subscribe({next:b=>{this.form.patchValue({title:b.title,authors:b.authors.join(', '),categories:b.categories.join(', '),isbn:b.isbn||'',publisher:b.publisher||'',publicationYear:b.publicationYear?.toString()||'',coverImageUrl:b.coverImageUrl||'',description:b.description||'',circulationPolicy:b.circulationPolicy});this.loading.set(false)},error:()=>{this.loading.set(false);this.error.set('The book record could not be loaded.')}})}
 invalid(name:'title'){const c=this.form.controls[name];return c.invalid&&c.touched}
 fieldMessage(field:'isbn'|'publicationYear'|'coverImageUrl'):string|null {
   const control=this.form.controls[field];
   if(control.hasError('invalidIsbn'))return 'Enter a valid ISBN-10 or ISBN-13, including its check digit.';
   if(control.hasError('invalidPublicationYear'))return 'Enter a whole year between 1000 and ' + this.year + '.';
   if(control.hasError('invalidCoverImageUrl'))return 'Enter an absolute HTTP or HTTPS URL without embedded credentials, or leave this field empty.';
   return this.serverFieldErrors()[field]??null;
 }
 clearFieldError(field:string):void { if(this.serverFieldErrors()[field]){const errors={...this.serverFieldErrors()};delete errors[field];this.serverFieldErrors.set(errors);} }
 private reportSaveError(reason:unknown):void {
   this.serverFieldErrors.set({});
   if(reason instanceof HttpErrorResponse){
     const fieldErrors=reason.error?.fieldErrors;
     if(fieldErrors&&typeof fieldErrors==='object'){
       const safe:Record<string,string>={};
       for(const field of ['isbn','publicationYear','coverImageUrl','title','authors','categories'])if(typeof fieldErrors[field]==='string')safe[field]=fieldErrors[field];
       if(Object.keys(safe).length){this.serverFieldErrors.set(safe);this.error.set('Some book details need attention. Review the field messages.');return;}
     }
     if(reason.status===401)this.error.set('Your session has expired. Sign in again before saving.');
     else if(reason.status===403)this.error.set('You are not authorized to manage catalogue records. Use a Librarian account.');
     else if(reason.status===409)this.error.set('A matching ISBN or catalogue identity already exists. Check the ISBN and try again.');
     else if(reason.status===400)this.error.set('The server rejected the book details. Review the ISBN, year, and cover URL.');
     else if(reason.status===0)this.error.set('The catalogue service could not be reached. Your changes were not saved. Try again.');
     else this.error.set('The book could not be saved because of a server or database error. Technical details were withheld.');
     return;
   }
   this.error.set('The security token could not be obtained. Sign in again and retry the save.');
 }
 submit(){if(this.form.invalid||this.pending()){this.form.markAllAsTouched();return}const v=this.form.getRawValue();const payload={title:v.title.trim(),authors:v.authors.split(',').map(x=>x.trim()).filter(Boolean),categories:v.categories.split(',').map(x=>x.trim()).filter(Boolean),isbn:v.isbn.trim()||null,publisher:v.publisher.trim()||null,publicationYear:v.publicationYear?Number(v.publicationYear):null,coverImageUrl:v.coverImageUrl.trim()||null,description:v.description.trim()||null,circulationPolicy:v.circulationPolicy};if(!payload.authors.length||!payload.categories.length){this.error.set('Enter at least one author and one category.');return}this.pending.set(true);this.error.set('');this.serverFieldErrors.set({});const call=this.id?this.service.update(this.id,payload):this.service.create(payload);call.pipe(finalize(()=>this.pending.set(false))).subscribe({next:b=>void this.router.navigate(['/books',b.id]),error:e=>this.reportSaveError(e)})}
}

