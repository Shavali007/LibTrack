import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-library-policies',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="policies-page">
      <!-- Top Header Row matching Image 3 -->
      <header class="policies-header">
        <div class="title-lockup">
          <div class="policies-main-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="book-svg">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
          </div>
          <div>
            <h1 class="policies-title">Library Policies</h1>
            <p class="policies-subtitle">Official rules and guidelines at VIT-AP Library.</p>
          </div>
        </div>

        <div class="fixed-policy-banner" role="note">
          <div class="lock-icon-box" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <div class="banner-text">
            <strong>Fixed Policies</strong>
            <span>These rules are set by the institution.</span>
          </div>
        </div>
      </header>

      <!-- 5 Policy Cards in 6-column Grid: Row 1 = 3 cards (2 cols each), Row 2 = 2 cards (3 cols each) -->
      <div class="cards-grid">
        <!-- 1. Borrowing Card (Row 1, span 2) -->
        <a routerLink="/workspace/library-policies/borrowing" class="policy-card card-borrowing">
          <div class="card-icon-box icon-borrowing" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <h2 class="card-name">Borrowing</h2>
          <p class="card-desc">Book limits and loan duration for students and faculty.</p>
          <div class="card-arrow arrow-borrowing" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </div>
        </a>

        <!-- 2. Renewal Card (Row 1, span 2) -->
        <a routerLink="/workspace/library-policies/renewal" class="policy-card card-renewal">
          <div class="card-icon-box icon-renewal" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </div>
          <h2 class="card-name">Renewal</h2>
          <p class="card-desc">Rules for extending borrowed books.</p>
          <div class="card-arrow arrow-renewal" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </div>
        </a>

        <!-- 3. Fines Card (Row 1, span 2) -->
        <a routerLink="/workspace/library-policies/fines" class="policy-card card-fines">
          <div class="card-icon-box icon-fines" aria-hidden="true">
            <span class="currency-symbol">₹</span>
          </div>
          <h2 class="card-name">Fines</h2>
          <p class="card-desc">Charges for overdue, lost or damaged books.</p>
          <div class="card-arrow arrow-fines" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </div>
        </a>

        <!-- 4. Membership Card (Row 2, span 3) -->
        <a routerLink="/workspace/library-policies/membership" class="policy-card card-membership">
          <div class="card-icon-box icon-membership" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <h2 class="card-name">Membership</h2>
          <p class="card-desc">Registration, approval and account access.</p>
          <div class="card-arrow arrow-membership" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </div>
        </a>

        <!-- 5. Usage Card (Row 2, span 3) -->
        <a routerLink="/workspace/library-policies/usage" class="policy-card card-usage">
          <div class="card-icon-box icon-usage" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
          </div>
          <h2 class="card-name">Usage</h2>
          <p class="card-desc">General guidelines and member responsibilities.</p>
          <div class="card-arrow arrow-usage" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </div>
        </a>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .policies-page {
      width: 100%;
      max-width: 1400px;
      margin: 0;
      padding-bottom: 2.5rem;
    }

    /* Header matching Image 3 */
    .policies-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .title-lockup {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .policies-main-icon {
      color: #059669;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .book-svg {
      width: 46px;
      height: 46px;
    }

    .policies-title {
      font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif);
      font-size: 2rem;
      font-weight: 700;
      color: #1F2421;
      margin: 0 0 0.25rem;
      line-height: 1.2;
    }

    .policies-subtitle {
      font-size: 0.95rem;
      color: #5A625D;
      margin: 0;
    }

    /* Fixed Policy banner matching Image 3 */
    .fixed-policy-banner {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      background: #FEF3E2;
      border: 1px solid #FAD7A0;
      border-radius: 12px;
      padding: 0.9rem 1.35rem;
      max-width: 340px;
    }

    .lock-icon-box {
      color: #D97706;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .lock-icon-box svg {
      width: 24px;
      height: 24px;
    }

    .banner-text {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .banner-text strong {
      font-size: 0.9375rem;
      color: #78350F;
      font-weight: 700;
    }

    .banner-text span {
      font-size: 0.775rem;
      color: #92400E;
      line-height: 1.3;
    }

    /* Responsive 6-column Grid Layout */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 1.5rem;
      width: 100%;
    }

    .card-borrowing {
      grid-column: span 2;
    }

    .card-renewal {
      grid-column: span 2;
    }

    .card-fines {
      grid-column: span 2;
    }

    .card-membership {
      grid-column: span 3;
    }

    .card-usage {
      grid-column: span 3;
    }

    .policy-card {
      display: flex;
      flex-direction: column;
      position: relative;
      padding: 2.25rem 2rem 2rem;
      border-radius: 16px;
      text-decoration: none;
      min-height: 220px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }

    .policy-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.07);
    }

    .card-icon-box {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.5rem;
      flex-shrink: 0;
    }

    .card-icon-box svg {
      width: 24px;
      height: 24px;
    }

    .currency-symbol {
      font-size: 1.45rem;
      font-weight: 700;
      line-height: 1;
    }

    .card-name {
      font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif);
      font-size: 1.25rem;
      font-weight: 700;
      color: #1F2421;
      margin: 0 0 0.5rem;
    }

    .card-desc {
      font-size: 0.9375rem;
      color: #5A625D;
      line-height: 1.5;
      margin: 0;
      padding-right: 2.5rem;
    }

    .card-arrow {
      position: absolute;
      right: 1.75rem;
      bottom: 1.75rem;
      display: flex;
      align-items: center;
    }

    .card-arrow svg {
      width: 22px;
      height: 22px;
    }

    /* Specific Card Colors matching Image 3 */
    /* Borrowing: Light Mint Green */
    .card-borrowing {
      background: #EDF7F2;
      border: 1px solid #D2EADB;
    }
    .icon-borrowing {
      background: #D1FAE5;
      color: #059669;
    }
    .arrow-borrowing {
      color: #059669;
    }

    /* Renewal: Light Lavender/Purple */
    .card-renewal {
      background: #F3F0FA;
      border: 1px solid #DFD8F5;
    }
    .icon-renewal {
      background: #EDE9FE;
      color: #7C3AED;
    }
    .arrow-renewal {
      color: #7C3AED;
    }

    /* Fines: Light Warm Amber/Orange */
    .card-fines {
      background: #FDF5E8;
      border: 1px solid #FADDB6;
    }
    .icon-fines {
      background: #FEF3C7;
      color: #D97706;
    }
    .arrow-fines {
      color: #D97706;
    }

    /* Membership: Light Ice Blue */
    .card-membership {
      background: #EDF5FC;
      border: 1px solid #D3E5F7;
    }
    .icon-membership {
      background: #DBEAFE;
      color: #2563EB;
    }
    .arrow-membership {
      color: #2563EB;
    }

    /* Usage: Light Soft Pink/Rose */
    .card-usage {
      background: #FDF0F2;
      border: 1px solid #F8CCD3;
    }
    .icon-usage {
      background: #FFE4E6;
      color: #E11D48;
    }
    .arrow-usage {
      color: #E11D48;
    }

    /* Tablet breakpoint: 2 columns */
    @media (max-width: 1024px) {
      .cards-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .card-borrowing,
      .card-renewal,
      .card-fines,
      .card-membership,
      .card-usage {
        grid-column: span 1;
      }
      .card-usage {
        grid-column: span 2;
      }
    }

    /* Mobile breakpoint: 1 column */
    @media (max-width: 680px) {
      .cards-grid {
        grid-template-columns: 1fr;
      }
      .card-borrowing,
      .card-renewal,
      .card-fines,
      .card-membership,
      .card-usage {
        grid-column: span 1;
      }
      .policies-header {
        flex-direction: column;
        align-items: flex-start;
      }
      .fixed-policy-banner {
        max-width: 100%;
        width: 100%;
      }
    }
  `]
})
export class LibraryPoliciesComponent {}
