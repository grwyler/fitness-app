# Fitness App - Product Roadmap

## Vision

A mobile-first training system that tells users exactly what to do in the gym and helps them progress over time with minimal friction.

---

## Current State

### Backend

- [x] Domain rules (progression, deload, advancement)
- [x] Use-cases
- [x] Transactions + idempotency
- [x] HTTP API
- [x] Tests
- [x] Clerk bearer-token auth boundary

### Mobile

- [x] Clerk auth flow
- [x] Dashboard
- [x] Start workout
- [x] Active workout flow
- [x] Log sets
- [x] Complete workout
- [x] Summary screen

---

## MVP Definition

A user can:

- [x] Create an account (auth)
- [x] Follow a predefined program
- [x] Log workouts easily
- [ ] See past workouts
- [ ] See basic progression

---

## Current Focus

### Priority 1 - Workout UX

- [ ] Improve set logging UX
- [ ] Add reps input polish
- [ ] Add weight input or quick adjust
- [ ] Add rest timer
- [ ] Improve feedback selection UX
- [ ] Improve completion feedback

---

### Priority 2 - Basic History

- [ ] View past workouts
- [ ] Show exercises + weights
- [ ] Show simple progression

---

### Priority 3 - Program Visibility

- [ ] Show current program
- [ ] Show next workout clearly
- [ ] Show exercise intent (sets/reps)

---

### Priority 4 - Auth Hardening

- [x] Integrate Clerk
- [x] Replace placeholder headers
- [x] Persist signed-in identity in mobile
- [x] Secure API endpoints with bearer auth
- [ ] Add password reset / account recovery flow
- [ ] Verify production Clerk environment and deploy config
- [ ] Add auth smoke-test coverage for sign-in and session restore

---

## Feedback Loop (Auto-fed)

### High Priority

- [ ]

### Medium Priority

- [ ]

### Ideas

- [ ]

---

## Validation Checklist

- [ ] Can I run 3+ real workouts without friction?
- [ ] Does progression feel correct?
- [ ] Is anything confusing during a workout?
- [ ] Does the app feel fast and responsive?

---

## Not MVP

- [ ] Template builder UI
- [ ] Exercise CRUD system
- [ ] Social features
- [ ] Advanced analytics
- [ ] Notifications
- [ ] Wearables integration

---

## Future Ideas

- [ ] Custom programs
- [ ] Coaching features
- [ ] AI-generated plans
- [ ] Advanced progression models

---

## Key Principles

- Progression logic is the core product
- Simplicity > flexibility
- Backend is source of truth
- Mobile UX must be frictionless

---

## Current Status

Right now I am working on:
Workout UX polish and basic history after local mobile auth completion.

Next task is:
Improve set logging UX and add history screens.

Blockers:
No blocker on the local auth flow. Production Clerk environment verification is still pending.
