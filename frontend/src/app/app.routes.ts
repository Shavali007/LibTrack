import { Routes } from '@angular/router';
import { authenticatedGuard, librarianGuard, memberGuard } from './features/auth/auth.guard';
import { LoginComponent } from './features/auth/login.component';
import { VerifyEmailComponent } from './features/auth/verify-email.component';
import { HomeComponent } from './features/home/home.component';
import { PublicLandingComponent } from './features/home/public-landing.component';

import { BookListComponent } from './features/catalogue/book-list.component';
import { BookDetailComponent, BookEditorComponent } from './features/catalogue/book-detail-editor.component';
import { CopyManagerComponent } from './features/catalogue/copy-manager.component';
import { AppShellComponent } from './shared/layout/app-shell.component';
import { MyRequestsComponent } from './features/circulation/my-requests.component';
import { MyBorrowingsComponent } from './features/circulation/my-borrowings.component';
import { LibrarianRequestsComponent, CirculationDeskComponent } from './features/circulation/librarian-circulation.component';

export const routes: Routes = [
  { path: '', component: PublicLandingComponent, pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'verify-email', component: VerifyEmailComponent },
  { path: 'books', component: BookListComponent },
  { path: 'books/:bookId', component: BookDetailComponent },
  { path: 'workspace', component: AppShellComponent, canMatch: [authenticatedGuard], children: [
   
    { path: 'librarian/books/new', component: BookEditorComponent, canMatch: [librarianGuard] },
    { path: 'librarian/books/:bookId/edit', component: BookEditorComponent, canMatch: [librarianGuard] },
    { path: 'librarian/books/:bookId/copies', component: CopyManagerComponent, canMatch: [librarianGuard] },
    { path: 'librarian/requests', component: LibrarianRequestsComponent, canMatch: [librarianGuard] },
    { path: 'librarian/circulation', component: CirculationDeskComponent, canMatch: [librarianGuard] },
    { path: 'my/requests', component: MyRequestsComponent, canMatch: [memberGuard] },
    { path: 'my/borrowings', component: MyBorrowingsComponent, canMatch: [memberGuard] },
    { path: '', component: HomeComponent, pathMatch: 'full' },
  ]},
  { path: '**', redirectTo: '' },
];