import type { FollowProgramRequest, FollowProgramResponse, GuidedProgramAnswers, GuidedProgramAnswersV2 } from "@fitness/shared";
import type { EnrollmentRepository } from "../../repositories/interfaces/enrollment.repository.js";
import type { ExerciseRepository } from "../../repositories/interfaces/exercise.repository.js";
import type { ExerciseProgressionSettingsRepository } from "../../repositories/interfaces/exercise-progression-settings.repository.js";
import type { ProgramRepository } from "../../repositories/interfaces/program.repository.js";
import type { ProgramTrainingContextRepository } from "../../repositories/interfaces/program-training-context.repository.js";
import type { TrainingSettingsRepository } from "../../repositories/interfaces/training-settings.repository.js";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";
import { WorkoutApplicationError } from "../errors/workout-application.error.js";
import { mapActiveProgramDto } from "../mappers/workout-dto.mapper.js";
import { mapGuidedAnswersToTrainingGoal } from "../services/guided-program-recommendation.service.js";
import type { TransactionManager } from "../services/transaction-manager.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

export class FollowProgramUseCase {
  public constructor(
    private readonly programRepository: ProgramRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly exerciseRepository: ExerciseRepository,
    private readonly workoutSessionRepository: WorkoutSessionRepository,
    private readonly trainingSettingsRepository: TrainingSettingsRepository,
    private readonly exerciseProgressionSettingsRepository: ExerciseProgressionSettingsRepository,
    private readonly programTrainingContextRepository: ProgramTrainingContextRepository,
    private readonly transactionManager: TransactionManager
  ) {}

  public async execute(input: {
    context: RequestContext;
    programId: string;
    request?: FollowProgramRequest | undefined;
  }): Promise<UseCaseResult<FollowProgramResponse>> {
    const response = await this.transactionManager.runInTransaction(async (tx) => {
      const existingEnrollment = await this.enrollmentRepository.findActiveByUserId(input.context.userId, {
        tx
      });

      const programDefinition = await this.programRepository.findActiveById(
        input.programId,
        input.context.userId,
        { tx }
      );
      if (!programDefinition) {
        throw new WorkoutApplicationError("PROGRAM_NOT_FOUND", "The requested program could not be found.");
      }

      const firstTemplate = [...programDefinition.templates].sort(
        (left, right) => left.sequenceOrder - right.sequenceOrder
      )[0];
      if (!firstTemplate) {
        throw new WorkoutApplicationError(
          "WORKOUT_TEMPLATE_NOT_FOUND",
          "The requested program does not have an active workout template."
        );
      }

      if (existingEnrollment?.programId === programDefinition.program.id) {
        const activeTemplates = await this.exerciseRepository.findActiveTemplatesByProgramId(
          programDefinition.program.id,
          { tx }
        );
        const nextWorkoutTemplate =
          activeTemplates.find((template) => template.id === existingEnrollment.currentWorkoutTemplateId) ?? null;
        const completedWorkoutCount =
          await this.workoutSessionRepository.countCompletedByUserIdAndProgramId(
            input.context.userId,
            programDefinition.program.id,
            { tx }
          );

        return {
          activeProgram: mapActiveProgramDto({
            enrollment: existingEnrollment,
            programDefinition,
            nextWorkoutTemplate,
            completedWorkoutCount
          })
        };
      }

      if (existingEnrollment) {
        const activeWorkout = await this.workoutSessionRepository.findInProgressByUserId(
          input.context.userId,
          { tx }
        );
        if (activeWorkout) {
          throw new WorkoutApplicationError(
            "ACTIVE_WORKOUT_ALREADY_EXISTS",
            "Finish or leave your active workout before switching programs."
          );
        }

        await this.enrollmentRepository.cancelEnrollment(
          {
            enrollmentId: existingEnrollment.id,
            completedAt: new Date()
          },
          { tx }
        );
      }

      const enrollment = await this.programRepository.createEnrollment(
        {
          userId: input.context.userId,
          programId: programDefinition.program.id,
          currentWorkoutTemplateId: firstTemplate.id,
          startedAt: new Date()
        },
        { tx }
      );

      const trainingSettings = await this.trainingSettingsRepository.findOrCreateByUserId(
        input.context.userId,
        { tx }
      );
      const exerciseProgressionSettings =
        await this.exerciseProgressionSettingsRepository.listByUserId(input.context.userId, { tx });

      const guidedAnswers = input.request?.activationSource === "guided" ? input.request.guidedAnswers : undefined;
      const isGuided = Boolean(guidedAnswers);

      function isGuidedAnswersV2(input: GuidedProgramAnswers): input is GuidedProgramAnswersV2 {
        return typeof (input as GuidedProgramAnswersV2).version === "number" && (input as GuidedProgramAnswersV2).version === 2;
      }

      const goalType = guidedAnswers
        ? mapGuidedAnswersToTrainingGoal(guidedAnswers.goal)
        : trainingSettings.trainingGoal;
      const experienceLevel = guidedAnswers ? guidedAnswers.experienceLevel : trainingSettings.experienceLevel;
      const guidedProgressionAggressiveness = guidedAnswers
        ? isGuidedAnswersV2(guidedAnswers)
          ? guidedAnswers.preferences.progressionAggressiveness
          : guidedAnswers.progressionAggressiveness
        : null;
      const progressionAggressiveness = guidedProgressionAggressiveness ?? trainingSettings.progressionAggressiveness;

      const guidedRecoveryPreference = guidedAnswers
        ? isGuidedAnswersV2(guidedAnswers)
          ? guidedAnswers.preferences.recoveryPreference
          : guidedAnswers.recoveryPreference
        : null;

      const recoveryOverrides = guidedAnswers
        ? guidedRecoveryPreference === "keep_fixed"
          ? { useRecoveryAdjustments: false, allowAutoDeload: false }
          : guidedRecoveryPreference === "small_adjustments_only"
             ? { useRecoveryAdjustments: true, allowAutoDeload: false }
             : { useRecoveryAdjustments: true, allowAutoDeload: true }
        : null;

      await this.programTrainingContextRepository.create(
        {
          userId: input.context.userId,
          programId: programDefinition.program.id,
          enrollmentId: enrollment.id,
          source: isGuided
            ? "guided"
            : programDefinition.program.source === "predefined"
              ? "predefined"
              : "manual",
          goalType,
          experienceLevel,
          progressionPreferencesSnapshot: {
            progressionAggressiveness,
            preferRepProgressionBeforeWeight: trainingSettings.preferRepProgressionBeforeWeight,
            allowRecalibration: trainingSettings.allowRecalibration,
            minimumConfidenceForIncrease: trainingSettings.minimumConfidenceForIncrease
          },
          recoveryPreferencesSnapshot: {
            useRecoveryAdjustments: recoveryOverrides ? recoveryOverrides.useRecoveryAdjustments : trainingSettings.useRecoveryAdjustments,
            defaultRecoveryState: trainingSettings.defaultRecoveryState,
            allowAutoDeload: recoveryOverrides ? recoveryOverrides.allowAutoDeload : trainingSettings.allowAutoDeload
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
          guidedAnswersSnapshot: isGuided ? guidedAnswers ?? null : null,
          guidedRecommendationSnapshot: isGuided ? input.request?.guidedRecommendation ?? null : null
        },
        { tx }
      );

      const activeTemplates = await this.exerciseRepository.findActiveTemplatesByProgramId(
        programDefinition.program.id,
        { tx }
      );
      const nextWorkoutTemplate =
        activeTemplates.find((template) => template.id === enrollment.currentWorkoutTemplateId) ?? null;
      const completedWorkoutCount =
        await this.workoutSessionRepository.countCompletedByUserIdAndProgramId(
          input.context.userId,
          programDefinition.program.id,
          { tx }
        );

      return {
        activeProgram: mapActiveProgramDto({
          enrollment,
          programDefinition,
          nextWorkoutTemplate,
          completedWorkoutCount
        })
      };
    });

    return {
      data: response,
      meta: {
        replayed: false
      }
    };
  }
}
