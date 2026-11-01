import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from './auth.service';

export function resetTokenFromLocation(
  queryToken: string | null,
  routeFragment: string | null,
  href: string
): string | null {
  if (queryToken && queryToken.trim().length > 0) {
    return queryToken.trim();
  }
  const browserFragment = href ? new URL(href).hash.slice(1) : '';
  const fragment = browserFragment || routeFragment || '';
  if (fragment.startsWith('token=')) {
    return fragment.slice(6);
  }
  return fragment.length > 0 ? fragment : null;
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="reset-page">
      <header class="brand-wrap">
        <a class="brand" routerLink="/" aria-label="Return to LibTrack home">
          <span aria-hidden="true">▤</span>LibTrack
        </a>
      </header>

      <section class="reset-card" aria-labelledby="reset-title">
        <div class="card-header">
          <div class="icon-circle" aria-hidden="true">
            <svg viewBox="0 0 24 24" class="lock-icon">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h1 id="reset-title">Create New Password</h1>
          <p class="subtitle">
            Enter your new password below. Make sure it meets all security requirements.
          </p>
        </div>

        @if (missingToken()) {
          <div class="alert alert-error" role="alert">
            <strong>Invalid or Missing Token</strong>
            <p>This password reset link is invalid or incomplete. Please request a new link.</p>
          </div>
          <a class="button button-primary button-block" routerLink="/forgot-password">Request New Reset Link</a>
        } @else if (succeeded()) {
          <div class="success-box" role="status">
            <div class="success-icon" aria-hidden="true">✓</div>
            <h2>Password reset complete!</h2>
            <p>Your password has been updated successfully. You can now sign in with your new credentials.</p>
          </div>
          <a class="button button-primary button-block" routerLink="/login">Sign in with New Password</a>
        } @else {
          @if (error()) {
            <div class="alert alert-error" role="alert">{{ error() }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="field">
              <label for="new-password">New Password <span aria-hidden="true">*</span></label>
              <div class="password-control">
                <input
                  id="new-password"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="newPassword"
                  autocomplete="new-password"
                  required
                  [attr.aria-invalid]="passwordInvalid"
                  [attr.aria-describedby]="passwordInvalid ? 'password-error password-rules' : 'password-rules'"
                />
                <button
                  type="button"
                  class="password-toggle"
                  [attr.aria-pressed]="showPassword()"
                  (click)="showPassword.update(v => !v)"
                >
                  {{ showPassword() ? 'Hide' : 'Show' }}
                </button>
              </div>

              <ul class="password-rules" id="password-rules" aria-label="Password requirements">
                <li [class.met]="ruleMet('length')">At least 8 characters</li>
                <li [class.met]="ruleMet('upper')">One uppercase letter (A–Z)</li>
                <li [class.met]="ruleMet('lower')">One lowercase letter (a–z)</li>
                <li [class.met]="ruleMet('digit')">One number</li>
                <li [class.met]="ruleMet('special')">One special character</li>
                <li [class.met]="ruleMet('bytes')">No more than 72 UTF-8 bytes</li>
              </ul>
              @if (passwordInvalid) {
                <p class="field-error" id="password-error">Password must satisfy all rules above.</p>
              }
            </div>

            <div class="field">
              <label for="confirm-password">Confirm Password <span aria-hidden="true">*</span></label>
              <div class="password-control">
                <input
                  id="confirm-password"
                  [type]="showConfirmPassword() ? 'text' : 'password'"
                  formControlName="confirmPassword"
                  autocomplete="new-password"
                  required
                  [attr.aria-invalid]="confirmPasswordInvalid"
                  [attr.aria-describedby]="confirmPasswordInvalid ? 'confirm-error' : null"
                />
                <button
                  type="button"
                  class="password-toggle"
                  [attr.aria-pressed]="showConfirmPassword()"
                  (click)="showConfirmPassword.update(v => !v)"
                >
                  {{ showConfirmPassword() ? 'Hide' : 'Show' }}
                </button>
              </div>
              @if (confirmPasswordInvalid) {
                <p class="field-error" id="confirm-error">Passwords must match exactly.</p>
              }
            </div>

            <button
              class="button button-primary button-block"
              type="submit"
              [disabled]="form.invalid || pending()"
            >
              @if (pending()) {
                Resetting Password…
              } @else {
                Reset Password
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
    .reset-page {
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
    .reset-card {
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
    .lock-icon {
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
    .password-control {
      position: relative;
    }
    .password-control input {
      width: 100%;
      min-height: 3rem;
      padding: 0.65rem 4.1rem 0.65rem 0.95rem;
      border: 1px solid #E5E8E2;
      border-radius: 0.85rem;
      color: #293448;
      background: #fff;
      font-size: 0.94rem;
      box-sizing: border-box;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .password-control input:focus {
      outline: none;
      border-color: #003D30;
      box-shadow: 0 0 0 3px rgba(0, 61, 48, 0.15);
    }
    .password-control input[aria-invalid="true"] {
      border-color: #A73C32;
    }
    .password-toggle {
      position: absolute;
      top: 50%;
      right: 0.75rem;
      transform: translateY(-50%);
      border: 0;
      color: #003D30;
      background: transparent;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
    }
    .password-rules {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.25rem 0.65rem;
      margin: 0.25rem 0 0;
      padding-left: 1.15rem;
      color: var(--color-charcoal-600, #69746F);
      font-size: 0.74rem;
    }
    .password-rules .met {
      color: #003D30;
      font-weight: 600;
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
    .alert-error strong {
      display: block;
      margin-bottom: 0.25rem;
    }
    .alert-error p {
      margin: 0;
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
      margin: 0 0 1.25rem;
      color: #35445A;
      font-size: 0.9rem;
      line-height: 1.5;
    }
  `],
})
export class ResetPasswordComponent implements OnInit {
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly token = signal<string | null>(null);
  readonly missingToken = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly pending = signal(false);
  readonly succeeded = signal(false);
  readonly error = signal('');

  readonly form = this.fb.group({
    newPassword: ['', [Validators.required, (c: AbstractControl) => this.validatePasswordRules(c)]],
    confirmPassword: ['', [Validators.required, (c: AbstractControl) => this.validatePasswordMatch(c)]],
  });

  constructor() {
    this.form.controls.newPassword.valueChanges.subscribe(() => {
      this.form.controls.confirmPassword.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    });
  }

  private validatePasswordRules(control: AbstractControl): ValidationErrors | null {
    const pass = control.value ?? '';
    if (!pass) return null;
    const lengthMet = [...pass].length >= 8;
    const upperMet = /[A-Z]/.test(pass);
    const lowerMet = /[a-z]/.test(pass);
    const digitMet = /[0-9]/.test(pass);
    const specialMet = /[^A-Za-z0-9]/.test(pass);
    const bytesMet = new TextEncoder().encode(pass).length <= 72;
    return lengthMet && upperMet && lowerMet && digitMet && specialMet && bytesMet
      ? null
      : { passwordRules: true };
  }

  private validatePasswordMatch(control: AbstractControl): ValidationErrors | null {
    if (!this.form) return null;
    const pass = this.form.controls.newPassword.value ?? '';
    const confirm = control.value ?? '';
    if (!confirm) return null;
    return pass === confirm ? null : { passwordMismatch: true };
  }

  ngOnInit(): void {
    const rawToken = resetTokenFromLocation(
      this.route.snapshot.queryParamMap.get('token'),
      this.route.snapshot.fragment,
      this.document.defaultView?.location.href ?? ''
    );

    if (!rawToken) {
      this.missingToken.set(true);
    } else {
      this.token.set(rawToken);
    }
  }

  get passwordInvalid(): boolean {
    const c = this.form.controls.newPassword;
    return (c.touched || c.dirty) && (!c.value || !this.allRulesMet());
  }

  get confirmPasswordInvalid(): boolean {
    const c = this.form.controls.confirmPassword;
    return (c.touched || c.dirty) && (!c.value || !this.passwordsMatch());
  }

  passwordsMatch(): boolean {
    const pass = this.form.controls.newPassword.value ?? '';
    const confirm = this.form.controls.confirmPassword.value ?? '';
    return pass.length > 0 && pass === confirm;
  }

  ruleMet(rule: 'length' | 'upper' | 'lower' | 'digit' | 'special' | 'bytes'): boolean {
    const pass = this.form.controls.newPassword.value ?? '';
    switch (rule) {
      case 'length':
        return [...pass].length >= 8;
      case 'upper':
        return /[A-Z]/.test(pass);
      case 'lower':
        return /[a-z]/.test(pass);
      case 'digit':
        return /[0-9]/.test(pass);
      case 'special':
        return /[^A-Za-z0-9]/.test(pass);
      case 'bytes':
        return new TextEncoder().encode(pass).length <= 72;
    }
  }

  allRulesMet(): boolean {
    return (
      this.ruleMet('length') &&
      this.ruleMet('upper') &&
      this.ruleMet('lower') &&
      this.ruleMet('digit') &&
      this.ruleMet('special') &&
      this.ruleMet('bytes')
    );
  }

  submit(): void {
    if (this.form.invalid || !this.allRulesMet() || !this.passwordsMatch() || this.pending()) return;
    const token = this.token();
    if (!token) {
      this.missingToken.set(true);
      return;
    }

    this.pending.set(true);
    this.error.set('');

    const newPassword = this.form.controls.newPassword.value!.trim();

    this.auth
      .resetPassword({ token, newPassword })
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe({
        next: () => {
          this.succeeded.set(true);
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse) {
            if (err.status === 400) {
              const code = err.error?.code;
              if (code === 'INVALID_OR_EXPIRED_TOKEN') {
                this.error.set('This password reset link is invalid, expired, or has already been used.');
              } else {
                this.error.set(err.error?.message || 'Password does not meet the security requirements.');
              }
            } else {
              this.error.set('Could not reset password right now. Please check your connection and try again.');
            }
          } else {
            this.error.set('An unexpected error occurred. Please try again.');
          }
        },
      });
  }
}
