# LibTrack API Contracts

## Conventions
Base path `/api/v1`; JSON DTOs, ISO-8601 timestamps with offsets, opaque UUIDs. Authenticated routes require a server-validated principal. Lists accept `page` (0-based), `size` (default 20, maximum 100), and allowlisted `sort`; response `{content,page,size,totalElements,totalPages}`. Validate filters and never expose persistence entities.

## Authentication

| Method/path | Access | Contract |
|---|---|---|
| `GET /auth/csrf` | Public | Creates/returns a session-bound CSRF token `{headerName,token}`. The client must send that token in the named header for login/logout. |
| `POST /auth/login` | Public with valid CSRF token | `{email,password}` -> 200 `{id,email,role}` and an HttpOnly session cookie. Invalid/disabled accounts receive the same 401 response. |
| `GET /auth/me` | Authenticated session | Current safe profile `{id,email,role}`. |
| `POST /auth/logout` | Authenticated session with valid CSRF token | Invalidates session -> 204. |
| `POST /librarian/accounts` | Librarian only | `{email,institutionalId,password,role:STUDENT|FACULTY,identityVerified:true}` -> 201 safe profile. Librarian attests that the college identity was checked; this prototype does not call an institutional service. Duplicate email/identity -> generic 409. Other roles are rejected. |
| `POST /librarian/accounts/{accountId}/disable` | Librarian only | Deactivates the account -> 204; disabled accounts cannot authenticate. |

There is no public registration route. Students and Faculty are provisioned by an authorized Librarian after manual identity verification. Only a trusted operator can create the first Librarian through the one-time interactive CLI bootstrap documented in the README; the HTTP API cannot assign Librarian. Bootstrap accepts a hidden password prompt and refuses to run with a web server. Provisioning requests and responses redact/exclude credentials.

Sessions use server-side storage and an HttpOnly, SameSite=Lax cookie. Configure `SESSION_COOKIE_SECURE=true` behind HTTPS. Session inactivity timeout is 30 minutes by default and can be set with `SESSION_TIMEOUT`. Never return password hashes or store session tokens in browser storage.

## Catalogue and members

| Method/path | Access | Contract |
|---|---|---|
| `GET /books` | Authenticated | Filters `q,title,author,isbn,categoryId,available`; paginated summary with derived availability. |
| `GET /books/{id}` | Authenticated | Metadata, authors/categories and availability summary; no private loan details. |
| `POST /books` | Librarian | `{isbn?,title,edition?,publisher?,publicationYear?,authorIds[],categoryIds[]}` -> 201 detail. |
| `PATCH /books/{id}` | Librarian | Validated metadata update -> detail. |
| `GET /members` | Librarian | `q,role,active` filters; safe paginated summary. |
| `GET /members/{id}` | Librarian or self | Profile and permitted borrowing summary. |
| `PATCH /members/{id}` | Librarian | Approved fields/status only. |

## Borrowing and circulation

| Method/path | Access | Contract |
|---|---|---|
| `POST /borrow-requests` | Student/faculty | `{bookId}` -> 201 request; server checks approved eligibility, duplicates, availability. |
| `GET /borrow-requests/mine` | Student/faculty | Own paginated requests. |
| `GET /borrow-requests` | Librarian | Queue filters: status, memberId, bookId, submitted date range. |
| `POST /borrow-requests/{id}/decision` | Librarian | `{decision: APPROVE|REJECT,reason?}` -> updated request; atomic recheck. |
| `POST /loans/{id}/issue` | Librarian | `{copyId}` -> 201 loan with approved due date. |
| `GET /loans/mine` | Student/faculty | Own current loans, due dates and renewal/fine summary. |
| `GET /loans/mine/history` | Student/faculty | Own paginated borrowing history. |
| `GET /loans` | Librarian | Circulation filters: memberId, status, dueBefore. |
| `POST /loans/{id}/return` | Librarian | `{condition:GOOD|DAMAGED|LOST,note?}` -> recorded return and policy outcome. |
| `POST /loans/{id}/renew` | Eligible member or librarian | `{}` -> updated loan; approved interpretation of one online renewal applies. |
| `GET /fines/mine` | Student/faculty | Own fine summaries/status. |
| `GET /fines` | Librarian | Paginated member/status filters. |
| `POST /fines/{id}/waive` | Librarian | `{reason}`; actor and rationale audited. |
| `GET /holidays` | Authenticated | Date-range holiday list. |
| `POST /holidays` | Librarian | `{date,name}` -> 201 holiday. |

## Smart Services and reports

| Method/path | Access | Contract |
|---|---|---|
| `GET /recommendations/mine` | Student/faculty | Category suggestions with factual reason and availability. |
| `POST /recommendations` | Faculty | `{recipientMemberId,bookId,note?}`; individual only. |
| `GET /recommendations/inbox` | Student/faculty | Own incoming recommendations. |
| `GET /interests/mine`, `PUT /interests/mine` | Student/faculty | Get/replace `{categoryIds[]}`. |
| `POST /books/{id}/feedback` | Student/faculty | `{rating,text?}`; moderation rules pending. |
| `GET /books/{id}/feedback` | Authenticated | Paginated approved feedback; aggregation pending policy. |
| `GET /notifications` | Authenticated | Own notifications, optional unreadOnly. |
| `POST /notifications/{id}/read` | Owner | Mark own notification read. |
| `GET /insights/reading` | Student/faculty | Own derived summary; metric/time/privacy decisions pending. |
| `GET /reports/availability`, `/reports/issued`, `/reports/overdue`, `/reports/transactions` | Librarian | Paginated operational reports with date/status/member/book filters. Individual reminder delivery remains excluded. |

## Errors and validation
Return `application/problem+json` for framework validation errors. Invalid login returns `401` with `{code:"INVALID_CREDENTIALS",message:"Email or password is incorrect."}` for unknown, wrong-password, disabled, or locked accounts. A missing/invalid CSRF token returns `403`. Use 401 unauthenticated, 403 forbidden, 404 missing, 409 state/concurrency conflict, and 500 with no internal details. Validate identifiers, lengths, enums, dates, and pagination at API and service layers. Do not leak private record existence. Business eligibility is checked in services.
