import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LibrarianOperationsService, RenewalPolicyDto } from '../librarian-operations.service';

@Component({
  selector: 'app-renewal-policy',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="policy-detail-page">
      <!-- Breadcrumb matching Image 2 -->
      <nav class="breadcrumb-nav" aria-label="Breadcrumb">
        <a routerLink="/workspace/library-policies" class="breadcrumb-link">Library Policies</a>
        <span class="breadcrumb-sep">&gt;</span>
        <span class="breadcrumb-current">Renewal Policy</span>
      </nav>

      <!-- Page Header matching Image 2 -->
      <header class="policy-header">
        <div class="header-left">
          <div class="policy-icon-badge icon-renewal" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </div>
          <div>
            <h1 class="policy-title">Renewal Policy</h1>
            <p class="policy-subtitle">Rules for extending borrowed books.</p>
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

      <!-- 2-Column Policy Table expanded to full workspace width -->
      <div class="policy-card surface-card">
        <div class="table-container">
          <table class="policy-table" aria-label="Renewal rules">
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
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <polyline points="1 20 1 14 7 14"></polyline>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                  </span>
                  <span>Maximum renewals</span>
                </td>
                <td class="td-val">{{ policy()?.maxRenewals ?? '1 per semester' }}</td>
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
                  <span>Extension period</span>
                </td>
                <td class="td-val">{{ policy()?.extensionPeriod ?? '21 days' }}</td>
              </tr>
              <tr>
                <td class="td-rule">
                  <span class="rule-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <span>Eligibility</span>
                </td>
                <td class="td-val">{{ policy()?.eligibility ?? 'Active loans only' }}</td>
              </tr>
              <tr>
                <td class="td-rule">
                  <span class="rule-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                  </span>
                  <span>Approval</span>
                </td>
                <td class="td-val">{{ policy()?.approval ?? 'Subject to librarian approval' }}</td>
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
                  <span>Overdue loans</span>
                </td>
                <td class="td-val">{{ policy()?.overdueLoans ?? 'Not eligible for renewal' }}</td>
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

    .policy-icon-badge svg {
      width: 24px;
      height: 24px;
    }

    .icon-renewal {
      background: #EDE9FE;
      color: #7C3AED;
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
      background: #F4F0FA;
      color: #1F2421;
      font-size: 0.875rem;
      font-weight: 600;
      padding: 1.15rem 2rem;
      border-bottom: 1px solid #DFD8F5;
    }

    .th-rule {
      width: 36%;
    }

    .th-details {
      width: 64%;
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
      color: #7C3AED;
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
export class RenewalPolicyComponent implements OnInit {
  private readonly opsService = inject(LibrarianOperationsService);
  readonly policy = signal<RenewalPolicyDto | null>(null);

  ngOnInit(): void {
    this.opsService.getPolicies().subscribe({
      next: (res) => {
        if (res?.renewal) this.policy.set(res.renewal);
      },
      error: () => {}
    });
  }
}
