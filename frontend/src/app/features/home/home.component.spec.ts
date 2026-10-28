import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthService, UserProfile } from '../auth/auth.service';
import { HomeComponent } from './home.component';

describe('role-aware dashboards', () => {
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

  it('uses the authenticated Student profile and real service links without sample records', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('reader@vitap.ac.in');
    expect(text).toContain('STUDENT WORKSPACE');
    expect(text).toContain('My borrowings');
    expect(text).toContain('My requests');
    expect(text).toContain('Search books');
    expect(text).not.toContain('Clean Code');
    expect(fixture.nativeElement.querySelector('a[href="/books"]')).not.toBeNull();
  });

  it('shows Faculty borrowing services and identifies recommendations as unavailable', () => {
    currentProfile.set({ id: 'faculty-1', email: 'faculty@vitap.ac.in', role: 'FACULTY' });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('FACULTY WORKSPACE');
    expect(text).toContain('My borrowings');
    expect(text).toContain('Faculty-to-student recommendations are not implemented.');
  });

  it('shows Librarian operational links without inventing reports or counts', () => {
    currentProfile.set({ id: 'staff-1', email: 'librarian@vitap.ac.in', role: 'LIBRARIAN' });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('LIBRARIAN WORKSPACE');
    expect(text).toContain('Borrowing requests');
    expect(text).toContain('Circulation desk');
    expect(fixture.nativeElement.querySelector('a[href="/workspace/librarian/accounts/new"]')).not.toBeNull();
    expect(text).not.toContain('12 / 20');
  });
});