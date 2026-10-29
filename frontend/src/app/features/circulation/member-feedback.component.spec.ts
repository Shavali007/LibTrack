import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { MemberFeedbackComponent } from './member-feedback.component';
import { LibrarianOperationsService } from '../librarian/librarian-operations.service';

describe('MemberFeedbackComponent', () => {
  let fixture: ComponentFixture<MemberFeedbackComponent>;
  let component: MemberFeedbackComponent;
  let mockOpsService: Partial<LibrarianOperationsService>;

  beforeEach(async () => {
    mockOpsService = {
      getMyFeedback: () => of([
        {
          id: 'fb-1',
          accountId: 'acc-1',
          memberEmail: 'student@vitapstudent.ac.in',
          institutionalId: '23MIC7248',
          role: 'STUDENT',
          category: 'BOOK_REQUEST',
          subject: 'Request for OS Concepts 10th Ed',
          message: 'Please acquire additional physical copies for the upcoming semester.',
          createdAt: '2026-10-15T10:00:00Z',
        }
      ]),
      submitFeedback: (req) => of({
        id: 'fb-2',
        accountId: 'acc-1',
        memberEmail: 'student@vitapstudent.ac.in',
        institutionalId: '23MIC7248',
        role: 'STUDENT',
        category: req.category,
        subject: req.subject,
        message: req.message,
        createdAt: '2026-10-15T11:00:00Z',
      }),
    };

    await TestBed.configureTestingModule({
      imports: [MemberFeedbackComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LibrarianOperationsService, useValue: mockOpsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MemberFeedbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('renders feedback submission form and student past submissions', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Submit Feedback & Suggestions');
    expect(el.textContent).toContain('Request for OS Concepts 10th Ed');
    expect(el.textContent).toContain('BOOK_REQUEST');
  });

  it('allows submitting new feedback inquiry', () => {
    component.category = 'FACILITIES';
    component.subject = 'Silent study room temperature';
    component.message = 'The second floor AC was not working properly today.';
    component.submit();
    fixture.detectChanges();

    expect(component.notice()).toContain('Feedback submitted successfully');
  });
});
