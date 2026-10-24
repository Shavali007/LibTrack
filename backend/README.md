# Backend

The Spring Boot API reads `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` from the environment. Start PostgreSQL using the Compose service from the repository root, then run `mvn spring-boot:run` from this directory. The initial API exposes `GET /api/health`; identity and business endpoints are planned separately.
