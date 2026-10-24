# LibTrack Implementation Plan

Deliver small vertical slices and do not build policy-dependent circulation behavior until its required decisions are confirmed.

| Phase | Slice | Completion checks |
|---|---|---|
| 0 Foundation | Angular/Spring scaffolds, environment config, PostgreSQL, health endpoint, OpenAPI and CI | Clean builds, health integration test, no committed secrets |
| 1 Identity | Registration, login, current user, roles and authorization | Hashing, registration role assignment, ownership and authorization tests |
| 2 Catalogue | Books, authors/categories, copies, search/availability | Migration, CRUD, search and Angular service/form tests |
| 3 Members | Member administration and status | Librarian gate and inactive-member tests |
| 4 Requests | Submit, review, approve/reject, concurrency-safe assignment | End-to-end request/decision flow; eligibility policy confirmed |
| 5 Circulation | Issue, return, history, holidays, one renewal | Transaction/concurrency and date boundary tests; loan term confirmed |
| 6 Fines/exceptions | Fine assessment/waiver, lost/damaged records | Approved fine/replacement policies, audit and idempotency checks |
| 7 Smart Services | Category/faculty recommendations, feedback, notifications, insights | Ownership, moderation, privacy and derivation tests; groups deferred |
| 8 Reports | Availability, issued, overdue, transactions | Authorization/filter tests and reconciliation against source records |
| 9 Hardening/deploy | Accessibility/security review, backups, observability, deployment/runbook | Critical E2E, dependency review, restore rehearsal, HTTPS/secrets checks |

## Testing approach
Backend uses JUnit 5, Mockito and Spring Boot integration tests with PostgreSQL-compatible infrastructure. Frontend uses Angular component/service tests for states, validation and accessibility. E2E covers login, search, request, decision, issue, return, history and fine outcomes once policies are approved. Test cross-member access and faculty attempts at librarian actions. Report only test commands that actually pass.

Keep each change scoped to one vertical slice, review migrations/API changes, update documentation, and then integrate. Before a real pilot, provision backups/restore, monitoring, HTTPS, and secret management.
