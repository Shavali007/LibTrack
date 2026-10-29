import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { FeedbackViewerComponent } from './feedback-viewer.component';
import { LibrarianOperationsService } from './librarian-operations.service';

describe('FeedbackViewerComponent', () => {
  let fixture: ComponentFixture<FeedbackViewerComponent>;
  let component: FeedbackViewerComponent;
  let mockOpsService: Partial<LibrarianOperationsService>;

  beforeEach(async () => {
    mockOpsService = {
      getAllFeedback: () => of([
        {
          id: 'fb-1',
          accountId: 'acc-1',
          memberEmail: 'student@vitapstudent.ac.in',
          institutionalId: '23MIC7248',
          role: 'STUDENT',
          category: 'BOOK_REQUEST',
          subject: 'Request for Operating Systems',
          message: 'Need additional copies for curriculum.',
          createdAt: '2026-10-15T10:00:00Z',
        }
      ]),
    };

    await TestBed.configureTestingModule({
      imports: [FeedbackViewerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LibrarianOperationsService, useValue: mockOpsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FeedbackViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('renders member feedback and category tabs without submit feedback button', () => {
    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent as string;

    // Must NOT contain submit feedback button or form for librarians
    expect(text).not.toContain('+ Submit Feedback');
    expect(el.querySelector('button.submit-btn')).toBeNull();

    // Must contain review information
    expect(text).toContain('Member Feedback & Suggestions');
    expect(text).toContain('Request for Operating Systems');
    expect(text).toContain('23MIC7248');
    expect(text).toContain('Student');
  });

  it('filters feedback items by selected category', () => {
    expect(component.filteredFeedback().length).toBe(1);
    component.selectedCategory.set('FACILITIES');
    expect(component.filteredFeedback().length).toBe(0);
    component.selectedCategory.set('BOOK_REQUEST');
    expect(component.filteredFeedback().length).toBe(1);
  });
});
