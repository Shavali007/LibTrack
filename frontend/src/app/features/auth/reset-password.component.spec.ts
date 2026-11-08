import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service';
import { ResetPasswordComponent, resetTokenFromLocation } from './reset-password.component';
import { HttpErrorResponse } from '@angular/common/http';

describe('ResetPasswordComponent', () => {
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let component: ResetPasswordComponent;
  let authService: {
    resetPassword: ReturnType<typeof vi.fn>;
    validateResetToken: ReturnType<typeof vi.fn>;
  };

  it('extracts token from query parameter or hash correctly', () => {
    expect(resetTokenFromLocation('my-query-token', null, 'http://localhost/reset-password')).toBe('my-query-token');
    expect(resetTokenFromLocation(null, 'token=hash-token', 'http://localhost/reset-password#token=hash-token')).toBe('hash-token');
    expect(resetTokenFromLocation(null, null, 'http://localhost/reset-password')).toBeNull();
  });

  describe('with valid token in query param', () => {
    beforeEach(async () => {
      authService = {
        resetPassword: vi.fn(),
        validateResetToken: vi.fn().mockReturnValue(
          of({ valid: true, status: 'VALID', message: 'Token is valid.' })
        ),
      };

      await TestBed.configureTestingModule({
        imports: [ResetPasswordComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authService },
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: {
                queryParamMap: {
                  get: (key: string) => (key === 'token' ? 'sample-valid-token-123' : null),
                },
                fragment: null,
              },
            },
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(ResetPasswordComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('validates the token with the backend on init', () => {
      expect(authService.validateResetToken).toHaveBeenCalledWith('sample-valid-token-123');
      expect(component.tokenValid()).toBe(true);
    });

    it('renders new password and confirm password inputs when token is valid', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(component.missingToken()).toBe(false);
      expect(el.querySelector('input#new-password')).toBeTruthy();
      expect(el.querySelector('input#confirm-password')).toBeTruthy();
      expect(el.querySelector('button[type="submit"]')).toBeTruthy();
    });

    it('validates password rule requirements live', () => {
      component.form.controls.newPassword.setValue('short');
      expect(component.ruleMet('length')).toBe(false);

      component.form.controls.newPassword.setValue('Password123!');
      expect(component.ruleMet('length')).toBe(true);
      expect(component.ruleMet('upper')).toBe(true);
      expect(component.ruleMet('lower')).toBe(true);
      expect(component.ruleMet('digit')).toBe(true);
      expect(component.ruleMet('special')).toBe(true);
      expect(component.ruleMet('bytes')).toBe(true);
      expect(component.allRulesMet()).toBe(true);
    });

    it('requires password confirmation to match before submitting', () => {
      component.form.controls.newPassword.setValue('ValidPass123!');
      component.form.controls.confirmPassword.setValue('DifferentPass123!');
      expect(component.passwordsMatch()).toBe(false);

      const submitBtn = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      fixture.detectChanges();
      expect(submitBtn.disabled).toBe(true);

      component.form.controls.confirmPassword.setValue('ValidPass123!');
      fixture.detectChanges();
      expect(component.passwordsMatch()).toBe(true);
      expect(submitBtn.disabled).toBe(false);
    });

    it('submits reset request and shows success screen', () => {
      authService.resetPassword.mockReturnValue(
        of({ message: 'Password has been reset successfully.' })
      );

      component.form.controls.newPassword.setValue('ValidPass123!');
      component.form.controls.confirmPassword.setValue('ValidPass123!');
      fixture.detectChanges();

      component.submit();
      fixture.detectChanges();

      expect(authService.resetPassword).toHaveBeenCalledWith({
        token: 'sample-valid-token-123',
        newPassword: 'ValidPass123!',
      });
      expect(component.succeeded()).toBe(true);

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Password reset complete!');
      expect(el.querySelector('a.button-primary')?.getAttribute('href')).toBe('/login');
    });

    it('handles expired token error response from backend on submit', () => {
      authService.resetPassword.mockReturnValue(
        throwError(() => new HttpErrorResponse({
          status: 400,
          error: { code: 'INVALID_OR_EXPIRED_TOKEN', message: 'Password reset token is invalid or has expired.' },
        }))
      );

      component.form.controls.newPassword.setValue('ValidPass123!');
      component.form.controls.confirmPassword.setValue('ValidPass123!');
      fixture.detectChanges();

      component.submit();
      fixture.detectChanges();

      expect(component.succeeded()).toBe(false);
      expect(component.error()).toContain('Password reset token is invalid or has expired.');
    });
  });

  describe('with expired token on load', () => {
    beforeEach(async () => {
      authService = {
        resetPassword: vi.fn(),
        validateResetToken: vi.fn().mockReturnValue(
          of({ valid: false, status: 'EXPIRED', message: 'This password reset link has expired. Password reset links are valid for 15 minutes.' })
        ),
      };

      await TestBed.configureTestingModule({
        imports: [ResetPasswordComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authService },
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: {
                queryParamMap: { get: () => 'expired-token' },
                fragment: null,
              },
            },
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(ResetPasswordComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('shows expired token state and request new reset link button', () => {
      expect(component.tokenValid()).toBe(false);
      expect(component.tokenInvalidStatus()).toBe('EXPIRED');
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Link Expired');
      expect(el.textContent).toContain('15 minutes');
      expect(el.querySelector('a.button-primary')?.getAttribute('href')).toBe('/forgot-password');
      expect(el.querySelector('input#new-password')).toBeNull();
    });
  });

  describe('with already-used token on load', () => {
    beforeEach(async () => {
      authService = {
        resetPassword: vi.fn(),
        validateResetToken: vi.fn().mockReturnValue(
          of({ valid: false, status: 'ALREADY_USED', message: 'This password reset link has already been used. Please request a new one.' })
        ),
      };

      await TestBed.configureTestingModule({
        imports: [ResetPasswordComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authService },
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: {
                queryParamMap: { get: () => 'consumed-token' },
                fragment: null,
              },
            },
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(ResetPasswordComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('shows already used state and request new reset link button', () => {
      expect(component.tokenValid()).toBe(false);
      expect(component.tokenInvalidStatus()).toBe('ALREADY_USED');
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Link Already Used');
      expect(el.querySelector('a.button-primary')?.getAttribute('href')).toBe('/forgot-password');
      expect(el.querySelector('input#new-password')).toBeNull();
    });
  });

  describe('with missing token', () => {
    beforeEach(async () => {
      authService = {
        resetPassword: vi.fn(),
        validateResetToken: vi.fn(),
      };

      await TestBed.configureTestingModule({
        imports: [ResetPasswordComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authService },
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: {
                queryParamMap: { get: () => null },
                fragment: null,
              },
            },
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(ResetPasswordComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('shows missing token warning and link to request a new link', () => {
      expect(component.missingToken()).toBe(true);
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Invalid or Missing Token');
      expect(el.querySelector('a.button-primary')?.getAttribute('href')).toBe('/forgot-password');
    });
  });
});
