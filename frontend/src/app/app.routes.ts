import { Routes } from '@angular/router';
import { authenticatedGuard, librarianGuard, memberGuard } from './features/auth/auth.guard';
import { LoginComponent } from './features/auth/login.component';
import { VerifyEmailComponent } from './features/auth/verify-email.component';
import { HomeComponent } from './features/home/home.component';
import { PublicLandingComponent } from './features/home/public-landing.component';

import { BookListComponent } from './features/catalogue/book-list.component';
import { BookDetailComponent, BookEditorComponent } from './features/catalogue/book-detail-editor.component';
import { PdfReaderComponent } from './features/catalogue/pdf-reader.component';
import { CopyManagerComponent } from './features/catalogue/copy-manager.component';
import { AppShellComponent } from './shared/layout/app-shell.component';
import { FeatureNoticeComponent } from './shared/layout/feature-notice.component';
import { MyRequestsComponent } from './features/circulation/my-requests.component';
import { MyBorrowingsComponent } from './features/circulation/my-borrowings.component';
import { MyFinesComponent } from './features/circulation/my-fines.component';
import { MemberFeedbackComponent } from './features/circulation/member-feedback.component';
import { LibrarianRequestsComponent, CirculationDeskComponent } from './features/circulation/librarian-circulation.component';
import { MemberDirectoryComponent } from './features/librarian/member-directory.component';
import { ReportViewerComponent } from './features/librarian/report-viewer.component';
import { FeedbackViewerComponent } from './features/librarian/feedback-viewer.component';
import { NotificationCenterComponent } from './features/librarian/notification-center.component';
import { SettingsManagerComponent } from './features/librarian/settings-manager.component';
import { FinesViewerComponent } from './features/librarian/fines-viewer.component';

export const routes: Routes = [
  { path: '', component: PublicLandingComponent, pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'verify-email', component: VerifyEmailComponent },
  { path: 'books', component: BookListComponent },
  { path: 'books/:bookId/read', component: PdfReaderComponent, canMatch: [authenticatedGuard] },
  { path: 'books/:bookId', component: BookDetailComponent },
  { path: 'workspace', component: AppShellComponent, canMatch: [authenticatedGuard], children: [
    { path: 'books', component: BookListComponent },
    { path: 'books/:bookId/read', component: PdfReaderComponent },
    { path: 'books/:bookId', component: BookDetailComponent },
    { path: 'librarian/books/new', component: BookEditorComponent, canMatch: [librarianGuard] },
    { path: 'librarian/books/:bookId/edit', component: BookEditorComponent, canMatch: [librarianGuard] },
    { path: 'librarian/books/:bookId/copies', component: CopyManagerComponent, canMatch: [librarianGuard] },
    { path: 'librarian/members', component: MemberDirectoryComponent, canMatch: [librarianGuard] },
    { path: 'librarian/requests', component: LibrarianRequestsComponent, canMatch: [librarianGuard] },
    { path: 'librarian/circulation', component: CirculationDeskComponent, canMatch: [librarianGuard] },
    { path: 'librarian/fines', component: FinesViewerComponent, canMatch: [librarianGuard] },
    { path: 'librarian/reports', component: ReportViewerComponent, canMatch: [librarianGuard] },
    { path: 'librarian/feedback', component: FeedbackViewerComponent, canMatch: [librarianGuard] },
    { path: 'librarian/notifications', component: NotificationCenterComponent, canMatch: [librarianGuard] },
    { path: 'librarian/settings', component: SettingsManagerComponent, canMatch: [librarianGuard] },
    { path: 'my/requests', component: MyRequestsComponent, canMatch: [memberGuard] },
    { path: 'my/borrowings', component: MyBorrowingsComponent, canMatch: [memberGuard] },
    { path: 'my/fines', component: MyFinesComponent, canMatch: [memberGuard] },
    { path: 'my/feedback', component: MemberFeedbackComponent, canMatch: [memberGuard] },
    { path: '', component: HomeComponent, pathMatch: 'full' },
  ]},
  { path: '**', redirectTo: '' },
];
