# LibTrack

LibTrack is a modular monolith for academic library catalogue, member, and circulation workflows. The current slices include session authentication and controlled Librarian provisioning, catalogue search and inventory, member borrowing requests, Librarian approval/issue/return workflows, loan history, one online renewal, and an explicit holiday calendar. Fine policy and Smart Services remain planned.

## Technology baseline

- Angular 22.2.x / TypeScript 6.0.x / Node.js 24 LTS / SCSS.
- Java 25 / Spring Boot 4.1.2 / Maven 3.10 / MySQL 8.4 LTS.
- Locked frontend packages include Angular CLI/build 22.2.4, Angular framework packages 22.2.3, Vitest 4.1.12, and TypeScript 6.0.3.

Compatibility rationale and official references are in `docs/architecture.md`. Angular uses a dev proxy so `/api` stays same-origin during local development.

## Local setup

Start MySQL 8.4 from the repository root. Copy `.env.example` to `.env` and replace both local-only password placeholders first; `.env` is ignored by Git.

```powershell
Copy-Item .env.example .env
# Edit .env and set unique local MYSQL_PASSWORD and MYSQL_ROOT_PASSWORD values.
docker compose up -d db
```

Start the API in another terminal (requires Java 25 and Maven 3.9+):

```powershell
cd backend
mvn spring-boot:run
```

Start the Angular app in a third terminal (requires Node 24 LTS and npm):

```powershell
cd frontend
npm install --legacy-peer-deps
npm start
```

The UI is served at `http://localhost:4200`; the API is at `http://localhost:8080`. For local HTTPS deployments, set `SESSION_COOKIE_SECURE=true`. The backend reads `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` from its process environment. Set `DB_URL=jdbc:mysql://localhost:3307/libtrack?serverTimezone=UTC`, `DB_USERNAME` to the `MYSQL_USER` in `.env`, and `DB_PASSWORD` to the matching `MYSQL_PASSWORD`. Never use the local Compose credentials in production.

Authentication uses server-side sessions, CSRF protection, and BCrypt password hashes. A Librarian manually verifies college identity before provisioning a Student or Faculty account; this prototype records the attestation and does not integrate with an institutional verification service. There is no public registration route and the provisioning API cannot assign Librarian.

To create the initial Librarian, run the backend from an interactive trusted terminal after configuring database connectivity: `mvn spring-boot:run -Dspring-boot.run.arguments=--libtrack.bootstrap-librarian`. The process runs without an HTTP server, prompts for the account email and hidden password twice, and refuses if a Librarian already exists. Do not run this bootstrap through an exposed service or CI job. No production password is stored in source or silently seeded. The API provides `GET /api/v1/auth/csrf`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`, and Librarian-only account provisioning/deactivation routes documented in `docs/api-contracts.md`.

## Checks

```powershell
cd backend
mvn test
cd ..\frontend
npm test -- --watch=false
npm run build
```

Borrowing uses a confirmed 30-calendar-day term and one renewal. Only explicitly configured holidays shift a due date; weekends are not automatically excluded. Set `LIBTRACK_LIBRARY_ZONE` to the real library time zone and maintain the holiday calendar before operational use. Fine and replacement policies remain unresolved. The existing PostgreSQL Flyway V1–V4 files remain untouched as migration history. MySQL runs the parallel `db/migration/mysql` V1–V4 set; it targets a fresh MySQL schema and preserves the same logical data model. H2-backed automated tests do not validate the MySQL migration scripts, so run MySQL migration and schema-validation integration tests before deployment. Smart Services remain planned.
