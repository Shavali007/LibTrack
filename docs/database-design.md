# LibTrack Database Design

PostgreSQL is the durable source of truth. Book metadata is separated from physical copies. Derive availability from copy/loan state instead of storing duplicated counts. Use UUID identifiers, foreign keys, timestamps, explicit statuses, and Flyway migrations.

## Planned entities

| Entity | Key fields / responsibility |
|---|---|
| `user_account` | id, normalized unique email, password_hash, role, enabled, timestamps |
| `member` | id, institutional identifier, unique user_id, display/contact fields, active status |
| `book` | id, nullable ISBN, title, edition, publisher/year, description, active status |
| `author`, `book_author` | normalized author identity and unique many-to-many link |
| `category`, `book_category` | category identity and unique book/category link |
| `book_copy` | id, book_id, unique barcode/accession, location, status, condition, version |
| `borrow_request` | id, member_id, book_id, status, submitted/decided timestamps, actor, reason |
| `loan` | id, copy_id, member_id, optional request_id, issue/due/return timestamps, renewal_count, actors, version |
| `fine` | id, loan_id, amount in minor units, currency, reason/status, assessment/waiver times and rationale |
| `library_holiday` | id, unique date, name, active flag |
| `feedback` | id, book/member ids, rating/text, moderation status, timestamps |
| `book_recommendation` | id, book, recipient member, recommender (nullable for computed suggestion), type/note, created/expiry/seen |
| `member_interest` | member/category, source, created timestamp |
| `notification` | recipient user, event type, safe structured payload, created/read times, related resource |
| `audit_event` | actor, action, target, timestamp, correlation id, minimal before/after metadata |

## Relationships and integrity
`user_account` has zero or one `member`; a book has many copies; books link many-to-many with authors/categories. Members have many requests and loans. Each copy has historical loans but at most one active loan. Loans may have fine adjustments/assessments. Members may submit feedback, hold interests, receive recommendations, and own notifications.

For the planned schema, use unique normalized email, institutional identifier, and copy barcode; enforce foreign keys and checks. The implemented V4 loan index is partial on `loan.book_copy_id` where `status = 'ACTIVE'`; active loan queries are indexed by borrower and due date. Copy and request queries have status/book/submission indexes. Planned notification/fine indexes apply only when those modules are implemented. Store event timestamps as `timestamptz`; use `DATE` for library-calendar due dates.

No group/course entity is proposed. Feedback uniqueness/scale, reservation lifecycle, and recommendation impression tracking require decisions before schema constraints are chosen.

## Implemented catalogue schema (Flyway V3)

`author`, `category`, and `book` records are linked through `book_author` and `book_category`; `book_copy` stores uniquely identified physical inventory. ISBN is nullable and checksum-validated at the API. Book deactivation is a soft state. Availability is derived from copies with status `AVAILABLE`; withdrawn copies are excluded from total inventory counts. Copy state supports `AVAILABLE`, `ON_LOAN`, `LOST`, `DAMAGED`, and `WITHDRAWN`, but librarian inventory APIs cannot assign `ON_LOAN`; circulation owns that transition.

The `circulation_policy` stores `STANDARD`, `REFERENCE_ONLY`, `SERIAL_RESTRICTED`, or `APPROVED_OVERNIGHT_EXCEPTION`. Flyway V4 enables take-home circulation only for active `STANDARD` books; the other policies remain blocked pending operating decisions.


## Implemented borrowing and circulation schema (Flyway V4)

V4 adds `borrow_request`, `borrow_request_event`, `loan`, `loan_event`, and `library_holiday`. Requests reference the borrower account and book, record submission/review state, and preserve actor/time/reason history. Loans reference the issued request, borrower, physical copy, and issuing Librarian; they store `DATE` issue/due/actual-return values, renewal count, state, notes, and an optimistic version. Loan events record issue, renewal, return/loss, effective date, due-date changes, copy status, actor, and optional case note. The holiday table has a unique date and records the creating Librarian.

A partial unique index allows at most one ACTIVE loan per copy; row locks protect request/copy issue and return transitions. No holiday dates, fines, replacement amounts, or production seed accounts are inserted. The application uses `LIBTRACK_LIBRARY_ZONE` to determine the library-local date; deployment must set this to the institution's real zone. The H2 test profile disables Flyway, so those tests do not validate the PostgreSQL V4 migration.
