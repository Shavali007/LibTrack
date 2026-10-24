import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService, ProvisionableRole } from '../auth/auth.service';

@Component({
  selector: 'app-account-provision',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="provision-page">
      <section class="panel" aria-labelledby="provision-title">
        <a routerLink="/">Back to LibTrack</a>
        <p class="eyebrow">LIBRARIAN ADMINISTRATION</p>
        <h1 id="provision-title">Provision a member account</h1>
        <p class="intro">Use this form only after verifying the person's institutional identity through your approved college process. LibTrack does not connect to a verification service.</p>

        @if (notice()) { <p class="notice" role="status">{{ notice() }}</p> }
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label for="role">Account role</label>
          <select id="role" formControlName="role">
            <option value="STUDENT">Student</option>
            <option value="FACULTY">Faculty</option>
          </select>

          <label for="email">Institutional email</label>
          <input id="email" type="email" formControlName="email" autocomplete="off" required>
          @if (form.controls.email.invalid && form.controls.email.touched) {
            <span class="field-error">Enter a valid institutional email address.</span>
          }

          <label for="institutionalId">Institutional ID</label>
          <input id="institutionalId" type="text" formControlName="institutionalId" autocomplete="off" required>

          <label for="password">Temporary password</label>
          <input id="password" type="password" formControlName="password" autocomplete="new-password" required>
          <span class="hint">At least 12 characters and no more than 72 UTF-8 bytes. Share it through the institution's secure process.</span>

          <label class="attestation">
            <input type="checkbox" formControlName="identityVerified">
            I verified this person's institutional identity.
          </label>

          <button type="submit" [disabled]="form.invalid || pending()">
            {{ pending() ? 'Creating account…' : 'Create account' }}
          </button>
        </form>
      </section>
    </main>
  `,
  styles: [`
    :host { display: block; }
    .provision-page { min-height: calc(100vh - 5rem); display: grid; place-items: center; padding: 2rem 1rem; }
    .panel { width: min(100%, 38rem); padding: clamp(1.5rem, 5vw, 2.5rem); border: 1px solid var(--line-200); background: var(--paper-0); }
    a { color: var(--forest-700); }
    .eyebrow { margin-top: 1.5rem; color: var(--sage-500); font-size: .75rem; font-weight: 700; letter-spacing: .12em; }
    h1 { margin: 1rem 0 .75rem; color: var(--forest-900); font: 500 2rem/1.2 Georgia, serif; }
    .intro, .hint { color: var(--charcoal-600); line-height: 1.5; }
    .hint { font-size: .83rem; }
    form { display: grid; gap: .625rem; margin-top: 1.5rem; }
    label { margin-top: .5rem; font-size: .9rem; font-weight: 600; }
    input:not([type=checkbox]), select { min-height: 2.8rem; padding: .625rem .75rem; border: 1px solid var(--line-200); border-radius: 4px; font: inherit; }
    .attestation { display: flex; align-items: flex-start; gap: .65rem; line-height: 1.45; }
    .attestation input { margin-top: .2rem; }
    .field-error, .error { color: var(--danger-700); font-size: .875rem; }
    .notice { padding: .75rem; border-left: 3px solid var(--forest-700); background: var(--sage-100); }
    button { min-height: 2.8rem; margin-top: .75rem; border: 0; border-radius: 4px; padding: .625rem 1rem; color: white; background: var(--forest-900); font: inherit; font-weight: 600; cursor: pointer; }
    button:disabled { cursor: not-allowed; opacity: .55; }
  `],
})
export class AccountProvisionComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly pending = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly form = this.formBuilder.group({
    role: this.formBuilder.control<ProvisionableRole>('STUDENT'),
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    institutionalId: ['', [Validators.required, Validators.maxLength(100)]],
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72)]],
    identityVerified: [false, Validators.requiredTrue],
  });

  submit(): void {
    if (this.form.invalid || this.pending()) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set(null);
    this.notice.set(null);
    this.pending.set(true);
    const values = this.form.getRawValue();
    this.auth.provisionAccount({ ...values, identityVerified: true }).pipe(
      finalize(() => this.pending.set(false)),
    ).subscribe({
      next: (created) => {
        this.notice.set(`Created ${created.role.toLowerCase()} account ${created.email}. The password is not shown again.`);
        this.form.reset({ role: 'STUDENT', email: '', institutionalId: '', password: '', identityVerified: false });
      },
      error: () => this.error.set('Account was not created. Check for an existing email or institutional ID and try again.'),
    });
  }
}
