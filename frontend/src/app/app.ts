import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <main class="welcome">
      <p class="eyebrow">UNIVERSITY LIBRARY</p>
      <h1>LibTrack</h1>
      <p class="intro">A considered home for the library catalogue and circulation services.</p>
      <p class="status">Planning and foundation setup</p>
    </main>
  `,
  styles: [`
    :host { display: grid; min-height: 100vh; place-items: center; padding: 2rem; }
    .welcome { width: min(100%, 42rem); padding: clamp(2rem, 7vw, 5rem); border: 1px solid var(--line-200); background: var(--paper-0); }
    .eyebrow { color: var(--sage-500); font-size: .75rem; font-weight: 700; letter-spacing: .12em; }
    h1 { margin: 1rem 0; color: var(--forest-900); font: 500 clamp(2.5rem, 7vw, 4rem)/1.1 Georgia, serif; }
    .intro { max-width: 32rem; color: var(--charcoal-600); font-size: 1.125rem; line-height: 1.6; }
    .status { margin-top: 2rem; color: var(--charcoal-600); font-size: .875rem; }
  `]
})
export class AppComponent {}
