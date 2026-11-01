import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Observable, of } from 'rxjs';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { SettingsManagerComponent } from './settings-manager.component';
import { HolidayRecord, LibrarianOperationsService, LibraryInfoRecord } from './librarian-operations.service';

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
      holidayDate: '2026-01-14',
      name: 'Pongal',
      createdByEmail: 'librarian@vitap.ac.in',
      createdAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'h-2',
      holidayDate: '2026-03-08',
      name: "Women's Day",
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

  beforeEach(async () => {
    getLibraryInfoSpy = vi.fn(() => of({ ...mockLibraryInfo }));
    updateLibraryInfoSpy = vi.fn((info: LibraryInfoRecord) => of({ ...info }));
    getHolidaysSpy = vi.fn(() => of([...mockHolidays]));
    addHolidaySpy = vi.fn((date: string, name: string) => of({
      id: 'h-new',
      holidayDate: date,
      name,
      createdByEmail: 'librarian@vitap.ac.in',
      createdAt: new Date().toISOString()
    }));
    updateHolidaySpy = vi.fn((id: string, date: string, name: string) => of({
      id,
      holidayDate: date,
      name,
      createdByEmail: 'librarian@vitap.ac.in',
      createdAt: new Date().toISOString()
    }));
    deleteHolidaySpy = vi.fn((id: string) => of(void 0));

    const mockOpsService: Partial<LibrarianOperationsService> = {
      getLibraryInfo: getLibraryInfoSpy as unknown as () => Observable<LibraryInfoRecord>,
      updateLibraryInfo: updateLibraryInfoSpy as unknown as (info: LibraryInfoRecord) => Observable<LibraryInfoRecord>,
      getHolidays: getHolidaysSpy as unknown as () => Observable<HolidayRecord[]>,
      addHoliday: addHolidaySpy as unknown as (date: string, name: string) => Observable<HolidayRecord>,
      updateHoliday: updateHolidaySpy as unknown as (id: string, date: string, name: string) => Observable<HolidayRecord>,
      deleteHoliday: deleteHolidaySpy as unknown as (id: string) => Observable<void>
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

  it('renders exactly two navigation tabs: Library Information and Holiday Calendar without Notification Preferences', () => {
    const el = fixture.nativeElement as HTMLElement;
    const tabButtons = el.querySelectorAll('.settings-tab-btn');
    expect(tabButtons.length).toBe(2);

    const tabsText = el.querySelector('.settings-tabs')?.textContent ?? '';
    expect(tabsText).toContain('Library Information');
    expect(tabsText).toContain('Holiday Calendar');
    expect(tabsText).not.toContain('Notification');

    expect(component.activeTab()).toBe('info');
    expect(getLibraryInfoSpy).toHaveBeenCalled();
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

  it('switches to Holiday Calendar tab and loads real holiday records', () => {
    component.setActiveTab('holidays');
    fixture.detectChanges();

    expect(component.activeTab()).toBe('holidays');
    expect(getHolidaysSpy).toHaveBeenCalled();
    expect(component.holidays().length).toBe(2);

    const el = fixture.nativeElement as HTMLElement;
    const tableText = el.querySelector('.holidays-table')?.textContent ?? '';
    expect(tableText).toContain('Pongal');
    expect(tableText).toContain("Women's Day");
  });

  it('validates duplicate dates when adding holidays and executes deletion', () => {
    component.setActiveTab('holidays');
    component.openAddHolidayModal();
    expect(component.showHolidayModal()).toBe(true);

    // Duplicate date check
    component.holidayFormDate = '2026-01-14';
    component.holidayFormName = 'Duplicate Pongal';
    component.saveHoliday();

    expect(component.error()).toContain('already configured for this date');
    expect(addHolidaySpy).not.toHaveBeenCalled();

    // Valid add
    component.holidayFormDate = '2026-04-14';
    component.holidayFormName = 'Ambedkar Jayanti';
    component.saveHoliday();
    expect(addHolidaySpy).toHaveBeenCalledWith('2026-04-14', 'Ambedkar Jayanti');

    // Delete holiday
    const target = mockHolidays[0];
    component.confirmDeleteHoliday(target);
    expect(component.deletingHoliday()?.id).toBe(target.id);
    component.executeDeleteHoliday();
    expect(deleteHolidaySpy).toHaveBeenCalledWith(target.id);
  });
});
