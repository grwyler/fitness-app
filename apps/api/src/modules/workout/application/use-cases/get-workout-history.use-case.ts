import type { GetWorkoutHistoryResponse } from "@fitness/shared";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";
import { mapWorkoutHistoryItemDto } from "../mappers/workout-dto.mapper.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

export class GetWorkoutHistoryUseCase {
  public constructor(private readonly workoutSessionRepository: WorkoutSessionRepository) {}

  public async execute(input: {
    context: RequestContext;
    limit?: number;
  }): Promise<UseCaseResult<GetWorkoutHistoryResponse>> {
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
    const history = await this.workoutSessionRepository.listRecentCompletedByUserId(
      input.context.userId,
      limit
    );

    return {
      data: {
        items: history.map((historyItem) =>
          mapWorkoutHistoryItemDto({
            history: historyItem,
            progressMetrics: []
          })
        ),
        nextCursor: null
      },
      meta: {
        replayed: false
      }
    };
  }
}
