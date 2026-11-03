import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { NotificationClientService } from './notification.service';

describe('NotificationClientService', () => {
  let service: NotificationClientService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [NotificationClientService]
    });
    service = TestBed.inject(NotificationClientService);
    httpMock = TestBed.inject(HttpTestingController);

    // Initial polling refresh request
    const initReq = httpMock.expectOne('/api/v1/notifications/counts');
    initReq.flush({ all: 3, unread: 2, read: 1 });
  });

  it('updates signals when fetching counts', () => {
    expect(service.counts()).toEqual({ all: 3, unread: 2, read: 1 });
    expect(service.unreadCount()).toBe(2);
  });

  it('calculates relative time correctly', () => {
    const now = new Date();
    const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    expect(service.getRelativeTime(tenMinAgo)).toBe('10 minutes ago');

    const twoHoursAgo = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
    expect(service.getRelativeTime(twoHoursAgo)).toBe('2 hours ago');
  });

  it('marks a notification as read and updates unread count', () => {
    service.markAsRead('n-123').subscribe();

    const csrfReq = httpMock.expectOne('/api/v1/auth/csrf');
    csrfReq.flush({ headerName: 'X-XSRF-TOKEN', token: 'token-val' });

    const patchReq = httpMock.expectOne('/api/v1/notifications/n-123/read');
    expect(patchReq.request.method).toBe('PATCH');
    expect(patchReq.request.headers.get('X-XSRF-TOKEN')).toBe('token-val');
    patchReq.flush({});

    expect(service.unreadCount()).toBe(1);
    expect(service.counts().read).toBe(2);
  });

  it('marks all notifications as read', () => {
    service.markAllAsRead().subscribe();

    const csrfReq = httpMock.expectOne('/api/v1/auth/csrf');
    csrfReq.flush({ headerName: 'X-XSRF-TOKEN', token: 'token-val' });

    const patchReq = httpMock.expectOne('/api/v1/notifications/read-all');
    expect(patchReq.request.method).toBe('PATCH');
    patchReq.flush({});

    expect(service.unreadCount()).toBe(0);
    expect(service.counts().unread).toBe(0);
    expect(service.counts().read).toBe(3);
  });

  it('clears all notifications', () => {
    service.clearAll().subscribe();

    const csrfReq = httpMock.expectOne('/api/v1/auth/csrf');
    csrfReq.flush({ headerName: 'X-XSRF-TOKEN', token: 'token-val' });

    const delReq = httpMock.expectOne('/api/v1/notifications');
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush({});

    expect(service.unreadCount()).toBe(0);
    expect(service.counts()).toEqual({ all: 0, unread: 0, read: 0 });
    expect(service.latestDropdownItems()).toEqual([]);
  });
});
