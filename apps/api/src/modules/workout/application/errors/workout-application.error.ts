export const workoutApplicationErrorCodes = [
  "ACTIVE_WORKOUT_ALREADY_EXISTS",
  "ACTIVE_ENROLLMENT_NOT_FOUND",
  "ACTIVE_ENROLLMENT_ALREADY_EXISTS",
  "PROGRAM_NOT_FOUND",
  "WORKOUT_TEMPLATE_NOT_FOUND",
  "EXERCISE_NOT_FOUND",
  "EXERCISE_ENTRY_NOT_FOUND",
  "PROGRESSION_SEED_NOT_FOUND",
  "PROGRESSION_STATE_NOT_FOUND",
  "SESSION_NOT_FOUND",
  "SET_NOT_FOUND",
  "SET_NOT_LOGGED",
  "SET_NOT_EDITABLE",
  "VALIDATION_ERROR",
  "INVALID_SESSION_STATUS",
  "BUSINESS_RULE_VIOLATION",
  "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD",
  "IDEMPOTENCY_REQUEST_IN_PROGRESS"
] as const;

export type WorkoutApplicationErrorCode = (typeof workoutApplicationErrorCodes)[number];

export class WorkoutApplicationError extends Error {
  public readonly code: WorkoutApplicationErrorCode;

  public constructor(code: WorkoutApplicationErrorCode, message: string) {
    super(message);
    this.name = "WorkoutApplicationError";
    this.code = code;
  }
}
