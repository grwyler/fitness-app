import type { GetExerciseProgressionSettingsResponse } from "@fitness/shared";
import type { ExerciseProgressionSettingsRepository } from "../../repositories/interfaces/exercise-progression-settings.repository.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

export class GetExerciseProgressionSettingsUseCase {
  public constructor(private readonly repository: ExerciseProgressionSettingsRepository) {}

  public async execute(input: {
    context: RequestContext;
    exerciseId: string;
  }): Promise<UseCaseResult<GetExerciseProgressionSettingsResponse>> {
    const record = await this.repository.findByUserIdAndExerciseId(input.context.userId, input.exerciseId);
    return {
      data: {
        exerciseId: input.exerciseId,
        progressionStrategy: record?.progressionStrategy ?? null,
        repRangeMin: record?.repRangeMin ?? null,
        repRangeMax: record?.repRangeMax ?? null,
        incrementOverride: record?.incrementOverrideLbs ?? null,
        maxJumpPerSession: record?.maxJumpPerSessionLbs ?? null,
        bodyweightProgressionMode: record?.bodyweightProgressionMode ?? null
      },
      meta: { replayed: false }
    };
  }
}
