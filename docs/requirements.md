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
1. The 30-day loan period is an assumption explicitly requiring library verification.
2. Fine rate and calculation structure are unspecified.
3. Loan/request limits, eligibility, request expiry, duplicate handling, suspension, and outstanding-fine effects are unspecified.
4. “One online renewal” scope, renewal duration, and reservation interaction need confirmation.
5. Holiday ownership, weekends, consecutive closures, and due-date rollover are not defined.
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

The current profile endpoint (`GET /api/v1/auth/me`) supplies only the authenticated account's UUID, email, and role. The dashboard may use the real email and current date, but no display name is available. The backend currently implements no catalogue, member, borrowing, request, fine, recommendation, notification, bookmark, quotation, or reading-progress entity/API; proposed contracts in `api-contracts.md` and proposed entities in `database-design.md` are not live functionality. These areas are shown as clearly unavailable or omitted from active navigation. Catalogue search must be implemented before it can be an active action. Reading goals and page-level progress need separate approved data models; loan records must not be treated as reading statistics. No sample records or demonstration metrics are allowed in production UI.

## Catalogue implementation status

SRS-FR-03, SRS-FR-04, and SRS-FR-05 now have an initial implementation: Librarians can create, edit, and deactivate catalogue records and manage physical-copy inventory; authenticated users can search by keyword/title/author/ISBN/category and see derived available-copy counts. Records are never seeded with demonstration titles. Reference/serial/overnight exception policy is stored as descriptive metadata; issue eligibility and overnight exception enforcement remain pending circulation policy decisions.
