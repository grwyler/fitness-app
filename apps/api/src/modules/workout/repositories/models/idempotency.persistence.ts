export type IdempotencyRouteFamily =
  | "start_workout_session"
  | "log_set"
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
