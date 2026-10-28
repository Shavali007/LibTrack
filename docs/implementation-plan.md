# LibTrack Implementation Plan

Deliver small vertical slices. Policy-dependent exceptions remain disabled until their required decisions are confirmed.

| Phase | Slice | Completion checks |
|---|---|---|
| 0 Foundation | Angular/Spring scaffolds, environment config, MySQL, health endpoint, OpenAPI and CI | Clean builds, health integration test, no committed secrets |
| 1 Identity | Implemented: session login/logout/current user, Librarian-provisioned Student/Faculty accounts, interactive offline Librarian bootstrap, pending Student/Faculty self-registration, and single-use email verification. Development captures verification messages in memory behind the explicit localhost-only development profile; production fails closed until a provider is configured. Public registration hashes credentials and never auto-logs-in. Backend role remains authoritative; no public Librarian assignment. | Auth/provisioning/registration tests cover hashing, sessions, CSRF, roles, password and institutional email validation, duplicates, and blocked pending accounts. MySQL migration integration remains to run in CI. |
| 2 Catalogue | Books, authors/categories, copies, search/availability | Implemented: Flyway V3, public read-only catalogue APIs, Librarian-secured writes and physical inventory, search/pagination, computed availability, Angular public browse/detail and librarian management screens; automated coverage added. MySQL migration integration still needs CI execution. Circulation policy enforcement remains in Phase 5. |
| 3 Members | Member administration and status | Librarian gate and inactive-member tests |
| 4 Requests | Submit, review, approve/reject, concurrency-safe assignment | Implemented in Flyway V4, secured APIs, audit history, and Angular member/Librarian pages. Only active STANDARD books are eligible; policy limits remain open. |
| 5 Circulation | Issue, return, history, holidays, one renewal | Implemented in Flyway V4 and Angular member/Librarian screens. Thirty calendar days and one renewal are set; explicit holiday dates only. H2-backed automated tests; MySQL migration integration still requires execution. |
| 6 Fines/exceptions | Fine assessment/waiver, lost/damaged records | Approved fine/replacement policies, audit and idempotency checks |
| 7 Smart Services | Category/faculty recommendations, feedback, notifications, insights | Ownership, moderation, privacy and derivation tests; groups deferred |
| 8 Reports | Availability, issued, overdue, transactions | Authorization/filter tests and reconciliation against source records |
| 9 Hardening/deploy | Accessibility/security review, backups, observability, deployment/runbook | Critical E2E, dependency review, restore rehearsal, HTTPS/secrets checks |

## Testing approach
Backend uses JUnit 5, Mockito and Spring Boot integration tests with MySQL-compatible infrastructure. Frontend uses Angular component/service tests for states, validation and accessibility. E2E covers login, search, request, decision, issue, return, history and fine outcomes once policies are approved. Test cross-member access and faculty attempts at librarian actions. Report only test commands that actually pass.

Keep each change scoped to one vertical slice, review migrations/API changes, update documentation, and then integrate. Before a real pilot, provision backups/restore, monitoring, HTTPS, and secret management.
