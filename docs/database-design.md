# LibTrack Database Design

PostgreSQL is the durable source of truth. Book metadata is separated from physical copies. Derive availability from copy/loan state instead of storing duplicated counts. Use UUID identifiers, foreign keys, timestamps, explicit statuses, and Flyway migrations.

## Proposed entities

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

Use unique normalized email, institutional identifier, and copy barcode. Enforce foreign keys and useful checks. Add a partial unique index on active `loan.copy_id` (`returned_at IS NULL`). Index active loans by member and due date, copies by book/status, requests by status/submitted time, notifications by recipient/read/created, and fines by status. Store timestamps as `timestamptz`, currency explicitly, and amounts exactly. Do not encode the unresolved loan duration or fine rate in defaults. Audit administrative actions without secrets or unnecessary PII.

No group/course entity is proposed. Feedback uniqueness/scale, reservation lifecycle, and recommendation impression tracking require decisions before schema constraints are chosen.

## Implemented catalogue schema (Flyway V3)

`author`, `category`, and `book` records are linked through `book_author` and `book_category`; `book_copy` stores uniquely identified physical inventory. ISBN is nullable and checksum-validated at the API. Book deactivation is a soft state. Availability is derived from copies with status `AVAILABLE`; withdrawn copies are excluded from total inventory counts. Copy state supports `AVAILABLE`, `ON_LOAN`, `LOST`, `DAMAGED`, and `WITHDRAWN`, but librarian inventory APIs cannot assign `ON_LOAN`; circulation owns that transition.

The `circulation_policy` field records `STANDARD`, `REFERENCE_ONLY`, `SERIAL_RESTRICTED`, or `APPROVED_OVERNIGHT_EXCEPTION`. This records policy intent only. Enforcement, overnight return time and operational exception approvals remain future circulation decisions, consistent with the SRS.
