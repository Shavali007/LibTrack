# LibTrack Requirements

## Purpose and scope
This document distinguishes requirements in the supplied Library Management System SRS from requested LibTrack extensions. The first release is a single-library web application. Original behavior remains attributable to the SRS; extensions below are additions. No unresolved policy is treated as approved behavior.

## Original SRS requirements

| ID | Requirement | Actor |
|---|---|---|
| SRS-FR-01 | Register student accounts and validate student ID/account information. | Student |
| SRS-FR-02 | Authenticate users and apply role-based access. | Student, librarian |
| SRS-FR-03 | Add, update, view, and deactivate catalogue book records. | Librarian |
| SRS-FR-04 | Search by title, author, ISBN, category, or keyword. | Student, librarian |
| SRS-FR-05 | Show physical-copy availability. | Student, librarian |
| SRS-FR-06 | Submit a borrow request after basic eligibility checks. | Student |
| SRS-FR-07 | Approve or reject pending requests. | Librarian |
| SRS-FR-08 | Verify member and availability, issue a copy, and record due date. | Librarian |
| SRS-FR-09 | View current borrowings and due dates. | Student |
| SRS-FR-10 | Record returns and update copy availability. | Librarian |
| SRS-FR-11 | Determine lateness and calculate/apply fine under library policy. | System, librarian |
| SRS-FR-12 | View, update, activate, and deactivate member records. | Librarian |
| SRS-FR-13 | Retrieve completed borrowing history. | Student, librarian |
| SRS-FR-14 | Check renewal eligibility/count and allow one online renewal when eligible. | Student, librarian |
| SRS-FR-15 | Move a due date on a library holiday to the next working day. | System |
| SRS-FR-16 | Record lost/damaged condition and a policy decision, charge, or remark. | Librarian |
| SRS-FR-17 | Display relevant in-app status information. | System, student |
| SRS-FR-18 | Provide basic library reports. | Librarian |
| SRS-FR-19 | Enforce role access for protected operations. | System |

Original SRS rules: only available books are issued; identity-card misuse and sub-lending are prohibited; reference books and serial materials generally cannot be taken out, with selected overnight exceptions; lost/damaged books follow a replacement policy; individual reminders are not issued, though a consolidated defaulter list may be supported. E-books, purchasing, online fine payment, RFID, SMS/WhatsApp, AI recommendations, and multiple branches are outside the original first-version scope.

## New project requirements

| ID | Extension | Requirement |
|---|---|---|
| EXT-ROLE-01 | Faculty | May perform approved student-permitted operations. |
| EXT-ROLE-02 | Faculty | May recommend books to individual students. Group/course recommendations wait until an authoritative group/course model exists. |
| EXT-SMART-01 | Student | Category recommendations use recorded interests and catalogue facts; do not claim AI capability. |
| EXT-SMART-02 | User | Submit book ratings and feedback, subject to moderation/eligibility decisions. |
| EXT-SMART-03 | User | Receive in-application notifications; no email/SMS implied. |
| EXT-SMART-04 | Student | View insights derived from their own activity, with no fabricated statistics. |
| EXT-DESIGN-01 | All | Follow the academic design direction in `ui-design-system.md`. |

## Quality requirements from the SRS
Security through authentication, role authorization, and protected passwords; reliable issue/return consistency; clear navigation/messages; maintainable separation of presentation, application, and persistence; growth in users/books/records; availability during normal library operations; acceptable performance for search/login/views; HTTPS for sensitive network traffic. The SRS sets no measurable performance target.

## Ambiguities and missing rules
1. Current default loan terms are 21 calendar days for Students and 30 for Faculty; renewal extension defaults to 21 days. Policy settings can change these values. Set the library time zone before deployment.
2. Fine assessment is implemented with prototype defaults of ₹10 per overdue day, ₹500 maximum per loan, and zero grace days. These values and the institution's approved schedule require review before operational use.
3. Loan/request limits, eligibility, request expiry, duplicate handling, suspension, and outstanding-fine effects are unspecified.
4. Renewal count and extension are policy settings tracked by academic semester. Current defaults allow one renewal with a 21-day extension. The institution should approve interactions among reservations, overdue loans, and fines.
5. Due-date calculation moves a due date past Sundays, Mondays, and configured holiday dates/ranges. The institution must provide its calendar and configured library time zone.
6. Restricted-material exceptions and overnight cutoff/return time are not defined.
7. Lost/damaged replacement amounts, copy disposition, and compensation policy are absent.
8. Student/Faculty self-registration with mandatory Librarian approval is implemented. Institutional SSO/identity-verification API integration is absent; Librarian accounts remain controlled bootstrap/administrative only.
9. In-app notifications, read state, and due-date reminders are implemented. Retention policy and external email/SMS delivery remain unspecified.
10. Feedback and eligible book reviews are implemented; moderation, retention, and institutional eligibility policy should be reviewed.
11. Faculty-to-student recommendations are implemented. Group/course recommendations and personal reading insights are not implemented; broader recommendation/privacy rules still need approval.
12. A Librarian summary report is implemented. The full list, filters, exports, and access rules for additional reports remain unspecified.
13. Backup objectives, accessibility target, and performance thresholds are absent.


## Authentication and provisioning boundary

The prototype supports session login/logout/current-user lookup, password-reset endpoints, controlled Librarian provisioning, self-registration, Librarian approval/rejection, and account status management. Student/Faculty self-registration creates a disabled `PENDING_APPROVAL` account and notifies Librarians; only Librarian approval enables normal sign-in. The current registration service does not issue email-verification tokens. A separate legacy verification endpoint and development mail-capture tooling remain in the repository but are not the normal registration workflow. Provisioned identities are manually checked and the attestation, actor, and time are recorded. Institutional SSO and identity-verification APIs are absent. The first Librarian is created through the interactive CLI bootstrap, not a public endpoint or seeded password. Identity-evidence retention, recovery delivery, rate limiting, and offboarding procedures remain operational decisions. SRS-FR-01 is partially implemented: an approval workflow exists, but no institutional identity source is integrated.


## Student dashboard implementation status

The current profile endpoint (`GET /api/v1/auth/me`) returns the authenticated account's UUID, email, role, and display name when available. Backend and Angular code include catalogue, borrowing, circulation, reservations, fines, recommendations, notifications, reviews, feedback, wishlist, and Librarian summary/report services. Personal reading-progress/insight records, reading goals, bookmarks, and saved quotations are not implemented; loan records are not treated as reading statistics. No sample records or demonstration metrics should be presented as live data.

## Public experience and dashboard status

The public landing page, role-context sign-in, registration, password reset, and catalogue browse/detail flows are implemented. Role selection never grants authority. Student/Faculty registration validates institutional email and password rules, creates a disabled `PENDING_APPROVAL` account, and notifies Librarians; the account cannot sign in until Librarian approval. It does not require email verification. The separate development-only mail-capture/verification path remains legacy tooling. Librarian public registration is unavailable. Workspace navigation includes API-backed member and Librarian features; reading insights are not implemented.

## Catalogue implementation status

SRS-FR-03, SRS-FR-04, and SRS-FR-05 are implemented as described above. Reference, serial, and overnight exception policy is stored as catalogue metadata, but these items are not eligible for standard take-home circulation.


## Borrowing and circulation implementation status

The implemented circulation workflow includes Student/Faculty-owned requests and reservations, Librarian review, separate issue, current loan/history views, semester-aware renewals, returns, audit history, holiday ranges, and due-date reminders. Only active books with `STANDARD` policy can be requested/issued. Default initial terms are 21 days for Students and 30 for Faculty; renewal defaults are one per semester with a 21-day extension. Due dates skip Sundays, Mondays, and configured holiday ranges using `LIBTRACK_LIBRARY_ZONE`. Row locks and database constraints protect copy assignment. Overdue fine assessment, member/Librarian fine views, and manual payment records are implemented using prototype rate/cap/grace settings. External payment processing and lost/damaged replacement compensation are not implemented. MySQL migration/schema validation remains a separate deployment/CI check; H2 tests do not validate the engine-specific migrations.

## Other implemented services

The codebase also implements physical inventory reconciliation, digital PDF editions, book reviews, member feedback, Faculty-to-student recommendations, in-app notifications, wishlists, configurable library policies, and a Librarian summary report. A broad report/export suite and personal reading insights are not implemented. The current MySQL Flyway location contains V1–V22; see `database-design.md` for migration locations and history.
