import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { LibraryPoliciesComponent } from './library-policies.component';
import { BorrowingPolicyComponent } from './policies/borrowing-policy.component';
import { RenewalPolicyComponent } from './policies/renewal-policy.component';
import { FinesPolicyComponent } from './policies/fines-policy.component';
import { MembershipPolicyComponent } from './policies/membership-policy.component';
import { UsagePolicyComponent } from './policies/usage-policy.component';
import { LibrarianOperationsService, LibraryPoliciesRecord } from './librarian-operations.service';
import { AppShellComponent } from '../../shared/layout/app-shell.component';
import { AuthService, UserProfile } from '../auth/auth.service';
import { MemberRequestsService } from './member-requests.service';

describe('Library Policies Suite', () => {
  const mockPolicies: LibraryPoliciesRecord = {
    borrowing: {
      studentMaxBooks: 5,
      facultyMaxBooks: 5,
      studentLoanDays: 21,
      facultyLoanDays: 21,
      studentMaxRenewals: 1,
      facultyMaxRenewals: 1,
      studentRenewalExtensionDays: 21,
      facultyRenewalExtensionDays: 21,
      studentMaxReservations: 5,
      facultyMaxReservations: 5,
      reservationHoldPeriod: '1 calendar month'
    },
    renewal: {
      maxRenewals: '1 per semester',
      extensionPeriod: '21 days',
      eligibility: 'Active loans only',
      approval: 'Subject to librarian approval',
      overdueLoans: 'Not eligible for renewal'
    },
    fines: {
      overdueFinePerDay: '₹10',
      maxFinePerBook: '₹500',
      gracePeriod: '0 days',
      payment: 'Full payment only',
      lostDamagedBooks: 'Manual payment recorded by a Librarian at the circulation desk',
      status: 'ACTIVE',
      monetaryFinesEnabled: true,
      policyDescription: 'Overdue fines use the configured daily rate and maximum.',
      configured: true
    },
    membership: {
      eligibleMembers: 'Students and Faculty of VIT-AP',
      registration: 'Institutional email required (Students: @vitapstudent.ac.in, Faculty: @vitap.ac.in)',
      accountApproval: 'Mandatory librarian approval',
      pendingAccounts: 'Cannot sign in until approved',
      rejectedAccounts: 'Cannot sign in',
      disabledAccounts: 'Cannot access library services',
      duplicateAccounts: 'Not permitted (email must be unique)'
    },
    usageGuidelines: [
      'Use your own library account.',
      'Be responsible for the books you borrow.',
      'Handle books with care and keep them in good condition.',
      'Report lost or damaged books to the librarian immediately.',
      'Return books within the permitted period.',
      'Follow all borrowing, renewal and circulation rules of the library.'
    ]
  };

  let mockOpsService: Partial<LibrarianOperationsService>;
  let mockMemberRequestsService: Partial<MemberRequestsService>;

  beforeEach(() => {
    mockOpsService = {
      getPolicies: vi.fn(() => of({ ...mockPolicies })),
      getUnreadCount: vi.fn(() => of({ unreadCount: 0 }))
    };
    mockMemberRequestsService = {
      getCounts: vi.fn(() => of({ pending: 0, approved: 0, rejected: 0, total: 0 }))
    };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('renders overview page with exactly 5 policy cards matching Version B Card Grid', async () => {
    await TestBed.configureTestingModule({
      imports: [LibraryPoliciesComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    const fixture = TestBed.createComponent(LibraryPoliciesComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const cards = el.querySelectorAll('.policy-card');
    expect(cards.length).toBe(5);

    const text = el.textContent ?? '';
    expect(text).toContain('Library Policies');
    expect(text).toContain('Fixed Policies');
    expect(text).toContain('Borrowing');
    expect(text).toContain('Renewal');
    expect(text).toContain('Fines');
    expect(text).toContain('Membership');
    expect(text).toContain('Usage');

    // Verify all 5 cards have correct role-agnostic routerLinks
    const cardLinks = Array.from(cards).map(c => c.getAttribute('routerlink') || c.getAttribute('href'));
    expect(cardLinks).toEqual([
      '/workspace/library-policies/borrowing',
      '/workspace/library-policies/renewal',
      '/workspace/library-policies/fines',
      '/workspace/library-policies/membership',
      '/workspace/library-policies/usage'
    ]);

    // Verify no edit/delete buttons exist
    expect(el.querySelectorAll('button').length).toBe(0);
  });

  it('renders Borrowing Policy with 3-column table and student/faculty rules', async () => {
    await TestBed.configureTestingModule({
      imports: [BorrowingPolicyComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LibrarianOperationsService, useValue: mockOpsService }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(BorrowingPolicyComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Borrowing Policy');
    expect(el.textContent).toContain('Fixed Policy');
    expect(el.textContent).toContain('Maximum books at a time');
    expect(el.textContent).toContain('5 books');
    expect(el.textContent).toContain('21 days');
    expect(el.textContent).toContain('21 days');
    expect(el.textContent).toContain('Maximum active reservations');
    expect(el.textContent).toContain('1 calendar month');

    const breadcrumb = el.querySelector('.breadcrumb-link');
    expect(breadcrumb?.getAttribute('routerlink')).toBe('/workspace/library-policies');
    expect(el.querySelectorAll('button').length).toBe(0);
  });

  it('renders Renewal Policy with 2-column table and overdue loan restriction', async () => {
    await TestBed.configureTestingModule({
      imports: [RenewalPolicyComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LibrarianOperationsService, useValue: mockOpsService }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(RenewalPolicyComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Renewal Policy');
    expect(el.textContent).toContain('1 per semester');
    expect(el.textContent).toContain('21 days');
    expect(el.textContent).toContain('Active loans only');
    expect(el.textContent).toContain('Not eligible for renewal');

    const breadcrumb = el.querySelector('.breadcrumb-link');
    expect(breadcrumb?.getAttribute('routerlink')).toBe('/workspace/library-policies');
    expect(el.querySelectorAll('button').length).toBe(0);
  });

  it('renders Fine Policy with 2-column table and monetary limits', async () => {
    await TestBed.configureTestingModule({
      imports: [FinesPolicyComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LibrarianOperationsService, useValue: mockOpsService }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(FinesPolicyComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Fine Policy');
    expect(el.textContent).toContain('₹10');
    expect(el.textContent).toContain('₹500');
    expect(el.textContent).toContain('0 days');
    expect(el.textContent).toContain('Current policy · ACTIVE');
    expect(el.textContent).toContain('existing loans retain the policy snapshot');
    expect(el.textContent).toContain('Full payment only');

    const breadcrumb = el.querySelector('.breadcrumb-link');
    expect(breadcrumb?.getAttribute('routerlink')).toBe('/workspace/library-policies');
    expect(el.querySelectorAll('button').length).toBe(0);
  });

  it('renders Membership Policy with approval rules', async () => {
    await TestBed.configureTestingModule({
      imports: [MembershipPolicyComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LibrarianOperationsService, useValue: mockOpsService }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(MembershipPolicyComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Membership Policy');
    expect(el.textContent).toContain('Students and Faculty of VIT-AP');
    expect(el.textContent).toContain('Mandatory librarian approval');
    expect(el.textContent).toContain('Cannot sign in until approved');
    expect(el.textContent).toContain('Not permitted (email must be unique)');

    const breadcrumb = el.querySelector('.breadcrumb-link');
    expect(breadcrumb?.getAttribute('routerlink')).toBe('/workspace/library-policies');
    expect(el.querySelectorAll('button').length).toBe(0);
  });

  it('renders Usage Policy with 6 check-marked guidelines', async () => {
    await TestBed.configureTestingModule({
      imports: [UsagePolicyComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LibrarianOperationsService, useValue: mockOpsService }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(UsagePolicyComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Library Usage Policy');
    const items = el.querySelectorAll('.usage-item');
    expect(items.length).toBe(6);
    expect(el.textContent).toContain('Use your own library account.');
    expect(el.textContent).toContain('Report lost or damaged books to the librarian immediately.');

    const breadcrumb = el.querySelector('.breadcrumb-link');
    expect(breadcrumb?.getAttribute('routerlink')).toBe('/workspace/library-policies');
    expect(el.querySelectorAll('button').length).toBe(0);
  });

  it('renders Library Policies in sidebar for Librarian, Student, and Faculty roles identically', async () => {
    const roles: Array<'LIBRARIAN' | 'STUDENT' | 'FACULTY'> = ['LIBRARIAN', 'STUDENT', 'FACULTY'];

    for (const role of roles) {
      TestBed.resetTestingModule();

      const profileSignal = signal<UserProfile | null>({
        id: 'user-1',
        email: `${role.toLowerCase()}@vitap.ac.in`,
        role: role,
        displayName: `${role} User`
      });

      const mockAuthService = {
        profile: profileSignal,
        loadCurrentUser: vi.fn(() => of(profileSignal())),
        logout: vi.fn(() => of(void 0))
      };

      await TestBed.configureTestingModule({
        imports: [AppShellComponent],
        providers: [
          provideRouter([]),
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: AuthService, useValue: mockAuthService },
          { provide: LibrarianOperationsService, useValue: mockOpsService },
          { provide: MemberRequestsService, useValue: mockMemberRequestsService }
        ]
      }).compileComponents();

      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;

      const navLinks = Array.from(el.querySelectorAll('.primary-nav .nav-link'));
      const policyLink = navLinks.find(link => link.textContent?.includes('Library Policies'));

      expect(policyLink).toBeDefined();
      expect(policyLink?.getAttribute('routerlink')).toBe('/workspace/library-policies');
      expect(policyLink?.querySelector('svg')).toBeTruthy();
    }
  });
});
