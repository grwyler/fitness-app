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

Phase 1 foundation is scaffolded:

- workspace configuration
- shared domain contracts
- database schema and starter seed data
- API bootstrap with health endpoint
- Expo app shell with a dashboard-oriented home screen

