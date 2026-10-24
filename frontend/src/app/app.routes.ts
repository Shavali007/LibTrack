import { Routes } from '@angular/router';
import { authenticatedGuard, librarianGuard } from './features/auth/auth.guard';
import { LoginComponent } from './features/auth/login.component';
import { HomeComponent } from './features/home/home.component';
import { AccountProvisionComponent } from './features/home/account-provision.component';
import { AppShellComponent } from './shared/layout/app-shell.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: AppShellComponent,
    canMatch: [authenticatedGuard],
    children: [
      { path: 'librarian/accounts/new', component: AccountProvisionComponent, canMatch: [librarianGuard] },
      { path: '', component: HomeComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
