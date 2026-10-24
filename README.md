# LibTrack

LibTrack is a modular monolith for academic library catalogue, member, and circulation workflows. The current slices include session authentication and controlled Librarian provisioning, catalogue search and inventory, member borrowing requests, Librarian approval/issue/return workflows, loan history, one online renewal, and an explicit holiday calendar. Fine policy and Smart Services remain planned.

## Technology baseline

- Angular 22.2.x / TypeScript 6.0.x / Node.js 24 LTS / SCSS.
- Java 25 / Spring Boot 4.1.2 / Maven 3.10 / PostgreSQL 17.
- Locked frontend packages include Angular CLI/build 22.2.4, Angular framework packages 22.2.3, Vitest 4.1.12, and TypeScript 6.0.3.

Compatibility rationale and official references are in `docs/architecture.md`. Angular uses a dev proxy so `/api` stays same-origin during local development.

## Local setup

Start PostgreSQL from the repository root:

```powershell
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

The UI is served at `http://localhost:4200`; the API is at `http://localhost:8080`. For local HTTPS deployments, set `SESSION_COOKIE_SECURE=true`. Database values come from `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`. Compose defaults are for local development only.

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

Borrowing uses a confirmed 30-calendar-day term and one renewal. Only explicitly configured holidays shift a due date; weekends are not automatically excluded. Set `LIBTRACK_LIBRARY_ZONE` to the real library time zone and maintain the holiday calendar before operational use. Fine and replacement policies remain unresolved. Flyway V4 is covered only by H2-backed automated tests here; run migration verification against PostgreSQL in CI before deployment. Smart Services remain planned.
