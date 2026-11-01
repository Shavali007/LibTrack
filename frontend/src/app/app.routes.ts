import { Routes } from '@angular/router';
import { authenticatedGuard, librarianGuard, memberGuard } from './features/auth/auth.guard';
import { LoginComponent } from './features/auth/login.component';
import { VerifyEmailComponent } from './features/auth/verify-email.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password.component';
import { ResetPasswordComponent } from './features/auth/reset-password.component';
import { HomeComponent } from './features/home/home.component';
import { AccountProvisionComponent } from './features/home/account-provision.component';
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
import { MemberRequestsComponent } from './features/librarian/member-requests.component';
import { MemberRequestReviewComponent } from './features/librarian/member-request-review.component';
import { ReportViewerComponent } from './features/librarian/report-viewer.component';
import { FeedbackViewerComponent } from './features/librarian/feedback-viewer.component';
import { NotificationCenterComponent } from './features/librarian/notification-center.component';
import { SettingsManagerComponent } from './features/librarian/settings-manager.component';
import { FinesViewerComponent } from './features/librarian/fines-viewer.component';
import { LibraryPoliciesComponent } from './features/librarian/library-policies.component';
import { BorrowingPolicyComponent } from './features/librarian/policies/borrowing-policy.component';
import { RenewalPolicyComponent } from './features/librarian/policies/renewal-policy.component';
import { FinesPolicyComponent } from './features/librarian/policies/fines-policy.component';
import { MembershipPolicyComponent } from './features/librarian/policies/membership-policy.component';
import { UsagePolicyComponent } from './features/librarian/policies/usage-policy.component';
import { BookRecommendationsComponent } from './features/recommendations/book-recommendations.component';
import { RecommendBookPageComponent } from './features/recommendations/recommend-book-page.component';
import { MyReservationsComponent } from './features/reservations/my-reservations.component';
import { MyWishlistComponent } from './features/wishlist/my-wishlist.component';

export const routes: Routes = [
  { path: '', component: PublicLandingComponent, pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'verify-email', component: VerifyEmailComponent },
  { path: 'books', component: BookListComponent },
  { path: 'books/:bookId/read', component: PdfReaderComponent, canMatch: [authenticatedGuard] },
  { path: 'books/:bookId', component: BookDetailComponent },
  { path: 'workspace', component: AppShellComponent, canMatch: [authenticatedGuard], children: [
    { path: 'books', component: BookListComponent },
    { path: 'books/:bookId/read', component: PdfReaderComponent },
    { path: 'books/:bookId', component: BookDetailComponent },
    { path: 'recommendations', component: BookRecommendationsComponent },
    { path: 'recommendations/new', component: RecommendBookPageComponent },
    { path: 'librarian/books/new', component: BookEditorComponent, canMatch: [librarianGuard] },
    { path: 'librarian/books/:bookId/edit', component: BookEditorComponent, canMatch: [librarianGuard] },
    { path: 'librarian/books/:bookId/copies', component: CopyManagerComponent, canMatch: [librarianGuard] },
    { path: 'librarian/members', component: MemberDirectoryComponent, canMatch: [librarianGuard] },
    { path: 'librarian/member-requests', component: MemberRequestsComponent, canMatch: [librarianGuard] },
    { path: 'librarian/member-requests/:id', component: MemberRequestReviewComponent, canMatch: [librarianGuard] },
    { path: 'librarian/members/new', component: AccountProvisionComponent, canMatch: [librarianGuard] },
    { path: 'librarian/requests', component: LibrarianRequestsComponent, canMatch: [librarianGuard] },
    { path: 'librarian/circulation', component: CirculationDeskComponent, canMatch: [librarianGuard] },
    { path: 'librarian/fines', component: FinesViewerComponent, canMatch: [librarianGuard] },
    { path: 'librarian/reports', component: ReportViewerComponent, canMatch: [librarianGuard] },
    { path: 'librarian/feedback', component: FeedbackViewerComponent, canMatch: [librarianGuard] },
    { path: 'librarian/notifications', component: NotificationCenterComponent, canMatch: [librarianGuard] },
    { path: 'library-policies', component: LibraryPoliciesComponent },
    { path: 'library-policies/borrowing', component: BorrowingPolicyComponent },
    { path: 'library-policies/renewal', component: RenewalPolicyComponent },
    { path: 'library-policies/fines', component: FinesPolicyComponent },
    { path: 'library-policies/membership', component: MembershipPolicyComponent },
    { path: 'library-policies/usage', component: UsagePolicyComponent },
    { path: 'librarian/library-policies', redirectTo: '/workspace/library-policies', pathMatch: 'full' },
    { path: 'librarian/library-policies/borrowing', redirectTo: '/workspace/library-policies/borrowing', pathMatch: 'full' },
    { path: 'librarian/library-policies/renewal', redirectTo: '/workspace/library-policies/renewal', pathMatch: 'full' },
    { path: 'librarian/library-policies/fines', redirectTo: '/workspace/library-policies/fines', pathMatch: 'full' },
    { path: 'librarian/library-policies/membership', redirectTo: '/workspace/library-policies/membership', pathMatch: 'full' },
    { path: 'librarian/library-policies/usage', redirectTo: '/workspace/library-policies/usage', pathMatch: 'full' },
    { path: 'librarian/settings', component: SettingsManagerComponent, canMatch: [librarianGuard] },
    { path: 'my/requests', component: MyRequestsComponent, canMatch: [memberGuard] },
    { path: 'my/borrowings', component: MyBorrowingsComponent, canMatch: [memberGuard] },
    { path: 'my/reservations', component: MyReservationsComponent, canMatch: [memberGuard] },
    { path: 'wishlist', component: MyWishlistComponent, canMatch: [memberGuard] },
    { path: 'my/wishlist', redirectTo: '/workspace/wishlist', pathMatch: 'full' },
    { path: 'reservations', redirectTo: '/workspace/my/reservations', pathMatch: 'full' },
    { path: 'notifications', component: NotificationCenterComponent, canMatch: [memberGuard] },
    { path: 'my/notifications', redirectTo: '/workspace/notifications', pathMatch: 'full' },
    { path: 'my/fines', component: MyFinesComponent, canMatch: [memberGuard] },
    { path: 'my/feedback', component: MemberFeedbackComponent, canMatch: [memberGuard] },
    { path: '', component: HomeComponent, pathMatch: 'full' },
  ]},
  { path: '**', redirectTo: '' },
];
