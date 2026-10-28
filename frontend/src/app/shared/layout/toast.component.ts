import { Component, Injectable, inject, signal } from '@angular/core';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';
export interface ToastMessage { id: number; text: string; tone: ToastTone; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly current = signal<ToastMessage | null>(null);
  private timeout?: ReturnType<typeof setTimeout>;
  private nextId = 0;

  show(text: string, tone: ToastTone = 'info'): void {
    if (this.timeout) clearTimeout(this.timeout);
    const id = ++this.nextId;
    this.current.set({ id, text, tone });
    this.timeout = setTimeout(() => this.dismiss(id), 5000);
  }

  dismiss(id = this.current()?.id): void {
    if (id === undefined || this.current()?.id !== id) return;
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = undefined;
    this.current.set(null);
  }
}

@Component({
  selector: 'app-toast-viewport', standalone: true,
  template: `@if (toast.current(); as message) { <div class="toast" [class]="'toast tone-' + message.tone" [attr.role]="message.tone === 'error' ? 'alert' : 'status'" [attr.aria-live]="message.tone === 'error' ? 'assertive' : 'polite'"><span>{{ message.text }}</span><button type="button" aria-label="Dismiss notification" (click)="toast.dismiss(message.id)">Dismiss</button></div> }`,
  styles: [`:host{position:fixed;right:1rem;bottom:1rem;z-index:20;display:block;width:min(28rem,calc(100vw - 2rem))}.toast{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.85rem 1rem;border:1px solid var(--color-line-200);border-left:4px solid var(--color-forest-700);border-radius:var(--radius-panel);color:var(--color-charcoal-900);background:var(--color-paper);box-shadow:var(--shadow-panel)}.tone-success{border-left-color:var(--color-forest-700)}.tone-warning{border-left-color:var(--color-amber-700)}.tone-error{border-left-color:var(--color-danger-800)}button{flex:0 0 auto;padding:.25rem;border:0;color:var(--color-forest-900);background:transparent;font-size:.78rem;font-weight:700;text-decoration:underline;cursor:pointer}@media(max-width:480px){:host{right:.5rem;bottom:.5rem;width:calc(100vw - 1rem)}}`],
})
export class ToastViewportComponent { readonly toast = inject(ToastService); }
