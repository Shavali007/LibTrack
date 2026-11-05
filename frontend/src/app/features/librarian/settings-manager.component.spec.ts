import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Observable, of, throwError } from 'rxjs';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { SettingsManagerComponent } from './settings-manager.component';
import { FinesPolicyResponse, FinePolicyUpdateRequest, HolidayRecord, LibrarianOperationsService, LibraryInfoRecord } from './librarian-operations.service';

describe('SettingsManagerComponent', () => {
  let fixture: ComponentFixture<SettingsManagerComponent>;
  let component: SettingsManagerComponent;

  const mockLibraryInfo: LibraryInfoRecord = {
    libraryName: 'VIT-AP Central Library',
    contactEmail: 'library@vitap.ac.in',
    contactPhone: '+91 86323 45678',
    address: 'VIT-AP University, Inavolu, Guntur - 522237',
    openTime: '09:00 AM',
    closeTime: '06:00 PM'
  };

  const mockHolidays: HolidayRecord[] = [
    {
      id: 'h-1',
      fromDate: '2026-01-14',
      toDate: '2026-01-14',
      durationDays: 1,
      holidayDate: '2026-01-14',
      name: 'Pongal',
      createdByEmail: 'librarian@vitap.ac.in',
      createdAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'h-2',
      fromDate: '2026-11-07',
      toDate: '2026-11-09',
      durationDays: 3,
      name: 'Diwali Break',
      createdByEmail: 'librarian@vitap.ac.in',
      createdAt: '2026-01-01T00:00:00Z'
    }
  ];

  let getLibraryInfoSpy: ReturnType<typeof vi.fn>;
  let updateLibraryInfoSpy: ReturnType<typeof vi.fn>;
  let getHolidaysSpy: ReturnType<typeof vi.fn>;
  let addHolidaySpy: ReturnType<typeof vi.fn>;
  let updateHolidaySpy: ReturnType<typeof vi.fn>;
  let deleteHolidaySpy: ReturnType<typeof vi.fn>;
  let getFinesPolicySpy: ReturnType<typeof vi.fn>;
  let updateFinePolicySpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    getLibraryInfoSpy = vi.fn(() => of({ ...mockLibraryInfo }));
    updateLibraryInfoSpy = vi.fn((info: LibraryInfoRecord) => of({ ...info }));
    getHolidaysSpy = vi.fn(() => of([...mockHolidays]));
    addHolidaySpy = vi.fn((fromDate: string, toDate: string, name: string) => of({
      id: 'h-new',
      fromDate,
      toDate,
      durationDays: 1,
      name,
      createdByEmail: 'librarian@vitap.ac.in',
      createdAt: new Date().toISOString()
    }));
    updateHolidaySpy = vi.fn((id: string, fromDate: string, toDate: string, name: string) => of({
      id,
      fromDate,
      toDate,
      durationDays: 1,
      name,
      createdByEmail: 'librarian@vitap.ac.in',
      createdAt: new Date().toISOString()
    }));
    deleteHolidaySpy = vi.fn((id: string) => of(void 0));
    const finePolicy: FinesPolicyResponse = {
      status: 'ACTIVE',
      policyTitle: 'Current Fine Policy',
      policyDescription: 'Overdue fines are configured.',
      monetaryFinesEnabled: true,
      dailyFineRate: 12.5,
      maximumFinePerBook: 650,
      gracePeriodDays: 2,
      loanPeriodDays: 21,
      configured: true,
      overdueLoansCount: 0,
      overdueLoans: []
    };
    getFinesPolicySpy = vi.fn(() => of({ ...finePolicy }));
    updateFinePolicySpy = vi.fn((_policy: FinePolicyUpdateRequest) => of(void 0));

    const mockOpsService: Partial<LibrarianOperationsService> = {
      getLibraryInfo: getLibraryInfoSpy as unknown as () => Observable<LibraryInfoRecord>,
      updateLibraryInfo: updateLibraryInfoSpy as unknown as (info: LibraryInfoRecord) => Observable<LibraryInfoRecord>,
      getHolidays: getHolidaysSpy as unknown as () => Observable<HolidayRecord[]>,
      addHoliday: addHolidaySpy as unknown as (fromDate: string, toDate: string, name: string) => Observable<HolidayRecord>,
      updateHoliday: updateHolidaySpy as unknown as (id: string, fromDate: string, toDate: string, name: string) => Observable<HolidayRecord>,
      deleteHoliday: deleteHolidaySpy as unknown as (id: string) => Observable<void>,
      getFinesPolicy: getFinesPolicySpy as unknown as () => Observable<FinesPolicyResponse>,
      updateFinePolicy: updateFinePolicySpy as unknown as (policy: FinePolicyUpdateRequest) => Observable<void>
    };

    await TestBed.configureTestingModule({
      imports: [SettingsManagerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LibrarianOperationsService, useValue: mockOpsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('renders the existing settings sections plus Fine Policy without Notification Preferences', () => {
    const el = fixture.nativeElement as HTMLElement;
    const tabButtons = el.querySelectorAll('.settings-tab-btn');
    expect(tabButtons.length).toBe(3);

    const tabsText = el.querySelector('.settings-tabs')?.textContent ?? '';
    expect(tabsText).toContain('Library Information');
    expect(tabsText).toContain('Holiday Calendar');
    expect(tabsText).toContain('Fine Policy');
    expect(tabsText).not.toContain('Notification');

    expect(component.activeTab()).toBe('info');
    expect(getLibraryInfoSpy).toHaveBeenCalled();
  });

  it('loads API policy values and opens a unified editor with the shared loan duration', () => {
    component.setActiveTab('fines');
    fixture.detectChanges();
    expect(getFinesPolicySpy).toHaveBeenCalled();
    expect(component.fineDailyRate).toBe('12.50');
    expect(component.fineMaximum).toBe('650.00');
    expect(component.fineGraceDays).toBe('2');
    expect(component.fineLoanPeriod).toBe('21');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Same for Students and Faculty');
    component.openFinePolicyModal();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('validates and saves all policy fields together, preserving the modal when the request fails', () => {
    component.setActiveTab('fines');
    fixture.detectChanges();
    component.openFinePolicyModal();
    component.fineDailyRate = '-1';
    component.saveFinePolicy();
    expect(component.finePolicySaveError()).toContain('Daily fine rate');
    expect(component.showFinePolicyModal()).toBe(true);

    component.fineDailyRate = '12.50';
    component.fineLoanPeriod = '30';
    component.saveFinePolicy();
    expect(updateFinePolicySpy).toHaveBeenCalledWith({
      dailyFineRate: 12.5,
      maximumFinePerBook: 650,
      gracePeriodDays: 2,
      loanPeriodDays: 30
    });
    expect(component.notice()).toContain('Fine policy saved');
    expect(component.showFinePolicyModal()).toBe(false);
  });

  it('keeps entered values in the editor after a policy save error', () => {
    component.setActiveTab('fines');
    fixture.detectChanges();
    updateFinePolicySpy.mockReturnValue(throwError(() => ({ error: { message: 'Policy update unavailable.' } })));
    component.openFinePolicyModal();
    component.fineDailyRate = '17.25';
    component.fineMaximum = '425';
    component.fineGraceDays = '1';
    component.fineLoanPeriod = '28';
    component.saveFinePolicy();
    expect(component.finePolicySaveError()).toBe('Policy update unavailable.');
    expect(component.showFinePolicyModal()).toBe(true);
    expect(component.fineLoanPeriod).toBe('28');
  });

  it('shows an honest unconfigured state and starts a blank create form', () => {
    getFinesPolicySpy.mockReturnValue(of({
      status: 'UNCONFIGURED', policyTitle: 'Current Fine Policy', policyDescription: '',
      monetaryFinesEnabled: false, dailyFineRate: 0, maximumFinePerBook: 0,
      gracePeriodDays: 0, loanPeriodDays: 0, configured: false,
      overdueLoansCount: 0, overdueLoans: []
    }));
    component.setActiveTab('fines');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No Fine Policy Configured');
    component.openFinePolicyModal();
    expect(component.fineDailyRate).toBe('');
    expect(component.fineLoanPeriod).toBe('');
  });

  it('shows an API error instead of an empty state and supports retry', () => {
    getFinesPolicySpy.mockReturnValue(throwError(() => new Error('offline')));
    component.setActiveTab('fines');
    fixture.detectChanges();
    expect(component.finePolicyError()).toContain('Failed to load');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Retry');
    getFinesPolicySpy.mockReturnValue(of({
      status: 'ACTIVE', policyTitle: 'Current Fine Policy', policyDescription: '',
      monetaryFinesEnabled: true, dailyFineRate: 1, maximumFinePerBook: 2,
      gracePeriodDays: 0, loanPeriodDays: 21, configured: true,
      overdueLoansCount: 0, overdueLoans: []
    }));
    component.loadFinePolicy();
    expect(component.finePolicyError()).toBe('');
    expect(component.finePolicy()?.configured).toBe(true);
  });

  it('validates required fields and email format before saving Library Information', () => {
    component.libraryInfo.libraryName = '  ';
    component.saveLibraryInfo();
    expect(component.error()).toContain('Library name is required');
    expect(updateLibraryInfoSpy).not.toHaveBeenCalled();

    component.libraryInfo.libraryName = 'Valid Name';
    component.libraryInfo.contactEmail = 'invalid-email-address';
    component.saveLibraryInfo();
    expect(component.error()).toContain('valid contact email');
    expect(updateLibraryInfoSpy).not.toHaveBeenCalled();

    component.libraryInfo.contactEmail = 'librarian@vitap.ac.in';
    component.saveLibraryInfo();
    expect(updateLibraryInfoSpy).toHaveBeenCalledWith(component.libraryInfo);
    expect(component.notice()).toContain('Library information saved successfully');
  });

  it('switches to Holiday Calendar tab and renders 5-column table with inclusive durations', () => {
    component.setActiveTab('holidays');
    fixture.detectChanges();

    expect(component.activeTab()).toBe('holidays');
    expect(getHolidaysSpy).toHaveBeenCalled();
    expect(component.holidays().length).toBe(2);

    const el = fixture.nativeElement as HTMLElement;
    const tableHeader = el.querySelector('.holidays-table thead')?.textContent ?? '';
    expect(tableHeader).toContain('Holiday / Occasion');
    expect(tableHeader).toContain('From Date');
    expect(tableHeader).toContain('To Date');
    expect(tableHeader).toContain('Duration');

    const tableBody = el.querySelector('.holidays-table tbody')?.textContent ?? '';
    expect(tableBody).toContain('Pongal');
    expect(tableBody).toContain('1 day');
    expect(tableBody).toContain('Diwali Break');
    expect(tableBody).toContain('3 days');
  });

  it('calculates duration correctly for single-day and multi-day holiday ranges', () => {
    expect(component.calculateDurationDays({ fromDate: '2026-11-07', toDate: '2026-11-09' })).toBe(3);
    expect(component.calculateDurationText({ fromDate: '2026-11-07', toDate: '2026-11-09' })).toBe('3 days');

    expect(component.calculateDurationDays({ fromDate: '2026-01-14', toDate: '2026-01-14' })).toBe(1);
    expect(component.calculateDurationText({ fromDate: '2026-01-14', toDate: '2026-01-14' })).toBe('1 day');
  });

  it('validates mandatory fields and date ordering when saving holidays', () => {
    component.setActiveTab('holidays');
    component.openAddHolidayModal();
    expect(component.showHolidayModal()).toBe(true);

    // Missing Name
    component.holidayFormName = '';
    component.holidayFormFromDate = '2026-12-25';
    component.holidayFormToDate = '2026-12-25';
    component.saveHoliday();
    expect(component.error()).toContain('Holiday name is mandatory');
    expect(addHolidaySpy).not.toHaveBeenCalled();

    // Missing From Date
    component.holidayFormName = 'Christmas';
    component.holidayFormFromDate = '';
    component.saveHoliday();
    expect(component.error()).toContain('From Date is mandatory');
    expect(addHolidaySpy).not.toHaveBeenCalled();

    // Missing To Date
    component.holidayFormFromDate = '2026-12-25';
    component.holidayFormToDate = '';
    component.saveHoliday();
    expect(component.error()).toContain('To Date is mandatory');
    expect(addHolidaySpy).not.toHaveBeenCalled();

    // To Date earlier than From Date
    component.holidayFormFromDate = '2026-12-25';
    component.holidayFormToDate = '2026-12-20';
    component.saveHoliday();
    expect(component.error()).toContain('To Date cannot be earlier than From Date');
    expect(addHolidaySpy).not.toHaveBeenCalled();
  });

  it('validates overlapping date ranges against existing holidays', () => {
    component.setActiveTab('holidays');
    component.openAddHolidayModal();

    // Overlaps with Diwali Break (2026-11-07 to 2026-11-09)
    component.holidayFormName = 'Deepavali Eve';
    component.holidayFormFromDate = '2026-11-08';
    component.holidayFormToDate = '2026-11-10';
    component.saveHoliday();

    expect(component.error()).toContain('overlaps with an existing holiday: "Diwali Break"');
    expect(addHolidaySpy).not.toHaveBeenCalled();
  });

  it('adds a valid holiday date range and closes modal', () => {
    component.setActiveTab('holidays');
    component.openAddHolidayModal();

    component.holidayFormName = 'Christmas Holiday';
    component.holidayFormFromDate = '2026-12-24';
    component.holidayFormToDate = '2026-12-26';
    component.saveHoliday();

    expect(addHolidaySpy).toHaveBeenCalledWith('2026-12-24', '2026-12-26', 'Christmas Holiday');
    expect(component.showHolidayModal()).toBe(false);
    expect(component.notice()).toContain('Holiday added successfully');
  });

  it('edits an existing holiday date range and calls updateHoliday', () => {
    component.setActiveTab('holidays');
    const existing = mockHolidays[1]; // Diwali Break
    component.openEditHolidayModal(existing);

    expect(component.editingHolidayId()).toBe(existing.id);
    expect(component.holidayFormName).toBe('Diwali Break');
    expect(component.holidayFormFromDate).toBe('2026-11-07');
    expect(component.holidayFormToDate).toBe('2026-11-09');

    // Update to 4 days: 2026-11-07 to 2026-11-10
    component.holidayFormToDate = '2026-11-10';
    component.saveHoliday();

    expect(updateHolidaySpy).toHaveBeenCalledWith(existing.id, '2026-11-07', '2026-11-10', 'Diwali Break');
    expect(component.showHolidayModal()).toBe(false);
    expect(component.notice()).toContain('Holiday updated successfully');
  });

  it('opens delete confirmation modal and executes deletion', () => {
    component.setActiveTab('holidays');
    const target = mockHolidays[0];

    component.confirmDeleteHoliday(target);
    expect(component.deletingHoliday()?.id).toBe(target.id);

    component.executeDeleteHoliday();
    expect(deleteHolidaySpy).toHaveBeenCalledWith(target.id);
    expect(component.deletingHoliday()).toBeNull();
    expect(component.notice()).toContain('deleted successfully');
  });
});
