import { Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService, ProvisionableRole } from '../auth/auth.service';

export function extractDisplayName(email: string): string {
  if (!email) return '';
  const clean = email.trim();
  const at = clean.indexOf('@');
  const user = at > 0 ? clean.slice(0, at) : clean;
  const dot = user.indexOf('.');
  const seg = (dot >= 0 ? user.slice(0, dot) : user).trim();
  if (!seg) return '';
  return seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase();
}

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
            <label for="displayName">Display name</label>
            <input id="displayName" type="text" formControlName="displayName" autocomplete="off" placeholder="Auto-generated from email">
            <p class="field-hint">Auto-generated from email username. You can adjust it before saving.</p>
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
        <a class="back-link" routerLink="/workspace/librarian/members">← Back to member directory</a>
      </aside>
    </section>
  `,
  styles: [`
    .field-hint { margin: .35rem 0 0; color: var(--color-charcoal-600); font-size: .8rem; }
    .attestation { display: flex; align-items: flex-start; gap: .6rem; margin: .5rem 0 1.25rem; font-size: .88rem; cursor: pointer; }
    .attestation input { margin-top: .2rem; }
    .guidance-card { padding: 1.25rem; border: 1px solid var(--color-line-200); border-radius: var(--radius-panel); background: #fff; }
    .guidance-card h2 { margin: .25rem 0 .5rem; font-size: 1.1rem; }
    .guidance-card p, .guidance-card li { color: var(--color-charcoal-700); font-size: .85rem; }
    .guidance-card ul { display: grid; gap: .45rem; margin: .8rem 0 0; padding-left: 1.2rem; }
    .back-link { display: inline-block; margin: 1rem .25rem; font-size: .85rem; font-weight: 650; }
    @media (max-width: 760px) { .provision-layout { grid-template-columns: 1fr; } .provision-aside { order: -1; } .guidance-card { padding: 1rem; } }
    @media (max-width: 430px) { .section-heading { display: grid; } }
  `],
})
export class AccountProvisionComponent implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  readonly pending = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly form = this.formBuilder.group({
    role: this.formBuilder.control<ProvisionableRole>('STUDENT'),
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    displayName: ['', [Validators.maxLength(100)]],
    institutionalId: ['', [Validators.required, Validators.maxLength(100)]],
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72)]],
    identityVerified: [false, Validators.requiredTrue],
  });

  ngOnInit(): void {
    this.form.controls.email.valueChanges.subscribe((email) => {
      if (!this.form.controls.displayName.dirty) {
        this.form.controls.displayName.setValue(extractDisplayName(email), { emitEvent: false });
      }
    });
  }

  submit(): void {
    if (this.form.invalid || this.pending()) { this.form.markAllAsTouched(); return; }
    this.error.set(null);
    this.notice.set(null);
    this.pending.set(true);
    const values = this.form.getRawValue();
    const displayName = values.displayName.trim() || extractDisplayName(values.email);
    this.auth.provisionAccount({ ...values, displayName, identityVerified: true }).pipe(finalize(() => this.pending.set(false))).subscribe({
      next: (created) => {
        this.notice.set(`Created ${created.role.toLowerCase()} account ${created.email}. The password is not shown again.`);
        this.form.reset({ role: 'STUDENT', email: '', displayName: '', institutionalId: '', password: '', identityVerified: false });
      },
      error: () => this.error.set('Account was not created. Check for an existing email or institutional ID and try again.'),
    });
  }
}
