# Domain Rules

This document defines the production rules for the V1 workout domain.

These rules are authoritative for backend and mobile. If an implementation disagrees with this document, the implementation is wrong and must be updated before shipping.

## 1. Numeric Handling

### Options considered

#### Option A

Store weights as PostgreSQL `numeric` and represent them as TypeScript `number`.

Pros:

- simple mobile and API ergonomics
- easy arithmetic in application code
- JSON remains natural

Cons:

- requires explicit normalization at the persistence boundary
- careless arithmetic can introduce floating-point noise

#### Option B

Store weights as PostgreSQL `numeric` and represent them as TypeScript `string`.

Pros:

- exact representation across DB and application boundaries
- avoids floating-point ambiguity

Cons:

- awkward API ergonomics
- every consumer must parse before doing math
- easy to accidentally mix parsed and unparsed values

#### Option C

Store weights as floating-point in the database and represent them as TypeScript `number`.

Pros:

- simplest technical shape

Cons:

- weakest precision guarantees
- unnecessary risk for trust-critical progression logic

### Recommendation

Recommend Option A.

It keeps the external API and mobile code straightforward while preserving exact storage in the database. The rule is simple: persistence uses `numeric`, application contracts use `number`, and all progression math must round to two decimal places before persistence or response serialization.

### Final decision

- Database weight and increment fields use PostgreSQL `numeric`.
- Shared TypeScript contracts represent weight and increment values as `number`.
- Repository and service layers must normalize database `numeric` values into TypeScript `number` before they cross into domain logic or API DTOs.
- All weight calculations must round to two decimal places immediately after calculation.

## 2. Unit System

### Options considered

#### Option A

Store pounds canonically in the database and convert to metric at the product edge.

Pros:

- simplest progression model
- one source of truth for all calculations
- avoids dual-unit drift in historical data

Cons:

- metric users always depend on conversion logic

#### Option B

Store both pounds and kilograms in the database.

Pros:

- can avoid repeated conversions

Cons:

- duplicate sources of truth
- high risk of divergence
- more schema and validation complexity

#### Option C

Store values in the user’s preferred unit.

Pros:

- user-facing values match storage

Cons:

- progression rules become harder to reason about across users
- shared program templates become more complex

### Recommendation

Recommend Option A.

V1 should keep one canonical progression model. Pounds are already the dominant shape in the current docs, schema, and DTOs. Metric support can still exist as a display/input conversion layer without complicating the persistence model.

### Final decision

- All persisted workout, progression, and program weight values are canonical pounds.
- Shared API DTOs expose canonical pound-based values for V1.
- `users.unit_system` controls client display and input conversion only.
- Metric users may enter and view kilograms in the UI, but backend persistence and progression calculations convert those values to canonical pounds first.

## 3. Progression Initialization

### Options considered

#### Option A

Require users to set starting weights during onboarding before they can start a workout.

Pros:

- more personalized
- no hidden defaults

Cons:

- adds friction before the first workout
- conflicts with the low-cognitive-load product goal

#### Option B

Use seeded default starting weights per exercise and lazily create missing progression state on first use.

Pros:

- zero friction for first workout
- deterministic
- works with the current product direction

Cons:

- defaults may be imperfect for some users

#### Option C

If progression state is missing, fail workout start and ask the user to enter weights.

Pros:

- no hidden assumptions

Cons:

- poor first-run experience
- directly conflicts with the intended workout flow

### Recommendation

Recommend Option B.

V1 needs a first workout that always starts. The system should own the initial decision. Users can gain more control later, but V1 must remain decisive and low friction.

### Final decision

- Each exercise must have a seeded default starting weight in canonical pounds for V1.
- If `progression_states` is missing for a user and exercise during workout start, the backend creates that row transactionally using the seeded starting weight for that exercise.
- This lazy initialization happens before the workout session payload is returned.
- Starting a first workout must not fail solely because the user has no prior progression state.
- The initialization source is system-generated defaults in V1. There is no mandatory user-entered starting-weight step in V1.

## 4. Program Advancement

### Options considered

#### Option A

`current_workout_template_id` means the template currently in progress.

Pros:

- name sounds intuitive at first glance

Cons:

- conflicts with dashboard “next workout” needs
- becomes ambiguous when there is no active session

#### Option B

`current_workout_template_id` means the next template that should be started for the active enrollment.

Pros:

- deterministic
- works whether or not a workout is currently in progress
- aligns with dashboard and “start next workout” behavior

Cons:

- the field name is slightly misleading and must be documented clearly

#### Option C

Do not persist the current template pointer at all; derive it from history every time.

Pros:

- less state to manage

Cons:

- more expensive queries
- harder debugging
- contradicts the explicit-state philosophy used elsewhere

### Recommendation

Recommend Option B.

The product needs a reliable “next workout” pointer for dashboard rendering and workout start. Explicit state is cleaner and easier to debug than deriving rotation repeatedly from history.

### Final decision

- `user_program_enrollments.current_workout_template_id` means the next active workout template that should be started for that enrollment.
- When an active enrollment is created, this field is initialized to the active template with the lowest `sequence_order`.
- `startWorkoutSession` reads this field but does not advance it.
- `completeWorkoutSession` advances it to the next active template in ascending `sequence_order`.
- If the completed template is the highest active `sequence_order`, advancement wraps to the lowest active `sequence_order`.
- Abandoned or still in-progress workouts do not advance the pointer.

## 5. Deload Rule

### Options considered

#### Option A

Reduce by 5%.

Pros:

- conservative
- less disruptive

Cons:

- may be too small to feel meaningful after repeated failure

#### Option B

Reduce by 10%.

Pros:

- simple
- noticeable
- still within the original documented range

Cons:

- more aggressive than 5%

#### Option C

Use different deload percentages for compound and accessory exercises.

Pros:

- more tailored

Cons:

- adds unnecessary complexity to V1

### Recommendation

Recommend Option B.

Ten percent is simple, deterministic, and already allowed by the existing docs. The important part is not the exact percentage; it is that the rule is explainable and consistent.

### Final decision

- A deload is triggered after the second consecutive failed workout outcome for the same user and exercise.
- Failed workout outcome means at least one set for that exercise in the completed workout had `actualReps < targetReps`.
- The next planned weight becomes `current_weight_lbs * 0.9`.
- After the 10% reduction, the value is rounded down to the nearest supported exercise increment in pounds.
- If rounding down would produce the same weight as before, subtract one full supported increment instead.
- The result may not go below zero.
- After a deload is applied, `consecutive_failures` resets to `0`.

## 6. Rest Timer

### Options considered

#### Option A

Rest lives on the exercise entry and is constant for all sets of that exercise.

Pros:

- simple contract
- matches the current template model
- enough for V1

Cons:

- cannot express different rest between warm-up and working sets

#### Option B

Rest lives on each set.

Pros:

- maximum flexibility

Cons:

- extra complexity in templates, snapshots, and UI
- unnecessary for V1

#### Option C

Rest is only client-side derived by exercise category.

Pros:

- no extra response field required

Cons:

- backend and client can drift
- harder historical consistency

### Recommendation

Recommend Option A.

The current model already supports exercise-level template rest. V1 should keep one rest duration per exercise, snapshot it into the workout session payload, and let the client run the timer locally.

### Final decision

- `restSeconds` is an exercise-level field, not a set-level field, in V1.
- It belongs on the active workout contract for each `ExerciseEntryDto`.
- The value is sourced from the workout template exercise entry and snapshotted into the workout session payload.
- All sets within the same exercise entry use the same `restSeconds` value in V1.
- The rest timer is client-run and does not require round trips after a set is logged.

## 7. Idempotency

### Options considered

#### Option A

Require idempotency keys for all mutation endpoints in the workout flow.

Pros:

- strongest retry safety
- mobile behavior is predictable
- protects progression and session creation

Cons:

- slightly more client and backend bookkeeping

#### Option B

Require idempotency only for workout completion.

Pros:

- less implementation work

Cons:

- duplicate session creation and duplicate set logs remain a risk

#### Option C

Do not use idempotency keys and rely on DB constraints plus client retry behavior.

Pros:

- simplest short-term implementation

Cons:

- weaker mobile retry guarantees
- harder to distinguish replay from true conflict

### Recommendation

Recommend Option A.

The workout flow is exactly where mobile retry safety matters. Session creation, set logging, and workout completion all have user-visible consequences and should be replay-safe.

### Final decision

- `Idempotency-Key` is required for:
  - `POST /api/v1/workout-sessions/start`
  - `POST /api/v1/sets/{setId}/log`
  - `POST /api/v1/workout-sessions/{sessionId}/complete`
- `Idempotency-Key` is not used for `GET` endpoints.
- The key is client-generated and must be unique per logical mutation attempt.
- Idempotency keys are scoped by authenticated user plus route family plus target resource where applicable.
- Repeating the same request with the same key and the same effective payload must return the original stored result, not perform the mutation again.
- Reusing the same key with a materially different payload must return a conflict error.
- Mobile must generate a new idempotency key for each new logical mutation and reuse that same key only when retrying the exact same mutation.

## 8. API Shape Decisions

### Dashboard

- `GET /api/v1/dashboard` is the primary dashboard-read endpoint for V1.
- It returns:
  - `activeWorkoutSession`
  - `nextWorkoutTemplate`
  - `recentProgressMetrics`
  - `recentWorkoutHistory`
  - `weeklyWorkoutCount`
- If an in-progress session exists, `activeWorkoutSession` is populated and `nextWorkoutTemplate` still reflects the next template pointer from the enrollment.

### Current Session

- `GET /api/v1/workout-sessions/current` returns the currently active workout session for the authenticated user.
- If there is no active in-progress session, the endpoint returns `activeWorkoutSession: null`.
- This endpoint must return the same `WorkoutSessionDto` shape used by workout start and completion responses.

## 9. Test Requirements

These rules must be covered before Phase 2 is considered stable:

- progression outcome calculation:
  - completed normally
  - too easy
  - too hard
  - first failure
  - second consecutive failure
- deload rounding behavior:
  - standard 10% drop
  - rounding down to increment
  - forced decrement when rounded result equals prior weight
- program advancement:
  - initial template selection
  - standard next-template advancement
  - wrap-around at end of sequence
  - no advancement on abandoned workout
  - no advancement on in-progress workout
- first-time progression initialization:
  - missing state creates default state
  - workout start succeeds on first workout
- idempotency behavior:
  - same key and same payload replays prior result
  - same key and different payload returns conflict

