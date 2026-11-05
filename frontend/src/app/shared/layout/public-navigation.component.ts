import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../features/auth/auth.service';

export type PublicNavigationPage = 'home' | 'books';

@Component({
  selector: 'app-public-navigation',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="landing-header">
      <a class="brand" routerLink="/" aria-label="LibTrack home">
        <span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 6.5C9.7 4.8 6.8 4.2 3 4.5v14c3.8-.3 6.7.3 9 2 2.3-1.7 5.2-2.3 9-2v-14c-3.8-.3-6.7-.3-9 2Zm0 0v14"/></svg></span>
        <span class="brand-copy"><strong>LibTrack</strong><small>ACADEMIC LIBRARY</small></span>
      </a>
      <nav aria-label="Main navigation">
        <a routerLink="/" [class.active]="activePage === 'home'" [attr.aria-current]="activePage === 'home' ? 'page' : null">Home</a>
        <a routerLink="/books" [class.active]="activePage === 'books'" [attr.aria-current]="activePage === 'books' ? 'page' : null">Explore books</a>
        <a href="/#about" (click)="navigateAbout($event)">About</a>
        @if (auth.profile()) {
          <a class="button button-primary nav-action" routerLink="/workspace">Open workspace</a>
        } @else {
          <button class="button button-primary nav-action" type="button" (click)="signInRequested.emit()"><span aria-hidden="true">↪</span> Sign in</button>
        }
      </nav>
    </header>
  `,
  styles: [`
    :host{display:block;position:sticky;top:0;z-index:50;width:100%;background:rgb(251 249 246 / 96%);backdrop-filter:blur(12px);border-bottom:1px solid var(--color-line-200);box-sizing:border-box}
    .landing-header{display:flex;width:100%;max-width:102rem;min-height:5rem;align-items:center;justify-content:space-between;gap:1.5rem;margin:0 auto;padding:0 clamp(1rem,1.2vw,1.25rem);box-sizing:border-box}
    .brand{display:flex;align-items:center;gap:.75rem;color:var(--color-forest-950);text-decoration:none}.brand-mark{display:grid;width:2.9rem;height:2.9rem;place-items:center;border-radius:.8rem;color:#a8e8cf;background:var(--color-forest-900)}.brand-mark svg{width:1.45rem;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.brand-copy{display:grid;gap:.16rem}.brand strong{font:600 1.55rem/1 var(--font-serif);letter-spacing:-.025em}.brand small{color:var(--color-forest-800);font-size:.62rem;font-weight:700;letter-spacing:.14em}
    nav{display:flex;align-items:center;gap:clamp(1rem,2.2vw,2.3rem)}nav>a:not(.button){color:var(--color-charcoal-700);font-size:.9rem;text-decoration:none}nav>a:not(.button):hover{color:var(--color-forest-900);text-decoration:underline;text-underline-offset:.28rem}nav>a.active{color:var(--color-forest-900)!important;font-weight:700!important;text-decoration:underline!important;text-decoration-thickness:2px!important;text-underline-offset:.55rem!important}.nav-action{display:inline-flex;min-height:2.85rem;align-items:center;gap:.55rem;padding-inline:1.2rem;border-radius:.8rem;text-decoration:none}
    @media(max-width:680px){.landing-header{min-height:4.4rem;flex-wrap:wrap;padding-top:.6rem}.landing-header nav{width:100%;flex-wrap:wrap;justify-content:space-between;gap:.5rem;padding-bottom:.6rem}.brand-mark{width:2.5rem;height:2.5rem}.brand strong{font-size:1.35rem}}
    @media(max-width:460px){.landing-header nav{gap:.45rem}.landing-header nav>a:not(.button){font-size:.78rem}.nav-action{min-height:2.55rem;padding-inline:.85rem;font-size:.82rem}.brand{gap:.5rem}.brand-mark{width:2.2rem;height:2.2rem}.brand strong{font-size:1.2rem}.brand small{font-size:.52rem}}
  `],
})
export class PublicNavigationComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  @Input() activePage: PublicNavigationPage = 'home';
  @Output() readonly signInRequested = new EventEmitter<void>();

  navigateAbout(event: MouseEvent): void {
    event.preventDefault();
    void this.router.navigate(['/'], { fragment: 'about' }).then(() => {
      requestAnimationFrame(() => document.getElementById('about')?.scrollIntoView());
    });
  }
}
