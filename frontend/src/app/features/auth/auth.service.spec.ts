import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads and stores the current profile', () => {
    const profile = { id: 'abc', email: 'reader@example.edu', role: 'STUDENT' as const };
    service.loadCurrentUser().subscribe((result) => expect(result).toEqual(profile));
    http.expectOne('/api/v1/auth/me').flush(profile);
    expect(service.profile()).toEqual(profile);
  });

  it('gets a CSRF token before submitting login and stores the response profile', () => {
    const credentials = { email: 'reader@example.edu', password: 'a long test password' };
    const profile = { id: 'abc', email: credentials.email, role: 'STUDENT' as const };
    service.login(credentials).subscribe((result) => expect(result).toEqual(profile));

    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'csrf-value' });
    const request = http.expectOne('/api/v1/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(credentials);
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('csrf-value');
    request.flush(profile);
    expect(service.profile()).toEqual(profile);
  });

  it('gets a CSRF token before logout and clears the profile after success', () => {
    service.profile.set({ id: 'abc', email: 'reader@example.edu', role: 'STUDENT' });
    service.logout().subscribe();
    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'csrf-value' });
    const request = http.expectOne('/api/v1/auth/logout');
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('csrf-value');
    request.flush(null);
    expect(service.profile()).toBeNull();
  });

  it('provisions only the explicit student or faculty request and uses CSRF protection', () => {
    const requestBody = {
      email: 'new.reader@example.edu', institutionalId: 'STU-99', password: 'a long test password',
      role: 'STUDENT' as const, identityVerified: true as const,
    };
    service.provisionAccount(requestBody).subscribe();
    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'csrf-value' });
    const request = http.expectOne('/api/v1/librarian/accounts');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.role).toBe('STUDENT');
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('csrf-value');
    request.flush({ id: 'new', email: requestBody.email, role: 'STUDENT' });
  });

  it('rejects an incomplete CSRF response before making a state-changing request', () => {
    let error: unknown;
    service.login({ email: 'reader@example.edu', password: 'a long test password' }).subscribe({ error: (value) => error = value });
    http.expectOne('/api/v1/auth/csrf').flush({ headerName: '', token: '' });
    expect(error).toBeInstanceOf(Error);
    http.expectNone('/api/v1/auth/login');
  });

  it('submits email verification with a fresh CSRF token and does not create a session profile', () => {
    service.verifyEmail('secure-token-from-link').subscribe(response => expect(response.status).toBe('VERIFIED'));
    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'csrf-verify' });
    const request = http.expectOne('/api/v1/auth/verify-email');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ token: 'secure-token-from-link' });
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('csrf-verify');
    request.flush({ status: 'VERIFIED', message: 'Verified' });
    expect(service.profile()).toBeNull();
  });

  it('sends self-registration with CSRF and does not authenticate pending accounts', () => {
    const body = { email: 'shavali.23mic7248@vitapstudent.ac.in', password: 'SecurePass1!', confirmPassword: 'SecurePass1!', role: 'STUDENT' as const };
    service.register(body).subscribe(response => expect(response.status).toBe('PENDING_VERIFICATION'));
    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'csrf-value' });
    const request = http.expectOne('/api/v1/auth/register');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('csrf-value');
    request.flush({ status: 'PENDING_VERIFICATION', message: 'Waiting for email verification.' });
    expect(service.profile()).toBeNull();
  });});
