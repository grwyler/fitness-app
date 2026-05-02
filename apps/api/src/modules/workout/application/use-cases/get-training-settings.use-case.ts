import type { GetTrainingSettingsResponse } from "@fitness/shared";
import type { TrainingSettingsRepository } from "../../repositories/interfaces/training-settings.repository.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

export class GetTrainingSettingsUseCase {
  public constructor(private readonly trainingSettingsRepository: TrainingSettingsRepository) {}

  public async execute(input: { context: RequestContext }): Promise<UseCaseResult<GetTrainingSettingsResponse>> {
    const record = await this.trainingSettingsRepository.findOrCreateByUserId(input.context.userId);
    return {
      data: {
        trainingGoal: record.trainingGoal,
        experienceLevel: record.experienceLevel,
        unitSystem: record.unitSystem,
        progressionAggressiveness: record.progressionAggressiveness,
        defaultBarbellIncrement: record.defaultBarbellIncrementLbs,
        defaultDumbbellIncrement: record.defaultDumbbellIncrementLbs,
        defaultMachineIncrement: record.defaultMachineIncrementLbs,
        defaultCableIncrement: record.defaultCableIncrementLbs,
        useRecoveryAdjustments: record.useRecoveryAdjustments,
        defaultRecoveryState: record.defaultRecoveryState,
        allowAutoDeload: record.allowAutoDeload,
        allowRecalibration: record.allowRecalibration,
        preferRepProgressionBeforeWeight: record.preferRepProgressionBeforeWeight,
        minimumConfidenceForIncrease: record.minimumConfidenceForIncrease
      },
      meta: { replayed: false }
    };
  }
}
