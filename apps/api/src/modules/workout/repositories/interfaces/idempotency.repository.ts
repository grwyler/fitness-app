import type { RepositoryOptions } from "../models/persistence-context.js";
import type {
  CompleteIdempotencyRecordInput,
  CreatePendingIdempotencyRecordInput,
  IdempotencyRecord,
  IdempotencyScope
} from "../models/idempotency.persistence.js";

export interface IdempotencyRepository {
  findByScope(
    scope: IdempotencyScope,
    options?: RepositoryOptions
  ): Promise<IdempotencyRecord | null>;

  createPending(
    input: CreatePendingIdempotencyRecordInput,
    options?: RepositoryOptions
  ): Promise<IdempotencyRecord>;

  markCompleted(
    input: CompleteIdempotencyRecordInput,
    options?: RepositoryOptions
  ): Promise<IdempotencyRecord>;
}
