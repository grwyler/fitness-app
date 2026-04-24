# Deployment

## Recommended hosting path

Use:

- `Vercel` Hobby for the API
- `Neon` Postgres with the pooled connection string for production
- `EXPO_PUBLIC_API_BASE_URL` in Expo set to your deployed API origin plus `/api/v1`

Neon is the smoothest fit here because its pooled connection string is serverless-friendly and already includes `sslmode=require`. Supabase also works, but for this API the lowest-friction option is Neon.

## Why the API now fits Vercel

The API has two entrypoints:

- [apps/api/src/server.ts](C:\Users\Grwyl\repos\fitness-app\apps\api\src\server.ts): local long-running server with `listen()`
- [apps/api/src/index.ts](C:\Users\Grwyl\repos\fitness-app\apps\api\src\index.ts): default Express export for Vercel

Local development still supports:

- `USE_PGLITE_DEV=true` for fast local bootstrapping
- `npm run dev --workspace @fitness/api` for a normal local server

Vercel uses the exported Express app and should be configured with a real hosted `DATABASE_URL`.

## Database setup

### Neon recommended

1. Create a Neon project and database.
2. Open the Neon `Connect` dialog.
3. Copy the `Pooled connection` string.
4. Use that value as `DATABASE_URL` in Vercel.

Expected shape:

```text
postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/DBNAME?sslmode=require
```

### Supabase alternative

1. Create a Supabase project.
2. Open `Connect`.
3. Copy a pooler connection string rather than a local-only direct URL.
4. Set that value as `DATABASE_URL` in Vercel.

For hosted Postgres, this API now applies an SSL fallback for Neon and Supabase hosts when the connection string does not already include SSL parameters. If your provider already gives you `sslmode=require`, keep it as-is.

### Local and test behavior

- Production and Vercel use `DATABASE_URL`
- Local dev can still use `USE_PGLITE_DEV=true`
- API tests still use in-memory PGlite and do not need a hosted database

## Vercel project setup

Create a Vercel project from this monorepo with:

- `Root Directory`: `apps/api`
- `Framework Preset`: `Other`

This repo includes [apps/api/vercel.json](C:\Users\Grwyl\repos\fitness-app\apps\api\vercel.json), which tells Vercel to run the API-specific build that also compiles the internal workspace packages used by the API.

Set these environment variables in the Vercel project:

- `DATABASE_URL`: your hosted Postgres connection string
- `NODE_ENV=production`

Optional:

- `PORT` is not needed on Vercel
- `USE_PGLITE_DEV` should be left unset in production

## Deploy the API

### Dashboard flow

1. Push the repo to GitHub.
2. Create a local `.env` that points `DATABASE_URL` at your hosted database.
3. Run the schema-and-seed step once from the repo root:

```powershell
npm run setup:dev --workspace @fitness/api
```

4. Import the repository into Vercel.
5. Set the project `Root Directory` to `apps/api`.
6. Add `DATABASE_URL` in the Vercel project environment variables.
7. Deploy.

That setup command currently creates the schema and inserts the seeded development user/program that the mobile app expects.

### CLI flow

From the repo root:

```powershell
vercel link --repo
vercel --prod
```

When linking, choose the project whose root directory is `apps/api`.

## Health check

After deploy, verify one of these URLs:

- `https://YOUR-PROJECT.vercel.app/health`
- `https://YOUR-PROJECT.vercel.app/api/v1/health`

Expected response:

```json
{
  "data": {
    "status": "ok"
  }
}
```

The actual payload also includes service metadata and seeded program info.

## Expo mobile tester setup

The mobile client reads its API base URL from `EXPO_PUBLIC_API_BASE_URL`.

For testers, set:

```text
EXPO_PUBLIC_API_BASE_URL=https://YOUR-PROJECT.vercel.app/api/v1
```

You can place that in:

- the Expo environment used for the build you share with testers
- a local `.env` when testing against the hosted backend yourself

## Suggested rollout

1. Create Neon Postgres.
2. Point local `DATABASE_URL` at the hosted database.
3. Run `npm run setup:dev --workspace @fitness/api` once.
4. Deploy the API to Vercel with the same `DATABASE_URL`.
5. Verify `/health`.
6. Set `EXPO_PUBLIC_API_BASE_URL` to the deployed `/api/v1` base URL.
7. Build and distribute the Expo app to testers.
