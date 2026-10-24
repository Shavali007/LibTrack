# LibTrack Architecture

## System shape
One Angular frontend, one Spring Boot modular monolith, and one PostgreSQL database. The browser uses JSON REST endpoints over HTTPS in deployment. Business modules run in one backend process; no microservices.

```text
Angular browser -- HTTPS/JSON --> Spring Boot modules --> PostgreSQL
                                  REST + services         JPA + Flyway
```

## Version baseline

| Component | Baseline | Rationale |
|---|---|---|
| Angular / CLI | 22.2.x (locked CLI/build 22.2.4, framework 22.2.3) | Active Angular 22 line; official compatibility table includes Node 24 and TypeScript 6. |
| Node.js | 24 LTS (observed 24.22.1) | LTS runtime accepted by Angular 22. |
| TypeScript | 6.0.3 (locked) | Angular 22 supports >=6.0 and <6.1. |
| Java | 25 (observed JDK 25.0.1) | Available locally and supported by the selected Spring baseline. |
| Spring Boot | 4.1.2 | Stable release; official system requirements say Java 17+ and Maven 3.6.3+. |
| PostgreSQL | 17.x | Conservative relational baseline; pin deployment patch/digest. |
| Maven | 3.10.0 (observed) | Satisfies the Spring Boot Maven requirement; direct launcher works in the managed environment. |

References: [Angular compatibility](https://angular.dev/reference/versions), [Spring Boot requirements](https://docs.spring.io/spring-boot/system-requirements.html), [Node release schedule](https://nodejs.org/en/about/previous-releases). Verify patch compatibility in CI when dependency installation is available.

## Responsibilities and modules

Frontend: standalone feature components, router, Reactive Forms, HttpClient, accessible design system. Client validation and route guards improve usability but are not security boundaries.
Backend: authentication/authorization, business rules, DTO validation, transaction boundaries, persistence, API errors, OpenAPI. Use Flyway as the only schema evolution mechanism.

| Module | Owns | Dependencies |
|---|---|---|
| auth | credentials, registration, role resolution | members, common |
| books | title metadata, authors/categories, physical copies, search | common |
| members | member profile/status | auth, common |
| borrowing | member-owned requests, Librarian review, workflow/history | books, auth, circulation |
| circulation | issue, return, renewal, explicit holiday due dates | books, auth |
| fines | assessment/status/waiver | circulation, members |
| feedback | ratings and moderation | books, members |
| recommendations | category and faculty-to-student recommendations | books, members |
| notifications | in-app notifications | borrowing, circulation, recommendations |
| insights | derived personal reading summary | borrowing, circulation, books |
| reports | librarian reporting queries | books, members, borrowing, circulation, fines |
| common | API errors, configuration, audit primitives | no business module dependency |

Use service interfaces and identifiers across modules; avoid cross-module repository access. Defer group/course modeling until an authoritative source exists.

## Authentication and authorization
Use BCrypt password hashes, deny-by-default Spring Security, and service-level authorization. Sessions use an HttpOnly SameSite=Lax cookie, session-backed CSRF protection, and a 30-minute inactivity timeout. Set `SESSION_COOKIE_SECURE=true` behind HTTPS. A Librarian provisions Students and Faculty after manually checking institutional identity; the server stores the institutional identifier, verification timestamp, and creating account. The `identityVerified` field is an accountable operator attestation, not a real verification API or college approval process. There is no public registration and the API only accepts Student or Faculty roles. The first Librarian is created by a one-time, interactive, no-web-server CLI command that prompts for email and a hidden, confirmed password; it refuses if any Librarian already exists. Never store/log plaintext passwords or expose password hashes. Do not trust route guards. Production identity integration, verification evidence/retention, account recovery, and rate limiting remain open. Require HTTPS in deployment.

## Transactions for borrowing
Librarian approval and physical issue are separate actions. Issue locks the approved request and selected copy, checks active STANDARD book eligibility and copy availability, then records loan, 30-calendar-day due date, audit history, and ON_LOAN state in one transaction. Return locks the loan/copy, records condition and case note, then updates the copy state atomically. Renewal enforces owner, active STANDARD loan, one-renewal limit, and ON_LOAN copy; it adds 30 calendar days to prior due date. A partial unique index prevents concurrent active loans for a copy. Due dates move only across explicitly configured holiday dates; weekends are not implicit closures. No fine or replacement amount is assessed.

## Deployment
Build static frontend assets and run a single backend against PostgreSQL initially. Supply configuration through environment variables/secret management. Backups, observability, retention, and scale-out policy are release decisions.

## Catalogue implementation status

The catalogue module is implemented as a vertical slice: validated book metadata, author/category normalization, search/filter/pagination, derived copy availability, librarian copy inventory, soft deactivation, and Angular browse/detail/create/edit/copy-management views. Spring Security requires an authenticated session for catalogue APIs; service methods authorize all writes for Librarians, and copy inventory reads are Librarian-only. The frontend consumes only API records and provides an elegant fallback when a cover URL is absent or fails. Catalogue policy metadata is now enforced by circulation: only active `STANDARD` books may be requested and issued; other policy values remain blocked pending explicit operating rules.


## Implemented circulation slice

Flyway V4 persists member requests, request events, loans, loan events, and an explicit holiday calendar. Spring Security keeps session/CSRF behavior unchanged; method-level role checks authorize member and Librarian operations and service methods recheck account status, ownership, and state. Angular provides member request/loan views and Librarian request/circulation desk views. Active STANDARD-only circulation is implemented; reference, serial, and overnight exception rules remain disabled. The configured library zone must match the institution before use.
