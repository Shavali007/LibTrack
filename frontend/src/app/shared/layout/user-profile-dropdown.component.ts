import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../features/auth/auth.service';
import { BorrowingService } from '../../features/circulation/borrowing.service';
import { WishlistService } from '../../features/wishlist/wishlist.service';
import { ReservationService } from '../../features/reservations/reservation.service';

@Component({
  selector: 'app-user-profile-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="user-profile-menu" [class.is-open]="isOpen()">
      <!-- Trigger Button matching Mockup -->
      <button
        type="button"
        class="user-profile-trigger"
        (click)="toggleMenu()"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-haspopup]="true"
        aria-label="User profile options"
      >
        <span class="user-avatar" aria-hidden="true">{{ initial() }}</span>
        <div class="user-text">
          <span class="user-name">{{ displayName() }}</span>
          <span class="user-role">{{ designation() }}</span>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="chevron-svg" [class.rotated]="isOpen()" aria-hidden="true">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <!-- Profile Dropdown (Middle Design from Mockup) -->
      @if (isOpen()) {
        <div class="user-dropdown-card" (click)="$event.stopPropagation()" role="menu" aria-label="Profile menu">
          <!-- Forest-Green Header -->
          <div class="profile-header">
            <!-- Decorative Library Watermark -->
            <svg class="header-watermark" viewBox="0 0 160 120" fill="none" stroke="currentColor" aria-hidden="true">
              <path d="M10 110V20C10 20 25 15 45 15C65 15 80 20 80 20V110C80 110 65 105 45 105C25 105 10 110 10 110Z" stroke-width="2" stroke-linecap="round"/>
              <path d="M150 110V20C150 20 135 15 115 15C95 15 80 20 80 20V110C80 110 95 105 115 105C135 105 150 110 150 110Z" stroke-width="2" stroke-linecap="round"/>
              <line x1="25" y1="35" x2="65" y2="35" stroke-width="1.5"/>
              <line x1="25" y1="50" x2="65" y2="50" stroke-width="1.5"/>
              <line x1="25" y1="65" x2="65" y2="65" stroke-width="1.5"/>
              <line x1="95" y1="35" x2="135" y2="35" stroke-width="1.5"/>
              <line x1="95" y1="50" x2="135" y2="50" stroke-width="1.5"/>
              <line x1="95" y1="65" x2="135" y2="65" stroke-width="1.5"/>
            </svg>

            <!-- Circular Avatar -->
            <div class="header-avatar" aria-hidden="true">
              {{ initial() }}
            </div>

            <!-- User Full Name -->
            <h3 class="header-name">{{ fullName() }}</h3>

            <!-- Email Address -->
            <p class="header-email">{{ email() }}</p>

            <!-- Role Badge Pill -->
            <div class="role-badge-container">
              <span class="role-badge" [attr.aria-label]="'Role: ' + roleBadge()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="badge-shield-icon" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span>{{ roleBadge() }}</span>
              </span>
              @if (department()) {
                <span class="dept-badge" [title]="department()">{{ departmentCode() }}</span>
              }
            </div>
          </div>

          <!-- Dropdown Menu Items -->
          <div class="dropdown-body">
            <!-- 1. My Profile -->
            <button
              type="button"
              class="dropdown-menu-item"
              (click)="openMyProfile()"
              role="menuitem"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="menu-item-icon" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>My Profile</span>
            </button>

            <div class="menu-separator" role="separator"></div>

            <!-- 2. Settings -->
            @if (isLibrarian()) {
              <a
                routerLink="/workspace/settings"
                class="dropdown-menu-item"
                (click)="closeMenu()"
                role="menuitem"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="menu-item-icon" aria-hidden="true">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <span>Notification Preferences</span>
              </a>
              <a
                routerLink="/workspace/librarian/settings"
                class="dropdown-menu-item"
                (click)="closeMenu()"
                role="menuitem"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="menu-item-icon" aria-hidden="true">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span>System Settings</span>
              </a>
            } @else {
              <a
                routerLink="/workspace/settings"
                class="dropdown-menu-item"
                (click)="closeMenu()"
                role="menuitem"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="menu-item-icon" aria-hidden="true">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span>Settings</span>
              </a>
            }

            <div class="menu-separator" role="separator"></div>

            <!-- 3. Help & Support -->
            <button
              type="button"
              class="dropdown-menu-item"
              (click)="openHelpSupport()"
              role="menuitem"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="menu-item-icon" aria-hidden="true">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>Help & Support</span>
            </button>

            <!-- 4. Sign Out Button -->
            <div class="signout-wrap">
              <button
                type="button"
                class="btn-signout"
                (click)="signOut()"
                [disabled]="isSigningOut()"
                role="menuitem"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="signout-icon" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>{{ isSigningOut() ? 'Signing out…' : 'Sign out' }}</span>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- My Profile Modal Dialog (Circle Reference Mockup) -->
      @if (profileModalOpen()) {
        <div class="modal-backdrop" (click)="closeProfileModal()">
          <div class="profile-modal-card my-profile-modal-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title">
            <!-- Modal Header with Top-Right Forest Green Wave Art -->
            <div class="modal-header my-profile-header">
              <div class="header-left-group">
                <div class="modal-header-icon profile-header-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <div class="header-title-wrap">
                  <h2 id="profile-dialog-title" class="modal-title">My Profile</h2>
                  <p class="modal-subtitle">Your library identity and account details.</p>
                </div>
              </div>

              <!-- Top-Right Forest-Green Curved Wave Art -->
              <div class="header-wave-art" aria-hidden="true">
                <svg viewBox="0 0 220 80" fill="none" preserveAspectRatio="none">
                  <path d="M0,0 Q80,65 150,25 T220,60 L220,0 Z" fill="#003D30" fill-opacity="0.9" />
                  <path d="M50,0 Q120,45 175,15 T220,40 L220,0 Z" fill="#002B22" fill-opacity="0.95" />
                </svg>
              </div>

              <button type="button" class="btn-close-modal btn-close-profile" (click)="closeProfileModal()" aria-label="Close profile details">
                ✕
              </button>
            </div>

            <div class="modal-body my-profile-body">
              <!-- Hero Profile Section -->
              <div class="profile-hero-card">
                <div class="avatar-with-badge">
                  <div class="profile-large-avatar" aria-hidden="true">{{ initial() }}</div>
                  <!-- Decorative camera pill badge (read-only, no upload picker) -->
                  <div class="camera-pill-badge" title="Profile picture indicator" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="camera-svg">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                  </div>
                </div>

                <div class="hero-info-column">
                  <div class="hero-header-row">
                    <div class="hero-name-group">
                      <h3 class="hero-user-name">{{ fullName() }}</h3>
                      <span class="role-badge-pill" [attr.aria-label]="'Role: ' + roleBadge()">{{ roleBadge() }}</span>
                    </div>

                    @if (!isEditingName()) {
                      <button type="button" class="btn-edit-profile" (click)="toggleEditName()" aria-label="Edit display name">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="edit-icon" aria-hidden="true">
                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                        </svg>
                        <span>Edit Profile</span>
                      </button>
                    }
                  </div>

                  <!-- Edit Name Inline Form -->
                  @if (isEditingName()) {
                    <div class="edit-name-inline-box">
                      <div class="edit-input-wrap">
                        <label for="edit-username-input" class="edit-input-label">Username / Display Name</label>
                        <input
                          id="edit-username-input"
                          type="text"
                          class="input-edit-name"
                          [value]="editNameValue()"
                          (input)="onNameInput($event)"
                          maxlength="50"
                          placeholder="Enter your name"
                          [disabled]="savingName()"
                        />
                      </div>
                      @if (nameEditError()) {
                        <p class="edit-name-error" role="alert">{{ nameEditError() }}</p>
                      }
                      <div class="edit-actions-row">
                        <button type="button" class="btn-edit-cancel" (click)="cancelEditName()" [disabled]="savingName()">
                          Cancel
                        </button>
                        <button type="button" class="btn-edit-save" (click)="saveUsername()" [disabled]="savingName()">
                          @if (savingName()) {
                            <span>Saving…</span>
                          } @else {
                            <span>Save Changes</span>
                          }
                        </button>
                      </div>
                    </div>
                  }

                  <!-- Department and Email Rows -->
                  <div class="hero-meta-rows">
                    <div class="hero-meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hero-meta-icon" aria-hidden="true">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                        <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                      </svg>
                      <span class="hero-meta-text">{{ department() || (isLibrarian() ? 'Central Library' : 'General Department') }}</span>
                    </div>

                    <div class="hero-meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hero-meta-icon" aria-hidden="true">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                      <span class="hero-meta-text">{{ email() }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Library Activity Summary (3 Cards) -->
              <div class="activity-summary-grid">
                <!-- 1. Books Borrowed -->
                <div class="activity-card">
                  <div class="activity-icon-container" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="activity-svg">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                  </div>
                  <div class="activity-content">
                    <div class="activity-count">
                      @if (loadingStats()) {
                        <span class="count-skeleton">…</span>
                      } @else {
                        <span>{{ borrowedCount() }}</span>
                      }
                    </div>
                    <div class="activity-label">Books Borrowed</div>
                  </div>
                </div>

                <!-- 2. In Wishlist -->
                <div class="activity-card">
                  <div class="activity-icon-container" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="activity-svg">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                  <div class="activity-content">
                    <div class="activity-count">
                      @if (loadingStats()) {
                        <span class="count-skeleton">…</span>
                      } @else {
                        <span>{{ wishlistCount() }}</span>
                      }
                    </div>
                    <div class="activity-label">In Wishlist</div>
                  </div>
                </div>

                <!-- 3. Reservations -->
                <div class="activity-card">
                  <div class="activity-icon-container" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="activity-svg">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </div>
                  <div class="activity-content">
                    <div class="activity-count">
                      @if (loadingStats()) {
                        <span class="count-skeleton">…</span>
                      } @else {
                        <span>{{ reservationsCount() }}</span>
                      }
                    </div>
                    <div class="activity-label">Reservations</div>
                  </div>
                </div>
              </div>

              <!-- Account Information Section (Read-Only) -->
              <div class="account-info-section">
                <div class="account-info-table">
                  <div class="info-row">
                    <div class="info-label-cell">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="info-row-icon" aria-hidden="true">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      <span class="info-label">Full Name</span>
                    </div>
                    <span class="info-colon" aria-hidden="true">:</span>
                    <span class="info-value">{{ fullName() }}</span>
                  </div>

                  <div class="info-row">
                    <div class="info-label-cell">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="info-row-icon" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                        <line x1="7" y1="8" x2="17" y2="8"></line>
                        <line x1="7" y1="12" x2="13" y2="12"></line>
                        <line x1="7" y1="16" x2="11" y2="16"></line>
                      </svg>
                      <span class="info-label">Account Role</span>
                    </div>
                    <span class="info-colon" aria-hidden="true">:</span>
                    <span class="info-value">{{ designation() }} ({{ roleBadge() }})</span>
                  </div>

                  <div class="info-row">
                    <div class="info-label-cell">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="info-row-icon" aria-hidden="true">
                        <path d="M3 21h18"></path>
                        <path d="M5 21V7l7-4 7 4v14"></path>
                        <path d="M9 10h1"></path>
                        <path d="M14 10h1"></path>
                        <path d="M9 14h1"></path>
                        <path d="M14 14h1"></path>
                      </svg>
                      <span class="info-label">Department</span>
                    </div>
                    <span class="info-colon" aria-hidden="true">:</span>
                    <span class="info-value">{{ department() || (isLibrarian() ? 'Central Library' : 'General Department') }}</span>
                  </div>

                  <div class="info-row">
                    <div class="info-label-cell">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="info-row-icon" aria-hidden="true">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        <polyline points="9 12 11 14 15 10"></polyline>
                      </svg>
                      <span class="info-label">Library Status</span>
                    </div>
                    <span class="info-colon" aria-hidden="true">:</span>
                    <span class="info-value status-active">
                      <span class="status-dot" aria-hidden="true">●</span> Active &amp; Verified
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer with dark forest-green Close button -->
            <div class="modal-footer my-profile-footer">
              <button type="button" class="btn-profile-close" (click)="closeProfileModal()">Close</button>
            </div>
          </div>
        </div>
      }

      <!-- Help & Support Modal Dialog -->
      @if (helpModalOpen()) {
        <div class="modal-backdrop" (click)="closeHelpModal()">
          <div class="profile-modal-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="help-dialog-title">
            <div class="modal-header">
              <div class="modal-header-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <div>
                <h2 id="help-dialog-title" class="modal-title">Help & Support</h2>
                <p class="modal-subtitle">Library services, circulation desk assistance and policies.</p>
              </div>
              <button type="button" class="btn-close-modal" (click)="closeHelpModal()" aria-label="Close help modal">✕</button>
            </div>

            <div class="modal-body">
              <div class="help-card-list">
                <div class="help-card">
                  <div class="help-icon" aria-hidden="true">📍</div>
                  <div>
                    <h3 class="help-card-title">Circulation & Support Desk</h3>
                    <p class="help-card-text">Visit the Central Academic Library circulation desk for physical book loans, returns, and lost item inquiries.</p>
                    <p class="help-card-sub">Mon–Sat: 8:00 AM – 8:00 PM · Closed Sundays</p>
                  </div>
                </div>

                <div class="help-card">
                  <div class="help-icon" aria-hidden="true">📧</div>
                  <div>
                    <h3 class="help-card-title">Library Email Inquiries</h3>
                    <p class="help-card-text">Reach out to library administrators directly for account assistance, digital copy requests, or access troubleshooting.</p>
                    <p class="help-card-sub">support&#64;vitap.ac.in · libtrack&#64;vitap.ac.in</p>
                  </div>
                </div>

                <div class="help-card">
                  <div class="help-icon" aria-hidden="true">📜</div>
                  <div>
                    <h3 class="help-card-title">Official Library Policies</h3>
                    <p class="help-card-text">Read comprehensive guidelines regarding loan durations, renewal rules, fine assessments, and member conduct.</p>
                    <a routerLink="/workspace/library-policies" class="help-link" (click)="closeHelpModal()">View Library Policies →</a>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="button button-primary" (click)="closeHelpModal()">Got it</button>
            </div>
          </div>
        </div>
      }

      <!-- Student & Faculty Settings Modal Dialog -->
      @if (settingsModalOpen()) {
        <div class="modal-backdrop" (click)="closeSettingsModal()">
          <div class="profile-modal-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="settings-dialog-title">
            <div class="modal-header">
              <div class="modal-header-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </div>
              <div>
                <h2 id="settings-dialog-title" class="modal-title">Account &amp; Library Settings</h2>
                <p class="modal-subtitle">Configure your member preferences, notifications, and circulation defaults.</p>
              </div>
              <button type="button" class="btn-close-modal" (click)="closeSettingsModal()" aria-label="Close settings dialog">✕</button>
            </div>

            <div class="modal-body">
              <div class="settings-section">
                <h3 class="settings-section-title">Academic Classification</h3>
                <div class="profile-detail-grid">
                  <div class="detail-item">
                    <span class="detail-label">Assigned Department</span>
                    <span class="detail-value font-semibold">{{ department() || 'Not Assigned' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Membership Type</span>
                    <span class="detail-value">{{ designation() }} ({{ roleBadge() }})</span>
                  </div>
                </div>
              </div>

              <div class="settings-section" style="margin-top: 1.15rem;">
                <h3 class="settings-section-title">Circulation &amp; Borrowing Defaults</h3>
                <div class="settings-pref-row">
                  <div>
                    <strong class="pref-title">Standard Borrowing Period</strong>
                    <p class="pref-desc">Configured by the library circulation desk (21 days for general catalogue books).</p>
                  </div>
                  <span class="pref-badge">21 Days</span>
                </div>
                <div class="settings-pref-row">
                  <div>
                    <strong class="pref-title">Smart Renewal Allowance</strong>
                    <p class="pref-desc">Eligible for single-click renewal before the due date if not reserved by another member.</p>
                  </div>
                  <span class="pref-badge">1 Renewal</span>
                </div>
                <div class="settings-pref-row">
                  <div>
                    <strong class="pref-title">Overdue Assessment Rate</strong>
                    <p class="pref-desc">Daily fine accrual rate for overdue items according to university policy.</p>
                  </div>
                  <span class="pref-badge">₹10.00 / day</span>
                </div>
              </div>

              <div class="settings-section" style="margin-top: 1.15rem;">
                <h3 class="settings-section-title">Notifications &amp; Reminders</h3>
                <div class="settings-pref-row">
                  <div>
                    <strong class="pref-title">Due-Date Reminder Alerts</strong>
                    <p class="pref-desc">Receive notifications prior to loan due dates and upcoming renewal expirations.</p>
                  </div>
                  <span class="pref-badge active-pill">Active</span>
                </div>
                <div class="settings-pref-row">
                  <div>
                    <strong class="pref-title">Reservation Pickup Notices</strong>
                    <p class="pref-desc">Instant alerts when a reserved physical copy is checked in and ready at the circulation desk.</p>
                  </div>
                  <span class="pref-badge active-pill">Active</span>
                </div>
                <div class="settings-pref-row">
                  <div>
                    <strong class="pref-title">Department Recommendations</strong>
                    <p class="pref-desc">Receive curated book suggestions tailored to {{ departmentCode() || 'your department' }}.</p>
                  </div>
                  <span class="pref-badge active-pill">Active</span>
                </div>
              </div>

              <div class="settings-policy-cta" style="margin-top: 1.15rem;">
                <p class="cta-text">Looking for official circulation, borrowing, fine, and holiday calendar guidelines?</p>
                <a routerLink="/workspace/library-policies" class="button button-outline" (click)="closeSettingsModal()">
                  View Full Library Policies →
                </a>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="button button-primary" (click)="closeSettingsModal()">Done</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      position: relative;
    }

    .user-profile-menu {
      position: relative;
      display: inline-block;
    }

    /* Top Navigation Profile Button */
    .user-profile-trigger {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 4px 14px 4px 5px;
      border: 1px solid #C2D6CF;
      border-radius: 9999px;
      background: #FFFFFF;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      outline: none;
    }

    .user-profile-trigger:hover {
      background: #F7FAF8;
      border-color: #003D30;
      box-shadow: 0 2px 8px rgba(0, 61, 48, 0.1);
    }

    .user-profile-trigger:focus-visible {
      outline: 2px solid #003D30;
      outline-offset: 2px;
      border-color: #003D30;
    }

    .user-avatar {
      display: grid;
      width: 2.25rem;
      height: 2.25rem;
      place-items: center;
      border-radius: 50%;
      background: #003D30;
      color: #FFFFFF;
      font-weight: 700;
      font-size: 0.95rem;
      text-transform: uppercase;
      flex-shrink: 0;
      box-shadow: 0 1px 2px rgba(0, 61, 48, 0.2);
    }

    .user-text {
      display: flex;
      flex-direction: column;
      text-align: left;
      line-height: 1.25;
      max-width: 160px;
    }

    .user-name {
      font-size: 0.875rem;
      font-weight: 700;
      color: #1F2421;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      font-size: 0.72rem;
      font-weight: 400;
      color: #5A625D;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chevron-svg {
      width: 0.85rem;
      height: 0.85rem;
      color: #5A625D;
      transition: transform 0.2s ease;
      flex-shrink: 0;
      margin-left: 0.15rem;
    }

    .chevron-svg.rotated {
      transform: rotate(180deg);
      color: #003D30;
    }

    /* Dropdown Card - Compact Forest-Green Design */
    .user-dropdown-card {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      z-index: 1000;
      width: 324px;
      max-width: calc(100vw - 24px);
      background: #FFFFFF;
      border-radius: 18px;
      border: 1px solid #E5E0D5;
      box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.06);
      overflow: hidden;
      animation: dropdownSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes dropdownSlideIn {
      from {
        opacity: 0;
        transform: translateY(-8px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Forest Green Header */
    .profile-header {
      position: relative;
      background: linear-gradient(160deg, #003D30 0%, #002820 100%);
      padding: 22px 18px 24px;
      text-align: center;
      overflow: hidden;
      border-bottom-left-radius: 20px;
      border-bottom-right-radius: 20px;
      box-shadow: 0 4px 12px rgba(0, 43, 34, 0.12);
    }

    .header-watermark {
      position: absolute;
      top: 6px;
      right: -10px;
      width: 110px;
      height: 85px;
      color: #FFFFFF;
      opacity: 0.08;
      pointer-events: none;
    }

    .header-avatar {
      display: grid;
      width: 3.25rem;
      height: 3.25rem;
      margin: 0 auto 0.65rem;
      place-items: center;
      border-radius: 50%;
      background: #00241B;
      color: #FFFFFF;
      font-size: 1.35rem;
      font-weight: 700;
      text-transform: uppercase;
      border: 2px solid rgba(255, 255, 255, 0.95);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }

    .header-name {
      margin: 0 0 0.2rem;
      font-size: 1.05rem;
      font-weight: 700;
      color: #FFFFFF;
      letter-spacing: -0.015em;
      word-break: break-word;
      line-height: 1.25;
    }

    .header-email {
      margin: 0 0 0.75rem;
      font-size: 0.78rem;
      color: #B2D1C9;
      word-break: break-all;
      line-height: 1.3;
    }

    .dept-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.18rem 0.55rem;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #a7f3d0;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    .role-badge-container {
      display: flex;
      justify-content: center;
    }

    .role-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: #EAF2EF;
      color: #003D30;
      border: 1px solid #C2D6CF;
      border-radius: 9999px;
      padding: 0.25rem 0.75rem;
      font-size: 0.6875rem;
      font-weight: 750;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .badge-shield-icon {
      width: 0.75rem;
      height: 0.75rem;
      stroke-width: 2.2;
    }

    /* Dropdown Body and Menu Items */
    .dropdown-body {
      padding: 0.5rem 0.75rem 0.85rem;
      background: #FFFFFF;
    }

    .dropdown-menu-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.6rem 0.75rem;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: #1F2421;
      font-size: 0.875rem;
      font-weight: 550;
      text-decoration: none;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s ease;
      box-sizing: border-box;
    }

    .dropdown-menu-item:hover {
      background: #F7FAF8;
      color: #003D30;
    }

    .dropdown-menu-item:focus-visible {
      outline: 2px solid #003D30;
      outline-offset: -2px;
      background: #F7FAF8;
    }

    .menu-item-icon {
      width: 1.1rem;
      height: 1.1rem;
      color: #4A5568;
      transition: color 0.15s ease;
      flex-shrink: 0;
    }

    .dropdown-menu-item:hover .menu-item-icon {
      color: #003D30;
    }

    .menu-separator {
      height: 1px;
      background: #F0EFEA;
      margin: 0.15rem 0.5rem;
    }

    /* Sign Out Button */
    .signout-wrap {
      margin-top: 0.65rem;
      padding-top: 0.25rem;
    }

    .btn-signout {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      width: 100%;
      padding: 0.7rem 0.85rem;
      border: 1px solid #FECACA;
      border-radius: 10px;
      background: #FEF2F2;
      color: #DC2626;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      box-sizing: border-box;
      outline: none;
    }

    .btn-signout:hover:not(:disabled) {
      background: #FEE2E2;
      border-color: #F87171;
      color: #991B1B;
      box-shadow: 0 2px 6px rgba(220, 38, 38, 0.1);
    }

    .btn-signout:focus-visible {
      outline: 2px solid #DC2626;
      outline-offset: 2px;
    }

    .btn-signout:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .signout-icon {
      width: 1.1rem;
      height: 1.1rem;
      flex-shrink: 0;
      color: #DC2626;
    }

    .btn-signout:hover:not(:disabled) .signout-icon {
      color: #991B1B;
    }

    /* Modal Backdrop and Cards */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 2000;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
    }

    .profile-modal-card {
      width: 100%;
      max-width: 460px;
      background: #FFFFFF;
      border-radius: 16px;
      border: 1px solid var(--color-line-200);
      box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      animation: modalPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalPopIn {
      from { opacity: 0; transform: scale(0.96) translateY(6px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .modal-header {
      display: flex;
      align-items: flex-start;
      gap: 0.85rem;
      padding: 1.25rem 1.25rem 0.85rem;
      border-bottom: 1px solid var(--color-line-200);
      position: relative;
    }

    .modal-header-icon {
      display: grid;
      place-items: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 10px;
      background: #EAF2EF;
      color: #003D30;
      flex-shrink: 0;
    }

    .modal-header-icon svg {
      width: 1.25rem;
      height: 1.25rem;
    }

    .modal-title {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: #1F2421;
    }

    .modal-subtitle {
      margin: 0.15rem 0 0;
      font-size: 0.8125rem;
      color: #5A625D;
    }

    .btn-close-modal {
      position: absolute;
      top: 1.15rem;
      right: 1.15rem;
      background: transparent;
      border: none;
      font-size: 1.1rem;
      color: #718096;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      line-height: 1;
    }

    .btn-close-modal:hover {
      background: #F1F5F9;
      color: #1A202C;
    }

    .modal-body {
      padding: 1.25rem;
    }

    .modal-avatar-row {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding-bottom: 1rem;
      margin-bottom: 1rem;
      border-bottom: 1px solid #F0EFEA;
    }

    .modal-avatar {
      display: grid;
      width: 3rem;
      height: 3rem;
      place-items: center;
      border-radius: 50%;
      background: #003D30;
      color: #FFFFFF;
      font-size: 1.25rem;
      font-weight: 700;
    }

    .modal-avatar-info {
      display: flex;
      flex-direction: column;
    }

    .modal-user-name {
      font-size: 1.05rem;
      font-weight: 700;
      color: #1F2421;
    }

    .profile-detail-grid {
      display: grid;
      gap: 0.85rem;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      background: #FAF9F6;
      padding: 0.65rem 0.85rem;
      border-radius: 8px;
      border: 1px solid #EFECE6;
    }

    .detail-label {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #5A625D;
    }

    .detail-value {
      font-size: 0.875rem;
      font-weight: 600;
      color: #1F2421;
    }

    .status-active {
      color: #047857;
    }

    /* Help & Support Cards */
    .help-card-list {
      display: grid;
      gap: 0.85rem;
    }

    .help-card {
      display: flex;
      align-items: flex-start;
      gap: 0.85rem;
      background: #FAF9F6;
      padding: 0.85rem 1rem;
      border-radius: 10px;
      border: 1px solid #EFECE6;
    }

    .help-icon {
      font-size: 1.4rem;
      line-height: 1;
      padding-top: 0.15rem;
      flex-shrink: 0;
    }

    .help-card-title {
      margin: 0 0 0.2rem;
      font-size: 0.875rem;
      font-weight: 700;
      color: #1F2421;
    }

    .help-card-text {
      margin: 0 0 0.35rem;
      font-size: 0.8125rem;
      color: #5A625D;
      line-height: 1.4;
    }

    .help-card-sub {
      margin: 0;
      font-size: 0.75rem;
      font-weight: 600;
      color: #003D30;
    }

    .help-link {
      display: inline-block;
      margin-top: 0.25rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #003D30;
      text-decoration: none;
    }

    .help-link:hover {
      text-decoration: underline;
    }

    /* Settings Sections */
    .settings-section-title {
      font-size: 0.8125rem;
      font-weight: 700;
      color: #003D30;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 0 0 0.5rem;
    }

    .settings-pref-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.65rem 0.85rem;
      background: #FAF9F6;
      border-radius: 8px;
      border: 1px solid #EFECE6;
      margin-bottom: 0.45rem;
    }

    .pref-title {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #1F2421;
    }

    .pref-desc {
      margin: 0.15rem 0 0;
      font-size: 0.75rem;
      color: #5A625D;
      line-height: 1.35;
    }

    .pref-badge {
      display: inline-flex;
      align-items: center;
      font-size: 0.75rem;
      font-weight: 600;
      color: #003D30;
      background: #E8F3EE;
      border: 1px solid #C4DFD2;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .pref-badge.active-pill {
      background: #DCFCE7;
      color: #15803D;
      border-color: #86EFAC;
    }

    .settings-policy-cta {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      background: #EFF6F2;
      border: 1px solid #D1E7DD;
      border-radius: 8px;
      padding: 0.85rem 1rem;
    }

    .cta-text {
      margin: 0;
      font-size: 0.8125rem;
      color: #2D3748;
      line-height: 1.4;
    }

    .button-outline {
      align-self: flex-start;
      background: #FFFFFF;
      color: #003D30;
      border: 1px solid #003D30;
      font-size: 0.8125rem;
      font-weight: 600;
      padding: 0.4rem 0.85rem;
      border-radius: 6px;
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .button-outline:hover {
      background: #003D30;
      color: #FFFFFF;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      padding: 0.85rem 1.25rem;
      border-top: 1px solid var(--color-line-200);
      background: #FAF9F6;
    }

    @media (max-width: 640px) {
      .user-text {
        display: none;
      }
      .user-profile-trigger {
        padding: 3px;
        gap: 0.25rem;
      }
      .chevron-svg {
        margin-right: 0.35rem;
      }
      .user-dropdown-card {
        right: -8px;
        width: min(320px, calc(100vw - 20px));
      }
    }
    /* My Profile Modal (Redesigned Mockup) */
    .my-profile-modal-card {
      max-width: 600px;
      width: 100%;
      border-radius: 20px;
      overflow: hidden;
      background: #FFFFFF;
      box-shadow: 0 24px 48px -12px rgba(0, 61, 48, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.06);
      border: 1px solid #E5E7EB;
      position: relative;
    }

    .my-profile-header {
      position: relative;
      overflow: hidden;
      padding: 1.5rem 1.6rem 1.25rem;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 1px solid #F0F4F2;
      background: #FFFFFF;
    }

    .header-left-group {
      display: flex;
      align-items: flex-start;
      gap: 0.9rem;
      position: relative;
      z-index: 2;
    }

    .profile-header-icon {
      background: #EAF2EF !important;
      color: #003D30 !important;
      width: 2.75rem !important;
      height: 2.75rem !important;
      border-radius: 12px !important;
    }

    .header-title-wrap {
      display: flex;
      flex-direction: column;
    }

    .header-wave-art {
      position: absolute;
      top: 0;
      right: 0;
      width: 200px;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    }

    .header-wave-art svg {
      width: 100%;
      height: 100%;
      display: block;
    }

    .btn-close-profile {
      position: relative;
      z-index: 2;
      background: rgba(255, 255, 255, 0.18) !important;
      color: #FFFFFF !important;
      font-size: 1.15rem;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.25);
      cursor: pointer;
      transition: background 0.15s ease, transform 0.15s ease;
      top: 1.25rem;
      right: 1.25rem;
    }

    .btn-close-profile:hover {
      background: rgba(255, 255, 255, 0.3) !important;
      transform: scale(1.05);
    }

    .my-profile-body {
      padding: 1.25rem 1.6rem 0.5rem;
    }

    /* Hero Profile Section */
    .profile-hero-card {
      display: flex;
      align-items: flex-start;
      gap: 1.35rem;
      margin-bottom: 1.35rem;
    }

    .avatar-with-badge {
      position: relative;
      flex-shrink: 0;
    }

    .profile-large-avatar {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      background: #003D30;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(0, 61, 48, 0.18);
    }

    .camera-pill-badge {
      position: absolute;
      bottom: -2px;
      right: -4px;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 1.5px solid #E5E7EB;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #5A625D;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      cursor: default;
    }

    .camera-svg {
      width: 14px;
      height: 14px;
    }

    .hero-info-column {
      flex: 1;
      min-width: 0;
    }

    .hero-header-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.35rem;
    }

    .hero-name-group {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }

    .hero-user-name {
      margin: 0;
      font-size: 1.3rem;
      font-weight: 700;
      color: #1F2421;
      letter-spacing: -0.01em;
    }

    .role-badge-pill {
      display: inline-block;
      padding: 0.18rem 0.6rem;
      border-radius: 9999px;
      background: #EAF2EF;
      color: #003D30;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      border: 1px solid #C2D6CF;
      text-transform: uppercase;
    }

    .btn-edit-profile {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      border: 1px solid #C2D6CF;
      background: #FFFFFF;
      color: #1F2421;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .btn-edit-profile:hover {
      background: #EAF2EF;
      border-color: #003D30;
      color: #003D30;
    }

    .edit-icon {
      width: 13px;
      height: 13px;
    }

    /* Edit Name Inline Form */
    .edit-name-inline-box {
      margin: 0.5rem 0 0.75rem;
      padding: 0.75rem 0.9rem;
      background: #F7FAF8;
      border: 1px solid #C2D6CF;
      border-radius: 10px;
    }

    .edit-input-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .edit-input-label {
      font-size: 0.72rem;
      font-weight: 600;
      color: #5A625D;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .input-edit-name {
      padding: 0.45rem 0.75rem;
      border-radius: 6px;
      border: 1px solid #CBD5E1;
      font-size: 0.875rem;
      color: #1F2421;
      background: #FFFFFF;
      outline: none;
      transition: border-color 0.15s ease;
    }

    .input-edit-name:focus {
      border-color: #003D30;
      box-shadow: 0 0 0 2px rgba(0, 61, 48, 0.15);
    }

    .edit-name-error {
      color: #DC2626;
      font-size: 0.76rem;
      margin: 0.35rem 0 0;
    }

    .edit-actions-row {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.65rem;
    }

    .btn-edit-cancel {
      padding: 0.3rem 0.75rem;
      border-radius: 6px;
      border: 1px solid #CBD5E1;
      background: #FFFFFF;
      color: #475569;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-edit-cancel:hover:not(:disabled) {
      background: #F1F5F9;
    }

    .btn-edit-save {
      padding: 0.3rem 0.85rem;
      border-radius: 6px;
      border: none;
      background: #003D30;
      color: #FFFFFF;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-edit-save:hover:not(:disabled) {
      background: #002B22;
    }

    .hero-meta-rows {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-top: 0.45rem;
    }

    .hero-meta-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #5A625D;
    }

    .hero-meta-icon {
      width: 14px;
      height: 14px;
      color: #5A625D;
      flex-shrink: 0;
    }

    .hero-meta-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Library Activity Summary (3 Cards) */
    .activity-summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    .activity-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 0.85rem 0.95rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .activity-card:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
      border-color: #CBD5E1;
    }

    .activity-icon-container {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #EAF2EF;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #003D30;
      flex-shrink: 0;
    }

    .activity-svg {
      width: 20px;
      height: 20px;
    }

    .activity-content {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .activity-count {
      font-size: 1.35rem;
      font-weight: 700;
      color: #1F2421;
      line-height: 1.1;
    }

    .count-skeleton {
      color: #94A3B8;
      font-weight: 400;
    }

    .activity-label {
      font-size: 0.75rem;
      color: #5A625D;
      font-weight: 500;
      margin-top: 0.15rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Account Information Section */
    .account-info-section {
      margin-bottom: 1.15rem;
    }

    .account-info-table {
      background: #F7FAF8;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 0.95rem 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .info-row {
      display: grid;
      grid-template-columns: 140px 16px 1fr;
      align-items: center;
      font-size: 0.86rem;
    }

    .info-label-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #5A625D;
      font-weight: 500;
    }

    .info-row-icon {
      width: 15px;
      height: 15px;
      color: #718096;
      flex-shrink: 0;
    }

    .info-colon {
      color: #9CA3AF;
      font-weight: 600;
      text-align: center;
    }

    .info-value {
      color: #1F2421;
      font-weight: 600;
      word-break: break-word;
    }

    /* My Profile Footer */
    .my-profile-footer {
      padding: 1rem 1.6rem 1.35rem !important;
      display: flex;
      justify-content: flex-end;
      border-top: 1px solid #F0F4F2;
      background: #FFFFFF;
    }

    .btn-profile-close {
      background: #003D30;
      color: #FFFFFF;
      font-weight: 600;
      font-size: 0.88rem;
      padding: 0.6rem 2.2rem;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.15s ease;
    }

    .btn-profile-close:hover {
      background: #002B22;
      transform: translateY(-1px);
    }

    @media (max-width: 600px) {
      .my-profile-modal-card {
        max-width: 100%;
        border-radius: 16px;
      }
      .my-profile-header {
        padding: 1.25rem 1.25rem 1rem;
      }
      .header-wave-art {
        width: 130px;
      }
      .my-profile-body {
        padding: 1rem 1.25rem 0.5rem;
      }
      .profile-hero-card {
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.85rem;
      }
      .hero-name-group {
        justify-content: center;
      }
      .hero-meta-rows {
        align-items: center;
      }
      .activity-summary-grid {
        grid-template-columns: 1fr;
        gap: 0.6rem;
      }
      .info-row {
        grid-template-columns: 120px 12px 1fr;
        font-size: 0.82rem;
      }
      .my-profile-footer {
        padding: 0.85rem 1.25rem 1.15rem !important;
      }
    }
  `]
})
export class UserProfileDropdownComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);
  private readonly borrowingService = inject(BorrowingService, { optional: true });
  private readonly wishlistService = inject(WishlistService, { optional: true });
  private readonly reservationService = inject(ReservationService, { optional: true });

  readonly isOpen = signal<boolean>(false);
  readonly isSigningOut = signal<boolean>(false);
  readonly profileModalOpen = signal<boolean>(false);
  readonly helpModalOpen = signal<boolean>(false);
  readonly settingsModalOpen = signal<boolean>(false);

  readonly borrowedCount = signal<number>(0);
  readonly wishlistCount = signal<number>(0);
  readonly reservationsCount = signal<number>(0);
  readonly loadingStats = signal<boolean>(false);

  readonly isEditingName = signal<boolean>(false);
  readonly editNameValue = signal<string>('');
  readonly savingName = signal<boolean>(false);
  readonly nameEditError = signal<string | null>(null);

  readonly profile = computed(() => this.auth.profile());

  readonly initial = computed<string>(() => {
    const p = this.profile();
    if (!p) return 'U';
    if (p.displayName && p.displayName.trim().length > 0) {
      return p.displayName.trim().charAt(0).toUpperCase();
    }
    if (p.email && p.email.trim().length > 0) {
      return p.email.trim().charAt(0).toUpperCase();
    }
    if (p.role === 'LIBRARIAN') return 'L';
    if (p.role === 'FACULTY') return 'F';
    return 'S';
  });

  readonly displayName = computed<string>(() => {
    const p = this.profile();
    if (!p) return 'User';
    if (p.displayName && p.displayName.trim().length > 0) {
      return p.displayName.trim();
    }
    if (p.email) {
      const prefix = p.email.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    if (p.role === 'LIBRARIAN') return 'Librarian';
    if (p.role === 'FACULTY') return 'Faculty Member';
    return 'Student';
  });

  readonly fullName = computed<string>(() => {
    const p = this.profile();
    if (!p) return 'User';
    return p.displayName || this.displayName();
  });

  readonly email = computed<string>(() => {
    return this.profile()?.email || '';
  });

  readonly designation = computed<string>(() => {
    const role = this.profile()?.role;
    if (role === 'LIBRARIAN') return 'Library Administrator';
    if (role === 'FACULTY') return 'Faculty Member';
    return 'Student';
  });

  readonly roleBadge = computed<string>(() => {
    const role = this.profile()?.role;
    if (role === 'LIBRARIAN') return 'LIBRARIAN';
    if (role === 'FACULTY') return 'FACULTY';
    return 'STUDENT';
  });

  readonly department = computed<string>(() => {
    return this.profile()?.department || '';
  });

  readonly departmentCode = computed<string>(() => {
    const dept = this.department();
    if (dept.includes('Computer Science')) return 'CSE';
    if (dept.includes('Electronics and Communication')) return 'ECE';
    if (dept.includes('Electrical and Electronics')) return 'EEE';
    if (dept.includes('Mechanical')) return 'ME';
    return dept;
  });

  isLibrarian(): boolean {
    return this.profile()?.role === 'LIBRARIAN';
  }

  toggleMenu(): void {
    this.isOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.isOpen.set(false);
  }

  loadUserStatistics(): void {
    this.loadingStats.set(true);

    const curLoans$ = this.borrowingService
      ? this.borrowingService.currentLoans().pipe(catchError(() => of({ totalElements: 0, content: [] } as any)))
      : of({ totalElements: 0, content: [] });

    const histLoans$ = this.borrowingService
      ? this.borrowingService.loanHistory().pipe(catchError(() => of({ totalElements: 0, content: [] } as any)))
      : of({ totalElements: 0, content: [] });

    const wishlist$ = this.wishlistService
      ? this.wishlistService.loadMyWishlist().pipe(catchError(() => of([])))
      : of([]);

    const reservations$ = this.reservationService
      ? this.reservationService.getCounts().pipe(catchError(() => of({ all: 0 } as any)))
      : of({ all: 0 });

    forkJoin({
      cur: curLoans$,
      hist: histLoans$,
      wish: wishlist$,
      res: reservations$
    }).subscribe({
      next: ({ cur, hist, wish, res }) => {
        const curCount = cur?.totalElements ?? cur?.content?.length ?? 0;
        const histCount = hist?.totalElements ?? hist?.content?.length ?? 0;
        this.borrowedCount.set(curCount + histCount);
        this.wishlistCount.set(Array.isArray(wish) ? wish.length : 0);
        this.reservationsCount.set(res?.all ?? 0);
        this.loadingStats.set(false);
      },
      error: () => {
        this.loadingStats.set(false);
      }
    });
  }

  toggleEditName(): void {
    this.editNameValue.set(this.fullName());
    this.nameEditError.set(null);
    this.isEditingName.set(true);
  }

  cancelEditName(): void {
    this.isEditingName.set(false);
    this.nameEditError.set(null);
  }

  onNameInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.editNameValue.set(target.value);
  }

  saveUsername(): void {
    const newName = this.editNameValue().trim();
    if (newName.length < 2) {
      this.nameEditError.set('Display name must be at least 2 characters.');
      return;
    }
    if (newName.length > 50) {
      this.nameEditError.set('Display name cannot exceed 50 characters.');
      return;
    }

    this.savingName.set(true);
    this.nameEditError.set(null);

    if (typeof (this.auth as any).updateProfile === 'function') {
      (this.auth as any).updateProfile(newName).subscribe({
        next: () => {
          this.savingName.set(false);
          this.isEditingName.set(false);
        },
        error: (err: any) => {
          this.savingName.set(false);
          this.nameEditError.set(err?.error?.message || 'Failed to update profile. Please try again.');
        }
      });
    } else {
      this.savingName.set(false);
      this.isEditingName.set(false);
    }
  }

  openMyProfile(): void {
    this.closeMenu();
    this.isEditingName.set(false);
    this.nameEditError.set(null);
    this.editNameValue.set(this.fullName());
    this.loadUserStatistics();
    this.profileModalOpen.set(true);
  }

  closeProfileModal(): void {
    this.isEditingName.set(false);
    this.nameEditError.set(null);
    this.profileModalOpen.set(false);
  }

  openSettingsInfo(): void {
    this.closeMenu();
    this.settingsModalOpen.set(true);
  }

  closeSettingsModal(): void {
    this.settingsModalOpen.set(false);
  }

  openHelpSupport(): void {
    this.closeMenu();
    this.helpModalOpen.set(true);
  }

  closeHelpModal(): void {
    this.helpModalOpen.set(false);
  }

  signOut(): void {
    if (this.isSigningOut()) return;
    this.isSigningOut.set(true);
    this.auth.logout().subscribe({
      next: () => {
        this.isSigningOut.set(false);
        this.closeMenu();
        void this.router.navigate(['/']);
      },
      error: () => {
        this.isSigningOut.set(false);
        this.closeMenu();
        void this.router.navigate(['/']);
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isOpen()) {
      this.closeMenu();
    }
    if (this.profileModalOpen()) {
      this.closeProfileModal();
    }
    if (this.helpModalOpen()) {
      this.closeHelpModal();
    }
    if (this.settingsModalOpen()) {
      this.closeSettingsModal();
    }
  }
}
