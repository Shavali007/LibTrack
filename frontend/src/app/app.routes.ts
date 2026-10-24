import { Routes } from '@angular/router';
import { authenticatedGuard, librarianGuard } from './features/auth/auth.guard';
import { LoginComponent } from './features/auth/login.component';
import { HomeComponent } from './features/home/home.component';
import { AccountProvisionComponent } from './features/home/account-provision.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'librarian/accounts/new', component: AccountProvisionComponent, canMatch: [librarianGuard] },
  { path: '', component: HomeComponent, canMatch: [authenticatedGuard] },
  { path: '**', redirectTo: '' },
];
