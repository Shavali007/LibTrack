import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LibrarianOperationsService } from '../librarian-operations.service';

@Component({
  selector: 'app-usage-policy',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="policy-detail-page">
      <!-- Breadcrumb matching Image 2 -->
      <nav class="breadcrumb-nav" aria-label="Breadcrumb">
        <a routerLink="/workspace/library-policies" class="breadcrumb-link">Library Policies</a>
        <span class="breadcrumb-sep">&gt;</span>
        <span class="breadcrumb-current">Library Usage Policy</span>
      </nav>

      <!-- Page Header matching Image 2 -->
      <header class="policy-header">
        <div class="header-left">
          <div class="policy-icon-badge icon-usage" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
          </div>
          <div>
            <h1 class="policy-title">Library Usage Policy</h1>
            <p class="policy-subtitle">General guidelines and responsibilities for all members.</p>
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

      <!-- Vertical List expanded to full workspace width matching Image 2 -->
      <div class="policy-card surface-card">
        <ul class="usage-list" aria-label="Library usage guidelines">
          @for (rule of guidelines(); track rule) {
            <li class="usage-item">
              <span class="usage-check-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </span>
              <span class="usage-text">{{ rule }}</span>
            </li>
          }
        </ul>
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

    .icon-usage {
      background: #FFE4E6;
      color: #E11D48;
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

    .usage-list {
      list-style: none;
      margin: 0;
      padding: 0;
      width: 100%;
    }

    .usage-item {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding: 1.35rem 2rem;
      border-bottom: 1px solid #EFECE6;
    }

    .usage-item:last-child {
      border-bottom: none;
    }

    .usage-check-icon {
      color: #E11D48;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .usage-check-icon svg {
      width: 22px;
      height: 22px;
    }

    .usage-text {
      font-size: 0.95rem;
      color: #1F2421;
      font-weight: 500;
      line-height: 1.5;
    }

    @media (max-width: 768px) {
      .policy-header {
        flex-direction: column;
        align-items: flex-start;
      }
      .usage-item {
        padding: 1rem 1.25rem;
      }
    }
  `]
})
export class UsagePolicyComponent implements OnInit {
  private readonly opsService = inject(LibrarianOperationsService);

  readonly guidelines = signal<string[]>([
    'Use your own library account.',
    'Be responsible for the books you borrow.',
    'Handle books with care and keep them in good condition.',
    'Report lost or damaged books to the librarian immediately.',
    'Return books within the permitted period.',
    'Follow all borrowing, renewal and circulation rules of the library.'
  ]);

  ngOnInit(): void {
    this.opsService.getPolicies().subscribe({
      next: (res) => {
        if (res?.usageGuidelines?.length) {
          this.guidelines.set(res.usageGuidelines);
        }
      },
      error: () => {}
    });
  }
}
