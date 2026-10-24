import { Routes } from '@angular/router';
import { authenticatedGuard, librarianGuard } from './features/auth/auth.guard';
import { LoginComponent } from './features/auth/login.component';
import { HomeComponent } from './features/home/home.component';
import { AccountProvisionComponent } from './features/home/account-provision.component';
import { BookListComponent } from './features/catalogue/book-list.component';
import { BookDetailComponent, BookEditorComponent } from './features/catalogue/book-detail-editor.component';
import { CopyManagerComponent } from './features/catalogue/copy-manager.component';
import { AppShellComponent } from './shared/layout/app-shell.component';
export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: AppShellComponent, canMatch: [authenticatedGuard], children: [
    { path: 'librarian/accounts/new', component: AccountProvisionComponent, canMatch: [librarianGuard] },
    { path: 'librarian/books/new', component: BookEditorComponent, canMatch: [librarianGuard] },
    { path: 'librarian/books/:bookId/edit', component: BookEditorComponent, canMatch: [librarianGuard] },
    { path: 'librarian/books/:bookId/copies', component: CopyManagerComponent, canMatch: [librarianGuard] },
    { path: 'books', component: BookListComponent },
    { path: 'books/:bookId', component: BookDetailComponent },
    { path: '', component: HomeComponent },
  ]},
  { path: '**', redirectTo: '' },
];
