# LibTrack

LibTrack is a single-library management application built as a modular monolith: an Angular web client, a Spring Boot REST API, and a MySQL database. The current codebase includes catalogue and physical inventory management, optional digital PDF editions, student/faculty registration and librarian approval, circulation, reservations, fines, notifications, reviews, recommendations, wishlists, reports, and librarian administration. Institutional SSO, external payment processing, reading-progress insights, and multi-branch support are not implemented.

## Technology

- Angular 22.2.x, TypeScript 6.0.x, SCSS, Node.js 24 LTS.
- Java 25, Spring Boot 4.1.2, Spring Security, Spring Data JPA/Hibernate, Maven 3.10.
- MySQL 8.4 LTS with Flyway migrations and MySQL Connector/J.
- Vitest for frontend tests; Spring Boot/JUnit tests use H2 by default. H2 tests do not verify MySQL migrations or MySQL-specific behavior.

The backend is under `backend/`, the Angular application is under `frontend/`, and project design/API/architecture documentation is under `docs/`. Angular's development proxy keeps `/api` same-origin while running locally.

## Implemented workflows

- **Accounts and access:** Student and Faculty users can submit self-registration. The account is created disabled with status `PENDING_APPROVAL`; a Librarian reviews and approves or rejects it. Approval enables sign-in. Librarians can also provision verified Student/Faculty accounts. Librarian accounts are created through the controlled interactive bootstrap. Public APIs cannot assign the Librarian role.
- **Authentication:** Spring Security uses server-side HTTP sessions, HttpOnly/SameSite cookies, CSRF protection, session ID rotation at login, and BCrypt password hashes. Password reset endpoints are present. This project does not use JWT for API authentication.
- **Catalogue and inventory:** Public search and book details expose metadata and aggregate counts. Librarians manage book records, individual copies, bulk copy creation (1–500), inventory reconciliation, and optional digital PDF editions. Digital content is streamed/downloaded to authenticated members; only Librarians manage editions.
- **Borrowing and circulation:** Students and Faculty submit and track requests, reservations, loans, renewals, returns, and fines. Librarians review member registrations and borrowing requests, issue/return copies, manage copy condition, reservations, library policies, notifications, members, and fine records/payments.
- **Policies and supporting services:** Role-specific loan periods, renewal limits, fine rates/caps/grace periods, and other settings are represented in the policy/settings modules. Due dates account for Sunday, Monday, and configured holiday ranges. In-app notifications, faculty-to-student recommendations, book reviews, feedback, wishlists, and a librarian summary report are implemented. Policy values and operating rules should be reviewed by the institution before deployment; lost/damaged replacement compensation and online payment processing are not provided.

## Local setup

Requirements: Docker Desktop with Compose, Java 25, Maven 3.10, Node.js 24, and npm.

1. From the repository root, create the ignored local `.env` from the example and set unique local-only MySQL passwords. Do not commit `.env` or use these local credentials in production.

   ```powershell
   Copy-Item .env.example .env
   # Edit .env locally; do not paste its values into source control or documentation.
   docker compose up -d db
   ```

   Compose exposes MySQL on port 3307 by default and persists data in a named Docker volume. The backend's default datasource URL uses localhost:3306; when using Compose, set `DB_URL` to `jdbc:mysql://localhost:3307/libtrack?serverTimezone=UTC`. Set `DB_USERNAME` and `DB_PASSWORD` in the backend process environment to the corresponding local Compose values. Compose reads `.env`; Maven does not automatically load it.

2. In a second terminal, start the backend. Flyway applies pending MySQL migrations and Hibernate validates the schema (`ddl-auto: validate`).

   ```powershell
   cd backend
   # Ensure DB_URL, DB_USERNAME, and DB_PASSWORD are set in this process environment.
   mvn spring-boot:run
   ```

3. In a third terminal, install the locked frontend dependencies and start Angular.

   ```powershell
   cd frontend
   npm ci --legacy-peer-deps
   npm start
   ```

   The UI is at `http://localhost:4200`; the API is at `http://localhost:8080`. For HTTPS deployments, set `SESSION_COOKIE_SECURE=true`. Set `LIBTRACK_LIBRARY_ZONE` to the institution's IANA time zone before operational use. Digital PDFs are stored under `LIBTRACK_STORAGE_DIR` (default `./storage/digital-books`, relative to the backend process working directory).

### Initial Librarian

After configuring the backend database environment, run this only in a trusted interactive terminal when no Librarian account exists:

```powershell
cd backend
mvn spring-boot:run -Dspring-boot.run.arguments=--libtrack.bootstrap-librarian
```

The command prompts for the email and a hidden password twice, refuses when a Librarian already exists, and starts without exposing an HTTP bootstrap endpoint. Never run it through a public service or CI job.

## Database migrations

The active runtime location is `backend/src/main/resources/db/migration/mysql/`, which currently contains MySQL migrations V1–V22. Flyway applies new migrations forward; do not edit migrations that may have been applied to a database. `backend/src/main/resources/db/migration/` contains the separate legacy PostgreSQL-style scripts V1–V4 and V8–V22. The application defaults to MySQL and does not perform an automatic PostgreSQL-to-MySQL data conversion. Back up and plan a separate export/import before changing database engines.

## Verification commands

```powershell
cd backend
mvn test
cd ..\frontend
npm test -- --watch=false
npm run build
```

The backend's default test profile uses H2. Run a separate integration check against an isolated MySQL schema to verify MySQL migrations and schema validation; never use a real data-bearing database as a test schema.

## Documentation

- [API contracts](docs/api-contracts.md)
- [Architecture](docs/architecture.md)
- [Database design and migration notes](docs/database-design.md)
- [Authorization matrix](docs/authorization-matrix.md)
- [Requirements and implementation status](docs/requirements.md)
- [Implementation plan](docs/implementation-plan.md)
- [Decision log](docs/decision-log.md)
- [UI design system](docs/ui-design-system.md)

`docs/email-verification-local.md` describes the remaining development-only legacy email-verification tooling. It is not the current Student/Faculty registration approval workflow.
