import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService, ProvisionableRole } from '../auth/auth.service';

@Component({
  selector: 'app-account-provision',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-heading">
      <p class="eyebrow">LIBRARIAN ADMINISTRATION</p>
      <h1 id="provision-title">Member accounts</h1>
      <p class="page-description">Create an account after confirming the person's institutional identity.</p>
    </div>

    <section class="provision-layout" aria-labelledby="create-account-title">
      <div class="provision-main surface-card">
        <div class="section-heading">
          <div><p class="eyebrow">NEW MEMBER</p><h2 id="create-account-title">Provision an account</h2></div>
          <span class="status-badge status-badge-neutral">Student or Faculty</span>
        </div>
        <p class="muted">This prototype records your verification attestation. It does not connect to a college identity service.</p>

        @if (notice()) { <p class="alert alert-success" role="status">{{ notice() }}</p> }
        @if (error()) { <p class="alert alert-error" role="alert">{{ error() }}</p> }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label for="role">Account role <span class="required-mark" aria-hidden="true">*</span></label>
            <select id="role" formControlName="role" required aria-required="true">
              <option value="STUDENT">Student</option><option value="FACULTY">Faculty</option>
            </select>
          </div>
          <div class="field">
            <label for="email">Institutional email <span class="required-mark" aria-hidden="true">*</span></label>
            <input id="email" type="email" formControlName="email" autocomplete="off" required aria-required="true" placeholder="name@institution.edu">
          </div>
          <div class="field">
            <label for="institutionalId">Institutional ID <span class="required-mark" aria-hidden="true">*</span></label>
            <input id="institutionalId" type="text" formControlName="institutionalId" autocomplete="off" required aria-required="true">
          </div>
          <div class="field">
            <label for="password">Temporary password <span class="required-mark" aria-hidden="true">*</span></label>
            <input id="password" type="password" formControlName="password" autocomplete="new-password" required aria-required="true" aria-describedby="password-help">
            <p id="password-help" class="field-hint">Use at least 12 characters. Share it with the member through your approved channel.</p>
          </div>
          <label class="attestation" for="identityVerified">
            <input id="identityVerified" type="checkbox" formControlName="identityVerified" required aria-required="true">
            <span>I confirm that I checked this person's college identity through the institution's approved process.</span>
          </label>
          <button class="button button-primary" type="submit" [disabled]="form.invalid || pending()">
            {{ pending() ? 'Creating account…' : 'Create member account' }}
          </button>
        </form>
      </div>

      <aside class="provision-aside" aria-label="Provisioning guidance">
        <div class="guidance-card">
          <p class="eyebrow">ACCOUNT POLICY</p>
          <h2>Verify before creating</h2>
          <p>Only Librarians can provision member accounts. Student and Faculty identities must be checked before you submit.</p>
          <ul><li>Librarian roles are not available here.</li><li>Email and institutional ID must be unique.</li><li>The password is hashed and never shown in the response.</li></ul>
        </div>
        <a class="back-link" routerLink="/">Return to workspace</a>
      </aside>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .page-heading { margin-bottom: 1.5rem; }
    .page-heading .eyebrow { margin-bottom: .45rem; }
    .page-heading h1 { margin-bottom: .45rem; }
    .page-description { max-width: 44rem; margin: 0; color: var(--color-charcoal-600); }
    .provision-layout { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(14rem, .75fr); align-items: start; gap: 1.25rem; }
    .provision-main { padding: clamp(1.25rem, 3vw, 2rem); }
    .section-heading { display: flex; align-items: start; justify-content: space-between; gap: 1rem; }
    .section-heading .eyebrow { margin-bottom: .4rem; }
    .section-heading h2 { margin-bottom: .5rem; font-size: 1.45rem; }
    .provision-main > .muted { max-width: 44rem; margin-bottom: 1.35rem; font-size: .9rem; }
    .provision-main .alert { margin-bottom: 1rem; }
    form { display: grid; max-width: 36rem; gap: 1rem; }
    input[type="checkbox"] { width: 1.1rem; height: 1.1rem; flex: 0 0 auto; accent-color: var(--color-forest-900); }
    .attestation { display: flex; align-items: start; gap: .65rem; margin: .2rem 0; line-height: 1.45; }
    .attestation span { font-weight: 500; }
    .guidance-card { padding: 1.25rem; border: 1px solid var(--color-line-200); border-top: 3px solid var(--color-sage-500); border-radius: var(--radius-panel); background: #f4f4ed; }
    .guidance-card .eyebrow { margin-bottom: .55rem; }
    .guidance-card h2 { margin-bottom: .65rem; font-size: 1.25rem; }
    .guidance-card p, .guidance-card li { color: var(--color-charcoal-700); font-size: .85rem; }
    .guidance-card ul { display: grid; gap: .45rem; margin: .8rem 0 0; padding-left: 1.2rem; }
    .back-link { display: inline-block; margin: 1rem .25rem; font-size: .85rem; font-weight: 650; }
    @media (max-width: 760px) { .provision-layout { grid-template-columns: 1fr; } .provision-aside { order: -1; } .guidance-card { padding: 1rem; } }
    @media (max-width: 430px) { .section-heading { display: grid; } }
  `],
})
export class AccountProvisionComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
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
    if (this.form.invalid || this.pending()) { this.form.markAllAsTouched(); return; }
    this.error.set(null);
    this.notice.set(null);
    this.pending.set(true);
    const values = this.form.getRawValue();
    this.auth.provisionAccount({ ...values, identityVerified: true }).pipe(finalize(() => this.pending.set(false))).subscribe({
      next: (created) => {
        this.notice.set(`Created ${created.role.toLowerCase()} account ${created.email}. The password is not shown again.`);
        this.form.reset({ role: 'STUDENT', email: '', institutionalId: '', password: '', identityVerified: false });
      },
      error: () => this.error.set('Account was not created. Check for an existing email or institutional ID and try again.'),
    });
  }
}
