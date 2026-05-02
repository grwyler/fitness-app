import type {
  UpdateExerciseProgressionSettingsRequest,
  UpdateExerciseProgressionSettingsResponse
} from "@fitness/shared";
import type { ExerciseProgressionSettingsRepository } from "../../repositories/interfaces/exercise-progression-settings.repository.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

export class UpdateExerciseProgressionSettingsUseCase {
  public constructor(private readonly repository: ExerciseProgressionSettingsRepository) {}

  public async execute(input: {
    context: RequestContext;
    request: UpdateExerciseProgressionSettingsRequest;
  }): Promise<UseCaseResult<UpdateExerciseProgressionSettingsResponse>> {
    const record = await this.repository.upsert({
      userId: input.context.userId,
      exerciseId: input.request.exerciseId,
      progressionStrategy: input.request.progressionStrategy,
      repRangeMin: input.request.repRangeMin,
      repRangeMax: input.request.repRangeMax,
      incrementOverrideLbs: input.request.incrementOverride,
      maxJumpPerSessionLbs: input.request.maxJumpPerSession,
      bodyweightProgressionMode: input.request.bodyweightProgressionMode
    });

    return {
      data: {
        exerciseId: record.exerciseId,
        progressionStrategy: record.progressionStrategy,
        repRangeMin: record.repRangeMin,
        repRangeMax: record.repRangeMax,
        incrementOverride: record.incrementOverrideLbs,
        maxJumpPerSession: record.maxJumpPerSessionLbs,
        bodyweightProgressionMode: record.bodyweightProgressionMode
      },
      meta: { replayed: false }
    };
  }
}
