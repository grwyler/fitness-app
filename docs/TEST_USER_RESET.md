# Test User Data Reset

## Purpose

The app includes a development/manual-validation reset flow for the seeded test account:

- Email: `test@test.com`
- Password: `password`

This exists only to support fresh end-to-end testing. It is not a general user data deletion feature.

This endpoint is intentionally safe to keep enabled in production because it is hard-gated to the single seeded test account (`test@test.com`) on the backend.

## Mobile UI

When the authenticated user email is exactly `test@test.com`, the Dashboard shows a low-risk `Dev/Test Tools` card with a `Reset Test Data` button.

The button is hidden for every other authenticated user. The UI gate is only a convenience; the backend enforces the real restriction.

The same test account also has access to a `Review feedback` button, which shows locally-saved `Report issue` entries and allows exporting them as JSON.

For faster triage, the Saved feedback screen also provides a `Copy Codex Prompt` action that formats entries into a Codex-ready prompt. The prompt instructs Codex to either implement an obvious, low-risk fix or log a backlog item in `docs/PRODUCT_ROADMAP.md`.

Before calling the API, the app asks for confirmation:

```text
This will delete workout history, custom workouts, progression state, and program progress for test@test.com only. Continue?
```

After a successful reset, the app refreshes workout queries so dashboard, program, history, and progression views reflect the clean state.

## Endpoint

```http
POST /api/v1/dev/reset-test-user-data
Authorization: Bearer <app-issued-jwt>
Content-Type: application/json
```

Body:

```json
{}
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
- The authenticated bearer token email must be exactly `test@test.com`.
- Any other authenticated user receives `403 FORBIDDEN`.
- Deletes are scoped to the resolved authenticated user id, not to a caller-supplied id or email.
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
