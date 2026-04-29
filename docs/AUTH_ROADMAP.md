# Auth Audit and Roadmap

Last audited: 2026-04-28

## Current Implementation

The app currently uses first-party email/password auth with app-issued bearer tokens.

Mobile flow:

- `apps/mobile/src/screens/SignInScreen.tsx` submits email/password to `POST /auth/signin`.
- `apps/mobile/src/screens/SignUpScreen.tsx` submits email/password to `POST /auth/signup`.
- `apps/mobile/src/core/auth/AuthProvider.tsx` stores the returned token, restores a saved token on startup, and calls `GET /auth/me` to confirm the session.
- `apps/mobile/src/core/auth/token-storage.ts` stores tokens in `expo-secure-store` on native and `localStorage` on web.
- `apps/mobile/src/api/client.ts` attaches `Authorization: Bearer <token>` to API requests.

API flow:

- `apps/api/src/lib/auth/auth.routes.ts` exposes `POST /auth/signup`, `POST /auth/signin`, and protected `GET /auth/me`.
- Sign-up normalizes email, enforces valid email plus an 8-character minimum password, checks for an existing email, hashes the password, inserts a `users` row, and returns a token.
- Sign-in normalizes email, looks up the user, verifies the supplied password against `users.password_hash`, and returns a token.
- `apps/api/src/lib/auth/password.ts` uses salted PBKDF2-SHA256 with 210,000 iterations and timing-safe comparison.
- `apps/api/src/lib/auth/token.ts` issues and verifies custom HS256 JWT-shaped tokens with a 30-day expiry.
- `apps/api/src/lib/auth/auth.middleware.ts` verifies bearer tokens and sets `request.authUser`.
- `apps/api/src/lib/auth/request-context.middleware.ts` resolves the authenticated app user before workout routes run.

User model:

- `packages/db/src/schema.ts` defines `users.id`, `auth_provider_id`, unique `email`, nullable `password_hash`, profile fields, and `deleted_at`.
- `auth_provider_id` is currently mirrored to the generated user id for app-auth signups.
- There are no email verification, password reset, OAuth account-linking, refresh-token, or session-revocation tables.

Tests:

- API HTTP tests cover valid bearer-token middleware behavior and the sign-up/sign-in/me happy path.
- Mobile tests cover session-status derivation, authorization header attachment, and preserving app state on authenticated 401 responses.
- Tests do not yet cover invalid password rejection, duplicate sign-up, malformed/expired tokens, missing password hash, password reset, email verification, OAuth, or rate limiting.

## Secure Today

- Sign-in does not accept arbitrary passwords in the current source path. It verifies the submitted password against `users.password_hash`.
- Passwords are not stored in plaintext for app-created users.
- Password verification uses a per-password salt and timing-safe comparison.
- Email addresses are normalized to lowercase and trimmed before sign-up/sign-in.
- Duplicate emails are blocked at both the route pre-check and the database unique index.
- Production requires `JWT_SECRET` to be configured with at least 32 characters.
- Protected API routes require a valid bearer token and resolve the server-side user id before domain logic runs.
- Native token storage uses SecureStore.

## Placeholder or Incomplete Behavior

- The auth system is still MVP-grade: no password reset, email verification, OAuth, refresh tokens, token revocation, or session inventory.
- The token implementation is custom instead of a well-tested JWT library. It works for the current shape but lacks standard issuer/audience validation, key rotation support, and stronger claim validation.
- Tokens live for 30 days with no refresh-token boundary or server-side revocation.
- Web stores bearer tokens in `localStorage`, which increases impact from XSS compared with httpOnly cookies.
- `users.password_hash` is nullable for legacy/dev rows. Such users cannot sign in by password, but the model does not explicitly distinguish password users from OAuth or legacy users.
- Soft-deleted users are not filtered in auth lookups.
- Duplicate sign-up has a race window: the pre-check is good UX, but a concurrent insert can still hit the database unique constraint and should be mapped to a clean `409`.
- Error messaging is mostly reasonable, but sign-up currently reveals that an account exists. That is acceptable for many consumer apps, but should be an explicit product/security decision.
- There is no rate limiting, lockout, IP throttling, or bot protection on sign-in/sign-up.
- The dev/test reset route is mounted behind auth but must be environment-gated in `createApp`; its email gate limits damage, but production exposure should be intentional.
- The development bootstrap user is seeded without a password hash; the local test account (`test@test.com` / `password`) should be seeded consistently for manual validation.

## Main Risks

- Account takeover risk from unlimited password guessing.
- User lockout and support risk because password reset does not exist.
- Account quality risk because emails are not verified.
- Long-lived stolen token risk because there is no refresh/revocation model.
- Production maintenance risk from custom token code and no key rotation path.
- Future OAuth migration risk because the user model has only a single `auth_provider_id` instead of a provider-account table.

## Recommended Implementation Order

### Phase 1: Secure Email/Password Auth

Goal: make the existing first-party auth safe enough for production without expanding scope.

Recommended work:

- Add focused API tests for wrong password, unknown email, duplicate email, missing password hash, soft-deleted user, malformed token, expired token, and missing bearer token.
- Add mobile tests for failed sign-in messaging and session restore failure.
- Map database unique-email violations to `409 CONFLICT`.
- Decide whether sign-up should reveal duplicate emails. If not, return a neutral message and move explicit account discovery to password reset.
- Filter `deleted_at is null` for sign-in and `GET /auth/me`.
- Make password auth state explicit in the schema, either by making `password_hash` required for password users or adding an `auth_accounts` table before OAuth work.
- Keep PBKDF2 if minimizing dependencies is preferred, but document the parameters. If adding one auth dependency is acceptable, move to `argon2id` or `bcrypt`.
- Replace custom token encode/verify with a maintained JWT library, or harden current code with stricter claim validation, `iss`, `aud`, `iat` type checks, and tests.
- Add rate limiting to `POST /auth/signin` and `POST /auth/signup`, scoped by IP and normalized email.
- Add a dedicated API error code for throttling (e.g. `RATE_LIMITED`) so clients can distinguish abuse controls from auth failures.
- Shorten access-token lifetime and introduce a minimal refresh-token plan, or explicitly accept 30-day bearer tokens as a temporary Phase 1 tradeoff.
- Environment-gate or remove production access to dev/test reset tooling.

Exit criteria:

- Users can sign up, sign in, restore sessions, and sign out with real credential validation.
- Wrong credentials and invalid tokens are rejected consistently.
- Basic abuse controls are in place.
- Auth tests cover happy path and major failure paths.

### Phase 2: Password Reset

Goal: prevent permanent lockout while keeping account enumeration controlled.

Recommended work:

- Add `password_reset_tokens` with user id, hashed token, expiry, consumed timestamp, request metadata, and created timestamp.
- Add `POST /auth/password-reset/request` with neutral responses for both known and unknown emails.
- Add `POST /auth/password-reset/confirm` to validate a one-time token and set a new password hash.
- Invalidate existing refresh tokens or sessions after password reset once server-side sessions exist.
- Add email delivery through a transactional email provider.
- Add mobile screens for request reset and set new password.
- Rate limit reset requests by IP and normalized email.

Exit criteria:

- A user can recover access without support intervention.
- Reset tokens are single-use, expire quickly, and are stored only as hashes.

### Phase 3: Email Verification

Goal: know which accounts control their email address before enabling sensitive flows.

Recommended work:

- Add `email_verified_at` to users or account records.
- Add `email_verification_tokens` with hashed token, expiry, consumed timestamp, and created timestamp.
- Send verification email after sign-up and when changing email.
- Add `POST /auth/email-verification/resend` and `POST /auth/email-verification/confirm`.
- Decide gating rules: allow app use before verification, or restrict sensitive actions until verified.
- Show a lightweight verification prompt in mobile without blocking workouts unless product requires it.

Exit criteria:

- New accounts can verify ownership of their email.
- The backend can distinguish verified and unverified accounts.

### Phase 4: OAuth Providers

Goal: add Google/Facebook sign-in without rewriting first-party auth.

Recommended work:

- Add an `auth_accounts` table with user id, provider, provider account id, email, email verified flag, timestamps, and unique `(provider, provider_account_id)`.
- Migrate first-party password auth into the same account model or clearly bridge it.
- Implement OAuth with Authorization Code + PKCE for mobile.
- Start with Google first. Add Facebook only if product demand justifies the extra review/configuration work.
- Define account-linking behavior when OAuth email matches an existing password account.
- Add provider-specific callback/deep-link handling in mobile.
- Add tests for new OAuth account creation, existing account sign-in, duplicate provider account handling, and account linking.

Exit criteria:

- Users can sign in with Google.
- Existing password users have a safe linking path.
- Provider identities are modeled separately from app users.

## Non-Goals For Now

- Enterprise SSO.
- Multi-factor authentication.
- Admin user management.
- Device/session management UI.
- Complex risk scoring.

These can wait until there is enough usage or risk to justify the added surface area.
