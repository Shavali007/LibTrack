import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { CreateNotificationRequest, LibrarianOperationsService, NotificationRecord } from './librarian-operations.service';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <header class="page-heading">
      <div>
        <p class="eyebrow">LIBRARIAN WORKSPACE · COMMUNICATIONS</p>
        <h1>Notifications & Broadcasts</h1>
        <p class="muted">Operational announcements, overdue notices, system alerts, and role-based bulletins.</p>
      </div>
      <div class="header-actions">
        <button class="button button-secondary" type="button" (click)="markAllRead()" [disabled]="pending() || !hasUnread()">
          ✓ Mark All Read
        </button>
        <button class="button button-primary" type="button" (click)="openBroadcastModal()">
          + Send Broadcast
        </button>
      </div>
    </header>

    @if (error()) {
      <p class="alert alert-error" role="alert">{{ error() }}</p>
    }
    @if (notice()) {
      <p class="alert alert-success" role="status">{{ notice() }}</p>
    }

    @if (loading()) {
      <div class="loading-state" role="status">Loading notifications…</div>
    } @else if (!notifications().length) {
      <section class="empty-state surface-card">
        <h2>No notifications</h2>
        <p>Operational alerts and messages will appear here.</p>
      </section>
    } @else {
      <div class="notification-list">
        @for (item of notifications(); track item.id) {
          <article
            class="surface-card notification-item"
            [class.unread-item]="!item.read"
          >
            <div class="item-status-col">
              <span class="status-dot" [class.dot-unread]="!item.read" [title]="item.read ? 'Read' : 'Unread'"></span>
            </div>
            <div class="item-content-col">
              <div class="item-meta">
                <span class="category-badge">{{ item.category }}</span>
                @if (item.targetRole) {
                  <span class="role-pill">Target: {{ item.targetRole }}</span>
                }
                <time class="muted time-sub" [attr.datetime]="item.createdAt">{{ item.createdAt | date:'d MMM y, h:mm a' }}</time>
              </div>
              <h3 class="item-title">{{ item.title }}</h3>
              <p class="item-message">{{ item.message }}</p>
            </div>
            <div class="item-action-col">
              @if (!item.read) {
                <button
                  class="button button-quiet btn-sm"
                  type="button"
                  (click)="markRead(item)"
                  [disabled]="pending()"
                >
                  Mark read
                </button>
              } @else {
                <span class="read-check muted">✓ Read</span>
              }
            </div>
          </article>
        }
      </div>
    }

    <!-- Broadcast Modal -->
    @if (showBroadcastModal()) {
      <div class="modal-backdrop" (click)="closeBroadcastModal()">
        <div class="modal-dialog surface-card" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <div>
              <p class="eyebrow">OPERATIONAL BULLETIN</p>
              <h2>Send Library Broadcast</h2>
            </div>
            <button class="close-btn" type="button" (click)="closeBroadcastModal()" aria-label="Close dialog">✕</button>
          </header>
          <form (ngSubmit)="sendBroadcast()">
            <div class="modal-body">
              <div class="field">
                <label for="b-target">Recipient Audience</label>
                <select id="b-target" [(ngModel)]="broadcastRole" name="targetRole">
                  <option value="">All Library Users (Campus Broadcast)</option>
                  <option value="STUDENT">Students Only</option>
                  <option value="FACULTY">Faculty Only</option>
                  <option value="LIBRARIAN">Librarians Only</option>
                </select>
              </div>

              <div class="field">
                <label for="b-category">Category</label>
                <select id="b-category" [(ngModel)]="broadcastCategory" name="category">
                  <option value="OPERATIONAL">Operational Announcement</option>
                  <option value="HOLIDAY">Holiday & Schedule Update</option>
                  <option value="CIRCULATION">Circulation Notice</option>
                  <option value="ACQUISITION">New Book Arrivals</option>
                  <option value="MAINTENANCE">System Maintenance</option>
                </select>
              </div>

              <div class="field">
                <label for="b-title">Title</label>
                <input
                  id="b-title"
                  type="text"
                  [(ngModel)]="broadcastTitle"
                  name="title"
                  placeholder="e.g. Extended Library Hours During Midterms"
                  maxlength="150"
                  required
                />
              </div>

              <div class="field">
                <label for="b-message">Message</label>
                <textarea
                  id="b-message"
                  [(ngModel)]="broadcastMessage"
                  name="message"
                  rows="4"
                  placeholder="Provide announcement details, dates, or relevant instructions…"
                  maxlength="1000"
                  required
                ></textarea>
              </div>
            </div>
            <footer class="modal-footer">
              <button class="button button-quiet" type="button" (click)="closeBroadcastModal()">Cancel</button>
              <button
                class="button button-primary"
                type="submit"
                [disabled]="pending() || !broadcastTitle.trim() || !broadcastMessage.trim()"
              >
                {{ pending() ? 'Broadcasting…' : 'Send Broadcast' }}
              </button>
            </footer>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .page-heading {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
    }
    .page-heading h1 { margin: 0.2rem 0; font-size: 1.85rem; }
    .header-actions {
      display: flex;
      gap: 0.75rem;
    }
    .notification-list {
      display: grid;
      gap: 0.85rem;
    }
    .notification-item {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 1.15rem;
      padding: 1.1rem 1.4rem;
      border-radius: var(--radius-panel);
      border: 1px solid var(--color-line-200);
      background: var(--color-paper);
      transition: background 0.15s ease;
    }
    .unread-item {
      background: #fbfbf7;
      border-color: #c9dbd1;
    }
    .status-dot {
      display: inline-block;
      width: 0.75rem;
      height: 0.75rem;
      border-radius: 50%;
      background: var(--color-line-300);
    }
    .dot-unread {
      background: #1b4332;
      box-shadow: 0 0 0 3px rgba(27, 67, 50, 0.2);
    }
    .item-meta {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 0.35rem;
      flex-wrap: wrap;
    }
    .category-badge {
      background: #e8f3ee;
      color: #1b4332;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 700;
    }
    .role-pill {
      background: #f1f5f9;
      color: #475569;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 600;
    }
    .time-sub { font-size: 0.78rem; }
    .item-title {
      margin: 0 0 0.3rem;
      font-size: 1.05rem;
      color: var(--color-charcoal-900);
    }
    .item-message {
      margin: 0;
      font-size: 0.88rem;
      line-height: 1.45;
      color: var(--color-charcoal-700);
    }
    .read-check {
      font-size: 0.82rem;
      font-weight: 600;
    }

    /* Modal */
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
      width: min(100%, 34rem);
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
    .modal-header h2 { margin: 0.2rem 0 0; font-size: 1.35rem; }
    .close-btn {
      background: transparent;
      border: 0;
      font-size: 1.2rem;
      cursor: pointer;
      color: var(--color-charcoal-600);
    }
    .modal-body { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--color-line-200);
    }
    @media (max-width: 600px) {
      .notification-item {
        grid-template-columns: auto 1fr;
      }
      .item-action-col {
        grid-column: 2;
        margin-top: 0.5rem;
      }
    }
  `]
})
export class NotificationCenterComponent implements OnInit {
  private readonly opsService = inject(LibrarianOperationsService);

  readonly notifications = signal<NotificationRecord[]>([]);
  readonly loading = signal(true);
  readonly pending = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  // Broadcast modal
  readonly showBroadcastModal = signal(false);
  broadcastRole = '';
  broadcastCategory = 'OPERATIONAL';
  broadcastTitle = '';
  broadcastMessage = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.opsService.getNotifications()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.notifications.set(items),
        error: () => this.error.set('Failed to load notifications.')
      });
  }

  hasUnread(): boolean {
    return this.notifications().some(n => !n.read);
  }

  markRead(item: NotificationRecord): void {
    if (this.pending()) return;
    this.pending.set(true);
    this.opsService.markNotificationRead(item.id)
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe({
        next: () => {
          this.notifications.update(list =>
            list.map(n => n.id === item.id ? { ...n, read: true } : n)
          );
        },
        error: () => this.error.set('Could not mark notification as read.')
      });
  }

  markAllRead(): void {
    if (this.pending() || !this.hasUnread()) return;
    this.pending.set(true);
    this.opsService.markAllNotificationsRead()
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe({
        next: () => {
          this.notifications.update(list =>
            list.map(n => ({ ...n, read: true }))
          );
          this.notice.set('All notifications marked as read.');
        },
        error: () => this.error.set('Could not mark notifications as read.')
      });
  }

  openBroadcastModal(): void {
    this.broadcastRole = '';
    this.broadcastCategory = 'OPERATIONAL';
    this.broadcastTitle = '';
    this.broadcastMessage = '';
    this.showBroadcastModal.set(true);
  }

  closeBroadcastModal(): void {
    this.showBroadcastModal.set(false);
  }

  sendBroadcast(): void {
    if (this.pending() || !this.broadcastTitle.trim() || !this.broadcastMessage.trim()) return;
    this.pending.set(true);
    this.error.set('');
    this.notice.set('');

    const req: CreateNotificationRequest = {
      title: this.broadcastTitle.trim(),
      message: this.broadcastMessage.trim(),
      category: this.broadcastCategory,
      targetRole: this.broadcastRole ? this.broadcastRole : null
    };

    this.opsService.createNotification(req)
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe({
        next: () => {
          this.notice.set('Broadcast dispatched to library users.');
          this.closeBroadcastModal();
          this.load();
        },
        error: () => this.error.set('Could not dispatch broadcast.')
      });
  }
}
