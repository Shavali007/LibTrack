# LibTrack Architecture

## System shape
One Angular frontend, one Spring Boot modular monolith, and one MySQL 8.4 database. The browser uses JSON REST endpoints over HTTPS in deployment. Business modules run in one backend process; no microservices.

```text
Angular browser -- HTTPS/JSON --> Spring Boot modules --> MySQL
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
| MySQL | 8.4 LTS | Supported Flyway/JDBC target; pin the server patch/digest. |
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
Public Student/Faculty registration validates the role-specific VIT-AP email convention, password policy and confirmation, normalizes email, hashes passwords, and creates a disabled `SELF_REGISTRATION` account with no institutional ID or verification attestation. There is no email delivery infrastructure; no token or delivery is pretended and these accounts cannot access authenticated features. Production activation requires institutional mail delivery, unpredictable single-use expiring verification tokens, safe token storage, abuse rate limiting, and backend verified-only activation. The separate Librarian provisioning process still records its verified identity attestation. Librarian accounts remain bootstrap/administrative only.

## Transactions for borrowing
Librarian approval and physical issue are separate actions. Issue locks the approved request and selected copy, checks active STANDARD book eligibility and copy availability, then records loan, 30-calendar-day due date, audit history, and ON_LOAN state in one transaction. Return locks the loan/copy, records condition and case note, then updates the copy state atomically. Renewal enforces owner, active STANDARD loan, one-renewal limit, and ON_LOAN copy; it adds 30 calendar days to prior due date. A generated nullable key with a unique index prevents concurrent active loans for a copy on MySQL (the historical PostgreSQL migration uses a partial unique index). Due dates move only across explicitly configured holiday dates; weekends are not implicit closures. No fine or replacement amount is assessed.

## Deployment
Build static frontend assets and run a single backend against MySQL 8.4. Supply configuration through environment variables/secret management. Backups, observability, retention, and scale-out policy are release decisions.

## Catalogue implementation status

The catalogue module is implemented as a vertical slice: validated book metadata, author/category normalization, search/filter/pagination, derived copy availability, librarian copy inventory, soft deactivation, and Angular browse/detail/create/edit/copy-management views. Search, category, and active-book detail reads are public and return only catalogue metadata with aggregate availability. Spring Security and service methods continue to authorize all catalogue writes for Librarians, while physical copy inventory reads remain Librarian-only. The frontend consumes only API records and provides an elegant fallback when a cover URL is absent or fails. Catalogue policy metadata is now enforced by circulation: only active `STANDARD` books may be requested and issued; other policy values remain blocked pending explicit operating rules.


## Implemented circulation slice

Flyway V4 persists member requests, request events, loans, loan events, and an explicit holiday calendar. Spring Security keeps session/CSRF behavior unchanged; method-level role checks authorize member and Librarian operations and service methods recheck account status, ownership, and state. Angular provides member request/loan views and Librarian request/circulation desk views. Active STANDARD-only circulation is implemented; reference, serial, and overnight exception rules remain disabled. The configured library zone must match the institution before use.


## Database engine and migration history

MySQL 8.4 is the active runtime target. Spring Boot uses the MySQL Connector/J driver and UTC-normalized `DATETIME(6)` values for `Instant`; library business dates remain SQL `DATE`. Flyway defaults to `classpath:db/migration/mysql`. PostgreSQL V1–V4 remain unchanged under `classpath:db/migration` to preserve checksums and historical deployment evidence. The MySQL V1–V4 scripts create the equivalent logical model for a fresh MySQL database. This is not an in-place conversion: populated PostgreSQL data requires a separately planned/exported/imported transfer.
