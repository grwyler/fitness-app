# **Fitness App Data Model / Schema Doc**

## **1\. Purpose**

This document defines the V1 data model for the Fitness App.

The system is designed to support:

* Fast workout loading  
* Simple workout logging  
* Deterministic progression  
* Low-friction user experience  
* Reliable progress tracking  
* Future extensibility without overcomplicating V1

The recommended database is **PostgreSQL**.

---

# **2\. Core Entity Overview**

Primary entities:

* User  
* Exercise  
* Workout Template  
* Workout Session  
* Exercise Entry  
* Set  
* Progress Metrics  
* Program / Plan

High-level relationship:

User

└── Program Enrollment

     └── Workout Sessions

          └── Exercise Entries

               └── Sets

Program / Plan

└── Workout Templates

     └── Template Exercise Entries

          └── Exercise

---

# **3\. Data Modeling Principles**

## **Embedded vs Referenced Data**

### **Referenced Data**

Use references when data is reused, queried independently, or shared across users.

Examples:

* Exercises  
* Programs  
* Workout Templates  
* Users

### **Embedded / Snapshot Data**

Use embedded snapshot fields when historical accuracy matters.

Workout history should not change if a template or exercise changes later.

Examples:

* Exercise name at time of workout  
* Target sets/reps at time of workout  
* Target weight at time of workout  
* Progression rule used at time of workout

Rule:

Templates define what should happen. Sessions record what actually happened.

---

# **4\. Tables**

---

# **4.1 Users**

Stores application user profile and account-level settings.

## **Table: `users`**

| Field | Type | Required | Notes |
| ----- | ----- | ----- | ----- |
| `id` | UUID | Yes | Primary key |
| `auth_provider_id` | Text | Yes | Legacy external auth field; app auth mirrors `id` here for compatibility |
| `email` | Text | Yes | Unique |
| `password_hash` | Text | No | Hashed app password for first-party MVP auth; nullable only for legacy/reset users |
| `display_name` | Text | No | User-facing name |
| `timezone` | Text | Yes | Default: `America/New_York` |
| `unit_system` | Text | Yes | `imperial` or `metric` |
| `experience_level` | Text | No | `beginner`, `intermediate`, `advanced` |
| `created_at` | Timestamp | Yes | Audit field |
| `updated_at` | Timestamp | Yes | Audit field |
| `deleted_at` | Timestamp | No | Soft delete |

## **Validation Rules**

* `email` must be unique.  
* `unit_system` must be one of:  
  * `imperial`  
  * `metric`  
* `timezone` must be a valid IANA timezone.  
* `auth_provider_id` must be unique.

---

# **4.2 Exercises**

Stores reusable exercise definitions.

## **Table: `exercises`**

| Field | Type | Required | Notes |
| ----- | ----- | ----- | ----- |
| `id` | UUID | Yes | Primary key |
| `name` | Text | Yes | Example: `Bench Press` |
| `category` | Text | Yes | `compound`, `accessory` |
| `movement_pattern` | Text | No | `push`, `pull`, `squat`, `hinge`, etc. |
| `primary_muscle_group` | Text | No | Example: `chest` |
| `equipment_type` | Text | No | `barbell`, `dumbbell`, `machine`, `bodyweight` |
| `default_target_sets` | Integer | No | Suggested sets when adding to a custom workout |
| `default_target_reps` | Integer | No | Suggested reps when adding to a custom workout |
| `default_starting_weight_lbs` | Numeric | Yes | Suggested starting weight for progression & custom workouts |
| `default_increment_lbs` | Numeric | Yes | Example: `5`, `2.5` |
| `is_bodyweight` | Boolean | Yes | Default: `false` |
| `is_weight_optional` | Boolean | Yes | Default: `false` (bodyweight exercises set this true) |
| `is_progression_eligible` | Boolean | Yes | Default: `true` |
| `is_active` | Boolean | Yes | Default: `true` |
| `created_at` | Timestamp | Yes | Audit field |
| `updated_at` | Timestamp | Yes | Audit field |

## **Validation Rules**

* `name` must be unique.  
* `category` must be one of:  
  * `compound`  
  * `accessory`  
* `default_increment_lbs` must be greater than `0`.  
* If provided, `default_target_sets` / `default_target_reps` must be greater than `0`.
* In V1, exercises are system-managed, not user-created.

---

# **4.3 Programs / Plans**

Represents a structured training plan assigned to users.

MVP+ exposes several system-managed predefined programs and user-created custom programs. Custom
programs are built from ordered workout templates; the backend remains the source of truth for the
saved program and its workout days.

## **Table: `programs`**

| Field | Type | Required | Notes |
| ----- | ----- | ----- | ----- |
| `id` | UUID | Yes | Primary key |
| `user_id` | UUID | No | FK -> `users.id`; null for predefined programs |
| `source` | Text | Yes | `predefined` or `custom` |
| `name` | Text | Yes | Example: `3-Day Full Body Beginner` |
| `description` | Text | No | Program summary |
| `days_per_week` | Integer | Yes | V1 default: `3` |
| `session_duration_minutes` | Integer | Yes | V1: `45–60` |
| `difficulty_level` | Text | Yes | `beginner`, `intermediate`, `advanced` |
| `is_active` | Boolean | Yes | Default: `true` |
| `created_at` | Timestamp | Yes | Audit field |
| `updated_at` | Timestamp | Yes | Audit field |

## **Validation Rules**

* `days_per_week` must be between `1` and `7`.  
* `session_duration_minutes` must be greater than `0`.  
* `source = predefined` programs are system-managed and shared.
* `source = custom` programs are user-owned and can be used as reusable workout definitions.
* Completed one-off custom workout sessions are not promoted into reusable templates yet.

---

# **4.4 User Program Enrollment**

Tracks which program a user is currently following.

## **Table: `user_program_enrollments`**

| Field | Type | Required | Notes |
| ----- | ----- | ----- | ----- |
| `id` | UUID | Yes | Primary key |
| `user_id` | UUID | Yes | FK → `users.id` |
| `program_id` | UUID | Yes | FK → `programs.id` |
| `status` | Text | Yes | `active`, `paused`, `completed`, `cancelled` |
| `started_at` | Timestamp | Yes | When user started |
| `completed_at` | Timestamp | No | Nullable |
| `current_workout_template_id` | UUID | No | FK → `workout_templates.id` |
| `created_at` | Timestamp | Yes | Audit field |
| `updated_at` | Timestamp | Yes | Audit field |

## **Validation Rules**

* A user may only have one active enrollment at a time.  
* `completed_at` must be null unless status is `completed`.  
* `status` must be one of:  
  * `active`  
  * `paused`  
  * `completed`  
  * `cancelled`

---

# **4.5 Workout Templates**

Defines planned workouts, such as Workout A, Workout B, Workout C.

Templates are reusable. Sessions are created from templates.

## **Table: `workout_templates`**

| Field | Type | Required | Notes |
| ----- | ----- | ----- | ----- |
| `id` | UUID | Yes | Primary key |
| `program_id` | UUID | Yes | FK → `programs.id` |
| `name` | Text | Yes | Example: `Workout A` |
| `sequence_order` | Integer | Yes | Determines rotation |
| `estimated_duration_minutes` | Integer | No | Example: `60` |
| `is_active` | Boolean | Yes | Default: `true` |
| `created_at` | Timestamp | Yes | Audit field |
| `updated_at` | Timestamp | Yes | Audit field |

## **Validation Rules**

* `sequence_order` must be unique within a program.  
* Templates should not be deleted if used by historical sessions.  
* Use `is_active = false` instead of deleting.

---

# **4.6 Workout Template Exercise Entries**

Defines exercises inside a workout template.

Example:

Workout A:

1. Squat  
2. Bench Press  
3. Row  
4. Bicep Curl  
5. Tricep Pushdown

## **Table: `workout_template_exercise_entries`**

| Field | Type | Required | Notes |
| ----- | ----- | ----- | ----- |
| `id` | UUID | Yes | Primary key |
| `workout_template_id` | UUID | Yes | FK → `workout_templates.id` |
| `exercise_id` | UUID | Yes | FK → `exercises.id` |
| `sequence_order` | Integer | Yes | Display/order in workout |
| `target_sets` | Integer | Yes | V1 default: `3` |
| `target_reps` | Integer | Yes | V1 default: `8` |
| `rest_seconds` | Integer | No | Optional |
| `created_at` | Timestamp | Yes | Audit field |
| `updated_at` | Timestamp | Yes | Audit field |

## **Validation Rules**

* `target_sets` must be greater than `0`.  
* `target_reps` must be greater than `0`.  
* `sequence_order` must be unique within a workout template.  
* V1 should default to `3 × 8`.

---

# **4.7 Workout Sessions**

Represents one actual workout performed or started by a user.

This is the historical record.

## **Table: `workout_sessions`**

| Field | Type | Required | Notes |
| ----- | ----- | ----- | ----- |
| `id` | UUID | Yes | Primary key |
| `user_id` | UUID | Yes | FK → `users.id` |
| `program_id` | UUID | Yes | FK → `programs.id` |
| `workout_template_id` | UUID | Yes | FK → `workout_templates.id` |
| `status` | Text | Yes | `planned`, `in_progress`, `completed`, `abandoned` |
| `started_at` | Timestamp | No | Set when workout begins |
| `completed_at` | Timestamp | No | Set when workout finishes |
| `duration_seconds` | Integer | No | Calculated on completion |
| `user_effort_feedback` | Text | No | Optional overall session feedback |
| `created_at` | Timestamp | Yes | Audit field |
| `updated_at` | Timestamp | Yes | Audit field |

## **Snapshot Fields**

| Field | Type | Required | Notes |
| ----- | ----- | ----- | ----- |
| `program_name_snapshot` | Text | Yes | Historical program name |
| `workout_name_snapshot` | Text | Yes | Historical workout name |

## **Validation Rules**

* `status` must be one of:  
  * `planned`  
  * `in_progress`  
  * `completed`  
  * `abandoned`  
* `completed_at` must be set when status is `completed`.  
* `duration_seconds` must be positive if present.  
* A user should only have one `in_progress` workout at a time.

---

# **4.8 Exercise Entries**

Represents one exercise inside a specific workout session.

Example:

Bench Press within Garrett’s Workout A on Monday.

## **Table: `exercise_entries`**

| Field | Type | Required | Notes |
| ----- | ----- | ----- | ----- |
| `id` | UUID | Yes | Primary key |
| `workout_session_id` | UUID | Yes | FK → `workout_sessions.id` |
| `exercise_id` | UUID | Yes | FK → `exercises.id` |
| `sequence_order` | Integer | Yes | Exercise order |
| `target_sets` | Integer | Yes | Snapshot from template |
| `target_reps` | Integer | Yes | Snapshot from template |
| `target_weight_lbs` | Numeric | Yes | Generated by progression engine |
| `effort_feedback` | Text | No | `too_easy`, `just_right`, `too_hard` |
| `completed_at` | Timestamp | No | Set when exercise is done |
| `created_at` | Timestamp | Yes | Audit field |
| `updated_at` | Timestamp | Yes | Audit field |

## **Snapshot Fields**

| Field | Type | Required | Notes |
| ----- | ----- | ----- | ----- |
| `exercise_name_snapshot` | Text | Yes | Example: `Bench Press` |
| `exercise_category_snapshot` | Text | Yes | `compound` or `accessory` |
| `progression_rule_snapshot` | JSONB | No | Rule used at time of workout |

## **Validation Rules**

* `target_sets` must be greater than `0`.  
* `target_reps` must be greater than `0`.  
* `target_weight_lbs` must be greater than or equal to `0`.  
* `effort_feedback` must be one of:  
  * `too_easy`  
  * `just_right`  
  * `too_hard`  
* `sequence_order` must be unique within a workout session.

---

# **4.9 Sets**

Represents each logged set for an exercise entry.

## **Table: `sets`**

| Field | Type | Required | Notes |
| ----- | ----- | ----- | ----- |
| `id` | UUID | Yes | Primary key |
| `exercise_entry_id` | UUID | Yes | FK → `exercise_entries.id` |
| `set_number` | Integer | Yes | 1, 2, 3 |
| `target_reps` | Integer | Yes | Snapshot |
| `actual_reps` | Integer | No | User logged |
| `target_weight_lbs` | Numeric | Yes | Snapshot |
| `actual_weight_lbs` | Numeric | No | Usually same as target |
| `status` | Text | Yes | `pending`, `completed`, `skipped`, `failed` |
| `completed_at` | Timestamp | No | Set when logged |
| `created_at` | Timestamp | Yes | Audit field |
| `updated_at` | Timestamp | Yes | Audit field |

## **Validation Rules**

* `set_number` must be unique within an exercise entry.  
* `target_reps` must be greater than `0`.  
* `actual_reps` must be greater than or equal to `0`.  
* `target_weight_lbs` must be greater than or equal to `0`.  
* `actual_weight_lbs` must be greater than or equal to `0`.  
* `status` must be one of:  
  * `pending`  
  * `completed`  
  * `skipped`  
  * `failed`

## **Failure Detection**

A set is considered failed in the normal V1 case if:

actual\_reps \< target\_reps

This should feed progression logic automatically only when actual weight is at or near target weight.

Post-MVP immediate priority: if `actual_weight_lbs` is materially higher than `target_weight_lbs`, lower reps should not automatically classify the set or exercise as failed. The backend progression engine should evaluate the full exercise performance and may classify the result as overperformance / recalibration-needed.

To avoid blocking workout completion, the set can remain logged/completed for workflow purposes while the exercise-level progression result is recalibrated during workout completion.

Recommended threshold:

actual\_weight\_lbs >= target\_weight\_lbs \* 1.25

The exact threshold may be tuned, but the first implementation should use a conservative material-difference threshold such as 25-30%.

---

# **4.10 Progression State**

Stores the current progression state for each user and exercise.

This should be explicit, not recalculated from history every time.

## **Table: `progression_states`**

| Field | Type | Required | Notes |
| ----- | ----- | ----- | ----- |
| `id` | UUID | Yes | Primary key |
| `user_id` | UUID | Yes | FK → `users.id` |
| `exercise_id` | UUID | Yes | FK → `exercises.id` |
| `current_weight_lbs` | Numeric | Yes | Next planned weight |
| `last_completed_weight_lbs` | Numeric | No | Last successful weight |
| `consecutive_failures` | Integer | Yes | Default: `0` |
| `last_effort_feedback` | Text | No | Last feedback |
| `last_performed_at` | Timestamp | No | Last time exercise was done |
| `created_at` | Timestamp | Yes | Audit field |
| `updated_at` | Timestamp | Yes | Audit field |

## **Validation Rules**

* One progression state per user per exercise.  
* `current_weight_lbs` must be greater than or equal to `0`.  
* `consecutive_failures` must be greater than or equal to `0`.  
* `last_effort_feedback` must be one of:  
  * `too_easy`  
  * `just_right`  
  * `too_hard`

---

# **4.11 Progress Metrics**

Stores derived progress records used for dashboard, history, and trust-building feedback.

Examples:

* `+5 lbs from last session`  
* `New personal best`  
* `3 workouts completed this week`

## **Table: `progress_metrics`**

| Field | Type | Required | Notes |
| ----- | ----- | ----- | ----- |
| `id` | UUID | Yes | Primary key |
| `user_id` | UUID | Yes | FK → `users.id` |
| `exercise_id` | UUID | No | Nullable for general metrics |
| `workout_session_id` | UUID | No | FK → `workout_sessions.id` |
| `metric_type` | Text | Yes | Type of metric |
| `metric_value` | Numeric | No | Optional numeric value |
| `display_text` | Text | Yes | User-facing message |
| `recorded_at` | Timestamp | Yes | When metric was created |
| `created_at` | Timestamp | Yes | Audit field |

## **Metric Types**

Recommended values:

* `weight_increase`  
* `personal_best`  
* `workout_completed`  
* `weekly_workout_count`  
* `completion_streak`  
* `volume_increase`

## **Validation Rules**

* `metric_type` must be controlled by an enum or app-level constant.  
* `display_text` should be short and user-facing.  
* Metrics should be append-only.

---

# **5\. Indexes**

## **Users**

CREATE UNIQUE INDEX idx\_users\_auth\_provider\_id ON users(auth\_provider\_id);

CREATE UNIQUE INDEX idx\_users\_email ON users(email);

## **Exercises**

CREATE UNIQUE INDEX idx\_exercises\_name ON exercises(name);

CREATE INDEX idx\_exercises\_category ON exercises(category);

## **Programs**

CREATE INDEX idx\_programs\_is\_active ON programs(is\_active);

## **User Program Enrollments**

CREATE INDEX idx\_user\_program\_enrollments\_user\_id ON user\_program\_enrollments(user\_id);

CREATE INDEX idx\_user\_program\_enrollments\_status ON user\_program\_enrollments(status);

CREATE UNIQUE INDEX idx\_one\_active\_program\_per\_user

ON user\_program\_enrollments(user\_id)

WHERE status \= 'active';

## **Workout Templates**

CREATE INDEX idx\_workout\_templates\_program\_id ON workout\_templates(program\_id);

CREATE UNIQUE INDEX idx\_workout\_templates\_program\_sequence

ON workout\_templates(program\_id, sequence\_order);

## **Workout Sessions**

CREATE INDEX idx\_workout\_sessions\_user\_id ON workout\_sessions(user\_id);

CREATE INDEX idx\_workout\_sessions\_user\_started\_at ON workout\_sessions(user\_id, started\_at DESC);

CREATE INDEX idx\_workout\_sessions\_status ON workout\_sessions(status);

CREATE UNIQUE INDEX idx\_one\_in\_progress\_workout\_per\_user

ON workout\_sessions(user\_id)

WHERE status \= 'in\_progress';

## **Exercise Entries**

CREATE INDEX idx\_exercise\_entries\_workout\_session\_id

ON exercise\_entries(workout\_session\_id);

CREATE INDEX idx\_exercise\_entries\_exercise\_id

ON exercise\_entries(exercise\_id);

CREATE UNIQUE INDEX idx\_exercise\_entries\_session\_sequence

ON exercise\_entries(workout\_session\_id, sequence\_order);

## **Sets**

CREATE INDEX idx\_sets\_exercise\_entry\_id ON sets(exercise\_entry\_id);

CREATE UNIQUE INDEX idx\_sets\_entry\_set\_number

ON sets(exercise\_entry\_id, set\_number);

## **Progression State**

CREATE UNIQUE INDEX idx\_progression\_states\_user\_exercise

ON progression\_states(user\_id, exercise\_id);

CREATE INDEX idx\_progression\_states\_user\_id

ON progression\_states(user\_id);

## **Progress Metrics**

CREATE INDEX idx\_progress\_metrics\_user\_recorded\_at

ON progress\_metrics(user\_id, recorded\_at DESC);

CREATE INDEX idx\_progress\_metrics\_user\_metric\_type

ON progress\_metrics(user\_id, metric\_type);

CREATE INDEX idx\_progress\_metrics\_exercise\_id

ON progress\_metrics(exercise\_id);

---

# **6\. Validation Rules Summary**

## **General**

* All primary keys should use UUIDs.  
* All user-owned records must include `user_id`.  
* Use soft deletes only where needed.  
* Historical workout data should never be mutated casually.  
* Templates can change, but completed sessions should remain historically accurate.

## **Workout Logging**

* A user can only have one active workout session.  
* Sets should be pre-created when a workout session starts.  
* Set logging should update quickly and support optimistic UI.  
* Actual reps below target reps should count as failure when actual weight is at or near target weight.
* Materially heavier actual weight should be evaluated by backend progression as potential overperformance / recalibration-needed.
* Workout completion should trigger progression update.

## **Progression**

Progression should be deterministic.

Post-MVP immediate priority: progression should also support adaptive performance recalibration when logged weight is materially above the prescription. The backend should use actual performance as a strength signal and re-anchor `current_weight_lbs` more aggressively than the normal fixed increment, while remaining conservative enough to preserve safe progressive overload.

Candidate recalibration inputs:

* Best valid set
* Median valid set
* Conservative average across completed sets
* Estimated 1RM, for example `e1rm = weight * (1 + reps / 30)`

Candidate safeguards:

* Require material weight overperformance, such as 25-30% or more above target.
* Treat repeated heavy sets as stronger evidence than one anomalous heavy set.
* Use a 1-2 workout recalibration window before fully converging on the new working weight.
* Do not let the mobile client mutate permanent progression state from local-only calculations.

### **Compound Lifts**

| Condition | Result |
| ----- | ----- |
| Completed normally | \+5 lbs |
| Too Easy | \+10 lbs |
| Too Hard | Repeat weight |
| First failure | Repeat weight |
| Second failure | Reduce by 5–10% |

### **Accessory Lifts**

| Condition | Result |
| ----- | ----- |
| Completed normally | \+2.5 lbs |
| Too Easy | \+5 lbs |
| Too Hard | Repeat weight |
| First failure | Repeat weight |
| Second failure | Reduce by 5–10% |

---

# **7\. Audit Fields**

All major tables should include:

| Field | Type | Notes |
| ----- | ----- | ----- |
| `created_at` | Timestamp | Set on insert |
| `updated_at` | Timestamp | Updated on modification |
| `deleted_at` | Timestamp | Nullable soft delete field where needed |

Recommended tables with `deleted_at`:

* `users`  
* `programs`  
* `workout_templates`  
* `exercises`

Avoid soft deleting historical records like:

* `workout_sessions`  
* `exercise_entries`  
* `sets`  
* `progress_metrics`

Those should generally remain as historical facts.

---

# **8\. Recommended Enums**

## **`unit_system`**

imperial

metric

## **`exercise_category`**

compound

accessory

## **`workout_session_status`**

planned

in\_progress

completed

abandoned

## **`set_status`**

pending

completed

skipped

failed

## **`effort_feedback`**

too\_easy

just\_right

too\_hard

## **`program_enrollment_status`**

active

paused

completed

cancelled

---

# **9\. Example V1 Workout Data**

## **Program**

Beginner Full Body V1

3 days per week

45–60 minutes

## **Workout Template A**

| Order | Exercise | Sets | Reps |
| ----- | ----- | ----- | ----- |
| 1 | Squat | 3 | 8 |
| 2 | Bench Press | 3 | 8 |
| 3 | Row | 3 | 8 |
| 4 | Bicep Curl | 3 | 8 |
| 5 | Tricep Pushdown | 3 | 8 |

---

# **10\. Key Design Decisions**

## **Store Progression State Explicitly**

Do not calculate next weight from full workout history every time.

Reason:

* Faster workout generation  
* More predictable behavior  
* Easier debugging  
* Higher user trust

## **Snapshot Workout Session Data**

Workout sessions should preserve what the user saw and did at the time.

Reason:

* Historical accuracy  
* Safe template updates  
* Reliable progress reports

## **Keep V1 Simple**

Avoid modeling too much customization in V1.

Do not add:

* Custom user workouts  
* Complex periodization  
* Nutrition data  
* Wearable data  
* Social data  
* Advanced analytics

The model should support future expansion, but V1 should stay focused on:

Open app → Start workout → Log sets → Complete workout → See progress

---

# **11\. Suggested Build Order**

1. Users  
2. Exercises  
3. Programs  
4. Workout Templates  
5. Program Enrollment  
6. Workout Session generation  
7. Exercise Entries  
8. Sets  
9. Progression State  
10. Progress Metrics

---

# **12\. Final Recommendation**

Use a relational PostgreSQL model with strong references for reusable system data and snapshot fields for historical workout data.

The most important table for long-term product trust is:

progression\_states

The most important tables for workout UX are:

workout\_sessions

exercise\_entries

sets

The most important design rule is:

The app should never make the user think during the workout. The data model should support fast, predictable, pre-filled workout execution.
