# Fitness App

Production-oriented monorepo scaffold for a mobile-first fitness app focused on the workout loop:

Open app -> start workout -> log sets -> complete workout -> review progress

## Workspace layout

- `apps/mobile`: Expo / React Native client
- `apps/api`: TypeScript API service
- `packages/shared`: shared domain types and API contracts
- `packages/db`: PostgreSQL schema and seed definitions
- `docs`: product, architecture, data model, API, and flow documentation

## Stack decisions

- Mobile: Expo + React Native + React Query + Zustand
- API: Express + Zod
- Database: PostgreSQL + Drizzle ORM
- Auth: Clerk-compatible bearer token boundary

## Current status

Backend foundation and the first backend workout vertical slice are implemented:

- domain rules and shared contracts are finalized
- production-oriented Postgres schema and Drizzle repositories are in place
- workout use-cases are implemented with transactions and idempotency
- HTTP endpoints for dashboard/current/start/log/complete are wired
- backend tests cover domain, application, infrastructure, and HTTP layers

See [BACKEND.md](C:\Users\Grwyl\repos\fitness-app\BACKEND.md) for backend run, test, env, and auth details.
See [DEPLOYMENT.md](C:\Users\Grwyl\repos\fitness-app\DEPLOYMENT.md) for Vercel + hosted Postgres deployment steps.

For a full local run, use:

1. `Copy-Item .env.example .env`
2. `npm run setup:dev --workspace @fitness/api`
3. `npm run dev --workspace @fitness/api`
4. `npm run dev --workspace @fitness/mobile`

For a hosted tester environment, follow [DEPLOYMENT.md](C:\Users\Grwyl\repos\fitness-app\DEPLOYMENT.md), including the one-time `npm run setup:dev --workspace @fitness/api` against the hosted Postgres database before deploying the API.

To open the mobile app in a browser from the repo root, use:

`npm run dev:mobile:web`

Important:
- Run Expo from the mobile workspace or via the root workspace scripts above.
- Do not run `npx expo start` from the repo root, because Expo will treat the monorepo root as the app project and fail to resolve the correct entry file.
