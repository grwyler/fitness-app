import { idempotencyRecords } from "@fitness/db";
import { randomUUID } from "node:crypto";
import type { IdempotencyRepository } from "../../repositories/interfaces/idempotency.repository.js";
import type { RepositoryOptions } from "../../repositories/models/persistence-context.js";
import type {
  CompleteIdempotencyRecordInput,
  CreatePendingIdempotencyRecordInput,
  IdempotencyRecord,
  IdempotencyScope
} from "../../repositories/models/idempotency.persistence.js";
import { IdempotencyScopeConflictError } from "../../repositories/models/idempotency.persistence.js";
import { and, eq, resolveExecutor } from "../db/drizzle-helpers.js";

function toStoredTargetResourceId(targetResourceId: string | null) {
  return targetResourceId ?? "";
}

function mapIdempotencyRecord(row: typeof idempotencyRecords.$inferSelect): IdempotencyRecord {
  return {
    id: row.id,
    userId: row.userId,
    key: row.key,
    routeFamily: row.routeFamily as IdempotencyRecord["routeFamily"],
    targetResourceId: row.targetResourceId === "" ? null : row.targetResourceId,
    requestFingerprint: row.requestFingerprint,
    status: row.status,
    responseStatusCode: row.responseStatusCode,
    responseBody: row.responseBody,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt
  };
}

export class DrizzleIdempotencyRepository implements IdempotencyRepository {
  public constructor(private readonly db: any) {}

  public async findByScope(
    scope: IdempotencyScope,
    options?: RepositoryOptions
  ): Promise<IdempotencyRecord | null> {
    const executor = resolveExecutor(this.db, options);
    const row = await executor.query.idempotencyRecords.findFirst({
      where: and(
        eq(idempotencyRecords.userId, scope.userId),
        eq(idempotencyRecords.key, scope.key),
        eq(idempotencyRecords.routeFamily, scope.routeFamily),
        eq(idempotencyRecords.targetResourceId, toStoredTargetResourceId(scope.targetResourceId))
      )
    });

    return row ? mapIdempotencyRecord(row) : null;
  }

  public async createPending(
    input: CreatePendingIdempotencyRecordInput,
    options?: RepositoryOptions
  ): Promise<IdempotencyRecord> {
    const executor = resolveExecutor(this.db, options);
    const rows = await executor
      .insert(idempotencyRecords)
      .values({
        id: randomUUID(),
        userId: input.scope.userId,
        key: input.scope.key,
        routeFamily: input.scope.routeFamily,
        targetResourceId: toStoredTargetResourceId(input.scope.targetResourceId),
        requestFingerprint: input.requestFingerprint,
        status: "pending"
      })
      .onConflictDoNothing()
      .returning();

    const row = rows[0];
    if (!row) {
      throw new IdempotencyScopeConflictError(input.scope);
    }

    return mapIdempotencyRecord(row);
  }

  public async markCompleted(
    input: CompleteIdempotencyRecordInput,
    options?: RepositoryOptions
  ): Promise<IdempotencyRecord> {
    const executor = resolveExecutor(this.db, options);
    const [row] = await executor
      .update(idempotencyRecords)
      .set({
        status: "completed",
        responseStatusCode: input.responseStatusCode,
        responseBody: input.responseBody,
        completedAt: input.completedAt,
        updatedAt: input.completedAt
      })
      .where(eq(idempotencyRecords.id, input.idempotencyRecordId))
      .returning();

    if (!row) {
      throw new Error(`Idempotency record ${input.idempotencyRecordId} was not found for completion.`);
    }

    return mapIdempotencyRecord(row);
  }
}
