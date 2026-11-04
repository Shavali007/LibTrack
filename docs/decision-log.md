# LibTrack Decision Log

**Unresolved** means implementation must not assume approval. **Proposed** is a technical recommendation pending confirmation. Update linked requirements, schema, API, and tests together when a policy is approved.

| ID | Topic | Status | Record / next action |
|---|---|---|---|
| D-01 | Borrowing period | Prototype defaults implemented | Student loan term defaults to 21 days and Faculty to 30; renewal extension defaults to 21 days. Policy settings and `LIBTRACK_LIBRARY_ZONE` apply. Institutional approval of values is still required. |
| D-02 | Fine calculation | Prototype implemented; policy approval open | Current settings default to ₹10/day, ₹500 maximum per loan, and zero grace days. Overdue amounts are calculated and manual payments can be recorded. Confirm institutional schedule, currency, grace, caps, waiver/reversal, and replacement rules before use. |
| D-03 | Renewal | Prototype implemented | Semester-aware renewal limits and extension are settings; current defaults allow one renewal and a 21-day extension. Confirm interactions with reservations, overdue loans, and fines. |
| D-04 | Loan/request eligibility | Unresolved | Confirm concurrent-loan/request limits, suspension, outstanding fines and duplicate handling. |
| D-05 | Holiday calendar | Implemented | Librarians maintain holiday dates/ranges. Due-date adjustment also treats Sunday and Monday as non-working days. Configure the actual dates and `LIBTRACK_LIBRARY_ZONE`. |
| D-06 | Restricted materials | Unresolved | Confirm overnight exceptions and cutoff/return times. |
| D-07 | Lost/damaged | Unresolved | Confirm compensation, replacement and copy disposition. |
| D-08 | Identity provisioning | Implemented prototype workflow | Public Student/Faculty registration validates institutional email and password, stores a disabled account with `PENDING_APPROVAL`, and notifies Librarians. Librarian approval records reviewer/time and enables sign-in; rejection keeps the account disabled. Librarian accounts remain controlled bootstrap/admin only. The registration service does not issue email-verification tokens. Legacy verification endpoint/dev capture remain in code and are not the primary approval flow. Institutional identity provider, evidence retention, rate limiting, recovery delivery, and offboarding remain decisions. |
| D-09 | Notifications | Implemented in-app | Notifications, read state, due-date reminders, and registration/operational events exist. Retention and email/SMS delivery policies remain open. |
| D-10 | Feedback and reviews | Implemented prototype | Feedback and eligible book reviews are available. Confirm moderation, retention, eligibility, editing, and aggregation policy before institutional use. |
| D-11 | Recommendations | Partially implemented | Faculty-to-individual-Student recommendations and member views exist. Group/course recommendations and broader ranking/retention rules remain undecided. |
| D-12 | Reading insights | Not implemented | No personal reading-progress/insights API or data model is present. Define metrics, privacy, and retention before adding it. |
| D-13 | Reports | Partially implemented | Librarian dashboard and summary/report endpoints exist. Confirm any additional reports, filters, exports, and audiences. |
| D-14 | Auth transport | Implemented | Server-side Spring Security sessions, HttpOnly SameSite=Lax cookie, session-backed CSRF, BCrypt strength 12, session ID rotation, and 30-minute inactivity timeout. Require `SESSION_COOKIE_SECURE=true` behind HTTPS. Password-reset endpoints exist; production mail delivery, rate limiting, evidence retention, and institutional identity integration remain open. |
| D-15 | Technology and migrations | Decided | Angular 22 / Node 24 / TypeScript 6; Java 25 / Spring Boot 4.1.2 / Maven 3.10 / MySQL 8.4 LTS. The configured MySQL Flyway location contains V1–V22. The separate `db/migration` directory contains non-MySQL history V1–V4 and V8–V22. Validate the active MySQL scripts in CI; do not rewrite applied migrations. |
| D-16 | Architecture | Decided | One Angular frontend, one Spring Boot modular monolith, one MySQL 8.4 database; no microservices. |
| D-17 | Physical inventory | Decided | Separate `Book` metadata from `BookCopy`; derive availability from copy/loan state. |
| D-18 | Catalogue enforcement boundary | Decided for prototype | Only active STANDARD materials enter take-home requests and issue. Reference, serial, and overnight-exception items are blocked until their specific rules are approved. Catalogue inventory cannot set ON_LOAN. |

| D-19 | Borrowing and circulation slice | Implemented prototype | Member-owned requests/reservations; Librarian approval/rejection and separate issue; one active loan per copy; copy state and audit history update transactionally. Overdue fines and manual payment records are implemented. Replacement compensation and external payment processing are not. |
| D-20 | Physical inventory | Implemented | Quantity-based initial copy creation, bulk additions, and safe reconciliation are implemented. Total/availability derive from copy records; identifier uniqueness is database-enforced. |
