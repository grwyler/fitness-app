import type {
  ManualProgramGoalContextDto,
  UpdateManualProgramGoalContextRequest,
  UpdateManualProgramGoalContextResponse
} from "@fitness/shared";
import type { ExerciseProgressionSettingsRepository } from "../../repositories/interfaces/exercise-progression-settings.repository.js";
import type { ProgramRepository } from "../../repositories/interfaces/program.repository.js";
import type { ProgramTrainingContextRepository } from "../../repositories/interfaces/program-training-context.repository.js";
import type { TrainingSettingsRepository } from "../../repositories/interfaces/training-settings.repository.js";
import { WorkoutApplicationError } from "../errors/workout-application.error.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

export class UpdateManualProgramGoalContextUseCase {
  public constructor(
    private readonly programRepository: ProgramRepository,
    private readonly trainingSettingsRepository: TrainingSettingsRepository,
    private readonly exerciseProgressionSettingsRepository: ExerciseProgressionSettingsRepository,
    private readonly programTrainingContextRepository: ProgramTrainingContextRepository
  ) {}

  public async execute(input: {
    context: RequestContext;
    programId: string;
    request: UpdateManualProgramGoalContextRequest;
  }): Promise<UseCaseResult<UpdateManualProgramGoalContextResponse>> {
    const programDefinition = await this.programRepository.findActiveById(
      input.programId,
      input.context.userId
    );

    if (!programDefinition) {
      throw new WorkoutApplicationError("PROGRAM_NOT_FOUND", "The requested program could not be found.");
    }

    const trainingSettings = await this.trainingSettingsRepository.findOrCreateByUserId(input.context.userId);
    const exerciseProgressionSettings =
      await this.exerciseProgressionSettingsRepository.listByUserId(input.context.userId);

    const manualGoalContext: ManualProgramGoalContextDto = input.request.manualGoalContext;

    await this.programTrainingContextRepository.create({
      userId: input.context.userId,
      programId: input.programId,
      source: "manual",
      goalType: trainingSettings.trainingGoal,
      experienceLevel: trainingSettings.experienceLevel,
      progressionPreferencesSnapshot: {
        progressionAggressiveness: trainingSettings.progressionAggressiveness,
        preferRepProgressionBeforeWeight: trainingSettings.preferRepProgressionBeforeWeight,
        allowRecalibration: trainingSettings.allowRecalibration,
        minimumConfidenceForIncrease: trainingSettings.minimumConfidenceForIncrease
      },
      recoveryPreferencesSnapshot: {
        useRecoveryAdjustments: trainingSettings.useRecoveryAdjustments,
        defaultRecoveryState: trainingSettings.defaultRecoveryState,
        allowAutoDeload: trainingSettings.allowAutoDeload
      },
      equipmentSettingsSnapshot: {
        defaultBarbellIncrementLbs: trainingSettings.defaultBarbellIncrementLbs,
        defaultDumbbellIncrementLbs: trainingSettings.defaultDumbbellIncrementLbs,
        defaultMachineIncrementLbs: trainingSettings.defaultMachineIncrementLbs,
        defaultCableIncrementLbs: trainingSettings.defaultCableIncrementLbs
      },
      exerciseProgressionSettingsSnapshot: exerciseProgressionSettings.map((record) => ({
        exerciseId: record.exerciseId,
        progressionStrategy: record.progressionStrategy,
        repRangeMin: record.repRangeMin,
        repRangeMax: record.repRangeMax,
        incrementOverrideLbs: record.incrementOverrideLbs,
        maxJumpPerSessionLbs: record.maxJumpPerSessionLbs,
        bodyweightProgressionMode: record.bodyweightProgressionMode
      })),
      guidedAnswersSnapshot: {
        manualGoalContextV1: manualGoalContext
      },
      coachingEnabled: false
    });

    return {
      data: {
        manualGoalContext
      },
      meta: {
        replayed: false
      }
    };
  }
}

