import type { IdempotencyRepository } from "../../repositories/interfaces/idempotency.repository.js";
import type {
  IdempotencyRouteFamily,
  IdempotencyScope
} from "../../repositories/models/idempotency.persistence.js";
import { IdempotencyScopeConflictError } from "../../repositories/models/idempotency.persistence.js";
import type { RepositoryTransaction } from "../../repositories/models/persistence-context.js";
import { WorkoutApplicationError } from "../errors/workout-application.error.js";
import type { TransactionManager } from "./transaction-manager.js";

export type IdempotentMutationRequest<TResponse> = {
  key: string;
  userId: string;
  routeFamily: IdempotencyRouteFamily;
  targetResourceId: string | null;
  requestFingerprint: string;
  transactionManager: TransactionManager;
  execute: (tx: RepositoryTransaction) => Promise<TResponse>;
};

export type IdempotentMutationResult<TResponse> = {
  response: TResponse;
  replayed: boolean;
};

export class IdempotencyService {
  public constructor(private readonly idempotencyRepository: IdempotencyRepository) {}

  private replayOrRejectExistingRecord<TResponse>(
    existingRecord: {
      requestFingerprint: string;
      status: "pending" | "completed";
      responseBody: string | null;
    },
    requestFingerprint: string
  ): IdempotentMutationResult<TResponse> {
    if (existingRecord.requestFingerprint !== requestFingerprint) {
      throw new WorkoutApplicationError(
        "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD",
        "The same idempotency key cannot be reused with a different payload."
      );
    }

    if (existingRecord.status === "pending") {
      throw new WorkoutApplicationError(
        "IDEMPOTENCY_REQUEST_IN_PROGRESS",
        "An identical request with this idempotency key is already in progress."
      );
    }

    if (!existingRecord.responseBody) {
      throw new Error("Completed idempotency record is missing the stored response body.");
    }

    return {
      response: JSON.parse(existingRecord.responseBody) as TResponse,
      replayed: true
    };
  }

  public async execute<TResponse>(
    request: IdempotentMutationRequest<TResponse>
  ): Promise<IdempotentMutationResult<TResponse>> {
    const scope: IdempotencyScope = {
      userId: request.userId,
      key: request.key,
      routeFamily: request.routeFamily,
      targetResourceId: request.targetResourceId
    };

    return request.transactionManager.runInTransaction(async (tx) => {
      let pendingRecord: { id: string };
      try {
        pendingRecord = await this.idempotencyRepository.createPending(
          {
            scope,
            requestFingerprint: request.requestFingerprint
          },
          { tx }
        );
      } catch (error) {
        if (error instanceof IdempotencyScopeConflictError) {
          const existingRecord = await this.idempotencyRepository.findByScope(scope, { tx });
          if (!existingRecord) {
            throw new WorkoutApplicationError(
              "IDEMPOTENCY_REQUEST_IN_PROGRESS",
              "An identical request with this idempotency key is already in progress."
            );
          }

          return this.replayOrRejectExistingRecord<TResponse>(
            {
              requestFingerprint: existingRecord.requestFingerprint,
              status: existingRecord.status,
              responseBody: existingRecord.responseBody
            },
            request.requestFingerprint
          );
        }

        throw error;
      }

      const response = await request.execute(tx);

      await this.idempotencyRepository.markCompleted(
        {
          idempotencyRecordId: pendingRecord.id,
          responseStatusCode: 200,
          responseBody: JSON.stringify(response),
          completedAt: new Date()
        },
        { tx }
      );

      return {
        response,
        replayed: false
      };
    });
  }
}
