# **Core User Flow Doc: Workout Vertical Slice**

## **PurposeCore User Flow Doc: Workout Vertical Slice**

## **Purpose**

## **This document defines one complete vertical slice for the V1 fitness app workout experience:**

## **User opens app → Dashboard loads → User taps “Start Workout” → Selects template → Workout session starts → Logs a set → Rest timer runs → Logs next set → Completes workout → Workout saved → Dashboard updates**

## **The goal of this flow is to preserve the product principle that the user should not have to think during the workout. The app should load quickly, give the user clear instructions, support one-tap set logging, handle failures gracefully, and keep workout/progression data reliable.**

## ---

## **Source Inputs**

## **This flow is based on the following product and technical docs:**

* ## **Product Requirements Document**

* ## **Technical Architecture Document**

* ## **Data Model / Schema Design**

* ## **API Contract**

## ---

## **Core Flow Summary**

### **Happy Path**

1. ## **User opens the app.**

2. ## **Dashboard loads the user’s current workout state, recent progress, and next available workout.**

3. ## **User taps Start Workout.**

4. ## **User selects a workout template, or the app defaults to the next assigned template.**

5. ## **Backend starts a workout session.**

6. ## **Backend snapshots template data, creates exercise entries, pre-creates sets, and applies progression state.**

7. ## **Active Workout screen renders immediately.**

8. ## **User logs Set 1\.**

9. ## **App starts rest timer.**

10. ## **User logs Set 2\.**

11. ## **User completes all remaining sets and provides effort feedback.**

12. ## **User taps Finish Workout.**

13. ## **Backend completes the workout in a transaction.**

14. ## **Backend updates progression state, creates progress metrics, and advances the next workout template.**

15. ## **Dashboard refreshes with updated progress and next workout.**

## ---

## **Key Product Requirements**

* ## **The core loop must be fast and frictionless.**

* ## **Logging a set should take under 2 seconds.**

* ## **The client should use optimistic updates for set logging.**

* ## **The backend owns workout generation, progression logic, failure detection, history snapshotting, and progress metric creation.**

* ## **Progression state should be stored explicitly rather than recalculated from full workout history.**

* ## **Completed workout history should remain historically accurate even if templates change later.**

* ## **Offline behavior should preserve user progress locally and sync safely when connectivity returns.**

## ---

## **Primary Data Entities Used**

### **User**

## **Authenticated app user.**

### **User Program Enrollment**

## **Tracks the user’s active program and current workout template.**

### **Workout Template**

## **Defines planned workout structure, such as Workout A, Workout B, or Workout C.**

### **Workout Session**

## **Represents one actual workout started or performed by the user.**

### **Exercise Entry**

## **Represents one exercise inside a specific workout session.**

### **Set**

## **Represents each individual logged set.**

### **Progression State**

## **Stores the user’s next planned weight and failure state per exercise.**

### **Progress Metrics**

## **Stores user-facing progress messages such as “+5 lbs from last session” or “3 workouts completed this week.”**

## ---

# **Step-by-Step Vertical Slice**

## ---

## **1\. User Opens App**

### **User Action**

## **The user launches the mobile app.**

### **Data Needed**

* ## **Auth session / JWT**

* ## **User profile**

* ## **Cached dashboard data, if available**

* ## **Cached active workout session, if one exists**

* ## **Network connectivity status**

### **API Called**

## **No required API call immediately before auth is resolved.**

## **After auth is available, the app should prepare to load dashboard data.**

## **Potential calls used by Dashboard load:**

* ## **`GET /api/v1/progress-metrics`**

* ## **`GET /api/v1/workout-history`**

* ## **Optional future endpoint: `GET /api/v1/dashboard`**

* ## **Optional future endpoint: `GET /api/v1/workout-sessions/current`**

### **Client State Changes**

* ## **`app.status = "launching"`**

* ## **`auth.status = "checking_session"`**

* ## **`network.status = "online" | "offline"`**

* ## **Hydrate local cache from persisted storage.**

* ## **If a cached in-progress workout exists, prepare resume state.**

### **Server State Changes**

## **None.**

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| **Auth token missing** | **Show login screen.** |
| **Auth token expired** | **Attempt silent refresh. If refresh fails, show login screen.** |
| **App storage read fails** | **Continue with empty cache and load from server.** |
| **App crashes during launch** | **Sentry captures crash on next launch.** |

### **Offline Behavior**

## **If offline:**

* ## **App should still open.**

* ## **Show cached dashboard data if available.**

* ## **If there is a locally cached in-progress workout, allow the user to resume it.**

* ## **If there is no cached workout/session/template data, disable Start Workout and show: “Reconnect to start a workout.”**

## ---

## **2\. Dashboard Loads**

### **User Action**

## **The user lands on the Dashboard.**

### **Data Needed**

* ## **Authenticated user**

* ## **Active program enrollment**

* ## **Current / next workout template**

* ## **Any in-progress workout session**

* ## **Recent completed workouts**

* ## **Recent progress metrics**

* ## **Weekly workout count**

### **API Called**

## **Current API contract supports:**

## **GET /api/v1/progress-metrics?limit=20**

## **GET /api/v1/workout-history?limit=20\&status=completed**

## 

## **Recommended addition for clean dashboard loading:**

## **GET /api/v1/dashboard**

## 

## **Recommended response shape:**

## **type DashboardResponse \= {**

##   **activeWorkoutSession: WorkoutSessionDto | null;**

##   **nextWorkoutTemplate: {**

##     **id: UUID;**

##     **name: string;**

##     **sequenceOrder: number;**

##     **estimatedDurationMinutes: number | null;**

##   **} | null;**

##   **recentProgressMetrics: ProgressMetricDto\[\];**

##   **recentWorkoutHistory: WorkoutHistoryItemDto\[\];**

##   **weeklyWorkoutCount: number;**

## **};**

## 

### **Client State Changes**

* ## **`dashboard.status = "loading"`**

* ## **On success:**

  * ## **`dashboard.status = "ready"`**

  * ## **Store recent progress metrics.**

  * ## **Store recent workout history.**

  * ## **Store next workout template.**

  * ## **If active session exists, show Resume Workout instead of Start Workout.**

* ## **On failure:**

  * ## **`dashboard.status = "error"`**

  * ## **Keep stale cached data visible when available.**

### **Server State Changes**

## **None for read-only dashboard loading.**

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| **`401 UNAUTHENTICATED`** | **Clear invalid auth state and show login.** |
| **`500 INTERNAL_ERROR`** | **Show cached dashboard if available and a retry affordance.** |
| **Progress metrics fail but history succeeds** | **Show dashboard with missing progress module fallback.** |
| **History fails but metrics succeed** | **Show progress metrics and hide/retry history module.** |
| **No active enrollment** | **Show onboarding/program-start state instead of workout card.** |

### **Offline Behavior**

* ## **Show cached dashboard data with an offline banner.**

* ## **Do not attempt server refresh until connectivity returns.**

* ## **If cached active workout exists, allow Resume Workout.**

* ## **If only cached next template exists but no server-created session exists, do not start a new workout offline unless offline session creation is explicitly supported.**

## ---

## **3\. User Taps “Start Workout”**

### **User Action**

## **The user taps Start Workout from the Dashboard.**

### **Data Needed**

* ## **Authenticated user**

* ## **Active program enrollment**

* ## **Next workout template ID, if already loaded**

* ## **Confirmation that no workout session is currently in progress**

* ## **Network status**

### **API Called**

## **No API call is required if the next screen is template selection.**

## **If the product skips template selection in V1, this button may call directly:**

## **POST /api/v1/workout-sessions/start**

## 

### **Client State Changes**

## **If template selection exists:**

* ## **Navigate to Template Selection screen.**

* ## **`startWorkoutFlow.status = "selecting_template"`**

## **If no template selection:**

* ## **`startWorkoutFlow.status = "starting"`**

* ## **Disable button to prevent double taps.**

### **Server State Changes**

## **None until `POST /api/v1/workout-sessions/start` is called.**

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| **User double taps** | **Client disables button after first tap.** |
| **No template available** | **Show “No workout available” and prompt retry/onboarding.** |
| **Existing in-progress workout detected client-side** | **Navigate to active workout instead of creating a new one.** |

### **Offline Behavior**

* ## **If an in-progress workout is cached locally, show Resume Workout.**

* ## **If no workout session exists yet, do not start a server-backed workout offline by default.**

* ## **Show: “You need a connection to start a new workout.”**

## ---

## **4\. User Selects Template**

### **User Action**

## **The user selects a workout template, such as Workout A.**

### **Product Note**

## **The PRD says V1 should minimize decision-making and use pre-generated workouts. The API contract allows `workoutTemplateId`, but notes that users should usually not choose templates manually in V1. Therefore, template selection should either be:**

1. ## **Hidden in V1, with the backend selecting the next assigned workout automatically; or**

2. ## **Very constrained, showing only the next assigned template and perhaps a simple confirmation.**

### **Data Needed**

* ## **Selected `workoutTemplateId`**

* ## **Template name**

* ## **Estimated duration**

* ## **Active program enrollment**

* ## **Network status**

### **API Called**

## **No separate template API is defined for regular user template selection in the current contract.**

## **Starting with explicit template:**

## **POST /api/v1/workout-sessions/start**

## 

## **Request:**

## **{**

##   **"workoutTemplateId": "\<selected-template-id\>"**

## **}**

## 

## **Starting next assigned template:**

## **POST /api/v1/workout-sessions/start**

## 

## **Request:**

## **{}**

## 

### **Client State Changes**

* ## **`selectedWorkoutTemplateId = template.id`**

* ## **`startWorkoutFlow.status = "starting_session"`**

* ## **Disable template controls while request is in flight.**

### **Server State Changes**

## **None until start session request is processed.**

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| **Template no longer exists** | **Show “Workout unavailable. Refreshing…” and reload dashboard/template state.** |
| **Template inactive** | **Backend returns error; client reloads next assigned template.** |
| **User has no active enrollment** | **Return to onboarding/program selection state.** |

### **Offline Behavior**

* ## **Template selection can be shown from cache.**

* ## **Starting a new server-backed session should remain disabled unless the app supports offline-created sessions.**

* ## **If offline session creation is added later, the client must create a temporary local session ID and sync it later with an idempotency key.**

## ---

## **5\. Workout Session Starts**

### **User Action**

## **The user confirms the selected workout or the app starts the next workout automatically.**

### **Data Needed**

## **Backend reads:**

* ## **Authenticated user**

* ## **Active `user_program_enrollments` record**

* ## **`workout_templates`**

* ## **`workout_template_exercise_entries`**

* ## **`exercises`**

* ## **`progression_states`**

## **Backend creates:**

* ## **`workout_sessions`**

* ## **`exercise_entries`**

* ## **`sets`**

### **API Called**

## **POST /api/v1/workout-sessions/start**

## 

## **Example request:**

## **{}**

## 

## **or:**

## **{**

##   **"workoutTemplateId": "\<template-id\>"**

## **}**

## 

### **Expected API Response**

## **Returns a full `WorkoutSessionDto` with:**

* ## **Session ID**

* ## **Status: `in_progress`**

* ## **Program ID/name**

* ## **Workout template ID/name**

* ## **Started timestamp**

* ## **Exercise entries**

* ## **Target sets/reps**

* ## **Target weights**

* ## **Pre-created set IDs**

* ## **Pending set statuses**

### **Client State Changes**

* ## **`activeWorkout.status = "in_progress"`**

* ## **Store `workoutSession.id`**

* ## **Store ordered `exerciseEntries`**

* ## **Store ordered `sets`**

* ## **Set current exercise to first incomplete exercise.**

* ## **Set current set to first pending set.**

* ## **Navigate to Active Workout screen.**

### **Server State Changes**

## **Inside a transaction:**

* ## **Create `workout_sessions` with `status = "in_progress"`.**

* ## **Snapshot program/workout names.**

* ## **Create `exercise_entries` from template entries.**

* ## **Snapshot exercise names, categories, target sets/reps, progression rules.**

* ## **Resolve target weights from `progression_states`.**

* ## **Pre-create all `sets` with `status = "pending"`.**

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| **`401 UNAUTHENTICATED`** | **Show login/session expired state.** |
| **`404 NOT_FOUND`** | **No active enrollment/template; return to dashboard/onboarding.** |
| **`409 WORKOUT_ALREADY_IN_PROGRESS`** | **Fetch/resume existing workout instead of starting another.** |
| **`422 BUSINESS_RULE_VIOLATION`** | **Show friendly error and log technical details.** |
| **Network timeout** | **Show retry; avoid creating duplicate sessions by checking current session on retry.** |

### **Offline Behavior**

* ## **Cannot safely create a canonical workout session without the backend unless offline session creation is explicitly designed.**

* ## **If request was sent and response did not return, client should check for an in-progress session after reconnect before retrying blindly.**

* ## **Recommended future improvement: use idempotency key for `startWorkoutSession`.**

## ---

## **6\. Active Workout Screen Renders**

### **User Action**

## **The user sees the first exercise and first pending set.**

## **Example:**

## **Bench Press**

## **3 × 8 @ 135 lbs**

## 

## **Set 1   8 reps   Confirm**

## **Set 2   8 reps   Confirm**

## **Set 3   8 reps   Confirm**

## 

### **Data Needed**

## **From `WorkoutSessionDto`:**

* ## **`workoutSession.id`**

* ## **`exerciseEntry.id`**

* ## **`exerciseName`**

* ## **`category`**

* ## **`targetSets`**

* ## **`targetReps`**

* ## **`targetWeightLbs`**

* ## **`sets[].id`**

* ## **`sets[].targetReps`**

* ## **`sets[].targetWeightLbs`**

* ## **`sets[].status`**

* ## **`restSeconds`, if included in template/session payload**

### **API Called**

## **None if start response already included full active workout payload.**

## **Optional resume case:**

## **GET /api/v1/workout-sessions/current**

## 

## **Recommended addition, because the current API contract does not define a current-session fetch endpoint.**

### **Client State Changes**

* ## **`activeWorkoutScreen.status = "ready"`**

* ## **`currentExerciseIndex = 0`**

* ## **`currentSetId = first pending set`**

* ## **Pre-fill reps with target reps.**

* ## **Pre-fill weight with target weight.**

### **Server State Changes**

## **None.**

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| **Missing set IDs** | **Cannot log safely; show error and reload session.** |
| **Missing target weight** | **Show error; backend progression resolution failed.** |
| **Client render error** | **Error boundary shows recover/reload option; Sentry captures.** |

### **Offline Behavior**

* ## **If session payload is cached, render active workout fully offline.**

* ## **User can continue logging sets locally.**

* ## **Mark unsynced changes in local queue.**

## ---

## **7\. User Logs a Set**

### **User Action**

## **The user taps Confirm for Set 1\.**

### **Data Needed**

* ## **`setId`**

* ## **`exerciseEntryId`**

* ## **`workoutSessionId`**

* ## **`actualReps`**

* ## **`actualWeightLbs`**

* ## **`completedAt`**

* ## **Current target reps/weight**

* ## **Network status**

### **API Called**

## **POST /api/v1/sets/{setId}/log**

## 

## **Request:**

## **{**

##   **"actualReps": 8,**

##   **"actualWeightLbs": 135**

## **}**

## 

## **Recommended future header:**

## **Idempotency-Key: \<uuid\>**

## 

### **Client State Changes**

## **Optimistic update immediately:**

* ## **Set status changes from `pending` to `completed` if `actualReps >= targetReps`.**

* ## **Set status changes from `pending` to `failed` if `actualReps < targetReps`.**

* ## **Store `actualReps`, `actualWeightLbs`, and local `completedAt`.**

* ## **Increment completed set count.**

* ## **Disable Confirm for that set.**

* ## **Move UI focus to rest timer / next set.**

* ## **Add API call to sync queue if offline or request is pending.**

### **Server State Changes**

* ## **Validate user owns the set through the parent workout session.**

* ## **Confirm parent workout session is `in_progress`.**

* ## **Set `actual_reps`.**

* ## **Set `actual_weight_lbs`, defaulting to target weight if omitted.**

* ## **Set `status = "completed"` when `actualReps >= targetReps`.**

* ## **Set `status = "failed"` when `actualReps < targetReps`.**

* ## **Set `completed_at`.**

## **Progression state is not updated yet. Progression is finalized only when the workout is completed.**

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| **`400 VALIDATION_ERROR`** | **Revert optimistic update and show validation message.** |
| **`401 UNAUTHENTICATED`** | **Pause sync, show session expired state.** |
| **`403 FORBIDDEN`** | **Revert and show generic access error.** |
| **`404 NOT_FOUND`** | **Re-fetch active session; set may be stale.** |
| **`409 SET_ALREADY_LOGGED`** | **Reconcile local state with server response/current session.** |
| **`409 SESSION_NOT_IN_PROGRESS`** | **Stop active workout UI and reload dashboard/session state.** |
| **Timeout/network error** | **Keep optimistic state locally and retry in background.** |

### **Offline Behavior**

* ## **Allow set logging offline if the workout session was already created and cached.**

* ## **Persist local set log event:**

## **type PendingSetLog \= {**

##   **operation: "log\_set";**

##   **localOperationId: UUID;**

##   **setId: UUID;**

##   **workoutSessionId: UUID;**

##   **actualReps: number;**

##   **actualWeightLbs: number;**

##   **completedAt: ISODateTime;**

##   **syncStatus: "pending" | "syncing" | "failed";**

## **};**

## 

* ## **Show the set as logged immediately.**

* ## **Sync when online.**

* ## **If backend rejects later, show a non-blocking correction state and reconcile.**

## ---

## **8\. Rest Timer Runs**

### **User Action**

## **After logging Set 1, the rest timer starts automatically.**

### **Data Needed**

* ## **Rest duration for current exercise/set**

* ## **Current time**

* ## **Timer start time**

* ## **Timer end time**

* ## **Current exercise/set context**

### **API Called**

## **None.**

## **Rest timer is client-only in V1.**

### **Client State Changes**

* ## **`restTimer.status = "running"`**

* ## **`restTimer.startedAt = now`**

* ## **`restTimer.durationSeconds = exerciseEntry.restSeconds ?? defaultRestSeconds`**

* ## **`restTimer.endsAt = startedAt + durationSeconds`**

* ## **UI shows countdown.**

* ## **Next set confirm button may remain visible and usable.**

### **Server State Changes**

## **None.**

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| **App backgrounded** | **Recalculate remaining time from timestamps on return.** |
| **Timer drift** | **Use wall-clock difference, not interval count.** |
| **User skips rest** | **Allow logging next set early.** |
| **Missing rest duration** | **Use default rest duration.** |

### **Offline Behavior**

* ## **Fully available offline.**

* ## **No sync required.**

## ---

## **9\. User Logs Next Set**

### **User Action**

## **The user taps Confirm for Set 2 after or during rest.**

### **Data Needed**

## **Same as Set 1:**

* ## **`setId`**

* ## **`exerciseEntryId`**

* ## **`workoutSessionId`**

* ## **`actualReps`**

* ## **`actualWeightLbs`**

* ## **`completedAt`**

### **API Called**

## **POST /api/v1/sets/{setId}/log**

## 

## **Request:**

## **{**

##   **"actualReps": 8,**

##   **"actualWeightLbs": 135**

## **}**

## 

### **Client State Changes**

* ## **Optimistically mark Set 2 completed/failed.**

* ## **Stop existing rest timer if still running.**

* ## **Start new rest timer if another set remains for the exercise.**

* ## **If Set 2 was the final set for that exercise, prompt effort feedback:**

  * ## **Too Easy**

  * ## **Just Right**

  * ## **Too Hard**

* ## **If exercise complete, auto-advance to next exercise.**

### **Server State Changes**

## **Same as Set 1:**

* ## **Update set record.**

* ## **Determine completed vs failed.**

* ## **Return updated set summary and exercise completion state.**

### **If It Fails**

## **Same as Step 7\.**

## **Additional case:**

| Failure | Expected Behavior |
| ----- | ----- |
| **Earlier set still pending on server due to sync delay** | **Allow local flow to continue; sync queue preserves operation order per workout session.** |

### **Offline Behavior**

* ## **Same as Step 7\.**

* ## **Offline queue must preserve order for operations against the same workout session.**

* ## **Client can continue through the workout even when multiple set logs are pending sync.**

## ---

## **10\. User Completes Remaining Sets and Exercises**

### **User Action**

## **The user continues logging sets until all required sets are completed or failed.**

## **After the last set of each exercise, the app asks:**

## **How did this feel?**

## **Too Easy / Just Right / Too Hard**

## 

### **Data Needed**

* ## **All exercise entries**

* ## **All set statuses**

* ## **Per-exercise effort feedback**

* ## **Failed set detection**

* ## **Whether all required sets are completed or failed**

### **API Called**

## **For each set:**

## **POST /api/v1/sets/{setId}/log**

## 

## **No API call is required just to select effort feedback unless feedback is persisted before workout completion.**

### **Client State Changes**

* ## **Track each set as `pending`, `completed`, or `failed`.**

* ## **Track `exerciseFeedback[exerciseEntryId]`.**

* ## **Mark exercise complete when all sets are completed/failed and feedback is selected.**

* ## **Enable Finish Workout when all required sets are no longer pending and required feedback is present.**

### **Server State Changes**

## **Only set records change during set logging.**

## **Exercise effort feedback and progression updates are finalized during workout completion.**

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| **Feedback missing** | **Keep Finish Workout disabled or show inline prompt.** |
| **Some sets still pending** | **Backend will reject completion with `422 INCOMPLETE_WORKOUT`.** |
| **Set sync pending** | **Allow finish only if online sync has completed, or queue finish after set logs.** |

### **Offline Behavior**

* ## **User may continue logging sets locally.**

* ## **User may select effort feedback locally.**

* ## **Completion can be staged locally, but canonical workout completion should sync only after all set logs sync successfully.**

## ---

## **11\. User Taps “Finish Workout”**

### **User Action**

## **The user taps Finish Workout.**

### **Data Needed**

* ## **`workoutSessionId`**

* ## **All set logs synced or queued in order**

* ## **All required sets completed or failed**

* ## **`exerciseFeedback[]`**

* ## **Optional `userEffortFeedback`**

* ## **Completion timestamp**

* ## **Network status**

### **API Called**

## **POST /api/v1/workout-sessions/{sessionId}/complete**

## 

## **Request:**

## **{**

##   **"exerciseFeedback": \[**

##     **{**

##       **"exerciseEntryId": "\<exercise-entry-id\>",**

##       **"effortFeedback": "just\_right"**

##     **}**

##   **\],**

##   **"userEffortFeedback": "just\_right"**

## **}**

## 

### **Client State Changes**

* ## **`finishWorkout.status = "saving"`**

* ## **Disable Finish button.**

* ## **Show saving state.**

* ## **Prevent additional set edits unless editing is supported.**

### **Server State Changes**

## **Inside a transaction:**

* ## **Validate session belongs to user.**

* ## **Validate session is `in_progress`.**

* ## **Validate all required sets are completed or failed.**

* ## **Validate required effort feedback exists.**

* ## **Update `exercise_entries.effort_feedback`.**

* ## **Update `workout_sessions.status = "completed"`.**

* ## **Set `completed_at`.**

* ## **Calculate `duration_seconds`.**

* ## **Update `progression_states` for each exercise.**

* ## **Create append-only `progress_metrics`.**

* ## **Advance `user_program_enrollments.current_workout_template_id` to the next workout template.**

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| **`422 INCOMPLETE_WORKOUT`** | **Return to workout and highlight pending sets.** |
| **`422 MISSING_EFFORT_FEEDBACK`** | **Prompt for missing feedback.** |
| **`409 SESSION_ALREADY_COMPLETED`** | **Treat as successful if server confirms completed state.** |
| **`409 SESSION_NOT_IN_PROGRESS`** | **Reload current session/dashboard state.** |
| **`500 PROGRESSION_UPDATE_FAILED`** | **Show “Workout not saved yet” and retry; do not show completed dashboard until resolved.** |
| **Network timeout** | **Keep workout in local “completion pending” state and retry.** |

### **Offline Behavior**

* ## **If offline, do not mark workout as canonically saved.**

* ## **Mark locally as:**

## **activeWorkout.localCompletionStatus \= "pending\_sync"**

## 

* ## **Queue completion operation after all pending set logs.**

* ## **Show: “Workout complete. Syncing when you’re back online.”**

* ## **Dashboard may show local pending completion, clearly marked as unsynced.**

## ---

## **12\. Workout Saved**

### **User Action**

## **The user sees that the workout has been saved.**

### **Data Needed**

## **From completion response:**

* ## **Completed `WorkoutSessionDto`**

* ## **`progressionUpdates[]`**

* ## **`progressMetrics[]`**

* ## **`nextWorkoutTemplate`**

### **API Called**

## **Completion response comes from:**

## **POST /api/v1/workout-sessions/{sessionId}/complete**

## 

## **Optional refresh after completion:**

## **GET /api/v1/progress-metrics?limit=20**

## **GET /api/v1/workout-history?limit=20\&status=completed**

## 

## **Recommended:**

## **GET /api/v1/dashboard**

## 

### **Client State Changes**

* ## **`activeWorkout.status = "completed"`**

* ## **Clear active workout from local active-session state.**

* ## **Store completed workout summary.**

* ## **Store progression updates.**

* ## **Store progress metrics.**

* ## **Navigate to Workout Summary or Dashboard.**

### **Server State Changes**

## **Already completed in Step 11 transaction.**

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| **Completion succeeded but dashboard refresh failed** | **Show summary from completion response and retry dashboard refresh in background.** |
| **Completion response missing metrics** | **Show generic “Workout completed” and log server issue.** |
| **Local cache write fails** | **Continue with server state; reload dashboard from API.** |

### **Offline Behavior**

* ## **If completion is pending sync, show local summary but mark it unsynced.**

* ## **Do not update permanent progression display from local-only assumptions unless clearly labeled.**

* ## **After reconnect and sync success, replace local summary with server-confirmed progression updates and metrics.**

## ---

## **13\. Dashboard Updates**

### **User Action**

## **The user returns to the Dashboard.**

### **Data Needed**

* ## **Latest completed workout**

* ## **Latest progress metrics**

* ## **Updated weekly workout count**

* ## **Updated next workout template**

* ## **No active in-progress workout**

### **API Called**

## **Current contract:**

## **GET /api/v1/progress-metrics?limit=20**

## **GET /api/v1/workout-history?limit=20\&status=completed**

## 

## **Recommended:**

## **GET /api/v1/dashboard**

## 

### **Client State Changes**

* ## **`dashboard.status = "refreshing"`**

* ## **Remove completed workout from active workout state.**

* ## **Update progress cards:**

  * ## **“Workout completed”**

  * ## **“+5 lbs from last session”**

  * ## **“3 workouts completed this week”**

* ## **Update next workout card to next template.**

* ## **Show Start Workout again.**

### **Server State Changes**

## **None for dashboard read.**

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| **Metrics refresh fails** | **Use metrics returned from completion response.** |
| **History refresh fails** | **Show completion summary and retry history later.** |
| **Dashboard endpoint unavailable** | **Fallback to separate metrics/history calls.** |

### **Offline Behavior**

* ## **If completion was synced before going offline, show cached updated dashboard.**

* ## **If completion is pending sync, show a pending-sync dashboard state.**

* ## **Disable starting another workout until sync resolves, unless multiple offline workouts are explicitly supported.**

## ---

# **API Calls Used in This Vertical Slice**

## **Existing API Contract**

| Flow Step | Endpoint | Purpose |
| ----- | ----- | ----- |
| **Dashboard loads** | **`GET /api/v1/progress-metrics`** | **Load trust/progress messages.** |
| **Dashboard loads** | **`GET /api/v1/workout-history`** | **Load recent completed workouts.** |
| **Workout starts** | **`POST /api/v1/workout-sessions/start`** | **Create active workout session, exercise entries, and sets.** |
| **Log set** | **`POST /api/v1/sets/{setId}/log`** | **Log one set.** |
| **Complete workout** | **`POST /api/v1/workout-sessions/{sessionId}/complete`** | **Finalize workout, progression, metrics, and next template.** |

## **Recommended Additions**

| Endpoint | Purpose |
| ----- | ----- |
| **`GET /api/v1/dashboard`** | **Load all dashboard data in one request.** |
| **`GET /api/v1/workout-sessions/current`** | **Resume active workout reliably after app restart.** |
| **`POST /api/v1/workout-sessions/start` with `Idempotency-Key`** | **Prevent duplicate sessions on retry.** |
| **`POST /api/v1/sets/{setId}/log` with `Idempotency-Key`** | **Improve mobile retry safety for set logging.** |
| **`POST /api/v1/workout-sessions/{sessionId}/complete` with `Idempotency-Key`** | **Prevent duplicate completion/progression updates.** |

## ---

# **Client State Model**

## **Suggested High-Level State**

## **type AppWorkoutState \= {**

##   **auth: {**

##     **status: "checking\_session" | "authenticated" | "unauthenticated";**

##   **};**

## 

##   **network: {**

##     **status: "online" | "offline";**

##   **};**

## 

##   **dashboard: {**

##     **status: "idle" | "loading" | "ready" | "refreshing" | "error";**

##     **nextWorkoutTemplate: DashboardTemplate | null;**

##     **activeWorkoutSessionId: string | null;**

##     **recentMetrics: ProgressMetricDto\[\];**

##     **recentHistory: WorkoutHistoryItemDto\[\];**

##   **};**

## 

##   **activeWorkout: {**

##     **status:**

##       **| "none"**

##       **| "starting"**

##       **| "in\_progress"**

##       **| "saving"**

##       **| "completed"**

##       **| "pending\_sync"**

##       **| "error";**

##     **session: WorkoutSessionDto | null;**

##     **currentExerciseEntryId: string | null;**

##     **currentSetId: string | null;**

##     **exerciseFeedback: Record\<string, EffortFeedback\>;**

##   **};**

## 

##   **restTimer: {**

##     **status: "idle" | "running" | "paused" | "complete";**

##     **startedAt: string | null;**

##     **endsAt: string | null;**

##     **durationSeconds: number | null;**

##   **};**

## 

##   **syncQueue: PendingWorkoutOperation\[\];**

## **};**

## 

## ---

# **Offline Sync Rules**

## **What Works Offline**

* ## **Opening the app with cached data.**

* ## **Viewing cached dashboard.**

* ## **Resuming an already-created and cached workout session.**

* ## **Logging sets locally for a cached active workout.**

* ## **Running rest timers.**

* ## **Selecting effort feedback locally.**

* ## **Staging workout completion locally.**

## **What Should Not Work Offline by Default**

* ## **Starting a brand-new canonical workout session.**

* ## **Creating new workout templates.**

* ## **Finalizing progression state as if it were server-confirmed.**

* ## **Starting another workout while a previous completion is pending sync.**

## **Sync Ordering**

## **For a single workout session, sync operations must be processed in order:**

1. ## **Start workout session, if offline-created sessions are ever supported.**

2. ## **Log set operations in completed order.**

3. ## **Complete workout session.**

4. ## **Refresh dashboard/progress metrics.**

## **Conflict Handling**

| Conflict | Resolution |
| ----- | ----- |
| **Set already logged** | **Treat server as source of truth and reconcile local state.** |
| **Session already completed** | **Treat as success if server completion state matches user intent.** |
| **Session not in progress** | **Stop local workout flow and reload server state.** |
| **Progression update failed** | **Keep completion pending/retry; do not invent progression locally.** |

## ---

# **Failure Principles**

## **User-Facing Principles**

* ## **Never lose logged workout data.**

* ## **Keep the user moving during the workout whenever safely possible.**

* ## **Use optimistic updates for speed, but reconcile with server truth.**

* ## **Do not expose technical errors during workout unless action is required.**

* ## **Make offline/pending-sync state clear without being alarming.**

## **Engineering Principles**

* ## **Backend is authoritative for progression.**

* ## **Completion must be transactional.**

* ## **Set logging should be retry-safe.**

* ## **Historical workout data should be snapshot-based and stable.**

* ## **Client should preserve pending operations locally until confirmed by server.**

## ---

# **Acceptance Criteria**

## **Dashboard**

* ## **Dashboard loads with cached data first when available.**

* ## **Dashboard refreshes recent progress and workout history from API.**

* ## **Dashboard shows Resume Workout if an in-progress session exists.**

* ## **Dashboard shows Start Workout if no workout is in progress.**

## **Start Workout**

* ## **Tapping Start Workout creates exactly one in-progress workout session.**

* ## **Duplicate taps do not create duplicate sessions.**

* ## **The active workout screen has all data needed from the start response.**

* ## **Sets are pre-created before the user logs anything.**

## **Active Workout**

* ## **User can log a set in under 2 seconds.**

* ## **Set inputs are pre-filled with target reps and target weight.**

* ## **Confirming a set updates UI immediately.**

* ## **Rest timer starts automatically after a set is logged.**

* ## **Exercise feedback is collected after the final set of each exercise.**

## **Completion**

* ## **Finish Workout is only available when all required sets are completed or failed and feedback is present.**

* ## **Completion updates workout session, effort feedback, progression state, progress metrics, and next workout template in one backend transaction.**

* ## **Dashboard updates after completion.**

## **Offline**

* ## **Cached active workouts can continue offline.**

* ## **Offline set logs are persisted locally.**

* ## **Completion can be staged but not treated as server-confirmed until synced.**

* ## **Progression updates are not finalized locally.**

## ---

# **Open Implementation Questions**

1. ## **Should V1 actually expose template selection, or should Start Workout always start the next assigned template automatically?**

2. ## **Should `GET /api/v1/dashboard` be added before frontend implementation to avoid multiple dashboard requests?**

3. ## **Should `GET /api/v1/workout-sessions/current` be added for reliable resume behavior?**

4. ## **Should idempotency keys be added immediately for start, log set, and complete operations?**

5. ## **What is the default rest duration for compound vs accessory lifts if `restSeconds` is missing?**

6. ## **Should users be allowed to finish a workout while set log sync is still pending, or should completion wait for confirmed set logs?**

## ---

# **Recommended Implementation Decision**

## **For V1, the cleanest implementation is:**

* ## **Do not expose real template selection yet.**

* ## **Make Start Workout call `POST /api/v1/workout-sessions/start` with an empty body.**

* ## **Let the backend choose the next template from the active program enrollment.**

* ## **Add `GET /api/v1/dashboard` and `GET /api/v1/workout-sessions/current` before building the main workout UI.**

* ## **Add idempotency keys for workout start, set logging, and workout completion before testing offline/retry behavior.**

## **This best supports the product promise: the user opens the app, starts the workout, follows instructions, logs what happened, and the system handles the rest.**

## 

This document defines one complete vertical slice for the V1 fitness app workout experience:

**User opens app → Dashboard loads → User taps “Start Workout” → Selects template → Workout session starts → Logs a set → Rest timer runs → Logs next set → Completes workout → Workout saved → Dashboard updates**

The goal of this flow is to preserve the product principle that the user should not have to think during the workout. The app should load quickly, give the user clear instructions, support one-tap set logging, handle failures gracefully, and keep workout/progression data reliable.

---

## **Source Inputs**

This flow is based on the following product and technical docs:

* Product Requirements Document  
* Technical Architecture Document  
* Data Model / Schema Design  
* API Contract

---

## **Core Flow Summary**

### **Happy Path**

1. User opens the app.  
2. Dashboard loads the user’s current workout state, recent progress, and next available workout.  
3. User taps **Start Workout**.  
4. User selects a workout template, or the app defaults to the next assigned template.  
5. Backend starts a workout session.  
6. Backend snapshots template data, creates exercise entries, pre-creates sets, and applies progression state.  
7. Active Workout screen renders immediately.  
8. User logs Set 1\.  
9. App starts rest timer.  
10. User logs Set 2\.  
11. User completes all remaining sets and provides effort feedback.  
12. User taps **Finish Workout**.  
13. Backend completes the workout in a transaction.  
14. Backend updates progression state, creates progress metrics, and advances the next workout template.  
15. Dashboard refreshes with updated progress and next workout.

---

## **Key Product Requirements**

* The core loop must be fast and frictionless.  
* Logging a set should take under 2 seconds.  
* The client should use optimistic updates for set logging.  
* The backend owns workout generation, progression logic, failure detection, history snapshotting, and progress metric creation.  
* Progression state should be stored explicitly rather than recalculated from full workout history.  
* Completed workout history should remain historically accurate even if templates change later.  
* Offline behavior should preserve user progress locally and sync safely when connectivity returns.

---

## **Primary Data Entities Used**

### **User**

Authenticated app user.

### **User Program Enrollment**

Tracks the user’s active program and current workout template.

### **Workout Template**

Defines planned workout structure, such as Workout A, Workout B, or Workout C.

### **Workout Session**

Represents one actual workout started or performed by the user.

### **Exercise Entry**

Represents one exercise inside a specific workout session.

### **Set**

Represents each individual logged set.

### **Progression State**

Stores the user’s next planned weight and failure state per exercise.

### **Progress Metrics**

Stores user-facing progress messages such as “+5 lbs from last session” or “3 workouts completed this week.”

---

# **Step-by-Step Vertical Slice**

---

## **1\. User Opens App**

### **User Action**

The user launches the mobile app.

### **Data Needed**

* Auth session / JWT  
* User profile  
* Cached dashboard data, if available  
* Cached active workout session, if one exists  
* Network connectivity status

### **API Called**

No required API call immediately before auth is resolved.

After auth is available, the app should prepare to load dashboard data.

Potential calls used by Dashboard load:

* `GET /api/v1/progress-metrics`  
* `GET /api/v1/workout-history`  
* Optional future endpoint: `GET /api/v1/dashboard`  
* Optional future endpoint: `GET /api/v1/workout-sessions/current`

### **Client State Changes**

* `app.status = "launching"`  
* `auth.status = "checking_session"`  
* `network.status = "online" | "offline"`  
* Hydrate local cache from persisted storage.  
* If a cached in-progress workout exists, prepare resume state.

### **Server State Changes**

None.

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| Auth token missing | Show login screen. |
| Auth token expired | Attempt silent refresh. If refresh fails, show login screen. |
| App storage read fails | Continue with empty cache and load from server. |
| App crashes during launch | Sentry captures crash on next launch. |

### **Offline Behavior**

If offline:

* App should still open.  
* Show cached dashboard data if available.  
* If there is a locally cached in-progress workout, allow the user to resume it.  
* If there is no cached workout/session/template data, disable **Start Workout** and show: “Reconnect to start a workout.”

---

## **2\. Dashboard Loads**

### **User Action**

The user lands on the Dashboard.

### **Data Needed**

* Authenticated user  
* Active program enrollment  
* Current / next workout template  
* Any in-progress workout session  
* Recent completed workouts  
* Recent progress metrics  
* Weekly workout count

### **API Called**

Current API contract supports:

GET /api/v1/progress-metrics?limit=20  
GET /api/v1/workout-history?limit=20\&status=completed

Recommended addition for clean dashboard loading:

GET /api/v1/dashboard

Recommended response shape:

type DashboardResponse \= {  
  activeWorkoutSession: WorkoutSessionDto | null;  
  nextWorkoutTemplate: {  
    id: UUID;  
    name: string;  
    sequenceOrder: number;  
    estimatedDurationMinutes: number | null;  
  } | null;  
  recentProgressMetrics: ProgressMetricDto\[\];  
  recentWorkoutHistory: WorkoutHistoryItemDto\[\];  
  weeklyWorkoutCount: number;  
};

### **Client State Changes**

* `dashboard.status = "loading"`  
* On success:  
  * `dashboard.status = "ready"`  
  * Store recent progress metrics.  
  * Store recent workout history.  
  * Store next workout template.  
  * If active session exists, show **Resume Workout** instead of **Start Workout**.  
* On failure:  
  * `dashboard.status = "error"`  
  * Keep stale cached data visible when available.

### **Server State Changes**

None for read-only dashboard loading.

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| `401 UNAUTHENTICATED` | Clear invalid auth state and show login. |
| `500 INTERNAL_ERROR` | Show cached dashboard if available and a retry affordance. |
| Progress metrics fail but history succeeds | Show dashboard with missing progress module fallback. |
| History fails but metrics succeed | Show progress metrics and hide/retry history module. |
| No active enrollment | Show onboarding/program-start state instead of workout card. |

### **Offline Behavior**

* Show cached dashboard data with an offline banner.  
* Do not attempt server refresh until connectivity returns.  
* If cached active workout exists, allow **Resume Workout**.  
* If only cached next template exists but no server-created session exists, do not start a new workout offline unless offline session creation is explicitly supported.

---

## **3\. User Taps “Start Workout”**

### **User Action**

The user taps **Start Workout** from the Dashboard.

### **Data Needed**

* Authenticated user  
* Active program enrollment  
* Next workout template ID, if already loaded  
* Confirmation that no workout session is currently in progress  
* Network status

### **API Called**

No API call is required if the next screen is template selection.

If the product skips template selection in V1, this button may call directly:

POST /api/v1/workout-sessions/start

### **Client State Changes**

If template selection exists:

* Navigate to Template Selection screen.  
* `startWorkoutFlow.status = "selecting_template"`

If no template selection:

* `startWorkoutFlow.status = "starting"`  
* Disable button to prevent double taps.

### **Server State Changes**

None until `POST /api/v1/workout-sessions/start` is called.

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| User double taps | Client disables button after first tap. |
| No template available | Show “No workout available” and prompt retry/onboarding. |
| Existing in-progress workout detected client-side | Navigate to active workout instead of creating a new one. |

### **Offline Behavior**

* If an in-progress workout is cached locally, show **Resume Workout**.  
* If no workout session exists yet, do not start a server-backed workout offline by default.  
* Show: “You need a connection to start a new workout.”

---

## **4\. User Selects Template**

### **User Action**

The user selects a workout template, such as **Workout A**.

### **Product Note**

The PRD says V1 should minimize decision-making and use pre-generated workouts. The API contract allows `workoutTemplateId`, but notes that users should usually not choose templates manually in V1. Therefore, template selection should either be:

1. Hidden in V1, with the backend selecting the next assigned workout automatically; or  
2. Very constrained, showing only the next assigned template and perhaps a simple confirmation.

### **Data Needed**

* Selected `workoutTemplateId`  
* Template name  
* Estimated duration  
* Active program enrollment  
* Network status

### **API Called**

No separate template API is defined for regular user template selection in the current contract.

Starting with explicit template:

POST /api/v1/workout-sessions/start

Request:

{  
  "workoutTemplateId": "\<selected-template-id\>"  
}

Starting next assigned template:

POST /api/v1/workout-sessions/start

Request:

{}

### **Client State Changes**

* `selectedWorkoutTemplateId = template.id`  
* `startWorkoutFlow.status = "starting_session"`  
* Disable template controls while request is in flight.

### **Server State Changes**

None until start session request is processed.

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| Template no longer exists | Show “Workout unavailable. Refreshing…” and reload dashboard/template state. |
| Template inactive | Backend returns error; client reloads next assigned template. |
| User has no active enrollment | Return to onboarding/program selection state. |

### **Offline Behavior**

* Template selection can be shown from cache.  
* Starting a new server-backed session should remain disabled unless the app supports offline-created sessions.  
* If offline session creation is added later, the client must create a temporary local session ID and sync it later with an idempotency key.

---

## **5\. Workout Session Starts**

### **User Action**

The user confirms the selected workout or the app starts the next workout automatically.

### **Data Needed**

Backend reads:

* Authenticated user  
* Active `user_program_enrollments` record  
* `workout_templates`  
* `workout_template_exercise_entries`  
* `exercises`  
* `progression_states`

Backend creates:

* `workout_sessions`  
* `exercise_entries`  
* `sets`

### **API Called**

POST /api/v1/workout-sessions/start

Example request:

{}

or:

{  
  "workoutTemplateId": "\<template-id\>"  
}

### **Expected API Response**

Returns a full `WorkoutSessionDto` with:

* Session ID  
* Status: `in_progress`  
* Program ID/name  
* Workout template ID/name  
* Started timestamp  
* Exercise entries  
* Target sets/reps  
* Target weights  
* Pre-created set IDs  
* Pending set statuses

### **Client State Changes**

* `activeWorkout.status = "in_progress"`  
* Store `workoutSession.id`  
* Store ordered `exerciseEntries`  
* Store ordered `sets`  
* Set current exercise to first incomplete exercise.  
* Set current set to first pending set.  
* Navigate to Active Workout screen.

### **Server State Changes**

Inside a transaction:

* Create `workout_sessions` with `status = "in_progress"`.  
* Snapshot program/workout names.  
* Create `exercise_entries` from template entries.  
* Snapshot exercise names, categories, target sets/reps, progression rules.  
* Resolve target weights from `progression_states`.  
* Pre-create all `sets` with `status = "pending"`.

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| `401 UNAUTHENTICATED` | Show login/session expired state. |
| `404 NOT_FOUND` | No active enrollment/template; return to dashboard/onboarding. |
| `409 WORKOUT_ALREADY_IN_PROGRESS` | Fetch/resume existing workout instead of starting another. |
| `422 BUSINESS_RULE_VIOLATION` | Show friendly error and log technical details. |
| Network timeout | Show retry; avoid creating duplicate sessions by checking current session on retry. |

### **Offline Behavior**

* Cannot safely create a canonical workout session without the backend unless offline session creation is explicitly designed.  
* If request was sent and response did not return, client should check for an in-progress session after reconnect before retrying blindly.  
* Recommended future improvement: use idempotency key for `startWorkoutSession`.

---

## **6\. Active Workout Screen Renders**

### **User Action**

The user sees the first exercise and first pending set.

Example:

Bench Press  
3 × 8 @ 135 lbs

Set 1   8 reps   Confirm  
Set 2   8 reps   Confirm  
Set 3   8 reps   Confirm

### **Data Needed**

From `WorkoutSessionDto`:

* `workoutSession.id`  
* `exerciseEntry.id`  
* `exerciseName`  
* `category`  
* `targetSets`  
* `targetReps`  
* `targetWeightLbs`  
* `sets[].id`  
* `sets[].targetReps`  
* `sets[].targetWeightLbs`  
* `sets[].status`  
* `restSeconds`, if included in template/session payload

### **API Called**

None if start response already included full active workout payload.

Optional resume case:

GET /api/v1/workout-sessions/current

Recommended addition, because the current API contract does not define a current-session fetch endpoint.

### **Client State Changes**

* `activeWorkoutScreen.status = "ready"`  
* `currentExerciseIndex = 0`  
* `currentSetId = first pending set`  
* Pre-fill reps with target reps.  
* Pre-fill weight with target weight.

### **Server State Changes**

None.

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| Missing set IDs | Cannot log safely; show error and reload session. |
| Missing target weight | Show error; backend progression resolution failed. |
| Client render error | Error boundary shows recover/reload option; Sentry captures. |

### **Offline Behavior**

* If session payload is cached, render active workout fully offline.  
* User can continue logging sets locally.  
* Mark unsynced changes in local queue.

---

## **7\. User Logs a Set**

### **User Action**

The user taps **Confirm** for Set 1\.

### **Data Needed**

* `setId`  
* `exerciseEntryId`  
* `workoutSessionId`  
* `actualReps`  
* `actualWeightLbs`  
* `completedAt`  
* Current target reps/weight  
* Network status

### **API Called**

POST /api/v1/sets/{setId}/log

Request:

{  
  "actualReps": 8,  
  "actualWeightLbs": 135  
}

Recommended future header:

Idempotency-Key: \<uuid\>

### **Client State Changes**

Optimistic update immediately:

* Set status changes from `pending` to `completed` if `actualReps >= targetReps`.  
* Set status changes from `pending` to `failed` if `actualReps < targetReps`.  
* Store `actualReps`, `actualWeightLbs`, and local `completedAt`.  
* Increment completed set count.  
* Disable Confirm for that set.  
* Move UI focus to rest timer / next set.  
* Add API call to sync queue if offline or request is pending.

### **Server State Changes**

* Validate user owns the set through the parent workout session.  
* Confirm parent workout session is `in_progress`.  
* Set `actual_reps`.  
* Set `actual_weight_lbs`, defaulting to target weight if omitted.  
* Set `status = "completed"` when `actualReps >= targetReps`.  
* Set `status = "failed"` when `actualReps < targetReps`.  
* Set `completed_at`.

Progression state is not updated yet. Progression is finalized only when the workout is completed.

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| `400 VALIDATION_ERROR` | Revert optimistic update and show validation message. |
| `401 UNAUTHENTICATED` | Pause sync, show session expired state. |
| `403 FORBIDDEN` | Revert and show generic access error. |
| `404 NOT_FOUND` | Re-fetch active session; set may be stale. |
| `409 SET_ALREADY_LOGGED` | Reconcile local state with server response/current session. |
| `409 SESSION_NOT_IN_PROGRESS` | Stop active workout UI and reload dashboard/session state. |
| Timeout/network error | Keep optimistic state locally and retry in background. |

### **Offline Behavior**

* Allow set logging offline if the workout session was already created and cached.  
* Persist local set log event:

type PendingSetLog \= {  
  operation: "log\_set";  
  localOperationId: UUID;  
  setId: UUID;  
  workoutSessionId: UUID;  
  actualReps: number;  
  actualWeightLbs: number;  
  completedAt: ISODateTime;  
  syncStatus: "pending" | "syncing" | "failed";  
};

* Show the set as logged immediately.  
* Sync when online.  
* If backend rejects later, show a non-blocking correction state and reconcile.

---

## **8\. Rest Timer Runs**

### **User Action**

After logging Set 1, the rest timer starts automatically.

### **Data Needed**

* Rest duration for current exercise/set  
* Current time  
* Timer start time  
* Timer end time  
* Current exercise/set context

### **API Called**

None.

Rest timer is client-only in V1.

### **Client State Changes**

* `restTimer.status = "running"`  
* `restTimer.startedAt = now`  
* `restTimer.durationSeconds = exerciseEntry.restSeconds ?? defaultRestSeconds`  
* `restTimer.endsAt = startedAt + durationSeconds`  
* UI shows countdown.  
* Next set confirm button may remain visible and usable.

### **Server State Changes**

None.

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| App backgrounded | Recalculate remaining time from timestamps on return. |
| Timer drift | Use wall-clock difference, not interval count. |
| User skips rest | Allow logging next set early. |
| Missing rest duration | Use default rest duration. |

### **Offline Behavior**

* Fully available offline.  
* No sync required.

---

## **9\. User Logs Next Set**

### **User Action**

The user taps **Confirm** for Set 2 after or during rest.

### **Data Needed**

Same as Set 1:

* `setId`  
* `exerciseEntryId`  
* `workoutSessionId`  
* `actualReps`  
* `actualWeightLbs`  
* `completedAt`

### **API Called**

POST /api/v1/sets/{setId}/log

Request:

{  
  "actualReps": 8,  
  "actualWeightLbs": 135  
}

### **Client State Changes**

* Optimistically mark Set 2 completed/failed.  
* Stop existing rest timer if still running.  
* Start new rest timer if another set remains for the exercise.  
* If Set 2 was the final set for that exercise, prompt effort feedback:  
  * Too Easy  
  * Just Right  
  * Too Hard  
* If exercise complete, auto-advance to next exercise.

### **Server State Changes**

Same as Set 1:

* Update set record.  
* Determine completed vs failed.  
* Return updated set summary and exercise completion state.

### **If It Fails**

Same as Step 7\.

Additional case:

| Failure | Expected Behavior |
| ----- | ----- |
| Earlier set still pending on server due to sync delay | Allow local flow to continue; sync queue preserves operation order per workout session. |

### **Offline Behavior**

* Same as Step 7\.  
* Offline queue must preserve order for operations against the same workout session.  
* Client can continue through the workout even when multiple set logs are pending sync.

---

## **10\. User Completes Remaining Sets and Exercises**

### **User Action**

The user continues logging sets until all required sets are completed or failed.

After the last set of each exercise, the app asks:

How did this feel?  
Too Easy / Just Right / Too Hard

### **Data Needed**

* All exercise entries  
* All set statuses  
* Per-exercise effort feedback  
* Failed set detection  
* Whether all required sets are completed or failed

### **API Called**

For each set:

POST /api/v1/sets/{setId}/log

No API call is required just to select effort feedback unless feedback is persisted before workout completion.

### **Client State Changes**

* Track each set as `pending`, `completed`, or `failed`.  
* Track `exerciseFeedback[exerciseEntryId]`.  
* Mark exercise complete when all sets are completed/failed and feedback is selected.  
* Enable **Finish Workout** when all required sets are no longer pending and required feedback is present.

### **Server State Changes**

Only set records change during set logging.

Exercise effort feedback and progression updates are finalized during workout completion.

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| Feedback missing | Keep Finish Workout disabled or show inline prompt. |
| Some sets still pending | Backend will reject completion with `422 INCOMPLETE_WORKOUT`. |
| Set sync pending | Allow finish only if online sync has completed, or queue finish after set logs. |

### **Offline Behavior**

* User may continue logging sets locally.  
* User may select effort feedback locally.  
* Completion can be staged locally, but canonical workout completion should sync only after all set logs sync successfully.

---

## **11\. User Taps “Finish Workout”**

### **User Action**

The user taps **Finish Workout**.

### **Data Needed**

* `workoutSessionId`  
* All set logs synced or queued in order  
* All required sets completed or failed  
* `exerciseFeedback[]`  
* Optional `userEffortFeedback`  
* Completion timestamp  
* Network status

### **API Called**

POST /api/v1/workout-sessions/{sessionId}/complete

Request:

{  
  "exerciseFeedback": \[  
    {  
      "exerciseEntryId": "\<exercise-entry-id\>",  
      "effortFeedback": "just\_right"  
    }  
  \],  
  "userEffortFeedback": "just\_right"  
}

### **Client State Changes**

* `finishWorkout.status = "saving"`  
* Disable Finish button.  
* Show saving state.  
* Prevent additional set edits unless editing is supported.

### **Server State Changes**

Inside a transaction:

* Validate session belongs to user.  
* Validate session is `in_progress`.  
* Validate all required sets are completed or failed.  
* Validate required effort feedback exists.  
* Update `exercise_entries.effort_feedback`.  
* Update `workout_sessions.status = "completed"`.  
* Set `completed_at`.  
* Calculate `duration_seconds`.  
* Update `progression_states` for each exercise.  
* Create append-only `progress_metrics`.  
* Advance `user_program_enrollments.current_workout_template_id` to the next workout template.

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| `422 INCOMPLETE_WORKOUT` | Return to workout and highlight pending sets. |
| `422 MISSING_EFFORT_FEEDBACK` | Prompt for missing feedback. |
| `409 SESSION_ALREADY_COMPLETED` | Treat as successful if server confirms completed state. |
| `409 SESSION_NOT_IN_PROGRESS` | Reload current session/dashboard state. |
| `500 PROGRESSION_UPDATE_FAILED` | Show “Workout not saved yet” and retry; do not show completed dashboard until resolved. |
| Network timeout | Keep workout in local “completion pending” state and retry. |

### **Offline Behavior**

* If offline, do not mark workout as canonically saved.  
* Mark locally as:

activeWorkout.localCompletionStatus \= "pending\_sync"

* Queue completion operation after all pending set logs.  
* Show: “Workout complete. Syncing when you’re back online.”  
* Dashboard may show local pending completion, clearly marked as unsynced.

---

## **12\. Workout Saved**

### **User Action**

The user sees that the workout has been saved.

### **Data Needed**

From completion response:

* Completed `WorkoutSessionDto`  
* `progressionUpdates[]`  
* `progressMetrics[]`  
* `nextWorkoutTemplate`

### **API Called**

Completion response comes from:

POST /api/v1/workout-sessions/{sessionId}/complete

Optional refresh after completion:

GET /api/v1/progress-metrics?limit=20  
GET /api/v1/workout-history?limit=20\&status=completed

Recommended:

GET /api/v1/dashboard

### **Client State Changes**

* `activeWorkout.status = "completed"`  
* Clear active workout from local active-session state.  
* Store completed workout summary.  
* Store progression updates.  
* Store progress metrics.  
* Navigate to Workout Summary or Dashboard.

### **Server State Changes**

Already completed in Step 11 transaction.

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| Completion succeeded but dashboard refresh failed | Show summary from completion response and retry dashboard refresh in background. |
| Completion response missing metrics | Show generic “Workout completed” and log server issue. |
| Local cache write fails | Continue with server state; reload dashboard from API. |

### **Offline Behavior**

* If completion is pending sync, show local summary but mark it unsynced.  
* Do not update permanent progression display from local-only assumptions unless clearly labeled.  
* After reconnect and sync success, replace local summary with server-confirmed progression updates and metrics.

---

## **13\. Dashboard Updates**

### **User Action**

The user returns to the Dashboard.

### **Data Needed**

* Latest completed workout  
* Latest progress metrics  
* Updated weekly workout count  
* Updated next workout template  
* No active in-progress workout

### **API Called**

Current contract:

GET /api/v1/progress-metrics?limit=20  
GET /api/v1/workout-history?limit=20\&status=completed

Recommended:

GET /api/v1/dashboard

### **Client State Changes**

* `dashboard.status = "refreshing"`  
* Remove completed workout from active workout state.  
* Update progress cards:  
  * “Workout completed”  
  * “+5 lbs from last session”  
  * “3 workouts completed this week”  
* Update next workout card to next template.  
* Show **Start Workout** again.

### **Server State Changes**

None for dashboard read.

### **If It Fails**

| Failure | Expected Behavior |
| ----- | ----- |
| Metrics refresh fails | Use metrics returned from completion response. |
| History refresh fails | Show completion summary and retry history later. |
| Dashboard endpoint unavailable | Fallback to separate metrics/history calls. |

### **Offline Behavior**

* If completion was synced before going offline, show cached updated dashboard.  
* If completion is pending sync, show a pending-sync dashboard state.  
* Disable starting another workout until sync resolves, unless multiple offline workouts are explicitly supported.

---

# **API Calls Used in This Vertical Slice**

## **Existing API Contract**

| Flow Step | Endpoint | Purpose |
| ----- | ----- | ----- |
| Dashboard loads | `GET /api/v1/progress-metrics` | Load trust/progress messages. |
| Dashboard loads | `GET /api/v1/workout-history` | Load recent completed workouts. |
| Workout starts | `POST /api/v1/workout-sessions/start` | Create active workout session, exercise entries, and sets. |
| Log set | `POST /api/v1/sets/{setId}/log` | Log one set. |
| Complete workout | `POST /api/v1/workout-sessions/{sessionId}/complete` | Finalize workout, progression, metrics, and next template. |

## **Recommended Additions**

| Endpoint | Purpose |
| ----- | ----- |
| `GET /api/v1/dashboard` | Load all dashboard data in one request. |
| `GET /api/v1/workout-sessions/current` | Resume active workout reliably after app restart. |
| `POST /api/v1/workout-sessions/start` with `Idempotency-Key` | Prevent duplicate sessions on retry. |
| `POST /api/v1/sets/{setId}/log` with `Idempotency-Key` | Improve mobile retry safety for set logging. |
| `POST /api/v1/workout-sessions/{sessionId}/complete` with `Idempotency-Key` | Prevent duplicate completion/progression updates. |

---

# **Client State Model**

## **Suggested High-Level State**

type AppWorkoutState \= {  
  auth: {  
    status: "checking\_session" | "authenticated" | "unauthenticated";  
  };

  network: {  
    status: "online" | "offline";  
  };

  dashboard: {  
    status: "idle" | "loading" | "ready" | "refreshing" | "error";  
    nextWorkoutTemplate: DashboardTemplate | null;  
    activeWorkoutSessionId: string | null;  
    recentMetrics: ProgressMetricDto\[\];  
    recentHistory: WorkoutHistoryItemDto\[\];  
  };

  activeWorkout: {  
    status:  
      | "none"  
      | "starting"  
      | "in\_progress"  
      | "saving"  
      | "completed"  
      | "pending\_sync"  
      | "error";  
    session: WorkoutSessionDto | null;  
    currentExerciseEntryId: string | null;  
    currentSetId: string | null;  
    exerciseFeedback: Record\<string, EffortFeedback\>;  
  };

  restTimer: {  
    status: "idle" | "running" | "paused" | "complete";  
    startedAt: string | null;  
    endsAt: string | null;  
    durationSeconds: number | null;  
  };

  syncQueue: PendingWorkoutOperation\[\];  
};

---

# **Offline Sync Rules**

## **What Works Offline**

* Opening the app with cached data.  
* Viewing cached dashboard.  
* Resuming an already-created and cached workout session.  
* Logging sets locally for a cached active workout.  
* Running rest timers.  
* Selecting effort feedback locally.  
* Staging workout completion locally.

## **What Should Not Work Offline by Default**

* Starting a brand-new canonical workout session.  
* Creating new workout templates.  
* Finalizing progression state as if it were server-confirmed.  
* Starting another workout while a previous completion is pending sync.

## **Sync Ordering**

For a single workout session, sync operations must be processed in order:

1. Start workout session, if offline-created sessions are ever supported.  
2. Log set operations in completed order.  
3. Complete workout session.  
4. Refresh dashboard/progress metrics.

## **Conflict Handling**

| Conflict | Resolution |
| ----- | ----- |
| Set already logged | Treat server as source of truth and reconcile local state. |
| Session already completed | Treat as success if server completion state matches user intent. |
| Session not in progress | Stop local workout flow and reload server state. |
| Progression update failed | Keep completion pending/retry; do not invent progression locally. |

---

# **Failure Principles**

## **User-Facing Principles**

* Never lose logged workout data.  
* Keep the user moving during the workout whenever safely possible.  
* Use optimistic updates for speed, but reconcile with server truth.  
* Do not expose technical errors during workout unless action is required.  
* Make offline/pending-sync state clear without being alarming.

## **Engineering Principles**

* Backend is authoritative for progression.  
* Completion must be transactional.  
* Set logging should be retry-safe.  
* Historical workout data should be snapshot-based and stable.  
* Client should preserve pending operations locally until confirmed by server.

---

# **Acceptance Criteria**

## **Dashboard**

* Dashboard loads with cached data first when available.  
* Dashboard refreshes recent progress and workout history from API.  
* Dashboard shows **Resume Workout** if an in-progress session exists.  
* Dashboard shows **Start Workout** if no workout is in progress.

## **Start Workout**

* Tapping **Start Workout** creates exactly one in-progress workout session.  
* Duplicate taps do not create duplicate sessions.  
* The active workout screen has all data needed from the start response.  
* Sets are pre-created before the user logs anything.

## **Active Workout**

* User can log a set in under 2 seconds.  
* Set inputs are pre-filled with target reps and target weight.  
* Confirming a set updates UI immediately.  
* Rest timer starts automatically after a set is logged.  
* Exercise feedback is collected after the final set of each exercise.

## **Completion**

* Finish Workout is only available when all required sets are completed or failed and feedback is present.  
* Completion updates workout session, effort feedback, progression state, progress metrics, and next workout template in one backend transaction.  
* Dashboard updates after completion.

## **Offline**

* Cached active workouts can continue offline.  
* Offline set logs are persisted locally.  
* Completion can be staged but not treated as server-confirmed until synced.  
* Progression updates are not finalized locally.

---

# **Open Implementation Questions**

1. Should V1 actually expose template selection, or should **Start Workout** always start the next assigned template automatically?  
2. Should `GET /api/v1/dashboard` be added before frontend implementation to avoid multiple dashboard requests?  
3. Should `GET /api/v1/workout-sessions/current` be added for reliable resume behavior?  
4. Should idempotency keys be added immediately for start, log set, and complete operations?  
5. What is the default rest duration for compound vs accessory lifts if `restSeconds` is missing?  
6. Should users be allowed to finish a workout while set log sync is still pending, or should completion wait for confirmed set logs?

---

# **Recommended Implementation Decision**

For V1, the cleanest implementation is:

* **Do not expose real template selection yet.**  
* Make **Start Workout** call `POST /api/v1/workout-sessions/start` with an empty body.  
* Let the backend choose the next template from the active program enrollment.  
* Add `GET /api/v1/dashboard` and `GET /api/v1/workout-sessions/current` before building the main workout UI.  
* Add idempotency keys for workout start, set logging, and workout completion before testing offline/retry behavior.

This best supports the product promise: the user opens the app, starts the workout, follows instructions, logs what happened, and the system handles the rest.

