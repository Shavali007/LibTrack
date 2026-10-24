import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { provideRouter } from '@angular/router';
import { AuthService, UserProfile } from '../auth/auth.service';
import { HomeComponent } from './home.component';

describe('Student dashboard', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let currentProfile: ReturnType<typeof signal<UserProfile | null>>;

  beforeEach(async () => {
    currentProfile = signal<UserProfile | null>({ id: 'member-1', email: 'reader@vitap.ac.in', role: 'STUDENT' });
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { profile: currentProfile } }],
    }).compileComponents();
    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('uses the authenticated profile and current date without inventing a display name', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('reader@vitap.ac.in');
    expect(text).toContain('STUDENT DASHBOARD');
    expect(text).not.toContain('Shavali');
  });

  it('labels unsupported library services as unavailable and adds no fake records or counts', () => {
    const text = (fixture.nativeElement.textContent as string).toLowerCase();
    expect(text).toContain('unavailable');
    expect(text).toContain('not available yet');
    expect(text).toContain('search real catalogue records');
    expect(text).not.toContain('clean code');
    expect(text).not.toContain('effective java');
    expect(text).not.toContain('12 / 20');
    expect(fixture.nativeElement.querySelector('a[href="/books"]')?.textContent).toContain('Search books');
  });

  it('does not render the Student dashboard for Faculty or Librarian accounts', () => {
    currentProfile.set({ id: 'faculty-1', email: 'faculty@vitap.ac.in', role: 'FACULTY' });
    fixture.detectChanges();
    let text = fixture.nativeElement.textContent as string;
    expect(text).toContain('A role-specific dashboard is not available for this account yet.');
    expect(text).not.toContain('Library activity');

    currentProfile.set({ id: 'staff-1', email: 'librarian@vitap.ac.in', role: 'LIBRARIAN' });
    fixture.detectChanges();
    text = fixture.nativeElement.textContent as string;
    expect(text).toContain('A role-specific dashboard is not available for this account yet.');
    expect(text).toContain('Provision a member account');
    expect(text).not.toContain('Library activity');
  });
});
