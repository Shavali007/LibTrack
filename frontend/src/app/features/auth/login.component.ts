import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <main class="login-page">
      <section class="login-panel" aria-labelledby="login-title">
        <p class="eyebrow">UNIVERSITY LIBRARY</p>
        <h1 id="login-title">Sign in to LibTrack</h1>
        <p class="intro">Use your institution-provisioned account to continue.</p>

        @if (error()) {
          <p class="form-error" role="alert">{{ error() }}</p>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label for="email">Institutional email</label>
          <input id="email" type="email" formControlName="email" autocomplete="username"
                 inputmode="email" required [attr.aria-invalid]="emailInvalid">
          @if (emailInvalid) {
            <span class="field-error">Enter a valid email address.</span>
          }

          <label for="password">Password</label>
          <input id="password" type="password" formControlName="password"
                 autocomplete="current-password" required [attr.aria-invalid]="passwordInvalid">
          @if (passwordInvalid) {
            <span class="field-error">Enter your password.</span>
          }

          <button type="submit" [disabled]="form.invalid || pending()">
            {{ pending() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
        <p class="provisioning-note">Accounts are provisioned through the institution.</p>
      </section>
    </main>
  `,
  styles: [`
    :host { display: block; }
    .login-page { min-height: calc(100vh - 5rem); display: grid; place-items: center; padding: 2rem 1rem; }
    .login-panel { width: min(100%, 28rem); padding: clamp(1.5rem, 5vw, 2.5rem); border: 1px solid var(--line-200); background: var(--paper-0); }
    .eyebrow { color: var(--sage-500); font-size: .75rem; font-weight: 700; letter-spacing: .12em; }
    h1 { margin: 1rem 0 .75rem; color: var(--forest-900); font: 500 2rem/1.2 Georgia, serif; }
    .intro, .provisioning-note { color: var(--charcoal-600); line-height: 1.5; }
    form { display: grid; gap: .625rem; margin-top: 1.75rem; }
    label { margin-top: .625rem; font-size: .9rem; font-weight: 600; }
    input { min-height: 2.8rem; padding: .625rem .75rem; border: 1px solid var(--line-200); border-radius: 4px; color: var(--charcoal-900); background: var(--paper-0); font: inherit; }
    input[aria-invalid="true"] { border-color: var(--danger-700); }
    .field-error, .form-error { color: var(--danger-700); font-size: .875rem; }
    .form-error { padding: .75rem; border-left: 3px solid var(--danger-700); background: #fbefed; }
    button { min-height: 2.8rem; margin-top: .75rem; border: 0; border-radius: 4px; padding: .625rem 1rem; color: white; background: var(--forest-900); font: inherit; font-weight: 600; cursor: pointer; }
    button:disabled { cursor: not-allowed; opacity: .55; }
    .provisioning-note { margin: 1.5rem 0 0; font-size: .85rem; }
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
    this.auth.login(this.form.getRawValue()).pipe(
      finalize(() => this.pending.set(false)),
    ).subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: () => this.error.set('Sign-in failed. Check your credentials or contact the library for account help.'),
    });
  }
}
