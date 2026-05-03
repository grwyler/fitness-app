export type IdempotencyRouteFamily =
  | "start_workout_session"
  | "create_custom_program"
  | "add_custom_workout_exercise"
  | "add_workout_set"
  | "delete_workout_set"
  | "log_set"
  | "update_logged_set"
  | "cancel_workout_session"
  | "complete_workout_session";

export type IdempotencyStatus = "pending" | "completed";

export type IdempotencyScope = {
  userId: string;
  key: string;
  routeFamily: IdempotencyRouteFamily;
  targetResourceId: string | null;
};

export type IdempotencyRecord = {
  id: string;
  userId: string;
  key: string;
  routeFamily: IdempotencyRouteFamily;
  targetResourceId: string | null;
  requestFingerprint: string;
  status: IdempotencyStatus;
  responseStatusCode: number | null;
  responseBody: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

export type CreatePendingIdempotencyRecordInput = {
  scope: IdempotencyScope;
  requestFingerprint: string;
};

export type CompleteIdempotencyRecordInput = {
  idempotencyRecordId: string;
  responseStatusCode: number;
  responseBody: string;
  completedAt: Date;
};

export class IdempotencyScopeConflictError extends Error {
  public readonly scope: IdempotencyScope;

  public constructor(scope: IdempotencyScope) {
    super("An idempotency record already exists for this scope.");
    this.name = "IdempotencyScopeConflictError";
    this.scope = scope;
  }
}
