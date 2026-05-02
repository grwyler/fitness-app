import type { UpdateTrainingSettingsRequest, UpdateTrainingSettingsResponse } from "@fitness/shared";
import type { TrainingSettingsRepository } from "../../repositories/interfaces/training-settings.repository.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

export class UpdateTrainingSettingsUseCase {
  public constructor(private readonly trainingSettingsRepository: TrainingSettingsRepository) {}

  public async execute(input: {
    context: RequestContext;
    request: UpdateTrainingSettingsRequest;
  }): Promise<UseCaseResult<UpdateTrainingSettingsResponse>> {
    const update: Record<string, unknown> = {};
    if (input.request.trainingGoal !== undefined) update.trainingGoal = input.request.trainingGoal;
    if (input.request.experienceLevel !== undefined) update.experienceLevel = input.request.experienceLevel;
    if (input.request.unitSystem !== undefined) update.unitSystem = input.request.unitSystem;
    if (input.request.progressionAggressiveness !== undefined)
      update.progressionAggressiveness = input.request.progressionAggressiveness;
    if (input.request.defaultBarbellIncrement !== undefined)
      update.defaultBarbellIncrementLbs = input.request.defaultBarbellIncrement;
    if (input.request.defaultDumbbellIncrement !== undefined)
      update.defaultDumbbellIncrementLbs = input.request.defaultDumbbellIncrement;
    if (input.request.defaultMachineIncrement !== undefined)
      update.defaultMachineIncrementLbs = input.request.defaultMachineIncrement;
    if (input.request.defaultCableIncrement !== undefined)
      update.defaultCableIncrementLbs = input.request.defaultCableIncrement;
    if (input.request.useRecoveryAdjustments !== undefined)
      update.useRecoveryAdjustments = input.request.useRecoveryAdjustments;
    if (input.request.defaultRecoveryState !== undefined) update.defaultRecoveryState = input.request.defaultRecoveryState;
    if (input.request.allowAutoDeload !== undefined) update.allowAutoDeload = input.request.allowAutoDeload;
    if (input.request.allowRecalibration !== undefined) update.allowRecalibration = input.request.allowRecalibration;
    if (input.request.preferRepProgressionBeforeWeight !== undefined)
      update.preferRepProgressionBeforeWeight = input.request.preferRepProgressionBeforeWeight;
    if (input.request.minimumConfidenceForIncrease !== undefined)
      update.minimumConfidenceForIncrease = input.request.minimumConfidenceForIncrease;

    const updated = await this.trainingSettingsRepository.updateByUserId(
      input.context.userId,
      update as any
    );

    return {
      data: {
        trainingGoal: updated.trainingGoal,
        experienceLevel: updated.experienceLevel,
        unitSystem: updated.unitSystem,
        progressionAggressiveness: updated.progressionAggressiveness,
        defaultBarbellIncrement: updated.defaultBarbellIncrementLbs,
        defaultDumbbellIncrement: updated.defaultDumbbellIncrementLbs,
        defaultMachineIncrement: updated.defaultMachineIncrementLbs,
        defaultCableIncrement: updated.defaultCableIncrementLbs,
        useRecoveryAdjustments: updated.useRecoveryAdjustments,
        defaultRecoveryState: updated.defaultRecoveryState,
        allowAutoDeload: updated.allowAutoDeload,
        allowRecalibration: updated.allowRecalibration,
        preferRepProgressionBeforeWeight: updated.preferRepProgressionBeforeWeight,
        minimumConfidenceForIncrease: updated.minimumConfidenceForIncrease
      },
      meta: { replayed: false }
    };
  }
}
