# Input -> Recommendation Audit

This document audits major user inputs that can influence training recommendations, and maps each input to:

- where it is captured and stored
- where it is consumed today (code)
- how it influences progression, confidence, explanations/evidence, and history/UI
- risks if it becomes a "fun button that does nothing"
- recommended action (keep / wire / defer)

Intentional scope constraints:

- No AI/coaching/check-ins
- No cardio logging
- No major UI redesign
- Focus on conservative, explainable, practical connections

## Pipeline overview (current)

1. Workout logging
   - Set logs (reps/weight + optional set effort) are saved on `sets`.
   - Exercise-level effort is captured as a quick summary/fallback signal.
2. Workout completion
   - Pending sets are skipped (partial completion semantics).
   - Progression engine computes the next recommendation per exercise.
   - Confidence + `reasonCodes` + `evidence` are generated for audit + UI.
   - An audit trail is stored in `progression_recommendation_events`.
3. User-facing output
   - Recommendation result, confidence, and evidence are shown in summary/history/detail.

Key code entry points:

- DB schema: `packages/db/src/schema.ts`
- Set logging: `apps/api/src/modules/workout/application/use-cases/log-set.use-case.ts`
- Set updates: `apps/api/src/modules/workout/application/use-cases/update-logged-set.use-case.ts`
- Workout completion + evidence: `apps/api/src/modules/workout/application/use-cases/complete-workout-session.use-case.ts`
- Progression engine: `apps/api/src/modules/workout/domain/services/progression-engine.ts`
- Recommendation audit events: `packages/db/src/schema.ts` (`progression_recommendation_events`)
- Mobile logging UI: `apps/mobile/src/components/WorkoutExerciseCard.tsx`

## Input influence matrix

Legend for the "Affects X" fields: `yes` / `partial` / `no`.

### Reps logged (per set)
- Captured: active workout set logging UI
- Stored: `sets.actual_reps`
- Current consumers: progression engine; overperformance detection; summary/history rendering
- Affects recommendation: yes (primary performance signal)
- Affects confidence: yes
- Affects explanations/evidence: yes
- Affects UI/history: yes
- Usefulness: essential
- Risk if ignored: progression becomes arbitrary/unsafe
- Recommended action: keep as-is

### Weight logged (per set)
- Captured: active workout set logging UI
- Stored: `sets.actual_weight_lbs`
- Current consumers: progression engine; overperformance detection; confidence/evidence (missing weight)
- Affects recommendation: yes
- Affects confidence: yes (missing weight should reduce confidence / gate increases)
- Affects explanations/evidence: yes
- Affects UI/history: yes
- Usefulness: essential
- Risk if ignored: over/under-performance misread; unsafe increases
- Recommended action: keep as-is

### Set status (pending/completed/failed/skipped)
- Captured: implicit (logging and completion flow)
- Stored: `sets.status`
- Current consumers: completion flow (partial semantics), progression engine failure handling, UI/status labels
- Affects recommendation: yes
- Affects confidence: yes
- Affects explanations/evidence: yes
- Affects UI/history: yes
- Usefulness: essential
- Risk if ignored: recommendations update from incomplete data
- Recommended action: keep as-is

### Finish early / partial workout
- Captured: completion UI ("End workout" confirmation)
- Stored: `workout_sessions.is_partial` plus skipped sets (via completion flow)
- Current consumers: completion + confidence (partial -> low confidence / no progression updates for those exercises)
- Affects recommendation: yes
- Affects confidence: yes
- Affects explanations/evidence: partial
- Affects UI/history: partial
- Usefulness: essential (avoid silent progression from incomplete sessions)
- Risk if ignored: bad updates after partial sessions
- Recommended action: keep as-is

### Set-level effort: RIR (exact)
- Captured: set effort UI ("Use exact RIR")
- Stored: `sets.rir` (enum `set_rir`)
- Current consumers: progression engine (RIR 5+ can strengthen "too light" when paired with high reps); evidence generation
- Affects recommendation: yes (conservatively)
- Affects confidence: yes
- Affects explanations/evidence: yes
- Affects UI/history: yes (rendered compactly on set rows / history detail)
- Usefulness: high (precise effort signal)
- Risk if ignored: effort UI becomes placebo; unsafe increases
- Recommended action: keep wired into recommendation + confidence + evidence

### Set-level effort: failureStatus (muscular_failure / technical_failure / stopped_early)
- Captured: set effort UI ("Max/failure" -> optional failure type; "Stopped early")
- Stored: `sets.failure_status` (enum `set_failure_status`)
- Current consumers: progression engine (technical failure repeats; stopped early caps); evidence generation
- Affects recommendation: yes
- Affects confidence: yes/partial
- Affects explanations/evidence: yes
- Affects UI/history: yes
- Usefulness: high (stopped early vs failure semantics)
- Risk if ignored: "failure" becomes ambiguous and unreliable
- Recommended action: keep wired into recommendation + confidence + evidence

### Stopped early (intentional stop)
- Captured: set effort UI (category "Stopped early")
- Stored: `sets.failure_status = stopped_early`
- Current consumers: progression engine excludes from "true failure" semantics and caps increases; evidence generation
- Affects recommendation: yes (caps; may repeat if all sets stopped early)
- Affects confidence: yes
- Affects explanations/evidence: yes
- Affects UI/history: yes
- Usefulness: high (prevents false "failure" interpretation)
- Risk if ignored: progression gets overly conservative or triggers deload incorrectly
- Recommended action: keep as-is

### Technical failure vs muscular failure
- Captured: set effort UI (optional failure type when "Max/failure" chosen)
- Stored: `sets.failure_status = technical_failure | muscular_failure`
- Current consumers: progression engine (technical failure repeats; muscular failure treated as near-failure signal)
- Affects recommendation: yes
- Affects confidence: yes/partial
- Affects explanations/evidence: yes
- Affects UI/history: yes
- Usefulness: high (prevents aggressive progression after technique breakdown)
- Risk if ignored: unsafe or discouraging increases
- Recommended action: keep as-is

### Exercise-level effort feedback (too_easy / just_right / too_hard)
- Captured: exercise card ("How did this exercise feel? (optional)")
- Stored: `exercise_entries.effort_feedback`
- Current consumers: progression engine (fallback signal), evidence generation
- Affects recommendation: yes (fallback when set-level effort missing)
- Affects confidence: partial (should not inflate confidence when defaulted)
- Affects explanations/evidence: yes
- Affects UI/history: yes
- Usefulness: medium-high (fast summary; fallback)
- Risk if ignored: users feel unheard; app loses a simple signal
- Recommended action: keep as fallback; avoid competing with set-level effort

### Exercise-level effort defaulting (implicit "just_right")
- Captured: UI shows "just right" selected by default without requiring a tap
- Stored: not stored as a distinct field today (missing input is defaulted in completion)
- Current consumers: completion evidence/confidence logic
- Affects recommendation: partial (neutral fallback signal)
- Affects confidence: yes (defaulted should be weaker than explicit)
- Affects explanations/evidence: yes
- Affects UI/history: partial
- Usefulness: high (reduces friction while keeping the question available)
- Risk if ignored: confidence can be inflated accidentally
- Recommended action: keep; preserve explicit-vs-defaulted distinction (do not collapse it)

### Workout-level recovery state
- Captured: active workout completion UI (recovery selector)
- Stored: `workout_sessions.recovery_state`
- Current consumers: completion passes an "effective recovery state" only when adjustments are enabled; engine uses it to slow aggressive paths
- Affects recommendation: partial/yes (when enabled)
- Affects confidence: partial
- Affects explanations/evidence: yes (applied vs disabled)
- Affects UI/history: partial
- Usefulness: high (progression responds to recovery)
- Risk if ignored: recovery input becomes placebo
- Recommended action: keep; ensure disabled path is explicitly evidenced

### Use recovery adjustments (preference)
- Captured: training settings
- Stored: `user_training_settings.use_recovery_adjustments`
- Current consumers: completion uses it to decide whether recovery affects engine input
- Affects recommendation: yes
- Affects confidence: no/partial
- Affects explanations/evidence: yes
- Affects UI/history: partial
- Usefulness: high (user control)
- Risk if ignored: preference becomes placebo
- Recommended action: keep as-is

### Default recovery state (preference)
- Captured: training settings
- Stored: `user_training_settings.default_recovery_state`
- Current consumers: completion defaults missing recovery input
- Affects recommendation: partial
- Affects confidence: no/partial
- Affects explanations/evidence: partial
- Affects UI/history: no/partial
- Usefulness: medium (removes friction)
- Risk if ignored: recovery defaults unpredictably
- Recommended action: keep as-is

### Progression aggressiveness (preference)
- Captured: training settings
- Stored: `user_training_settings.progression_aggressiveness`
- Current consumers: progression engine step sizing
- Affects recommendation: yes
- Affects confidence: no/partial
- Affects explanations/evidence: partial (should be visible when not default)
- Affects UI/history: partial
- Usefulness: high (user control)
- Risk if ignored: preferences become placebo
- Recommended action: keep; evidence when non-default

### Prefer reps before weight (preference)
- Captured: training settings
- Stored: `user_training_settings.prefer_rep_progression_before_weight`
- Current consumers: progression engine double progression branching
- Affects recommendation: yes
- Affects confidence: no
- Affects explanations/evidence: partial (should be visible when it changes the path)
- Affects UI/history: partial
- Usefulness: high
- Risk if ignored: behavior feels inconsistent
- Recommended action: keep; add lightweight evidence when it triggers a rep-first branch

### Minimum confidence to increase (preference)
- Captured: training settings
- Stored: `user_training_settings.minimum_confidence_for_increase`
- Current consumers: completion gates "increased" recommendations
- Affects recommendation: yes (gating)
- Affects confidence: yes (the gate is based on confidence)
- Affects explanations/evidence: yes (when it blocks an increase)
- Affects UI/history: yes
- Usefulness: high (safety/trust)
- Risk if ignored: safety preference becomes placebo
- Recommended action: keep as-is

### Allow auto-deload (preference)
- Captured: training settings
- Stored: `user_training_settings.allow_auto_deload`
- Current consumers: progression engine failure path
- Affects recommendation: yes
- Affects confidence: no/partial
- Affects explanations/evidence: partial (should be visible when it blocks a deload)
- Affects UI/history: partial
- Usefulness: high
- Risk if ignored: failure handling becomes confusing
- Recommended action: keep; ensure disabled path is evidenced

### Allow recalibration (preference)
- Captured: training settings
- Stored: `user_training_settings.allow_recalibration`
- Current consumers: progression engine overperformance recalibration path
- Affects recommendation: yes
- Affects confidence: partial
- Affects explanations/evidence: partial/yes (should be visible when it is blocked)
- Affects UI/history: partial
- Usefulness: high (trust repair + safety)
- Risk if ignored: "unusual performance" outcomes feel inconsistent
- Recommended action: keep; ensure blocked path is evidenced when applicable

### Equipment increment settings (global) + per-exercise increment overrides
- Captured: training settings + per-exercise settings
- Stored: `user_training_settings.default_*_increment_lbs`, `user_exercise_progression_settings.increment_override_lbs`
- Current consumers: completion resolves effective increment; engine rounds
- Affects recommendation: yes
- Affects confidence: no
- Affects explanations/evidence: partial (rounding / override evidence)
- Affects UI/history: partial
- Usefulness: high
- Risk if ignored: recommendations are not loggable with real equipment
- Recommended action: keep; add rounding evidence when it occurs and evidence when overrides apply

### Exercise-specific progression overrides (strategy, rep range, max jump, bodyweight mode)
- Captured: per-exercise settings UI/API
- Stored: `user_exercise_progression_settings.*`
- Current consumers: completion resolves effective settings and passes them to engine
- Affects recommendation: yes
- Affects confidence: no/partial
- Affects explanations/evidence: yes (override evidence)
- Affects UI/history: partial
- Usefulness: high
- Risk if ignored: settings feel fake; unexpected jumps
- Recommended action: keep as-is

### Goal type + experience level
- Captured: profile/survey/program definitions
- Stored: `users.training_goal`, `users.experience_level`, `programs.training_goal`, context snapshots
- Current consumers: progression engine policy adjustments (small caps/step sizing)
- Affects recommendation: partial
- Affects confidence: partial
- Affects explanations/evidence: partial (policy tags)
- Affects UI/history: no/partial
- Usefulness: medium (keep conservative)
- Risk if ignored: onboarding feels disconnected
- Recommended action: keep; expand slowly after more data

### Guided survey answers + program/training context snapshots
- Captured: onboarding/guided flows
- Stored: `program_training_contexts.*` (snapshots)
- Current consumers: storage/audit today
- Affects recommendation: no/partial today
- Affects confidence: no/partial today
- Affects explanations/evidence: no/partial today
- Affects UI/history: no/partial
- Usefulness: medium (future context)
- Risk if ignored: guided onboarding feels disconnected long-term
- Recommended action: keep as history/future coaching context (avoid premature coupling)

### Recommendation confidence + reason codes + evidence (computed output)
- Captured: computed at workout completion
- Stored: `progression_recommendation_events.confidence`, `.reason_codes`, `.evidence`, `.input_snapshot`
- Current consumers: workout summary/history/detail UI
- Affects recommendation: n/a (output)
- Affects confidence: yes (output)
- Affects explanations/evidence: yes (output)
- Affects UI/history: yes
- Usefulness: essential for trust
- Risk if ignored: black-box feel; no audit trail
- Recommended action: keep and expand when inputs matter

### Notes fields (future)
- Captured: not implemented yet
- Stored: n/a
- Current consumers: n/a
- Recommended action: defer until a concrete coaching/analytics use exists

## Dead, weak, or misleading inputs (findings)

1. Recovery state when recovery adjustments are disabled
   - Risk: user inputs recovery; if ignored silently, it becomes placebo.
   - Action: store for history, and explicitly evidence that adjustments were disabled.
2. Auto-deload disabled
   - Risk: repeated failures never deload but user cannot tell why.
   - Action: when auto-deload would have triggered, evidence that it is disabled.
3. Defaulted exercise-level effort
   - Risk: defaulted `just_right` inflates confidence if treated as explicit feedback.
   - Action: treat defaulted as weaker for confidence; keep it explicit in evidence.
4. Conflicts between exercise-level and set-level effort
   - Risk: confusing outcomes without explanation ("I said too easy but it did not increase much").
   - Action: reduce confidence and add structured evidence.

## Recommended follow-ups (intentionally deferred)

- Add a dedicated `effortFeedbackSource` DB field only if we need to persist explicit-vs-defaulted server-side; current approach keeps this distinction via "missing payload entry" (preferred for small MVP).
- Add more structured evidence for preferences only when they materially change outcomes (avoid noise).
- Add a UI affordance to review "which settings influenced today's recommendation" (presentation only).
