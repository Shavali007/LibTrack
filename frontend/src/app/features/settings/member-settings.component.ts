import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MemberSettingsService, UserSettings, NotificationPreferences } from './member-settings.service';
import { AuthService } from '../auth/auth.service';

export type SettingsTab = 'account' | 'notifications' | 'security';

@Component({
  selector: 'app-member-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-page-container">
      <!-- Page Header -->
      <header class="settings-header">
        <div class="settings-header-icon-wrap" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="settings-header-icon">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </div>
        <div class="settings-header-text">
          <h1 class="settings-title">Settings</h1>
          <p class="settings-subtitle">Manage your account, notifications and security.</p>
        </div>
      </header>

      <!-- Feedback Toast -->
      @if (successMessage()) {
        <div class="feedback-banner banner-success" role="status">
          <svg viewBox="0 0 20 20" fill="currentColor" class="banner-icon">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          <span>{{ successMessage() }}</span>
        </div>
      }

      @if (errorMessage()) {
        <div class="feedback-banner banner-error" role="alert">
          <svg viewBox="0 0 20 20" fill="currentColor" class="banner-icon">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <span>{{ errorMessage() }}</span>
        </div>
      }

      <!-- Main Layout -->
      <div class="settings-layout">
        <!-- Vertical Tab Navigation -->
        <aside class="settings-nav-sidebar" aria-label="Settings Navigation">
          <nav class="settings-nav-list">
            <button
              type="button"
              class="settings-nav-item"
              [class.active]="activeTab() === 'account'"
              (click)="setTab('account')"
              aria-current="activeTab() === 'account' ? 'page' : undefined"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="nav-icon">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Account</span>
            </button>

            <button
              type="button"
              class="settings-nav-item"
              [class.active]="activeTab() === 'notifications'"
              (click)="setTab('notifications')"
              aria-current="activeTab() === 'notifications' ? 'page' : undefined"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="nav-icon">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span>Notifications</span>
            </button>

            <button
              type="button"
              class="settings-nav-item"
              [class.active]="activeTab() === 'security'"
              (click)="setTab('security')"
              aria-current="activeTab() === 'security' ? 'page' : undefined"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="nav-icon">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span>Security</span>
            </button>
          </nav>
        </aside>

        <!-- Tab Content Area -->
        <main class="settings-content-area">
          @if (loading()) {
            <div class="settings-loading-card">
              <div class="spinner" aria-hidden="true"></div>
              <p>Loading settings...</p>
            </div>
          } @else {
            <!-- ACCOUNT TAB -->
            @if (activeTab() === 'account') {
              <section class="settings-card account-card" aria-labelledby="account-details-heading">
                <div class="card-header-row">
                  <div class="card-header-text">
                    <h2 id="account-details-heading" class="card-title">Account Details</h2>
                    <p class="card-subtitle">Your profile information and academic details.</p>
                  </div>
                  <button type="button" class="btn btn-outline edit-btn" (click)="openEditUsernameModal()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                    </svg>
                    <span>Edit Username</span>
                  </button>
                </div>

                <div class="profile-details-body">
                  <div class="profile-avatar-wrap">
                    <div class="profile-avatar" aria-hidden="true">
                      {{ userInitials() }}
                    </div>
                  </div>

                  <div class="profile-fields-list">
                    <div class="profile-name-row">
                      <h3 class="profile-display-name">{{ userSettings()?.displayName || userSettings()?.username }}</h3>
                      <span class="role-badge" [class.badge-faculty]="isFaculty()" [class.badge-librarian]="isLibrarian()">
                        {{ roleLabel() }}
                      </span>
                    </div>

                    <div class="profile-meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="meta-icon">
                        <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                      </svg>
                      <span class="meta-text">{{ userSettings()?.email }}</span>
                    </div>

                    @if (userSettings()?.institutionalId) {
                      <div class="profile-meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="meta-icon">
                          <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                          <circle cx="9" cy="10" r="2"></circle>
                          <path d="M15 8h2"></path>
                          <path d="M15 12h2"></path>
                          <path d="M7 16h10"></path>
                        </svg>
                        <span class="meta-text">{{ userSettings()?.institutionalId }}</span>
                      </div>
                    }

                    @if (userSettings()?.department) {
                      <div class="profile-meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="meta-icon">
                          <path d="M3 21h18"></path>
                          <path d="M5 21V7l8-4v18"></path>
                          <path d="M19 21V11l-6-3"></path>
                          <path d="M9 9v.01"></path>
                          <path d="M9 12v.01"></path>
                          <path d="M9 15v.01"></path>
                          <path d="M9 18v.01"></path>
                        </svg>
                        <span class="meta-text">{{ userSettings()?.department }}</span>
                      </div>
                    }

                    @if (isFaculty() && userSettings()?.designation) {
                      <div class="profile-meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="meta-icon">
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                        </svg>
                        <span class="meta-text">{{ userSettings()?.designation }}</span>
                      </div>
                    }
                  </div>
                </div>

                <div class="academic-info-notice">
                  <svg viewBox="0 0 20 20" fill="currentColor" class="notice-icon">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                  </svg>
                  <span>Academic and verified identity information cannot be edited. Contact the library administration for official record updates.</span>
                </div>
              </section>

              <!-- Change Password Banner / Link to Security -->
              <section class="settings-card change-password-banner" (click)="setTab('security')" role="button" tabindex="0" (keydown.enter)="setTab('security')">
                <div class="banner-left">
                  <div class="banner-icon-wrap" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="banner-svg">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <div class="banner-text">
                    <h3 class="banner-title">Change Password</h3>
                    <p class="banner-subtitle">Update your account password to keep it secure.</p>
                  </div>
                </div>
                <div class="banner-arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="arrow-svg">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </section>
            }

            <!-- NOTIFICATIONS TAB -->
            @if (activeTab() === 'notifications') {
              <section class="settings-card notifications-card" aria-labelledby="notification-pref-heading">
                <div class="card-header-row">
                  <div class="card-header-text">
                    <h2 id="notification-pref-heading" class="card-title">Notification Preferences</h2>
                    <p class="card-subtitle">Choose which notifications and alerts you want to receive.</p>
                  </div>
                </div>

                <div class="toggles-list">
                  <!-- 1. Borrow Request Updates -->
                  <div class="toggle-row">
                    <div class="toggle-info">
                      <h3 class="toggle-title">Borrow Request Updates</h3>
                      <p class="toggle-desc">Receive notifications when your book borrow requests are approved, rejected, or updated.</p>
                    </div>
                    <label class="switch" [class.is-loading]="isUpdating('borrowRequestUpdates')" aria-label="Toggle Borrow Request Updates">
                      <input
                        type="checkbox"
                        [checked]="preferences().borrowRequestUpdates"
                        [disabled]="isUpdating('borrowRequestUpdates')"
                        (change)="togglePreference('borrowRequestUpdates')"
                      />
                      <span class="slider round">
                        @if (isUpdating('borrowRequestUpdates')) {
                          <span class="switch-spinner" aria-hidden="true"></span>
                        }
                      </span>
                    </label>
                  </div>

                  <!-- 2. Loan Due-Date Reminders -->
                  <div class="toggle-row">
                    <div class="toggle-info">
                      <h3 class="toggle-title">Due Date Reminders</h3>
                      <p class="toggle-desc">Receive reminder alerts before your borrowed books reach their due date.</p>
                    </div>
                    <label class="switch" [class.is-loading]="isUpdating('loanDueReminders')" aria-label="Toggle Due Date Reminders">
                      <input
                        type="checkbox"
                        [checked]="preferences().loanDueReminders"
                        [disabled]="isUpdating('loanDueReminders')"
                        (change)="togglePreference('loanDueReminders')"
                      />
                      <span class="slider round">
                        @if (isUpdating('loanDueReminders')) {
                          <span class="switch-spinner" aria-hidden="true"></span>
                        }
                      </span>
                    </label>
                  </div>

                  <!-- 3. Overdue and Fine Notifications -->
                  <div class="toggle-row">
                    <div class="toggle-info">
                      <h3 class="toggle-title">Overdue & Fine Alerts</h3>
                      <p class="toggle-desc">Receive notifications about overdue books and accumulating fine assessments.</p>
                    </div>
                    <label class="switch" [class.is-loading]="isUpdating('overdueFineAlerts')" aria-label="Toggle Overdue & Fine Alerts">
                      <input
                        type="checkbox"
                        [checked]="preferences().overdueFineAlerts"
                        [disabled]="isUpdating('overdueFineAlerts')"
                        (change)="togglePreference('overdueFineAlerts')"
                      />
                      <span class="slider round">
                        @if (isUpdating('overdueFineAlerts')) {
                          <span class="switch-spinner" aria-hidden="true"></span>
                        }
                      </span>
                    </label>
                  </div>

                  <!-- 4. Book Recommendations -->
                  <div class="toggle-row">
                    <div class="toggle-info">
                      <h3 class="toggle-title">Book Recommendations</h3>
                      <p class="toggle-desc">Receive suggestions for books recommended by faculty members or matching your interests.</p>
                    </div>
                    <label class="switch" [class.is-loading]="isUpdating('bookRecommendations')" aria-label="Toggle Book Recommendations">
                      <input
                        type="checkbox"
                        [checked]="preferences().bookRecommendations"
                        [disabled]="isUpdating('bookRecommendations')"
                        (change)="togglePreference('bookRecommendations')"
                      />
                      <span class="slider round">
                        @if (isUpdating('bookRecommendations')) {
                          <span class="switch-spinner" aria-hidden="true"></span>
                        }
                      </span>
                    </label>
                  </div>

                  <!-- 5. New Book Arrivals -->
                  <div class="toggle-row">
                    <div class="toggle-info">
                      <h3 class="toggle-title">New Book Arrivals</h3>
                      <p class="toggle-desc">Receive notifications when new books are added to the library catalogue.</p>
                    </div>
                    <label class="switch" [class.is-loading]="isUpdating('newBookArrivals')" aria-label="Toggle New Book Arrivals">
                      <input
                        type="checkbox"
                        [checked]="preferences().newBookArrivals"
                        [disabled]="isUpdating('newBookArrivals')"
                        (change)="togglePreference('newBookArrivals')"
                      />
                      <span class="slider round">
                        @if (isUpdating('newBookArrivals')) {
                          <span class="switch-spinner" aria-hidden="true"></span>
                        }
                      </span>
                    </label>
                  </div>

                  <!-- Wishlist-Based Book Alerts -->
                  <div class="toggle-row">
                    <div class="toggle-info">
                      <h3 class="toggle-title">Wishlist-Based Book Alerts</h3>
                      <p class="toggle-desc">Get notified when newly added books match categories of books in your wishlist.</p>
                    </div>
                    <label class="switch" [class.is-loading]="isUpdating('wishlistBookAlerts')" aria-label="Toggle Wishlist-Based Book Alerts">
                      <input
                        type="checkbox"
                        [checked]="preferences().wishlistBookAlerts"
                        [disabled]="isUpdating('wishlistBookAlerts')"
                        (change)="togglePreference('wishlistBookAlerts')"
                      />
                      <span class="slider round">
                        @if (isUpdating('wishlistBookAlerts')) {
                          <span class="switch-spinner" aria-hidden="true"></span>
                        }
                      </span>
                    </label>
                  </div>

                  <!-- 6. Department Book Arrivals -->
                  <div class="toggle-row">
                    <div class="toggle-info">
                      <h3 class="toggle-title">Department Book Arrivals</h3>
                      <p class="toggle-desc">Receive notifications when new books relevant to your academic department are added.</p>
                    </div>
                    <label class="switch" [class.is-loading]="isUpdating('departmentBookArrivals')" aria-label="Toggle Department Book Arrivals">
                      <input
                        type="checkbox"
                        [checked]="preferences().departmentBookArrivals"
                        [disabled]="isUpdating('departmentBookArrivals')"
                        (change)="togglePreference('departmentBookArrivals')"
                      />
                      <span class="slider round">
                        @if (isUpdating('departmentBookArrivals')) {
                          <span class="switch-spinner" aria-hidden="true"></span>
                        }
                      </span>
                    </label>
                  </div>

                  <!-- 7. Library Announcements -->
                  <div class="toggle-row">
                    <div class="toggle-info">
                      <h3 class="toggle-title">Library Announcements</h3>
                      <p class="toggle-desc">Receive general announcements, operational updates, and holiday alerts from the library.</p>
                    </div>
                    <label class="switch" [class.is-loading]="isUpdating('libraryAnnouncements')" aria-label="Toggle Library Announcements">
                      <input
                        type="checkbox"
                        [checked]="preferences().libraryAnnouncements"
                        [disabled]="isUpdating('libraryAnnouncements')"
                        (change)="togglePreference('libraryAnnouncements')"
                      />
                      <span class="slider round">
                        @if (isUpdating('libraryAnnouncements')) {
                          <span class="switch-spinner" aria-hidden="true"></span>
                        }
                      </span>
                    </label>
                  </div>
                </div>
              </section>
            }

            <!-- SECURITY TAB -->
            @if (activeTab() === 'security') {
              <section class="settings-card security-card" aria-labelledby="security-heading">
                <div class="card-header-row">
                  <div class="card-header-text">
                    <h2 id="security-heading" class="card-title">Security & Password</h2>
                    <p class="card-subtitle">Update your password to keep your LibTrack account secure.</p>
                  </div>
                </div>

                <form class="password-form" (ngSubmit)="submitPasswordChange()">
                  @if (passwordError()) {
                    <div class="form-error-alert" role="alert">
                      {{ passwordError() }}
                    </div>
                  }

                  <div class="form-group">
                    <label for="currentPassword" class="form-label">Current Password</label>
                    <div class="password-input-wrap">
                      <input
                        id="currentPassword"
                        [type]="showCurrentPassword() ? 'text' : 'password'"
                        class="form-input"
                        [(ngModel)]="currentPassword"
                        name="currentPassword"
                        required
                        autocomplete="current-password"
                        placeholder="Enter your current password"
                      />
                      <button
                        type="button"
                        class="btn-eye"
                        (click)="showCurrentPassword.set(!showCurrentPassword())"
                        aria-label="Toggle current password visibility"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="eye-svg">
                          @if (showCurrentPassword()) {
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          } @else {
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          }
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="newPassword" class="form-label">New Password</label>
                    <div class="password-input-wrap">
                      <input
                        id="newPassword"
                        [type]="showNewPassword() ? 'text' : 'password'"
                        class="form-input"
                        [(ngModel)]="newPassword"
                        name="newPassword"
                        required
                        autocomplete="new-password"
                        placeholder="Enter new password (min. 8 characters)"
                      />
                      <button
                        type="button"
                        class="btn-eye"
                        (click)="showNewPassword.set(!showNewPassword())"
                        aria-label="Toggle new password visibility"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="eye-svg">
                          @if (showNewPassword()) {
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          } @else {
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          }
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="confirmPassword" class="form-label">Confirm New Password</label>
                    <div class="password-input-wrap">
                      <input
                        id="confirmPassword"
                        [type]="showConfirmPassword() ? 'text' : 'password'"
                        class="form-input"
                        [(ngModel)]="confirmPassword"
                        name="confirmPassword"
                        required
                        autocomplete="new-password"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        class="btn-eye"
                        (click)="showConfirmPassword.set(!showConfirmPassword())"
                        aria-label="Toggle confirm password visibility"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="eye-svg">
                          @if (showConfirmPassword()) {
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          } @else {
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          }
                        </svg>
                      </button>
                    </div>
                  </div>

                  <!-- Requirements Checklist -->
                  <div class="password-criteria-list">
                    <p class="criteria-heading">Password Requirements:</p>
                    <ul>
                      <li [class.met]="newPassword.length >= 8">
                        <span class="dot"></span> At least 8 characters
                      </li>
                      <li [class.met]="hasUpper(newPassword)">
                        <span class="dot"></span> At least one uppercase letter (A-Z)
                      </li>
                      <li [class.met]="hasLower(newPassword)">
                        <span class="dot"></span> At least one lowercase letter (a-z)
                      </li>
                      <li [class.met]="hasDigit(newPassword)">
                        <span class="dot"></span> At least one number (0-9)
                      </li>
                      <li [class.met]="hasSpecial(newPassword)">
                        <span class="dot"></span> At least one special character (!@#$%^&*...)
                      </li>
                    </ul>
                  </div>

                  <div class="form-actions">
                    <button
                      type="submit"
                      class="btn btn-primary"
                      [disabled]="passwordSubmitting() || !isPasswordFormValid()"
                    >
                      @if (passwordSubmitting()) {
                        <span class="spinner-small" aria-hidden="true"></span>
                        <span>Updating Password...</span>
                      } @else {
                        <span>Update Password</span>
                      }
                    </button>
                  </div>
                </form>
              </section>
            }
          }
        </main>
      </div>

      <!-- EDIT USERNAME MODAL -->
      @if (isEditModalOpen()) {
        <div class="modal-backdrop" (click)="closeEditModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div class="modal-header">
              <h2 id="modal-title" class="modal-title">Edit Username</h2>
              <button type="button" class="btn-close" (click)="closeEditModal()" aria-label="Close modal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="close-svg">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <form (ngSubmit)="submitUsernameChange()">
              <div class="modal-body">
                @if (modalError()) {
                  <div class="modal-alert alert-error" role="alert">
                    {{ modalError() }}
                  </div>
                }

                <div class="form-group">
                  <label for="usernameInput" class="form-label">Username</label>
                  <input
                    id="usernameInput"
                    type="text"
                    class="form-input"
                    [(ngModel)]="editUsernameValue"
                    name="usernameInput"
                    required
                    minlength="2"
                    maxlength="50"
                    placeholder="Enter username"
                    autofocus
                  />
                  <p class="form-hint">Username can contain letters, numbers and underscores.</p>
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" (click)="closeEditModal()" [disabled]="editSubmitting()">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary" [disabled]="editSubmitting() || !editUsernameValue.trim()">
                  @if (editSubmitting()) {
                    <span class="spinner-small" aria-hidden="true"></span>
                    <span>Saving...</span>
                  } @else {
                    <span>Save Changes</span>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styleUrls: ['./member-settings.component.css']
})
export class MemberSettingsComponent implements OnInit {
  private readonly settingsService = inject(MemberSettingsService);
  private readonly authService = inject(AuthService);

  readonly activeTab = signal<SettingsTab>('account');
  readonly loading = signal<boolean>(true);
  readonly userSettings = signal<UserSettings | null>(null);
  readonly preferences = signal<NotificationPreferences>({
    borrowRequestUpdates: true,
    loanDueReminders: true,
    overdueFineAlerts: true,
    bookRecommendations: true,
    newBookArrivals: true,
    wishlistBookAlerts: true,
    departmentBookArrivals: true,
    libraryAnnouncements: true,
  });

  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  // Edit Username Modal
  readonly isEditModalOpen = signal<boolean>(false);
  editUsernameValue = '';
  readonly editSubmitting = signal<boolean>(false);
  readonly modalError = signal<string | null>(null);

  // Password Change
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  readonly showCurrentPassword = signal<boolean>(false);
  readonly showNewPassword = signal<boolean>(false);
  readonly showConfirmPassword = signal<boolean>(false);
  readonly passwordSubmitting = signal<boolean>(false);
  readonly passwordError = signal<string | null>(null);

  readonly updatingKeys = signal<Set<keyof NotificationPreferences>>(new Set());

  isUpdating(key: keyof NotificationPreferences): boolean {
    return this.updatingKeys().has(key);
  }

  readonly isFaculty = computed(() => {
    return this.userSettings()?.role === 'FACULTY';
  });

  readonly isLibrarian = computed(() => {
    return this.userSettings()?.role === 'LIBRARIAN';
  });

  readonly roleLabel = computed(() => {
    const role = this.userSettings()?.role;
    if (role === 'LIBRARIAN') return 'Librarian';
    if (role === 'FACULTY') return 'Faculty';
    return 'Student';
  });

  readonly userInitials = computed(() => {
    const name = this.userSettings()?.displayName || this.userSettings()?.username || '';
    if (!name.trim()) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });

  ngOnInit(): void {
    this.loadSettings();
  }

  setTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
    this.clearFeedback();
  }

  loadSettings(): void {
    this.loading.set(true);
    this.clearFeedback();

    this.settingsService.getUserSettings().subscribe({
      next: (data) => {
        this.userSettings.set(data);
        if (data.notificationPreferences) {
          this.preferences.set(data.notificationPreferences);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Failed to load settings. Please try again.');
        this.loading.set(false);
      }
    });
  }

  openEditUsernameModal(): void {
    this.editUsernameValue = this.userSettings()?.displayName || this.userSettings()?.username || '';
    this.modalError.set(null);
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.modalError.set(null);
  }

  submitUsernameChange(): void {
    const clean = this.editUsernameValue.trim();
    if (!clean) {
      this.modalError.set('Username cannot be empty.');
      return;
    }
    if (clean.length < 2 || clean.length > 50) {
      this.modalError.set('Username must be between 2 and 50 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9._ -]+$/.test(clean)) {
      this.modalError.set('Username can contain letters, numbers, spaces, dots, underscores, and hyphens.');
      return;
    }

    this.editSubmitting.set(true);
    this.modalError.set(null);

    this.settingsService.updateUsername(clean).subscribe({
      next: (res) => {
        this.editSubmitting.set(false);
        this.isEditModalOpen.set(false);
        const current = this.userSettings();
        if (current) {
          this.userSettings.set({
            ...current,
            displayName: res.username,
            username: res.username
          });
        }
        // Also refresh auth profile
        this.authService.loadCurrentUser().subscribe();
        this.showSuccess('Username updated successfully.');
      },
      error: (err) => {
        this.editSubmitting.set(false);
        const msg = err.error?.message || (err.status === 409 ? 'This username is already taken. Please choose another.' : 'Failed to update username.');
        this.modalError.set(msg);
      }
    });
  }

  togglePreference(key: keyof NotificationPreferences): void {
    if (this.isUpdating(key)) {
      return;
    }

    const current = this.preferences();
    const targetValue = !current[key];
    const updated: NotificationPreferences = {
      ...current,
      [key]: targetValue
    };
    this.preferences.set(updated);

    const nextKeys = new Set(this.updatingKeys());
    nextKeys.add(key);
    this.updatingKeys.set(nextKeys);
    this.clearFeedback();

    this.settingsService.updateNotificationPreferences({ [key]: targetValue }).subscribe({
      next: (saved) => {
        this.preferences.set(saved);
        const activeKeys = new Set(this.updatingKeys());
        activeKeys.delete(key);
        this.updatingKeys.set(activeKeys);
        this.showSuccess('Notification preference saved.');
      },
      error: () => {
        // revert to previous value
        this.preferences.set(current);
        const activeKeys = new Set(this.updatingKeys());
        activeKeys.delete(key);
        this.updatingKeys.set(activeKeys);
        this.errorMessage.set('Failed to update notification preferences.');
      }
    });
  }

  submitPasswordChange(): void {
    this.passwordError.set(null);
    if (!this.currentPassword) {
      this.passwordError.set('Please enter your current password.');
      return;
    }
    if (!this.isPasswordFormValid()) {
      this.passwordError.set('Please satisfy all password criteria.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError.set('New password and confirmation do not match.');
      return;
    }
    if (this.currentPassword === this.newPassword) {
      this.passwordError.set('New password cannot be the same as your current password.');
      return;
    }

    this.passwordSubmitting.set(true);

    this.settingsService.changePassword({
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword
    }).subscribe({
      next: (res) => {
        this.passwordSubmitting.set(false);
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.showSuccess(res.message || 'Password changed successfully.');
      },
      error: (err) => {
        this.passwordSubmitting.set(false);
        const msg = err.error?.message || (err.status === 400 ? 'Current password is incorrect or new password does not meet requirements.' : 'Failed to change password.');
        this.passwordError.set(msg);
      }
    });
  }

  isPasswordFormValid(): boolean {
    return this.newPassword.length >= 8 &&
      this.hasUpper(this.newPassword) &&
      this.hasLower(this.newPassword) &&
      this.hasDigit(this.newPassword) &&
      this.hasSpecial(this.newPassword) &&
      this.newPassword === this.confirmPassword;
  }

  hasUpper(val: string): boolean {
    return /[A-Z]/.test(val);
  }

  hasLower(val: string): boolean {
    return /[a-z]/.test(val);
  }

  hasDigit(val: string): boolean {
    return /[0-9]/.test(val);
  }

  hasSpecial(val: string): boolean {
    return /[^a-zA-Z0-9]/.test(val);
  }

  private showSuccess(msg: string): void {
    this.errorMessage.set(null);
    this.successMessage.set(msg);
    setTimeout(() => {
      if (this.successMessage() === msg) {
        this.successMessage.set(null);
      }
    }, 4000);
  }

  private clearFeedback(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.passwordError.set(null);
  }
}
