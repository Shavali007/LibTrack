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
| borrowing | requests, workflow orchestration, history queries | books, members, circulation |
| circulation | issue, return, renewal, holiday due dates | books, members, fines |
| fines | assessment/status/waiver | circulation, members |
| feedback | ratings and moderation | books, members |
| recommendations | category and faculty-to-student recommendations | books, members |
| notifications | in-app notifications | borrowing, circulation, recommendations |
| insights | derived personal reading summary | borrowing, circulation, books |
| reports | librarian reporting queries | books, members, borrowing, circulation, fines |
| common | API errors, configuration, audit primitives | no business module dependency |

Use service interfaces and identifiers across modules; avoid cross-module repository access. Defer group/course modeling until an authoritative source exists.

## Authentication and authorization
Use one identity flow for all roles, adaptive password hashes, deny-by-default Spring Security, and service-level ownership checks. Faculty has only explicitly permitted student operations and no librarian permissions. Never store/log plaintext passwords. Do not trust route guards. Before production, decide session/cookie or bearer-token transport, expiration/refresh, CSRF, account recovery, and provisioning. Require HTTPS in deployment.

## Transactions for borrowing
Approval and copy selection must atomically recheck eligibility/availability, transition request state, and record assignment. Issue atomically records loan, due date, and copy state. Return atomically records return, lateness/fine outcome, and copy state. Renewal atomically checks ownership, active state, renewal count, and approved reservation rules. Use row locks or optimistic versioning and a database constraint allowing at most one active loan per copy. Create notifications after commit; use an outbox if delivery reliability requires it.

## Deployment
Build static frontend assets and run a single backend against PostgreSQL initially. Supply configuration through environment variables/secret management. Backups, observability, retention, and scale-out policy are release decisions.
