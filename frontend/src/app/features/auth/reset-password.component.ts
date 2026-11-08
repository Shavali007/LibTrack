import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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

        @if (validatingToken()) {
          <div class="status-box validating" role="status" aria-live="polite">
            <div class="spinner" aria-hidden="true"></div>
            <h2>Verifying link…</h2>
            <p>Please wait while we check your password reset link.</p>
          </div>
        } @else if (missingToken()) {
          <div class="status-box warning" role="alert">
            <div class="status-icon warning" aria-hidden="true">!</div>
            <h2>Invalid or Missing Token</h2>
            <p>This password reset link is invalid or incomplete. Please request a new link.</p>
            <a class="button button-primary button-block" routerLink="/forgot-password">Request New Reset Link</a>
          </div>
        } @else if (!tokenValid()) {
          <div class="status-box error" role="alert">
            <div class="status-icon error" aria-hidden="true">
              @if (tokenInvalidStatus() === 'EXPIRED') {
                ⏱
              } @else if (tokenInvalidStatus() === 'ALREADY_USED') {
                ✓
              } @else {
                ✕
              }
            </div>
            <h2>
              @if (tokenInvalidStatus() === 'EXPIRED') {
                Link Expired
              } @else if (tokenInvalidStatus() === 'ALREADY_USED') {
                Link Already Used
              } @else {
                Invalid Reset Link
              }
            </h2>
            <p>{{ tokenErrorMessage() }}</p>
            <a class="button button-primary button-block" routerLink="/forgot-password">Request New Reset Link</a>
          </div>
        } @else if (succeeded()) {
          <div class="status-box success" role="status">
            <div class="status-icon success" aria-hidden="true">✓</div>
            <h2>Password reset complete!</h2>
            <p>Your password has been updated successfully. You can now sign in with your new credentials.</p>
            <p class="redirect-hint">Redirecting to sign in within {{ redirectCountdown() }} seconds…</p>
            <a class="button button-primary button-block" routerLink="/login">Sign in with New Password</a>
          </div>
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
              [disabled]="form.invalid || !passwordsMatch() || !allRulesMet() || pending()"
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
      font-size: 0.95rem;
      box-sizing: border-box;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .password-control input:focus {
      outline: none;
      border-color: #003D30;
      box-shadow: 0 0 0 3px rgba(0, 61, 48, 0.12);
    }
    .password-control input[aria-invalid="true"] {
      border-color: #D32F2F;
    }
    .password-toggle {
      position: absolute;
      top: 50%;
      right: 0.65rem;
      transform: translateY(-50%);
      background: none;
      border: none;
      padding: 0.35rem 0.5rem;
      color: #003D30;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      border-radius: 4px;
    }
    .password-toggle:hover {
      background: #EAF2EF;
    }
    .password-rules {
      list-style: none;
      margin: 0.35rem 0 0;
      padding: 0.75rem 0.9rem;
      background: #F8FAF9;
      border: 1px solid #E5E8E2;
      border-radius: 0.75rem;
      display: grid;
      gap: 0.35rem;
      font-size: 0.8rem;
      color: #69746F;
    }
    .password-rules li {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .password-rules li::before {
      content: "•";
      color: #8A938E;
      font-weight: 700;
    }
    .password-rules li.met {
      color: #003D30;
      font-weight: 600;
    }
    .password-rules li.met::before {
      content: "✓";
      color: #003D30;
    }
    .field-error {
      margin: 0;
      color: #D32F2F;
      font-size: 0.82rem;
      font-weight: 500;
    }
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.75rem 1.4rem;
      border-radius: 0.85rem;
      font-size: 0.95rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: background 0.15s ease, transform 0.1s ease;
      box-sizing: border-box;
    }
    .button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .button-primary {
      background: #003D30;
      color: #fff;
    }
    .button-primary:hover:not(:disabled) {
      background: #002B22;
    }
    .button-block {
      width: 100%;
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
      font-size: 0.88rem;
      font-weight: 600;
      text-decoration: none;
    }
    .back-link:hover {
      text-decoration: underline;
    }
    .alert {
      padding: 0.85rem 1rem;
      border-radius: 0.75rem;
      font-size: 0.88rem;
      line-height: 1.45;
      box-sizing: border-box;
      margin-bottom: 1.25rem;
    }
    .alert-error {
      background: #FDF2F2;
      border: 1px solid #F5C6CB;
      color: #721C24;
    }
    .status-box {
      text-align: center;
      padding: 1.25rem 0.5rem;
      display: grid;
      justify-items: center;
      gap: 0.65rem;
    }
    .status-box h2 {
      margin: 0;
      font: 600 1.25rem var(--font-serif, serif);
      color: #003D30;
    }
    .status-box p {
      margin: 0;
      color: #4B5552;
      font-size: 0.9rem;
      line-height: 1.5;
      max-width: 22rem;
    }
    .status-box .button {
      margin-top: 0.75rem;
    }
    .status-icon {
      display: inline-grid;
      width: 3.25rem;
      height: 3.25rem;
      place-items: center;
      border-radius: 50%;
      font-size: 1.35rem;
      font-weight: 700;
    }
    .status-icon.warning {
      background: #FFF8E1;
      color: #F57F17;
      border: 1px solid #FFE082;
    }
    .status-icon.error {
      background: #FDF2F2;
      color: #D32F2F;
      border: 1px solid #FFCDD2;
    }
    .status-icon.success {
      background: #EAF2EF;
      color: #003D30;
      border: 1px solid #8ED3BB;
    }
    .spinner {
      width: 2.25rem;
      height: 2.25rem;
      border: 3px solid #EAF2EF;
      border-top-color: #003D30;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .redirect-hint {
      color: #69746F;
      font-size: 0.82rem;
      margin-top: -0.25rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly token = signal<string | null>(null);
  readonly validatingToken = signal(false);
  readonly tokenValid = signal(false);
  readonly missingToken = signal(false);
  readonly tokenInvalidStatus = signal('INVALID');
  readonly tokenErrorMessage = signal('');
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly pending = signal(false);
  readonly succeeded = signal(false);
  readonly error = signal('');
  readonly redirectCountdown = signal(5);

  private countdownInterval: ReturnType<typeof setInterval> | null = null;

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
      return;
    }

    this.token.set(rawToken);
    this.validatingToken.set(true);

    this.auth
      .validateResetToken(rawToken)
      .pipe(finalize(() => this.validatingToken.set(false)))
      .subscribe({
        next: (res) => {
          if (res && res.valid) {
            this.tokenValid.set(true);
          } else {
            this.tokenValid.set(false);
            this.tokenInvalidStatus.set(res?.status || 'INVALID');
            this.tokenErrorMessage.set(res?.message || 'This password reset link is invalid, expired, or has already been used.');
          }
        },
        error: () => {
          // If server fails or is unreachable, allow user to proceed to submit form rather than hard lockout
          this.tokenValid.set(true);
        },
      });
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
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
          this.startRedirectCountdown();
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse) {
            if (err.status === 400) {
              const code = err.error?.code;
              if (code === 'INVALID_OR_EXPIRED_TOKEN') {
                this.error.set(err.error?.message || 'This password reset link is invalid, expired, or has already been used.');
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

  private startRedirectCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.redirectCountdown.set(5);
    this.countdownInterval = setInterval(() => {
      const current = this.redirectCountdown();
      if (current <= 1) {
        clearInterval(this.countdownInterval!);
        this.countdownInterval = null;
        this.router.navigate(['/login']);
      } else {
        this.redirectCountdown.set(current - 1);
      }
    }, 1000);
  }
}
