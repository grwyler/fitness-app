# Deployment

## Recommended hosting path

Use:

- `Vercel` for the production mobile web app
- a separate `Vercel` project for the API
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

## Production web app setup

The public product URL should deploy the Expo mobile web app from the repository root.

The repo-level [vercel.json](C:\Users\Grwyl\repos\fitness-app\vercel.json) is the production web deployment config. It:

- runs `npm run build:mobile:web`
- publishes `apps/mobile/dist`
- rewrites all routes to `/` so Expo/React Navigation deep links load the SPA shell

Create or update the production web Vercel project with:

- `Root Directory`: repository root
- `Framework Preset`: `Other`
- `Build Command`: leave unset or use the checked-in `vercel.json`
- `Output Directory`: leave unset or use the checked-in `vercel.json`

Set these environment variables on the production web Vercel project:

- `EXPO_PUBLIC_API_BASE_URL`: `https://setwiseapi.vercel.app/api/v1`
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`: production Clerk publishable key for the same Clerk environment used by the API; it must start with `pk_live_`

Optional diagnostic flag:

- `EXPO_PUBLIC_AUTH_DIAGNOSTICS=1`: logs safe auth state diagnostics such as Clerk loaded, signed-in state, user-id presence, and token presence. It does not log secrets or token values.

Do not point the production web app at localhost or at a preview-only API.
Do not use Clerk development keys in production; production web builds fail when the publishable key does not start with `pk_live_`.

In the Clerk dashboard for the production Clerk application, configure:

- Allowed origin: `https://setwisefit.vercel.app`
- Sign-in redirect or fallback URL: `https://setwisefit.vercel.app`
- Sign-up redirect or fallback URL: `https://setwisefit.vercel.app`
- OAuth callback URLs for any enabled social providers, if applicable

## API Vercel project setup

Create a separate Vercel project from this monorepo with:

- `Root Directory`: `apps/api`
- `Framework Preset`: `Other`

This repo includes [apps/api/vercel.json](C:\Users\Grwyl\repos\fitness-app\apps\api\vercel.json), which tells Vercel to run the API-specific build that also compiles the internal workspace packages used by the API.

Set these environment variables in the Vercel project:

- `DATABASE_URL`: your hosted Postgres connection string
- `CLERK_PUBLISHABLE_KEY`: matching production Clerk publishable key, starting with `pk_live_`
- `CLERK_SECRET_KEY`: matching production Clerk backend secret key, starting with `sk_live_`
- `CORS_ALLOWED_ORIGINS`: comma-separated web origins allowed to call the API, for example `http://localhost:8081,https://setwisefit.vercel.app`
- `NODE_ENV=production`

Optional:

- `PORT` is not needed on Vercel
- `USE_PGLITE_DEV` should be left unset in production

## Deploy the API

## GitHub Actions flow

Merges to `main` deploy the production web app to Vercel automatically via [`.github/workflows/vercel-production.yml`](C:\Users\Grwyl\repos\fitness-app\.github\workflows\vercel-production.yml).

Add these repository secrets in GitHub before relying on the workflow:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`: the production web app Vercel project, not the API project

Optional repository variable:

- `VERCEL_PRODUCTION_URL`: the canonical production URL, for example `https://setwisefit.vercel.app`

The workflow can also be started manually from the GitHub Actions tab with `workflow_dispatch`.

The workflow builds the Vercel output, verifies the built app serves the Expo web HTML shell at `/` and a deep link path, deploys the prebuilt output, and smoke-checks the deployed URL. If the URL returns the API `NOT_FOUND` JSON payload, the workflow fails.

The API should either use a separate Vercel Git integration for the `apps/api` project or a separate API deployment workflow with its own project id secret. Do not reuse the production web app project id for the API.

## API dashboard flow

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

## API CLI flow

From the API workspace:

```powershell
cd apps/api
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
EXPO_PUBLIC_API_BASE_URL=https://setwiseapi.vercel.app/api/v1
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

## Web tester deployment

The Expo app can also be deployed as a browser-based tester app on Vercel.

Current tester URL:

- `https://mobile-ruddy-phi.vercel.app`

Current API base URL used by the deployed web build:

- `https://fitness-app-hazel-nine.vercel.app/api/v1`

The mobile web project lives in:

- [apps/mobile](C:\Users\Grwyl\repos\fitness-app\apps\mobile)

Important web deployment files:

- [apps/mobile/vercel.json](C:\Users\Grwyl\repos\fitness-app\apps\mobile\vercel.json)
- [apps/mobile/app.json](C:\Users\Grwyl\repos\fitness-app\apps\mobile\app.json)
- [apps/mobile/src/api/config.ts](C:\Users\Grwyl\repos\fitness-app\apps\mobile\src\api\config.ts)

Web commands:

```powershell
npm run dev:web --workspace @fitness/mobile
npm run build:web --workspace @fitness/mobile
```

The Vercel project for the tester web app should use:

- `Root Directory`: `apps/mobile`
- `Framework Preset`: `Other`

The checked-in mobile Vercel config:

- exports the Expo app as a static web build
- writes output to `dist`
- rewrites all routes back to `/` for SPA navigation
- reads `EXPO_PUBLIC_API_BASE_URL` from the Vercel project environment during the web build

Set these environment variables on the tester web Vercel project:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`

To redeploy the tester web app manually from the repo:

```powershell
cd apps/mobile
npx vercel deploy --prod --yes --scope grwylers-projects
```
