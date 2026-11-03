import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  BorrowingService,
  CirculationStats,
  CirculationSummary,
  LoanRecord,
  ReturnCondition
} from './borrowing.service';

export type DeskTab = 'active' | 'history' | 'statistics';

@Component({
  selector: 'app-circulation-desk',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './circulation-desk.component.html',
  styleUrls: ['./circulation-desk.component.css']
})
export class CirculationDeskComponent implements OnInit {
  private readonly service = inject(BorrowingService);
  readonly Math = Math;

  readonly activeTab = signal<DeskTab>('active');
  readonly loading = signal(false);
  readonly summaryLoading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  // Summary Metrics
  readonly summary = signal<CirculationSummary | null>(null);

  // Tab 1: Active Loans
  readonly activeLoans = signal<LoanRecord[]>([]);
  readonly activeTotal = signal(0);
  readonly activePage = signal(0);
  readonly activePageSize = 6;
  readonly activeTotalPages = signal(1);
  activeSearch = '';
  activeRoleFilter = '';
  activeBookFilter = '';
  readonly selectedLoanIds = signal<Set<string>>(new Set());
  readonly openDropdownLoanId = signal<string | null>(null);

  // Return Modal State (for returning active loans)
  readonly showReturnModal = signal(false);
  readonly selectedLoanForReturn = signal<LoanRecord | null>(null);
  selectedReturnCondition: ReturnCondition = 'GOOD';
  returnCaseNote = '';
  readonly returnSubmitting = signal(false);
  returnModalError = '';

  // Tab 2: Circulation History
  readonly historyLoans = signal<LoanRecord[]>([]);
  readonly historyTotal = signal(0);
  readonly historyPage = signal(0);
  readonly historyPageSize = 8;
  readonly historyTotalPages = signal(1);
  historySearch = '';
  historyConditionFilter = '';
  historyRoleFilter = '';
  historyFromDate = '';
  historyToDate = '';

  // Edit Condition Modal State (for updating condition of completed loans)
  readonly showEditModal = signal(false);
  readonly selectedLoanForEdit = signal<LoanRecord | null>(null);
  editCondition: ReturnCondition = 'GOOD';
  editReason = '';
  readonly editSubmitting = signal(false);
  editModalError = '';

  // Tab 3: Statistics
  readonly stats = signal<CirculationStats | null>(null);
  readonly statsLoading = signal(false);

  // Computed helper for unique books in active loans
  readonly uniqueActiveBooks = computed(() => {
    const map = new Map<string, string>();
    for (const l of this.activeLoans()) {
      if (l.bookId && l.bookTitle && !map.has(l.bookId)) {
        map.set(l.bookId, l.bookTitle);
      }
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  });

  readonly maxActivityCount = computed(() => {
    const s = this.stats();
    if (!s || !s.activityOverTime || s.activityOverTime.length === 0) return 20;
    const maxVal = Math.max(...s.activityOverTime.map(m => Math.max(m.issued, m.returned)));
    return Math.max(maxVal, 10);
  });

  ngOnInit(): void {
    this.loadSummary();
    this.loadActiveLoans();
  }

  setActiveTab(tab: DeskTab): void {
    this.activeTab.set(tab);
    this.error.set('');
    this.notice.set('');
    this.openDropdownLoanId.set(null);

    if (tab === 'active') {
      this.loadSummary();
      this.loadActiveLoans();
    } else if (tab === 'history') {
      this.loadSummary();
      this.loadCirculationHistory();
    } else if (tab === 'statistics') {
      this.loadSummary();
      this.loadStatistics();
    }
  }

  // --- Summary Cards ---
  loadSummary(): void {
    this.summaryLoading.set(true);
    this.service.getCirculationSummary()
      .pipe(finalize(() => this.summaryLoading.set(false)))
      .subscribe({
        next: (data) => this.summary.set(data),
        error: () => {}
      });
  }

  // --- Tab 1: Active Loans ---
  loadActiveLoans(): void {
    this.loading.set(true);
    this.openDropdownLoanId.set(null);
    this.service.searchLibrarianLoans({
      status: 'ACTIVE',
      search: this.activeSearch.trim() || undefined,
      role: this.activeRoleFilter || undefined,
      bookId: this.activeBookFilter || undefined,
      page: this.activePage(),
      size: this.activePageSize
    })
    .pipe(finalize(() => this.loading.set(false)))
    .subscribe({
      next: (page) => {
        this.activeLoans.set(page.content || []);
        this.activeTotal.set(page.totalElements || 0);
        this.activeTotalPages.set(page.totalPages || 1);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to load active loans.');
      }
    });
  }

  onActiveSearchChange(): void {
    this.activePage.set(0);
    this.loadActiveLoans();
  }

  onActiveRoleFilterChange(): void {
    this.activePage.set(0);
    this.loadActiveLoans();
  }

  onActiveBookFilterChange(): void {
    this.activePage.set(0);
    this.loadActiveLoans();
  }

  goToActivePage(page: number): void {
    if (page >= 0 && page < this.activeTotalPages()) {
      this.activePage.set(page);
      this.loadActiveLoans();
    }
  }

  // Checkbox Selection
  isAllActiveSelected(): boolean {
    const loans = this.activeLoans();
    if (loans.length === 0) return false;
    const selected = this.selectedLoanIds();
    return loans.every(l => selected.has(l.id));
  }

  toggleSelectAllActive(): void {
    const selected = new Set(this.selectedLoanIds());
    if (this.isAllActiveSelected()) {
      for (const l of this.activeLoans()) {
        selected.delete(l.id);
      }
    } else {
      for (const l of this.activeLoans()) {
        selected.add(l.id);
      }
    }
    this.selectedLoanIds.set(selected);
  }

  isLoanSelected(loanId: string): boolean {
    return this.selectedLoanIds().has(loanId);
  }

  toggleLoanSelection(loanId: string): void {
    const selected = new Set(this.selectedLoanIds());
    if (selected.has(loanId)) {
      selected.delete(loanId);
    } else {
      selected.add(loanId);
    }
    this.selectedLoanIds.set(selected);
  }

  // Return Action Dropdown
  toggleActionDropdown(loanId: string, event: Event): void {
    event.stopPropagation();
    if (this.openDropdownLoanId() === loanId) {
      this.openDropdownLoanId.set(null);
    } else {
      this.openDropdownLoanId.set(loanId);
    }
  }

  closeActionDropdown(): void {
    this.openDropdownLoanId.set(null);
  }

  initiateReturn(loan: LoanRecord, condition: ReturnCondition): void {
    this.openDropdownLoanId.set(null);
    this.selectedLoanForReturn.set(loan);
    this.selectedReturnCondition = condition;
    this.returnCaseNote = '';
    this.returnModalError = '';
    this.showReturnModal.set(true);
  }

  closeReturnModal(): void {
    this.showReturnModal.set(false);
    this.selectedLoanForReturn.set(null);
    this.returnCaseNote = '';
    this.returnModalError = '';
  }

  confirmReturn(): void {
    const loan = this.selectedLoanForReturn();
    if (!loan) return;

    const condition = this.selectedReturnCondition;
    const note = this.returnCaseNote.trim();

    if (condition !== 'GOOD' && !note) {
      this.returnModalError = 'A case note is required when returning damaged or lost material.';
      return;
    }

    this.returnSubmitting.set(true);
    this.returnModalError = '';

    this.service.returnLoan(loan.id, condition, note || null)
      .pipe(finalize(() => this.returnSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.notice.set(`Book "${loan.bookTitle}" (Copy: ${loan.copyIdentifier}) successfully processed as ${condition}.`);
          this.closeReturnModal();
          this.loadSummary();
          this.loadActiveLoans();
        },
        error: (err) => {
          this.returnModalError = err?.error?.message || 'Failed to process book return.';
        }
      });
  }

  // --- Tab 2: Circulation History ---
  loadCirculationHistory(): void {
    this.loading.set(true);
    this.service.searchLibrarianLoans({
      historyOnly: true,
      search: this.historySearch.trim() || undefined,
      condition: this.historyConditionFilter || undefined,
      role: this.historyRoleFilter || undefined,
      fromDate: this.historyFromDate || undefined,
      toDate: this.historyToDate || undefined,
      page: this.historyPage(),
      size: this.historyPageSize
    })
    .pipe(finalize(() => this.loading.set(false)))
    .subscribe({
      next: (page) => {
        this.historyLoans.set(page.content || []);
        this.historyTotal.set(page.totalElements || 0);
        this.historyTotalPages.set(page.totalPages || 1);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to load circulation history.');
      }
    });
  }

  setHistoryCondition(condition: string): void {
    this.historyConditionFilter = condition;
    this.historyPage.set(0);
    this.loadCirculationHistory();
  }

  onHistoryFilterChange(): void {
    this.historyPage.set(0);
    this.loadCirculationHistory();
  }

  goToHistoryPage(page: number): void {
    if (page >= 0 && page < this.historyTotalPages()) {
      this.historyPage.set(page);
      this.loadCirculationHistory();
    }
  }

  // --- Edit Condition Modal ---
  openEditModal(loan: LoanRecord): void {
    this.selectedLoanForEdit.set(loan);
    const cond = loan.returnCondition?.toUpperCase();
    this.editCondition = (cond === 'DAMAGED' || cond === 'LOST') ? cond : 'GOOD';
    this.editReason = '';
    this.editModalError = '';
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.selectedLoanForEdit.set(null);
    this.editReason = '';
    this.editModalError = '';
  }

  saveConditionChange(): void {
    const loan = this.selectedLoanForEdit();
    if (!loan) return;

    const reason = this.editReason.trim();
    if (!reason) {
      this.editModalError = 'A reason or case note is required when modifying a circulation condition.';
      return;
    }

    this.editSubmitting.set(true);
    this.editModalError = '';

    this.service.updateLoanCondition(loan.id, this.editCondition, reason)
      .pipe(finalize(() => this.editSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.notice.set(`Condition for "${loan.bookTitle}" (Copy: ${loan.copyIdentifier}) updated to ${this.editCondition}.`);
          this.closeEditModal();
          this.loadSummary();
          this.loadCirculationHistory();
        },
        error: (err) => {
          this.editModalError = err?.error?.message || 'Failed to update book condition.';
        }
      });
  }

  // --- Tab 3: Statistics ---
  loadStatistics(): void {
    this.statsLoading.set(true);
    this.service.getCirculationStats()
      .pipe(finalize(() => this.statsLoading.set(false)))
      .subscribe({
        next: (data) => this.stats.set(data),
        error: (err) => {
          this.error.set(err?.error?.message || 'Failed to load circulation statistics.');
        }
      });
  }

  // --- Export CSV Functionality ---
  exportActiveLoans(): void {
    const loans = this.activeLoans();
    if (loans.length === 0) return;

    const headers = ['Book Title', 'Copy ID', 'Borrower Name', 'Borrower Email', 'Member Type', 'Issued On', 'Due Date', 'Status'];
    const rows = loans.map(l => [
      `"${l.bookTitle.replace(/"/g, '""')}"`,
      `"${l.copyIdentifier}"`,
      `"${(l.borrowerDisplayName || '').replace(/"/g, '""')}"`,
      `"${l.borrowerEmail}"`,
      `"${l.borrowerRole || 'Student'}"`,
      `"${l.issueDate}"`,
      `"${l.dueDate}"`,
      `"${l.overdue ? 'Overdue' : 'Active'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `active_loans_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportHistory(): void {
    const loans = this.historyLoans();
    if (loans.length === 0) return;

    const headers = ['Book Title', 'Copy ID', 'Borrower Name', 'Borrower Email', 'Member Type', 'Issued Date', 'Due Date', 'Return Date', 'Condition', 'Inventory Status', 'Case Note'];
    const rows = loans.map(l => [
      `"${l.bookTitle.replace(/"/g, '""')}"`,
      `"${l.copyIdentifier}"`,
      `"${(l.borrowerDisplayName || '').replace(/"/g, '""')}"`,
      `"${l.borrowerEmail}"`,
      `"${l.borrowerRole || 'Student'}"`,
      `"${l.issueDate}"`,
      `"${l.dueDate}"`,
      `"${l.actualReturnDate || ''}"`,
      `"${l.returnCondition || l.status}"`,
      `"${l.inventoryStatus || ''}"`,
      `"${(l.returnNote || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `circulation_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- Display Helpers ---
  getInitials(name?: string | null, email?: string): string {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.trim().slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'MB';
  }

  getDaysLeftText(daysLeft?: number | null, overdue?: boolean): string {
    if (overdue) {
      const absDays = Math.abs(daysLeft ?? 0);
      return absDays === 1 ? '1 day overdue' : `${absDays} days overdue`;
    }
    if (daysLeft === undefined || daysLeft === null) return '—';
    if (daysLeft === 0) return 'Due today';
    if (daysLeft === 1) return '1 day';
    return `${daysLeft} days`;
  }
}
