import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const authenticatedGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.loadCurrentUser().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};

export const librarianGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.loadCurrentUser().pipe(
    map((profile) => profile.role === 'LIBRARIAN' ? true : router.createUrlTree(['/'])),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};

export const memberGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.loadCurrentUser().pipe(
    map((profile) => profile.role === 'STUDENT' || profile.role === 'FACULTY' ? true : router.createUrlTree(['/'])),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
