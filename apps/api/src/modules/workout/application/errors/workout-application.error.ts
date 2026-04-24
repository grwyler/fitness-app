export const workoutApplicationErrorCodes = [
  "ACTIVE_WORKOUT_ALREADY_EXISTS",
  "ACTIVE_ENROLLMENT_NOT_FOUND",
  "WORKOUT_TEMPLATE_NOT_FOUND",
  "PROGRESSION_SEED_NOT_FOUND",
  "PROGRESSION_STATE_NOT_FOUND",
  "SESSION_NOT_FOUND",
  "SET_NOT_FOUND",
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

