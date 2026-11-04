# LibTrack API Contracts

## Conventions
Base path `/api/v1`; JSON DTOs, ISO-8601 timestamps with offsets, opaque UUIDs. Authenticated routes require a server-validated principal. Paginated endpoints accept `page` (0-based) and `size` (default 20, maximum 100); paginated responses use `{content,page,size,totalElements,totalPages}`. Validate filters and never expose persistence entities.

## Implementation status

The API has implemented controllers for authentication and account review/provisioning, catalogue and inventory, digital editions, borrowing/circulation/reservations, fines, notifications, feedback and book reviews, recommendations, wishlists, library policies/settings, and librarian reports. `GET /api/v1/librarian/reports/summary` is the current report summary endpoint; a general report/export suite and reading-insight API are not present. Standard take-home circulation is enforced; reference, serial, and overnight exceptions remain unavailable.

## Authentication

| Method/path | Access | Contract |
|---|---|---|
| `GET /auth/csrf` | Public | Creates/returns a session-bound CSRF token `{headerName,token}`. The client sends it in the named header for state-changing requests. |
| `POST /auth/login` | Public with valid CSRF token | `{email,password}` -> 200 safe profile `{id,email,role,displayName}` and an HttpOnly session cookie. Wrong credentials return a generic 401; pending or rejected registration states return their account-state error. |
| `POST /auth/register` | Public with valid CSRF token | `{username?,fullName?,institutionalId?,email,password,confirmPassword,role:STUDENT|FACULTY}` -> 202 `{status:PENDING_APPROVAL,message}`. The account is BCrypt-hashed, disabled, and sent to the Librarian member-request queue. It is not signed in or activated by registration. Public callers cannot request Librarian. |
| `POST /librarian/member-requests/{requestId}/approve` | Librarian | Approves a pending registration and enables the account; the actor and review time are recorded. |
| `POST /librarian/member-requests/{requestId}/reject` | Librarian | Rejects a pending registration; the account remains disabled and a reason is recorded. |
| `POST /auth/forgot-password`, `POST /auth/reset-password` | Public with valid CSRF token | Password-recovery request and one-time token reset flows. Reset tokens are single-use and persisted as hashes. Production delivery is unavailable until a provider is configured. |
| `POST /auth/verify-email` | Public with valid CSRF token | Legacy token endpoint remains in the codebase. The current `/auth/register` workflow does not issue these tokens; a valid token produced by the separate development-only reissue tool can activate a pending self-registration. Do not treat this as the normal librarian-approval workflow. |
| `/dev/mail-capture` | Loopback only, development profile only | Legacy development-only email verification capture, diagnostics, and reissue tools. The controller is absent outside development. Reissuing for an eligible pending self-registration creates a token that can activate it through `/auth/verify-email`; this is separate from Librarian review. |
| `GET /auth/me` | Authenticated session | Current safe profile `{id,email,role,displayName}`. |
| `POST /auth/logout` | Authenticated session with valid CSRF token | Invalidates session -> 204. |
| `POST /librarian/accounts` | Librarian only | `{email,institutionalId,password,role:STUDENT|FACULTY,identityVerified:true}` -> 201 safe profile. Librarian attests that the college identity was checked; this prototype does not call an institutional service. Duplicate email/identity -> generic 409. Other roles are rejected. |
| `POST /librarian/accounts/{accountId}/disable` | Librarian only | Deactivates the account -> 204; disabled accounts cannot authenticate. |
| `PATCH /auth/profile` | Authenticated session | Updates the authenticated user's display name and returns the safe profile. |

Public self-registration is available only for Student and Faculty at `POST /auth/register`; it validates institutional email and password policy, stores a BCrypt-hashed disabled account, notifies Librarians, and returns `PENDING_APPROVAL`. A Librarian must review and approve the request before normal sign-in. This registration service does not create an email-verification token or require email delivery. A separate legacy verification service and development mail-capture endpoint remain in the codebase and are not the primary registration flow. Librarian accounts remain limited to the controlled interactive CLI bootstrap/administrative process; HTTP APIs cannot assign Librarian.

Sessions use server-side storage and an HttpOnly, SameSite=Lax cookie; session fixation protection rotates the session ID after login. CSRF is enabled for mutations. Configure `SESSION_COOKIE_SECURE=true` behind HTTPS. Session inactivity timeout is 30 minutes by default and can be set with `SESSION_TIMEOUT`. Never return password hashes or store session tokens in browser storage. The API uses sessions, not JWT bearer tokens.

## Catalogue and members

The public catalogue read surface contains active book metadata, categories, and aggregate physical-copy availability. It does not return member data, copy identifiers, or copy locations. Inactive records are visible only to authenticated Librarians. Catalogue mutations and physical inventory access remain Librarian-only.

| Method/path | Access | Contract |
|---|---|---|
| `GET /books` | Public | Filters `q,title,author,isbn,category,available`; paginated summary with total, available, on-loan, lost, damaged, and withdrawn copy counts; sort by title, publicationYear, or createdAt. |
| `GET /books/{id}` | Public | Metadata, authors/categories and per-status inventory summary; inactive record is visible only to Librarian. Total includes withdrawn records; available counts only `AVAILABLE` copies. |
| `POST /books` | Librarian | Validated title, optional checksummed ISBN, author/category names, metadata, cover URL and circulation policy -> 201 detail. Optional `numberOfCopies` (1–500) and optional `location` create that many available physical copies with the given location atomically; omitting quantity preserves the legacy metadata-only behavior. |
| `PATCH /books/{id}` | Librarian | Validated metadata update -> detail. Copy quantity is not an edit operation; inventory remains managed through copy workflows. |
| `POST /books/{id}/deactivate` | Librarian | Soft-deactivates the record; copies/history are retained. |
| `GET /books/{id}/copies` | Librarian | Physical inventory details; never exposed publicly or to members. |
| `POST /books/{id}/copies` | Librarian | Adds an initially available uniquely identified physical copy. |
| `POST /books/{id}/copies/bulk` | Librarian | `{numberOfCopies, location}` creates 1–500 available copies atomically and returns the created copy records. |
| `PATCH /books/{id}/copies/{copyId}` | Librarian | Updates copy identifier/location/manageable status; ON_LOAN is circulation-managed. |
| `POST /books/{id}/inventory/reconcile` | Librarian | `{targetQuantity, location?}` reconciles total physical copies to target: generates additional copies if target > current, or safely deletes unreferenced available copies if target < current. Rejects with 409 if reduction exceeds available unreferenced copies or if copies are on loan/have history. |
| `GET /books/{id}/digital-edition` | Public | Returns active digital edition metadata `{id,bookId,originalFilename,contentType,fileSize,editionLabel,uploadedAt}` or 404 if not present. |
| `POST /books/{id}/digital-edition` | Librarian | Multipart `file` (max 25MB PDF, verified magic header `%PDF-`) + optional `editionLabel`. Uploads and associates digital PDF edition with book record -> 201. Replaces any prior edition if present. |
| `PUT /books/{id}/digital-edition` | Librarian | Multipart `file` + optional `editionLabel`. Replaces active edition and deletes old file -> 200. |
| `DELETE /books/{id}/digital-edition` | Librarian | Removes digital edition metadata and deletes stored PDF file -> 204. Physical copies and circulation state remain completely untouched. |
| `GET /books/{id}/digital-edition/content` | Student, Faculty, Librarian | Streams PDF inline (`Content-Disposition: inline; filename="..."`, `application/pdf`, `X-Content-Type-Options: nosniff`). Requires active book (or Librarian access). |
| `GET /books/{id}/digital-edition/download` | Student, Faculty, Librarian | Downloads PDF as attachment (`Content-Disposition: attachment; filename="..."`, `application/pdf`). Requires active book (or Librarian access). |
| `GET /categories` | Public | Existing category values for catalogue filters. |
| `GET /librarian/member-requests` and `/librarian/member-requests/{id}` | Librarian | Pending/current member-registration queue, filters, counts, and request details. Approve/reject actions are listed above. |
| `/librarian/members` and `/librarian/members/{memberId}` | Librarian | Member directory, detail, and status/enable/disable operations. |
## Borrowing and circulation

| Method/path | Access | Contract |
|---|---|---|
| `POST /borrow-requests` | Student/faculty | `{bookId}` -> 201 own request; only active STANDARD books are accepted. |
| `GET /borrow-requests/mine` | Student/faculty | Own paginated requests. |
| `GET /borrow-requests` | Librarian | Paginated queue, optional `status` and `bookId` filters. |
| `POST /borrow-requests/{requestId}/decision` | Librarian | `{decision: APPROVE|REJECT,reason?}` -> updated request. Only pending requests; a Librarian cannot decide their own request. |
| `POST /borrow-requests/{requestId}/issue` | Librarian | `{copyId,note?}` -> 201 loan; separate from approval, locks the request/copy, requires an available copy for the approved book. |
| `GET /loans/mine` | Student/faculty | Own active loans and due dates. |
| `GET /loans/mine/history` | Student/faculty | Own paginated borrowing history. |
| `GET /loans` | Librarian | Paginated filters `status`, `dueBefore`, `overdueOnly`. |
| `POST /loans/{loanId}/return` | Librarian | `{condition:GOOD|DAMAGED|LOST,note?}` -> recorded return; DAMAGED/LOST require a case note. Overdue fine assessment is implemented separately; replacement compensation is not. |
| `POST /loans/{loanId}/renew` | Owner Student/Faculty | Applies current role/semester renewal settings to an eligible loan. Current default settings allow one renewal and extend by 21 days; policy settings are authoritative. |
| `GET /holidays` | Authenticated | Configured holiday ranges. Due-date logic also treats Sundays and Mondays as non-working days; set `LIBTRACK_LIBRARY_ZONE` correctly. |
| `POST /holidays` | Librarian | `{fromDate,toDate,name}` creates a date range; `{holidayDate,name}` remains accepted for a single date -> 201. |
| `PUT /holidays/{holidayId}` | Librarian | Updates the date range/name using the same `LibraryHolidayInput` shape. |
| `DELETE /holidays/{holidayId}` | Librarian | Removes a configured date range. No dates are seeded by the migration. |

## Smart Services and reports

Implemented feedback routes are `POST /feedback`, `GET /feedback/mine`, and Librarian-only `GET /librarian/feedback`. Book-review routes provide list/summary/eligibility/create; `/recommendations` supports Faculty recommendations and member views; `/wishlist`; `/notifications` and read-state actions; `/reservations` for Student/Faculty; and Librarian fine and report endpoints. Fine routes include `GET /fines/mine`, `GET /librarian/fines`, `GET /librarian/fines/summary`, `GET /librarian/fines/policy`, and `POST /librarian/fines/{fineId}/payments` (manual payment recording, not an external payment gateway). Policy reads are available under `/policies`; Librarian settings use `/librarian/settings`. The only general report endpoint currently implemented is `/librarian/reports/summary`. There is no reading-insights API, general report export suite, or external payment integration.

## Errors and validation
Return `application/problem+json` for framework validation errors. Unknown emails, wrong passwords, and locked/expired accounts return `401` with `{code:"INVALID_CREDENTIALS",message:"Email or password is incorrect."}`. Disabled accounts return `401` with an account-state code: `ACCOUNT_PENDING_APPROVAL`, `ACCOUNT_REJECTED`, or `ACCOUNT_NOT_ACTIVE`. A missing/invalid CSRF token returns `403`. Use 401 unauthenticated, 403 forbidden, 404 missing, 409 state/concurrency conflict, and 500 with no internal details. Validate identifiers, lengths, enums, dates, and pagination at API and service layers. Do not leak private record existence. Business eligibility is checked in services.
