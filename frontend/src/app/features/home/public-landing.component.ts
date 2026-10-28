import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AccountRole, AuthService, UserProfile } from '../auth/auth.service';
import { SignInDialogComponent } from '../auth/sign-in-dialog.component';
import { BookSummary, CatalogueService } from '../catalogue/catalogue.service';

@Component({
  selector: 'app-public-landing',
  standalone: true,
  imports: [FormsModule, RouterLink, SignInDialogComponent],
  template: `
    <main class="landing-page" id="home">
      <header class="landing-header">
        <a class="brand" routerLink="/" aria-label="LibTrack home">
          <span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 6.5C9.7 4.8 6.8 4.2 3 4.5v14c3.8-.3 6.7.3 9 2 2.3-1.7 5.2-2.3 9-2v-14c-3.8-.3-6.7.3-9 2Zm0 0v14"/></svg></span>
          <span class="brand-copy"><strong>LibTrack</strong><small>ACADEMIC LIBRARY</small></span>
        </a>
        <nav aria-label="Main navigation">
          <a routerLink="/" aria-current="page">Home</a>
          <a routerLink="/books">Explore books</a>
          <a href="#about">About</a>
          @if (hasAccount()) { <a class="button button-primary nav-action" routerLink="/workspace">Open workspace</a> }
          @else { <button class="button button-primary nav-action" type="button" (click)="openSignIn()"><span aria-hidden="true">↪</span> Sign in</button> }
        </nav>
      </header>

      <section class="hero" aria-labelledby="hero-title">
        <p class="eyebrow">YOUR LIBRARY · YOUR LEARNING · YOUR JOURNEY</p>
        <h1 id="hero-title">A quieter space for <em>curious minds.</em></h1>
        <p class="hero-description">Discover books, manage your borrowing, and explore a smarter library experience with LibTrack.</p>
        <form class="hero-search" (ngSubmit)="searchBooks()" role="search">
          <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.2 4.2"/></svg>
          <label class="visually-hidden" for="landing-search">Search by title, author, subject, or ISBN</label>
          <input id="landing-search" name="search" [(ngModel)]="query" placeholder="Search by title, author, subject, or ISBN..." autocomplete="off">
          <button class="button button-primary" type="submit">Explore books <span aria-hidden="true">→</span></button>
        </form>
      </section>

      <section class="featured" aria-labelledby="featured-title">
        <div class="section-heading">
          <div><p class="eyebrow">LIBRARY COLLECTION</p><h2 id="featured-title">Featured Volumes</h2></div>
          <a class="browse-link" routerLink="/books">Browse Full Catalog <span aria-hidden="true">→</span></a>
        </div>
        @if (featuredLoading()) { <div class="loading-state" role="status">Loading catalogue selections…</div> }
        @else if (featuredError()) { <div class="alert alert-error" role="alert">{{ featuredError() }} <button class="text-button" type="button" (click)="loadFeatured()">Try again</button></div> }
        @else if (featuredBooks().length) {
          <div class="featured-grid">
            @for (book of featuredBooks(); track book.id) {
              <article class="featured-book">
                <a class="featured-cover" [routerLink]="['/books', book.id]" [attr.aria-label]="'View ' + book.title">
                  @if (book.coverImageUrl && !brokenCovers().has(book.id)) { <img [src]="book.coverImageUrl" [alt]="'Cover of ' + book.title" loading="lazy" (error)="markCoverBroken(book.id)"> }
                  @else { <span class="cover-fallback" aria-hidden="true"><small>LIBTRACK · LIBRARY COLLECTION</small><strong>{{ book.title }}</strong><span>{{ book.authors.join(' · ') }}</span></span> }
                </a>
                <div class="featured-book-copy">
                  @if (book.categories.length) { <p class="book-category">{{ book.categories[0] }}</p> }
                  <h3><a [routerLink]="['/books', book.id]">{{ book.title }}</a></h3>
                  <p class="book-author">{{ book.authors.join(', ') }}</p>
                  <span class="status-badge" [class.status-badge-success]="book.availableCopies > 0" [class.status-badge-neutral]="book.availableCopies === 0" [attr.aria-label]="book.availableCopies > 0 ? book.availableCopies + ' of ' + book.totalCopies + ' copies available' : 'No copies currently available'">
                    {{ book.availableCopies > 0 ? 'Available' : 'Unavailable' }} · {{ book.availableCopies }} of {{ book.totalCopies }}
                  </span>
                  <button class="button button-primary reserve-button" type="button" (click)="holdBook(book)" [disabled]="book.availableCopies < 1 || book.circulationPolicy !== 'STANDARD'" [attr.title]="book.availableCopies < 1 ? 'No copies are currently available' : book.circulationPolicy !== 'STANDARD' ? 'This item is not eligible for a standard request' : null">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-3.8L6 21V4.75Z"/></svg>
                    Hold / Reserve
                  </button>
                </div>
              </article>
            }
          </div>
        } @else {
          <div class="empty-state"><h3>The shelves are being prepared</h3><p>No books are currently listed in the catalogue.</p><a class="button button-secondary" routerLink="/books">Open catalogue</a></div>
        }
      </section>

      <section class="about" id="about" aria-label="About LibTrack"><p>LibTrack brings the public catalogue and supported library account services together in one place.</p><span>Accounts and circulation are governed by library policy.</span></section>
      <footer class="landing-footer"><a class="footer-brand" routerLink="/" aria-label="LibTrack home"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5C9.7 4.8 6.8 4.2 3 4.5v14c3.8-.3 6.7.3 9 2 2.3-1.7 5.2-2.3 9-2v-14c-3.8-.3-6.7.3-9 2Zm0 0v14"/></svg><strong>LibTrack LMS</strong></a><span>© 2026 LibTrack Academic Library Systems. All rights reserved.</span></footer>
      @if (showDialog()) { <app-sign-in-dialog [initialRole]="loginRole()" [contextMessage]="signInContext()" (dismissed)="dismissSignIn()" (authenticated)="onAuthenticated($event)" /> }
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100vh;overflow-x:clip;background:var(--color-ivory-50)}
    .landing-page{width:min(100%,100rem);min-height:100vh;margin:0 auto;padding:0 clamp(1rem,1.2vw,1.25rem);background:var(--color-ivory-50)}
    .landing-header{position:sticky;top:0;z-index:5;display:flex;min-height:5rem;align-items:center;justify-content:space-between;gap:1.5rem;border-bottom:1px solid var(--color-line-200);background:rgb(251 249 246 / 96%);backdrop-filter:blur(12px)}
    .brand{display:flex;align-items:center;gap:.75rem;color:var(--color-forest-950);text-decoration:none}.brand-mark{display:grid;width:2.9rem;height:2.9rem;place-items:center;border-radius:.8rem;color:#a8e8cf;background:var(--color-forest-900)}.brand-mark svg,.footer-brand svg{width:1.45rem;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.brand-copy{display:grid;gap:.16rem}.brand strong{font:600 1.55rem/1 var(--font-serif);letter-spacing:-.025em}.brand small{color:var(--color-forest-800);font-size:.62rem;font-weight:700;letter-spacing:.14em}
    .landing-header nav{display:flex;align-items:center;gap:clamp(1rem,2.2vw,2.3rem)}.landing-header nav>a:not(.button){color:var(--color-charcoal-700);font-size:.9rem;text-decoration:none}.landing-header nav>a:not(.button):hover{color:var(--color-forest-900);text-decoration:underline;text-underline-offset:.28rem}.nav-action{display:inline-flex;min-height:2.85rem;align-items:center;gap:.55rem;padding-inline:1.2rem;border-radius:.8rem;text-decoration:none}
    .hero{display:flex;min-height:40rem;align-items:center;flex-direction:column;justify-content:center;padding:3.6rem 0 4.3rem;text-align:center}.eyebrow{margin:0;color:var(--color-forest-800);font-size:.7rem;font-weight:700;letter-spacing:.12em;line-height:1.45;text-transform:uppercase}.hero>.eyebrow{margin-bottom:2rem;padding:.53rem .95rem;border:1px solid var(--color-line-200);border-radius:var(--radius-pill);background:var(--color-ivory-100);font-size:.68rem;letter-spacing:.09em}.hero h1{max-width:62rem;margin:0 auto 1.35rem;color:#101729;font:500 clamp(3.2rem,5.2vw,4.65rem)/1.06 var(--font-serif);letter-spacing:-.045em}.hero h1 em{color:var(--color-forest-900);font-weight:400}.hero-description{max-width:58rem;margin:0 auto 2rem;color:var(--color-charcoal-700);font-size:clamp(1.08rem,1.6vw,1.28rem);line-height:1.55}.hero-search{display:flex;width:min(100%,41rem);min-height:4.2rem;align-items:center;gap:.7rem;margin:0 auto;padding:.42rem .48rem .42rem 1rem;border:1px solid var(--color-line-200);border-radius:1rem;background:#fff;box-shadow:0 9px 25px rgb(31 48 39 / 7%)}.search-icon{width:1.35rem;height:1.35rem;flex:0 0 auto;fill:none;stroke:#889bb4;stroke-width:1.8;stroke-linecap:round}.hero-search input{min-width:0;flex:1;border:0!important;outline:0!important;box-shadow:none!important;text-align:left;font-size:1rem}.hero-search input:focus-visible{outline:2px solid var(--color-forest-700)!important;outline-offset:1px;border-radius:.25rem}.hero-search button{min-height:3.2rem;flex:0 0 auto;gap:.7rem;padding-inline:1.35rem;border-radius:.8rem}
    .featured{padding:2.7rem 0 3.25rem;border-top:1px solid var(--color-line-200)}.section-heading{display:flex;align-items:end;justify-content:space-between;gap:2rem;margin-bottom:1.9rem}.section-heading .eyebrow{margin-bottom:.4rem}.section-heading h2{margin:0;color:#101729;font:500 clamp(2rem,3vw,2.5rem)/1.12 var(--font-serif);letter-spacing:-.025em}.browse-link{padding:.4rem 0;color:var(--color-forest-900);font-size:.95rem;font-weight:700;text-decoration:none;white-space:nowrap}.browse-link:hover{text-decoration:underline;text-underline-offset:.25rem}
    .featured-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));align-items:stretch;gap:1.5rem}.featured-book{display:flex;min-width:0;flex-direction:column;overflow:hidden;border:1px solid var(--color-line-200);border-radius:1.1rem;background:#fff;box-shadow:0 1px 3px rgb(20 40 30 / 5%)}.featured-cover{display:grid;height:14.25rem;place-items:center;overflow:hidden;margin:.85rem .85rem 0;border-radius:.85rem;background:#f0efe7;text-decoration:none}.featured-cover img{width:100%;height:100%;object-fit:contain}.cover-fallback{display:flex;width:100%;height:100%;flex-direction:column;justify-content:space-between;padding:1.25rem;border-left:6px solid var(--color-sage-500);color:#fff;background:var(--color-forest-950);text-align:left}.cover-fallback small,.cover-fallback span{font-size:.64rem;letter-spacing:.08em}.cover-fallback strong{max-width:15rem;font:600 1.35rem/1.2 var(--font-serif)}.featured-book-copy{display:flex;flex:1;flex-direction:column;gap:.38rem;padding:1rem}.book-category{margin:0 0 .15rem;color:var(--color-forest-800);font-size:.65rem;font-weight:750;letter-spacing:.07em;text-transform:uppercase}.featured-book-copy h3{margin:0;color:#101729;font:600 1.05rem/1.28 var(--font-sans)}.featured-book-copy h3 a{color:inherit;text-decoration:none}.featured-book-copy h3 a:hover{text-decoration:underline;text-underline-offset:.18rem}.book-author{overflow:hidden;margin:0;color:var(--color-charcoal-600);font-size:.88rem;text-overflow:ellipsis;white-space:nowrap}.featured-book-copy .status-badge{align-self:flex-start;margin:.15rem 0 .35rem;font-size:.72rem}.reserve-button{display:flex;width:100%;min-height:2.65rem;align-items:center;justify-content:center;gap:.45rem;margin-top:auto;padding:.4rem .65rem;border-radius:.7rem;font-size:.86rem}.reserve-button svg{width:1.05rem;height:1.05rem;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.reserve-button:disabled{opacity:.55;cursor:not-allowed}
    .about{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1.1rem 0;border-top:1px solid var(--color-line-200);color:var(--color-charcoal-600);font-size:.8rem}.about p{margin:0}.landing-footer{position:relative;left:50%;display:flex;width:100vw;min-height:5.6rem;align-items:center;justify-content:space-between;gap:1rem;margin-left:-50vw;padding:1rem max(1rem,calc((100vw - 100rem)/2 + clamp(1rem,1.2vw,1.25rem)));color:#d4dded;background:#101729;font-size:.77rem}.footer-brand{display:flex;align-items:center;gap:.6rem;color:#fff;text-decoration:none}.footer-brand svg{color:#52d9ad}.footer-brand strong{font:600 1rem var(--font-serif)}
    .text-button{padding:0;border:0;color:var(--color-forest-900);background:transparent;font-weight:700;text-decoration:underline;text-underline-offset:.15rem;cursor:pointer}.visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    @media(max-width:1100px){.featured-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:1.1rem}.hero{min-height:29rem}}
    @media(max-width:680px){.landing-header{min-height:4.4rem}.landing-header nav{gap:.8rem}.landing-header nav>a[href="#about"]{display:none}.brand-mark{width:2.5rem;height:2.5rem}.brand strong{font-size:1.35rem}.hero{min-height:0;padding:4.8rem 0 4.5rem}.hero>.eyebrow{margin-bottom:1.45rem}.hero h1{font-size:clamp(2.8rem,10vw,4rem)}.hero-description{max-width:36rem;font-size:1.02rem}.section-heading{align-items:flex-start;flex-direction:column;gap:.7rem;margin-bottom:1.25rem}.featured{padding:2rem 0 2.3rem}.about{align-items:flex-start;flex-direction:column}.landing-footer{align-items:flex-start;flex-direction:column;justify-content:center;min-height:5.5rem;gap:.55rem}}
    @media(max-width:460px){.landing-page{padding-inline:1rem}.landing-header nav{gap:.55rem}.landing-header nav>a:not(.button){font-size:.78rem}.landing-header nav>a[href="#about"]{display:none}.nav-action{min-height:2.55rem;padding-inline:.85rem;font-size:.82rem}.brand{gap:.5rem}.brand-mark{width:2.2rem;height:2.2rem}.brand strong{font-size:1.2rem}.brand small{font-size:.52rem}.hero{padding:4rem 0}.hero>.eyebrow{font-size:.58rem;letter-spacing:.04em}.hero h1{font-size:2.7rem}.hero-search{align-items:stretch;flex-wrap:wrap;gap:.35rem .55rem;padding:.55rem}.hero-search input{flex-basis:calc(100% - 2rem);min-height:2.7rem}.hero-search button{width:100%;min-height:2.9rem}.featured-grid{grid-template-columns:1fr;gap:.85rem}.featured-cover{height:14rem}}
  `],
})
export class PublicLandingComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly catalogue = inject(CatalogueService);
  readonly showDialog = signal(false);
  readonly loginRole = signal<AccountRole>('STUDENT');
  readonly signInContext = signal('');
  readonly selectedBook = signal<BookSummary | null>(null);
  readonly featuredBooks = signal<BookSummary[]>([]);
  readonly featuredLoading = signal(true);
  readonly featuredError = signal('');
  readonly brokenCovers = signal(new Set<string>());
  query = '';

  constructor() { this.loadFeatured(); }

  loadFeatured(): void {
    this.featuredLoading.set(true);
    this.featuredError.set('');
    this.catalogue.search({}, 0).subscribe({
      next: page => { this.featuredBooks.set(page.content.slice(0, 4)); this.featuredLoading.set(false); },
      error: () => { this.featuredError.set('The featured catalogue could not be loaded.'); this.featuredLoading.set(false); },
    });
  }

  markCoverBroken(id: string): void { this.brokenCovers.update(covers => new Set(covers).add(id)); }
  hasAccount(): boolean { return this.auth.profile() !== null; }
  openSignIn(role: AccountRole = 'STUDENT'): void { this.loginRole.set(role); this.showDialog.set(true); }
  dismissSignIn(): void { this.showDialog.set(false); this.signInContext.set(''); }
  searchBooks(): void { void this.router.navigate(['/books'], { queryParams: this.query.trim() ? { q: this.query.trim() } : {} }); }

  holdBook(book: BookSummary): void {
    this.selectedBook.set(book);
    if (!this.auth.profile()) {
      this.loginRole.set('STUDENT');
      this.signInContext.set(`You selected “${book.title}”. No request has been sent. After sign-in, review eligibility and submit the request yourself.`);
      this.showDialog.set(true);
      return;
    }
    void this.router.navigate(['/books', book.id]);
  }

  onAuthenticated(profile: UserProfile): void {
    this.showDialog.set(false);
    const selected = this.selectedBook();
    if (selected) {
      this.selectedBook.set(null);
      this.signInContext.set('');
      void this.router.navigate(['/books', selected.id]);
    } else if (profile.role === 'LIBRARIAN' || profile.role === 'STUDENT' || profile.role === 'FACULTY') {
      void this.router.navigateByUrl('/workspace');
    }
  }
}




