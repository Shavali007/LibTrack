import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemberSettingsComponent } from './member-settings.component';
import { MemberSettingsService, UserSettings, NotificationPreferences } from './member-settings.service';
import { AuthService } from '../auth/auth.service';

describe('MemberSettingsComponent', () => {
  let fixture: ComponentFixture<MemberSettingsComponent>;
  let component: MemberSettingsComponent;

  const mockSettings: UserSettings = {
    id: 'user-123',
    displayName: 'Mahammad',
    username: 'Mahammad',
    email: 'mahammad@vitap.ac.in',
    institutionalId: '23MIC7248',
    department: 'Computer Science and Engineering (CSE)',
    designation: 'Student',
    role: 'STUDENT',
    notificationPreferences: {
      borrowRequestUpdates: true,
      loanDueReminders: true,
      overdueFineAlerts: true,
      bookRecommendations: true,
      newBookArrivals: true,
      wishlistBookAlerts: true,
      departmentBookArrivals: true,
      libraryAnnouncements: true,
    }
  };

  const mockFacultySettings: UserSettings = {
    id: 'faculty-456',
    displayName: 'Dr. K. Ramesh',
    username: 'Dr. K. Ramesh',
    email: 'k.ramesh@vitap.ac.in',
    institutionalId: 'EMP1024',
    department: 'Computer Science and Engineering (CSE)',
    designation: 'Associate Professor',
    role: 'FACULTY',
    notificationPreferences: {
      borrowRequestUpdates: true,
      loanDueReminders: true,
      overdueFineAlerts: true,
      bookRecommendations: true,
      newBookArrivals: true,
      wishlistBookAlerts: true,
      departmentBookArrivals: true,
      libraryAnnouncements: true,
    }
  };

  const mockLibrarianSettings: UserSettings = {
    id: 'librarian-789',
    displayName: 'Head Librarian',
    username: 'librarian',
    email: 'librarian@libtrack.local',
    institutionalId: null,
    department: null,
    designation: 'Library Administrator',
    role: 'LIBRARIAN',
    notificationPreferences: {
      borrowRequestUpdates: true,
      loanDueReminders: true,
      overdueFineAlerts: true,
      bookRecommendations: true,
      newBookArrivals: true,
      wishlistBookAlerts: true,
      departmentBookArrivals: true,
      libraryAnnouncements: true,
    }
  };

  let settingsServiceMock: {
    getUserSettings: ReturnType<typeof vi.fn>;
    updateUsername: ReturnType<typeof vi.fn>;
    getNotificationPreferences: ReturnType<typeof vi.fn>;
    updateNotificationPreferences: ReturnType<typeof vi.fn>;
    changePassword: ReturnType<typeof vi.fn>;
  };

  let authServiceMock: {
    loadCurrentUser: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    settingsServiceMock = {
      getUserSettings: vi.fn().mockReturnValue(of(mockSettings)),
      updateUsername: vi.fn().mockReturnValue(of({ username: 'Mahammad.Ali' })),
      getNotificationPreferences: vi.fn().mockReturnValue(of(mockSettings.notificationPreferences)),
      updateNotificationPreferences: vi.fn().mockReturnValue(of({
        ...mockSettings.notificationPreferences,
        borrowRequestUpdates: false,
      })),
      changePassword: vi.fn().mockReturnValue(of({ message: 'Password updated successfully.' })),
    };

    authServiceMock = {
      loadCurrentUser: vi.fn().mockReturnValue(of({
        id: 'user-123',
        email: 'mahammad@vitap.ac.in',
        role: 'STUDENT',
        displayName: 'Mahammad'
      })),
    };

    await TestBed.configureTestingModule({
      imports: [MemberSettingsComponent],
      providers: [
        { provide: MemberSettingsService, useValue: settingsServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MemberSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('1. should create and load Student settings on initialization', () => {
    expect(component).toBeTruthy();
    expect(settingsServiceMock.getUserSettings).toHaveBeenCalled();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.settings-title')?.textContent).toContain('Settings');
    expect(element.querySelector('.profile-display-name')?.textContent).toContain('Mahammad');
    expect(element.querySelector('.role-badge')?.textContent).toContain('Student');
    expect(element.textContent).toContain('mahammad@vitap.ac.in');
    expect(element.textContent).toContain('23MIC7248');
    expect(element.textContent).toContain('Computer Science and Engineering (CSE)');
  });

  it('2. should display Faculty designation and role badge for FACULTY user', () => {
    settingsServiceMock.getUserSettings.mockReturnValue(of(mockFacultySettings));
    component.loadSettings();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.profile-display-name')?.textContent).toContain('Dr. K. Ramesh');
    expect(element.querySelector('.role-badge')?.textContent).toContain('Faculty');
    expect(element.textContent).toContain('Associate Professor');
    expect(element.textContent).toContain('EMP1024');
  });

  it('3. should display Librarian role badge for LIBRARIAN user', () => {
    settingsServiceMock.getUserSettings.mockReturnValue(of(mockLibrarianSettings));
    component.loadSettings();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.profile-display-name')?.textContent).toContain('Head Librarian');
    expect(element.querySelector('.role-badge')?.textContent).toContain('Librarian');
    expect(element.textContent).toContain('librarian@libtrack.local');
  });

  it('4. should switch active tabs when tab buttons are clicked and render all 8 notification preferences', () => {
    expect(component.activeTab()).toBe('account');

    component.setTab('notifications');
    fixture.detectChanges();
    expect(component.activeTab()).toBe('notifications');

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.notifications-card')).not.toBeNull();
    expect(element.textContent).toContain('Borrow Request Updates');
    expect(element.textContent).toContain('Due Date Reminders');
    expect(element.textContent).toContain('Overdue & Fine Alerts');
    expect(element.textContent).toContain('Book Recommendations');
    expect(element.textContent).toContain('New Book Arrivals');
    expect(element.textContent).toContain('Wishlist-Based Book Alerts');
    expect(element.textContent).toContain('Department Book Arrivals');
    expect(element.textContent).toContain('Library Announcements');

    component.setTab('security');
    fixture.detectChanges();
    expect(component.activeTab()).toBe('security');
    expect(element.querySelector('.security-card')).not.toBeNull();
    expect(element.textContent).toContain('Current Password');
    expect(element.textContent).toContain('New Password');
  });

  it('5. should open modal and update username successfully', () => {
    component.openEditUsernameModal();
    expect(component.isEditModalOpen()).toBe(true);
    expect(component.editUsernameValue).toBe('Mahammad');

    component.editUsernameValue = 'Mahammad.Ali';
    component.submitUsernameChange();

    expect(settingsServiceMock.updateUsername).toHaveBeenCalledWith('Mahammad.Ali');
    expect(component.isEditModalOpen()).toBe(false);
    expect(component.userSettings()?.displayName).toBe('Mahammad.Ali');
    expect(component.successMessage()).toContain('Username updated successfully');
  });

  it('6. should handle duplicate username error on username update', () => {
    settingsServiceMock.updateUsername.mockReturnValue(
      throwError(() => ({ status: 409, error: { message: 'Username is already taken.' } }))
    );

    component.openEditUsernameModal();
    component.editUsernameValue = 'Dr. K. Ramesh';
    component.submitUsernameChange();

    expect(component.isEditModalOpen()).toBe(true);
    expect(component.modalError()).toContain('already taken');
  });

  it('7. should toggle notification preferences and persist via service', () => {
    component.setTab('notifications');
    fixture.detectChanges();

    component.togglePreference('borrowRequestUpdates');
    expect(settingsServiceMock.updateNotificationPreferences).toHaveBeenCalledWith({
      borrowRequestUpdates: false
    });
    expect(component.preferences().borrowRequestUpdates).toBe(false);
    expect(component.successMessage()).toContain('Notification preference saved');
  });

  it('8. should toggle new book and department arrival preferences independently', () => {
    settingsServiceMock.updateNotificationPreferences.mockImplementation((pref) => of({
      ...mockSettings.notificationPreferences,
      ...pref
    }));

    component.setTab('notifications');
    fixture.detectChanges();

    component.togglePreference('newBookArrivals');
    expect(settingsServiceMock.updateNotificationPreferences).toHaveBeenCalledWith({
      newBookArrivals: false
    });
    expect(component.preferences().newBookArrivals).toBe(false);

    component.togglePreference('departmentBookArrivals');
    expect(settingsServiceMock.updateNotificationPreferences).toHaveBeenCalledWith({
      departmentBookArrivals: false
    });
    expect(component.preferences().departmentBookArrivals).toBe(false);
  });

  it('9. should prevent repeated clicks and show updating state while saving preference', () => {
    const subject = new Subject<NotificationPreferences>();
    settingsServiceMock.updateNotificationPreferences.mockReturnValue(subject.asObservable());

    component.setTab('notifications');
    fixture.detectChanges();

    component.togglePreference('loanDueReminders');
    expect(component.isUpdating('loanDueReminders')).toBe(true);
    expect(settingsServiceMock.updateNotificationPreferences).toHaveBeenCalledTimes(1);

    // Second click while in-flight should be ignored
    component.togglePreference('loanDueReminders');
    expect(settingsServiceMock.updateNotificationPreferences).toHaveBeenCalledTimes(1);

    // Other preference remains usable
    expect(component.isUpdating('overdueFineAlerts')).toBe(false);

    // Resolve update
    subject.next({ ...mockSettings.notificationPreferences, loanDueReminders: false });
    subject.complete();

    expect(component.isUpdating('loanDueReminders')).toBe(false);
    expect(component.preferences().loanDueReminders).toBe(false);
  });

  it('10. should revert switch state and show error message if save fails', () => {
    settingsServiceMock.updateNotificationPreferences.mockReturnValue(
      throwError(() => new Error('Server error'))
    );

    component.setTab('notifications');
    fixture.detectChanges();

    const before = component.preferences().overdueFineAlerts;
    expect(before).toBe(true);

    component.togglePreference('overdueFineAlerts');
    expect(component.preferences().overdueFineAlerts).toBe(true); // Reverted back to true
    expect(component.errorMessage()).toContain('Failed to update notification preferences');
  });

  it('11. should validate password rules and submit password change', () => {
    component.setTab('security');
    fixture.detectChanges();

    component.currentPassword = 'OldPass123!';
    component.newPassword = 'NewSecurePass123!';
    component.confirmPassword = 'NewSecurePass123!';

    expect(component.isPasswordFormValid()).toBe(true);

    component.submitPasswordChange();
    expect(settingsServiceMock.changePassword).toHaveBeenCalledWith({
      currentPassword: 'OldPass123!',
      newPassword: 'NewSecurePass123!',
      confirmPassword: 'NewSecurePass123!'
    });
    expect(component.successMessage()).toContain('Password updated successfully');
  });

  it('12. should toggle New Book Arrivals and Wishlist-Based Book Alerts independently', () => {
    component.setTab('notifications');
    fixture.detectChanges();

    settingsServiceMock.updateNotificationPreferences.mockReturnValue(of({
      ...mockSettings.notificationPreferences,
      newBookArrivals: false
    }));

    component.togglePreference('newBookArrivals');
    expect(settingsServiceMock.updateNotificationPreferences).toHaveBeenCalledWith({ newBookArrivals: false });
    expect(component.preferences().newBookArrivals).toBe(false);
    expect(component.preferences().wishlistBookAlerts).toBe(true);

    settingsServiceMock.updateNotificationPreferences.mockReturnValue(of({
      ...mockSettings.notificationPreferences,
      newBookArrivals: false,
      wishlistBookAlerts: false
    }));

    component.togglePreference('wishlistBookAlerts');
    expect(settingsServiceMock.updateNotificationPreferences).toHaveBeenCalledWith({ wishlistBookAlerts: false });
    expect(component.preferences().wishlistBookAlerts).toBe(false);
    expect(component.preferences().newBookArrivals).toBe(false);
  });
});
