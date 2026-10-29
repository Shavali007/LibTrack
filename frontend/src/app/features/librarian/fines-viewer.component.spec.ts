import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { FinesViewerComponent } from './fines-viewer.component';
import { LibrarianOperationsService } from './librarian-operations.service';

describe('FinesViewerComponent', () => {
  let fixture: ComponentFixture<FinesViewerComponent>;

  const mockOpsService: Partial<LibrarianOperationsService> = {
    getFinesPolicy: () => of({
      status: 'UNCONFIGURED',
      policyTitle: 'Institutional Monetary Fines Policy',
      policyDescription: 'No automated monetary fines are enabled by university charter.',
      monetaryFinesEnabled: false,
      overdueLoansCount: 0,
      overdueLoans: []
    })
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinesViewerComponent],
      providers: [
        { provide: LibrarianOperationsService, useValue: mockOpsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FinesViewerComponent);
    fixture.detectChanges();
  });

  it('renders official unconfigured policy notice and compliance status', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Institutional Monetary Fines Policy');
    expect(text).toContain('UNCONFIGURED');
    expect(text).toContain('No unauthorized ledger debiting');
    expect(text).toContain('Perfect Circulation Compliance');
  });
});
