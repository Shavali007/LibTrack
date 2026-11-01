import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { HolidayRecord, LibrarianOperationsService, LibraryInfoRecord } from './librarian-operations.service';

@Component({
  selector: 'app-settings-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-page">
      <!-- Page Header matching Mockup Image 1 -->
      <header class="settings-header">
        <div class="settings-title-group">
          <div class="settings-icon-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="cog-svg">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </div>
          <div>
            <h1 class="settings-h1">Settings</h1>
            <p class="settings-subtitle">Manage library details and holidays.</p>
          </div>
        </div>
      </header>

      <!-- Navigation Tabs (Only 2 tabs: Library Information & Holiday Calendar) -->
      <nav class="settings-tabs" aria-label="Settings sections">
        <button
          type="button"
          class="settings-tab-btn"
          [class.active]="activeTab() === 'info'"
          (click)="setActiveTab('info')"
        >
          <span class="tab-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 21h18"></path>
              <path d="M5 21V7l8-4v18"></path>
              <path d="M19 21V11l-6-4"></path>
              <path d="M9 9h1"></path>
              <path d="M9 13h1"></path>
              <path d="M9 17h1"></path>
            </svg>
          </span>
          <span>Library Information</span>
        </button>

        <button
          type="button"
          class="settings-tab-btn"
          [class.active]="activeTab() === 'holidays'"
          (click)="setActiveTab('holidays')"
        >
          <span class="tab-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </span>
          <span>Holiday Calendar</span>
        </button>
      </nav>

      <!-- Alerts -->
      @if (error()) {
        <div class="alert alert-error" role="alert">
          {{ error() }}
        </div>
      }
      @if (notice()) {
        <div class="alert alert-success" role="status">
          {{ notice() }}
        </div>
      }

      <!-- TAB 1: Library Information -->
      @if (activeTab() === 'info') {
        <div class="surface-card info-card">
          <div class="card-header">
            <h2 class="card-title">Library Information</h2>
            <p class="card-subtitle">Update official library details.</p>
          </div>

          @if (loadingInfo()) {
            <div class="loading-state">Loading library details…</div>
          } @else {
            <form (ngSubmit)="saveLibraryInfo()" class="info-form" #infoForm="ngForm">
              <!-- Library Name -->
              <div class="form-group">
                <label for="libName" class="form-label">Library Name</label>
                <div class="input-with-icon">
                  <span class="input-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 21h18"></path>
                      <path d="M5 21V7l8-4v18"></path>
                      <path d="M19 21V11l-6-4"></path>
                      <path d="M9 9h1"></path>
                      <path d="M9 13h1"></path>
                      <path d="M9 17h1"></path>
                    </svg>
                  </span>
                  <input
                    id="libName"
                    name="libName"
                    type="text"
                    class="form-input"
                    [(ngModel)]="libraryInfo.libraryName"
                    required
                  />
                </div>
              </div>

              <!-- Contact Email & Contact Phone -->
              <div class="form-row-2">
                <div class="form-group">
                  <label for="contactEmail" class="form-label">Contact Email</label>
                  <div class="input-with-icon">
                    <span class="input-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                    </span>
                    <input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      class="form-input"
                      [(ngModel)]="libraryInfo.contactEmail"
                      required
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label for="contactPhone" class="form-label">Contact Phone</label>
                  <div class="input-with-icon">
                    <span class="input-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                    </span>
                    <input
                      id="contactPhone"
                      name="contactPhone"
                      type="text"
                      class="form-input"
                      [(ngModel)]="libraryInfo.contactPhone"
                      required
                    />
                  </div>
                </div>
              </div>

              <!-- Address -->
              <div class="form-group">
                <label for="address" class="form-label">Address</label>
                <div class="input-with-icon">
                  <span class="input-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </span>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    class="form-input"
                    [(ngModel)]="libraryInfo.address"
                    required
                  />
                </div>
              </div>

              <!-- Operating Hours -->
              <div class="form-group">
                <label class="form-label">Operating Hours</label>
                <div class="hours-row">
                  <div class="input-with-icon time-input">
                    <span class="input-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    </span>
                    <select
                      name="openTime"
                      [(ngModel)]="libraryInfo.openTime"
                      class="form-select"
                      aria-label="Opening time"
                    >
                      <option value="07:00 AM">07:00 AM</option>
                      <option value="08:00 AM">08:00 AM</option>
                      <option value="08:30 AM">08:30 AM</option>
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="09:30 AM">09:30 AM</option>
                      <option value="10:00 AM">10:00 AM</option>
                    </select>
                  </div>

                  <span class="hours-separator">to</span>

                  <div class="input-with-icon time-input">
                    <span class="input-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    </span>
                    <select
                      name="closeTime"
                      [(ngModel)]="libraryInfo.closeTime"
                      class="form-select"
                      aria-label="Closing time"
                    >
                      <option value="04:00 PM">04:00 PM</option>
                      <option value="05:00 PM">05:00 PM</option>
                      <option value="05:30 PM">05:30 PM</option>
                      <option value="06:00 PM">06:00 PM</option>
                      <option value="07:00 PM">07:00 PM</option>
                      <option value="08:00 PM">08:00 PM</option>
                      <option value="09:00 PM">09:00 PM</option>
                      <option value="10:00 PM">10:00 PM</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Save Changes Button -->
              <div class="form-actions">
                <button
                  type="submit"
                  class="btn-save-changes"
                  [disabled]="savingInfo()"
                >
                  <span class="btn-check-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <span>{{ savingInfo() ? 'Saving…' : 'Save Changes' }}</span>
                </button>
              </div>
            </form>
          }
        </div>
      }

      <!-- TAB 2: Holiday Calendar -->
      @if (activeTab() === 'holidays') {
        <div class="surface-card holidays-card">
          <div class="card-header-with-action">
            <div>
              <h2 class="card-title">Holiday Calendar</h2>
              <p class="card-subtitle">Add and manage library holidays.</p>
            </div>
            <button
              type="button"
              class="btn-add-holiday"
              (click)="openAddHolidayModal()"
            >
              + Add Holiday
            </button>
          </div>

          @if (loadingHolidays()) {
            <div class="loading-state">Loading holiday calendar…</div>
          } @else if (!holidays().length) {
            <div class="empty-state">
              <p>No upcoming library holidays configured.</p>
            </div>
          } @else {
            <div class="table-container">
              <table class="holidays-table" aria-label="Library holidays list">
                <thead>
                  <tr>
                    <th scope="col" class="th-date">Date</th>
                    <th scope="col" class="th-occasion">Occasion</th>
                    <th scope="col" class="th-actions"><span class="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (h of holidays(); track h.id) {
                    <tr>
                      <td class="td-date">
                        <span class="row-calendar-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                          </svg>
                        </span>
                        <span class="date-text">{{ formatHolidayDate(h.holidayDate) }}</span>
                      </td>
                      <td class="td-occasion">
                        {{ h.name }}
                      </td>
                      <td class="td-actions">
                        <button
                          type="button"
                          class="action-btn edit-btn"
                          (click)="openEditHolidayModal(h)"
                          title="Edit holiday"
                          aria-label="Edit holiday"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                          </svg>
                        </button>
                        <button
                          type="button"
                          class="action-btn delete-btn"
                          (click)="confirmDeleteHoliday(h)"
                          title="Delete holiday"
                          aria-label="Delete holiday"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- Add / Edit Holiday Modal -->
      @if (showHolidayModal()) {
        <div class="modal-backdrop" role="dialog" aria-modal="true">
          <div class="modal-card">
            <h3 class="modal-title">{{ editingHolidayId() ? 'Edit Holiday' : 'Add Holiday' }}</h3>
            <p class="modal-desc">Configure library closure and circulation adjustments.</p>

            <form (ngSubmit)="saveHoliday()" class="modal-form">
              <div class="form-group">
                <label for="holidayDateInput" class="form-label">Date *</label>
                <input
                  id="holidayDateInput"
                  name="holidayDate"
                  type="date"
                  class="modal-input"
                  [(ngModel)]="holidayFormDate"
                  required
                />
              </div>

              <div class="form-group">
                <label for="holidayNameInput" class="form-label">Occasion / Name *</label>
                <input
                  id="holidayNameInput"
                  name="holidayName"
                  type="text"
                  class="modal-input"
                  placeholder="e.g. Pongal, Ambedkar Jayanti"
                  [(ngModel)]="holidayFormName"
                  required
                />
              </div>

              <div class="modal-actions">
                <button
                  type="button"
                  class="btn-cancel"
                  (click)="closeHolidayModal()"
                  [disabled]="savingHoliday()"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn-save-changes"
                  [disabled]="savingHoliday() || !holidayFormDate || !holidayFormName.trim()"
                >
                  {{ savingHoliday() ? 'Saving…' : (editingHolidayId() ? 'Update Holiday' : 'Add Holiday') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (deletingHoliday()) {
        <div class="modal-backdrop" role="dialog" aria-modal="true">
          <div class="modal-card">
            <h3 class="modal-title">Delete Holiday</h3>
            <p class="modal-desc">
              Are you sure you want to remove the holiday <strong>{{ deletingHoliday()?.name }}</strong> on {{ deletingHoliday()?.holidayDate }}?
            </p>

            <div class="modal-actions">
              <button
                type="button"
                class="btn-cancel"
                (click)="cancelDeleteHoliday()"
                [disabled]="savingHoliday()"
              >
                Cancel
              </button>
              <button
                type="button"
                class="btn-delete-confirm"
                (click)="executeDeleteHoliday()"
                [disabled]="savingHoliday()"
              >
                {{ savingHoliday() ? 'Deleting…' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .settings-page {
      width: 100%;
      max-width: 1000px;
      margin: 0;
      padding-bottom: 2.5rem;
    }

    /* Header matching Image 1 */
    .settings-header {
      margin-bottom: 1.5rem;
    }

    .settings-title-group {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .settings-icon-badge {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #EAF2EF;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #003D30;
      flex-shrink: 0;
    }

    .cog-svg {
      width: 24px;
      height: 24px;
    }

    .settings-h1 {
      font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif);
      font-size: 1.5rem;
      font-weight: 700;
      color: #1F2421;
      margin: 0 0 0.15rem;
      line-height: 1.25;
    }

    .settings-subtitle {
      font-size: 0.875rem;
      color: #5A625D;
      margin: 0;
    }

    /* Tabs matching Image 1 */
    .settings-tabs {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1.75rem;
    }

    .settings-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      border: 1px solid #E5E0D5;
      background: #FFFFFF;
      color: #5A625D;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .settings-tab-btn:hover {
      background: #F6F4EE;
      color: #1F2421;
    }

    .settings-tab-btn.active {
      background: #EAF2EF;
      color: #003D30;
      border-color: #C2D6CF;
    }

    .tab-icon svg {
      width: 18px;
      height: 18px;
      display: block;
    }

    /* Card styling */
    .surface-card {
      background: #FFFFFF;
      border: 1px solid #E5E0D5;
      border-radius: 14px;
      padding: 2rem 2.25rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      width: 100%;
    }

    .card-header {
      margin-bottom: 1.75rem;
    }

    .card-header-with-action {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.75rem;
    }

    .card-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1F2421;
      margin: 0 0 0.35rem;
    }

    .card-subtitle {
      font-size: 0.875rem;
      color: #5A625D;
      margin: 0;
    }

    /* Form styling */
    .info-form {
      display: flex;
      flex-direction: column;
      gap: 1.35rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .form-label {
      font-size: 0.84375rem;
      font-weight: 600;
      color: #1F2421;
    }

    /* Input with Leading Icon - Robust Positioning & Spacing */
    .input-with-icon {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .input-with-icon .input-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #737C76;
      pointer-events: none;
      z-index: 2;
    }

    .input-with-icon .input-icon svg {
      width: 18px;
      height: 18px;
      display: block;
    }

    /* Override any global input padding to guarantee 44px left space */
    .input-with-icon input:not([type="checkbox"]):not([type="radio"]),
    .input-with-icon .form-input,
    .input-with-icon select,
    .input-with-icon .form-select {
      width: 100%;
      padding-left: 44px !important;
      padding-right: 14px !important;
      padding-top: 0.65rem !important;
      padding-bottom: 0.65rem !important;
      min-height: 2.65rem;
      font-size: 0.875rem;
      color: #1F2421;
      background: #FFFFFF;
      border: 1px solid #D8D2C4;
      border-radius: 8px;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .input-with-icon input:focus,
    .input-with-icon select:focus {
      outline: none;
      border-color: #003D30;
      box-shadow: 0 0 0 2px rgba(0, 61, 48, 0.12);
    }

    .hours-row {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .time-input {
      flex: 1;
      max-width: 190px;
    }

    .hours-separator {
      font-size: 0.875rem;
      color: #5A625D;
      font-weight: 500;
    }

    /* Buttons matching Reference */
    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 1rem;
    }

    .btn-save-changes {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #003D30;
      color: #FFFFFF;
      font-size: 0.875rem;
      font-weight: 600;
      padding: 0.75rem 1.75rem;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-save-changes:hover:not(:disabled) {
      background: #002B22;
    }

    .btn-save-changes:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .btn-check-icon svg {
      width: 16px;
      height: 16px;
      display: block;
    }

    .btn-add-holiday {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #003D30;
      color: #FFFFFF;
      font-size: 0.84375rem;
      font-weight: 600;
      padding: 0.65rem 1.35rem;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-add-holiday:hover {
      background: #002B22;
    }

    /* Table matching Image 1 right */
    .table-container {
      overflow-x: auto;
      width: 100%;
    }

    .holidays-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }

    .holidays-table th {
      background: #EAF2EF;
      color: #1F2421;
      font-size: 0.84375rem;
      font-weight: 600;
      text-align: left;
      padding: 0.9rem 1.25rem;
    }

    .holidays-table th:first-child {
      border-top-left-radius: 8px;
      border-bottom-left-radius: 8px;
    }

    .holidays-table th:last-child {
      border-top-right-radius: 8px;
      border-bottom-right-radius: 8px;
    }

    .holidays-table td {
      padding: 1.15rem 1.25rem;
      font-size: 0.875rem;
      color: #1F2421;
      border-bottom: 1px solid #EFECE6;
    }

    .td-date {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      font-weight: 500;
    }

    .row-calendar-icon {
      color: #5A625D;
      display: flex;
      align-items: center;
    }

    .row-calendar-icon svg {
      width: 18px;
      height: 18px;
    }

    .td-occasion {
      font-weight: 500;
      color: #1F2421;
    }

    .td-actions {
      text-align: right;
      white-space: nowrap;
    }

    .action-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.4rem 0.55rem;
      margin-left: 0.4rem;
      border-radius: 6px;
      transition: background 0.15s;
    }

    .action-btn svg {
      width: 18px;
      height: 18px;
      display: block;
    }

    .edit-btn {
      color: #059669;
    }

    .edit-btn:hover {
      background: #EAF2EF;
    }

    .delete-btn {
      color: #DC2626;
    }

    .delete-btn:hover {
      background: #FEE2E2;
    }

    /* Modal styling */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-card {
      background: #FFFFFF;
      border-radius: 14px;
      padding: 2.25rem;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    }

    .modal-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1F2421;
      margin: 0 0 0.35rem;
    }

    .modal-desc {
      font-size: 0.84375rem;
      color: #5A625D;
      margin: 0 0 1.5rem;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .modal-input {
      width: 100%;
      padding: 0.65rem 0.875rem;
      font-size: 0.875rem;
      color: #1F2421;
      background: #FFFFFF;
      border: 1px solid #D8D2C4;
      border-radius: 8px;
    }

    .modal-input:focus {
      outline: none;
      border-color: #003D30;
      box-shadow: 0 0 0 2px rgba(0, 61, 48, 0.12);
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }

    .btn-cancel {
      background: #FFFFFF;
      border: 1px solid #D8D2C4;
      color: #5A625D;
      font-size: 0.875rem;
      font-weight: 600;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      cursor: pointer;
    }

    .btn-cancel:hover {
      background: #F6F4EE;
    }

    .btn-delete-confirm {
      background: #DC2626;
      color: #FFFFFF;
      border: none;
      font-size: 0.875rem;
      font-weight: 600;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      cursor: pointer;
    }

    .btn-delete-confirm:hover {
      background: #B91C1C;
    }

    .alert {
      padding: 0.85rem 1.25rem;
      border-radius: 8px;
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
    }

    .alert-success {
      background: #EAF2EF;
      color: #003D30;
      border: 1px solid #C2D6CF;
    }

    .alert-error {
      background: #FEE2E2;
      color: #991B1B;
      border: 1px solid #FECACA;
    }

    .loading-state, .empty-state {
      padding: 2.5rem;
      text-align: center;
      color: #5A625D;
      font-size: 0.875rem;
    }

    @media (max-width: 640px) {
      .form-row-2 {
        grid-template-columns: 1fr;
      }
      .hours-row {
        flex-direction: column;
        align-items: flex-start;
      }
      .time-input {
        max-width: 100%;
        width: 100%;
      }
      .surface-card {
        padding: 1.5rem 1.25rem;
      }
    }
  `]
})
export class SettingsManagerComponent implements OnInit {
  private readonly opsService = inject(LibrarianOperationsService);

  readonly activeTab = signal<'info' | 'holidays'>('info');
  readonly error = signal('');
  readonly notice = signal('');

  // Tab 1 state
  readonly loadingInfo = signal(true);
  readonly savingInfo = signal(false);
  libraryInfo: LibraryInfoRecord = {
    libraryName: 'VIT-AP Central Library',
    contactEmail: 'library@vitap.ac.in',
    contactPhone: '+91 86323 45678',
    address: 'VIT-AP University, Inavolu, Guntur - 522237',
    openTime: '09:00 AM',
    closeTime: '06:00 PM'
  };

  // Tab 2 state
  readonly holidays = signal<HolidayRecord[]>([]);
  readonly loadingHolidays = signal(false);
  readonly savingHoliday = signal(false);
  readonly showHolidayModal = signal(false);
  readonly editingHolidayId = signal<string | null>(null);
  holidayFormDate = '';
  holidayFormName = '';

  readonly deletingHoliday = signal<HolidayRecord | null>(null);

  ngOnInit(): void {
    this.loadLibraryInfo();
  }

  setActiveTab(tab: 'info' | 'holidays'): void {
    this.activeTab.set(tab);
    this.error.set('');
    this.notice.set('');
    if (tab === 'holidays' && !this.holidays().length && !this.loadingHolidays()) {
      this.loadHolidays();
    }
  }

  loadLibraryInfo(): void {
    this.loadingInfo.set(true);
    this.opsService.getLibraryInfo()
      .pipe(finalize(() => this.loadingInfo.set(false)))
      .subscribe({
        next: (info) => {
          if (info) {
            this.libraryInfo = { ...info };
          }
        },
        error: () => {
          this.error.set('Failed to load library details.');
        }
      });
  }

  saveLibraryInfo(): void {
    if (this.savingInfo()) return;
    this.error.set('');
    this.notice.set('');

    // Validations
    if (!this.libraryInfo.libraryName.trim()) {
      this.error.set('Library name is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.libraryInfo.contactEmail.trim())) {
      this.error.set('Please enter a valid contact email address.');
      return;
    }
    if (!this.libraryInfo.contactPhone.trim()) {
      this.error.set('Contact phone is required.');
      return;
    }
    if (!this.libraryInfo.address.trim()) {
      this.error.set('Address is required.');
      return;
    }

    this.savingInfo.set(true);
    this.opsService.updateLibraryInfo(this.libraryInfo)
      .pipe(finalize(() => this.savingInfo.set(false)))
      .subscribe({
        next: (updated) => {
          this.libraryInfo = { ...updated };
          this.notice.set('Library information saved successfully.');
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'Failed to save library information.');
        }
      });
  }

  loadHolidays(): void {
    this.loadingHolidays.set(true);
    this.opsService.getHolidays()
      .pipe(finalize(() => this.loadingHolidays.set(false)))
      .subscribe({
        next: (items) => this.holidays.set(items || []),
        error: () => this.error.set('Failed to load holiday calendar.')
      });
  }

  openAddHolidayModal(): void {
    this.editingHolidayId.set(null);
    this.holidayFormDate = '';
    this.holidayFormName = '';
    this.showHolidayModal.set(true);
    this.error.set('');
  }

  openEditHolidayModal(h: HolidayRecord): void {
    this.editingHolidayId.set(h.id);
    this.holidayFormDate = h.holidayDate;
    this.holidayFormName = h.name;
    this.showHolidayModal.set(true);
    this.error.set('');
  }

  closeHolidayModal(): void {
    this.showHolidayModal.set(false);
    this.editingHolidayId.set(null);
  }

  saveHoliday(): void {
    if (this.savingHoliday()) return;
    const dateStr = this.holidayFormDate.trim();
    const nameStr = this.holidayFormName.trim();

    if (!dateStr || !nameStr) {
      this.error.set('Please provide both holiday date and occasion name.');
      return;
    }

    // Check duplicate dates locally as well
    const editId = this.editingHolidayId();
    const duplicate = this.holidays().find(h => h.holidayDate === dateStr && h.id !== editId);
    if (duplicate) {
      this.error.set('A holiday is already configured for this date.');
      return;
    }

    this.savingHoliday.set(true);
    this.error.set('');
    this.notice.set('');

    const req$ = editId
      ? this.opsService.updateHoliday(editId, dateStr, nameStr)
      : this.opsService.addHoliday(dateStr, nameStr);

    req$.pipe(finalize(() => this.savingHoliday.set(false)))
      .subscribe({
        next: (saved) => {
          this.notice.set(editId ? 'Holiday updated successfully.' : 'Holiday added successfully.');
          this.closeHolidayModal();
          this.loadHolidays();
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'Failed to save holiday.');
        }
      });
  }

  confirmDeleteHoliday(h: HolidayRecord): void {
    this.deletingHoliday.set(h);
    this.error.set('');
  }

  cancelDeleteHoliday(): void {
    this.deletingHoliday.set(null);
  }

  executeDeleteHoliday(): void {
    const target = this.deletingHoliday();
    if (!target) return;

    this.savingHoliday.set(true);
    this.opsService.deleteHoliday(target.id)
      .pipe(finalize(() => this.savingHoliday.set(false)))
      .subscribe({
        next: () => {
          this.notice.set(`Holiday "${target.name}" deleted successfully.`);
          this.cancelDeleteHoliday();
          this.loadHolidays();
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'Failed to delete holiday.');
        }
      });
  }

  formatHolidayDate(isoDate: string): string {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    }
    return isoDate;
  }
}
