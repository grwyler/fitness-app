import type { GetWorkoutHistoryResponse } from "@fitness/shared";
import type { ProgressMetricRepository } from "../../repositories/interfaces/progress-metric.repository.js";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";
import { mapWorkoutHistoryItemDto } from "../mappers/workout-dto.mapper.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

export class GetWorkoutHistoryUseCase {
  public constructor(
    private readonly workoutSessionRepository: WorkoutSessionRepository,
    private readonly progressMetricRepository: ProgressMetricRepository
  ) {}

  public async execute(input: {
    context: RequestContext;
    limit?: number;
  }): Promise<UseCaseResult<GetWorkoutHistoryResponse>> {
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
    const [history, recentProgressMetrics] = await Promise.all([
      this.workoutSessionRepository.listRecentCompletedByUserId(input.context.userId, limit),
      this.progressMetricRepository.listRecentByUserId(input.context.userId, Math.max(20, limit * 5))
    ]);
    const progressMetricsBySessionId = new Map<string, typeof recentProgressMetrics>();

    for (const progressMetric of recentProgressMetrics) {
      if (!progressMetric.workoutSessionId) {
        continue;
      }

      const existingMetrics = progressMetricsBySessionId.get(progressMetric.workoutSessionId) ?? [];
      existingMetrics.push(progressMetric);
      progressMetricsBySessionId.set(progressMetric.workoutSessionId, existingMetrics);
    }

    return {
      data: {
        items: history.map((historyItem) =>
          mapWorkoutHistoryItemDto({
            history: historyItem,
            progressMetrics: progressMetricsBySessionId.get(historyItem.id) ?? []
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
