import type { GetWorkoutHistoryDetailResponse } from "@fitness/shared";
import { WorkoutApplicationError } from "../errors/workout-application.error.js";
import { mapProgressionRecommendationEventDto, mapWorkoutSessionDto } from "../mappers/workout-dto.mapper.js";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";
import type { ProgressionRecommendationEventRepository } from "../../repositories/interfaces/progression-recommendation-event.repository.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

export class GetWorkoutHistoryDetailUseCase {
  public constructor(
    private readonly workoutSessionRepository: WorkoutSessionRepository,
    private readonly progressionRecommendationEventRepository: ProgressionRecommendationEventRepository
  ) {}

  public async execute(input: {
    context: RequestContext;
    sessionId: string;
  }): Promise<UseCaseResult<GetWorkoutHistoryDetailResponse>> {
    const graph = await this.workoutSessionRepository.findOwnedSessionGraphById(
      input.context.userId,
      input.sessionId
    );

    if (!graph || graph.session.status !== "completed") {
      throw new WorkoutApplicationError("SESSION_NOT_FOUND", "Completed workout session was not found.");
    }

    const progressionRecommendationEvents =
      await this.progressionRecommendationEventRepository.listBySessionId(
        input.context.userId,
        graph.session.id
      );

    return {
      data: {
        workoutSession: mapWorkoutSessionDto(graph),
        progressionRecommendationEvents: progressionRecommendationEvents.map(mapProgressionRecommendationEventDto)
      },
      meta: {
        replayed: false
      }
    };
  }
}
