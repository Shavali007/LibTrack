import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  ApprovalStatus,
  MemberRequestCounts,
  MemberRequestsService,
  MemberRequestSummary
} from './member-requests.service';

@Component({
  selector: 'app-member-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, RouterLink],
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Member Requests</h1>
        <p class="page-subtitle">Newly registered accounts awaiting librarian verification</p>
      </div>
    </header>

    @if (error()) {
      <div class="alert alert-error" role="alert">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="alert-icon">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>{{ error() }}</span>
      </div>
    }
    @if (notice()) {
      <div class="alert alert-success" role="status">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="alert-icon">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>{{ notice() }}</span>
      </div>
    }

    <!-- Tabs matching Screen B: Pending (N), Approved (N), Rejected (N) -->
    <div class="filter-tabs-bar" role="tablist">
      <button
        type="button"
        class="tab-btn"
        [class.active]="activeTab() === 'PENDING_APPROVAL'"
        (click)="setTab('PENDING_APPROVAL')"
        role="tab"
      >
        Pending ({{ counts().pending }})
      </button>
      <button
        type="button"
        class="tab-btn"
        [class.active]="activeTab() === 'APPROVED'"
        (click)="setTab('APPROVED')"
        role="tab"
      >
        Approved ({{ counts().approved }})
      </button>
      <button
        type="button"
        class="tab-btn"
        [class.active]="activeTab() === 'REJECTED'"
        (click)="setTab('REJECTED')"
        role="tab"
      >
        Rejected ({{ counts().rejected }})
      </button>
    </div>

    <!-- Search & Filter Controls matching Screen B -->
    <div class="filter-bar surface-card">
      <div class="search-input-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon" aria-hidden="true">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="search"
          [(ngModel)]="searchQuery"
          (keyup.enter)="applyFilter()"
          placeholder="Search by name, ID, or email..."
          aria-label="Search requests"
          class="search-input"
        />
      </div>

      <div class="filter-dropdown-wrap">
        <select [(ngModel)]="roleFilter" class="filter-select" aria-label="Filter by role">
          <option value="">All Roles</option>
          <option value="STUDENT">Student</option>
          <option value="FACULTY">Faculty</option>
        </select>
      </div>

      <button type="button" class="button button-primary filter-btn" (click)="applyFilter()">
        Filter
      </button>

      @if (hasActiveFilter()) {
        <button type="button" class="button button-quiet reset-btn" (click)="resetFilter()">
          Reset
        </button>
      }
    </div>

    <!-- Requests Table matching Screen B -->
    <div class="table-container surface-card">
      @if (loading()) {
        <div class="loading-state">
          <p>Loading member requests…</p>
        </div>
      } @else if (requests().length === 0) {
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="empty-icon">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <h3>No {{ tabLabel() }} requests found</h3>
          <p>
            @if (activeTab() === 'PENDING_APPROVAL') {
              All self-registered member accounts have been reviewed.
            } @else {
              No requests match the current filters.
            }
          </p>
        </div>
      } @else {
        <table class="data-table">
          <thead>
            <tr>
              <th class="checkbox-col">
                <input
                  type="checkbox"
                  [checked]="allSelected()"
                  (change)="toggleSelectAll($event)"
                  aria-label="Select all"
                />
              </th>
              <th>APPLICANT</th>
              <th>EMAIL</th>
              <th>ROLE</th>
              <th>REQUESTED ON</th>
              <th class="actions-col">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            @for (req of requests(); track req.id; let i = $index) {
              <tr class="table-row">
                <td class="checkbox-col">
                  <input
                    type="checkbox"
                    [checked]="selectedIds().has(req.id)"
                    (change)="toggleSelect(req.id, $event)"
                    aria-label="Select applicant"
                  />
                </td>
                <td class="applicant-cell">
                  <div class="applicant-info">
                    <span class="applicant-avatar" [ngClass]="getAvatarColor(i)">
                      {{ getInitials(req.fullName) }}
                    </span>
                    <div class="applicant-text">
                      <a [routerLink]="['/workspace/librarian/member-requests', req.id]" class="applicant-name">
                        {{ req.fullName }}
                      </a>
                    </div>
                  </div>
                </td>
                <td class="email-cell">
                  <span class="applicant-email-full">{{ req.email }}</span>
                </td>
                <td>
                  <span class="role-badge" [ngClass]="req.role === 'STUDENT' ? 'role-student' : 'role-faculty'">
                    {{ req.role === 'STUDENT' ? 'Student' : 'Faculty' }}
                  </span>
                </td>
                <td class="date-cell">
                  {{ req.requestedOn | date:'mediumDate' }} {{ req.requestedOn | date:'shortTime' }}
                </td>
                <td class="actions-col">
                  @if (req.approvalStatus === 'PENDING_APPROVAL') {
                    <div class="action-buttons">
                      <button
                        type="button"
                        class="action-btn approve-btn"
                        [disabled]="actionPending()"
                        (click)="approveDirect(req)"
                        title="Approve this member request"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="action-icon">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        class="action-btn reject-btn"
                        [disabled]="actionPending()"
                        (click)="openRejectModal(req)"
                        title="Reject this member request"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="action-icon">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        <span>Reject</span>
                      </button>
                    </div>
                  } @else if (req.approvalStatus === 'APPROVED') {
                    <div class="status-indicator status-approved">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="status-svg">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Approved</span>
                    </div>
                  } @else {
                    <div class="status-indicator status-rejected">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="status-svg">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span>Rejected</span>
                    </div>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    <!-- Reject Member Request Modal matching Screen D -->
    @if (showRejectModal() && targetRequest()) {
      <div class="modal-overlay" (click)="closeRejectModal()">
        <div class="modal-dialog surface-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="reject-title">
          <div class="modal-header">
            <div class="modal-icon-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="modal-icon-svg">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
            <h2 id="reject-title" class="modal-title">Reject Member Request</h2>
            <p class="modal-desc">
              Please provide a reason for rejecting this request. The applicant will be notified of the decision.
            </p>
          </div>

          <form (ngSubmit)="confirmReject()" class="modal-form">
            <div class="form-group">
              <label for="reject-reason" class="form-label">
                Rejection Reason <span class="required">*</span>
              </label>
              <select
                id="reject-reason"
                [(ngModel)]="rejectionReason"
                name="rejectionReason"
                required
                class="form-control"
              >
                <option value="Information mismatch (ID / email)">Information mismatch (ID / email)</option>
                <option value="Not found in college records">Not found in college records</option>
                <option value="Invalid applicant information">Invalid applicant information</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div class="form-group">
              <label for="reject-remarks" class="form-label">
                Additional Remarks (optional)
              </label>
              <textarea
                id="reject-remarks"
                [(ngModel)]="rejectionRemarks"
                name="rejectionRemarks"
                rows="3"
                placeholder="The provided institutional ID does not match our records. Please register again with correct details."
                class="form-control textarea"
              ></textarea>
            </div>

            <div class="modal-actions">
              <button
                type="button"
                class="button button-quiet cancel-btn"
                (click)="closeRejectModal()"
                [disabled]="actionPending()"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="button reject-submit-btn"
                [disabled]="!rejectionReason || actionPending()"
              >
                {{ actionPending() ? 'Rejecting…' : 'Reject Request' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    .page-header {
      margin-bottom: 1.5rem;
    }

    .page-title {
      font-size: var(--type-page-title-size);
      font-weight: var(--type-page-title-weight);
      font-family: var(--font-serif);
      color: var(--color-charcoal-900);
      margin: 0 0 0.25rem 0;
    }

    .page-subtitle {
      font-size: var(--type-page-subtitle-size);
      color: var(--color-charcoal-600);
      margin: 0;
    }

    .alert {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-control);
      margin-bottom: 1.25rem;
      font-size: var(--type-body-size);
    }
    .alert-error {
      background: #FEE2E2;
      color: #991B1B;
      border: 1px solid #FECACA;
    }
    .alert-success {
      background: #EAF2EF;
      color: var(--color-primary);
      border: 1px solid #C2D6CF;
    }
    .alert-icon {
      width: 1.25rem;
      height: 1.25rem;
      flex-shrink: 0;
    }

    /* Tabs */
    .filter-tabs-bar {
      display: flex;
      gap: 1.5rem;
      border-bottom: 1px solid var(--color-line-200);
      margin-bottom: 1.25rem;
    }

    .tab-btn {
      padding: 0.65rem 0.25rem;
      border: 0;
      background: transparent;
      font-size: var(--type-button-size);
      font-weight: 550;
      color: var(--color-charcoal-600);
      cursor: pointer;
      position: relative;
      transition: color 0.15s ease;
    }

    .tab-btn:hover {
      color: var(--color-charcoal-900);
    }

    .tab-btn.active {
      color: var(--color-primary);
      font-weight: 650;
    }

    .tab-btn.active::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 2.5px;
      background-color: var(--color-primary);
      border-radius: 2px 2px 0 0;
    }

    /* Filter Bar matching Screen B */
    .filter-bar {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.85rem 1.25rem;
      border: 1px solid var(--color-line-200);
      border-radius: var(--radius-card);
      margin-bottom: 1.25rem;
      background: #ffffff;
    }

    .search-input-wrap {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      background: #ffffff;
      border: 1px solid var(--color-line-200);
      border-radius: var(--radius-control);
      padding: 0 0.85rem;
      height: 2.5rem;
      flex: 1;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .search-input-wrap:focus-within {
      border-color: #003D30;
      box-shadow: 0 0 0 3px rgba(0, 61, 48, 0.12);
    }

    .search-icon {
      width: 1.05rem;
      height: 1.05rem;
      color: var(--color-charcoal-400);
      flex-shrink: 0;
      pointer-events: none;
    }

    .search-input-wrap input.search-input {
      border: 0 !important;
      background: transparent !important;
      outline: none !important;
      box-shadow: none !important;
      font-size: var(--type-input-size);
      width: 100%;
      height: 100%;
      min-height: unset;
      padding: 0 !important;
      color: var(--color-charcoal-900);
    }

    .filter-dropdown-wrap {
      min-width: 130px;
    }

    .filter-select {
      width: 100%;
      height: 2.5rem;
      padding: 0 2rem 0 0.85rem;
      border: 1px solid var(--color-line-200);
      border-radius: var(--radius-control);
      font-size: var(--type-input-size);
      color: var(--color-charcoal-900);
      background: #ffffff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23737C76' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 0.75rem center / 1rem;
      appearance: none;
      outline: none;
      cursor: pointer;
    }

    .filter-select:focus {
      border-color: #003D30;
    }

    .filter-btn {
      height: 2.5rem;
      padding: 0 1.5rem;
      font-size: var(--type-button-size);
      font-weight: 600;
      background: #003D30 !important;
      color: #ffffff !important;
      border-radius: var(--radius-control);
      border: 1px solid #003D30;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .filter-btn:hover {
      background: #002B22 !important;
      border-color: #002B22;
      color: #ffffff !important;
    }

    .reset-btn {
      height: 2.5rem;
      padding: 0 0.85rem;
      font-size: var(--type-button-size);
    }

    /* Table Container */
    .table-container {
      border: 1px solid var(--color-line-200);
      border-radius: var(--radius-card);
      overflow: hidden;
      background: #ffffff;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .data-table th {
      padding: 0.85rem 1.25rem;
      background: #FAF9F6;
      border-bottom: 1px solid var(--color-line-200);
      font-size: var(--type-table-th-size);
      font-weight: var(--type-table-th-weight);
      color: var(--color-charcoal-600);
      letter-spacing: 0.04em;
    }

    .data-table td {
      padding: 0.95rem 1.25rem;
      border-bottom: 1px solid var(--color-line-200);
      font-size: var(--type-table-td-size);
      color: var(--color-charcoal-900);
      vertical-align: middle;
    }

    .table-row:hover {
      background: #FDFCF9;
    }

    .checkbox-col {
      width: 40px;
      padding-right: 0 !important;
      text-align: center;
    }

    .actions-col {
      text-align: right;
    }

    /* Applicant Cell */
    .applicant-info {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .applicant-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.35rem;
      height: 2.35rem;
      border-radius: 50%;
      font-size: 0.8rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .avatar-orange {
      background: #FFEDD5;
      color: #9A3412;
    }
    .avatar-purple {
      background: #F3E8FF;
      color: #7E22CE;
    }
    .avatar-blue {
      background: #E0F2FE;
      color: #0369A1;
    }
    .avatar-teal {
      background: #CCFBF1;
      color: #0F766E;
    }
    .avatar-pink {
      background: #FCE7F3;
      color: #BE185D;
    }

    .applicant-text {
      display: flex;
      flex-direction: column;
      line-height: 1.25;
    }

    .applicant-name {
      font-weight: 650;
      color: var(--color-charcoal-900);
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .applicant-name:hover {
      color: var(--color-primary);
      text-decoration: underline;
    }

    .applicant-email {
      font-size: 0.78rem;
      color: var(--color-charcoal-600);
      margin-top: 0.15rem;
    }

    .id-mono {
      font-family: monospace;
      font-size: 0.85rem;
      color: var(--color-charcoal-900);
      font-weight: 600;
    }

    .id-mono.not-provided {
      font-family: inherit;
      font-style: italic;
      font-weight: normal;
      color: var(--color-charcoal-400);
      font-size: 0.82rem;
    }

    /* Role Badges matching Screen B */
    .role-badge {
      display: inline-block;
      padding: 0.2rem 0.65rem;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 700;
    }

    .role-student {
      background: #E0F2FE;
      color: #0369A1;
      border: 1px solid #BAE6FD;
    }

    .role-faculty {
      background: #F3E8FF;
      color: #6B21A8;
      border: 1px solid #E9D5FF;
    }

    .date-cell {
      color: var(--color-charcoal-600);
      font-size: 0.82rem;
    }

    /* Action Buttons matching Screen B */
    .action-buttons {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-control);
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .approve-btn {
      background: #003D30 !important;
      color: #ffffff !important;
      border: 1px solid #003D30;
    }

    .approve-btn:hover:not(:disabled) {
      background: #002B22 !important;
      border-color: #002B22;
      color: #ffffff !important;
    }

    .approve-btn:focus-visible {
      outline: 2px solid #003D30;
      outline-offset: 2px;
    }

    .approve-btn .action-icon {
      stroke: #ffffff;
      color: #ffffff;
    }

    .reject-btn {
      background: #DC2626 !important;
      color: #ffffff !important;
      border: 1px solid #DC2626;
    }

    .reject-btn:hover:not(:disabled) {
      background: #B91C1C !important;
      border-color: #B91C1C;
      color: #ffffff !important;
    }

    .reject-btn:focus-visible {
      outline: 2px solid #DC2626;
      outline-offset: 2px;
    }

    .reject-btn .action-icon {
      stroke: #ffffff;
      color: #ffffff;
    }

    .action-icon {
      width: 0.85rem;
      height: 0.85rem;
    }

    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .status-approved {
      color: var(--color-primary);
    }
    .status-rejected {
      color: #DC2626;
    }
    .status-svg {
      width: 0.95rem;
      height: 0.95rem;
    }

    .empty-state, .loading-state {
      padding: 3.5rem 2rem;
      text-align: center;
      color: var(--color-charcoal-600);
    }

    .empty-icon {
      width: 3rem;
      height: 3rem;
      margin-bottom: 0.75rem;
      color: var(--color-charcoal-400, #9CA3AF);
    }

    .empty-state h3 {
      font-size: var(--type-empty-title-size);
      font-weight: 600;
      color: var(--color-charcoal-900);
      margin: 0 0 0.25rem 0;
    }

    .empty-state p {
      font-size: var(--type-empty-body-size);
      margin: 0;
    }

    /* Reject Modal matching Screen D */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(16, 31, 25, 0.55);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-dialog {
      width: 100%;
      max-width: 480px;
      padding: 1.75rem;
      border-radius: 1.25rem;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.2);
      border: 1px solid var(--color-line-200);
      background: #ffffff;
    }

    .modal-header {
      margin-bottom: 1.5rem;
    }

    .modal-icon-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 50%;
      background: #FEE2E2;
      color: #DC2626;
      margin-bottom: 0.85rem;
    }

    .modal-icon-svg {
      width: 1.4rem;
      height: 1.4rem;
    }

    .modal-title {
      font-size: var(--type-modal-title-size);
      font-weight: var(--type-modal-title-weight);
      color: var(--color-charcoal-900);
      margin: 0 0 0.4rem 0;
    }

    .modal-desc {
      font-size: var(--type-modal-desc-size);
      color: var(--color-charcoal-600);
      line-height: 1.45;
      margin: 0;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .form-label {
      font-size: var(--type-form-label-size);
      font-weight: var(--type-form-label-weight);
      color: var(--color-charcoal-900);
    }

    .required {
      color: #DC2626;
    }

    .form-control {
      width: 100%;
      height: 2.65rem;
      padding: 0 0.85rem;
      border: 1px solid var(--color-line-300);
      border-radius: var(--radius-control);
      font-size: var(--type-input-size);
      color: var(--color-charcoal-900);
      background: #ffffff;
      outline: none;
    }

    .form-control:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(0, 61, 48, 0.1);
    }

    .form-control.textarea {
      height: auto;
      padding: 0.65rem 0.85rem;
      resize: vertical;
      font-family: inherit;
    }

    .modal-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .cancel-btn {
      padding: 0.6rem 1.25rem;
      border: 1px solid var(--color-line-300);
      border-radius: var(--radius-control);
      background: #ffffff;
      font-size: var(--type-button-size);
      font-weight: 600;
      color: var(--color-charcoal-700);
      cursor: pointer;
    }

    .reject-submit-btn {
      padding: 0.6rem 1.35rem;
      border: 0;
      border-radius: var(--radius-control);
      background: #DC2626;
      font-size: var(--type-button-size);
      font-weight: 600;
      color: #ffffff;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .reject-submit-btn:hover:not(:disabled) {
      background: #B91C1C;
    }

    .reject-submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class MemberRequestsComponent implements OnInit {
  private readonly service = inject(MemberRequestsService);
  private readonly router = inject(Router);

  readonly activeTab = signal<ApprovalStatus>('PENDING_APPROVAL');
  readonly counts = signal<MemberRequestCounts>({ pending: 0, approved: 0, rejected: 0 });
  readonly requests = signal<MemberRequestSummary[]>([]);
  readonly loading = signal(false);
  readonly actionPending = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  searchQuery = '';
  roleFilter = '';

  readonly selectedIds = signal<Set<string>>(new Set());

  // Reject modal state
  readonly showRejectModal = signal(false);
  readonly targetRequest = signal<MemberRequestSummary | null>(null);
  rejectionReason = 'Information mismatch (ID / email)';
  rejectionRemarks = 'The provided institutional ID does not match our records. Please register again with correct details.';

  private readonly avatarColors = [
    'avatar-orange',
    'avatar-purple',
    'avatar-blue',
    'avatar-teal',
    'avatar-pink'
  ];

  ngOnInit(): void {
    this.refreshAll();
  }

  refreshAll(): void {
    this.loadCounts();
    this.loadRequests();
  }

  loadCounts(): void {
    this.service.getCounts().subscribe({
      next: (counts) => this.counts.set(counts),
      error: () => {}
    });
  }

  loadRequests(): void {
    this.loading.set(true);
    this.error.set('');
    this.service
      .list(this.activeTab(), this.roleFilter, this.searchQuery)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => {
          this.requests.set(page.content);
          this.selectedIds.set(new Set());
        },
        error: (err) => {
          this.error.set('Failed to load member requests. Please try again.');
        }
      });
  }

  setTab(tab: ApprovalStatus): void {
    this.activeTab.set(tab);
    this.loadRequests();
  }

  tabLabel(): string {
    switch (this.activeTab()) {
      case 'PENDING_APPROVAL': return 'pending';
      case 'APPROVED': return 'approved';
      case 'REJECTED': return 'rejected';
    }
  }

  applyFilter(): void {
    this.loadRequests();
  }

  resetFilter(): void {
    this.searchQuery = '';
    this.roleFilter = '';
    this.loadRequests();
  }

  hasActiveFilter(): boolean {
    return this.searchQuery.trim().length > 0 || this.roleFilter.length > 0;
  }

  getAvatarColor(index: number): string {
    return this.avatarColors[index % this.avatarColors.length];
  }

  getInitials(name: string): string {
    if (!name) return 'M';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  allSelected = computed(() => {
    const list = this.requests();
    const sel = this.selectedIds();
    return list.length > 0 && list.every((r) => sel.has(r.id));
  });

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedIds.set(new Set(this.requests().map((r) => r.id)));
    } else {
      this.selectedIds.set(new Set());
    }
  }

  toggleSelect(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = new Set(this.selectedIds());
    if (checked) {
      current.add(id);
    } else {
      current.delete(id);
    }
    this.selectedIds.set(current);
  }

  approveDirect(req: MemberRequestSummary): void {
    this.actionPending.set(true);
    this.error.set('');
    this.service
      .approve(req.id)
      .pipe(finalize(() => this.actionPending.set(false)))
      .subscribe({
        next: () => {
          this.notice.set(`Approved account for ${req.fullName}.`);
          this.refreshAll();
          setTimeout(() => this.notice.set(''), 4000);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Failed to approve request.');
        }
      });
  }

  openRejectModal(req: MemberRequestSummary): void {
    this.targetRequest.set(req);
    this.rejectionReason = 'Information mismatch (ID / email)';
    this.rejectionRemarks = 'The provided institutional ID does not match our records. Please register again with correct details.';
    this.showRejectModal.set(true);
  }

  closeRejectModal(): void {
    this.showRejectModal.set(false);
    this.targetRequest.set(null);
  }

  confirmReject(): void {
    const req = this.targetRequest();
    if (!req) return;

    this.actionPending.set(true);
    this.error.set('');
    this.service
      .reject(req.id, this.rejectionReason, this.rejectionRemarks)
      .pipe(finalize(() => this.actionPending.set(false)))
      .subscribe({
        next: () => {
          this.notice.set(`Rejected registration for ${req.fullName}.`);
          this.closeRejectModal();
          this.refreshAll();
          setTimeout(() => this.notice.set(''), 4000);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Failed to reject request.');
        }
      });
  }
}
