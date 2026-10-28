import { ActivatedRoute, Router } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { VerifyEmailComponent, verificationTokenFromLocation } from './verify-email.component';

describe('verification URL contract', () => {
  it('extracts the complete backend #fragment format before route cleanup', async () => {
    const token = 'A'.repeat(43); // 32-byte Base64URL token emitted by RegistrationVerificationService
    const generatedUrl = `http://localhost:4200/verify-email#${token}`;
    expect(verificationTokenFromLocation(null, generatedUrl)).toBe(token);
    const previousUrl = window.location.href;
    window.history.replaceState({}, '', `/verify-email#${token}`);

    const calls: string[] = [];
    const auth = { verifyEmail: vi.fn((submitted: string) => {
      calls.push(`submit:${submitted}`);
      return of({ status: 'VERIFIED' as const, message: 'Verified' });
    }) };
    const router = { navigateByUrl: vi.fn(() => { calls.push('cleanup'); return Promise.resolve(true); }) };
    await TestBed.configureTestingModule({ imports: [VerifyEmailComponent], providers: [
      { provide: AuthService, useValue: auth },
      { provide: ActivatedRoute, useValue: { snapshot: { fragment: null } } },
      { provide: Router, useValue: router },
    ] }).compileComponents();
    const fixture = TestBed.createComponent(VerifyEmailComponent);
    fixture.detectChanges();
    expect(auth.verifyEmail).toHaveBeenCalledWith(token);
    expect(calls).toEqual([`submit:${token}`, 'cleanup']);
    fixture.destroy();
    const previous = new URL(previousUrl);
    window.history.replaceState({}, '', `${previous.pathname}${previous.search}${previous.hash}`);
  });
});

describe('VerifyEmailComponent', () => {
  it('submits the supplied token and presents the successful result', async () => {
    const auth = { verifyEmail: vi.fn(() => of({ status: 'VERIFIED' as const, message: 'You can now sign in.' })) };
    const router = { navigateByUrl: vi.fn() };
    await TestBed.configureTestingModule({ imports: [VerifyEmailComponent], providers: [
      { provide: AuthService, useValue: auth },
      { provide: ActivatedRoute, useValue: { snapshot: { fragment: 'one-time-secret' } } },
      { provide: Router, useValue: router },
    ] }).compileComponents();
    const fixture: ComponentFixture<VerifyEmailComponent> = TestBed.createComponent(VerifyEmailComponent);
    fixture.detectChanges();
    expect(auth.verifyEmail).toHaveBeenCalledWith('one-time-secret');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/verify-email', { replaceUrl: true });
    expect(fixture.nativeElement.textContent).toContain('You can now sign in.');
    expect(fixture.nativeElement.textContent).not.toContain('one-time-secret');
  });

  it('does not call the API when the link has no token', async () => {
    const auth = { verifyEmail: vi.fn(() => of({ status: 'VERIFIED' as const, message: 'Verified' })) };
    await TestBed.configureTestingModule({ imports: [VerifyEmailComponent], providers: [
      { provide: AuthService, useValue: auth },
      { provide: ActivatedRoute, useValue: { snapshot: { fragment: null } } },
      { provide: Router, useValue: { navigateByUrl: vi.fn() } },
    ] }).compileComponents();
    const fixture = TestBed.createComponent(VerifyEmailComponent);
    fixture.detectChanges();
    expect(auth.verifyEmail).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('missing its token');
  });

  it('does not mislabel server or CSRF errors as an invalid token', async () => {
    const auth = { verifyEmail: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 403 }))) };
    await TestBed.configureTestingModule({ imports: [VerifyEmailComponent], providers: [
      { provide: AuthService, useValue: auth },
      { provide: ActivatedRoute, useValue: { snapshot: { fragment: 'some-valid-shaped-token-value-123456789012345678901234' } } },
      { provide: Router, useValue: { navigateByUrl: vi.fn() } },
    ] }).compileComponents();
    const fixture = TestBed.createComponent(VerifyEmailComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('could not be completed right now');
    expect(fixture.nativeElement.textContent).not.toContain('invalid, expired, or already used');
  });

  it('shows a generic invalid-or-expired message without echoing the token', async () => {
    const auth = { verifyEmail: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 400 }))) };
    await TestBed.configureTestingModule({ imports: [VerifyEmailComponent], providers: [
      { provide: AuthService, useValue: auth },
      { provide: ActivatedRoute, useValue: { snapshot: { fragment: 'rejected-secret' } } },
      { provide: Router, useValue: { navigateByUrl: vi.fn() } },
    ] }).compileComponents();
    const fixture = TestBed.createComponent(VerifyEmailComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('invalid, expired, or already used');
    expect(fixture.nativeElement.textContent).not.toContain('rejected-secret');
  });
});
