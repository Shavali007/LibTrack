import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LibrarianOperationsService, FinePolicyDto } from '../librarian-operations.service';

@Component({
  selector: 'app-fines-policy',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="policy-detail-page">
      <!-- Breadcrumb matching Image 2 -->
      <nav class="breadcrumb-nav" aria-label="Breadcrumb">
        <a routerLink="/workspace/library-policies" class="breadcrumb-link">Library Policies</a>
        <span class="breadcrumb-sep">&gt;</span>
        <span class="breadcrumb-current">Fine Policy</span>
      </nav>

      <!-- Page Header matching Image 2 -->
      <header class="policy-header">
        <div class="header-left">
          <div class="policy-icon-badge icon-fines" aria-hidden="true">
            <span class="currency-symbol">₹</span>
          </div>
          <div>
            <h1 class="policy-title">Fine Policy</h1>
            <p class="policy-subtitle">Charges and rules for overdue, lost or damaged books.</p>
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
          <table class="policy-table" aria-label="Fine charges and rules">
            <thead>
              <tr>
                <th scope="col" class="th-rule">Rule</th>
                <th scope="col" class="th-value">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="td-rule">
                  <span class="rule-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                    </svg>
                  </span>
                  <span>Overdue fine (per day)</span>
                </td>
                <td class="td-val highlight-val">{{ policy()?.overdueFinePerDay ?? '₹10' }}</td>
              </tr>
              <tr>
                <td class="td-rule">
                  <span class="rule-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="12" cy="12" r="3"></circle>
                      <line x1="12" y1="9" x2="12" y2="15"></line>
                    </svg>
                  </span>
                  <span>Maximum fine (per book)</span>
                </td>
                <td class="td-val highlight-val">{{ policy()?.maxFinePerBook ?? '₹500' }}</td>
              </tr>
              <tr>
                <td class="td-rule">
                  <span class="rule-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 14 14"></polyline>
                    </svg>
                  </span>
                  <span>Grace period</span>
                </td>
                <td class="td-val">{{ policy()?.gracePeriod ?? '0 days' }}</td>
              </tr>
              <tr>
                <td class="td-rule">
                  <span class="rule-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                      <line x1="1" y1="10" x2="23" y2="10"></line>
                    </svg>
                  </span>
                  <span>Payment</span>
                </td>
                <td class="td-val">{{ policy()?.payment ?? 'Full payment only' }}</td>
              </tr>
              <tr>
                <td class="td-rule">
                  <span class="rule-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </span>
                  <span>Lost / damaged books</span>
                </td>
                <td class="td-val">{{ policy()?.lostDamagedBooks ?? 'To be recorded and handled by the librarian' }}</td>
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

    .icon-fines {
      background: #FEF3C7;
      color: #D97706;
    }

    .currency-symbol {
      font-size: 1.45rem;
      font-weight: 700;
      line-height: 1;
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
      background: #FEF6EC;
      color: #1F2421;
      font-size: 0.875rem;
      font-weight: 600;
      padding: 1.15rem 2rem;
      border-bottom: 1px solid #FADDB6;
    }

    .th-rule {
      width: 36%;
    }

    .th-value {
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
      color: #D97706;
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

    .highlight-val {
      font-weight: 600;
      color: #1F2421;
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
export class FinesPolicyComponent implements OnInit {
  private readonly opsService = inject(LibrarianOperationsService);
  readonly policy = signal<FinePolicyDto | null>(null);

  ngOnInit(): void {
    this.opsService.getPolicies().subscribe({
      next: (res) => {
        if (res?.fines) this.policy.set(res.fines);
      },
      error: () => {}
    });
  }
}
