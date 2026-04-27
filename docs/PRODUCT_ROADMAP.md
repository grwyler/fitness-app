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
- [x] First-party bearer-token auth boundary

### Mobile

- [x] Email/password auth flow
- [x] Dashboard
- [x] Start workout
- [x] Active workout flow
- [x] Log sets
- [x] Complete workout
- [x] Summary screen

---

## MVP Definition

A user can:

- [x] Create an account
- [x] Follow a predefined program
- [x] Log workouts easily
- [x] See past workouts
- [x] See basic progression

---

## Current Focus

### Priority 1 — Workout UX (Critical)

- [x] Improve set logging UX
- [x] Fix layout issues (reps + button overflow)
- [x] Reps input polish (fast numeric entry, no friction)
- [x] Weight input polish (quick adjust, previous value autofill)
- [ ] Prevent mis-taps / duplicate sets
- [ ] Add rest timer (simple, optional, non-blocking)
- [ ] Improve completion feedback (make it feel rewarding)

---

### Priority 2 — Progress & History (High Impact)

- [x] View past workouts
- [ ] Workout detail screen (sets, weights, exercises)
- [ ] Show simple progression (already started)
- [ ] Highlight improvements (e.g., "↑ +10 lbs from last time")
- [ ] Show streak or consistency metric (optional, simple)

---

#### Priority 3 — Program Experience

- [x] Follow predefined program
- [ ] Clearly show:
  - current program
  - next workout
  - workout intent (sets/reps)
- [ ] Show where the user is in the program (week/day)

---

### Priority 4 — Quick Custom Workout (MVP-safe)

- [ ] Start a “Custom Workout”
- [ ] Add exercises from existing list
- [ ] Add sets (reuse existing logging UI)
- [ ] Complete workout → saves to history
- [ ] No saving templates (yet)
- [ ] No editing exercises database

---

## Priority 5 — Auth & Stability

- [x] Replace hosted dev auth with first-party MVP auth
- [ ] Add session restore test
- [ ] Add basic error boundaries in mobile

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
No blocker on the local auth flow. Production now uses first-party MVP auth.
