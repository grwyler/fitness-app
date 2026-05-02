# Test User Data Reset

## Purpose

The app includes an admin-only development/manual-validation reset flow for the seeded test account:

- Email: `test@test.com`
- Password: `password`

This exists only to support fresh end-to-end testing. It is not a general user data deletion feature.

This endpoint is intentionally safe to keep enabled in production because it is hard-gated by admin role and a strict allowlist of test accounts.

## Mobile UI

Admin users have access to an `Admin Dashboard` screen which includes:

- feedback management tools
- test-account seed/reset tools (for allowlisted accounts like `test@test.com`)

For faster triage, the Saved feedback screen also provides a `Copy Codex Prompt` action that formats entries into a Codex-ready prompt. The prompt instructs Codex to either implement an obvious, low-risk fix or log a backlog item in `docs/PRODUCT_ROADMAP.md`.

Before calling the API, the app asks for confirmation:

```text
This will reset workout data for test@test.com. Continue?
```

After a successful reset, the app refreshes workout queries so dashboard, program, history, and progression views reflect the clean state.

## Endpoint

```http
POST /api/v1/admin/test-tools/reset-user-data
Authorization: Bearer <app-issued-jwt>
Content-Type: application/json
```

Body:

```json
{ "email": "test@test.com" }
```

Success response:

```json
{
  "data": {
    "email": "test@test.com",
    "reset": {
      "deletedWorkoutSessions": 0,
      "deletedSets": 0
    }
  },
  "meta": {}
}
```

The `reset` object includes deletion counts for the user-scoped domain tables.

## Safety Restrictions

- The endpoint requires authentication.
- The authenticated user must have `role === "admin"` (enforced server-side).
- The reset only supports approved test accounts (currently `test@test.com`).
- Deletes are scoped to the targeted test account, not to the requesting admin.
- The reset runs in a database transaction.
- The reset preserves the `users` row, email/password credentials, and bearer-token auth setup.
- The reset deletes only non-auth domain data for the test user:
  - workout sessions/history
  - exercise entries and logged sets
  - custom programs/workouts owned by the test user
  - program enrollments/progress
  - progression state
  - progress metrics/streak-derived rows
  - idempotency records for workout mutations

The reset does not delete predefined programs, exercises, auth credentials, or any rows owned by other users.
