import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LibrarianOperationsService, MembershipPolicyDto } from '../librarian-operations.service';

@Component({
  selector: 'app-membership-policy',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="policy-detail-page">
      <!-- Breadcrumb matching Image 2 -->
      <nav class="breadcrumb-nav" aria-label="Breadcrumb">
        <a routerLink="/workspace/library-policies" class="breadcrumb-link">Library Policies</a>
        <span class="breadcrumb-sep">&gt;</span>
        <span class="breadcrumb-current">Membership Policy</span>
      </nav>

      <!-- Page Header matching Image 2 -->
      <header class="policy-header">
        <div class="header-left">
          <div class="policy-icon-badge icon-membership" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div>
            <h1 class="policy-title">Membership Policy</h1>
            <p class="policy-subtitle">Rules for registration and library account access.</p>
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

      <!-- 2-Column Policy Table expanded to full workspace width with spacious Details column -->
      <div class="policy-card surface-card">
        <div class="table-container">
          <table class="policy-table" aria-label="Membership rules and account access">
            <thead>
              <tr>
                <th scope="col" class="th-rule">Rule</th>
                <th scope="col" class="th-details">Details</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="td-rule">
                  <span class="rule-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                    </svg>
                  </span>
                  <span>Eligible members</span>
                </td>
                <td class="td-val">{{ policy()?.eligibleMembers ?? 'Students and Faculty of VIT-AP' }}</td>
              </tr>
              <tr>
                <td class="td-rule">
                  <span class="rule-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </span>
                  <span>Registration</span>
                </td>
                <td class="td-val">{{ policy()?.registration ?? 'Institutional email required (Students: @vitapstudent.ac.in, Faculty: @vitap.ac.in)' }}</td>
              </tr>
              <tr>
                <td class="td-rule">
                  <span class="rule-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                      <polyline points="9 12 11 14 15 10"></polyline>
                    </svg>
                  </span>
                  <span>Account approval</span>
                </td>
                <td class="td-val">{{ policy()?.accountApproval ?? 'Mandatory librarian approval' }}</td>
              </tr>
              <tr>
                <td class="td-rule">
                  <span class="rule-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </span>
                  <span>Pending accounts</span>
                </td>
                <td class="td-val">{{ policy()?.pendingAccounts ?? 'Cannot sign in until approved' }}</td>
              </tr>
              <tr>
                <td class="td-rule">
                  <span class="rule-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                    </svg>
                  </span>
                  <span>Rejected accounts</span>
                </td>
                <td class="td-val">{{ policy()?.rejectedAccounts ?? 'Cannot sign in' }}</td>
              </tr>
              <tr>
                <td class="td-rule">
                  <span class="rule-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                    </svg>
                  </span>
                  <span>Disabled accounts</span>
                </td>
                <td class="td-val">{{ policy()?.disabledAccounts ?? 'Cannot access library services' }}</td>
              </tr>
              <tr>
                <td class="td-rule">
                  <span class="rule-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </span>
                  <span>Duplicate accounts</span>
                </td>
                <td class="td-val">{{ policy()?.duplicateAccounts ?? 'Not permitted (email must be unique)' }}</td>
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

    .icon-membership {
      background: #DBEAFE;
      color: #2563EB;
    }

    .policy-icon-badge svg {
      width: 24px;
      height: 24px;
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
      background: #EEF6FC;
      color: #1F2421;
      font-size: 0.875rem;
      font-weight: 600;
      padding: 1.15rem 2rem;
      border-bottom: 1px solid #D3E7F8;
    }

    .th-rule {
      width: 28%;
    }

    .th-details {
      width: 72%;
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
      color: #2563EB;
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
      font-weight: 500;
      line-height: 1.5;
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
      .th-rule {
        width: 38%;
      }
      .th-details {
        width: 62%;
      }
    }
  `]
})
export class MembershipPolicyComponent implements OnInit {
  private readonly opsService = inject(LibrarianOperationsService);
  readonly policy = signal<MembershipPolicyDto | null>(null);

  ngOnInit(): void {
    this.opsService.getPolicies().subscribe({
      next: (res) => {
        if (res?.membership) this.policy.set(res.membership);
      },
      error: () => {}
    });
  }
}
