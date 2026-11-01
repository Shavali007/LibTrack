import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MyReservationsComponent } from './my-reservations.component';
import { ReservationCounts, ReservationItem, ReservationService } from './reservation.service';

describe('MyReservationsComponent', () => {
  let fixture: ComponentFixture<MyReservationsComponent>;
  let component: MyReservationsComponent;

  const sampleReservations: ReservationItem[] = [
    {
      id: 'res-1',
      bookId: 'b-1',
      bookTitle: 'Operating System Concepts',
      bookAuthors: ['Silberschatz', 'Galvin'],
      bookCategory: 'Computer Science',
      bookCoverImageUrl: null,
      reservedOn: '2026-01-18T10:00:00Z',
      queuePosition: 1,
      status: 'WAITING_FOR_AVAILABILITY',
      statusDisplay: 'Waiting for Availability',
      availabilityHoldText: '—',
      canCancel: true,
      canBorrowNow: false
    },
    {
      id: 'res-2',
      bookId: 'b-2',
      bookTitle: 'Database System Concepts',
      bookAuthors: ['Abraham Silberschatz'],
      bookCategory: 'Database',
      bookCoverImageUrl: null,
      reservedOn: '2026-01-20T11:00:00Z',
      queuePosition: 3,
      status: 'IN_QUEUE',
      statusDisplay: 'In Queue',
      availabilityHoldText: 'Est. Available in ~5 days',
      canCancel: true,
      canBorrowNow: false
    },
    {
      id: 'res-3',
      bookId: 'b-3',
      bookTitle: 'Computer Networks',
      bookAuthors: ['Andrew S. Tanenbaum'],
      bookCategory: 'Networking',
      bookCoverImageUrl: null,
      reservedOn: '2026-01-22T09:30:00Z',
      queuePosition: null,
      status: 'READY_FOR_PICKUP',
      statusDisplay: 'Ready for Pickup',
      availabilityHoldText: 'Hold expires in 1 day 6 hours',
      canCancel: false,
      canBorrowNow: true
    },
    {
      id: 'res-4',
      bookId: 'b-4',
      bookTitle: 'Data Structures and Algorithms',
      bookAuthors: ['Mark Allen Weiss'],
      bookCategory: 'Algorithms',
      bookCoverImageUrl: null,
      reservedOn: '2026-01-25T14:15:00Z',
      queuePosition: 2,
      status: 'WAITING_FOR_AVAILABILITY',
      statusDisplay: 'Waiting for Availability',
      availabilityHoldText: 'Est. Available in ~3 days',
      canCancel: true,
      canBorrowNow: false
    }
  ];

  const sampleCounts: ReservationCounts = {
    all: 4,
    waiting: 2,
    inQueue: 1,
    readyForPickup: 1,
    completed: 0,
    cancelled: 0
  };

  const mockReservationService: Partial<ReservationService> = {
    getMyReservations: vi.fn().mockImplementation((tab?: string) => {
      if (tab === 'waiting') {
        return of(sampleReservations.filter(r => r.status === 'WAITING_FOR_AVAILABILITY'));
      }
      if (tab === 'inQueue') {
        return of(sampleReservations.filter(r => r.status === 'IN_QUEUE'));
      }
      if (tab === 'readyForPickup') {
        return of(sampleReservations.filter(r => r.status === 'READY_FOR_PICKUP'));
      }
      return of(sampleReservations);
    }),
    getCounts: vi.fn().mockReturnValue(of(sampleCounts)),
    cancelReservation: vi.fn().mockReturnValue(of({ message: 'Reservation cancelled successfully.' }))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyReservationsComponent],
      providers: [
        provideRouter([]),
        { provide: ReservationService, useValue: mockReservationService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MyReservationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders page header with title and 1 Calendar Month hold banner', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.page-title')?.textContent).toContain('My Reservations');
    expect(el.querySelector('.page-subtitle')?.textContent).toContain('Manage your reserved books and track their status.');
    expect(el.querySelector('.hold-period-banner')?.textContent).toContain('Reservation Hold Period: 1 Calendar Month');
  });

  it('renders status tab pills matching visual mockup counts', () => {
    const el = fixture.nativeElement as HTMLElement;
    const tabsText = el.querySelector('.status-tabs-nav')?.textContent || '';
    expect(tabsText).toContain('All (4)');
    expect(tabsText).toContain('Waiting (2)');
    expect(tabsText).toContain('In Queue (1)');
    expect(tabsText).toContain('Ready for Pickup (1)');
    expect(tabsText).toContain('Completed (0)');
    expect(tabsText).toContain('Cancelled (0)');
  });

  it('renders table rows with books, queue badges, status badges, and actions', () => {
    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent || '';

    // Verify books
    expect(text).toContain('Operating System Concepts');
    expect(text).toContain('Database System Concepts');
    expect(text).toContain('Computer Networks');
    expect(text).toContain('Data Structures and Algorithms');

    // Verify queue badges
    expect(text).toContain('#1');
    expect(text).toContain('#3');
    expect(text).toContain('#2');

    // Verify status badges
    expect(text).toContain('Waiting for Availability');
    expect(text).toContain('In Queue');
    expect(text).toContain('Ready for Pickup');

    // Verify availability & hold texts
    expect(text).toContain('Est. Available in ~5 days');
    expect(text).toContain('Hold expires in 1 day 6 hours');
    expect(text).toContain('Est. Available in ~3 days');

    // Verify action buttons
    const cancelBtns = el.querySelectorAll('.btn-cancel-reservation');
    expect(cancelBtns.length).toBe(3);

    const borrowNowBtn = el.querySelector('.btn-borrow-now');
    expect(borrowNowBtn).toBeTruthy();
    expect(borrowNowBtn?.textContent).toContain('Borrow Now');
  });

  it('filters reservations when switching tabs', () => {
    component.setTab('readyForPickup');
    fixture.detectChanges();

    expect(mockReservationService.getMyReservations).toHaveBeenCalledWith('readyForPickup');
    expect(component.activeTab()).toBe('readyForPickup');
    expect(component.reservations().length).toBe(1);
    expect(component.reservations()[0].bookTitle).toBe('Computer Networks');
  });

  it('opens confirmation modal when clicking Cancel button and can dismiss it', () => {
    const el = fixture.nativeElement as HTMLElement;
    const firstCancelBtn = el.querySelector('.btn-cancel-reservation') as HTMLButtonElement;
    firstCancelBtn.click();
    fixture.detectChanges();

    expect(component.cancellingItem()).not.toBeNull();
    const modal = el.querySelector('.modal-card');
    expect(modal).toBeTruthy();
    expect(modal?.textContent).toContain('Cancel Reservation?');
    expect(modal?.textContent).toContain('Data Structures and Algorithms');

    // Dismiss
    component.dismissCancelDialog();
    fixture.detectChanges();
    expect(component.cancellingItem()).toBeNull();
    expect(el.querySelector('.modal-card')).toBeNull();
  });
});
