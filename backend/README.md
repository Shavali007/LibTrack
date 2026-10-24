# Backend

The Spring Boot API uses MySQL 8.4 with Spring Data JPA and Flyway. From the repository root, copy `.env.example` to `.env`, replace both local password placeholders, and start `docker compose up -d db`. Configure the backend process with `DB_URL=jdbc:mysql://localhost:3307/libtrack?serverTimezone=UTC`, `DB_USERNAME` equal to `MYSQL_USER`, and `DB_PASSWORD` equal to `MYSQL_PASSWORD`. Then run `mvn spring-boot:run` from this directory. Do not commit `.env` or use these local credentials outside development.

Flyway selects `classpath:db/migration/mysql` by default. Existing PostgreSQL migration files remain unchanged in `db/migration`; switching a populated PostgreSQL database to MySQL requires an explicit data export/import and is not performed automatically. H2 test runs disable Flyway and do not verify the MySQL schema.
