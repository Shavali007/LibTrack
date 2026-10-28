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
1. The 30-calendar-day loan duration is confirmed for this prototype. The configured library time zone must still be set for deployment.
2. Fine rate and calculation structure are unspecified.
3. Loan/request limits, eligibility, request expiry, duplicate handling, suspension, and outstanding-fine effects are unspecified.
4. The prototype allows one renewal per active standard loan, extending the previous due date by 30 calendar days; reservation interaction and other renewal restrictions remain unspecified.
5. Librarians maintain explicit holiday dates; dates roll forward across consecutive configured holidays. Weekends are not automatically treated as holidays. The institution must provide its calendar and configured library time zone.
6. Restricted-material exceptions and overnight cutoff/return time are not defined.
7. Lost/damaged replacement amounts, copy disposition, and compensation policy are absent.
8. Faculty identity provisioning and privileged-account creation are absent.
9. Notification events, read state, and retention are unspecified.
10. Feedback scale, eligibility, one-rating rule, edit/delete, moderation, and aggregation are unspecified.
11. Recommendation ranking/exclusions/visibility/expiry and insight definitions/privacy need approval.
12. “Basic reports” has no precise list, filters, exports, or access rules.
13. Backup objectives, accessibility target, and performance thresholds are absent.


## Authentication and provisioning boundary

The prototype supports session login, logout, current-user lookup, Librarian-mediated Student/Faculty provisioning, and account deactivation. Only an authorized Librarian can use the provisioning API, whose role enum excludes Librarian. The operator must confirm identity manually; an attestation, institutional identifier, timestamp, and creating Librarian are recorded. The prototype does not implement institutional SSO, an identity verification API, or an institutional approval workflow. The first Librarian is created through the controlled interactive CLI bootstrap, not an HTTP endpoint or seeded password. Production verification source/evidence retention, account recovery, rate limiting, and administrative offboarding remain undecided. Thus SRS-FR-01 is only partially implemented: member creation is controlled, but the SRS validation mechanism is not integrated.


## Student dashboard implementation status

The current profile endpoint (`GET /api/v1/auth/me`) supplies only the authenticated account's UUID, email, and role. The dashboard may use the real email and current date, but no display name is available. The backend implements catalogue, borrow-request, loan, circulation-audit, and explicit holiday-calendar records/APIs. Fine, recommendation, notification, bookmark, quotation, and reading-progress services remain unimplemented. These areas are shown as unavailable or omitted from active navigation. Loan records are not treated as reading statistics. Reading goals and page-level progress need separate approved data models. No sample records or demonstration metrics are allowed in production UI.

## Public experience and dashboard status

The public landing page, redesigned role-context sign-in dialog, and read-only catalogue browse/detail flow are implemented. Role tabs remain contextual and never grant a role. Student/Faculty self-registration validates institutional domains and password rules; new accounts remain disabled until a single-use, expiring institutional-email token is validated. With the explicit development Spring profile, an in-memory localhost-only mail capture exposes verification links for local testing. Outside development/test, registration fails closed until a real provider is configured. Existing Librarian-provisioned accounts remain enabled only after the established identity review. Librarian public registration is unavailable. Workspace pages continue to expose only implemented API-backed services; password recovery and unsupported catalogue-adjacent features remain incomplete.

## Catalogue implementation status

SRS-FR-03, SRS-FR-04, and SRS-FR-05 are implemented as described above. Reference, serial, and overnight exception policy is stored as catalogue metadata, but these items are not eligible for standard take-home circulation.


## Borrowing and circulation implementation status

The initial circulation slice implements Student/Faculty-owned requests, Librarian review, separate physical issue, current loan and history views, one online renewal, Librarian return handling, audit history, and an explicit Librarian-maintained holiday calendar. Only active books with `STANDARD` policy can be requested/issued. Due dates use 30 calendar days in the configured `LIBTRACK_LIBRARY_ZONE`; only configured holiday dates move due dates forward. Weekends are not inferred. Row locks and a database constraint protect copy assignment. Lost/damaged cases require notes; no fines, replacement charge, request caps, suspension rules, or restricted-material overnight rules were invented. MySQL Flyway migration and JPA schema validation remain a deployment/CI check when no MySQL service is available locally. H2 tests do not validate the engine-specific migrations.
