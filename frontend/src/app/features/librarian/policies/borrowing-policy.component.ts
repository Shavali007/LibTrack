import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LibrarianOperationsService, BorrowingPolicyDto } from '../librarian-operations.service';

@Component({
  selector: 'app-borrowing-policy',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="policy-detail-page">
      <!-- Breadcrumb matching Image 2 -->
      <nav class="breadcrumb-nav" aria-label="Breadcrumb">
        <a routerLink="/workspace/library-policies" class="breadcrumb-link">Library Policies</a>
        <span class="breadcrumb-sep">&gt;</span>
        <span class="breadcrumb-current">Borrowing Policy</span>
      </nav>

      <!-- Page Header matching Image 2 -->
      <header class="policy-header">
        <div class="header-left">
          <div class="policy-icon-badge icon-borrowing" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <div>
            <h1 class="policy-title">Borrowing Policy</h1>
            <p class="policy-subtitle">Rules for book issue and loan duration.</p>
          </div>
        </div>

        <div class="fixed-policy-pill" aria-label="Policy status: Fixed Policy">
          <span class="lock-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </span>
          <span>Fixed Policy</span>
        </div>
      </header>

      <!-- 3-Column Policy Table expanded to full workspace width -->
      <div class="policy-card surface-card">
        <div class="table-container">
          <table class="policy-table" aria-label="Borrowing rules for students and faculty">
            <thead>
              <tr>
                <th scope="col" class="th-rule">Rule</th>
                <th scope="col" class="th-students">Students</th>
                <th scope="col" class="th-faculty">Faculty</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="td-rule">
                  <span class="rule-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                  </span>
                  <span>Maximum books at a time</span>
                </td>
                <td class="td-val">{{ policy()?.studentMaxBooks ?? 5 }} books</td>
                <td class="td-val">{{ policy()?.facultyMaxBooks ?? 5 }} books</td>
              </tr>
              <tr>
                <td class="td-rule">
                  <span class="rule-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </span>
                  <span>Initial loan period</span>
                </td>
                <td class="td-val">{{ policy()?.studentLoanDays ?? 21 }} days</td>
                <td class="td-val">{{ policy()?.facultyLoanDays ?? 30 }} days</td>
              </tr>
              <tr>
                <td class="td-rule">
                  <span class="rule-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <polyline points="1 20 1 14 7 14"></polyline>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                  </span>
                  <span>Maximum renewals</span>
                </td>
                <td class="td-val">{{ policy()?.studentMaxRenewals ?? 1 }}</td>
                <td class="td-val">{{ policy()?.facultyMaxRenewals ?? 1 }}</td>
              </tr>
              <tr>
                <td class="td-rule">
                  <span class="rule-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </span>
                  <span>Renewal extension</span>
                </td>
                <td class="td-val">{{ policy()?.studentRenewalExtensionDays ?? 21 }} days</td>
                <td class="td-val">{{ policy()?.facultyRenewalExtensionDays ?? 21 }} days</td>
              </tr>
              <tr>
                <td class="td-rule">
                  <span class="rule-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </span>
                  <span>Maximum active reservations</span>
                </td>
                <td class="td-val">{{ policy()?.studentMaxReservations ?? 5 }}</td>
                <td class="td-val">{{ policy()?.facultyMaxReservations ?? 5 }}</td>
              </tr>
              <tr>
                <td class="td-rule">
                  <span class="rule-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                  </span>
                  <span>Reservation hold period</span>
                </td>
                <td class="td-val">{{ policy()?.reservationHoldPeriod ?? '1 calendar month' }}</td>
                <td class="td-val">{{ policy()?.reservationHoldPeriod ?? '1 calendar month' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .policy-detail-page {
      width: 100%;
      max-width: 1400px;
      margin: 0;
      padding-bottom: 2.5rem;
    }

    /* Breadcrumbs */
    .breadcrumb-nav {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.84375rem;
      color: #737C76;
      margin-bottom: 1.5rem;
    }

    .breadcrumb-link {
      color: #5A625D;
      text-decoration: none;
      font-weight: 500;
    }

    .breadcrumb-link:hover {
      color: #003D30;
      text-decoration: underline;
    }

    .breadcrumb-sep {
      color: #A0A8A3;
      font-size: 0.8rem;
    }

    .breadcrumb-current {
      color: #1F2421;
      font-weight: 600;
    }

    /* Header */
    .policy-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1.15rem;
    }

    .policy-icon-badge {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .policy-icon-badge svg {
      width: 24px;
      height: 24px;
    }

    .icon-borrowing {
      background: #D1FAE5;
      color: #059669;
    }

    .policy-title {
      font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif);
      font-size: 1.75rem;
      font-weight: 700;
      color: #1F2421;
      margin: 0 0 0.25rem;
    }

    .policy-subtitle {
      font-size: 0.9rem;
      color: #5A625D;
      margin: 0;
    }

    /* Fixed Policy Pill */
    .fixed-policy-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: #FEF3E2;
      border: 1px solid #FAD7A0;
      color: #92400E;
      font-size: 0.8125rem;
      font-weight: 600;
      padding: 0.45rem 0.9rem;
      border-radius: 8px;
      white-space: nowrap;
    }

    .lock-icon svg {
      width: 14px;
      height: 14px;
      display: block;
    }

    /* Card & Expanded Table */
    .surface-card {
      background: #FFFFFF;
      border: 1px solid #E5E0D5;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      width: 100%;
    }

    .table-container {
      overflow-x: auto;
      width: 100%;
    }

    .policy-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .policy-table th {
      background: #EAF2EF;
      color: #1F2421;
      font-size: 0.875rem;
      font-weight: 600;
      padding: 1.15rem 2rem;
      border-bottom: 1px solid #C2D6CF;
    }

    .th-rule {
      width: 44%;
    }

    .th-students {
      width: 28%;
    }

    .th-faculty {
      width: 28%;
    }

    .policy-table td {
      padding: 1.35rem 2rem;
      font-size: 0.9375rem;
      color: #1F2421;
      border-bottom: 1px solid #EFECE6;
    }

    .policy-table tr:last-child td {
      border-bottom: none;
    }

    .td-rule {
      display: flex;
      align-items: center;
      gap: 1rem;
      font-weight: 500;
      color: #1F2421;
    }

    .rule-icon {
      color: #059669;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .rule-icon svg {
      width: 20px;
      height: 20px;
    }

    .td-val {
      color: #1F2421;
      font-weight: 600;
    }

    @media (max-width: 768px) {
      .policy-header {
        flex-direction: column;
        align-items: flex-start;
      }
      .policy-table th,
      .policy-table td {
        padding: 1rem 1.25rem;
      }
    }
  `]
})
export class BorrowingPolicyComponent implements OnInit {
  private readonly opsService = inject(LibrarianOperationsService);
  readonly policy = signal<BorrowingPolicyDto | null>(null);

  ngOnInit(): void {
    this.opsService.getPolicies().subscribe({
      next: (res) => {
        if (res?.borrowing) this.policy.set(res.borrowing);
      },
      error: () => {}
    });
  }
}
