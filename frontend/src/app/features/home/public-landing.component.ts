import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AccountRole, AuthService, UserProfile } from '../auth/auth.service';
import { SignInDialogComponent } from '../auth/sign-in-dialog.component';
import { BookSummary, CatalogueService, TrendingBook } from '../catalogue/catalogue.service';
import { PublicNavigationComponent } from '../../shared/layout/public-navigation.component';

@Component({
  selector: 'app-public-landing',
  standalone: true,
  imports: [FormsModule, RouterLink, SignInDialogComponent, PublicNavigationComponent],
  template: `
    <app-public-navigation activePage="home" (signInRequested)="openSignIn()" />
    <main class="landing-page" id="home">

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
          <div><p class="eyebrow">LIBRARY COLLECTION</p><h2 id="featured-title">Trending Books</h2><p class="section-subtitle">Popular titles based on recent borrowing and reservation activity.</p></div>
          <a class="browse-link" [routerLink]="'/books'" [queryParams]="{ sort: 'trending' }">View All Trending Books <span aria-hidden="true">→</span></a>
        </div>
        @if (trendingLoading()) { <div class="loading-state" role="status">Loading trending books…</div> }
        @else if (trendingError()) { <div class="alert alert-error" role="alert">{{ trendingError() }} <button class="text-button" type="button" (click)="loadTrending()">Try again</button></div> }
        @else if (trendingBooks().length) {
          <div class="featured-grid">
            @for (book of trendingBooks(); track book.id) {
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

      <section class="about" id="about" aria-labelledby="about-heading">
        <div class="about-intro">
          <div class="about-eyebrow">ABOUT LIBTRACK</div>
          <h2 class="about-heading" id="about-heading">
            A Smarter Library<br>
            Experience for<br>
            <span class="highlight-text">Our Campus</span>
          </h2>
          <p class="about-description">
            LibTrack is a library management platform that helps students, faculty, and librarians discover books, manage borrowing, and keep library services organized in a simple and efficient way.
          </p>
          <a class="about-cta-btn" routerLink="/books">
            Explore Our Collection <span class="cta-arrow" aria-hidden="true">→</span>
          </a>
        </div>

        <div class="about-cards-wrap">
          <!-- Card 1: Wide Card on Top -->
          <article class="about-card card-wide">
            <div class="card-icon-box" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-icon-svg">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <div class="card-divider" aria-hidden="true"></div>
            <div class="card-body">
              <h3 class="card-title">Find Books Easily</h3>
              <p class="card-desc">Search and explore the library catalogue.</p>
            </div>
          </article>

          <!-- Cards Bottom Row: Two equally sized cards -->
          <div class="cards-bottom-row">
            <!-- Card 2: Borrow with Ease -->
            <article class="about-card card-vertical">
              <div class="card-icon-box" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-icon-svg">
                  <rect x="4" y="4" width="16" height="6" rx="2"></rect>
                  <rect x="4" y="14" width="16" height="6" rx="2"></rect>
                  <line x1="8" y1="7" x2="10" y2="7"></line>
                  <line x1="8" y1="17" x2="10" y2="17"></line>
                </svg>
              </div>
              <div class="card-body">
                <h3 class="card-title">Borrow with Ease</h3>
                <p class="card-desc">Request and track your book loans.</p>
              </div>
            </article>

            <!-- Card 3: Manage Efficiently -->
            <article class="about-card card-vertical">
              <div class="card-icon-box" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-icon-svg">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div class="card-body">
                <h3 class="card-title">Manage Efficiently</h3>
                <p class="card-desc">Help librarians handle books, members, and circulation smoothly.</p>
              </div>
            </article>
          </div>
        </div>
      </section>
      <footer class="landing-footer"><a class="footer-brand" routerLink="/" aria-label="LibTrack home"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5C9.7 4.8 6.8 4.2 3 4.5v14c3.8-.3 6.7.3 9 2 2.3-1.7 5.2-2.3 9-2v-14c-3.8-.3-6.7-.3-9 2Zm0 0v14"/></svg><strong>LibTrack LMS</strong></a><span>© 2026 LibTrack Academic Library Systems. All rights reserved.</span></footer>
      @if (showDialog()) { <app-sign-in-dialog [initialRole]="loginRole()" [contextMessage]="signInContext()" (dismissed)="dismissSignIn()" (authenticated)="onAuthenticated($event)" /> }
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100vh;overflow-x:clip;background:var(--color-ivory-50)}
    .landing-page{width:min(100%,102rem);min-height:calc(100vh - 5rem);margin:0 auto;padding:0 clamp(1rem,1.2vw,1.25rem);background:var(--color-ivory-50);box-sizing:border-box}
    .footer-brand svg{width:1.45rem;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    .hero{display:flex;min-height:40rem;align-items:center;flex-direction:column;justify-content:center;padding:3.6rem 0 4.3rem;text-align:center}.eyebrow{margin:0;color:var(--color-forest-800);font-size:.7rem;font-weight:700;letter-spacing:.12em;line-height:1.45;text-transform:uppercase}.hero>.eyebrow{margin-bottom:2rem;padding:.53rem .95rem;border:1px solid var(--color-line-200);border-radius:var(--radius-pill);background:var(--color-ivory-100);font-size:.68rem;letter-spacing:.09em}.hero h1{max-width:62rem;margin:0 auto 1.35rem;color:#101729;font:500 clamp(3.2rem,5.2vw,4.65rem)/1.06 var(--font-serif);letter-spacing:-.045em}.hero h1 em{color:var(--color-forest-900);font-weight:400}.hero-description{max-width:58rem;margin:0 auto 2rem;color:var(--color-charcoal-700);font-size:clamp(1.08rem,1.6vw,1.28rem);line-height:1.55}.hero-search{display:flex;width:min(100%,41rem);min-height:4.2rem;align-items:center;gap:.7rem;margin:0 auto;padding:.42rem .48rem .42rem 1rem;border:1px solid var(--color-line-200);border-radius:1rem;background:#fff;box-shadow:0 9px 25px rgb(31 48 39 / 7%)}.search-icon{width:1.35rem;height:1.35rem;flex:0 0 auto;fill:none;stroke:#889bb4;stroke-width:1.8;stroke-linecap:round}.hero-search input{min-width:0;flex:1;border:0!important;outline:0!important;box-shadow:none!important;text-align:left;font-size:1rem}.hero-search input:focus-visible{outline:2px solid var(--color-forest-700)!important;outline-offset:1px;border-radius:.25rem}.hero-search button{min-height:3.2rem;flex:0 0 auto;gap:.7rem;padding-inline:1.35rem;border-radius:.8rem}
    .featured{padding:2.7rem 0 3.25rem;border-top:1px solid var(--color-line-200)}.section-heading{display:flex;align-items:end;justify-content:space-between;gap:2rem;margin-bottom:1.9rem}.section-heading .eyebrow{margin-bottom:.4rem}.section-heading h2{margin:0;color:#101729;font:500 clamp(2rem,3vw,2.5rem)/1.12 var(--font-serif);letter-spacing:-.025em}.section-subtitle{max-width:38rem;margin:.5rem 0 0;color:var(--color-charcoal-600);font-size:.88rem;line-height:1.45}.browse-link{padding:.4rem 0;color:var(--color-forest-900);font-size:.95rem;font-weight:700;text-decoration:none;white-space:nowrap}.browse-link:hover{text-decoration:underline;text-underline-offset:.25rem}
    .featured-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));align-items:stretch;gap:1.5rem}.featured-book{display:flex;min-width:0;align-items:stretch;gap:.85rem;overflow:hidden;padding:.8rem;border:1px solid var(--color-line-200);border-radius:1.1rem;background:#fff;box-shadow:0 1px 3px rgb(20 40 30 / 5%)}.featured-cover{display:grid;min-width:0;min-height:11.5rem;flex:0 0 clamp(5.5rem,34%,9rem);place-items:center;overflow:hidden;margin:0;border-radius:.75rem;background:#f0efe7;text-decoration:none}.featured-cover img{width:100%;height:100%;object-fit:contain}.cover-fallback{display:flex;width:100%;height:100%;flex-direction:column;justify-content:space-between;padding:.8rem;border-left:4px solid var(--color-sage-500);color:#fff;background:var(--color-forest-950);text-align:left}.cover-fallback small,.cover-fallback span{font-size:.58rem;letter-spacing:.06em}.cover-fallback strong{max-width:15rem;font:600 1.1rem/1.2 var(--font-serif)}.featured-book-copy{display:flex;min-width:0;flex:1;flex-direction:column;align-items:flex-start;gap:.38rem;padding:.15rem 0}.book-category{max-width:100%;margin:0 0 .15rem;color:var(--color-forest-800);font-size:.65rem;font-weight:750;letter-spacing:.07em;text-transform:uppercase}.featured-book-copy h3{max-width:100%;margin:0;color:#101729;font:600 1.05rem/1.28 var(--font-sans);overflow-wrap:anywhere}.featured-book-copy h3 a{color:inherit;text-decoration:none}.featured-book-copy h3 a:hover{text-decoration:underline;text-underline-offset:.18rem}.book-author{max-width:100%;overflow:hidden;margin:0;color:var(--color-charcoal-600);font-size:.88rem;text-overflow:ellipsis;white-space:nowrap}.featured-book-copy .status-badge{max-width:100%;align-self:flex-start;margin:.15rem 0 .35rem;font-size:.72rem;white-space:normal}.reserve-button{display:flex;width:100%;min-height:2.65rem;align-items:center;justify-content:center;gap:.45rem;margin-top:auto;padding:.4rem .5rem;border-radius:.7rem;font-size:.82rem;line-height:1.2}.reserve-button svg{width:1.05rem;height:1.05rem;flex:0 0 auto;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.reserve-button:disabled{opacity:.55;cursor:not-allowed}
    /* About LibTrack Section */
    .about{display:grid;grid-template-columns:45fr 55fr;gap:clamp(2.5rem,5vw,5rem);align-items:center;padding:5rem 0 5.6rem;border-top:1px solid var(--color-line-200)}.about-intro{display:flex;flex-direction:column;align-items:flex-start}.about-eyebrow{display:inline-flex;align-items:center;gap:.65rem;margin-bottom:1.35rem;color:var(--color-forest-900);font-size:.76rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase}.about-eyebrow::before{content:"";display:inline-block;width:1.75rem;height:2px;background:var(--color-forest-900);border-radius:1px}.about-heading{margin:0 0 1.35rem 0;color:#101729;font:500 clamp(2.35rem,3.8vw,3.35rem)/1.15 var(--font-serif);letter-spacing:-.03em}.about-heading .highlight-text{color:var(--color-forest-900);font-weight:600}.about-description{max-width:31rem;margin:0 0 2.2rem 0;color:var(--color-charcoal-700);font-size:clamp(.98rem,1.2vw,1.08rem);line-height:1.62}.about-cta-btn{display:inline-flex;align-items:center;gap:.6rem;min-height:3.1rem;padding:.75rem 1.6rem;border-radius:.65rem;background:var(--color-forest-900);color:#fff;font-family:var(--font-sans);font-size:.92rem;font-weight:600;text-decoration:none;box-shadow:0 2px 6px rgb(0 61 48 / 14%);transition:background-color .15s ease,box-shadow .15s ease,transform .15s ease}.about-cta-btn:hover{background:var(--color-forest-950);box-shadow:0 4px 14px rgb(0 61 48 / 22%);transform:translateY(-1px)}.about-cta-btn:focus-visible{outline:2px solid var(--color-forest-900);outline-offset:2px}.cta-arrow{transition:transform .15s ease}.about-cta-btn:hover .cta-arrow{transform:translateX(3px)}
    .about-cards-wrap{display:flex;flex-direction:column;gap:1.25rem}.about-card{background:#fff;border:1px solid var(--color-line-200);border-radius:1.25rem;padding:1.6rem 1.75rem;box-shadow:0 2px 8px rgb(20 40 30 / 3%);transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease}.about-card:hover{border-color:var(--color-sage-300);box-shadow:0 6px 18px rgb(0 61 48 / 6%);transform:translateY(-2px)}.card-icon-box{display:flex;align-items:center;justify-content:center;width:3.4rem;height:3.4rem;border-radius:.95rem;background:#eaf2ef;color:var(--color-forest-900);flex-shrink:0}.card-icon-svg{width:1.6rem;height:1.6rem}.card-wide{display:flex;align-items:center;gap:1.5rem}.card-divider{width:1px;height:2.75rem;background:var(--color-line-200);flex-shrink:0}.cards-bottom-row{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem}.card-vertical{display:flex;flex-direction:column;align-items:flex-start;gap:1.25rem}.card-body{min-width:0}.card-title{margin:0 0 .4rem 0;color:#101729;font-family:var(--font-sans);font-size:1.15rem;font-weight:700;line-height:1.25}.card-desc{margin:0;color:var(--color-charcoal-600);font-family:var(--font-sans);font-size:.9rem;line-height:1.45}
    .landing-footer{position:relative;left:50%;display:flex;width:100vw;min-height:5.6rem;align-items:center;justify-content:space-between;gap:1rem;margin-left:-50vw;padding:1rem max(1rem,calc((100vw - 102rem)/2 + clamp(1rem,1.2vw,1.25rem)));color:#d4dded;background:#101729;font-size:.77rem}.footer-brand{display:flex;align-items:center;gap:.6rem;color:#fff;text-decoration:none}.footer-brand svg{color:#52d9ad}.footer-brand strong{font:600 1rem var(--font-serif)}
    .text-button{padding:0;border:0;color:var(--color-forest-900);background:transparent;font-weight:700;text-decoration:underline;text-underline-offset:.15rem;cursor:pointer}.visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    @media(max-width:1100px){.featured-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:1.1rem}.hero{min-height:29rem}}
    @media(max-width:980px){.about{grid-template-columns:1fr;gap:2.8rem;padding:3.8rem 0 4.2rem}.about-description{max-width:100%}}
    @media(max-width:680px){.hero{min-height:0;padding:4.8rem 0 4.5rem}.hero>.eyebrow{margin-bottom:1.45rem}.hero h1{font-size:clamp(2.8rem,10vw,4rem)}.hero-description{max-width:36rem;font-size:1.02rem}.section-heading{align-items:flex-start;flex-direction:column;gap:.7rem;margin-bottom:1.25rem}.featured{padding:2rem 0 2.3rem}.landing-footer{align-items:flex-start;flex-direction:column;justify-content:center;min-height:5.5rem;gap:.55rem}}
    @media(max-width:580px){.card-wide{flex-direction:column;align-items:flex-start;gap:1rem}.card-divider{display:none}.cards-bottom-row{grid-template-columns:1fr;gap:1rem}.about-card{padding:1.35rem}.about-heading{font-size:2.15rem}}
    @media(max-width:460px){.landing-page{padding-inline:1rem}.hero{padding:4rem 0}.hero>.eyebrow{font-size:.58rem;letter-spacing:.04em}.hero h1{font-size:2.7rem}.hero-search{align-items:stretch;flex-wrap:wrap;gap:.35rem .55rem;padding:.55rem}.hero-search input{flex-basis:calc(100% - 2rem);min-height:2.7rem}.hero-search button{width:100%;min-height:2.9rem}.featured-grid{grid-template-columns:1fr;gap:.85rem}.featured-book{gap:.65rem;padding:.65rem}.featured-cover{min-height:10.5rem;flex-basis:6.25rem}.featured-book-copy{gap:.32rem}.reserve-button{font-size:.78rem}}
    @media(max-width:350px){.featured-cover{min-height:9.5rem;flex-basis:5.25rem}.featured-book-copy h3{font-size:.98rem}.featured-book-copy .status-badge{font-size:.66rem}.reserve-button{min-height:2.5rem;padding-inline:.35rem;font-size:.72rem}}
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
  readonly trendingBooks = signal<TrendingBook[]>([]);
  readonly trendingLoading = signal(true);
  readonly trendingError = signal('');
  readonly brokenCovers = signal(new Set<string>());
  query = '';

  constructor() { this.loadTrending(); }

  loadTrending(): void {
    this.trendingLoading.set(true);
    this.trendingError.set('');
    this.catalogue.trending({}, 0, 4).subscribe({
      next: page => { this.trendingBooks.set(page.content); this.trendingLoading.set(false); },
      error: () => { this.trendingError.set('Trending books could not be loaded.'); this.trendingLoading.set(false); },
    });
  }

  markCoverBroken(id: string): void { this.brokenCovers.update(covers => new Set(covers).add(id)); }
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
