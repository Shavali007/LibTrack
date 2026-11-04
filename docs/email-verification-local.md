# Legacy email-verification tooling

This document describes code that remains in the repository, not the current Student/Faculty registration workflow.

## Current registration workflow

`POST /api/v1/auth/register` creates a disabled Student/Faculty account with status `PENDING_APPROVAL` and notifies Librarians. It does not create or send an email-verification token. A Librarian reviews the request through the member-request workflow; approval records the actor/time and enables sign-in. This is the normal registration path.

## Legacy verification endpoints

The backend still contains `RegistrationVerificationService`, `POST /api/v1/auth/verify-email`, the Angular `/verify-email` page, and the development-only `/api/v1/dev/mail-capture` controller. Tokens are random, single-use, expire after the configured lifetime, and only their SHA-256 hashes are stored in the database. Captured messages are kept in memory and the inspection/reissue controller is available only with the `development` profile and to loopback clients.

The development `POST /api/v1/dev/mail-capture/reissue` endpoint can issue a token for an existing disabled self-registration. A valid token submitted to `/api/v1/auth/verify-email` activates that account and sets its approval status to approved without recording a Librarian reviewer. **This legacy path can bypass the current Librarian-review workflow. Do not use it for real member accounts or as the normal local registration test.** Restrict any use to disposable test accounts in a local development database, and never expose the development profile to a network.

The normal registration service does not call the token issuer, so a new registration will not appear in mail capture. Production has no configured delivery provider; the fallback sender fails closed. Installing a provider would not change the current registration flow unless application behavior is deliberately changed and reviewed.
