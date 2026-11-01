import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemberDirectoryComponent } from './member-directory.component';
import { MemberManagementService, MemberSummary, MemberDetail } from './member-management.service';
import { MemberRequestsService } from './member-requests.service';
import { provideRouter } from '@angular/router';

describe('MemberDirectoryComponent', () => {
  let fixture: ComponentFixture<MemberDirectoryComponent>;
  let component: MemberDirectoryComponent;
  let mockMemberService: Partial<MemberManagementService>;

  const sampleMembers: MemberSummary[] = [
    {
      id: 'mem-1',
      email: 'student.one@vitapstudent.ac.in',
      role: 'STUDENT',
      enabled: true,
      institutionalId: '23MIC7248',
      createdAt: '2026-09-01T10:00:00Z',
      currentLoans: 2,
    },
    {
      id: 'mem-2',
      email: 'prof.smith@vitap.ac.in',
      role: 'FACULTY',
      enabled: false,
      institutionalId: 'FAC-101',
      createdAt: '2026-08-15T10:00:00Z',
      currentLoans: 0,
    },
  ];

  const sampleDetail: MemberDetail = {
    id: 'mem-1',
    email: 'student.one@vitapstudent.ac.in',
    role: 'STUDENT',
    enabled: true,
    institutionalId: '23MIC7248',
    createdAt: '2026-09-01T10:00:00Z',
    identityVerifiedAt: '2026-09-01T10:05:00Z',
    currentLoans: [
      {
        id: 'loan-1',
        borrowRequestId: 'req-1',
        bookId: 'b-1',
        bookTitle: 'Clean Code',
        coverImageUrl: null,
        copyIdentifier: 'CC-01',
        borrowerEmail: 'student.one@vitapstudent.ac.in',
        status: 'ACTIVE',
        issueDate: '2026-10-01',
        dueDate: '2026-10-15',
        actualReturnDate: null,
        renewalCount: 0,
        overdue: false,
        renewalEligible: true,
        returnNote: null,
        history: [],
      },
    ],
    borrowingHistory: [],
    borrowRequests: [],
  };

  beforeEach(async () => {
    mockMemberService = {
      list: () => of({
        content: sampleMembers,
        page: 0,
        size: 15,
        totalElements: 2,
        totalPages: 1,
      }),
      get: () => of(sampleDetail),
      enable: () => of(void 0),
      disable: () => of(void 0),
    };

    await TestBed.configureTestingModule({
      imports: [MemberDirectoryComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MemberManagementService, useValue: mockMemberService },
        { provide: MemberRequestsService, useValue: { getCounts: () => of({ pending: 3, approved: 12, rejected: 2 }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MemberDirectoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('renders student and faculty members in the directory', () => {
    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent as string;

    expect(text).toContain('23MIC7248');
    expect(text).toContain('student.one@vitapstudent.ac.in');
    expect(text).toContain('Student');
    expect(text).toContain('Active');

    expect(text).toContain('FAC-101');
    expect(text).toContain('prof.smith@vitap.ac.in');
    expect(text).toContain('Faculty');
    expect(text).toContain('Disabled');
  });

  it('allows opening member details modal and inspecting active loans', () => {
    component.viewDetails(sampleMembers[0]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent as string;

    expect(text).toContain('MEMBER PROFILE');
    expect(text).toContain('Active Loans (1)');
    expect(text).toContain('Clean Code');
    expect(text).toContain('CC-01');
  });

  it('shows confirmation prompt before changing account status', () => {
    component.promptStatusChange(sampleMembers[0], false);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent as string;

    expect(text).toContain('Confirm Account Status Change');
    expect(text).toContain('DISABLE');
    expect(text).toContain('student.one@vitapstudent.ac.in');
  });

  it('displays the Member Requests button with pending count', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Member Requests (3)');
  });
});
