import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthService, UserProfile } from '../auth/auth.service';
import { HomeComponent } from './home.component';

describe('HomeComponent role-aware dashboards', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let currentProfile: ReturnType<typeof signal<UserProfile | null>>;

  beforeEach(async () => {
    currentProfile = signal<UserProfile | null>({
      id: 'member-1',
      email: 'reader@vitapstudent.ac.in',
      role: 'STUDENT',
      displayName: 'Mahammad'
    });
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { profile: currentProfile } }
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('renders student dashboard with student welcome and without institutional email', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('STUDENT WORKSPACE');
    expect(text).toContain('Welcome, Mahammad!');
    expect(text).not.toContain('reader@vitapstudent.ac.in');
    expect(fixture.nativeElement.querySelector('app-member-dashboard')).not.toBeNull();
  });

  it('renders faculty dashboard with faculty welcome and without institutional email', () => {
    currentProfile.set({
      id: 'faculty-1',
      email: 'faculty@vitap.ac.in',
      role: 'FACULTY',
      displayName: 'Dr. Alan'
    });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('FACULTY WORKSPACE');
    expect(text).toContain('Welcome, Dr. Alan!');
    expect(text).not.toContain('faculty@vitap.ac.in');
    expect(fixture.nativeElement.querySelector('app-member-dashboard')).not.toBeNull();
  });

  it('renders librarian dashboard unchanged for librarian role', () => {
    currentProfile.set({
      id: 'staff-1',
      email: 'librarian@vitap.ac.in',
      role: 'LIBRARIAN',
      displayName: 'Librarian Administrator'
    });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('LIBRARIAN WORKSPACE');
    expect(fixture.nativeElement.querySelector('app-librarian-dashboard')).not.toBeNull();
  });
});
