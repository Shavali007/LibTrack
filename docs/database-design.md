# LibTrack Database Design

MySQL 8.4 is the durable source of truth. Book metadata is separated from physical copies. Derive availability from copy/loan state instead of storing duplicated counts. Use UUID identifiers, foreign keys, timestamps, explicit statuses, and Flyway migrations.

## Current and planned entity overview

| Entity | Key fields / responsibility |
|---|---|
| `user_account` | id, normalized unique email, password_hash, role, enabled, institutional_id, identity_verified_at, provisioning_source, creating actor, timestamps |
| `book` | id, nullable ISBN, title, edition, publisher/year, description, active status |
| `author`, `book_author` | normalized author identity and unique many-to-many link |
| `category`, `book_category` | category identity and unique book/category link |
| `book_copy` | id, book_id, unique barcode/accession, location, status, condition, version |
| `borrow_request` | id, member_id, book_id, status, submitted/decided timestamps, actor, reason |
| `loan` | id, copy_id, member_id, optional request_id, issue/due/return timestamps, renewal_count, actors, version |
| `fine` | id, unique loan_id, borrower account, daily rate, cap, overdue days, decimal amount, status, assessment/payment timestamps |
| `fine_payment` | id, fine_id, decimal amount, payment time, receipt number, recording Librarian; this is a manual record, not a payment-gateway transaction |
| `library_holiday` | id, inclusive from/to dates, name, creating Librarian and timestamp |
| `user_feedback` | id, member/account, rating/text, moderation state, timestamps |
| `book_review` | member/book review, eligibility and publication data |
| `book_reservation` | member/book queue, status, assigned copy and pickup hold dates |
| `digital_edition` | book-linked PDF metadata and storage key; PDF bytes live in configured filesystem storage |
| `book_wishlist` | unique member/book saved item |
| `book_recommendation` | id, book, recipient member, recommender (nullable for computed suggestion), type/note, created/expiry/seen |
| `app_notification` | recipient user, event type, safe structured payload, created/read times, related resource |
| `due_date_reminder_log`, `member_approval_audit` | reminder delivery idempotency and member-review audit |
| `system_setting`, `academic_semester`, `user_semester_renewal` | library policy values, semester windows, and renewal usage |

## Relationships and integrity
Member identities and roles are stored in `user_account`; there is no separate `member` table. Accounts have requests, loans, reservations, fines, feedback/reviews, recommendations, wishlists, and notifications according to the implemented module. A book has many copies and links many-to-many with authors/categories. Each copy has historical loans but at most one active loan.

The implemented schema uses normalized unique email, unique institutional identifiers where present, unique copy identifiers, foreign keys, checks, and indexes. The MySQL V4 migration uses a generated nullable active-copy key with a unique index; active loan queries are indexed by borrower and due date. Copy and request queries have status/book/submission indexes, and later migrations add indexes for notification, fine, reservation, review, and wishlist access. Store UTC-normalized event instants as `DATETIME(6)`; use `DATE` for library-calendar due dates.

There is no group/course entity. The current application has review, feedback, reservation, and recommendation schemas; changes to institution policy around eligibility, moderation, queue timing, and recommendation retention may require future migrations.

## Implemented catalogue schema (Flyway V3)

`author`, `category`, and `book` records are linked through `book_author` and `book_category`; `book_copy` stores uniquely identified physical inventory. ISBN is nullable and checksum-validated at the API. Book deactivation is a soft state. Total counts include all physical copy records, including withdrawn copies; only `AVAILABLE` contributes to availability. Copy state supports `AVAILABLE`, `ON_LOAN`, `LOST`, `DAMAGED`, and `WITHDRAWN`, but librarian inventory APIs cannot assign `ON_LOAN`; circulation owns that transition.

The `circulation_policy` stores `STANDARD`, `REFERENCE_ONLY`, `SERIAL_RESTRICTED`, or `APPROVED_OVERNIGHT_EXCEPTION`. Flyway V4 enables take-home circulation only for active `STANDARD` books; the other policies remain blocked pending operating decisions.

Creating a catalogue record may include a physical-copy quantity from 1 through 500. The book, author/category links, and generated copies are persisted in one transaction. A Librarian can also add 1–500 copies to an existing book through one transactional bulk operation. Generated identifiers are uppercase UUID strings (no assumed institutional prefix), fit the existing copy-identifier format, and are protected by the global unique constraint. Omitting the optional initial quantity preserves the earlier metadata-only API behavior. Requests do not reserve inventory; issue and eligible return transitions update the copy state.


## Implemented borrowing and circulation schema (Flyway V4)

V4 adds `borrow_request`, `borrow_request_event`, `loan`, `loan_event`, and `library_holiday`. Requests reference the borrower account and book, record submission/review state, and preserve actor/time/reason history. Loans reference the issued request, borrower, physical copy, and issuing Librarian; they store `DATE` issue/due/actual-return values, renewal count, state, notes, and an optimistic version. Loan events record issue, renewal, return/loss, effective date, due-date changes, copy status, actor, and optional case note. V21 extends the holiday model from single dates to inclusive date ranges and records the creating Librarian.

A unique index on the MySQL generated nullable active-copy key allows at most one ACTIVE loan per copy; row locks protect request/copy issue and return transitions. No holiday dates or production accounts are seeded. V10 inserts prototype policy defaults, including fine rate/cap/grace-period and renewal settings; the institution must review these before live use. The application uses `LIBTRACK_LIBRARY_ZONE` to determine library-local dates; set it to the institution's real zone. The H2 test profile disables Flyway, so H2 tests do not validate the engine-specific migrations. The active MySQL migrations are in `backend/src/main/resources/db/migration/mysql`; the separate `db/migration` location contains legacy/non-MySQL history. MySQL uses `BINARY(16)` UUID storage and generated nullable unique-key columns where the other migration set uses different engine-specific constructs. Run Flyway and JPA schema validation against MySQL before deployment.


## Database-engine migration note

The application is configured to use MySQL 8.4 and the active MySQL migration location currently contains V1–V22. The separate `db/migration` directory retains engine-specific history (V1–V4 and V8–V22) and is not the configured runtime location. The two locations are not an automatic cross-engine conversion path. H2 tests do not prove Flyway/MySQL compatibility. Do not point a populated database at a different engine's JDBC URL; data conversion requires a separately planned export/import. Never rewrite migrations already applied to a real database; add forward-only migrations.

## Registration schema history and current approval workflow (Flyway V5–V7, V14)

V5 adds `SELF_REGISTRATION`; V6 creates the email-verification token table; V7 permits a verified self-registration to transition to enabled. V14 adds Librarian approval status and review audit fields. The current `RegistrationService` creates disabled Student/Faculty accounts with `PENDING_APPROVAL`, sends an in-app Librarian notification, and does not issue an email-verification token. A Librarian approval enables the account and records the reviewer and time. The email-verification entity, endpoint, and development-only capture/reissue tool remain in the codebase as a separate legacy path; a valid token can activate a pending self-registration, but this is not the normal registration workflow. Tokens are stored as SHA-256 hashes and consumed transactionally. Local captured messages are in-memory only. Migration history records the schema's evolution and should not be mistaken for the current application workflow.
