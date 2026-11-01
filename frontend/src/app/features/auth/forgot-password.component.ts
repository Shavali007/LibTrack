import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="forgot-page">
      <header class="brand-wrap">
        <a class="brand" routerLink="/" aria-label="Return to LibTrack home">
          <span aria-hidden="true">▤</span>LibTrack
        </a>
      </header>

      <section class="forgot-card" aria-labelledby="forgot-title">
        <div class="card-header">
          <div class="icon-circle" aria-hidden="true">
            <svg viewBox="0 0 24 24" class="key-icon">
              <path d="M21 2l-2 2m-2-2l2 2m-2 2l2-2m-7 5a5 5 0 11-7.07 7.07 5 5 0 017.07-7.07zm0 0l7 7v3h-3v-2h-2v-2l-2-2"
                    fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h1 id="forgot-title">Forgot Password</h1>
          <p class="subtitle">
            Enter your institutional email address and we'll send you instructions to reset your password.
          </p>
        </div>

        @if (submitted()) {
          <div class="success-box" role="status">
            <div class="success-icon" aria-hidden="true">✓</div>
            <h2>Check your email</h2>
            <p>{{ successMessage() }}</p>
            <p class="note">Password reset links expire in 15 minutes. Remember to check your spam or junk folder if the email doesn't arrive shortly.</p>
          </div>

          <div class="actions">
            <a class="button button-primary button-block" routerLink="/login">Back to Sign in</a>
            <button type="button" class="link-button" (click)="resetForm()">Send another reset link</button>
          </div>
        } @else {
          @if (error()) {
            <div class="alert alert-error" role="alert">{{ error() }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="field">
              <label for="forgot-email">Institutional Email <span aria-hidden="true">*</span></label>
              <input
                id="forgot-email"
                type="email"
                formControlName="email"
                autocomplete="username"
                inputmode="email"
                placeholder="e.g. yourname@vitapstudent.ac.in"
                required
                [attr.aria-invalid]="emailInvalid"
                [attr.aria-describedby]="emailInvalid ? 'email-error' : null"
              />
              @if (emailInvalid) {
                <p class="field-error" id="email-error">Enter a valid email address.</p>
              }
            </div>

            <button
              class="button button-primary button-block"
              type="submit"
              [disabled]="form.invalid || pending()"
            >
              @if (pending()) {
                Sending Reset Link…
              } @else {
                Send Reset Link
              }
            </button>
          </form>

          <footer class="card-footer">
            <a routerLink="/login" class="back-link">
              <span aria-hidden="true">←</span> Back to Sign in
            </a>
          </footer>
        }
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
    .forgot-page {
      display: grid;
      min-height: 100vh;
      align-content: center;
      justify-items: center;
      gap: 1.25rem;
      padding: 2rem 1rem;
      background: var(--color-ivory-50, #FAF9F6);
      box-sizing: border-box;
    }
    .brand-wrap {
      display: flex;
      justify-content: center;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--color-forest-950, #002B22);
      font: 600 1.55rem var(--font-serif, serif);
      text-decoration: none;
    }
    .brand span {
      display: grid;
      width: 2.4rem;
      height: 2.4rem;
      place-items: center;
      border-radius: 6px;
      color: #fff;
      background: #003D30;
      font-size: 1.15rem;
    }
    .forgot-card {
      width: min(100%, 28.5rem);
      padding: 2.25rem 2rem;
      border: 1px solid var(--color-line-200, #E5E8E2);
      border-radius: 1.55rem;
      background: #fff;
      box-shadow: 0 22px 68px rgba(17, 38, 29, 0.12);
      box-sizing: border-box;
    }
    .card-header {
      text-align: center;
      margin-bottom: 1.75rem;
    }
    .icon-circle {
      display: inline-grid;
      width: 3.25rem;
      height: 3.25rem;
      place-items: center;
      border-radius: 50%;
      background: #EAF2EF;
      color: #003D30;
      margin-bottom: 0.85rem;
    }
    .key-icon {
      width: 1.6rem;
      height: 1.6rem;
    }
    .card-header h1 {
      margin: 0 0 0.45rem;
      font: 600 1.6rem var(--font-serif, serif);
      color: #003D30;
    }
    .subtitle {
      margin: 0;
      color: var(--color-charcoal-700, #4B5552);
      font-size: 0.88rem;
      line-height: 1.45;
    }
    form {
      display: grid;
      gap: 1.25rem;
    }
    .field {
      display: grid;
      gap: 0.5rem;
    }
    .field label {
      color: #35445A;
      font-size: 0.88rem;
      font-weight: 600;
    }
    input {
      width: 100%;
      min-height: 3rem;
      padding: 0.65rem 0.95rem;
      border: 1px solid #E5E8E2;
      border-radius: 0.85rem;
      color: #293448;
      background: #fff;
      font-size: 0.94rem;
      box-sizing: border-box;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    input:focus {
      outline: none;
      border-color: #003D30;
      box-shadow: 0 0 0 3px rgba(0, 61, 48, 0.15);
    }
    input[aria-invalid="true"] {
      border-color: #A73C32;
    }
    .field-error {
      margin: -0.2rem 0 0;
      color: #8F3029;
      font-size: 0.78rem;
    }
    .button-block {
      width: 100%;
      min-height: 3.15rem;
      border-radius: 0.82rem;
      font-size: 0.94rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
    }
    .button-primary {
      background: #003D30;
      color: #fff;
      border: none;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .button-primary:hover:not(:disabled) {
      background: #002B22;
    }
    .button-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .card-footer {
      margin-top: 1.5rem;
      text-align: center;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: #003D30;
      font-size: 0.85rem;
      font-weight: 600;
      text-decoration: none;
    }
    .back-link:hover {
      text-decoration: underline;
    }
    .alert {
      padding: 0.85rem 1rem;
      border-radius: 0.85rem;
      font-size: 0.88rem;
      margin-bottom: 1rem;
    }
    .alert-error {
      background: #FDF0EE;
      color: #9B1C1C;
      border: 1px solid #F8D7D2;
    }
    .success-box {
      text-align: center;
      padding: 1rem 0;
    }
    .success-icon {
      display: inline-grid;
      width: 3rem;
      height: 3rem;
      place-items: center;
      border-radius: 50%;
      background: #EAF2EF;
      color: #003D30;
      font-size: 1.4rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
    }
    .success-box h2 {
      margin: 0 0 0.5rem;
      font-size: 1.25rem;
      color: #003D30;
    }
    .success-box p {
      margin: 0 0 0.75rem;
      color: #35445A;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .success-box .note {
      font-size: 0.8rem;
      color: #69746F;
      font-style: italic;
    }
    .actions {
      display: grid;
      gap: 0.75rem;
      margin-top: 1.25rem;
      text-align: center;
    }
    .link-button {
      background: transparent;
      border: none;
      color: #003D30;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: underline;
    }
  `],
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly pending = signal(false);
  readonly submitted = signal(false);
  readonly error = signal('');
  readonly successMessage = signal('');

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
  });

  get emailInvalid(): boolean {
    const c = this.form.controls.email;
    return c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    if (this.form.invalid || this.pending()) return;

    this.pending.set(true);
    this.error.set('');

    const email = this.form.controls.email.value!.trim();

    this.auth
      .forgotPassword(email)
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe({
        next: (res) => {
          this.submitted.set(true);
          this.successMessage.set(
            res?.message || 'If an account with that email exists, password reset instructions have been sent.'
          );
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse) {
            if (err.status === 400) {
              this.error.set(err.error?.message || 'Please provide a valid institutional email address.');
            } else if (err.error?.message && typeof err.error.message === 'string') {
              this.error.set(err.error.message);
            } else if (err.status === 0) {
              this.error.set('Could not connect to the server. Please check your connection and try again.');
            } else {
              this.error.set('Could not send reset link right now. Please check your connection and try again.');
            }
          } else {
            this.error.set('Could not send reset link right now. Please check your connection and try again.');
          }
        },
      });
  }

  resetForm(): void {
    this.submitted.set(false);
    this.error.set('');
    this.form.reset();
  }
}
