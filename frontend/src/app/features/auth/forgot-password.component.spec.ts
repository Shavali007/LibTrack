import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service';
import { ForgotPasswordComponent } from './forgot-password.component';
import { HttpErrorResponse } from '@angular/common/http';

describe('ForgotPasswordComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let component: ForgotPasswordComponent;
  let authService: { forgotPassword: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authService = {
      forgotPassword: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders initial form with email input and submit button', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('input#forgot-email')).toBeTruthy();
    expect(el.querySelector('button[type="submit"]')).toBeTruthy();
    expect(el.querySelector('.back-link')).toBeTruthy();
  });

  it('disables submit button when email is empty or invalid', () => {
    const submitBtn = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    component.form.controls.email.setValue('invalid-email');
    fixture.detectChanges();
    expect(submitBtn.disabled).toBe(true);

    component.form.controls.email.setValue('valid@vitapstudent.ac.in');
    fixture.detectChanges();
    expect(submitBtn.disabled).toBe(false);
  });

  it('submits email and shows success state on response', () => {
    authService.forgotPassword.mockReturnValue(
      of({ message: 'If an account with that email exists, password reset instructions have been sent.' })
    );

    component.form.controls.email.setValue('student@vitapstudent.ac.in');
    fixture.detectChanges();

    component.submit();
    fixture.detectChanges();

    expect(authService.forgotPassword).toHaveBeenCalledWith('student@vitapstudent.ac.in');
    expect(component.submitted()).toBe(true);
    expect(component.pending()).toBe(false);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.success-box')).toBeTruthy();
    expect(el.textContent).toContain('Check your email');
  });

  it('displays error message on HTTP failure', () => {
    authService.forgotPassword.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 }))
    );

    component.form.controls.email.setValue('student@vitapstudent.ac.in');
    fixture.detectChanges();

    component.submit();
    fixture.detectChanges();

    expect(component.submitted()).toBe(false);
    expect(component.error()).toContain('Could not send reset link right now');
  });

  it('displays backend error message when provider returns failure message', () => {
    authService.forgotPassword.mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 503,
        error: { code: 'EMAIL_DELIVERY_FAILED', message: 'Resend email delivery failed: API key is invalid' }
      }))
    );

    component.form.controls.email.setValue('student@vitapstudent.ac.in');
    fixture.detectChanges();

    component.submit();
    fixture.detectChanges();

    expect(component.submitted()).toBe(false);
    expect(component.error()).toBe('Resend email delivery failed: API key is invalid');
  });
});
