# Backend

## Overview

The backend is a TypeScript Express API with:

- `Express` for HTTP transport
- `Zod` for request and environment validation
- `Drizzle ORM` for persistence
- `PostgreSQL` in runtime environments
- `PGlite` for integration-style tests

The core backend slice currently supports:

- `GET /api/v1/dashboard`
- `GET /api/v1/workout-sessions/current`
- `POST /api/v1/workout-sessions/start`
- `POST /api/v1/sets/:setId/log`
- `POST /api/v1/workout-sessions/:sessionId/complete`

## Run the API

1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
2. Install dependencies:

```powershell
npm install
```

3. Build the workspace:

```powershell
npm run build
```

4. Start the API:

```powershell
npm run dev:api
```

Optional but recommended before first run:

```powershell
npm run setup:dev --workspace @fitness/api
```

That command:

- pushes the current Drizzle schema into the configured Postgres database
- seeds a development user, program, workout templates, and enrollment
- aligns the development mobile client with the seeded user id

The API reads:

- `DATABASE_URL`: required PostgreSQL connection string
- `PORT`: optional, defaults to `4000`
- `NODE_ENV`: optional, one of `development`, `test`, `production`
- `USE_PGLITE_DEV`: optional, set to `true` only for local PGlite development

Hosted Postgres notes:

- Neon pooled connection strings are the recommended production path for Vercel.
- Supabase pooler connection strings also work.
- If your hosted connection string already includes SSL parameters such as `sslmode=require`, the API uses them as provided.
- If a Neon or Supabase URL does not include inline SSL parameters, the API applies a conservative SSL fallback automatically.

If required environment variables are missing or invalid, startup fails immediately with a concise configuration error.

## Run tests

Workspace typecheck:

```powershell
npm run typecheck
```

API tests:

```powershell
npm run test --workspace @fitness/api
```

Notes:

- Domain, application, infrastructure, and HTTP tests all run through the API workspace test command.
- Integration-style backend tests use `PGlite`, so they do not require a separate external test database.

## API envelopes

Success responses always use:

```json
{
  "data": {},
  "meta": {}
}
```

Error responses always use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": []
  }
}
```

Current error mapping:

- `400`: validation failures, including missing `Idempotency-Key`
- `401`: unauthenticated requests
- `404`: missing session, set, or workout template
- `409`: business rule conflicts and idempotency conflicts
- `500`: unexpected backend errors

## Auth assumptions

Runtime auth is isolated in:

- [apps/api/src/lib/auth/auth.middleware.ts](C:\Users\Grwyl\repos\fitness-app\apps\api\src\lib\auth\auth.middleware.ts)
- [apps/api/src/lib/auth/request-context.middleware.ts](C:\Users\Grwyl\repos\fitness-app\apps\api\src\lib\auth\request-context.middleware.ts)
- [apps/api/src/lib/auth/resolve-user.ts](C:\Users\Grwyl\repos\fitness-app\apps\api\src\lib\auth\resolve-user.ts)

Protected requests must include:

- `Authorization: Bearer <app-issued-jwt>`

The backend:

1. verifies the app-issued bearer token at the HTTP boundary
2. resolves the current app user through `users.id`
3. loads the user's internal `id` and `unit_system`
4. returns the same `RequestContext` shape used by the use-cases

For local development, the seeded default internal user id is:

- `11111111-1111-1111-1111-111111111111`

The MVP auth endpoints are `POST /api/v1/auth/signup`, `POST /api/v1/auth/signin`, and `GET /api/v1/auth/me`.

## Idempotency

Mutation endpoints require `Idempotency-Key`:

- `POST /api/v1/workout-sessions/start`
- `POST /api/v1/sets/:setId/log`
- `POST /api/v1/workout-sessions/:sessionId/complete`

Behavior:

- same key + same effective payload replays the stored response
- same key + different payload returns `409 CONFLICT`

## Observability boundary

Current observability hooks are intentionally minimal:

- [apps/api/src/lib/observability/logger.ts](C:\Users\Grwyl\repos\fitness-app\apps\api\src\lib\observability\logger.ts)
- [apps/api/src/lib/observability/error-reporter.ts](C:\Users\Grwyl\repos\fitness-app\apps\api\src\lib\observability\error-reporter.ts)

These define where structured logging and error tracking attach later.

- `logger` is the boundary for production logging
- `errorReporter` is the boundary for Sentry or equivalent error capture

Expected future replacement:

- swap `errorReporter.captureException` with Sentry
- route structured logs to the deployment platform or log pipeline
- keep route handlers and use-cases free of vendor-specific instrumentation
