# Local email verification

The development adapter captures messages in memory. It never sends real mail, and the inspection controller exists only with the explicit Spring development profile and only serves loopback clients. Verification tokens are 32 random bytes encoded as URL-safe text; the database stores only their SHA-256 hash. The default lifetime is 24 hours (LIBTRACK_VERIFICATION_TOKEN_TTL can override it).

## Run locally

1. Keep the existing MySQL database and credentials. Start the backend normally so Flyway applies any pending forward-only migrations, including V6 and V7; do not delete the database or edit V1–V6. V7 corrects the provisioning check so a valid verification can enable a self-registered account.
2. Export the existing DB_URL, DB_USERNAME, and DB_PASSWORD values in the backend shell. Set SPRING_PROFILES_ACTIVE=development and LIBTRACK_FRONTEND_BASE_URL=http://localhost:4200.
3. Start the backend from backend with mvn spring-boot:run.
4. Start the Angular client from frontend with npm start.
5. Open LibTrack, choose Student or Faculty, and submit registration using the existing institutional-email and password rules.
   If an account was already pending before migration V6 and therefore has no token, use the development-only reissue endpoint from a loopback PowerShell session:
   
       $csrf = Invoke-RestMethod http://localhost:8080/api/v1/auth/csrf -SessionVariable session
       $headers = @{}; $headers[$csrf.headerName] = $csrf.token
       $body = @{ email = 'your.pending@vitap.ac.in' } | ConvertTo-Json
       Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/v1/dev/mail-capture/reissue -WebSession $session -Headers $headers -ContentType 'application/json' -Body $body
   
   This always returns 204 and does not reveal whether the address matched. It only issues a link for an existing disabled Student/Faculty self-registration; the account remains disabled until token verification.
6. Inspect http://localhost:8080/api/v1/dev/mail-capture on the same machine. A reissue replaces the prior captured message for that account because it also replaces the one-time database token. To check the current stored state without returning a token or hash, use `Invoke-RestMethod http://localhost:8080/api/v1/dev/mail-capture/diagnostics`; `CURRENT` means the captured message matches the unexpired token hash in this application database; `EXPIRED`, `ALREADY_USED`, or `ACCOUNT_ALREADY_ACTIVE` means that link cannot be reused; `NOT_FOUND` means this backend database has no matching token. Open the `verificationUrl` from the current message. The token is placed in the URL fragment (not the query), so browsers do not send it to web servers in HTTP requests. The Angular page reads it, submits it using a CSRF-protected POST, then removes it from the visible browser URL. Backend logs report only the account UUID, expiry, decision reason, active Spring profiles, and a sanitized MySQL host/port/database; raw tokens, token hashes, passwords, and JDBC credentials are never logged.
7. Sign in with the newly verified account. The local capture disappears when the backend process restarts. DELETE http://localhost:8080/api/v1/dev/mail-capture clears captured messages and is CSRF-protected.

Do not expose the development profile or its mail-capture port to a network. The controller checks the actual remote socket address and rejects non-loopback requests. No request parameter, frontend action, or capture endpoint can activate an account without a valid token.

## Production provider

A production deployment currently fails registration closed with a generic 503 because there is no real verification provider. To enable it, implement a VerificationMessageSender adapter for the institution's approved email provider under an explicit production profile, validate recipient/domain and provider configuration, and store credentials in deployment secret management. Keep provider tokens out of logs and responses. The adapter receives the one-time link transiently; the database continues to persist only its SHA-256 hash. Add provider-specific delivery, rate-limit, retry, and operational tests before enabling public registration. Do not activate accounts through an administrator shortcut.


