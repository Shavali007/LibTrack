import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EMPTY, catchError } from 'rxjs';
import { AuthService } from './features/auth/auth.service';
import { ToastViewportComponent } from './shared/layout/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastViewportComponent],
  template: '<router-outlet /><app-toast-viewport />',
  styles: [':host { display: block; min-height: 100vh; }'],
})
export class AppComponent {
  private readonly auth = inject(AuthService);
  constructor() {
    this.auth.loadCurrentUser().pipe(catchError(() => {
      this.auth.profile.set(null);
      return EMPTY;
    })).subscribe();
  }
}
