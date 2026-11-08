import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { AuthService, UserProfile } from './auth.service';
import { SignInDialogComponent } from './sign-in-dialog.component';

describe('SignInDialogComponent', () => {
  it('reports a role mismatch and continues only with the backend-returned role', async () => {
    const actual: UserProfile = { id: 'faculty-1', email: 'faculty@example.edu', role: 'FACULTY' };
    const auth = { profile: signal<UserProfile | null>(actual), login: vi.fn(() => of(actual)) };
    await TestBed.configureTestingModule({
      imports: [SignInDialogComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }]
    }).compileComponents();
    const fixture: ComponentFixture<SignInDialogComponent> = TestBed.createComponent(SignInDialogComponent);
    const component = fixture.componentInstance;
    component.initialRole = 'STUDENT';
    fixture.detectChanges();
    component.form.patchValue({ email: actual.email, password: 'not logged or displayed' });
    let authenticated: UserProfile | null = null;
    component.authenticated.subscribe(profile => authenticated = profile);

    component.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('You selected Student');
    expect(fixture.nativeElement.textContent).toContain('registered as Faculty');
    expect(authenticated).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('not logged or displayed');

    component.continueWithActualRole();
    expect(authenticated).toEqual(actual);
    expect(auth.login).toHaveBeenCalledOnce();
  });

  it('opens the actual registration form only from Student and Faculty sign-in', async () => {
    const auth = { profile: signal<UserProfile | null>(null), login: vi.fn(), register: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [SignInDialogComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }]
    }).compileComponents();
    const fixture = TestBed.createComponent(SignInDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('[role="tab"]')).toHaveLength(3);
    expect(fixture.nativeElement.querySelectorAll('input')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Don\'t have an account? Create account');

    (fixture.nativeElement.querySelector('.switch-mode .link-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.isRegister()).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('[role="tab"]')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).not.toContain('Librarian');
    expect(fixture.nativeElement.querySelectorAll('input')).toHaveLength(4);
    expect(fixture.nativeElement.querySelector('#dialog-username')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#dialog-inst-id')).toBeNull();
    expect(fixture.nativeElement.querySelector('#dialog-email')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#dialog-password')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#dialog-confirm-password')).not.toBeNull();

    component.setMode('signIn'); fixture.detectChanges();
    component.selectRole('FACULTY'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Don\'t have an account? Create account');
    component.selectRole('LIBRARIAN'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Create account');
    component.setMode('register'); fixture.detectChanges();
    expect(component.isRegister()).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('input')).toHaveLength(2);
  });

  it('validates Student and Faculty email patterns and every registration password rule', async () => {
    const auth = { profile: signal<UserProfile | null>(null), login: vi.fn(), register: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [SignInDialogComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }]
    }).compileComponents();
    const fixture = TestBed.createComponent(SignInDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges(); component.setMode('register');
    component.form.patchValue({ username: 'Shavali', email: 'shavali.23mic7248@vitapstudent.ac.in', password: 'SecurePass1!', confirmPassword: 'SecurePass1!', department: 'Computer Science and Engineering' });
    component.form.controls.email.setValue('shavali23mic7248@vitapstudent.ac.in');
    expect(component.form.controls.email.hasError('institutionalEmail')).toBe(true);
    component.form.controls.email.setValue('shavali.23mic7248@vitapstudent.ac.in');
    expect(component.form.controls.email.valid).toBe(true);
    expect(component.form.valid).toBe(true);
    component.form.controls.email.setValue('shavali.23mic7248@vitap.ac.in');
    expect(component.form.controls.email.hasError('institutionalEmail')).toBe(true);
    component.selectRole('FACULTY');
    component.form.controls.email.setValue('faculty.name@vitap.ac.in');
    expect(component.form.controls.email.valid).toBe(true);
    component.form.controls.email.setValue('a@vitap.ac.in');
    expect(component.form.controls.email.hasError('institutionalEmail')).toBe(true);
    component.form.controls.email.setValue('faculty..name@vitap.ac.in');
    expect(component.form.controls.email.hasError('institutionalEmail')).toBe(true);
    for (const rule of ['length', 'upper', 'lower', 'digit', 'special', 'bytes'] as const) expect(component.passwordRule(rule)).toBe(true);
    component.form.controls.password.setValue('short');
    expect(component.form.controls.password.valid).toBe(false);
    component.form.controls.confirmPassword.setValue('different');
    expect(component.form.controls.confirmPassword.hasError('passwordMismatch')).toBe(true);
  });

  it('displays safe field-specific errors returned by registration validation', async () => {
    const auth = {
      profile: signal<UserProfile | null>(null), login: vi.fn(),
      register: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 400, error: { fieldErrors: { email: 'Enter a valid VIT-AP student email address.', password: 'server detail must not be shown' } } }))),
    };
    await TestBed.configureTestingModule({
      imports: [SignInDialogComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }]
    }).compileComponents();
    const fixture = TestBed.createComponent(SignInDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges(); component.setMode('register');
    component.form.patchValue({ username: 'Shavali', email: 'shavali.23mic7248@vitapstudent.ac.in', password: 'SecurePass1!', confirmPassword: 'SecurePass1!', department: 'Computer Science and Engineering' });
    component.submit(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#dialog-email-error')?.textContent).toContain('Enter a valid VIT-AP student email address.');
    expect(fixture.nativeElement.querySelector('#dialog-password-error')?.textContent).toContain('Password does not meet');
    expect(fixture.nativeElement.textContent).not.toContain('server detail must not be shown');
    expect(fixture.nativeElement.textContent).toContain('Please correct the highlighted registration fields');
  });

  it('submits registration with the selected role and shows pending verification without logging in', async () => {
    const pending = { status: 'PENDING_APPROVAL' as const, message: 'Registration remains inactive pending verification.' };
    const auth = { profile: signal<UserProfile | null>(null), login: vi.fn(), register: vi.fn(() => of(pending)) };
    await TestBed.configureTestingModule({
      imports: [SignInDialogComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }]
    }).compileComponents();
    const fixture = TestBed.createComponent(SignInDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges(); component.setMode('register'); component.selectRole('FACULTY');
    component.form.patchValue({ username: 'Dr. Faculty', email: 'faculty@vitap.ac.in', password: 'SecurePass1!', confirmPassword: 'SecurePass1!', department: 'Computer Science and Engineering' });
    component.submit(); fixture.detectChanges();
    expect(auth.register).toHaveBeenCalledWith({ username: 'Dr. Faculty', fullName: 'Dr. Faculty', email: 'faculty@vitap.ac.in', password: 'SecurePass1!', confirmPassword: 'SecurePass1!', role: 'FACULTY', department: 'Computer Science and Engineering' });
    expect(component.registrationMessage()).toContain('inactive pending verification');
    expect(auth.login).not.toHaveBeenCalled();
    expect(component.form.controls.password.value).toBe('');
  });

  it('displays Forgot Password link and navigates to /forgot-password when clicked', async () => {
    const auth = { profile: signal<UserProfile | null>(null), login: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [SignInDialogComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }]
    }).compileComponents();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    const fixture = TestBed.createComponent(SignInDialogComponent);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('.forgot-password-link') as HTMLButtonElement;
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Forgot Password?');
    link.click();
    expect(navigateSpy).toHaveBeenCalledWith('/forgot-password');
  });

  it('handles duplicate email responses with status-aware inline error and preserves form fields', async () => {
    let duplicateStatus = 'APPROVED';
    const auth = {
      profile: signal<UserProfile | null>(null),
      login: vi.fn(),
      register: vi.fn(() => throwError(() => new HttpErrorResponse({
        status: 409,
        error: { code: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email already exists.', existingStatus: duplicateStatus }
      })))
    };
    await TestBed.configureTestingModule({
      imports: [SignInDialogComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }]
    }).compileComponents();
    const fixture = TestBed.createComponent(SignInDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.setMode('register');

    component.form.patchValue({
      username: 'Existing Applicant',
      email: 'existing.23mic7210@vitapstudent.ac.in',
      password: 'SecurePass1!',
      confirmPassword: 'SecurePass1!',
      department: 'Computer Science and Engineering'
    });

    // 1. APPROVED account
    duplicateStatus = 'APPROVED';
    component.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#dialog-email-error')?.textContent).toContain(
      'An account with this email already exists. Please sign in instead.'
    );
    const signInBtn = fixture.nativeElement.querySelector('.duplicate-signin-btn') as HTMLButtonElement;
    expect(signInBtn).not.toBeNull();
    // Inputs remain intact
    expect(component.form.controls.username.value).toBe('Existing Applicant');
    expect(component.form.controls.password.value).toBe('SecurePass1!');

    // 2. Clear error on email change
    component.form.controls.email.setValue('new.23mic7210@vitapstudent.ac.in');
    fixture.detectChanges();
    expect(component.duplicateEmailStatus()).toBeNull();
    expect(component.duplicateEmailMessage()).toBe('');

    // 3. PENDING_APPROVAL account
    duplicateStatus = 'PENDING_APPROVAL';
    component.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#dialog-email-error')?.textContent).toContain(
      'A registration request with this email already exists and is awaiting librarian approval.'
    );

    // 4. REJECTED account
    component.form.controls.email.setValue('rejected.23mic7210@vitapstudent.ac.in');
    duplicateStatus = 'REJECTED';
    component.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#dialog-email-error')?.textContent).toContain(
      'An account with this email already exists but was not approved. Please contact the librarian for assistance.'
    );

    // 5. Switching via Sign In button keeps the email
    component.form.controls.email.setValue('switch.23mic7210@vitapstudent.ac.in');
    duplicateStatus = 'APPROVED';
    component.submit();
    fixture.detectChanges();
    const inlineSignIn = fixture.nativeElement.querySelector('.duplicate-signin-btn') as HTMLButtonElement;
    inlineSignIn.click();
    fixture.detectChanges();
    expect(component.isRegister()).toBe(false);
    expect(component.form.controls.email.value).toBe('switch.23mic7210@vitapstudent.ac.in');
  });
});
