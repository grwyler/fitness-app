# **Fitness App API Contract**

## **1\. Purpose**

# **This document defines how the fitness app communicates with the backend for the V1 workout flow.**

# **The API supports the core loop:**

# **Open app → Start workout → Log sets → Complete workout → View history/progress**

# **The contract is designed around these product goals:**

* # **Fast workout loading**

* # **One-tap set logging**

* # **Deterministic progression logic**

* # **Minimal client-side decision-making**

* # **Strong historical accuracy**

* # **Secure user-specific data access**

# ---

## **2\. API Style**

### **Protocol**

# **REST over HTTPS.**

### **Base URL**

# **/api/v1**

# 

# **Example:**

# **POST /api/v1/workout-templates**

# **POST /api/v1/workout-sessions/start**

# **POST /api/v1/sets/{setId}/log**

# **POST /api/v1/workout-sessions/{sessionId}/complete**

# **GET  /api/v1/workout-history**

# **GET  /api/v1/progress-metrics**

# 

### **Format**

# **Requests and responses use JSON.**

# **Content-Type: application/json**

# **Accept: application/json**

# 

# ---

## **3\. Authentication**

# **All endpoints require authentication unless explicitly stated otherwise.**

### **Auth Method**

# **The mobile app authenticates the user through the auth provider and sends a JWT to the backend.**

# **Authorization: Bearer \<jwt\>**

# 

### **Backend Auth Requirements**

# **For every protected route, the backend must:**

1. # **Verify the JWT.**

2. # **Resolve the authenticated app user.**

3. # **Enforce ownership of user-owned records.**

4. # **Reject access to records owned by another user.**

### **Standard Auth Errors**

| Status | Code | Meaning |
| ----- | ----- | ----- |
| **401** | **`UNAUTHENTICATED`** | **Missing, expired, or invalid token** |
| **403** | **`FORBIDDEN`** | **User is authenticated but does not own the requested resource** |

# ---

## **4\. Standard Response Envelope**

### **Success Response**

# **{**

#   **"data": {},**

#   **"meta": {}**

# **}**

# 

### **Error Response**

# **{**

#   **"error": {**

#     **"code": "VALIDATION\_ERROR",**

#     **"message": "One or more fields are invalid.",**

#     **"details": \[**

#       **{**

#         **"field": "actualReps",**

#         **"message": "actualReps must be greater than or equal to 0."**

#       **}**

#     **\]**

#   **}**

# **}**

# 

### **Common Error Codes**

| Status | Code | Meaning |
| ----- | ----- | ----- |
| **400** | **`VALIDATION_ERROR`** | **Request body or query params are invalid** |
| **401** | **`UNAUTHENTICATED`** | **User is not authenticated** |
| **403** | **`FORBIDDEN`** | **User cannot access this resource** |
| **404** | **`NOT_FOUND`** | **Resource does not exist or is not visible to the user** |
| **409** | **`CONFLICT`** | **Request conflicts with current state** |
| **422** | **`BUSINESS_RULE_VIOLATION`** | **Request is syntactically valid but violates workout rules** |
| **500** | **`INTERNAL_ERROR`** | **Unexpected backend error** |

# ---

## **5\. Shared Types**

### **UUID**

# **String UUID.**

# **type UUID \= string;**

# 

### **ISO DateTime**

# **ISO 8601 datetime string.**

# **type ISODateTime \= string;**

# 

### **Effort Feedback**

# **type EffortFeedback \= "too\_easy" | "just\_right" | "too\_hard";**

# 

### **Workout Session Status**

# **type WorkoutSessionStatus \= "planned" | "in\_progress" | "completed" | "abandoned";**

# 

### **Set Status**

# **type SetStatus \= "pending" | "completed" | "skipped" | "failed";**

# 

### **Exercise Category**

# **type ExerciseCategory \= "compound" | "accessory";**

# 

### **Workout Session DTO**

# **type WorkoutSessionDto \= {**

#   **id: UUID;**

#   **status: WorkoutSessionStatus;**

#   **programId: UUID;**

#   **workoutTemplateId: UUID;**

#   **programName: string;**

#   **workoutName: string;**

#   **startedAt: ISODateTime | null;**

#   **completedAt: ISODateTime | null;**

#   **durationSeconds: number | null;**

#   **exercises: ExerciseEntryDto\[\];**

# **};**

# 

### **Exercise Entry DTO**

# **type ExerciseEntryDto \= {**

#   **id: UUID;**

#   **exerciseId: UUID;**

#   **exerciseName: string;**

#   **category: ExerciseCategory;**

#   **sequenceOrder: number;**

#   **targetSets: number;**

#   **targetReps: number;**

#   **targetWeightLbs: number;**

#   **effortFeedback: EffortFeedback | null;**

#   **completedAt: ISODateTime | null;**

#   **sets: SetDto\[\];**

# **};**

# 

### **Set DTO**

# **type SetDto \= {**

#   **id: UUID;**

#   **exerciseEntryId: UUID;**

#   **setNumber: number;**

#   **targetReps: number;**

#   **actualReps: number | null;**

#   **targetWeightLbs: number;**

#   **actualWeightLbs: number | null;**

#   **status: SetStatus;**

#   **completedAt: ISODateTime | null;**

# **};**

# 

# ---

# **6\. Operations**

# ---

## **6.1 createWorkoutTemplate**

# **Creates a workout template within a program.**

# **This operation is primarily an admin/system operation for V1 because workouts are pre-generated and users do not create custom workouts in the MVP.**

### **Endpoint**

# **POST /api/v1/workout-templates**

# 

### **Auth Requirements**

# **Requires authenticated user with admin/system role.**

# **Regular users must not be able to create workout templates in V1.**

### **Input**

# **type CreateWorkoutTemplateRequest \= {**

#   **programId: UUID;**

#   **name: string;**

#   **sequenceOrder: number;**

#   **estimatedDurationMinutes?: number;**

#   **exercises: CreateWorkoutTemplateExerciseInput\[\];**

# **};**

# 

# **type CreateWorkoutTemplateExerciseInput \= {**

#   **exerciseId: UUID;**

#   **sequenceOrder: number;**

#   **targetSets: number;**

#   **targetReps: number;**

#   **restSeconds?: number | null;**

# **};**

# 

### **Example Request**

# **{**

#   **"programId": "7e4a7f64-2c6e-4a89-a88c-034ae548c83a",**

#   **"name": "Workout A",**

#   **"sequenceOrder": 1,**

#   **"estimatedDurationMinutes": 60,**

#   **"exercises": \[**

#     **{**

#       **"exerciseId": "7c7ec60f-6f1e-4fa5-8a75-17b690d3a401",**

#       **"sequenceOrder": 1,**

#       **"targetSets": 3,**

#       **"targetReps": 8,**

#       **"restSeconds": 120**

#     **}**

#   **\]**

# **}**

# 

### **Output**

# **type CreateWorkoutTemplateResponse \= {**

#   **id: UUID;**

#   **programId: UUID;**

#   **name: string;**

#   **sequenceOrder: number;**

#   **estimatedDurationMinutes: number | null;**

#   **isActive: boolean;**

#   **exercises: WorkoutTemplateExerciseDto\[\];**

#   **createdAt: ISODateTime;**

#   **updatedAt: ISODateTime;**

# **};**

# 

# **type WorkoutTemplateExerciseDto \= {**

#   **id: UUID;**

#   **workoutTemplateId: UUID;**

#   **exerciseId: UUID;**

#   **exerciseName: string;**

#   **sequenceOrder: number;**

#   **targetSets: number;**

#   **targetReps: number;**

#   **restSeconds: number | null;**

# **};**

# 

### **Example Response**

# **{**

#   **"data": {**

#     **"id": "f2995e2d-d6db-44e0-aad6-cf9f629eb325",**

#     **"programId": "7e4a7f64-2c6e-4a89-a88c-034ae548c83a",**

#     **"name": "Workout A",**

#     **"sequenceOrder": 1,**

#     **"estimatedDurationMinutes": 60,**

#     **"isActive": true,**

#     **"exercises": \[**

#       **{**

#         **"id": "233378c1-e015-4f81-8872-abc722e87ea8",**

#         **"workoutTemplateId": "f2995e2d-d6db-44e0-aad6-cf9f629eb325",**

#         **"exerciseId": "7c7ec60f-6f1e-4fa5-8a75-17b690d3a401",**

#         **"exerciseName": "Squat",**

#         **"sequenceOrder": 1,**

#         **"targetSets": 3,**

#         **"targetReps": 8,**

#         **"restSeconds": 120**

#       **}**

#     **\],**

#     **"createdAt": "2026-04-24T14:30:00Z",**

#     **"updatedAt": "2026-04-24T14:30:00Z"**

#   **},**

#   **"meta": {}**

# **}**

# 

### **Errors**

| Status | Code | Condition |
| ----- | ----- | ----- |
| **400** | **`VALIDATION_ERROR`** | **Missing required field, invalid UUID, invalid sequence order** |
| **401** | **`UNAUTHENTICATED`** | **Missing or invalid JWT** |
| **403** | **`FORBIDDEN`** | **User is not allowed to create templates** |
| **404** | **`NOT_FOUND`** | **Program or exercise does not exist** |
| **409** | **`CONFLICT`** | **`sequenceOrder` already exists for the program** |
| **422** | **`BUSINESS_RULE_VIOLATION`** | **Template has no exercises, or V1 set/rep rules are violated** |

### **Business Rules**

* # **`sequenceOrder` must be unique within a program.**

* # **Each exercise `sequenceOrder` must be unique within the template.**

* # **V1 default is 3 sets × 8 reps.**

* # **Templates should be deactivated rather than deleted once used by historical sessions.**

# ---

## **6.2 startWorkoutSession**

# **Starts the next workout for the authenticated user.**

# **This operation creates a workout session from the user’s current workout template, snapshots template data, generates exercise entries, pre-creates sets, and applies current progression state to determine target weights.**

### **Endpoint**

# **POST /api/v1/workout-sessions/start**

# 

### **Auth Requirements**

# **Requires authenticated user.**

# **Users may only start sessions for themselves.**

### **Input**

# **type StartWorkoutSessionRequest \= {**

#   **workoutTemplateId?: UUID;**

#   **startedAt?: ISODateTime;**

# **};**

# 

### **Input Rules**

* # **If `workoutTemplateId` is omitted, backend starts the next template from the user’s active program enrollment.**

* # **`startedAt` is optional. If omitted, backend uses server time.**

* # **In V1, users should usually not choose templates manually; this field exists for backend/admin flexibility and future use.**

### **Example Request**

# **{}**

# 

### **Output**

# **type StartWorkoutSessionResponse \= WorkoutSessionDto;**

# 

### **Example Response**

# **{**

#   **"data": {**

#     **"id": "e3c74f2c-83a8-4e93-9bd0-a6c553f6a6df",**

#     **"status": "in\_progress",**

#     **"programId": "7e4a7f64-2c6e-4a89-a88c-034ae548c83a",**

#     **"workoutTemplateId": "f2995e2d-d6db-44e0-aad6-cf9f629eb325",**

#     **"programName": "Beginner Full Body V1",**

#     **"workoutName": "Workout A",**

#     **"startedAt": "2026-04-24T22:00:00Z",**

#     **"completedAt": null,**

#     **"durationSeconds": null,**

#     **"exercises": \[**

#       **{**

#         **"id": "af57e8d4-3670-4cf6-a446-7782ab7cbe91",**

#         **"exerciseId": "7c7ec60f-6f1e-4fa5-8a75-17b690d3a401",**

#         **"exerciseName": "Bench Press",**

#         **"category": "compound",**

#         **"sequenceOrder": 1,**

#         **"targetSets": 3,**

#         **"targetReps": 8,**

#         **"targetWeightLbs": 135,**

#         **"effortFeedback": null,**

#         **"completedAt": null,**

#         **"sets": \[**

#           **{**

#             **"id": "eb4e1247-6778-4589-a116-895c7360aa74",**

#             **"exerciseEntryId": "af57e8d4-3670-4cf6-a446-7782ab7cbe91",**

#             **"setNumber": 1,**

#             **"targetReps": 8,**

#             **"actualReps": null,**

#             **"targetWeightLbs": 135,**

#             **"actualWeightLbs": null,**

#             **"status": "pending",**

#             **"completedAt": null**

#           **}**

#         **\]**

#       **}**

#     **\]**

#   **},**

#   **"meta": {}**

# **}**

# 

### **Errors**

| Status | Code | Condition |
| ----- | ----- | ----- |
| **400** | **`VALIDATION_ERROR`** | **Invalid template ID or invalid datetime** |
| **401** | **`UNAUTHENTICATED`** | **Missing or invalid JWT** |
| **404** | **`NOT_FOUND`** | **User has no active enrollment or template does not exist** |
| **409** | **`WORKOUT_ALREADY_IN_PROGRESS`** | **User already has an in-progress workout** |
| **422** | **`BUSINESS_RULE_VIOLATION`** | **Template has no active exercises or progression state cannot be resolved** |

### **Business Rules**

* # **A user may only have one `in_progress` workout session at a time.**

* # **Sets should be pre-created when the session starts.**

* # **Session data must snapshot template and exercise details.**

* # **Target weights must come from `progression_states`, not from recalculating full workout history.**

* # **The response should include all data needed to render the active workout screen immediately.**

# ---

## **6.3 logSet**

# **Logs the result of a single set.**

# **This operation must be fast and safe for optimistic UI. The client may update immediately, then reconcile with the backend response.**

### **Endpoint**

# **POST /api/v1/sets/{setId}/log**

# 

### **Auth Requirements**

# **Requires authenticated user.**

# **User must own the workout session associated with the set.**

### **Path Params**

# **type LogSetPathParams \= {**

#   **setId: UUID;**

# **};**

# 

### **Input**

# **type LogSetRequest \= {**

#   **actualReps: number;**

#   **actualWeightLbs?: number;**

#   **completedAt?: ISODateTime;**

# **};**

# 

### **Input Rules**

* # **`actualReps` must be greater than or equal to 0\.**

* # **`actualWeightLbs` defaults to the set’s target weight if omitted.**

* # **`completedAt` defaults to server time if omitted.**

* # **Backend determines `status`:**

  * # **`completed` if `actualReps >= targetReps`**

  * # **`failed` if `actualReps < targetReps`**

### **Example Request**

# **{**

#   **"actualReps": 8,**

#   **"actualWeightLbs": 135**

# **}**

# 

### **Output**

# **type LogSetResponse \= {**

#   **set: SetDto;**

#   **exerciseEntry: {**

#     **id: UUID;**

#     **completedSetCount: number;**

#     **totalSetCount: number;**

#     **hasFailures: boolean;**

#     **isComplete: boolean;**

#   **};**

#   **workoutSession: {**

#     **id: UUID;**

#     **status: WorkoutSessionStatus;**

#   **};**

# **};**

# 

### **Example Response**

# **{**

#   **"data": {**

#     **"set": {**

#       **"id": "eb4e1247-6778-4589-a116-895c7360aa74",**

#       **"exerciseEntryId": "af57e8d4-3670-4cf6-a446-7782ab7cbe91",**

#       **"setNumber": 1,**

#       **"targetReps": 8,**

#       **"actualReps": 8,**

#       **"targetWeightLbs": 135,**

#       **"actualWeightLbs": 135,**

#       **"status": "completed",**

#       **"completedAt": "2026-04-24T22:05:12Z"**

#     **},**

#     **"exerciseEntry": {**

#       **"id": "af57e8d4-3670-4cf6-a446-7782ab7cbe91",**

#       **"completedSetCount": 1,**

#       **"totalSetCount": 3,**

#       **"hasFailures": false,**

#       **"isComplete": false**

#     **},**

#     **"workoutSession": {**

#       **"id": "e3c74f2c-83a8-4e93-9bd0-a6c553f6a6df",**

#       **"status": "in\_progress"**

#     **}**

#   **},**

#   **"meta": {}**

# **}**

# 

### **Errors**

| Status | Code | Condition |
| ----- | ----- | ----- |
| **400** | **`VALIDATION_ERROR`** | **Invalid reps, invalid weight, malformed set ID** |
| **401** | **`UNAUTHENTICATED`** | **Missing or invalid JWT** |
| **403** | **`FORBIDDEN`** | **Set belongs to another user** |
| **404** | **`NOT_FOUND`** | **Set does not exist** |
| **409** | **`SET_ALREADY_LOGGED`** | **Set has already been completed or failed** |
| **409** | **`SESSION_NOT_IN_PROGRESS`** | **Parent workout session is not in progress** |
| **422** | **`BUSINESS_RULE_VIOLATION`** | **Set does not belong to an active workout flow** |

### **Business Rules**

* # **Logging must be idempotency-safe from the client perspective.**

* # **Backend should reject duplicate logs unless the product explicitly supports editing sets.**

* # **In V1, editing previously logged sets should be avoided unless necessary.**

* # **A set is failed when `actualReps < targetReps`.**

* # **Logging a set should not update progression state immediately; progression should be finalized when the workout is completed.**

### **Recommended Future Addition**

# **Add an idempotency key for mobile retry safety:**

# **Idempotency-Key: \<uuid\>**

# 

# ---

## **6.4 completeWorkoutSession**

# **Completes an in-progress workout session.**

# **This operation finalizes the workout, records exercise effort feedback, updates progression state, creates progress metrics, calculates duration, and advances the user’s program enrollment to the next workout template.**

### **Endpoint**

# **POST /api/v1/workout-sessions/{sessionId}/complete**

# 

### **Auth Requirements**

# **Requires authenticated user.**

# **User must own the workout session.**

### **Path Params**

# **type CompleteWorkoutSessionPathParams \= {**

#   **sessionId: UUID;**

# **};**

# 

### **Input**

# **type CompleteWorkoutSessionRequest \= {**

#   **completedAt?: ISODateTime;**

#   **exerciseFeedback: ExerciseFeedbackInput\[\];**

#   **userEffortFeedback?: EffortFeedback;**

# **};**

# 

# **type ExerciseFeedbackInput \= {**

#   **exerciseEntryId: UUID;**

#   **effortFeedback: EffortFeedback;**

# **};**

# 

### **Example Request**

# **{**

#   **"exerciseFeedback": \[**

#     **{**

#       **"exerciseEntryId": "af57e8d4-3670-4cf6-a446-7782ab7cbe91",**

#       **"effortFeedback": "just\_right"**

#     **}**

#   **\],**

#   **"userEffortFeedback": "just\_right"**

# **}**

# 

### **Output**

# **type CompleteWorkoutSessionResponse \= {**

#   **workoutSession: WorkoutSessionDto;**

#   **progressionUpdates: ProgressionUpdateDto\[\];**

#   **progressMetrics: ProgressMetricDto\[\];**

#   **nextWorkoutTemplate: {**

#     **id: UUID;**

#     **name: string;**

#     **sequenceOrder: number;**

#   **} | null;**

# **};**

# 

# **type ProgressionUpdateDto \= {**

#   **exerciseId: UUID;**

#   **exerciseName: string;**

#   **previousWeightLbs: number;**

#   **nextWeightLbs: number;**

#   **result: "increased" | "repeated" | "reduced";**

#   **reason: string;**

# **};**

# 

# **type ProgressMetricDto \= {**

#   **id: UUID;**

#   **metricType: string;**

#   **metricValue: number | null;**

#   **displayText: string;**

#   **recordedAt: ISODateTime;**

# **};**

# 

### **Example Response**

# **{**

#   **"data": {**

#     **"workoutSession": {**

#       **"id": "e3c74f2c-83a8-4e93-9bd0-a6c553f6a6df",**

#       **"status": "completed",**

#       **"programId": "7e4a7f64-2c6e-4a89-a88c-034ae548c83a",**

#       **"workoutTemplateId": "f2995e2d-d6db-44e0-aad6-cf9f629eb325",**

#       **"programName": "Beginner Full Body V1",**

#       **"workoutName": "Workout A",**

#       **"startedAt": "2026-04-24T22:00:00Z",**

#       **"completedAt": "2026-04-24T22:52:00Z",**

#       **"durationSeconds": 3120,**

#       **"exercises": \[\]**

#     **},**

#     **"progressionUpdates": \[**

#       **{**

#         **"exerciseId": "7c7ec60f-6f1e-4fa5-8a75-17b690d3a401",**

#         **"exerciseName": "Bench Press",**

#         **"previousWeightLbs": 135,**

#         **"nextWeightLbs": 140,**

#         **"result": "increased",**

#         **"reason": "Completed all sets with just\_right feedback."**

#       **}**

#     **\],**

#     **"progressMetrics": \[**

#       **{**

#         **"id": "b94964c2-350b-4ec7-9400-2334342d107a",**

#         **"metricType": "weight\_increase",**

#         **"metricValue": 5,**

#         **"displayText": "+5 lbs from last session",**

#         **"recordedAt": "2026-04-24T22:52:00Z"**

#       **},**

#       **{**

#         **"id": "03e246a5-49d6-46cb-b38b-063c3c48cf6d",**

#         **"metricType": "workout\_completed",**

#         **"metricValue": 1,**

#         **"displayText": "Workout completed",**

#         **"recordedAt": "2026-04-24T22:52:00Z"**

#       **}**

#     **\],**

#     **"nextWorkoutTemplate": {**

#       **"id": "55e752af-3a90-4ac4-a9fa-6558f20e67f1",**

#       **"name": "Workout B",**

#       **"sequenceOrder": 2**

#     **}**

#   **},**

#   **"meta": {}**

# **}**

# 

### **Errors**

| Status | Code | Condition |
| ----- | ----- | ----- |
| **400** | **`VALIDATION_ERROR`** | **Invalid session ID, invalid feedback value, malformed request** |
| **401** | **`UNAUTHENTICATED`** | **Missing or invalid JWT** |
| **403** | **`FORBIDDEN`** | **Session belongs to another user** |
| **404** | **`NOT_FOUND`** | **Workout session does not exist** |
| **409** | **`SESSION_ALREADY_COMPLETED`** | **Workout has already been completed** |
| **409** | **`SESSION_NOT_IN_PROGRESS`** | **Session is not currently in progress** |
| **422** | **`INCOMPLETE_WORKOUT`** | **Required sets are still pending** |
| **422** | **`MISSING_EFFORT_FEEDBACK`** | **Required effort feedback is missing** |
| **500** | **`PROGRESSION_UPDATE_FAILED`** | **Progression transaction failed unexpectedly** |

### **Business Rules**

* # **Completion must run in a database transaction.**

* # **Required sets must be completed or failed before the session can be completed.**

* # **Exercise feedback should be captured after the final set of each exercise.**

* # **Progression state updates only when the session completes.**

* # **Progress metrics should be append-only.**

* # **The user’s active enrollment should advance to the next workout template.**

### **Progression Rules**

# **For compound lifts:**

| Condition | Result |
| ----- | ----- |
| **Completed normally** | **\+5 lbs** |
| **Marked `too_easy`** | **\+10 lbs** |
| **Marked `too_hard`** | **Repeat weight** |
| **First failure** | **Repeat weight** |
| **Second consecutive failure** | **Reduce by 5–10%** |

# **For accessory lifts:**

| Condition | Result |
| ----- | ----- |
| **Completed normally** | **\+2.5 lbs** |
| **Marked `too_easy`** | **\+5 lbs** |
| **Marked `too_hard`** | **Repeat weight** |
| **First failure** | **Repeat weight** |
| **Second consecutive failure** | **Reduce by 5–10%** |

# **Failure is detected when any set has `actualReps < targetReps`.**

# ---

## **6.5 getWorkoutHistory**

# **Returns completed workout sessions for the authenticated user.**

# **Used by the History screen and for simple workout review.**

### **Endpoint**

# **GET /api/v1/workout-history**

# 

### **Auth Requirements**

# **Requires authenticated user.**

# **Users can only retrieve their own workout history.**

### **Query Params**

# **type GetWorkoutHistoryQuery \= {**

#   **limit?: number;**

#   **cursor?: string;**

#   **startDate?: ISODateTime;**

#   **endDate?: ISODateTime;**

#   **status?: "completed" | "abandoned" | "in\_progress";**

# **};**

# 

### **Query Rules**

* # **Default `limit`: 20**

* # **Maximum `limit`: 100**

* # **Default status: `completed`**

* # **Results sorted by `startedAt DESC`**

### **Example Request**

# **GET /api/v1/workout-history?limit=20\&status=completed**

# 

### **Output**

# **type GetWorkoutHistoryResponse \= {**

#   **items: WorkoutHistoryItemDto\[\];**

#   **nextCursor: string | null;**

# **};**

# 

# **type WorkoutHistoryItemDto \= {**

#   **id: UUID;**

#   **workoutName: string;**

#   **programName: string;**

#   **status: WorkoutSessionStatus;**

#   **startedAt: ISODateTime | null;**

#   **completedAt: ISODateTime | null;**

#   **durationSeconds: number | null;**

#   **exerciseCount: number;**

#   **completedSetCount: number;**

#   **failedSetCount: number;**

#   **highlights: string\[\];**

# **};**

# 

### **Example Response**

# **{**

#   **"data": {**

#     **"items": \[**

#       **{**

#         **"id": "e3c74f2c-83a8-4e93-9bd0-a6c553f6a6df",**

#         **"workoutName": "Workout A",**

#         **"programName": "Beginner Full Body V1",**

#         **"status": "completed",**

#         **"startedAt": "2026-04-24T22:00:00Z",**

#         **"completedAt": "2026-04-24T22:52:00Z",**

#         **"durationSeconds": 3120,**

#         **"exerciseCount": 5,**

#         **"completedSetCount": 15,**

#         **"failedSetCount": 0,**

#         **"highlights": \[**

#           **"+5 lbs on Bench Press",**

#           **"Workout completed"**

#         **\]**

#       **}**

#     **\],**

#     **"nextCursor": null**

#   **},**

#   **"meta": {}**

# **}**

# 

### **Errors**

| Status | Code | Condition |
| ----- | ----- | ----- |
| **400** | **`VALIDATION_ERROR`** | **Invalid limit, cursor, date range, or status** |
| **401** | **`UNAUTHENTICATED`** | **Missing or invalid JWT** |
| **500** | **`INTERNAL_ERROR`** | **Unexpected query failure** |

### **Business Rules**

* # **History must use snapshot fields so old sessions remain accurate even if templates change.**

* # **This endpoint should not recalculate progression.**

* # **Highlights may be derived from stored progress metrics.**

# ---

## **6.6 getProgressMetrics**

# **Returns user-facing progress metrics for dashboard, progress, and workout summary screens.**

# **This endpoint is the trust layer: it explains progress in simple, encouraging terms.**

### **Endpoint**

# **GET /api/v1/progress-metrics**

# 

### **Auth Requirements**

# **Requires authenticated user.**

# **Users can only retrieve their own progress metrics.**

### **Query Params**

# **type GetProgressMetricsQuery \= {**

#   **limit?: number;**

#   **cursor?: string;**

#   **metricType?: string;**

#   **exerciseId?: UUID;**

#   **startDate?: ISODateTime;**

#   **endDate?: ISODateTime;**

# **};**

# 

### **Query Rules**

* # **Default `limit`: 20**

* # **Maximum `limit`: 100**

* # **Results sorted by `recordedAt DESC`**

* # **`exerciseId` is optional because some metrics are global/user-level.**

### **Recommended Metric Types**

# **type ProgressMetricType \=**

#   **| "weight\_increase"**

#   **| "personal\_best"**

#   **| "workout\_completed"**

#   **| "weekly\_workout\_count"**

#   **| "completion\_streak"**

#   **| "volume\_increase";**

# 

### **Output**

# **type GetProgressMetricsResponse \= {**

#   **items: ProgressMetricDto\[\];**

#   **nextCursor: string | null;**

# **};**

# 

### **Example Response**

# **{**

#   **"data": {**

#     **"items": \[**

#       **{**

#         **"id": "b94964c2-350b-4ec7-9400-2334342d107a",**

#         **"metricType": "weight\_increase",**

#         **"metricValue": 5,**

#         **"displayText": "+5 lbs from last session",**

#         **"recordedAt": "2026-04-24T22:52:00Z"**

#       **},**

#       **{**

#         **"id": "9e4ed1a8-c264-46b0-a7e3-c77fd872f138",**

#         **"metricType": "weekly\_workout\_count",**

#         **"metricValue": 3,**

#         **"displayText": "3 workouts completed this week",**

#         **"recordedAt": "2026-04-24T22:52:00Z"**

#       **}**

#     **\],**

#     **"nextCursor": null**

#   **},**

#   **"meta": {}**

# **}**

# 

### **Errors**

| Status | Code | Condition |
| ----- | ----- | ----- |
| **400** | **`VALIDATION_ERROR`** | **Invalid metric type, date range, cursor, or exercise ID** |
| **401** | **`UNAUTHENTICATED`** | **Missing or invalid JWT** |
| **404** | **`NOT_FOUND`** | **Exercise does not exist or is not visible** |
| **500** | **`INTERNAL_ERROR`** | **Unexpected query failure** |

### **Business Rules**

* # **Metrics should be append-only.**

* # **`displayText` should be short, user-facing, and encouraging.**

* # **Metrics should be created during workout completion or scheduled summary generation.**

* # **This endpoint should not perform expensive historical recalculations in the request path.**

# ---

# **7\. Recommended Client Usage Flow**

## **Start Workout**

1. # **Client calls `startWorkoutSession`.**

2. # **Backend returns full active workout payload.**

3. # **Client renders exercise entries and pre-created sets.**

## **Log Set**

1. # **User taps confirm for a set.**

2. # **Client applies optimistic UI update.**

3. # **Client calls `logSet`.**

4. # **Client reconciles with backend response.**

## **Complete Workout**

1. # **User completes required sets.**

2. # **Client collects exercise effort feedback.**

3. # **Client calls `completeWorkoutSession`.**

4. # **Backend updates progression and creates progress metrics.**

5. # **Client shows summary and progress feedback.**

## **View History / Progress**

1. # **Client calls `getWorkoutHistory` for historical sessions.**

2. # **Client calls `getProgressMetrics` for trust-building progress messages.**

# ---

# **8\. Backend Transaction Boundaries**

## **startWorkoutSession Transaction**

# **Should create:**

* # **`workout_sessions`**

* # **`exercise_entries`**

* # **`sets`**

# **Should read:**

* # **Active enrollment**

* # **Workout template**

* # **Template exercise entries**

* # **Exercise records**

* # **Progression states**

## **completeWorkoutSession Transaction**

# **Should update/create:**

* # **`workout_sessions`**

* # **`exercise_entries.effort_feedback`**

* # **`progression_states`**

* # **`progress_metrics`**

* # **`user_program_enrollments.current_workout_template_id`**

# **This operation should be atomic because it is responsible for progression trust.**

# ---

# **9\. Versioning**

# **All endpoints are under:**

# **/api/v1**

# 

# **Breaking changes should be introduced under a new version:**

# **/api/v2**

# 

# **Non-breaking changes may include:**

* # **Adding optional request fields**

* # **Adding response fields**

* # **Adding new metric types**

* # **Adding new enum values only if clients are resilient to unknown values**

# ---

# **10\. Implementation Notes**

## **Performance**

* # **`startWorkoutSession` should return all active workout data in one response.**

* # **`logSet` must be optimized for sub-2-second logging.**

* # **Client should use optimistic updates for set logging.**

* # **Avoid multiple round trips during the active workout flow.**

## **Security**

* # **Verify JWT on every route.**

* # **Enforce user ownership server-side.**

* # **Never trust user-provided `userId` for user-owned records.**

* # **Use server-resolved authenticated user ID.**

## **Data Integrity**

* # **Use database constraints for one active workout per user.**

* # **Use unique constraints for set number per exercise entry.**

* # **Snapshot workout data at session start.**

* # **Do not mutate completed workout history casually.**

# ---

# **11\. Summary**

# **This API contract supports the V1 fitness app by keeping the client simple and the backend authoritative.**

# **The backend owns:**

* # **Workout generation**

* # **Progression logic**

* # **Failure detection**

* # **Historical snapshotting**

* # **Progress metric creation**

* # **Auth and ownership enforcement**

# **The client owns:**

* # **Fast workout UI**

* # **Optimistic set logging**

* # **Simple feedback collection**

* # **Displaying history and progress**

# **The most important rule is:**

# **The user should never have to think during the workout.**

# **Fitness App API Contract**

## **1\. Purpose**

This document defines how the fitness app communicates with the backend for the V1 workout flow.

The API supports the core loop:

**Open app → Start workout → Log sets → Complete workout → View history/progress**

The contract is designed around these product goals:

* Fast workout loading  
* One-tap set logging  
* Deterministic progression logic  
* Minimal client-side decision-making  
* Strong historical accuracy  
* Secure user-specific data access

---

## **2\. API Style**

### **Protocol**

REST over HTTPS.

### **Base URL**

/api/v1

Example:

POST /api/v1/workout-templates  
POST /api/v1/workout-sessions/start  
POST /api/v1/sets/{setId}/log  
POST /api/v1/workout-sessions/{sessionId}/complete  
GET  /api/v1/workout-history  
GET  /api/v1/progress-metrics

### **Format**

Requests and responses use JSON.

Content-Type: application/json  
Accept: application/json

---

## **3\. Authentication**

All endpoints require authentication unless explicitly stated otherwise.

### **Auth Method**

The mobile app authenticates the user through the auth provider and sends a JWT to the backend.

Authorization: Bearer \<jwt\>

### **Backend Auth Requirements**

For every protected route, the backend must:

1. Verify the JWT.  
2. Resolve the authenticated app user.  
3. Enforce ownership of user-owned records.  
4. Reject access to records owned by another user.

### **Standard Auth Errors**

| Status | Code | Meaning |
| ----- | ----- | ----- |
| 401 | `UNAUTHENTICATED` | Missing, expired, or invalid token |
| 403 | `FORBIDDEN` | User is authenticated but does not own the requested resource |

---

## **4\. Standard Response Envelope**

### **Success Response**

{  
  "data": {},  
  "meta": {}  
}

### **Error Response**

{  
  "error": {  
    "code": "VALIDATION\_ERROR",  
    "message": "One or more fields are invalid.",  
    "details": \[  
      {  
        "field": "actualReps",  
        "message": "actualReps must be greater than or equal to 0."  
      }  
    \]  
  }  
}

### **Common Error Codes**

| Status | Code | Meaning |
| ----- | ----- | ----- |
| 400 | `VALIDATION_ERROR` | Request body or query params are invalid |
| 401 | `UNAUTHENTICATED` | User is not authenticated |
| 403 | `FORBIDDEN` | User cannot access this resource |
| 404 | `NOT_FOUND` | Resource does not exist or is not visible to the user |
| 409 | `CONFLICT` | Request conflicts with current state |
| 422 | `BUSINESS_RULE_VIOLATION` | Request is syntactically valid but violates workout rules |
| 500 | `INTERNAL_ERROR` | Unexpected backend error |

---

## **5\. Shared Types**

### **UUID**

String UUID.

type UUID \= string;

### **ISO DateTime**

ISO 8601 datetime string.

type ISODateTime \= string;

### **Effort Feedback**

type EffortFeedback \= "too\_easy" | "just\_right" | "too\_hard";

### **Workout Session Status**

type WorkoutSessionStatus \= "planned" | "in\_progress" | "completed" | "abandoned";

### **Set Status**

type SetStatus \= "pending" | "completed" | "skipped" | "failed";

### **Exercise Category**

type ExerciseCategory \= "compound" | "accessory";

### **Workout Session DTO**

type WorkoutSessionDto \= {  
  id: UUID;  
  status: WorkoutSessionStatus;  
  programId: UUID;  
  workoutTemplateId: UUID;  
  programName: string;  
  workoutName: string;  
  startedAt: ISODateTime | null;  
  completedAt: ISODateTime | null;  
  durationSeconds: number | null;  
  exercises: ExerciseEntryDto\[\];  
};

### **Exercise Entry DTO**

type ExerciseEntryDto \= {  
  id: UUID;  
  exerciseId: UUID;  
  exerciseName: string;  
  category: ExerciseCategory;  
  sequenceOrder: number;  
  targetSets: number;  
  targetReps: number;  
  targetWeightLbs: number;  
  effortFeedback: EffortFeedback | null;  
  completedAt: ISODateTime | null;  
  sets: SetDto\[\];  
};

### **Set DTO**

type SetDto \= {  
  id: UUID;  
  exerciseEntryId: UUID;  
  setNumber: number;  
  targetReps: number;  
  actualReps: number | null;  
  targetWeightLbs: number;  
  actualWeightLbs: number | null;  
  status: SetStatus;  
  completedAt: ISODateTime | null;  
};

---

# **6\. Operations**

---

## **6.1 createWorkoutTemplate**

Creates a workout template within a program.

This operation is primarily an admin/system operation for V1 because workouts are pre-generated and users do not create custom workouts in the MVP.

### **Endpoint**

POST /api/v1/workout-templates

### **Auth Requirements**

Requires authenticated user with admin/system role.

Regular users must not be able to create workout templates in V1.

### **Input**

type CreateWorkoutTemplateRequest \= {  
  programId: UUID;  
  name: string;  
  sequenceOrder: number;  
  estimatedDurationMinutes?: number;  
  exercises: CreateWorkoutTemplateExerciseInput\[\];  
};

type CreateWorkoutTemplateExerciseInput \= {  
  exerciseId: UUID;  
  sequenceOrder: number;  
  targetSets: number;  
  targetReps: number;  
  restSeconds?: number | null;  
};

### **Example Request**

{  
  "programId": "7e4a7f64-2c6e-4a89-a88c-034ae548c83a",  
  "name": "Workout A",  
  "sequenceOrder": 1,  
  "estimatedDurationMinutes": 60,  
  "exercises": \[  
    {  
      "exerciseId": "7c7ec60f-6f1e-4fa5-8a75-17b690d3a401",  
      "sequenceOrder": 1,  
      "targetSets": 3,  
      "targetReps": 8,  
      "restSeconds": 120  
    }  
  \]  
}

### **Output**

type CreateWorkoutTemplateResponse \= {  
  id: UUID;  
  programId: UUID;  
  name: string;  
  sequenceOrder: number;  
  estimatedDurationMinutes: number | null;  
  isActive: boolean;  
  exercises: WorkoutTemplateExerciseDto\[\];  
  createdAt: ISODateTime;  
  updatedAt: ISODateTime;  
};

type WorkoutTemplateExerciseDto \= {  
  id: UUID;  
  workoutTemplateId: UUID;  
  exerciseId: UUID;  
  exerciseName: string;  
  sequenceOrder: number;  
  targetSets: number;  
  targetReps: number;  
  restSeconds: number | null;  
};

### **Example Response**

{  
  "data": {  
    "id": "f2995e2d-d6db-44e0-aad6-cf9f629eb325",  
    "programId": "7e4a7f64-2c6e-4a89-a88c-034ae548c83a",  
    "name": "Workout A",  
    "sequenceOrder": 1,  
    "estimatedDurationMinutes": 60,  
    "isActive": true,  
    "exercises": \[  
      {  
        "id": "233378c1-e015-4f81-8872-abc722e87ea8",  
        "workoutTemplateId": "f2995e2d-d6db-44e0-aad6-cf9f629eb325",  
        "exerciseId": "7c7ec60f-6f1e-4fa5-8a75-17b690d3a401",  
        "exerciseName": "Squat",  
        "sequenceOrder": 1,  
        "targetSets": 3,  
        "targetReps": 8,  
        "restSeconds": 120  
      }  
    \],  
    "createdAt": "2026-04-24T14:30:00Z",  
    "updatedAt": "2026-04-24T14:30:00Z"  
  },  
  "meta": {}  
}

### **Errors**

| Status | Code | Condition |
| ----- | ----- | ----- |
| 400 | `VALIDATION_ERROR` | Missing required field, invalid UUID, invalid sequence order |
| 401 | `UNAUTHENTICATED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | User is not allowed to create templates |
| 404 | `NOT_FOUND` | Program or exercise does not exist |
| 409 | `CONFLICT` | `sequenceOrder` already exists for the program |
| 422 | `BUSINESS_RULE_VIOLATION` | Template has no exercises, or V1 set/rep rules are violated |

### **Business Rules**

* `sequenceOrder` must be unique within a program.  
* Each exercise `sequenceOrder` must be unique within the template.  
* V1 default is 3 sets × 8 reps.  
* Templates should be deactivated rather than deleted once used by historical sessions.

---

## **6.2 startWorkoutSession**

Starts the next workout for the authenticated user.

This operation creates a workout session from the user’s current workout template, snapshots template data, generates exercise entries, pre-creates sets, and applies current progression state to determine target weights.

### **Endpoint**

POST /api/v1/workout-sessions/start

### **Auth Requirements**

Requires authenticated user.

Users may only start sessions for themselves.

### **Input**

type StartWorkoutSessionRequest \= {  
  workoutTemplateId?: UUID;  
  startedAt?: ISODateTime;  
};

### **Input Rules**

* If `workoutTemplateId` is omitted, backend starts the next template from the user’s active program enrollment.  
* `startedAt` is optional. If omitted, backend uses server time.  
* In V1, users should usually not choose templates manually; this field exists for backend/admin flexibility and future use.

### **Example Request**

{}

### **Output**

type StartWorkoutSessionResponse \= WorkoutSessionDto;

### **Example Response**

{  
  "data": {  
    "id": "e3c74f2c-83a8-4e93-9bd0-a6c553f6a6df",  
    "status": "in\_progress",  
    "programId": "7e4a7f64-2c6e-4a89-a88c-034ae548c83a",  
    "workoutTemplateId": "f2995e2d-d6db-44e0-aad6-cf9f629eb325",  
    "programName": "Beginner Full Body V1",  
    "workoutName": "Workout A",  
    "startedAt": "2026-04-24T22:00:00Z",  
    "completedAt": null,  
    "durationSeconds": null,  
    "exercises": \[  
      {  
        "id": "af57e8d4-3670-4cf6-a446-7782ab7cbe91",  
        "exerciseId": "7c7ec60f-6f1e-4fa5-8a75-17b690d3a401",  
        "exerciseName": "Bench Press",  
        "category": "compound",  
        "sequenceOrder": 1,  
        "targetSets": 3,  
        "targetReps": 8,  
        "targetWeightLbs": 135,  
        "effortFeedback": null,  
        "completedAt": null,  
        "sets": \[  
          {  
            "id": "eb4e1247-6778-4589-a116-895c7360aa74",  
            "exerciseEntryId": "af57e8d4-3670-4cf6-a446-7782ab7cbe91",  
            "setNumber": 1,  
            "targetReps": 8,  
            "actualReps": null,  
            "targetWeightLbs": 135,  
            "actualWeightLbs": null,  
            "status": "pending",  
            "completedAt": null  
          }  
        \]  
      }  
    \]  
  },  
  "meta": {}  
}

### **Errors**

| Status | Code | Condition |
| ----- | ----- | ----- |
| 400 | `VALIDATION_ERROR` | Invalid template ID or invalid datetime |
| 401 | `UNAUTHENTICATED` | Missing or invalid JWT |
| 404 | `NOT_FOUND` | User has no active enrollment or template does not exist |
| 409 | `WORKOUT_ALREADY_IN_PROGRESS` | User already has an in-progress workout |
| 422 | `BUSINESS_RULE_VIOLATION` | Template has no active exercises or progression state cannot be resolved |

### **Business Rules**

* A user may only have one `in_progress` workout session at a time.  
* Sets should be pre-created when the session starts.  
* Session data must snapshot template and exercise details.  
* Target weights must come from `progression_states`, not from recalculating full workout history.  
* The response should include all data needed to render the active workout screen immediately.

---

## **6.3 logSet**

Logs the result of a single set.

This operation must be fast and safe for optimistic UI. The client may update immediately, then reconcile with the backend response.

### **Endpoint**

POST /api/v1/sets/{setId}/log

### **Auth Requirements**

Requires authenticated user.

User must own the workout session associated with the set.

### **Path Params**

type LogSetPathParams \= {  
  setId: UUID;  
};

### **Input**

type LogSetRequest \= {  
  actualReps: number;  
  actualWeightLbs?: number;  
  completedAt?: ISODateTime;  
};

### **Input Rules**

* `actualReps` must be greater than or equal to 0\.  
* `actualWeightLbs` defaults to the set’s target weight if omitted.  
* `completedAt` defaults to server time if omitted.  
* Backend determines `status`:  
  * `completed` if `actualReps >= targetReps`  
  * `failed` if `actualReps < targetReps`

### **Example Request**

{  
  "actualReps": 8,  
  "actualWeightLbs": 135  
}

### **Output**

type LogSetResponse \= {  
  set: SetDto;  
  exerciseEntry: {  
    id: UUID;  
    completedSetCount: number;  
    totalSetCount: number;  
    hasFailures: boolean;  
    isComplete: boolean;  
  };  
  workoutSession: {  
    id: UUID;  
    status: WorkoutSessionStatus;  
  };  
};

### **Example Response**

{  
  "data": {  
    "set": {  
      "id": "eb4e1247-6778-4589-a116-895c7360aa74",  
      "exerciseEntryId": "af57e8d4-3670-4cf6-a446-7782ab7cbe91",  
      "setNumber": 1,  
      "targetReps": 8,  
      "actualReps": 8,  
      "targetWeightLbs": 135,  
      "actualWeightLbs": 135,  
      "status": "completed",  
      "completedAt": "2026-04-24T22:05:12Z"  
    },  
    "exerciseEntry": {  
      "id": "af57e8d4-3670-4cf6-a446-7782ab7cbe91",  
      "completedSetCount": 1,  
      "totalSetCount": 3,  
      "hasFailures": false,  
      "isComplete": false  
    },  
    "workoutSession": {  
      "id": "e3c74f2c-83a8-4e93-9bd0-a6c553f6a6df",  
      "status": "in\_progress"  
    }  
  },  
  "meta": {}  
}

### **Errors**

| Status | Code | Condition |
| ----- | ----- | ----- |
| 400 | `VALIDATION_ERROR` | Invalid reps, invalid weight, malformed set ID |
| 401 | `UNAUTHENTICATED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Set belongs to another user |
| 404 | `NOT_FOUND` | Set does not exist |
| 409 | `SET_ALREADY_LOGGED` | Set has already been completed or failed |
| 409 | `SESSION_NOT_IN_PROGRESS` | Parent workout session is not in progress |
| 422 | `BUSINESS_RULE_VIOLATION` | Set does not belong to an active workout flow |

### **Business Rules**

* Logging must be idempotency-safe from the client perspective.  
* Backend should reject duplicate logs unless the product explicitly supports editing sets.  
* In V1, editing previously logged sets should be avoided unless necessary.  
* A set is failed when `actualReps < targetReps`.  
* Logging a set should not update progression state immediately; progression should be finalized when the workout is completed.

### **Recommended Future Addition**

Add an idempotency key for mobile retry safety:

Idempotency-Key: \<uuid\>

---

## **6.4 completeWorkoutSession**

Completes an in-progress workout session.

This operation finalizes the workout, records exercise effort feedback, updates progression state, creates progress metrics, calculates duration, and advances the user’s program enrollment to the next workout template.

### **Endpoint**

POST /api/v1/workout-sessions/{sessionId}/complete

### **Auth Requirements**

Requires authenticated user.

User must own the workout session.

### **Path Params**

type CompleteWorkoutSessionPathParams \= {  
  sessionId: UUID;  
};

### **Input**

type CompleteWorkoutSessionRequest \= {  
  completedAt?: ISODateTime;  
  exerciseFeedback: ExerciseFeedbackInput\[\];  
  userEffortFeedback?: EffortFeedback;  
};

type ExerciseFeedbackInput \= {  
  exerciseEntryId: UUID;  
  effortFeedback: EffortFeedback;  
};

### **Example Request**

{  
  "exerciseFeedback": \[  
    {  
      "exerciseEntryId": "af57e8d4-3670-4cf6-a446-7782ab7cbe91",  
      "effortFeedback": "just\_right"  
    }  
  \],  
  "userEffortFeedback": "just\_right"  
}

### **Output**

type CompleteWorkoutSessionResponse \= {  
  workoutSession: WorkoutSessionDto;  
  progressionUpdates: ProgressionUpdateDto\[\];  
  progressMetrics: ProgressMetricDto\[\];  
  nextWorkoutTemplate: {  
    id: UUID;  
    name: string;  
    sequenceOrder: number;  
  } | null;  
};

type ProgressionUpdateDto \= {  
  exerciseId: UUID;  
  exerciseName: string;  
  previousWeightLbs: number;  
  nextWeightLbs: number;  
  result: "increased" | "repeated" | "reduced";  
  reason: string;  
};

type ProgressMetricDto \= {  
  id: UUID;  
  metricType: string;  
  metricValue: number | null;  
  displayText: string;  
  recordedAt: ISODateTime;  
};

### **Example Response**

{  
  "data": {  
    "workoutSession": {  
      "id": "e3c74f2c-83a8-4e93-9bd0-a6c553f6a6df",  
      "status": "completed",  
      "programId": "7e4a7f64-2c6e-4a89-a88c-034ae548c83a",  
      "workoutTemplateId": "f2995e2d-d6db-44e0-aad6-cf9f629eb325",  
      "programName": "Beginner Full Body V1",  
      "workoutName": "Workout A",  
      "startedAt": "2026-04-24T22:00:00Z",  
      "completedAt": "2026-04-24T22:52:00Z",  
      "durationSeconds": 3120,  
      "exercises": \[\]  
    },  
    "progressionUpdates": \[  
      {  
        "exerciseId": "7c7ec60f-6f1e-4fa5-8a75-17b690d3a401",  
        "exerciseName": "Bench Press",  
        "previousWeightLbs": 135,  
        "nextWeightLbs": 140,  
        "result": "increased",  
        "reason": "Completed all sets with just\_right feedback."  
      }  
    \],  
    "progressMetrics": \[  
      {  
        "id": "b94964c2-350b-4ec7-9400-2334342d107a",  
        "metricType": "weight\_increase",  
        "metricValue": 5,  
        "displayText": "+5 lbs from last session",  
        "recordedAt": "2026-04-24T22:52:00Z"  
      },  
      {  
        "id": "03e246a5-49d6-46cb-b38b-063c3c48cf6d",  
        "metricType": "workout\_completed",  
        "metricValue": 1,  
        "displayText": "Workout completed",  
        "recordedAt": "2026-04-24T22:52:00Z"  
      }  
    \],  
    "nextWorkoutTemplate": {  
      "id": "55e752af-3a90-4ac4-a9fa-6558f20e67f1",  
      "name": "Workout B",  
      "sequenceOrder": 2  
    }  
  },  
  "meta": {}  
}

### **Errors**

| Status | Code | Condition |
| ----- | ----- | ----- |
| 400 | `VALIDATION_ERROR` | Invalid session ID, invalid feedback value, malformed request |
| 401 | `UNAUTHENTICATED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Session belongs to another user |
| 404 | `NOT_FOUND` | Workout session does not exist |
| 409 | `SESSION_ALREADY_COMPLETED` | Workout has already been completed |
| 409 | `SESSION_NOT_IN_PROGRESS` | Session is not currently in progress |
| 422 | `INCOMPLETE_WORKOUT` | Required sets are still pending |
| 422 | `MISSING_EFFORT_FEEDBACK` | Required effort feedback is missing |
| 500 | `PROGRESSION_UPDATE_FAILED` | Progression transaction failed unexpectedly |

### **Business Rules**

* Completion must run in a database transaction.  
* Required sets must be completed or failed before the session can be completed.  
* Exercise feedback should be captured after the final set of each exercise.  
* Progression state updates only when the session completes.  
* Progress metrics should be append-only.  
* The user’s active enrollment should advance to the next workout template.

### **Progression Rules**

For compound lifts:

| Condition | Result |
| ----- | ----- |
| Completed normally | \+5 lbs |
| Marked `too_easy` | \+10 lbs |
| Marked `too_hard` | Repeat weight |
| First failure | Repeat weight |
| Second consecutive failure | Reduce by 5–10% |

For accessory lifts:

| Condition | Result |
| ----- | ----- |
| Completed normally | \+2.5 lbs |
| Marked `too_easy` | \+5 lbs |
| Marked `too_hard` | Repeat weight |
| First failure | Repeat weight |
| Second consecutive failure | Reduce by 5–10% |

Failure is detected when any set has `actualReps < targetReps`.

---

## **6.5 getWorkoutHistory**

Returns completed workout sessions for the authenticated user.

Used by the History screen and for simple workout review.

### **Endpoint**

GET /api/v1/workout-history

### **Auth Requirements**

Requires authenticated user.

Users can only retrieve their own workout history.

### **Query Params**

type GetWorkoutHistoryQuery \= {  
  limit?: number;  
  cursor?: string;  
  startDate?: ISODateTime;  
  endDate?: ISODateTime;  
  status?: "completed" | "abandoned" | "in\_progress";  
};

### **Query Rules**

* Default `limit`: 20  
* Maximum `limit`: 100  
* Default status: `completed`  
* Results sorted by `startedAt DESC`

### **Example Request**

GET /api/v1/workout-history?limit=20\&status=completed

### **Output**

type GetWorkoutHistoryResponse \= {  
  items: WorkoutHistoryItemDto\[\];  
  nextCursor: string | null;  
};

type WorkoutHistoryItemDto \= {  
  id: UUID;  
  workoutName: string;  
  programName: string;  
  status: WorkoutSessionStatus;  
  startedAt: ISODateTime | null;  
  completedAt: ISODateTime | null;  
  durationSeconds: number | null;  
  exerciseCount: number;  
  completedSetCount: number;  
  failedSetCount: number;  
  highlights: string\[\];  
};

### **Example Response**

{  
  "data": {  
    "items": \[  
      {  
        "id": "e3c74f2c-83a8-4e93-9bd0-a6c553f6a6df",  
        "workoutName": "Workout A",  
        "programName": "Beginner Full Body V1",  
        "status": "completed",  
        "startedAt": "2026-04-24T22:00:00Z",  
        "completedAt": "2026-04-24T22:52:00Z",  
        "durationSeconds": 3120,  
        "exerciseCount": 5,  
        "completedSetCount": 15,  
        "failedSetCount": 0,  
        "highlights": \[  
          "+5 lbs on Bench Press",  
          "Workout completed"  
        \]  
      }  
    \],  
    "nextCursor": null  
  },  
  "meta": {}  
}

### **Errors**

| Status | Code | Condition |
| ----- | ----- | ----- |
| 400 | `VALIDATION_ERROR` | Invalid limit, cursor, date range, or status |
| 401 | `UNAUTHENTICATED` | Missing or invalid JWT |
| 500 | `INTERNAL_ERROR` | Unexpected query failure |

### **Business Rules**

* History must use snapshot fields so old sessions remain accurate even if templates change.  
* This endpoint should not recalculate progression.  
* Highlights may be derived from stored progress metrics.

---

## **6.6 getProgressMetrics**

Returns user-facing progress metrics for dashboard, progress, and workout summary screens.

This endpoint is the trust layer: it explains progress in simple, encouraging terms.

### **Endpoint**

GET /api/v1/progress-metrics

### **Auth Requirements**

Requires authenticated user.

Users can only retrieve their own progress metrics.

### **Query Params**

type GetProgressMetricsQuery \= {  
  limit?: number;  
  cursor?: string;  
  metricType?: string;  
  exerciseId?: UUID;  
  startDate?: ISODateTime;  
  endDate?: ISODateTime;  
};

### **Query Rules**

* Default `limit`: 20  
* Maximum `limit`: 100  
* Results sorted by `recordedAt DESC`  
* `exerciseId` is optional because some metrics are global/user-level.

### **Recommended Metric Types**

type ProgressMetricType \=  
  | "weight\_increase"  
  | "personal\_best"  
  | "workout\_completed"  
  | "weekly\_workout\_count"  
  | "completion\_streak"  
  | "volume\_increase";

### **Output**

type GetProgressMetricsResponse \= {  
  items: ProgressMetricDto\[\];  
  nextCursor: string | null;  
};

### **Example Response**

{  
  "data": {  
    "items": \[  
      {  
        "id": "b94964c2-350b-4ec7-9400-2334342d107a",  
        "metricType": "weight\_increase",  
        "metricValue": 5,  
        "displayText": "+5 lbs from last session",  
        "recordedAt": "2026-04-24T22:52:00Z"  
      },  
      {  
        "id": "9e4ed1a8-c264-46b0-a7e3-c77fd872f138",  
        "metricType": "weekly\_workout\_count",  
        "metricValue": 3,  
        "displayText": "3 workouts completed this week",  
        "recordedAt": "2026-04-24T22:52:00Z"  
      }  
    \],  
    "nextCursor": null  
  },  
  "meta": {}  
}

### **Errors**

| Status | Code | Condition |
| ----- | ----- | ----- |
| 400 | `VALIDATION_ERROR` | Invalid metric type, date range, cursor, or exercise ID |
| 401 | `UNAUTHENTICATED` | Missing or invalid JWT |
| 404 | `NOT_FOUND` | Exercise does not exist or is not visible |
| 500 | `INTERNAL_ERROR` | Unexpected query failure |

### **Business Rules**

* Metrics should be append-only.  
* `displayText` should be short, user-facing, and encouraging.  
* Metrics should be created during workout completion or scheduled summary generation.  
* This endpoint should not perform expensive historical recalculations in the request path.

---

# **7\. Recommended Client Usage Flow**

## **Start Workout**

1. Client calls `startWorkoutSession`.  
2. Backend returns full active workout payload.  
3. Client renders exercise entries and pre-created sets.

## **Log Set**

1. User taps confirm for a set.  
2. Client applies optimistic UI update.  
3. Client calls `logSet`.  
4. Client reconciles with backend response.

## **Complete Workout**

1. User completes required sets.  
2. Client collects exercise effort feedback.  
3. Client calls `completeWorkoutSession`.  
4. Backend updates progression and creates progress metrics.  
5. Client shows summary and progress feedback.

## **View History / Progress**

1. Client calls `getWorkoutHistory` for historical sessions.  
2. Client calls `getProgressMetrics` for trust-building progress messages.

---

# **8\. Backend Transaction Boundaries**

## **startWorkoutSession Transaction**

Should create:

* `workout_sessions`  
* `exercise_entries`  
* `sets`

Should read:

* Active enrollment  
* Workout template  
* Template exercise entries  
* Exercise records  
* Progression states

## **completeWorkoutSession Transaction**

Should update/create:

* `workout_sessions`  
* `exercise_entries.effort_feedback`  
* `progression_states`  
* `progress_metrics`  
* `user_program_enrollments.current_workout_template_id`

This operation should be atomic because it is responsible for progression trust.

---

# **9\. Versioning**

All endpoints are under:

/api/v1

Breaking changes should be introduced under a new version:

/api/v2

Non-breaking changes may include:

* Adding optional request fields  
* Adding response fields  
* Adding new metric types  
* Adding new enum values only if clients are resilient to unknown values

---

# **10\. Implementation Notes**

## **Performance**

* `startWorkoutSession` should return all active workout data in one response.  
* `logSet` must be optimized for sub-2-second logging.  
* Client should use optimistic updates for set logging.  
* Avoid multiple round trips during the active workout flow.

## **Security**

* Verify JWT on every route.  
* Enforce user ownership server-side.  
* Never trust user-provided `userId` for user-owned records.  
* Use server-resolved authenticated user ID.

## **Data Integrity**

* Use database constraints for one active workout per user.  
* Use unique constraints for set number per exercise entry.  
* Snapshot workout data at session start.  
* Do not mutate completed workout history casually.

---

# **11\. Summary**

This API contract supports the V1 fitness app by keeping the client simple and the backend authoritative.

The backend owns:

* Workout generation  
* Progression logic  
* Failure detection  
* Historical snapshotting  
* Progress metric creation  
* Auth and ownership enforcement

The client owns:

* Fast workout UI  
* Optimistic set logging  
* Simple feedback collection  
* Displaying history and progress

The most important rule is:

**The user should never have to think during the workout.**

