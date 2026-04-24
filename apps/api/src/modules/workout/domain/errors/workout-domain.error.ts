export const workoutDomainErrorCodes = [
  "INVALID_SESSION_STATUS",
  "SET_ALREADY_LOGGED",
  "INCOMPLETE_WORKOUT",
  "MISSING_EFFORT_FEEDBACK",
  "UNKNOWN_EXERCISE_ENTRY"
] as const;

export type WorkoutDomainErrorCode = (typeof workoutDomainErrorCodes)[number];

export class WorkoutDomainError extends Error {
  public readonly code: WorkoutDomainErrorCode;

  public constructor(code: WorkoutDomainErrorCode, message: string) {
    super(message);
    this.name = "WorkoutDomainError";
    this.code = code;
  }
}

