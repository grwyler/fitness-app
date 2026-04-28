# Deployment Overview

Production uses two separate Vercel projects:

- UI: the repo-root Vercel project, configured by [../vercel.json](C:\Users\Grwyl\repos\fitness-app\vercel.json)
- API: a separate API Vercel project, deployed from [../vercel.api.json](C:\Users\Grwyl\repos\fitness-app\vercel.api.json)

## UI Deployment

Merges to `main` deploy the Expo web app automatically through [../.github/workflows/vercel-production.yml](C:\Users\Grwyl\repos\fitness-app\.github\workflows\vercel-production.yml).

The UI workflow installs dependencies, builds the mobile web app, smoke-checks the built SPA shell, deploys prebuilt Vercel output, and smoke-checks production. This existing behavior is unchanged.

Required GitHub secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Optional GitHub variable:

- `VERCEL_PRODUCTION_URL`

Required Vercel environment variable for the UI project:

- `EXPO_PUBLIC_API_BASE_URL`

## API Deployment

Merges to `main` deploy the API automatically through [../.github/workflows/vercel-api-production.yml](C:\Users\Grwyl\repos\fitness-app\.github\workflows\vercel-api-production.yml).

The API workflow installs dependencies, builds `@fitness/shared`, `@fitness/db`, and `@fitness/api`, runs the backend test suite, builds API Vercel output, deploys prebuilt output to the API project, and smoke-checks `/health`.

Required GitHub secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_API_PROJECT_ID`

Optional GitHub variable:

- `VERCEL_API_PRODUCTION_URL`

Required Vercel environment variables for the API project:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ALLOWED_ORIGINS`
- `NODE_ENV=production`

## Database Changes

The API deployment workflow does not run production schema changes automatically. Apply reviewed migrations or SQL changes before merging API code that depends on them.

Do not run `npm run setup:dev --workspace @fitness/api` in production CI. It is a local/development setup command and can seed development data.

## Rollback And Manual Redeploy

To roll back, promote a previous production deployment from the appropriate Vercel project dashboard.

To redeploy the latest `main`, run the matching GitHub Actions workflow manually with `workflow_dispatch`:

- UI: `Deploy to Vercel`
- API: `Deploy API to Vercel`
