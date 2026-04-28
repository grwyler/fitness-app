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
- [x] Prevent mis-taps / duplicate sets
- [x] Add rest timer (simple, optional, non-blocking)
- [x] Improve completion feedback (make it feel rewarding)
- [x] Prevent completing a workout while the final set save is still in flight

---

### Priority 2 — Progress & History (High Impact)

- [x] View past workouts
- [x] Workout detail screen (sets, weights, exercises)
- [x] Show simple progression (already started)
- [x] Highlight improvements (e.g., "+10 lbs from last time")
- [x] Show streak or consistency metric (optional, simple)

---

#### Priority 3 — Program Experience

- [x] Follow predefined program
- [x] Clearly show:
  - current program
  - next workout
  - workout intent (sets/reps)
- [x] Show where the user is in the program (week/day)
- [x] Keep the Current Program or Program Setup card above Start Workout
- [x] Move Create Program into the program section
- [x] Seed multiple predefined programs:
  - 3-Day Full Body Beginner
  - 4-Day Upper/Lower
  - 4-Day Upper/Lower + Arms
  - 5-Day Push/Pull/Legs
  - 3-Day Strength Focus
  - 4-Day Hypertrophy Focus
- [x] Create custom programs by assigning reusable workout templates to ordered days
- [x] Allow custom program workout days to be reused under Your Workouts

---

### Priority 4 — Quick Custom Workout (MVP-safe)

- [x] Start a “Custom Workout”
- [x] Add exercises from existing list
- [x] Add sets (reuse existing logging UI)
- [x] Complete workout → saves to history
- [x] Make custom workout creation the primary dashboard start path
- [x] Keep predefined program workouts available behind a secondary chooser
- [x] Group predefined workouts by Push, Pull, Legs, Full Body, and Quick inside the chooser
- [x] Custom program days are saved as reusable workout templates
- [ ] Completed one-off custom workouts are not promoted into reusable templates yet
- [x] No editing exercises database

---

## Priority 5 — Auth & Stability

- [x] Replace hosted dev auth with first-party MVP auth
- [ ] Add session restore test
- [ ] Add basic error boundaries in mobile

---

## Feedback Loop (Auto-fed)

### High Priority

- [ ] Adaptive performance recalibration for out-of-model heavy logged sets
  - Detect when actual logged weight is materially above prescribed weight.
  - Treat strong heavy-day performance as a recalibration signal, not automatic failure.
  - Re-anchor future working weight conservatively from actual performance.
  - Show positive explanatory feedback from the backend progression result.

### Medium Priority

- [ ]

### Ideas

- [ ]

---

## Validation Checklist

- [x] Can I run 3+ real workouts without friction?
- [ ] Does progression feel correct when actual performance is far above the prescription?
- [x] Is anything confusing during a workout?
- [x] Does the app feel fast and responsive?

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
Keeping workout start friction low while expanding the predefined workout catalog.

Next task is:
Run through custom and predefined workout starts on web/mobile and capture any remaining picker friction.

Blockers:
No blocker on the local auth flow. Production now uses first-party MVP auth.
