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
