import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, inject, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Router } from '@angular/router';
import { AccountRole, AuthService, RegistrationRole, UserProfile } from './auth.service';

@Component({
  selector: 'app-sign-in-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <dialog #dialog class="sign-in-dialog" aria-labelledby="dialog-title" (cancel)="cancel($event)">
      <header class="dialog-header">
        <div class="title-row">
          <svg class="book-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5C9.7 4.8 6.8 4.2 3 4.5v14c3.8-.3 6.7.3 9 2 2.3-1.7 5.2-2.3 9-2v-14c-3.8-.3-6.7.3-9 2Zm0 0v14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <h2 id="dialog-title">{{ mode() === 'signIn' ? 'Sign in to LibTrack' : 'Create your LibTrack account' }}</h2>
          <button class="dialog-close" type="button" aria-label="Close sign-in dialog" (click)="close()">×</button>
        </div>
        <p class="dialog-subtitle">{{ mode() === 'signIn' ? 'Select your academic role to proceed with signin' : 'Register with your institutional email' }}</p>
        <div class="role-tabs" role="tablist" [attr.aria-label]="mode() === 'signIn' ? 'Choose your account type' : 'Choose a registration role'" (keydown)="tabKeydown($event)">
          @for (role of availableRoles(); track role) {
            <button type="button" role="tab" [id]="'role-' + role" [attr.aria-selected]="selectedRole() === role"
              [attr.tabindex]="selectedRole() === role ? 0 : -1" [disabled]="!!roleMismatch()" (click)="selectRole(role)">{{ roleLabel(role) }}</button>
          }
        </div>
      </header>
      <div class="dialog-body">
        @if (contextMessage) { <p class="alert alert-warning" role="status">{{ contextMessage }}</p> }
        @if (roleMismatch()) { <div class="alert alert-warning mismatch" role="alert">You selected {{ roleLabel(selectedRole()) }}, but this account is registered as {{ roleLabel(roleMismatch()!.role) }}. Your permissions remain {{ roleLabel(roleMismatch()!.role) }}.</div><button class="button button-primary button-block" type="button" (click)="continueWithActualRole()">Continue as {{ roleLabel(roleMismatch()!.role) }}</button> }
        @if (registrationMessage()) {
          <div class="pending-message" role="status"><strong>Registration submitted</strong><p>{{ registrationMessage() }}</p></div>
          <button class="button button-secondary button-block" type="button" (click)="setMode('signIn')">Return to sign in</button>
        } @else {
          @if (error()) { <p class="alert alert-error" role="alert">{{ error() }}</p> }
          @if (!roleMismatch()) {
            <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
              @if (isRegister()) {
                <div class="field">
                  <label for="dialog-username">User Name <span aria-hidden="true">*</span></label>
                  <input id="dialog-username" type="text" formControlName="username" autocomplete="name" required
                    [attr.aria-invalid]="usernameInvalid" [attr.aria-describedby]="usernameInvalid ? 'dialog-username-error' : null">
                  @if (usernameInvalid) { <p class="field-error" id="dialog-username-error">Enter your user name.</p> }
                </div>
              }
              <div class="field"><label for="dialog-email">Institutional Email <span aria-hidden="true">*</span></label>
                <input #emailInput id="dialog-email" type="email" formControlName="email" autocomplete="username" inputmode="email" required
                  [attr.aria-invalid]="emailInvalid" [attr.aria-describedby]="emailInvalid ? 'dialog-email-error' : null">
                @if (emailInvalid) {
                  <div class="field-error" id="dialog-email-error">
                    <span>{{ emailError }}</span>
                    @if (duplicateEmailStatus() === 'APPROVED') {
                      <button type="button" class="duplicate-signin-btn" (click)="setMode('signIn')">Sign In</button>
                    }
                  </div>
                }
              </div>
              <div class="field">
                <div class="field-label-row">
                  <label for="dialog-password">Password <span aria-hidden="true">*</span></label>
                  @if (!isRegister()) {
                    <button type="button" class="forgot-password-link" (click)="navigateToForgotPassword()">Forgot Password?</button>
                  }
                </div>
                <div class="password-control"><input id="dialog-password" [type]="showPassword() ? 'text' : 'password'" formControlName="password" [autocomplete]="mode() === 'signIn' ? 'current-password' : 'new-password'" required
                  [attr.aria-invalid]="passwordInvalid" [attr.aria-describedby]="passwordInvalid ? 'dialog-password-error password-rules' : 'password-rules'">
                  <button type="button" class="password-toggle" [attr.aria-pressed]="showPassword()" (click)="showPassword.update(value => !value)">{{ showPassword() ? 'Hide' : 'Show' }}</button></div>
                @if (isRegister()) {
                  <ul class="password-rules" id="password-rules" aria-label="Password requirements">
                    <li [class.met]="passwordRule('length')">At least 8 characters</li><li [class.met]="passwordRule('upper')">One uppercase letter (A–Z)</li>
                    <li [class.met]="passwordRule('lower')">One lowercase letter (a–z)</li><li [class.met]="passwordRule('digit')">One number</li>
                    <li [class.met]="passwordRule('special')">One special character</li><li [class.met]="passwordRule('bytes')">No more than 72 UTF-8 bytes</li>
                  </ul>
                }
                @if (passwordInvalid && !isRegister()) { <p class="field-error" id="dialog-password-error">Enter your password.</p> }
                @if (passwordInvalid && isRegister()) { <p class="field-error" id="dialog-password-error">{{ passwordError }}</p> }
              </div>
              @if (isRegister()) {
                <div class="field"><label for="dialog-confirm-password">Confirm Password <span aria-hidden="true">*</span></label>
                  <input id="dialog-confirm-password" [type]="showConfirmPassword() ? 'text' : 'password'" formControlName="confirmPassword" autocomplete="new-password" required
                    [attr.aria-invalid]="confirmPasswordInvalid" [attr.aria-describedby]="confirmPasswordInvalid ? 'dialog-confirm-error' : null">
                  @if (confirmPasswordInvalid) { <p class="field-error" id="dialog-confirm-error">{{ confirmPasswordError }}</p> }
                </div>
              }
              <button class="button button-primary button-block" type="submit" [disabled]="form.invalid || pending()">{{ submitLabel }}</button>
            </form>
            @if (isRegister()) { <p class="verification-note">Your account is submitted for librarian verification upon registration. You will be able to sign in once your account is approved.</p> }
            <p class="switch-mode">@if (isRegister()) { Already have an account? <button type="button" class="link-button" (click)="setMode('signIn')">Sign in</button> } @else if (selectedRole() !== 'LIBRARIAN') { Don't have an account? <button type="button" class="link-button" (click)="setMode('register')">Create account</button> }</p>
            @if (!isRegister() && selectedRole() === 'LIBRARIAN') { <p class="provision-note">Librarian accounts are created through the controlled administrative process.</p> }
          }
        }
      </div>
    </dialog>
  `,
  styles: [`
    dialog.sign-in-dialog{width:min(100% - 2rem,28.5rem);max-width:28.5rem;max-height:min(94dvh,52rem);padding:0;overflow:auto;border:1px solid var(--color-line-200);border-radius:1.55rem;color:var(--color-charcoal-900);background:#fff;box-shadow:0 22px 68px rgb(17 38 29 / 27%)}
    dialog.sign-in-dialog::backdrop{background:rgb(16 31 25 / 56%);backdrop-filter:blur(2px)}
    .dialog-header{display:grid;gap:.45rem;padding:1.25rem 1.55rem 1.05rem;color:#fff;background:#00392f}
    .title-row{display:flex;align-items:center;gap:.65rem;min-width:0}.book-icon{width:1.65rem;height:1.65rem;flex:0 0 auto;color:#61e5bc}.title-row h2{margin:0;color:#fff;font:600 1.55rem/1.2 var(--font-serif);letter-spacing:-.02em}.dialog-close{display:grid;width:2.25rem;height:2.25rem;flex:0 0 auto;margin-left:auto;place-items:center;border:0;border-radius:50%;color:#61e5bc;background:transparent;font-size:1.8rem;line-height:1;cursor:pointer}.dialog-close:hover{background:rgb(255 255 255 / 10%)}
    .dialog-subtitle{margin:0;color:#8ed3bb;font-size:.92rem}.role-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.2rem;margin-top:.65rem;padding:.22rem;border-radius:.85rem;background:#064a3d}.role-tabs button{min-height:2.5rem;border:0;border-radius:.68rem;color:#9bdcc5;background:transparent;font-size:.85rem;font-weight:650;cursor:pointer;transition:background-color 160ms ease,color 160ms ease}.role-tabs button[aria-selected="true"]{color:#fff;background:#08745a;box-shadow:inset 0 0 0 1px rgb(255 255 255 / 8%)}.role-tabs button:focus-visible,.dialog-close:focus-visible,.link-button:focus-visible,.password-toggle:focus-visible{outline:3px solid #a9efd8;outline-offset:2px}.dialog-body{display:grid;gap:1.05rem;padding:1.8rem 1.55rem 1.85rem}.dialog-body form{display:grid;gap:1.05rem}.field{display:grid;gap:.58rem}.field-label-row{display:flex;align-items:center;justify-content:space-between}.forgot-password-link{padding:0;border:0;color:var(--color-forest-900,#003D30);background:transparent;font-size:.8rem;font-weight:600;text-decoration:none;cursor:pointer}.forgot-password-link:hover{text-decoration:underline}.field label{color:#35445a;font-size:.88rem;font-weight:600}.dialog-body input{width:100%;min-height:3rem;padding:.65rem .95rem;border:1px solid #e8e0d5;border-radius:.85rem;color:#293448;background:#fff;font-size:.94rem}.dialog-body input:focus{border-color:var(--color-forest-700);outline:3px solid rgb(6 89 69 / 18%);outline-offset:1px}.dialog-body input[aria-invalid="true"]{border-color:#a73c32}.password-control{position:relative}.password-control input{padding-right:4.1rem}.password-toggle{position:absolute;top:50%;right:.75rem;transform:translateY(-50%);border:0;color:var(--color-forest-900);background:transparent;font-size:.78rem;font-weight:700;cursor:pointer}.button-block{width:100%;min-height:3.15rem;border-radius:.82rem;font-size:.92rem}.field-error{margin:-.15rem 0 0;color:#8f3029;font-size:.78rem;display:flex;align-items:center;flex-wrap:wrap;gap:.35rem}.password-rules{display:grid;grid-template-columns:1fr 1fr;gap:.22rem .65rem;margin:0;padding-left:1.15rem;color:var(--color-charcoal-600);font-size:.72rem}.password-rules .met{color:var(--color-forest-800)}.verification-note,.provision-note{margin:0;color:var(--color-charcoal-600);font-size:.78rem}.switch-mode{margin:0;text-align:center;color:var(--color-charcoal-700);font-size:.82rem}.link-button{padding:.2rem;border:0;color:var(--color-forest-900);background:transparent;font:inherit;font-weight:700;text-decoration:underline;cursor:pointer}.duplicate-signin-btn{margin-left:.35rem;padding:0;border:0;color:var(--color-forest-900,#003D30);background:transparent;font-weight:700;text-decoration:underline;cursor:pointer;display:inline}.pending-message{padding:.85rem;border:1px solid var(--color-sage-300);border-radius:.85rem;color:var(--color-charcoal-900);background:var(--color-sage-100)}.pending-message strong{font:600 1.1rem var(--font-serif);color:var(--color-forest-950)}.pending-message p{margin:.35rem 0 0;font-size:.86rem}.mismatch{margin:0}
    @media(max-width:520px){dialog.sign-in-dialog{width:calc(100% - 1rem);max-height:96dvh;border-radius:1.25rem}.dialog-header{padding:1.25rem 1.15rem 1.1rem}.dialog-body{padding:1.2rem 1.15rem 1.3rem}.title-row h2{font-size:1.35rem}.dialog-subtitle{font-size:.83rem}.password-rules{grid-template-columns:1fr 1fr}}
  `],
})
export class SignInDialogComponent {
  @Input() initialRole: AccountRole = 'STUDENT';
  @Input() contextMessage = '';
  @Output() dismissed = new EventEmitter<void>();
  @Output() authenticated = new EventEmitter<UserProfile>();
  @ViewChild('dialog') dialogRef?: ElementRef<HTMLDialogElement>;
  @ViewChild('emailInput') emailRef?: ElementRef<HTMLInputElement>;
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly roles: AccountRole[] = ['STUDENT', 'FACULTY', 'LIBRARIAN'];
  readonly registrationRoles: RegistrationRole[] = ['STUDENT', 'FACULTY'];
  readonly selectedRole = signal<AccountRole>('STUDENT');
  readonly mode = signal<'signIn' | 'register'>('signIn');
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly pending = signal(false);
  readonly error = signal('');
  readonly registrationMessage = signal('');
  readonly roleMismatch = signal<UserProfile | null>(null);
  readonly serverFieldErrors = signal<Record<string, string>>({});
  readonly duplicateEmailStatus = signal<'APPROVED' | 'PENDING_APPROVAL' | 'REJECTED' | null>(null);
  readonly duplicateEmailMessage = signal<string>('');

  readonly form = this.fb.group({
    username: [''],
    fullName: [''],
    institutionalId: [''],
    email: ['', [Validators.required, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.maxLength(1024)]],
    confirmPassword: [''],
  });

  constructor() {
    this.form.controls.username.valueChanges.subscribe(() => {
      this.clearServerFieldError('username');
      this.clearServerFieldError('fullName');
    });
    this.form.controls.fullName.valueChanges.subscribe(() => {
      this.clearServerFieldError('fullName');
    });
    this.form.controls.institutionalId.valueChanges.subscribe(() => this.clearServerFieldError('institutionalId'));
    this.form.controls.email.valueChanges.subscribe(() => {
      this.duplicateEmailStatus.set(null);
      this.duplicateEmailMessage.set('');
      this.clearServerFieldError('email');
    });
    this.form.controls.password.valueChanges.subscribe(() => {
      this.form.controls.confirmPassword.updateValueAndValidity({ onlySelf: true });
      this.clearServerFieldError('password');
      this.clearServerFieldError('confirmPassword');
    });
    this.form.controls.confirmPassword.valueChanges.subscribe(() => this.clearServerFieldError('confirmPassword'));
    this.configureValidators();
  }

  ngOnInit(): void { this.selectedRole.set(this.initialRole); this.configureValidators(); }
  ngAfterViewInit(): void {
    const dialog = this.dialogRef?.nativeElement;
    if (!dialog) return;
    if (!dialog.open && typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    this.emailRef?.nativeElement.focus();
  }

  isRegister(): boolean { return this.mode() === 'register'; }
  availableRoles(): AccountRole[] { return this.isRegister() ? this.registrationRoles : this.roles; }
  get submitLabel(): string { return this.pending() ? (this.isRegister() ? 'Submitting…' : 'Signing in…') : (this.isRegister() ? 'Create Account' : 'Sign In as ' + this.roleLabel(this.selectedRole())); }
  get usernameInvalid(): boolean {
    const c = this.form.controls.username;
    const f = this.form.controls.fullName;
    return (c.invalid && (c.touched || c.dirty)) || (f.invalid && (f.touched || f.dirty));
  }
  get fullNameInvalid(): boolean { return this.usernameInvalid; }
  get institutionalIdInvalid(): boolean { return false; }
  get emailInvalid(): boolean {
    const c = this.form.controls.email;
    return (c.invalid && (c.touched || c.dirty)) || !!this.duplicateEmailMessage();
  }
  get passwordInvalid(): boolean { const c = this.form.controls.password; return c.invalid && (c.touched || c.dirty); }
  get confirmPasswordInvalid(): boolean { const c = this.form.controls.confirmPassword; return c.invalid && (c.touched || c.dirty); }
  get emailError(): string {
    if (this.duplicateEmailMessage()) {
      return this.duplicateEmailMessage();
    }
    return this.serverFieldErrors()['email'] ?? (this.form.controls.email.hasError('institutionalEmail') ? this.emailPolicyMessage : 'Enter your institutional email address.');
  }
  get passwordError(): string { return this.serverFieldErrors()['password'] ?? 'Password does not meet all listed requirements.'; }
  get confirmPasswordError(): string { return this.serverFieldErrors()['confirmPassword'] ?? (this.form.controls.confirmPassword.hasError('passwordMismatch') ? 'Passwords must match exactly.' : 'Confirm your password.'); }
  get emailPolicyMessage(): string {
    return this.selectedRole() === 'STUDENT'
      ? 'Enter a valid VIT-AP student email address.'
      : 'Enter a valid VIT-AP faculty email address.';
  }

  roleLabel(role: AccountRole): string { return role.charAt(0) + role.slice(1).toLowerCase(); }
  tabKeydown(event: KeyboardEvent): void {
    if (this.roleMismatch() || (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft')) return;
    event.preventDefault();
    const roles = this.availableRoles();
    const index = roles.indexOf(this.selectedRole());
    const offset = event.key === 'ArrowRight' ? 1 : -1;
    this.selectRole(roles[(index + offset + roles.length) % roles.length]);
    this.dialogRef?.nativeElement.querySelector<HTMLButtonElement>(`#role-${this.selectedRole()}`)?.focus();
  }
  selectRole(role: AccountRole): void {
    if (this.roleMismatch() || (this.isRegister() && role === 'LIBRARIAN')) return;
    this.selectedRole.set(role); this.error.set(''); this.serverFieldErrors.set({});
    this.duplicateEmailStatus.set(null); this.duplicateEmailMessage.set('');
    this.configureValidators();
  }
  setMode(mode: 'signIn' | 'register'): void {
    if (mode === 'register' && this.selectedRole() === 'LIBRARIAN') return;
    this.mode.set(mode); this.error.set(''); this.registrationMessage.set(''); this.serverFieldErrors.set({});
    this.duplicateEmailStatus.set(null); this.duplicateEmailMessage.set('');
    this.form.controls.password.reset(); this.form.controls.confirmPassword.reset();
    this.configureValidators();
  }
  continueWithActualRole(): void { const profile = this.roleMismatch(); if (!profile) return; this.authenticated.emit(profile); this.close(); }
  cancel(event: Event): void { event.preventDefault(); this.close(); }
  close(): void {
    const dialog = this.dialogRef?.nativeElement;
    if (dialog?.open && typeof dialog.close === 'function') dialog.close(); else dialog?.removeAttribute('open');
    this.dismissed.emit();
  }
  navigateToForgotPassword(): void {
    const dialog = this.dialogRef?.nativeElement;
    if (dialog?.open && typeof dialog.close === 'function') dialog.close(); else dialog?.removeAttribute('open');
    void this.router.navigateByUrl('/forgot-password');
  }
  passwordRule(rule: 'length' | 'upper' | 'lower' | 'digit' | 'special' | 'bytes'): boolean {
    const password = this.form.controls.password.value;
    switch (rule) {
      case 'length': return [...password].length >= 8;
      case 'upper': return /[A-Z]/.test(password);
      case 'lower': return /[a-z]/.test(password);
      case 'digit': return /[0-9]/.test(password);
      case 'special': return /[^A-Za-z0-9]/.test(password);
      case 'bytes': return new TextEncoder().encode(password).length <= 72;
    }
  }
  submit(): void {
    this.configureValidators();
    if (this.form.invalid || this.pending()) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    const effectiveUsername = (value.username || value.fullName || '').trim();
    this.pending.set(true); this.error.set('');
    if (this.isRegister()) {
      this.auth.register({
        username: effectiveUsername,
        fullName: effectiveUsername,
        email: value.email.trim(),
        password: value.password,
        confirmPassword: value.confirmPassword,
        role: this.selectedRole() as RegistrationRole
      })
        .pipe(finalize(() => this.pending.set(false))).subscribe({
          next: response => { this.registrationMessage.set(response.message); this.form.controls.password.reset(); this.form.controls.confirmPassword.reset(); },
          error: (error: unknown) => this.handleRegistrationError(error),
        });
      return;
    }
    this.auth.login({ email: value.email.trim(), password: value.password }).pipe(finalize(() => this.pending.set(false))).subscribe({
      next: profile => { if (profile.role !== this.selectedRole()) { this.roleMismatch.set(profile); return; } this.authenticated.emit(profile); this.close(); },
      error: (error: unknown) => this.error.set(this.signInError(error)),
    });
  }

  private configureValidators(): void {
    const role = this.selectedRole();
    if (this.isRegister()) {
      this.form.controls.username.setValidators([Validators.required, Validators.maxLength(100)]);
    } else {
      this.form.controls.username.clearValidators();
    }
    this.form.controls.fullName.clearValidators();
    this.form.controls.institutionalId.clearValidators();
    this.form.controls.username.updateValueAndValidity({ emitEvent: false });
    this.form.controls.fullName.updateValueAndValidity({ emitEvent: false });
    this.form.controls.institutionalId.updateValueAndValidity({ emitEvent: false });
    const emailValidators = [Validators.required, Validators.maxLength(254)];
    if (this.isRegister()) emailValidators.push(control => this.institutionalEmailValid(role, control.value) ? null : { institutionalEmail: true });
    else emailValidators.push(Validators.email);
    this.form.controls.email.setValidators(emailValidators);
    const passwordValidators = [Validators.required, Validators.maxLength(1024)];
    if (this.isRegister()) passwordValidators.push(control => this.registrationPasswordValid(control.value) ? null : { passwordPolicy: true });
    this.form.controls.password.setValidators(passwordValidators);
    if (this.isRegister()) {
      this.form.controls.confirmPassword.setValidators([Validators.required, control => control.value === this.form.controls.password.value ? null : { passwordMismatch: true }]);
    } else this.form.controls.confirmPassword.clearValidators();
    this.form.controls.email.updateValueAndValidity({ emitEvent: false });
    this.form.controls.password.updateValueAndValidity({ emitEvent: false });
    this.form.controls.confirmPassword.updateValueAndValidity({ emitEvent: false });
  }
  private institutionalEmailValid(role: AccountRole, value: string): boolean {
    if (!value || value !== value.trim() || /\s/.test(value)) return false;
    const email = value.toLowerCase();
    const localPartLength = email.indexOf('@');
    if (localPartLength < 1 || localPartLength > 64 || localPartLength !== email.lastIndexOf('@')) return false;
    if (role === 'STUDENT') {
      return /^[a-z]+\.\d{2}[a-z]{3}\d{4,5}@vitapstudent\.ac\.in$/.test(email);
    }
    if (role === 'FACULTY') {
      return localPartLength >= 2 && /^(?=[a-z0-9.!#$%&'*+/=?^_`{|}~-]*[a-z])[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@vitap\.ac\.in$/.test(email);
    }
    return false;
  }
  private registrationPasswordValid(value: string): boolean {
    return [...value].length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value)
      && /[^A-Za-z0-9]/.test(value) && new TextEncoder().encode(value).length <= 72;
  }
  private signInError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.error?.code === 'ACCOUNT_PENDING_APPROVAL') {
        return 'Your account registration is awaiting librarian approval. You will be able to sign in once approved.';
      }
      if (error.error?.code === 'ACCOUNT_REJECTED') {
        return 'Your account registration request has been rejected. Please contact library staff for assistance.';
      }
      if (error.error?.code === 'ACCOUNT_NOT_ACTIVE') {
        return 'This account is currently disabled. Please contact library staff for assistance.';
      }
      if (error.error?.code === 'INVALID_CREDENTIALS') {
        return 'Email or password is incorrect.';
      }
      if (error.status === 0 || error.status >= 500) {
        return 'Sign-in is temporarily unavailable. Check your connection and try again.';
      }
    }

    return 'Sign-in failed. Check your credentials or contact library staff.';
  }
  private clearServerFieldError(field: string): void {
    if (!this.serverFieldErrors()[field]) return;
    this.serverFieldErrors.update(errors => { const next = { ...errors }; delete next[field]; return next; });
  }
  private handleRegistrationError(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      if (error.error?.code === 'EMAIL_ALREADY_EXISTS') {
        const status = error.error?.existingStatus as 'APPROVED' | 'PENDING_APPROVAL' | 'REJECTED' | undefined;
        this.duplicateEmailStatus.set(status ?? 'APPROVED');
        if (status === 'PENDING_APPROVAL') {
          this.duplicateEmailMessage.set('A registration request with this email already exists and is awaiting librarian approval.');
        } else if (status === 'REJECTED') {
          this.duplicateEmailMessage.set('An account with this email already exists but was not approved. Please contact the librarian for assistance.');
        } else {
          this.duplicateEmailMessage.set('An account with this email already exists. Please sign in instead.');
        }
        this.form.controls.email.setErrors({ ...this.form.controls.email.errors, duplicateEmail: true });
        this.form.controls.email.markAsTouched();
        return;
      }
      if (error.error?.code === 'IDENTITY_CONFLICT') {
        this.error.set('An account with that institutional identity already exists.');
        return;
      }
    }
    if (error instanceof HttpErrorResponse && error.status === 400) {
      const returned = error.error?.fieldErrors as Record<string, unknown> | undefined;
      const safeMessages: Record<string, string> = {};
      const controlFields = ['email', 'password', 'confirmPassword'] as const;
      const safeText: Record<(typeof controlFields)[number], string> = {
        email: this.emailPolicyMessage,
        password: 'Password does not meet the listed requirements.',
        confirmPassword: 'Passwords must match exactly.',
      };
      for (const field of controlFields) {
        if (typeof returned?.[field] !== 'string') continue;
        safeMessages[field] = safeText[field];
        const control = this.form.controls[field];
        control.setErrors({ ...control.errors, serverRegistration: true });
        control.markAsTouched();
      }
      if (Object.keys(safeMessages).length) {
        this.serverFieldErrors.set(safeMessages);
        this.error.set('Please correct the highlighted registration fields and try again.');
        return;
      }
    }
    this.error.set(this.registrationError(error));
  }
  private registrationError(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 409) return 'This email could not be registered. Sign in or contact library staff for help.';
    if (error instanceof HttpErrorResponse && error.status === 400) return 'Review the institutional email and password requirements, then try again.';
    return 'Registration is temporarily unavailable. Check your connection and try again.';
  }
}
