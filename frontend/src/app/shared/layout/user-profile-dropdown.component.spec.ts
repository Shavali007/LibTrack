import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService, UserProfile } from '../../features/auth/auth.service';
import { BorrowingService } from '../../features/circulation/borrowing.service';
import { WishlistService } from '../../features/wishlist/wishlist.service';
import { ReservationService } from '../../features/reservations/reservation.service';
import { UserProfileDropdownComponent } from './user-profile-dropdown.component';

describe('UserProfileDropdownComponent across Student, Faculty, and Librarian roles', () => {
  let fixture: ComponentFixture<UserProfileDropdownComponent>;
  let component: UserProfileDropdownComponent;
  let element: HTMLElement;
  let profileSignal: ReturnType<typeof signal<UserProfile | null>>;
  let mockAuth: { profile: typeof profileSignal; logout: ReturnType<typeof vi.fn>; updateProfile: ReturnType<typeof vi.fn> };
  let mockBorrowing: { currentLoans: ReturnType<typeof vi.fn>; loanHistory: ReturnType<typeof vi.fn> };
  let mockWishlist: { loadMyWishlist: ReturnType<typeof vi.fn> };
  let mockReservation: { getCounts: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    profileSignal = signal<UserProfile | null>({
      id: 'student-123',
      email: 'student@example.edu',
      role: 'STUDENT',
      displayName: 'Alice Student',
      department: 'Computer Science and Engineering (CSE)'
    });

    mockAuth = {
      profile: profileSignal,
      logout: vi.fn(() => of(undefined)),
      updateProfile: vi.fn((newName: string) => {
        const updated = { ...profileSignal()!, displayName: newName };
        profileSignal.set(updated);
        return of(updated);
      })
    };

    mockBorrowing = {
      currentLoans: vi.fn(() => of({ totalElements: 8, content: [] } as any)),
      loanHistory: vi.fn(() => of({ totalElements: 4, content: [] } as any))
    };

    mockWishlist = {
      loadMyWishlist: vi.fn(() => of(new Array(5).fill({ id: 'w1' }) as any))
    };

    mockReservation = {
      getCounts: vi.fn(() => of({ all: 3, waiting: 1, inQueue: 1, readyForPickup: 1, completed: 0, cancelled: 0 }))
    };

    await TestBed.configureTestingModule({
      imports: [UserProfileDropdownComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuth },
        { provide: BorrowingService, useValue: mockBorrowing },
        { provide: WishlistService, useValue: mockWishlist },
        { provide: ReservationService, useValue: mockReservation }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserProfileDropdownComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('renders student trigger button with initial, name, and role subtitle', () => {
    const avatar = element.querySelector('.user-avatar');
    expect(avatar?.textContent?.trim()).toBe('A');

    const name = element.querySelector('.user-name');
    expect(name?.textContent?.trim()).toBe('Alice Student');

    const role = element.querySelector('.user-role');
    expect(role?.textContent?.trim()).toBe('Student');

    const chevron = element.querySelector('.chevron-svg');
    expect(chevron).not.toBeNull();
    expect(element.querySelector('.user-dropdown-card')).toBeNull();
  });

  it('opens and renders student dropdown with forest-green header and badge', () => {
    const trigger = element.querySelector('.user-profile-trigger') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    const dropdown = element.querySelector('.user-dropdown-card');
    expect(dropdown).not.toBeNull();

    const header = dropdown?.querySelector('.profile-header');
    expect(header).not.toBeNull();
    expect(header?.querySelector('.header-avatar')?.textContent?.trim()).toBe('A');
    expect(header?.querySelector('.header-name')?.textContent?.trim()).toBe('Alice Student');
    expect(header?.querySelector('.header-email')?.textContent?.trim()).toBe('student@example.edu');

    const roleBadge = header?.querySelector('.role-badge');
    expect(roleBadge?.textContent).toContain('STUDENT');

    // Menu options
    expect(dropdown?.textContent).toContain('My Profile');
    expect(dropdown?.textContent).toContain('Settings');
    expect(dropdown?.textContent).toContain('Help & Support');
    expect(dropdown?.textContent).toContain('Sign out');

    // Sign out button styled
    const signoutBtn = dropdown?.querySelector('.btn-signout') as HTMLButtonElement;
    expect(signoutBtn).not.toBeNull();
  });

  it('renders faculty trigger and dropdown with Faculty Member designation and FACULTY badge', () => {
    profileSignal.set({
      id: 'faculty-456',
      email: 'miller@example.edu',
      role: 'FACULTY',
      displayName: 'Prof. Miller',
      department: 'Mechanical Engineering'
    });
    fixture.detectChanges();

    expect(element.querySelector('.user-avatar')?.textContent?.trim()).toBe('P');
    expect(element.querySelector('.user-name')?.textContent?.trim()).toBe('Prof. Miller');
    expect(element.querySelector('.user-role')?.textContent?.trim()).toBe('Faculty Member');

    const trigger = element.querySelector('.user-profile-trigger') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    const header = element.querySelector('.profile-header');
    expect(header?.querySelector('.header-name')?.textContent?.trim()).toBe('Prof. Miller');
    expect(header?.querySelector('.header-email')?.textContent?.trim()).toBe('miller@example.edu');
    expect(header?.querySelector('.role-badge')?.textContent).toContain('FACULTY');
  });

  it('renders librarian trigger and dropdown with Library Administrator designation and LIBRARIAN badge', () => {
    profileSignal.set({
      id: 'lib-789',
      email: 'shavalimahammad@gmail.com',
      role: 'LIBRARIAN',
      displayName: 'Shavalimahammad'
    });
    fixture.detectChanges();

    expect(element.querySelector('.user-avatar')?.textContent?.trim()).toBe('S');
    expect(element.querySelector('.user-name')?.textContent?.trim()).toBe('Shavalimahammad');
    expect(element.querySelector('.user-role')?.textContent?.trim()).toBe('Library Administrator');

    const trigger = element.querySelector('.user-profile-trigger') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    const header = element.querySelector('.profile-header');
    expect(header?.querySelector('.header-name')?.textContent?.trim()).toBe('Shavalimahammad');
    expect(header?.querySelector('.header-email')?.textContent?.trim()).toBe('shavalimahammad@gmail.com');
    expect(header?.querySelector('.role-badge')?.textContent).toContain('LIBRARIAN');

    // Librarian has direct Settings link
    const settingsLink = element.querySelector('a[href="/workspace/librarian/settings"]');
    expect(settingsLink).not.toBeNull();
    expect(settingsLink?.textContent).toContain('Settings');
  });

  it('closes dropdown on escape key and outside click', () => {
    component.isOpen.set(true);
    fixture.detectChanges();
    expect(element.querySelector('.user-dropdown-card')).not.toBeNull();

    // Escape key
    component.onEscapeKey();
    fixture.detectChanges();
    expect(element.querySelector('.user-dropdown-card')).toBeNull();

    // Reopen and outside click
    component.isOpen.set(true);
    fixture.detectChanges();
    component.onDocumentClick(new MouseEvent('click'));
    fixture.detectChanges();
    expect(element.querySelector('.user-dropdown-card')).toBeNull();
  });

  it('handles sign out by invoking auth.logout and navigating to public home', () => {
    component.isOpen.set(true);
    fixture.detectChanges();

    const signoutBtn = element.querySelector('.btn-signout') as HTMLButtonElement;
    signoutBtn.click();
    fixture.detectChanges();

    expect(mockAuth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(component.isOpen()).toBe(false);
  });

  it('opens and closes My Profile details modal with redesigned structure', () => {
    component.isOpen.set(true);
    fixture.detectChanges();

    const myProfileBtn = element.querySelector('.dropdown-menu-item') as HTMLButtonElement;
    expect(myProfileBtn.textContent).toContain('My Profile');
    myProfileBtn.click();
    fixture.detectChanges();

    expect(component.isOpen()).toBe(false);
    const modal = element.querySelector('.my-profile-modal-card');
    expect(modal).not.toBeNull();
    expect(element.querySelector('.modal-title')?.textContent).toContain('My Profile');
    expect(element.querySelector('.modal-subtitle')?.textContent).toContain('Your library identity and account details');

    // Decorative wave art in header
    expect(element.querySelector('.header-wave-art')).not.toBeNull();

    // Large avatar with initial and camera pill badge
    expect(element.querySelector('.profile-large-avatar')?.textContent?.trim()).toBe('A');
    expect(element.querySelector('.camera-pill-badge')).not.toBeNull();

    // Hero details
    expect(element.querySelector('.hero-user-name')?.textContent).toContain('Alice Student');
    expect(element.querySelector('.role-badge-pill')?.textContent).toContain('STUDENT');
    expect(element.querySelector('.hero-meta-rows')?.textContent).toContain('student@example.edu');

    // Close modal via footer button
    const closeBtn = element.querySelector('.btn-profile-close') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();
    fixture.detectChanges();
    expect(element.querySelector('.my-profile-modal-card')).toBeNull();
  });

  it('renders library activity summary cards with real counts from services', () => {
    component.openMyProfile();
    fixture.detectChanges();

    const activityCards = element.querySelectorAll('.activity-card');
    expect(activityCards.length).toBe(3);

    // Books Borrowed (cur 8 + hist 4 = 12)
    expect(activityCards[0].textContent).toContain('12');
    expect(activityCards[0].textContent).toContain('Books Borrowed');

    // Wishlist (5 items)
    expect(activityCards[1].textContent).toContain('5');
    expect(activityCards[1].textContent).toContain('In Wishlist');

    // Reservations (3 items)
    expect(activityCards[2].textContent).toContain('3');
    expect(activityCards[2].textContent).toContain('Reservations');
  });

  it('renders read-only account information table with labels, colons, and verified status', () => {
    component.openMyProfile();
    fixture.detectChanges();

    const infoTable = element.querySelector('.account-info-table');
    expect(infoTable).not.toBeNull();

    const rows = infoTable?.querySelectorAll('.info-row');
    expect(rows?.length).toBe(4);

    // Full Name
    expect(rows?.[0].textContent).toContain('Full Name');
    expect(rows?.[0].textContent).toContain('Alice Student');

    // Account Role
    expect(rows?.[1].textContent).toContain('Account Role');
    expect(rows?.[1].textContent).toContain('Student (STUDENT)');

    // Department
    expect(rows?.[2].textContent).toContain('Department');
    expect(rows?.[2].textContent).toContain('Computer Science and Engineering (CSE)');

    // Library Status
    expect(rows?.[3].textContent).toContain('Library Status');
    expect(rows?.[3].textContent).toContain('Active & Verified');
  });

  it('allows editing display name/username and updating via auth.updateProfile', () => {
    component.openMyProfile();
    fixture.detectChanges();

    const editBtn = element.querySelector('.btn-edit-profile') as HTMLButtonElement;
    expect(editBtn).not.toBeNull();
    editBtn.click();
    fixture.detectChanges();

    // Inline edit form is now visible
    const input = element.querySelector('.input-edit-name') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe('Alice Student');

    // Input new name
    input.value = 'Alice Cooper';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // Click Save
    const saveBtn = element.querySelector('.btn-edit-save') as HTMLButtonElement;
    saveBtn.click();
    fixture.detectChanges();

    expect(mockAuth.updateProfile).toHaveBeenCalledWith('Alice Cooper');
    expect(component.isEditingName()).toBe(false);
    expect(element.querySelector('.hero-user-name')?.textContent).toContain('Alice Cooper');
  });

  it('validates username length when saving in edit mode', () => {
    component.openMyProfile();
    fixture.detectChanges();

    const editBtn = element.querySelector('.btn-edit-profile') as HTMLButtonElement;
    editBtn.click();
    fixture.detectChanges();

    const input = element.querySelector('.input-edit-name') as HTMLInputElement;
    input.value = 'A'; // Too short (< 2 characters)
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const saveBtn = element.querySelector('.btn-edit-save') as HTMLButtonElement;
    saveBtn.click();
    fixture.detectChanges();

    expect(mockAuth.updateProfile).not.toHaveBeenCalled();
    expect(element.querySelector('.edit-name-error')?.textContent).toContain('at least 2 characters');

    // Cancel editing
    const cancelBtn = element.querySelector('.btn-edit-cancel') as HTMLButtonElement;
    cancelBtn.click();
    fixture.detectChanges();

    expect(component.isEditingName()).toBe(false);
  });

  it('renders role-specific details in My Profile for Faculty and Librarian', () => {
    // Faculty
    profileSignal.set({
      id: 'faculty-99',
      email: 'dr.ramesh@vitap.ac.in',
      role: 'FACULTY',
      displayName: 'Dr. K. Ramesh',
      department: 'Mechanical Engineering'
    });
    component.openMyProfile();
    fixture.detectChanges();

    expect(element.querySelector('.role-badge-pill')?.textContent).toContain('FACULTY');
    expect(element.querySelector('.account-info-table')?.textContent).toContain('Faculty Member (FACULTY)');
    expect(element.querySelector('.account-info-table')?.textContent).toContain('Mechanical Engineering');

    // Librarian
    profileSignal.set({
      id: 'lib-101',
      email: 'librarian@vitap.ac.in',
      role: 'LIBRARIAN',
      displayName: 'Chief Librarian',
      department: ''
    });
    component.openMyProfile();
    fixture.detectChanges();

    expect(element.querySelector('.role-badge-pill')?.textContent).toContain('LIBRARIAN');
    expect(element.querySelector('.account-info-table')?.textContent).toContain('Library Administrator (LIBRARIAN)');
    expect(element.querySelector('.account-info-table')?.textContent).toContain('Central Library');
  });

  it('closes My Profile modal via top-right close button and escape key', () => {
    component.openMyProfile();
    fixture.detectChanges();
    expect(component.profileModalOpen()).toBe(true);

    // Top-right close button
    const topCloseBtn = element.querySelector('.btn-close-profile') as HTMLButtonElement;
    expect(topCloseBtn).not.toBeNull();
    topCloseBtn.click();
    fixture.detectChanges();
    expect(component.profileModalOpen()).toBe(false);

    // Escape key
    component.openMyProfile();
    fixture.detectChanges();
    expect(component.profileModalOpen()).toBe(true);
    component.onEscapeKey();
    fixture.detectChanges();
    expect(component.profileModalOpen()).toBe(false);
  });

  it('opens and closes Help & Support modal', () => {
    component.isOpen.set(true);
    fixture.detectChanges();

    const items = element.querySelectorAll('.dropdown-menu-item');
    const helpBtn = items[items.length - 1] as HTMLButtonElement;
    expect(helpBtn.textContent).toContain('Help & Support');
    helpBtn.click();
    fixture.detectChanges();

    expect(component.isOpen()).toBe(false);
    expect(element.querySelector('.profile-modal-card')).not.toBeNull();
    expect(element.querySelector('.modal-title')?.textContent).toContain('Help & Support');
    expect(element.querySelector('.help-card-list')).not.toBeNull();

    // Close modal
    const closeBtn = element.querySelector('.modal-footer button') as HTMLButtonElement;
    closeBtn.click();
    fixture.detectChanges();
    expect(element.querySelector('.profile-modal-card')).toBeNull();
  });

  it('renders Settings link navigating to /workspace/settings for Student and Faculty', () => {
    component.isOpen.set(true);
    fixture.detectChanges();

    const items = element.querySelectorAll('.dropdown-menu-item');
    const settingsLink = items[1] as HTMLAnchorElement;
    expect(settingsLink.textContent).toContain('Settings');
    expect(settingsLink.getAttribute('href')).toBe('/workspace/settings');

    component.closeMenu();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(false);
  });
});
