import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  MemberRequestDetail,
  MemberRequestsService
} from './member-requests.service';

@Component({
  selector: 'app-member-request-review',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, RouterLink],
  template: `
    <div class="review-page">
      <!-- Back Link matching Screen C -->
      <a routerLink="/workspace/librarian/member-requests" class="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="back-icon">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span>Back to Member Requests</span>
      </a>

      <!-- Page Header matching Screen C -->
      <header class="page-header">
        <h1 class="page-title">Review Member Request</h1>
        <p class="page-subtitle">Verify the applicant's details and approve or reject the account</p>
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

      @if (loading()) {
        <div class="loading-state surface-card">
          <p>Loading applicant details…</p>
        </div>
      } @else if (request(); as req) {
        <!-- Applicant Banner Card matching Screen C -->
        <div class="applicant-banner-card surface-card">
          <div class="banner-left">
            <span class="banner-avatar">
              {{ getInitials(req.fullName) }}
            </span>
            <div class="banner-info">
              <div class="name-role-row">
                <h2 class="applicant-display-name">{{ req.fullName }}</h2>
                <span class="role-badge" [ngClass]="req.role === 'STUDENT' ? 'role-student' : 'role-faculty'">
                  {{ req.role === 'STUDENT' ? 'Student' : 'Faculty' }}
                </span>
              </div>
              <span class="applicant-display-email">{{ req.email }}</span>
            </div>
          </div>

          <div class="banner-right">
            @if (req.approvalStatus === 'PENDING_APPROVAL') {
              <div class="status-card status-card-pending">
                <span class="status-clock-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </span>
                <div class="status-text-wrap">
                  <strong class="status-title">Pending Approval</strong>
                  <span class="status-subtitle">
                    Requested on {{ req.requestedOn | date:'mediumDate' }}, {{ req.requestedOn | date:'shortTime' }}
                  </span>
                </div>
              </div>
            } @else if (req.approvalStatus === 'APPROVED') {
              <div class="status-card status-card-approved">
                <span class="status-clock-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </span>
                <div class="status-text-wrap">
                  <strong class="status-title">Approved</strong>
                  <span class="status-subtitle">
                    Reviewed on {{ req.reviewedAt | date:'mediumDate' }} by {{ req.reviewedByLibrarianName || 'Librarian' }}
                  </span>
                </div>
              </div>
            } @else {
              <div class="status-card status-card-rejected">
                <span class="status-clock-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </span>
                <div class="status-text-wrap">
                  <strong class="status-title">Rejected</strong>
                  <span class="status-subtitle">
                    Reason: {{ req.rejectionReason }}
                  </span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Section 1: Applicant Details Table matching Screen C -->
        <div class="section-card surface-card">
          <h3 class="section-heading">Applicant Details</h3>
          <div class="details-table">
            <div class="details-row">
              <span class="row-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="row-icon">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>User Name</span>
              </span>
              <span class="row-value bold">{{ req.fullName }}</span>
            </div>

            @if (req.role === 'STUDENT') {
              <div class="details-row">
                <span class="row-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="row-icon">
                    <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                    <line x1="7" y1="8" x2="17" y2="8"></line>
                    <line x1="7" y1="12" x2="17" y2="12"></line>
                    <line x1="7" y1="16" x2="12" y2="16"></line>
                  </svg>
                  <span>Student Institutional ID</span>
                </span>
                <span class="row-value mono-val">
                  {{ req.institutionalId }}
                </span>
              </div>
            }

            <div class="details-row">
              <span class="row-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="row-icon">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <span>Institutional Email</span>
              </span>
              <span class="row-value">{{ req.email }}</span>
            </div>

            <div class="details-row">
              <span class="row-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="row-icon">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span>Role</span>
              </span>
              <span class="row-value">
                <span class="role-badge" [ngClass]="req.role === 'STUDENT' ? 'role-student' : 'role-faculty'">
                  {{ req.role === 'STUDENT' ? 'Student' : 'Faculty' }}
                </span>
              </span>
            </div>
          </div>
        </div>

        <!-- Section 2: Librarian Remarks matching Screen C -->
        <div class="section-card surface-card">
          <h3 class="section-heading">Librarian Remarks (optional)</h3>
          @if (req.approvalStatus === 'PENDING_APPROVAL') {
            <textarea
              [(ngModel)]="librarianRemarks"
              rows="3"
              placeholder="Add a note about approval or rejection..."
              class="remarks-textarea"
            ></textarea>
          } @else {
            <p class="saved-remarks">
              {{ req.librarianRemarks || 'No remarks recorded.' }}
            </p>
          }
        </div>

        <!-- Bottom Action Bar matching Screen C -->
        <div class="bottom-action-bar">
          <button
            type="button"
            class="button button-quiet cancel-action-btn"
            routerLink="/workspace/librarian/member-requests"
          >
            Cancel
          </button>

          @if (req.approvalStatus === 'PENDING_APPROVAL') {
            <div class="right-actions">
              <button
                type="button"
                class="button reject-action-btn"
                [disabled]="actionPending()"
                (click)="openRejectModal()"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="btn-icon-svg">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span>Reject</span>
              </button>

              <button
                type="button"
                class="button approve-action-btn"
                [disabled]="actionPending()"
                (click)="approveRequest()"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="btn-icon-svg">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>{{ actionPending() ? 'Approving…' : 'Approve' }}</span>
              </button>
            </div>
          }
        </div>
      }

      <!-- Rejection Modal matching Screen D -->
      @if (showRejectModal()) {
        <div class="modal-overlay" (click)="closeRejectModal()">
          <div class="modal-dialog surface-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="reject-review-title">
            <div class="modal-header">
              <div class="modal-icon-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="modal-icon-svg">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </div>
              <h2 id="reject-review-title" class="modal-title">Reject Member Request</h2>
              <p class="modal-desc">
                Please provide a reason for rejecting this request. The applicant will be notified of the decision.
              </p>
            </div>

            <form (ngSubmit)="confirmReject()" class="modal-form">
              <div class="form-group">
                <label for="review-reject-reason" class="form-label">
                  Rejection Reason <span class="required">*</span>
                </label>
                <select
                  id="review-reject-reason"
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
                <label for="review-reject-remarks" class="form-label">
                  Additional Remarks (optional)
                </label>
                <textarea
                  id="review-reject-remarks"
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
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .review-page {
      max-width: 960px;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      font-size: var(--type-button-size);
      font-weight: 550;
      color: var(--color-charcoal-700);
      text-decoration: none;
      margin-bottom: 1.25rem;
      transition: color 0.15s ease;
    }

    .back-link:hover {
      color: var(--color-primary);
    }

    .back-icon {
      width: 1rem;
      height: 1rem;
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

    /* Applicant Banner matching Screen C */
    .applicant-banner-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem 1.75rem;
      border: 1px solid var(--color-line-200);
      border-radius: var(--radius-card);
      margin-bottom: 1.5rem;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .banner-left {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .banner-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 50%;
      background: #FFEDD5;
      color: #9A3412;
      font-size: 1.15rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .banner-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .name-role-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .applicant-display-name {
      font-size: 1.25rem;
      font-weight: 650;
      color: var(--color-charcoal-900);
      margin: 0;
    }

    .applicant-display-email {
      font-size: 0.85rem;
      color: var(--color-charcoal-600);
    }

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

    /* Status Card on Right */
    .status-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1.15rem;
      border-radius: var(--radius-control);
    }

    .status-card-pending {
      background: #FEF3C7;
      border: 1px solid #FDE68A;
      color: #92400E;
    }

    .status-card-approved {
      background: #EAF2EF;
      border: 1px solid #C2D6CF;
      color: var(--color-primary);
    }

    .status-card-rejected {
      background: #FEE2E2;
      border: 1px solid #FECACA;
      color: #991B1B;
    }

    .status-clock-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.65rem;
      height: 1.65rem;
      flex-shrink: 0;
    }

    .status-clock-icon svg {
      width: 1.4rem;
      height: 1.4rem;
    }

    .status-text-wrap {
      display: flex;
      flex-direction: column;
      line-height: 1.3;
    }

    .status-title {
      font-size: 0.9rem;
      font-weight: 700;
    }

    .status-subtitle {
      font-size: 0.75rem;
      opacity: 0.9;
    }

    /* Section Cards */
    .section-card {
      padding: 1.5rem 1.75rem;
      border: 1px solid var(--color-line-200);
      border-radius: var(--radius-card);
      margin-bottom: 1.5rem;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .section-heading {
      font-size: var(--type-card-heading-size);
      font-weight: var(--type-card-heading-weight);
      color: var(--color-charcoal-900);
      margin: 0 0 1.15rem 0;
    }

    /* Details Table matching Screen C */
    .details-table {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--color-line-200);
      border-radius: var(--radius-control);
      overflow: hidden;
    }

    .details-row {
      display: flex;
      align-items: center;
      padding: 0.95rem 1.25rem;
      border-bottom: 1px solid var(--color-line-200);
      background: #ffffff;
    }

    .details-row:last-child {
      border-bottom: 0;
    }

    .details-row:nth-child(even) {
      background: #FAF9F6;
    }

    .row-label {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      width: 240px;
      flex-shrink: 0;
      color: var(--color-charcoal-600);
      font-size: var(--type-body-size);
      font-weight: 500;
    }

    .row-icon {
      width: 1.15rem;
      height: 1.15rem;
      color: var(--color-charcoal-500);
    }

    .row-value {
      font-size: var(--type-body-size);
      color: var(--color-charcoal-900);
    }

    .row-value.bold {
      font-weight: 600;
    }

    .mono-val {
      font-family: monospace;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .mono-val.not-provided {
      font-family: inherit;
      font-style: italic;
      font-weight: normal;
      color: var(--color-charcoal-400);
      font-size: 0.85rem;
    }

    /* Remarks Textarea */
    .remarks-textarea {
      width: 100%;
      padding: 0.85rem 1rem;
      border: 1px solid var(--color-line-300);
      border-radius: var(--radius-control);
      font-family: inherit;
      font-size: var(--type-input-size);
      color: var(--color-charcoal-900);
      background: #ffffff;
      outline: none;
      resize: vertical;
      transition: border-color 0.15s ease;
    }

    .remarks-textarea:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(0, 61, 48, 0.1);
    }

    .saved-remarks {
      font-size: var(--type-body-size);
      color: var(--color-charcoal-700);
      margin: 0;
      line-height: 1.5;
    }

    /* Bottom Action Bar matching Screen C */
    .bottom-action-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 1.5rem;
      padding-top: 1rem;
    }

    .cancel-action-btn {
      padding: 0.65rem 1.5rem;
      border: 1px solid var(--color-line-300);
      border-radius: var(--radius-control);
      background: #ffffff;
      color: var(--color-charcoal-800);
      font-size: var(--type-button-size);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .cancel-action-btn:hover:not(:disabled) {
      background: var(--bg-warm);
      border-color: #C8CEC4;
    }

    .right-actions {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .reject-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.65rem 1.5rem;
      border: 1px solid #DC2626;
      border-radius: var(--radius-control);
      background: #DC2626 !important;
      color: #ffffff !important;
      font-size: var(--type-button-size);
      font-weight: 700;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .reject-action-btn:hover:not(:disabled) {
      background: #B91C1C !important;
      border-color: #B91C1C;
    }

    .reject-action-btn:focus-visible {
      outline: 2px solid #DC2626;
      outline-offset: 2px;
    }

    .reject-action-btn .btn-icon-svg {
      stroke: #ffffff;
      color: #ffffff;
    }

    .approve-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.65rem 1.75rem;
      border: 1px solid #003D30;
      border-radius: var(--radius-control);
      background: #003D30 !important;
      color: #ffffff !important;
      font-size: var(--type-button-size);
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .approve-action-btn:hover:not(:disabled) {
      background: #002B22 !important;
      border-color: #002B22;
    }

    .approve-action-btn:focus-visible {
      outline: 2px solid #003D30;
      outline-offset: 2px;
    }

    .approve-action-btn .btn-icon-svg {
      stroke: #ffffff;
      color: #ffffff;
    }

    .btn-icon-svg {
      width: 1rem;
      height: 1rem;
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

    .loading-state {
      padding: 3rem;
      text-align: center;
      color: var(--color-charcoal-500);
      border: 1px solid var(--color-line-200);
      border-radius: var(--radius-card);
    }
  `]
})
export class MemberRequestReviewComponent implements OnInit {
  private readonly service = inject(MemberRequestsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly request = signal<MemberRequestDetail | null>(null);
  readonly loading = signal(false);
  readonly actionPending = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  librarianRemarks = '';

  // Reject modal state
  readonly showRejectModal = signal(false);
  rejectionReason = 'Information mismatch (ID / email)';
  rejectionRemarks = 'The provided institutional ID does not match our records. Please register again with correct details.';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadRequest(id);
    }
  }

  loadRequest(id: string): void {
    this.loading.set(true);
    this.error.set('');
    this.service
      .get(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (detail) => {
          this.request.set(detail);
          this.librarianRemarks = detail.librarianRemarks || '';
        },
        error: (err) => {
          this.error.set('Failed to load member request details.');
        }
      });
  }

  getInitials(name: string): string {
    if (!name) return 'M';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  approveRequest(): void {
    const req = this.request();
    if (!req) return;

    this.actionPending.set(true);
    this.error.set('');
    this.service
      .approve(req.id, this.librarianRemarks)
      .pipe(finalize(() => this.actionPending.set(false)))
      .subscribe({
        next: (updated) => {
          this.request.set(updated);
          this.notice.set(`Account approved successfully for ${updated.fullName}.`);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Failed to approve member request.');
        }
      });
  }

  openRejectModal(): void {
    this.rejectionReason = 'Information mismatch (ID / email)';
    this.rejectionRemarks = this.librarianRemarks || 'The provided institutional ID does not match our records. Please register again with correct details.';
    this.showRejectModal.set(true);
  }

  closeRejectModal(): void {
    this.showRejectModal.set(false);
  }

  confirmReject(): void {
    const req = this.request();
    if (!req) return;

    this.actionPending.set(true);
    this.error.set('');
    this.service
      .reject(req.id, this.rejectionReason, this.rejectionRemarks)
      .pipe(finalize(() => this.actionPending.set(false)))
      .subscribe({
        next: (updated) => {
          this.request.set(updated);
          this.closeRejectModal();
          this.notice.set(`Account registration has been rejected.`);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Failed to reject member request.');
        }
      });
  }
}
