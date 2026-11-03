import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsPageComponent } from './notifications-page.component';
import { NotificationClientService, NotificationItem } from './notification.service';
import { AuthService } from '../auth/auth.service';

describe('NotificationsPageComponent', () => {
  let fixture: ComponentFixture<NotificationsPageComponent>;
  let component: NotificationsPageComponent;

  const sampleNotifications: NotificationItem[] = [
    {
      id: 'notif-1',
      recipientAccountId: 'acc-1',
      targetRole: null,
      title: 'Due Date Reminder',
      message: 'Your borrowed book "Operating System Concepts" is due in 2 days.',
      fullMessage: 'Your borrowed book "Operating System Concepts" is due in 2 days.',
      category: 'DUE_DATE_REMINDER',
      relatedEntityType: 'LOAN',
      relatedEntityId: 'loan-1',
      actionRoute: '/workspace/my/books',
      read: false,
      isRead: false,
      readAt: null,
      createdAt: '2026-11-03T08:00:00Z',
      metadata: {
        bookId: 'b-1',
        bookTitle: 'Operating System Concepts',
        bookAuthor: 'Silberschatz, Galvin',
        bookSubject: 'Computer Science',
        loanDisplayCode: 'LN-10452',
        dueDate: 'Nov 03, 2026',
        daysRemaining: 2,
        canRenew: true,
        infoAlert: 'Please return or renew the book before the due date to avoid it being marked as overdue.'
      }
    },
    {
      id: 'notif-2',
      recipientAccountId: 'acc-1',
      targetRole: null,
      title: 'Reservation Update',
      message: '“Database System Concepts” is now ready for pickup.',
      fullMessage: '“Database System Concepts” is now ready for pickup.',
      category: 'RESERVATION',
      relatedEntityType: 'RESERVATION',
      relatedEntityId: 'res-1',
      actionRoute: '/workspace/my/reservations',
      read: true,
      isRead: true,
      readAt: '2026-11-03T07:30:00Z',
      createdAt: '2026-11-03T07:00:00Z',
      metadata: {
        bookId: 'b-2',
        bookTitle: 'Database System Concepts',
        bookAuthor: 'Abraham Silberschatz',
        pickupDeadline: 'Nov 05, 2026'
      }
    }
  ];

  const fakeService = {
    counts: vi.fn(() => ({ all: 2, unread: 1, read: 1 })),
    unreadCount: vi.fn(() => 1),
    getNotifications: vi.fn(() => of(sampleNotifications)),
    refreshCounts: vi.fn(),
    markAsRead: vi.fn(() => of(void 0)),
    markAsUnread: vi.fn(() => of(void 0)),
    markAllAsRead: vi.fn(() => of(void 0)),
    clearAll: vi.fn(() => of(void 0)),
    getRelativeTime: vi.fn((dt: string) => dt ? '10 minutes ago' : ''),
    getCategoryIcon: vi.fn(() => 'book')
  };

  const fakeAuth = {
    profile: vi.fn(() => ({
      id: 'acc-1',
      fullName: 'Student User',
      email: 'student@vitapstudent.ac.in',
      role: 'STUDENT'
    }))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationsPageComponent],
      providers: [
        provideRouter([]),
        { provide: NotificationClientService, useValue: fakeService },
        { provide: AuthService, useValue: fakeAuth }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders page header and tabs matching mockup', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.page-title')?.textContent).toContain('Notifications');
    expect(el.querySelector('.page-subtitle')?.textContent).toContain('Stay updated with your library activities');

    const tabs = el.querySelectorAll('.filter-tabs .tab-btn');
    expect(tabs.length).toBe(3);
    expect(tabs[0].textContent).toContain('All (2)');
    expect(tabs[1].textContent).toContain('Unread (1)');
    expect(tabs[2].textContent).toContain('Read (1)');
  });

  it('renders notification list cards and auto-selects first item into detail panel', () => {
    const el = fixture.nativeElement as HTMLElement;
    const cards = el.querySelectorAll('.notification-card');
    expect(cards.length).toBe(2);

    expect(component.selectedNotification()?.id).toBe('notif-1');
    const detailTitle = el.querySelector('.detail-title')?.textContent;
    expect(detailTitle).toContain('Due Date Reminder');
    expect(el.querySelector('.detail-status-badge')?.textContent).toContain('Unread');
    expect(el.querySelector('.book-info .book-title')?.textContent).toContain('Operating System Concepts');
  });

  it('allows marking notification as read and unread', () => {
    component.markRead(sampleNotifications[0]);
    expect(fakeService.markAsRead).toHaveBeenCalledWith('notif-1');

    component.markUnread(sampleNotifications[1]);
    expect(fakeService.markAsUnread).toHaveBeenCalledWith('notif-2');
  });

  it('opens and closes clear all confirmation modal', () => {
    expect(component.showClearConfirm()).toBe(false);
    component.openClearModal();
    fixture.detectChanges();
    expect(component.showClearConfirm()).toBe(true);

    component.closeClearModal();
    fixture.detectChanges();
    expect(component.showClearConfirm()).toBe(false);
  });
});
