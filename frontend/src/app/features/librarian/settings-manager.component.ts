import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { LibrarianOperationsService, SettingRecord } from './librarian-operations.service';

@Component({
  selector: 'app-settings-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <header class="page-heading">
      <div>
        <p class="eyebrow">LIBRARIAN WORKSPACE · ADMINISTRATION</p>
        <h1>Library System Settings & Policies</h1>
        <p class="muted">Configure borrowing durations, circulation limits, and institutional parameters. Persisted in system registry.</p>
      </div>
      <div class="header-actions">
        <button class="button button-secondary" type="button" (click)="load()" [disabled]="loading()">
          ↻ Reload Settings
        </button>
      </div>
    </header>

    @if (error()) {
      <p class="alert alert-error" role="alert">{{ error() }}</p>
    }
    @if (notice()) {
      <p class="alert alert-success" role="status">{{ notice() }}</p>
    }

    @if (loading()) {
      <div class="loading-state" role="status">Loading library settings…</div>
    } @else if (!settings().length) {
      <section class="empty-state surface-card">
        <h2>No configuration records found</h2>
      </section>
    } @else {
      <div class="settings-grid">
        @for (item of settings(); track item.key) {
          <article class="surface-card setting-card">
            <div class="setting-info">
              <span class="setting-key-tag">{{ item.key }}</span>
              <h3 class="setting-title">{{ settingTitle(item.key) }}</h3>
              <p class="setting-desc muted">{{ settingDescription(item.key) }}</p>
              @if (item.updatedAt) {
                <small class="muted audit-line">
                  Last updated {{ item.updatedAt | date:'medium' }}
                  @if (item.updatedByEmail) {
                    by {{ item.updatedByEmail }}
                  }
                </small>
              }
            </div>

            <div class="setting-action-block">
              @if (editingKey() === item.key) {
                <div class="edit-row">
                  <input
                    type="text"
                    [(ngModel)]="editValue"
                    class="input-sm"
                    [disabled]="saving()"
                    required
                  />
                  <div class="button-group">
                    <button class="button button-primary btn-sm" type="button" (click)="saveSetting(item.key)" [disabled]="saving() || !editValue.trim()">
                      {{ saving() ? 'Saving…' : 'Save' }}
                    </button>
                    <button class="button button-quiet btn-sm" type="button" (click)="cancelEdit()" [disabled]="saving()">
                      Cancel
                    </button>
                  </div>
                </div>
              } @else {
                <div class="display-row">
                  <span class="current-value">{{ item.value }}</span>
                  <button class="button button-secondary btn-sm" type="button" (click)="startEdit(item)">
                    Edit
                  </button>
                </div>
              }
            </div>
          </article>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .page-heading {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
    }
    .page-heading h1 { margin: 0.2rem 0; font-size: 1.85rem; }
    .settings-grid {
      display: grid;
      gap: 1.15rem;
    }
    .setting-card {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 1.5rem;
      padding: 1.25rem 1.5rem;
      border-radius: var(--radius-panel);
      border: 1px solid var(--color-line-200);
      background: var(--color-paper);
    }
    .setting-key-tag {
      font-family: monospace;
      font-size: 0.72rem;
      color: #1b4332;
      background: #e8f3ee;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }
    .setting-title {
      margin: 0.35rem 0 0.2rem;
      font-size: 1.1rem;
      color: var(--color-charcoal-900);
    }
    .setting-desc {
      margin: 0 0 0.4rem;
      font-size: 0.85rem;
      line-height: 1.4;
    }
    .audit-line {
      display: block;
      font-size: 0.75rem;
    }
    .setting-action-block {
      min-width: 14rem;
      display: flex;
      justify-content: flex-end;
    }
    .display-row {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .current-value {
      font: 700 1.25rem var(--font-serif);
      color: #1b4332;
      min-width: 3.5rem;
      text-align: right;
    }
    .edit-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
    }
    .edit-row input {
      max-width: 9rem;
    }
    .button-group {
      display: flex;
      gap: 0.35rem;
    }
    @media (max-width: 768px) {
      .setting-card {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      .setting-action-block {
        justify-content: flex-start;
      }
    }
  `]
})
export class SettingsManagerComponent implements OnInit {
  private readonly opsService = inject(LibrarianOperationsService);

  readonly settings = signal<SettingRecord[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  readonly editingKey = signal<string | null>(null);
  editValue = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.opsService.getAllSettings()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.settings.set(items),
        error: () => this.error.set('Failed to load system settings.')
      });
  }

  startEdit(item: SettingRecord): void {
    this.editingKey.set(item.key);
    this.editValue = item.value;
    this.error.set('');
    this.notice.set('');
  }

  cancelEdit(): void {
    this.editingKey.set(null);
    this.editValue = '';
  }

  saveSetting(key: string): void {
    if (this.saving() || !this.editValue.trim()) return;
    this.saving.set(true);
    this.error.set('');
    this.notice.set('');

    this.opsService.updateSetting(key, this.editValue.trim())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (updated) => {
          this.notice.set(`Setting "${key}" updated successfully.`);
          this.settings.update(list =>
            list.map(s => s.key === key ? updated : s)
          );
          this.cancelEdit();
        },
        error: () => this.error.set(`Failed to update setting "${key}".`)
      });
  }

  settingTitle(key: string): string {
    switch (key) {
      case 'loan.period.student.days': return 'Student Standard Loan Duration (Days)';
      case 'loan.period.faculty.days': return 'Faculty Standard Loan Duration (Days)';
      case 'loan.renewal.limit': return 'Maximum Renewal Count Per Loan';
      case 'loan.max.active.student': return 'Maximum Active Loans Per Student';
      case 'loan.max.active.faculty': return 'Maximum Active Loans Per Faculty Member';
      case 'library.name': return 'Official Institutional Library Title';
      default: return key;
    }
  }

  settingDescription(key: string): string {
    switch (key) {
      case 'loan.period.student.days': return 'Standard number of days granted to undergraduate and postgraduate students upon checkout.';
      case 'loan.period.faculty.days': return 'Extended loan duration provided for academic teaching and research faculty.';
      case 'loan.renewal.limit': return 'Number of times an active loan may be extended without administrative override.';
      case 'loan.max.active.student': return 'Concurrently active physical book loans permitted per student account.';
      case 'loan.max.active.faculty': return 'Concurrently active physical book loans permitted per faculty account.';
      case 'library.name': return 'Header title displayed across library correspondence, slips, and notifications.';
      default: return 'Configured library system property.';
    }
  }
}
