import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemberRequestsComponent } from './member-requests.component';
import {
  MemberRequestCounts,
  MemberRequestsService,
  MemberRequestSummary
} from './member-requests.service';

describe('MemberRequestsComponent', () => {
  let fixture: ComponentFixture<MemberRequestsComponent>;
  let component: MemberRequestsComponent;
  let mockService: Partial<MemberRequestsService>;

  const sampleCounts: MemberRequestCounts = {
    pending: 3,
    approved: 12,
    rejected: 2
  };

  const samplePendingRequests: MemberRequestSummary[] = [
    {
      id: 'req-1',
      fullName: 'Rahul Kumar',
      email: 'rahul.23mic7210@vitapstudent.ac.in',
      institutionalId: '23MIC7210',
      role: 'STUDENT',
      requestedOn: '2026-10-30T10:24:00Z',
      approvalStatus: 'PENDING_APPROVAL',
      reviewedAt: null,
      reviewedByLibrarianName: null,
      rejectionReason: null,
      librarianRemarks: null
    },
    {
      id: 'req-2',
      fullName: 'Dr. Arjun Reddy',
      email: 'arjun.reddy@vitap.ac.in',
      institutionalId: '23MFC1001',
      role: 'FACULTY',
      requestedOn: '2026-10-30T12:17:00Z',
      approvalStatus: 'PENDING_APPROVAL',
      reviewedAt: null,
      reviewedByLibrarianName: null,
      rejectionReason: null,
      librarianRemarks: null
    }
  ];

  beforeEach(async () => {
    mockService = {
      getCounts: vi.fn(() => of(sampleCounts)),
      list: vi.fn(() => of({
        content: samplePendingRequests,
        page: 0,
        size: 20,
        totalElements: 2,
        totalPages: 1
      })),
      approve: vi.fn(() => of({} as any)),
      reject: vi.fn(() => of({} as any))
    };

    await TestBed.configureTestingModule({
      imports: [MemberRequestsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MemberRequestsService, useValue: mockService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MemberRequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('renders tabs with counts matching Mockup Screen B', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Pending (3)');
    expect(el.textContent).toContain('Approved (12)');
    expect(el.textContent).toContain('Rejected (2)');
  });

  it('displays applicant name, email, and role badge without separate institutional ID column', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Rahul Kumar');
    expect(el.textContent).toContain('rahul.23mic7210@vitapstudent.ac.in');
    expect(el.textContent).toContain('Student');

    expect(el.textContent).toContain('Dr. Arjun Reddy');
    expect(el.textContent).toContain('arjun.reddy@vitap.ac.in');
    expect(el.textContent).toContain('Faculty');
  });

  it('allows librarian to approve request directly from the table', () => {
    component.approveDirect(samplePendingRequests[0]);
    expect(mockService.approve).toHaveBeenCalledWith('req-1');
  });

  it('opens reject modal when clicking reject, allowing reason and remarks', () => {
    component.openRejectModal(samplePendingRequests[0]);
    fixture.detectChanges();

    expect(component.showRejectModal()).toBe(true);
    expect(component.targetRequest()).toEqual(samplePendingRequests[0]);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Reject Member Request');
    expect(el.textContent).toContain('Rejection Reason');

    component.rejectionReason = 'Not found in college records';
    component.rejectionRemarks = 'No enrollment found for year 2026.';
    component.confirmReject();

    expect(mockService.reject).toHaveBeenCalledWith(
      'req-1',
      'Not found in college records',
      'No enrollment found for year 2026.'
    );
  });

  it('switches tabs and calls list with corresponding status', () => {
    component.setTab('APPROVED');
    expect(mockService.list).toHaveBeenCalledWith('APPROVED', '', '');
  });
});
