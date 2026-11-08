import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MemberDetail, MemberManagementService, MemberSummary } from './member-management.service';
import { OFFICIAL_DEPARTMENTS } from '../auth/auth.service';
import { MemberRequestsService } from './member-requests.service';

@Component({
  selector: 'app-member-directory',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, RouterLink],
  template: `
    <!-- Page Header matching Screenshot 5 -->
    <header class="page-header">
      <div>
        <h1 class="page-title">Members</h1>
        <p class="page-subtitle">Manage student and faculty library memberships</p>
      </div>
      <a routerLink="/workspace/librarian/member-requests" class="member-requests-btn" aria-label="View member requests">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
        <span>Member Requests ({{ pendingRequestsCount() }})</span>
        @if (pendingRequestsCount() > 0) {
          <span class="count-badge-dot">{{ pendingRequestsCount() }}</span>
        }
      </a>
    </header>

    @if (error()) {
      <p class="alert alert-error" role="alert">{{ error() }}</p>
    }
    @if (notice()) {
      <p class="alert alert-success" role="status">{{ notice() }}</p>
    }

    <!-- Tabs matching Screenshot 5 -->
    <div class="filter-tabs-bar" role="tablist">
      <button
        type="button"
        class="tab-btn"
        [class.active]="roleFilter === ''"
        (click)="setRoleTab('')"
      >
        All Members ({{ totalElements() }})
      </button>
      <button
        type="button"
        class="tab-btn"
        [class.active]="roleFilter === 'STUDENT'"
        (click)="setRoleTab('STUDENT')"
      >
        Students
      </button>
      <button
        type="button"
        class="tab-btn"
        [class.active]="roleFilter === 'FACULTY'"
        (click)="setRoleTab('FACULTY')"
      >
        Faculty
      </button>
    </div>

    <!-- Search and Filter Bar -->
    <section class="toolbar-panel surface-card">
      <div class="search-input-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <label for="member-search" class="sr-only">Search members</label>
        <input
          id="member-search"
          type="search"
          [(ngModel)]="searchQuery"
          (keyup.enter)="applyFilters()"
          placeholder="Search members by name, ID, or email..."
        />
      </div>

      <div class="select-field">
        <label for="role-filter" class="sr-only">Role</label>
        <select id="role-filter" [(ngModel)]="roleFilter" (change)="applyFilters()">
          <option value="">All Roles</option>
          <option value="STUDENT">Students</option>
          <option value="FACULTY">Faculty</option>
        </select>
      </div>

      <div class="select-field">
        <label for="department-filter" class="sr-only">Department</label>
        <select id="department-filter" [(ngModel)]="departmentFilter" (change)="applyFilters()">
          <option value="">All Departments</option>
          @for (dept of officialDepartments; track dept) {
            <option [value]="dept">{{ dept }}</option>
          }
        </select>
      </div>

      <div class="select-field">
        <label for="status-filter" class="sr-only">Status</label>
        <select id="status-filter" [(ngModel)]="statusFilter" (change)="applyFilters()">
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
        </select>
      </div>

      <div class="toolbar-actions">
        <button class="button button-primary filter-btn" type="button" (click)="applyFilters()" [disabled]="loading()">
          Filter
        </button>
        <button class="button button-quiet" type="button" (click)="resetFilters()" [disabled]="loading()">
          Reset
        </button>
      </div>
    </section>

    <!-- Members Table matching Screenshot 5 -->
    @if (loading()) {
      <div class="loading-state surface-card" role="status">Loading members…</div>
    } @else if (!members().length) {
      <section class="empty-state surface-card">
        <div class="empty-icon-circle" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
          </svg>
        </div>
        <h2>No members found</h2>
        <p>No student or faculty members match the current search or filters.</p>
      </section>
    } @else {
      <div class="table-card surface-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th scope="col" style="width: 24%;">MEMBER</th>
                <th scope="col" style="width: 22%;">EMAIL</th>
                <th scope="col" style="width: 12%;">ROLE</th>
                <th scope="col" style="width: 16%;">DEPARTMENT</th>
                <th scope="col" style="width: 10%;">STATUS</th>
                <th scope="col" style="width: 8%;">LOANS</th>
                <th scope="col" style="width: 8%; text-align: right;">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              @for (m of members(); track m.id; let idx = $index) {
                <tr class="member-row">
                  <!-- Member: Avatar + Name / ID -->
                  <td>
                    <div class="member-cell">
                      <div class="member-avatar" [ngClass]="getAvatarColor(idx)" aria-hidden="true">
                        {{ getInitials(m) }}
                      </div>
                      <div class="member-meta">
                        <strong class="member-name">{{ m.displayName || m.institutionalId || getEmailPrefix(m.email) }}</strong>
                        @if (m.displayName && m.institutionalId) {
                          <span class="member-subtext muted">{{ m.institutionalId }}</span>
                        } @else if (m.institutionalId) {
                          <span class="member-subtext muted">{{ getEmailPrefix(m.email) }}</span>
                        }
                      </div>
                    </div>
                  </td>

                  <!-- Email -->
                  <td>
                    <span class="member-email">{{ m.email }}</span>
                  </td>

                  <!-- Role -->
                  <td>
                    <span
                      class="role-badge"
                      [class.role-student]="m.role === 'STUDENT'"
                      [class.role-faculty]="m.role === 'FACULTY'"
                    >
                      {{ m.role === 'STUDENT' ? 'Student' : 'Faculty' }}
                    </span>
                  </td>

                  <!-- Department -->
                  <td>
                    @if (m.department) {
                      <span class="dept-pill" [title]="m.department">{{ getDeptAbbr(m.department) }}</span>
                    } @else {
                      <span class="muted">—</span>
                    }
                  </td>

                  <!-- Status -->
                  <td>
                    <span
                      class="status-pill"
                      [class.status-active]="m.enabled"
                      [class.status-disabled]="!m.enabled"
                    >
                      <span class="status-dot"></span>
                      {{ m.enabled ? 'Active' : 'Disabled' }}
                    </span>
                  </td>

                  <!-- Active Loans -->
                  <td>
                    <span class="loan-count-pill" [class.has-loans]="m.currentLoans > 0">
                      {{ m.currentLoans }}
                    </span>
                  </td>

                  <!-- Actions -->
                  <td style="text-align: right;">
                    <div class="row-actions">
                      <button class="button button-quiet btn-sm" type="button" (click)="viewDetails(m)">
                        View details
                      </button>
                      @if (m.enabled) {
                        <button class="button button-danger-quiet btn-sm" type="button" (click)="promptStatusChange(m, false)" [disabled]="pending()">
                          Disable
                        </button>
                      } @else {
                        <button class="button button-quiet btn-sm" type="button" (click)="promptStatusChange(m, true)" [disabled]="pending()">
                          Enable
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Table Footer / Pagination -->
        <div class="table-footer">
          <span class="pagination-info">
            Showing page {{ currentPage() + 1 }} of {{ totalPages() || 1 }} ({{ totalElements() }} members)
          </span>
          <div class="pagination-controls">
            <button
              class="pagination-btn"
              type="button"
              (click)="goToPage(currentPage() - 1)"
              [disabled]="currentPage() === 0 || loading()"
              aria-label="Previous page"
            >
              &lsaquo;
            </button>
            <span class="pagination-page active">{{ currentPage() + 1 }}</span>
            <button
              class="pagination-btn"
              type="button"
              (click)="goToPage(currentPage() + 1)"
              [disabled]="currentPage() >= totalPages() - 1 || loading()"
              aria-label="Next page"
            >
              &rsaquo;
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Add Member Modal -->
    @if (showAddMemberModal()) {
      <div class="modal-backdrop" (click)="showAddMemberModal.set(false)">
        <div class="modal-dialog surface-card" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <div>
              <p class="eyebrow">MEMBERSHIP PROVISIONING</p>
              <h2>Add New Member</h2>
            </div>
            <button class="close-btn" type="button" (click)="showAddMemberModal.set(false)" aria-label="Close dialog">✕</button>
          </header>
          <div class="modal-body">
            <p class="muted">
              Student and Faculty members self-register through the public university portal or can be provisioned by academic administration with verified university credentials.
            </p>
            <div class="modal-actions-center" style="display:flex;gap:0.75rem;justify-content:center;margin-top:1.25rem;">
              <a class="button button-primary" routerLink="/workspace/librarian/members/new" (click)="showAddMemberModal.set(false)">
                + Provision New Member
              </a>
              <button class="button button-secondary" type="button" (click)="showAddMemberModal.set(false)">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Member Details Drawer/Modal -->
    @if (selectedMember(); as details) {
      <div class="modal-backdrop" (click)="closeDetails()">
        <div class="modal-dialog surface-card" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <div>
              <p class="eyebrow">MEMBER PROFILE</p>
              <h2>{{ details.displayName || details.institutionalId || details.email }}</h2>
            </div>
            <button class="close-btn" type="button" (click)="closeDetails()" aria-label="Close dialog">✕</button>
          </header>

          <div class="modal-body">
            <div class="profile-summary">
              <div class="profile-field">
                <span class="profile-label">User Name:</span>
                <span class="profile-value bold">{{ details.displayName || details.institutionalId || details.email }}</span>
              </div>
              <div class="profile-field">
                <span class="profile-label">Institutional Email:</span>
                <span class="profile-value">{{ details.email }}</span>
              </div>
              <div class="profile-field">
                <span class="profile-label">Role:</span>
                <span class="profile-value">
                  <span class="role-badge" [class.role-student]="details.role === 'STUDENT'" [class.role-faculty]="details.role === 'FACULTY'">
                    {{ details.role === 'STUDENT' ? 'Student' : 'Faculty' }}
                  </span>
                </span>
              </div>
              @if (details.role === 'STUDENT') {
                <div class="profile-field">
                  <span class="profile-label">Student Institutional ID:</span>
                  <span class="profile-value mono">{{ details.institutionalId }}</span>
                </div>
              }
              <div class="profile-field">
                <span class="profile-label">Department:</span>
                <span class="profile-value">
                  @if (!isEditingDepartment()) {
                    <span class="bold">{{ details.department || 'Not assigned' }}</span>
                    <button type="button" class="edit-dept-link" (click)="startEditDepartment(details.department)">Change</button>
                  } @else {
                    <div class="edit-dept-inline">
                      <select [(ngModel)]="selectedEditDepartment" class="edit-dept-select">
                        @for (dept of officialDepartments; track dept) {
                          <option [value]="dept">{{ dept }}</option>
                        }
                      </select>
                      <button type="button" class="button button-sm button-primary" (click)="saveDepartment(details.id)" [disabled]="savingDept()">
                        {{ savingDept() ? 'Saving…' : 'Save' }}
                      </button>
                      <button type="button" class="button button-sm button-quiet" (click)="cancelEditDepartment()" [disabled]="savingDept()">
                        Cancel
                      </button>
                    </div>
                  }
                </span>
              </div>
              <div class="profile-field">
                <span class="profile-label">Account Status:</span>
                <span class="profile-value">
                  <span class="status-badge" [class.status-badge-success]="details.enabled" [class.status-badge-neutral]="!details.enabled">
                    {{ details.enabled ? 'Active' : 'Disabled' }}
                  </span>
                </span>
              </div>
              <div class="profile-field">
                <span class="profile-label">Registered on:</span>
                <span class="profile-value">{{ details.createdAt | date:'mediumDate' }}</span>
              </div>
              <div class="profile-field">
                <span class="profile-label">Identity Verified:</span>
                <span class="profile-value">{{ details.identityVerifiedAt ? (details.identityVerifiedAt | date:'mediumDate') : 'Self-verified email' }}</span>
              </div>
            </div>

            <!-- Current Active Loans -->
            <section class="modal-section">
              <h3>Active Loans ({{ details.currentLoans.length }})</h3>
              @if (!details.currentLoans.length) {
                <p class="muted">No currently issued books.</p>
              } @else {
                <div class="table-wrap-compact">
                  <table class="compact-table">
                    <thead>
                      <tr>
                        <th>Book</th>
                        <th>Copy ID</th>
                        <th>Due Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (loan of details.currentLoans; track loan.id) {
                        <tr>
                          <td><strong>{{ loan.bookTitle }}</strong></td>
                          <td>{{ loan.copyIdentifier }}</td>
                          <td>{{ loan.dueDate | date:'mediumDate' }}</td>
                          <td>
                            <span class="status-badge" [class.status-badge-warning]="loan.overdue" [class.status-badge-success]="!loan.overdue">
                              {{ loan.overdue ? 'Overdue' : 'On Loan' }}
                            </span>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </section>

            <!-- Borrowing History -->
            <section class="modal-section">
              <h3>Past Borrowing History ({{ details.borrowingHistory.length }})</h3>
              @if (!details.borrowingHistory.length) {
                <p class="muted">No past loans recorded.</p>
              } @else {
                <div class="table-wrap-compact">
                  <table class="compact-table">
                    <thead>
                      <tr>
                        <th>Book</th>
                        <th>Copy ID</th>
                        <th>Issue Date</th>
                        <th>Return Date</th>
                        <th>Condition</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (loan of details.borrowingHistory; track loan.id) {
                        <tr>
                          <td><strong>{{ loan.bookTitle }}</strong></td>
                          <td>{{ loan.copyIdentifier }}</td>
                          <td>{{ loan.issueDate | date:'mediumDate' }}</td>
                          <td>{{ loan.actualReturnDate ? (loan.actualReturnDate | date:'mediumDate') : '—' }}</td>
                          <td>
                            <span class="status-badge" [class.status-badge-success]="loan.status === 'RETURNED'" [class.status-badge-neutral]="loan.status === 'LOST'">
                              {{ loan.status }}
                            </span>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </section>

            <!-- Borrow Requests -->
            <section class="modal-section">
              <h3>Borrow Requests ({{ details.borrowRequests.length }})</h3>
              @if (!details.borrowRequests.length) {
                <p class="muted">No borrow requests found.</p>
              } @else {
                <div class="table-wrap-compact">
                  <table class="compact-table">
                    <thead>
                      <tr>
                        <th>Book</th>
                        <th>Requested On</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (req of details.borrowRequests; track req.id) {
                        <tr>
                          <td><strong>{{ req.bookTitle }}</strong></td>
                          <td>{{ req.submittedAt | date:'mediumDate' }}</td>
                          <td>
                            <span class="status-badge" [class.status-badge-warning]="req.status === 'PENDING'" [class.status-badge-success]="req.status === 'APPROVED' || req.status === 'ISSUED'">
                              {{ req.status }}
                            </span>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </section>
          </div>

          <footer class="modal-footer">
            @if (details.enabled) {
              <button class="button button-secondary" type="button" (click)="toggleSelectedMemberStatus(details, false)" [disabled]="pending()">
                Disable Account
              </button>
            } @else {
              <button class="button button-primary" type="button" (click)="toggleSelectedMemberStatus(details, true)" [disabled]="pending()">
                Enable Account
              </button>
            }
            <button class="button button-quiet" type="button" (click)="closeDetails()">Close</button>
          </footer>
        </div>
      </div>
    }

    <!-- Status Change Confirmation Modal -->
    @if (confirmTarget(); as target) {
      <div class="modal-backdrop" (click)="cancelConfirm()">
        <div class="confirm-dialog surface-card" (click)="$event.stopPropagation()">
          <h3>Confirm Account Status Change</h3>
          <p>
            Are you sure you want to
            <strong>{{ confirmNewState() ? 'ENABLE' : 'DISABLE' }}</strong>
            the account for <strong>{{ target.email }}</strong>?
          </p>
          @if (!confirmNewState()) {
            <p class="warning-text">
              Disabling will prevent this member from logging in or borrowing library items. Existing loans and history will remain intact.
            </p>
          }
          <div class="confirm-actions">
            <button class="button" [class.button-primary]="confirmNewState()" [class.button-secondary]="!confirmNewState()" type="button" (click)="executeStatusChange()" [disabled]="pending()">
              {{ pending() ? 'Updating…' : (confirmNewState() ? 'Yes, Enable Account' : 'Yes, Disable Account') }}
            </button>
            <button class="button button-quiet" type="button" (click)="cancelConfirm()" [disabled]="pending()">
              Cancel
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
    }
    .page-title {
      font-family: var(--type-page-title-family);
      font-size: var(--type-page-title-size);
      font-weight: var(--type-page-title-weight);
      color: var(--type-page-title-color);
      margin: 0 0 0.25rem;
      line-height: var(--type-page-title-line);
      letter-spacing: var(--letter-spacing-tight);
    }
    .page-subtitle {
      font-size: var(--type-page-subtitle-size);
      color: var(--type-page-subtitle-color);
      margin: 0;
    }
    .member-requests-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.6rem 1.15rem;
      font-size: var(--type-button-size);
      font-weight: 600;
      background: #003D30 !important;
      color: #FFFFFF !important;
      border: 1px solid #003D30;
      border-radius: 9999px;
      cursor: pointer;
      text-decoration: none;
      box-shadow: 0 1px 3px rgba(0, 61, 48, 0.25);
      transition: all 0.15s ease;
    }
    .member-requests-btn:hover {
      background: #002B22 !important;
      border-color: #002B22;
      color: #FFFFFF !important;
    }
    .member-requests-btn:focus-visible {
      outline: 2px solid #003D30;
      outline-offset: 2px;
    }
    .member-requests-btn .btn-icon {
      width: 1.05rem;
      height: 1.05rem;
      color: #FFFFFF;
      stroke: #FFFFFF;
      flex-shrink: 0;
    }
    .count-badge-dot {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.35rem;
      height: 1.35rem;
      padding: 0 0.4rem;
      border-radius: 9999px;
      background: #00261E;
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #FFFFFF;
      font-size: 0.75rem;
      font-weight: 700;
      line-height: 1;
    }

    /* Filter Tabs Bar matching Screenshot 5 */
    .filter-tabs-bar {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid var(--color-line-200);
      margin-bottom: 1.25rem;
      overflow-x: auto;
    }
    .tab-btn {
      padding: 0.65rem 1.25rem;
      font-size: 0.88rem;
      font-weight: 600;
      background: transparent;
      border: 0;
      border-bottom: 2px solid transparent;
      color: var(--color-charcoal-600);
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .tab-btn:hover {
      color: #003D30;
    }
    .tab-btn.active {
      color: #003D30;
      border-bottom-color: #003D30;
    }

    /* Toolbar Panel */
    .toolbar-panel {
      display: grid;
      grid-template-columns: 1fr 180px 160px auto;
      gap: 0.85rem;
      padding: 0.85rem 1.15rem;
      margin-bottom: 1.25rem;
      align-items: center;
      background: #ffffff;
      border: 1px solid var(--color-line-200);
      border-radius: 10px;
    }
    .search-input-wrap {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      background: #F9FBF9;
      border: 1px solid var(--color-line-200);
      border-radius: 7px;
      padding: 0.45rem 0.85rem;
    }
    .search-icon {
      width: 1.1rem;
      height: 1.1rem;
      color: var(--color-charcoal-400);
      flex-shrink: 0;
    }
    .search-input-wrap input {
      border: 0 !important;
      background: transparent !important;
      outline: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      font-size: 0.85rem;
      width: 100%;
      color: var(--color-charcoal-900);
    }
    .select-field select {
      width: 100%;
      padding: 0.55rem 0.85rem;
      border: 1px solid var(--color-line-200);
      border-radius: 7px;
      background: #ffffff;
      font-size: 0.85rem;
      color: var(--color-charcoal-800);
      outline: none;
    }
    .toolbar-actions {
      display: flex;
      gap: 0.4rem;
    }
    .filter-btn {
      padding: 0.55rem 1.15rem;
      font-size: 0.85rem;
      font-weight: 600;
      background: #003D30;
      color: #ffffff;
      border: 0;
      border-radius: 7px;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .filter-btn:hover {
      background: #002B22;
    }

    /* Table Card */
    .table-card {
      background: #ffffff;
      border: 1px solid var(--color-line-200);
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .table-responsive {
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .data-table th {
      padding: 0.75rem 1.15rem;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: var(--color-charcoal-500);
      background: #FAF9F6;
      border-bottom: 1px solid var(--color-line-200);
    }
    .data-table td {
      padding: 0.9rem 1.15rem;
      border-bottom: 1px solid var(--color-line-100);
      vertical-align: middle;
      font-size: 0.85rem;
    }
    .member-row:hover {
      background: #FAFCFA;
    }

    /* Member Cell */
    .member-cell {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .member-avatar {
      width: 2.35rem;
      height: 2.35rem;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: 0.8rem;
      font-weight: 700;
      flex-shrink: 0;
    }
    .avatar-orange { background: #FEF3C7; color: #D97706; }
    .avatar-purple { background: #F3E8FF; color: #7E22CE; }
    .avatar-blue { background: #DBEAFE; color: #1D4ED8; }
    .avatar-teal { background: #CCFBF1; color: #0F766E; }
    .avatar-pink { background: #FCE7F3; color: #BE185D; }
    .avatar-red { background: #FEE2E2; color: #B91C1C; }

    .member-meta {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .member-name {
      color: var(--color-charcoal-900);
      font-size: 0.88rem;
    }
    .member-subtext {
      font-size: 0.75rem;
    }
    .member-email {
      color: var(--color-charcoal-700);
      font-size: 0.85rem;
    }

    /* Role Badge */
    .dept-pill {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      background: var(--color-surface-sunken, #f1f5f9);
      border: 1px solid var(--color-line-200, #e2e8f0);
      color: var(--color-forest-900, #00392f);
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    .edit-dept-link {
      margin-left: 0.65rem;
      background: none;
      border: none;
      color: var(--color-forest-900, #00392f);
      font-size: 0.8rem;
      font-weight: 700;
      text-decoration: underline;
      cursor: pointer;
    }
    .edit-dept-inline {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
      margin-top: 0.25rem;
    }
    .edit-dept-select {
      padding: 0.35rem 0.6rem;
      border: 1px solid var(--color-line-300, #cbd5e1);
      border-radius: 0.5rem;
      font-size: 0.82rem;
      background: #fff;
    }
    .button-sm {
      padding: 0.3rem 0.65rem !important;
      min-height: auto !important;
      font-size: 0.78rem !important;
    }
    .role-badge {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
      font-size: 0.74rem;
      font-weight: 700;
    }
    .role-student {
      background: #EEF2FB;
      color: #2563EB;
    }
    .role-faculty {
      background: #F3E8FF;
      color: #7E22CE;
    }

    /* Status Pills */
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: 16px;
      font-size: 0.74rem;
      font-weight: 700;
    }
    .status-dot {
      width: 0.45rem;
      height: 0.45rem;
      border-radius: 50%;
    }
    .status-active {
      background: #EAF2EF;
      color: #003D30;
      border: 1px solid #C2D6CF;
    }
    .status-active .status-dot {
      background: #003D30;
    }
    .status-disabled {
      background: #FDF0EE;
      color: #DC2626;
    }
    .status-disabled .status-dot {
      background: #DC2626;
    }

    /* Active Loans */
    .loan-count-pill {
      display: inline-block;
      min-width: 1.5rem;
      text-align: center;
      font-weight: 700;
      color: var(--color-charcoal-700);
    }
    .loan-count-pill.has-loans {
      color: #003D30;
    }

    .row-actions {
      display: inline-flex;
      gap: 0.35rem;
    }
    .btn-sm {
      padding: 0.35rem 0.75rem;
      font-size: 0.78rem;
      border-radius: 5px;
    }

    /* Table Footer */
    .table-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1.25rem;
      background: #FAF9F6;
      border-top: 1px solid var(--color-line-200);
    }
    .pagination-info {
      font-size: 0.8rem;
      color: var(--color-charcoal-600);
    }
    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .pagination-btn, .pagination-page {
      display: grid;
      place-items: center;
      min-width: 1.85rem;
      height: 1.85rem;
      padding: 0 0.35rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      border: 1px solid var(--color-line-200);
      background: #ffffff;
      color: var(--color-charcoal-700);
      cursor: pointer;
    }
    .pagination-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .pagination-page.active {
      background: #003D30;
      color: #ffffff;
      border-color: #003D30;
      font-weight: 700;
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(4px);
      display: grid;
      place-items: center;
      z-index: 100;
      padding: 1rem;
    }
    .modal-dialog {
      background: #ffffff;
      border-radius: 12px;
      width: 100%;
      max-width: 36rem;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
      border: 1px solid var(--color-line-200);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--color-line-200);
    }
    .modal-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-charcoal-900);
    }
    .close-btn {
      background: transparent;
      border: 0;
      font-size: 1.25rem;
      color: var(--color-charcoal-500);
      cursor: pointer;
    }
    .modal-body {
      padding: 1.25rem 1.5rem;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--color-line-200);
      background: #FAF9F6;
    }
    .profile-summary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem 1.25rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--color-line-200);
    }
    .profile-field {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .profile-label {
      font-size: 0.74rem;
      color: var(--color-charcoal-500);
      font-weight: 600;
    }
    .profile-value {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--color-charcoal-900);
    }
    .modal-section {
      margin-top: 1.25rem;
    }
    .modal-section h3 {
      font-size: 0.95rem;
      font-weight: 700;
      margin: 0 0 0.65rem;
      color: var(--color-charcoal-900);
    }
    .compact-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
    }
    .compact-table th {
      text-align: left;
      padding: 0.4rem 0.6rem;
      background: #FAF9F6;
      border-bottom: 1px solid var(--color-line-200);
      color: var(--color-charcoal-500);
      font-size: 0.72rem;
    }
    .compact-table td {
      padding: 0.55rem 0.6rem;
      border-bottom: 1px solid var(--color-line-100);
    }

    /* Confirm Dialog */
    .confirm-dialog {
      background: #ffffff;
      border-radius: 12px;
      padding: 1.5rem;
      max-width: 28rem;
      width: 100%;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
    }
    .confirm-dialog h3 {
      margin: 0 0 0.65rem;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--color-charcoal-900);
    }
    .confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.25rem;
    }
    .warning-text {
      font-size: 0.82rem;
      color: #DC2626;
      background: #FEF2F2;
      padding: 0.65rem 0.85rem;
      border-radius: 6px;
      border: 1px solid #FCA5A5;
      margin-top: 0.65rem;
    }

    .modal-actions-center {
      display: flex;
      justify-content: flex-end;
      margin-top: 1.25rem;
    }

    .empty-state {
      padding: 3.5rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .empty-icon-circle {
      width: 3.75rem;
      height: 3.75rem;
      border-radius: 50%;
      background: #EAF2EF;
      color: #003D30;
      display: grid;
      place-items: center;
      margin-bottom: 1rem;
    }
    .empty-icon-circle svg {
      width: 1.85rem;
      height: 1.85rem;
    }
    .loading-state {
      padding: 3rem;
      text-align: center;
      color: var(--color-charcoal-500);
    }
  `]
})
export class MemberDirectoryComponent implements OnInit {
  private readonly service = inject(MemberManagementService);
  private readonly memberRequestsService = inject(MemberRequestsService);

  readonly members = signal<MemberSummary[]>([]);
  readonly pendingRequestsCount = signal(0);
  readonly selectedMember = signal<MemberDetail | null>(null);
  readonly confirmTarget = signal<MemberSummary | null>(null);
  readonly confirmNewState = signal<boolean>(false);

  readonly loading = signal(false);
  readonly pending = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  readonly currentPage = signal(0);
  readonly totalPages = signal(0);
  readonly totalElements = signal(0);
  readonly pageSize = signal(15);
  readonly showAddMemberModal = signal(false);

  searchQuery = '';
  roleFilter = '';
  statusFilter = '';
  departmentFilter = '';
  readonly officialDepartments = OFFICIAL_DEPARTMENTS;
  readonly isEditingDepartment = signal(false);
  readonly savingDept = signal(false);
  selectedEditDepartment = '';

  private readonly avatarColors = [
    'avatar-orange',
    'avatar-purple',
    'avatar-blue',
    'avatar-teal',
    'avatar-pink',
    'avatar-red'
  ];

  ngOnInit(): void {
    this.loadMembers();
    this.loadPendingRequestsCount();
  }

  loadPendingRequestsCount(): void {
    this.memberRequestsService.getCounts().subscribe({
      next: (counts) => this.pendingRequestsCount.set(counts.pending),
      error: () => {}
    });
  }

  setRoleTab(role: string) {
    this.roleFilter = role;
    this.currentPage.set(0);
    this.loadMembers();
  }

  getAvatarColor(index: number): string {
    return this.avatarColors[index % this.avatarColors.length];
  }

  getInitials(m: MemberSummary): string {
    if (m.displayName) {
      return m.displayName.slice(0, 2).toUpperCase();
    }
    if (m.institutionalId) {
      return m.institutionalId.slice(0, 2).toUpperCase();
    }
    const name = m.email.split('@')[0];
    const parts = name.split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  getEmailPrefix(email: string): string {
    return email.split('@')[0];
  }

  loadMembers(): void {
    this.loading.set(true);
    this.error.set('');

    const query = this.searchQuery.trim();
    const role = this.roleFilter;
    const enabled =
      this.statusFilter === 'ACTIVE'
        ? true
        : this.statusFilter === 'DISABLED'
        ? false
        : null;

    this.service
      .list(query, role, enabled, this.departmentFilter, this.currentPage(), this.pageSize())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => {
          this.members.set(page.content);
          this.currentPage.set(page.page);
          this.totalPages.set(page.totalPages);
          this.totalElements.set(page.totalElements);
        },
        error: () => {
          this.error.set('Failed to load member directory. Please check your connection.');
        },
      });
  }

  applyFilters(): void {
    this.currentPage.set(0);
    this.loadMembers();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.roleFilter = '';
    this.statusFilter = '';
    this.departmentFilter = '';
    this.currentPage.set(0);
    this.loadMembers();
  }

  goToPage(page: number): void {
    if (page < 0 || (this.totalPages() > 0 && page >= this.totalPages())) return;
    this.currentPage.set(page);
    this.loadMembers();
  }

  viewDetails(member: MemberSummary): void {
    this.pending.set(true);
    this.error.set('');
    this.service
      .get(member.id)
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe({
        next: (detail) => {
          this.selectedMember.set(detail);
        },
        error: () => {
          this.error.set('Could not load detailed member record.');
        },
      });
  }

  closeDetails(): void {
    this.selectedMember.set(null);
  }

  promptStatusChange(member: MemberSummary, enable: boolean): void {
    this.confirmTarget.set(member);
    this.confirmNewState.set(enable);
  }

  cancelConfirm(): void {
    this.confirmTarget.set(null);
  }

  executeStatusChange(): void {
    const target = this.confirmTarget();
    if (!target) return;

    const enable = this.confirmNewState();
    this.pending.set(true);
    this.error.set('');
    this.notice.set('');

    const op$ = enable ? this.service.enable(target.id) : this.service.disable(target.id);

    op$.pipe(finalize(() => this.pending.set(false))).subscribe({
      next: () => {
        this.confirmTarget.set(null);
        this.notice.set(
          `Account for ${target.email} has been ${enable ? 'enabled' : 'disabled'}.`
        );
        this.loadMembers();
        if (this.selectedMember()?.id === target.id) {
          this.viewDetails(target);
        }
      },
      error: () => {
        this.error.set(`Failed to ${enable ? 'enable' : 'disable'} account.`);
      },
    });
  }

  startEditDepartment(currentDept?: string | null): void {
    this.selectedEditDepartment = currentDept || this.officialDepartments[0];
    this.isEditingDepartment.set(true);
  }

  cancelEditDepartment(): void {
    this.isEditingDepartment.set(false);
  }

  saveDepartment(memberId: string): void {
    if (!this.selectedEditDepartment) return;
    this.savingDept.set(true);
    this.error.set('');
    this.service.updateDepartment(memberId, this.selectedEditDepartment)
      .pipe(finalize(() => this.savingDept.set(false)))
      .subscribe({
        next: (updated) => {
          this.selectedMember.set(updated);
          this.isEditingDepartment.set(false);
          this.notice.set(`Department updated to ${updated.department}.`);
          this.loadMembers();
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'Failed to update department.');
        }
      });
  }

  getDeptAbbr(dept?: string | null): string {
    if (!dept) return '—';
    if (dept.includes('Computer Science')) return 'CSE';
    if (dept.includes('Electronics and Communication')) return 'ECE';
    if (dept.includes('Electrical and Electronics')) return 'EEE';
    if (dept.includes('Mechanical')) return 'ME';
    return dept;
  }

  toggleSelectedMemberStatus(detail: MemberDetail, enable: boolean): void {
    const summary: MemberSummary = {
      id: detail.id,
      email: detail.email,
      role: detail.role,
      enabled: detail.enabled,
      institutionalId: detail.institutionalId,
      createdAt: detail.createdAt,
      currentLoans: detail.currentLoans.length,
    };
    this.promptStatusChange(summary, enable);
  }
}
