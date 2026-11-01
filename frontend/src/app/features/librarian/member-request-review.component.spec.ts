import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemberRequestReviewComponent } from './member-request-review.component';
import {
  MemberRequestDetail,
  MemberRequestsService
} from './member-requests.service';

describe('MemberRequestReviewComponent', () => {
  let fixture: ComponentFixture<MemberRequestReviewComponent>;
  let component: MemberRequestReviewComponent;
  let mockService: Partial<MemberRequestsService>;

  const sampleDetail: MemberRequestDetail = {
    id: 'req-1',
    fullName: 'Rahul Kumar',
    institutionalId: '23MIC7210',
    email: 'rahul.23mic7210@vitapstudent.ac.in',
    role: 'STUDENT',
    approvalStatus: 'PENDING_APPROVAL',
    requestedOn: '2026-10-30T10:24:00Z',
    reviewedAt: null,
    reviewedByAccountId: null,
    reviewedByLibrarianName: null,
    rejectionReason: null,
    librarianRemarks: null,
    auditHistory: []
  };

  beforeEach(async () => {
    mockService = {
      get: vi.fn(() => of(sampleDetail)),
      approve: vi.fn(() => of({ ...sampleDetail, approvalStatus: 'APPROVED' as const })),
      reject: vi.fn(() => of({ ...sampleDetail, approvalStatus: 'REJECTED' as const }))
    };

    await TestBed.configureTestingModule({
      imports: [MemberRequestReviewComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? 'req-1' : null)
              }
            }
          }
        },
        { provide: MemberRequestsService, useValue: mockService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MemberRequestReviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('renders applicant review banner and details matching Screen C', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Review Member Request');
    expect(el.textContent).toContain('Rahul Kumar');
    expect(el.textContent).toContain('23MIC7210');
    expect(el.textContent).toContain('rahul.23mic7210@vitapstudent.ac.in');
    expect(el.textContent).toContain('Student');
    expect(el.textContent).toContain('Pending Approval');
    expect(el.textContent).toContain('Applicant Details');
  });

  it('allows librarian to approve request with remarks', () => {
    component.librarianRemarks = 'Verified with ID card';
    component.approveRequest();

    expect(mockService.approve).toHaveBeenCalledWith('req-1', 'Verified with ID card');
    expect(component.notice()).toContain('Account approved successfully');
  });

  it('opens rejection modal and rejects request with reason and remarks', () => {
    component.openRejectModal();
    fixture.detectChanges();

    expect(component.showRejectModal()).toBe(true);

    component.rejectionReason = 'Information mismatch (ID / email)';
    component.rejectionRemarks = 'ID not matching.';
    component.confirmReject();

    expect(mockService.reject).toHaveBeenCalledWith(
      'req-1',
      'Information mismatch (ID / email)',
      'ID not matching.'
    );
  });

  it('omits institutional ID for faculty applicant in review details', () => {
    component.request.set({
      ...sampleDetail,
      role: 'FACULTY',
      institutionalId: null,
      fullName: 'Dr. Faculty Member',
      email: 'faculty@vitap.ac.in'
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Dr. Faculty Member');
    expect(el.textContent).toContain('faculty@vitap.ac.in');
    expect(el.textContent).toContain('Faculty');
    expect(el.textContent).not.toContain('Student Institutional ID');
    expect(el.textContent).not.toContain('Not provided');
  });
});
