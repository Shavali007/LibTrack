# LibTrack Decision Log

**Unresolved** means implementation must not assume approval. **Proposed** is a technical recommendation pending confirmation. Update linked requirements, schema, API, and tests together when a policy is approved.

| ID | Topic | Status | Record / next action |
|---|---|---|---|
| D-01 | Borrowing period | Decided for prototype | 30 calendar days from issue; a single renewal adds 30 calendar days to the prior due date. Configure `LIBTRACK_LIBRARY_ZONE` for the actual library. |
| D-02 | Fine calculation | Unresolved | Amount/rate absent. Confirm schedule, grace period, caps, currency, waiver. |
| D-03 | Renewal | Decided for prototype | One online renewal per active STANDARD loan, by the borrower, extends the prior due date by 30 calendar days before holiday adjustment. No reservation, overdue, or fine-based restrictions are added because those policies are unconfirmed. |
| D-04 | Loan/request eligibility | Unresolved | Confirm concurrent-loan/request limits, suspension, outstanding fines and duplicate handling. |
| D-05 | Holiday calendar | Decided for prototype | An explicit calendar is maintained by Librarians; due dates shift across consecutive configured holiday dates. Weekends are not implicitly holidays. Actual dates and the library time zone must be configured. |
| D-06 | Restricted materials | Unresolved | Confirm overnight exceptions and cutoff/return times. |
| D-07 | Lost/damaged | Unresolved | Confirm compensation, replacement and copy disposition. |
| D-08 | Identity provisioning | Prototype policy | Public registration may create Student/Faculty pending accounts only; Librarian remains controlled bootstrap/admin only. Student email local part is `^[A-Za-z]+\.[0-9]{2}[A-Za-z]{3}[0-9]{4,5}` plus exact `@vitapstudent.ac.in`; Faculty uses a 1–64 character RFC-style allowlist local part containing an ASCII letter and exact `@vitap.ac.in`. Emails normalize to lowercase. Development uses an in-memory captured email adapter only under the explicit development profile, with loopback-only inspection. Tokens contain 256 bits of CSPRNG entropy, are SHA-256 hashed at rest, expire after 24 hours by default, and are single-use under a row lock. Outside development/test, registration fails closed until a real provider is configured. Institutional provider, rate limiting, identity evidence/retention, recovery, and offboarding remain decisions. |
| D-09 | Notifications | Unresolved | Define in-app events, read/retention; SRS excludes individual reminders. Email/SMS remain out of scope. |
| D-10 | Feedback | Unresolved | Confirm rating scale, one-rating rule, edits/deletion, moderation, aggregation. |
| D-11 | Recommendations | Unresolved | Define ranking/exclusions/expiry/visibility; group support awaits authoritative group/course data. |
| D-12 | Reading insights | Unresolved | Define metrics, window, privacy and retention. |
| D-13 | Reports | Unresolved | Confirm report list, filters, export and audiences. |
| D-14 | Auth transport | Decided for initial slice | Server-side Spring Security sessions, HttpOnly SameSite=Lax cookie, session-backed CSRF token, BCrypt strength 12, and 30-minute inactivity timeout. Require `SESSION_COOKIE_SECURE=true` behind HTTPS. Account recovery, rate limiting, evidence retention, and institutional identity integration remain open. |
| D-15 | Technology | Decided | Angular 22 / Node 24 / TypeScript 6; Java 25 / Spring Boot 4.1.2 / Maven 3.10 / MySQL 8.4 LTS. Keep PostgreSQL V1–V4 unchanged as historical migrations; MySQL uses a parallel Flyway location. Recheck in CI. |
| D-16 | Architecture | Decided | One Angular frontend, one Spring Boot modular monolith, one MySQL 8.4 database; no microservices. |
| D-17 | Physical inventory | Decided | Separate `Book` metadata from `BookCopy`; derive availability from copy/loan state. |
| D-18 | Catalogue enforcement boundary | Decided for prototype | Only active STANDARD materials enter take-home requests and issue. Reference, serial, and overnight-exception items are blocked until their specific rules are approved. Catalogue inventory cannot set ON_LOAN. |

| D-19 | Borrowing and circulation slice | Decided for prototype | Member-owned requests; Librarian approval/rejection and separate issue; one active loan per copy; copy state and audit history updated transactionally. Fine/replacement policy remains unimplemented. |
