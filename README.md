# LibTrack

LibTrack is a modular monolith for academic library catalogue, member, and circulation workflows. This initial setup provides the planning baseline, Angular workspace, Spring Boot health endpoint, PostgreSQL configuration, and starter tests. Business workflows remain staged for later implementation.

## Technology baseline

- Angular 22.2.x / TypeScript 6.0.x / Node.js 24 LTS / SCSS.
- Java 25 / Spring Boot 4.1.2 / Maven 3.10 / PostgreSQL 17.
- Locked frontend packages include Angular CLI/build 22.2.4, Angular framework packages 22.2.3, Vitest 4.1.12, and TypeScript 6.0.3.

Compatibility rationale and official references are in `docs/architecture.md`. `Java 25.0.1`, Node `24.22.1`, npm `10.9.2`, and Maven `3.10.0` were observed in this environment. Angular 22's optional peer metadata caused npm 10's dependency resolver to fail; the verified dependency set was installed with `--legacy-peer-deps`. Use that flag for reproducible installs with npm 10.

## Local setup

Start PostgreSQL in one terminal from this directory:

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

The UI is served at `http://localhost:4200`; the API is at `http://localhost:8080`. Check `GET http://localhost:8080/api/health` for `{ "status": "UP" }`. Database defaults target the Compose service (`libtrack` / `libtrack`); override `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` through environment variables. Development credentials are not production secrets.

## Checks

```powershell
cd backend
mvn test
cd ..\frontend
npm test -- --watch=false
npm run build
```

No business policy is inferred for the SRS's unverified 30-day borrowing period or unspecified fine rate; see `docs/decision-log.md`. The next recommended implementation slice is identity and member provisioning, beginning with approved student/faculty identity rules and server-enforced roles.
