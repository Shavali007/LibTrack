# LibTrack Implementation Plan

This plan records the current implementation state. Features listed as implemented have corresponding backend/frontend code in the repository; policy decisions and operational readiness are tracked separately.

| Phase | Slice | Current status and remaining work |
|---|---|---|
| 0 Foundation | Angular/Spring application, environment configuration, MySQL, health, OpenAPI | Implemented. Angular and Spring Boot modular monoliths use environment-based database configuration, Flyway, and health/API documentation. |
| 1 Identity | Authentication, account creation, recovery, role enforcement | Implemented: server-side sessions, CSRF, BCrypt, Student/Faculty self-registration, disabled `PENDING_APPROVAL` accounts, Librarian review/approval/rejection, controlled Librarian provisioning/bootstrap, and password-reset endpoints. Public registration does not issue email-verification tokens. Institutional SSO/provider integration, recovery delivery, and rate limiting remain operational work. |
| 2 Catalogue | Books, authors/categories, physical and digital editions, search | Implemented: public catalogue search/details, Librarian book and physical-copy management, quantity/bulk copy creation, inventory reconciliation, and PDF edition upload/stream/download. MySQL migration validation remains a deployment/CI check. |
| 3 Members | Member directory, request review, status | Implemented: Librarian member directory/status routes and registration request queue with approval/rejection audit. |
| 4 Requests and reservations | Member requests, librarian decisions, queueing | Implemented: request submission/review, concurrency-safe copy issue, member reservation queue and lifecycle, and UI for members/Librarians. Eligibility and queue settings should be reviewed against institutional policy. |
| 5 Circulation | Issue, return, history, due dates, renewals | Implemented: issue, return/condition, audit history, role-specific policy settings, academic-semester renewal tracking, due-date calculations, holiday ranges, and due-date notifications. Current default initial terms are 21 days for Students and 30 for Faculty; current renewal defaults are one renewal with a 21-day extension. Sundays, Mondays, and configured holiday ranges affect due dates. Set the library time zone before operational use. |
| 6 Fines and exceptions | Overdue assessment, fine records/payments, lost/damaged handling | Fine assessment/recalculation, member/Librarian fine views, summaries, and manual payment recording are implemented. Prototype policy defaults are seeded in V10; institutional approval is required. External payment processing and lost/damaged replacement compensation remain unimplemented. |
| 7 Member services | Recommendations, feedback, reviews, notifications, wishlist | Implemented: Faculty-to-student recommendations, in-app notifications/read state, feedback, eligible book reviews, and wishlists. Group/course recommendations and reading-progress insights are not implemented. |
| 8 Reports | Operational summaries | Implemented: Librarian dashboard and summary report endpoints, including circulation and fine summaries. A broader export/report suite is not implemented. |
| 9 Hardening/deploy | Accessibility/security review, backups, observability, deployment | Ongoing operational work: MySQL migration/schema validation in CI, real mail provider and rate limiting, backup/restore rehearsal, HTTPS/secret management, monitoring, and policy approval. |

## Testing approach

The backend has JUnit/Spring Boot integration tests configured with H2 by default. Those tests do not prove MySQL migration compatibility. Frontend tests use Angular's Vitest runner; the production bundle is built with `npm run build`. Run a separate integration test against a fresh isolated MySQL schema to validate the active `db/migration/mysql` scripts and Hibernate schema validation. Never use a real data-bearing database as a test schema.

Keep each change scoped to a vertical slice, review forward-only migration/API changes, update these status notes, and integrate after verification. Before a real pilot, provision backups/restore, monitoring, HTTPS, and secret management.
