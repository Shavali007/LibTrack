import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { NotificationClientService, NotificationItem } from './notification.service';
import { AuthService } from '../auth/auth.service';
import { CatalogueService } from '../catalogue/catalogue.service';
import { ToastService } from '../../shared/layout/toast.component';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './notifications-page.component.html',
  styleUrls: ['./notifications-page.component.scss']
})
export class NotificationsPageComponent implements OnInit {
  readonly notifService = inject(NotificationClientService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly catalogueService = inject(CatalogueService);
  private readonly toastService = inject(ToastService);

  readonly notifications = signal<NotificationItem[]>([]);
  readonly selectedNotification = signal<NotificationItem | null>(null);

  readonly activeFilter = signal<'ALL' | 'UNREAD' | 'READ'>('ALL');
  readonly activeSort = signal<'LATEST' | 'OLDEST'>('LATEST');

  readonly loading = signal<boolean>(false);
  readonly pendingAction = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly showClearConfirm = signal<boolean>(false);

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.notifService.getNotifications(this.activeFilter(), this.activeSort())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => {
          this.notifications.set(items);
          this.notifService.refreshCounts();

          // Auto-select first item or maintain selection
          const currentSelected = this.selectedNotification();
          if (currentSelected) {
            const updated = items.find((i) => i.id === currentSelected.id);
            this.selectedNotification.set(updated || (items.length > 0 ? items[0] : null));
          } else if (items.length > 0) {
            this.selectedNotification.set(items[0]);
          } else {
            this.selectedNotification.set(null);
          }
        },
        error: () => {
          this.errorMessage.set('Failed to load notifications. Please try again.');
        }
      });
  }

  setFilter(filter: 'ALL' | 'UNREAD' | 'READ'): void {
    if (this.activeFilter() === filter) return;
    this.activeFilter.set(filter);
    this.loadNotifications();
  }

  onSortChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as 'LATEST' | 'OLDEST';
    this.activeSort.set(val);
    this.loadNotifications();
  }

  selectNotification(item: NotificationItem): void {
    this.selectedNotification.set(item);
    if (!this.isRead(item)) {
      this.markRead(item, false);
    }
  }

  isRead(item: NotificationItem): boolean {
    return item.isRead ?? item.read ?? false;
  }

  markRead(item: NotificationItem, notify: boolean = true): void {
    if (this.isRead(item)) return;
    this.pendingAction.set(true);

    this.notifService.markAsRead(item.id)
      .pipe(finalize(() => this.pendingAction.set(false)))
      .subscribe({
        next: () => {
          item.read = true;
          item.isRead = true;
          this.notifications.update((list) => [...list]);
          if (notify) {
            this.showSuccess('Notification marked as read.');
          }
        },
        error: () => {
          this.errorMessage.set('Could not mark notification as read.');
        }
      });
  }

  markUnread(item: NotificationItem): void {
    this.pendingAction.set(true);

    this.notifService.markAsUnread(item.id)
      .pipe(finalize(() => this.pendingAction.set(false)))
      .subscribe({
        next: () => {
          item.read = false;
          item.isRead = false;
          this.notifications.update((list) => [...list]);
          this.showSuccess('Notification marked as unread.');
        },
        error: () => {
          this.errorMessage.set('Could not mark notification as unread.');
        }
      });
  }

  markAllAsRead(): void {
    this.pendingAction.set(true);
    this.notifService.markAllAsRead()
      .pipe(finalize(() => this.pendingAction.set(false)))
      .subscribe({
        next: () => {
          this.notifications.update((list) =>
            list.map((i) => ({ ...i, read: true, isRead: true }))
          );
          if (this.selectedNotification()) {
            this.selectedNotification.update((curr) => curr ? { ...curr, read: true, isRead: true } : null);
          }
          this.showSuccess('All notifications marked as read.');
          if (this.activeFilter() === 'UNREAD') {
            this.loadNotifications();
          }
        },
        error: () => {
          this.errorMessage.set('Could not mark all notifications as read.');
        }
      });
  }

  openClearModal(): void {
    this.showClearConfirm.set(true);
  }

  closeClearModal(): void {
    this.showClearConfirm.set(false);
  }

  confirmClearAll(): void {
    this.pendingAction.set(true);
    this.notifService.clearAll()
      .pipe(finalize(() => {
        this.pendingAction.set(false);
        this.closeClearModal();
      }))
      .subscribe({
        next: () => {
          this.notifications.set([]);
          this.selectedNotification.set(null);
          this.showSuccess('Notification history cleared.');
        },
        error: () => {
          this.errorMessage.set('Could not clear notifications. Please try again.');
        }
      });
  }

  navigateToEntity(item: NotificationItem): void {
    const bookId = item.relatedEntityType === 'BOOK'
      ? (item.relatedEntityId || item.metadata?.bookId)
      : (item.metadata?.bookId || (item.actionRoute?.startsWith('/workspace/books/') ? item.actionRoute.replace('/workspace/books/', '') : null));

    if (bookId) {
      this.pendingAction.set(true);
      this.catalogueService.get(bookId)
        .pipe(finalize(() => this.pendingAction.set(false)))
        .subscribe({
          next: (b) => {
            if (b && b.active) {
              void this.router.navigate(['/workspace/books', bookId]);
            } else {
              this.errorMessage.set('This book is currently unavailable in the library catalogue.');
              this.toastService.show('This book is currently unavailable in the library catalogue.', 'warning');
            }
          },
          error: () => {
            this.errorMessage.set('This book is currently unavailable in the library catalogue.');
            this.toastService.show('This book is currently unavailable in the library catalogue.', 'warning');
          }
        });
      return;
    }

    if (item.actionRoute) {
      void this.router.navigateByUrl(item.actionRoute);
      return;
    }

    const type = (item.relatedEntityType || '').toUpperCase();
    if (type === 'LOAN') {
      void this.router.navigate(['/workspace/my/borrowings']);
    } else if (type === 'RESERVATION') {
      void this.router.navigate(['/workspace/my/reservations']);
    } else if (type === 'BORROW_REQUEST') {
      void this.router.navigate(['/workspace/my/requests']);
    } else if (type === 'FINE') {
      void this.router.navigate(['/workspace/my/fines']);
    } else if (type === 'MEMBER_REQUEST') {
      void this.router.navigate(['/workspace/librarian/member-requests']);
    }
  }

  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => {
      if (this.successMessage() === msg) {
        this.successMessage.set(null);
      }
    }, 3500);
  }

  getIconType(item: NotificationItem): string {
    return this.notifService.getCategoryIcon(item.category, item.title);
  }

  getRelativeTime(dateStr: string): string {
    return this.notifService.getRelativeTime(dateStr);
  }
}
