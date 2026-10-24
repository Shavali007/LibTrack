import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="auth-page">
      <header class="auth-header">
        <a class="auth-brand" routerLink="/login" aria-label="LibTrack sign in">
          <span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 28 28" focusable="false"><path d="M4.5 6.5c3.6-.9 6.8-.3 9.5 1.8v14c-2.7-2.1-5.9-2.7-9.5-1.8zM23.5 6.5c-3.6-.9-6.8-.3-9.5 1.8v14c2.7-2.1 5.9-2.7 9.5-1.8z"/><path d="M14 8.3v14"/></svg></span>
          <span>LibTrack</span>
        </a>
        <span class="header-caption">UNIVERSITY LIBRARY</span>
      </header>

      <div class="auth-layout">
        <section class="auth-editorial" aria-labelledby="welcome-title">
          <p class="eyebrow">A considered way to connect with your library</p>
          <h1 id="welcome-title">A quieter space<br>for curious minds.</h1>
          <p>Find your place in the library. Sign in with the account provisioned for your institution.</p>
          <div class="editorial-rule" aria-hidden="true"></div>
          <p class="editorial-note">LIBRARY SERVICES · DIGITAL ACCESS</p>
        </section>

        <section class="login-panel surface-card" aria-labelledby="login-title">
          <p class="eyebrow">WELCOME BACK</p>
          <h2 id="login-title">Sign in to LibTrack</h2>
          <p class="login-intro">Enter your institutional account details to continue.</p>

          @if (error()) {
            <p class="alert alert-error" role="alert">{{ error() }}</p>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="field">
              <label for="email">Institutional email <span class="required-mark" aria-hidden="true">*</span></label>
              <input id="email" type="email" formControlName="email" autocomplete="username"
                     inputmode="email" required aria-required="true" [attr.aria-invalid]="emailInvalid"
                     [attr.aria-describedby]="emailInvalid ? 'email-error' : null">
              @if (emailInvalid) { <p class="field-error" id="email-error">Enter a valid institutional email address.</p> }
            </div>

            <div class="field">
              <label for="password">Password <span class="required-mark" aria-hidden="true">*</span></label>
              <input id="password" type="password" formControlName="password" autocomplete="current-password"
                     required aria-required="true" [attr.aria-invalid]="passwordInvalid"
                     [attr.aria-describedby]="passwordInvalid ? 'password-error' : null">
              @if (passwordInvalid) { <p class="field-error" id="password-error">Enter your password.</p> }
            </div>

            <button class="button button-primary button-block submit-button" type="submit" [disabled]="form.invalid || pending()">
              {{ pending() ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>
          <p class="provisioning-note">Accounts are provisioned by your library. For access help, contact library staff.</p>
        </section>
      </div>
      <footer class="auth-footer"><span>LibTrack</span><span>Academic library services</span></footer>
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }
    .auth-page { display: flex; min-height: 100vh; flex-direction: column; padding: 0 clamp(1rem, 6vw, 5.5rem); background: var(--color-ivory-50); }
    .auth-header { display: flex; min-height: 5rem; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--color-line-200); }
    .auth-brand { display: inline-flex; align-items: center; gap: .65rem; color: var(--color-forest-950); font: 600 1.45rem/1 var(--font-serif); text-decoration: none; }
    .brand-mark { display: grid; width: 2.35rem; height: 2.35rem; place-items: center; border-radius: 5px; color: white; background: var(--color-forest-900); }
    .brand-mark svg { width: 1.45rem; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.5; }
    .header-caption { color: var(--color-charcoal-600); font-size: .68rem; font-weight: 700; letter-spacing: .13em; }
    .auth-layout { display: grid; width: min(100%, 68rem); flex: 1; grid-template-columns: minmax(0, 1.05fr) minmax(20rem, .8fr); align-items: center; gap: clamp(2rem, 7vw, 6rem); margin: 0 auto; padding: clamp(2rem, 7vh, 5.5rem) 0; }
    .auth-editorial { max-width: 34rem; padding: clamp(2rem, 5vw, 4rem); border-left: 4px solid var(--color-forest-700); background: #f1f1e9; }
    .auth-editorial .eyebrow { max-width: 20rem; color: var(--color-sage-700); }
    .auth-editorial h1 { margin: 1.2rem 0; color: var(--color-forest-950); font-size: clamp(2.4rem, 5.5vw, 4rem); }
    .auth-editorial > p:not(.eyebrow):not(.editorial-note) { max-width: 25rem; margin-bottom: 0; color: var(--color-charcoal-700); font-size: var(--text-lg); }
    .editorial-rule { width: 3rem; height: 1px; margin: 2rem 0 1rem; background: var(--color-sage-500); }
    .editorial-note { margin: 0; color: var(--color-charcoal-600); font-size: .65rem; font-weight: 700; letter-spacing: .12em; }
    .login-panel { width: 100%; padding: clamp(1.5rem, 4vw, 2.5rem); box-shadow: var(--shadow-panel); }
    .login-panel h2 { margin-bottom: .5rem; font-size: 1.75rem; }
    .login-intro { margin-bottom: 1.5rem; color: var(--color-charcoal-600); font-size: var(--text-sm); }
    .login-panel .alert { margin-bottom: 1rem; }
    .login-panel form { display: grid; gap: 1.15rem; }
    .submit-button { margin-top: .4rem; }
    .provisioning-note { margin: 1.25rem 0 0; color: var(--color-charcoal-600); font-size: .8rem; }
    .auth-footer { display: flex; min-height: 3.5rem; align-items: center; justify-content: space-between; border-top: 1px solid var(--color-line-200); color: var(--color-charcoal-600); font-size: .72rem; }
    @media (max-width: 760px) {
      .auth-page { padding-inline: 1rem; }
      .auth-layout { max-width: 30rem; grid-template-columns: 1fr; gap: 1.25rem; padding-block: 1.5rem 2rem; }
      .auth-editorial { padding: 1.25rem 1.5rem; }
      .auth-editorial h1 { margin: .65rem 0; font-size: 2rem; }
      .auth-editorial > p:not(.eyebrow):not(.editorial-note) { font-size: .9rem; }
      .editorial-rule, .editorial-note { display: none; }
      .login-panel { padding: 1.5rem; }
    }
    @media (max-width: 420px) { .header-caption { font-size: .58rem; } }
  `],
})
export class LoginComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly pending = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.maxLength(1024)]],
  });

  get emailInvalid(): boolean {
    const control = this.form.controls.email;
    return control.invalid && control.touched;
  }

  get passwordInvalid(): boolean {
    const control = this.form.controls.password;
    return control.invalid && control.touched;
  }

  submit(): void {
    if (this.form.invalid || this.pending()) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.pending.set(true);
    this.auth.login(this.form.getRawValue()).pipe(finalize(() => this.pending.set(false))).subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: () => this.error.set('Sign-in failed. Check your credentials or contact the library for account help.'),
    });
  }
}
