import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { MemberDetail, MemberManagementService, MemberSummary } from './member-management.service';

@Component({
  selector: 'app-member-directory',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <header class="page-heading">
      <div>
        <p class="eyebrow">LIBRARIAN WORKSPACE · MEMBERS</p>
        <h1>Member directory</h1>
        <p class="muted">Manage and audit student and faculty member accounts.</p>
      </div>
    </header>

    @if (error()) {
      <p class="alert alert-error" role="alert">{{ error() }}</p>
    }
    @if (notice()) {
      <p class="alert alert-success" role="status">{{ notice() }}</p>
    }

    <!-- Search and Filter Bar -->
    <section class="filters-panel surface-card">
      <div class="filter-group search-group">
        <label for="member-search">Search members</label>
        <div class="search-input-wrap">
          <span class="search-icon" aria-hidden="true">⌕</span>
          <input
            id="member-search"
            type="search"
            [(ngModel)]="searchQuery"
            (keyup.enter)="applyFilters()"
            placeholder="Search by name, ID or college email…"
          />
        </div>
      </div>

      <div class="filter-group">
        <label for="role-filter">Role</label>
        <select id="role-filter" [(ngModel)]="roleFilter" (change)="applyFilters()">
          <option value="">All roles</option>
          <option value="STUDENT">Students</option>
          <option value="FACULTY">Faculty</option>
        </select>
      </div>

      <div class="filter-group">
        <label for="status-filter">Status</label>
        <select id="status-filter" [(ngModel)]="statusFilter" (change)="applyFilters()">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
        </select>
      </div>

      <div class="filter-actions">
        <button class="button button-primary" type="button" (click)="applyFilters()" [disabled]="loading()">
          Filter
        </button>
        <button class="button button-quiet" type="button" (click)="resetFilters()" [disabled]="loading()">
          Reset
        </button>
      </div>
    </section>

    <!-- Members Table -->
    @if (loading()) {
      <div class="loading-state" role="status">Loading members…</div>
    } @else if (!members().length) {
      <section class="empty-state surface-card">
        <h2>No members found</h2>
        <p>No student or faculty members match the current search or filters.</p>
      </section>
    } @else {
      <div class="data-table-wrap surface-card">
        <table class="data-table">
          <thead>
            <tr>
              <th scope="col">Institutional ID / Name</th>
              <th scope="col">College email</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              <th scope="col">Active loans</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (m of members(); track m.id) {
              <tr>
                <td>
                  <strong>{{ m.institutionalId || '—' }}</strong>
                  @if (m.institutionalId) {
                    <br><small class="muted">{{ m.email.split('@')[0] }}</small>
                  }
                </td>
                <td>{{ m.email }}</td>
                <td>
                  <span class="role-badge" [class.role-student]="m.role === 'STUDENT'" [class.role-faculty]="m.role === 'FACULTY'">
                    {{ m.role === 'STUDENT' ? 'Student' : 'Faculty' }}
                  </span>
                </td>
                <td>
                  <span class="status-badge" [class.status-badge-success]="m.enabled" [class.status-badge-neutral]="!m.enabled">
                    {{ m.enabled ? 'Active' : 'Disabled' }}
                  </span>
                </td>
                <td>
                  <span class="loan-count" [class.has-loans]="m.currentLoans > 0">
                    {{ m.currentLoans }}
                  </span>
                </td>
                <td>
                  <div class="table-actions">
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

        <!-- Pagination -->
        <div class="pagination-bar">
          <span class="pagination-info">
            Showing page {{ currentPage() + 1 }} of {{ totalPages() || 1 }} ({{ totalElements() }} members)
          </span>
          <div class="pagination-controls">
            <button class="button button-secondary btn-sm" type="button" (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 0 || loading()">
              Previous
            </button>
            <button class="button button-secondary btn-sm" type="button" (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() >= totalPages() - 1 || loading()">
              Next
            </button>
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
              <h2>{{ details.institutionalId || details.email }}</h2>
            </div>
            <button class="close-btn" type="button" (click)="closeDetails()" aria-label="Close dialog">✕</button>
          </header>

          <div class="modal-body">
            <div class="profile-summary">
              <div class="profile-field">
                <span class="profile-label">College Email:</span>
                <span class="profile-value">{{ details.email }}</span>
              </div>
              <div class="profile-field">
                <span class="profile-label">Role:</span>
                <span class="profile-value">{{ details.role === 'STUDENT' ? 'Student' : 'Faculty' }}</span>
              </div>
              <div class="profile-field">
                <span class="profile-label">Institutional ID:</span>
                <span class="profile-value">{{ details.institutionalId || 'Not provided' }}</span>
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
    :host { display: block; }
    .page-heading { margin-bottom: 1.4rem; }
    .filters-panel {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 1rem;
      padding: 1.1rem 1.25rem;
      border: 1px solid var(--color-line-200);
      border-radius: var(--radius-panel);
      margin-bottom: 1.25rem;
      background: var(--color-paper);
    }
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .filter-group label {
      font-size: 0.8rem;
      font-weight: 650;
      color: var(--color-charcoal-700);
    }
    .search-group {
      flex: 1 1 16rem;
    }
    .search-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-input-wrap input {
      width: 100%;
      padding-left: 2rem;
    }
    .search-icon {
      position: absolute;
      left: 0.65rem;
      color: var(--color-sage-500);
      font-size: 1.1rem;
      pointer-events: none;
    }
    .filter-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .role-badge {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      border-radius: var(--radius-pill);
      font-size: 0.75rem;
      font-weight: 650;
    }
    .role-student {
      background: var(--color-sage-100);
      color: var(--color-forest-900);
    }
    .role-faculty {
      background: #e0e7ff;
      color: #3730a3;
    }
    .loan-count {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--color-charcoal-600);
    }
    .loan-count.has-loans {
      background: var(--color-sage-100);
      color: var(--color-forest-900);
      font-weight: 700;
    }
    .table-actions {
      display: flex;
      gap: 0.4rem;
    }
    .btn-sm {
      min-height: 2rem;
      padding: 0.2rem 0.6rem;
      font-size: 0.78rem;
    }
    .button-danger-quiet {
      color: var(--color-danger-700);
      background: transparent;
      border: 1px solid var(--color-line-200);
    }
    .button-danger-quiet:hover {
      background: var(--color-danger-100);
    }
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.9rem 1.1rem;
      border-top: 1px solid var(--color-line-200);
      font-size: 0.82rem;
      color: var(--color-charcoal-600);
    }
    .pagination-controls {
      display: flex;
      gap: 0.5rem;
    }
    /* Modal styles */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(2px);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .modal-dialog {
      width: min(100%, 46rem);
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      border-radius: var(--radius-panel);
      background: var(--color-paper);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--color-line-200);
    }
    .modal-header h2 {
      margin: 0.2rem 0 0;
      font-size: 1.35rem;
    }
    .close-btn {
      background: transparent;
      border: 0;
      font-size: 1.2rem;
      cursor: pointer;
      color: var(--color-charcoal-600);
      padding: 0.25rem 0.5rem;
    }
    .modal-body {
      padding: 1.25rem 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .profile-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
      gap: 0.85rem;
      padding: 1rem;
      background: var(--color-ivory-50);
      border-radius: var(--radius-control);
      border: 1px solid var(--color-line-200);
    }
    .profile-field {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .profile-label {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--color-charcoal-600);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .profile-value {
      font-size: 0.88rem;
      color: var(--color-charcoal-900);
      font-weight: 550;
    }
    .modal-section h3 {
      font-size: 1.05rem;
      margin: 0 0 0.6rem;
      color: var(--color-forest-950);
    }
    .table-wrap-compact {
      max-height: 12rem;
      overflow-y: auto;
      border: 1px solid var(--color-line-200);
      border-radius: var(--radius-control);
    }
    .compact-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
    }
    .compact-table th, .compact-table td {
      padding: 0.5rem 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--color-line-200);
    }
    .compact-table th {
      background: var(--color-ivory-100);
      font-weight: 650;
      color: var(--color-charcoal-700);
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--color-line-200);
    }
    .confirm-dialog {
      width: min(100%, 28rem);
      padding: 1.5rem;
      border-radius: var(--radius-panel);
      background: var(--color-paper);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
    }
    .confirm-dialog h3 {
      margin: 0 0 0.75rem;
      font-size: 1.2rem;
    }
    .confirm-dialog p {
      font-size: 0.88rem;
      margin: 0 0 1rem;
      line-height: 1.4;
    }
    .warning-text {
      color: var(--color-danger-700);
      font-size: 0.82rem !important;
    }
    .confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }
  `]
})
export class MemberDirectoryComponent implements OnInit {
  private readonly memberService = inject(MemberManagementService);

  readonly members = signal<MemberSummary[]>([]);
  readonly selectedMember = signal<MemberDetail | null>(null);
  readonly loading = signal(true);
  readonly pending = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  readonly currentPage = signal(0);
  readonly totalPages = signal(0);
  readonly totalElements = signal(0);

  // Filters
  searchQuery = '';
  roleFilter = '';
  statusFilter = '';

  // Confirm state
  readonly confirmTarget = signal<MemberSummary | null>(null);
  readonly confirmNewState = signal<boolean>(true);

  ngOnInit(): void {
    this.loadMembers();
  }

  loadMembers(): void {
    this.loading.set(true);
    this.error.set('');

    const enabledParam = this.statusFilter === 'ACTIVE' ? true : this.statusFilter === 'DISABLED' ? false : null;

    this.memberService.list(this.searchQuery, this.roleFilter, enabledParam, this.currentPage())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => {
          this.members.set(page.content);
          this.currentPage.set(page.page);
          this.totalPages.set(page.totalPages);
          this.totalElements.set(page.totalElements);
        },
        error: () => this.error.set('Member directory could not be loaded.')
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
    this.currentPage.set(0);
    this.loadMembers();
  }

  goToPage(page: number): void {
    if (page < 0 || (this.totalPages() > 0 && page >= this.totalPages())) return;
    this.currentPage.set(page);
    this.loadMembers();
  }

  viewDetails(m: MemberSummary): void {
    this.error.set('');
    this.memberService.get(m.id).subscribe({
      next: (details) => this.selectedMember.set(details),
      error: () => this.error.set('Could not load member details.')
    });
  }

  closeDetails(): void {
    this.selectedMember.set(null);
  }

  promptStatusChange(m: MemberSummary, enableState: boolean): void {
    this.confirmTarget.set(m);
    this.confirmNewState.set(enableState);
  }

  cancelConfirm(): void {
    this.confirmTarget.set(null);
  }

  executeStatusChange(): void {
    const target = this.confirmTarget();
    if (!target || this.pending()) return;

    this.pending.set(true);
    this.error.set('');
    this.notice.set('');
    const enableState = this.confirmNewState();

    const action$ = enableState ? this.memberService.enable(target.id) : this.memberService.disable(target.id);

    action$.pipe(finalize(() => this.pending.set(false))).subscribe({
      next: () => {
        this.notice.set(`Account for ${target.email} was successfully ${enableState ? 'enabled' : 'disabled'}.`);
        this.cancelConfirm();
        this.loadMembers();
        if (this.selectedMember()?.id === target.id) {
          this.viewDetails(target);
        }
      },
      error: () => this.error.set(`Could not update account status for ${target.email}.`)
    });
  }

  toggleSelectedMemberStatus(details: MemberDetail, enableState: boolean): void {
    const summary: MemberSummary = {
      id: details.id,
      email: details.email,
      role: details.role,
      enabled: details.enabled,
      institutionalId: details.institutionalId,
      createdAt: details.createdAt,
      currentLoans: details.currentLoans.length
    };
    this.promptStatusChange(summary, enableState);
  }
}
