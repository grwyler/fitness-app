import type { FollowProgramResponse } from "@fitness/shared";
import type { EnrollmentRepository } from "../../repositories/interfaces/enrollment.repository.js";
import type { ExerciseRepository } from "../../repositories/interfaces/exercise.repository.js";
import type { ProgramRepository } from "../../repositories/interfaces/program.repository.js";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";
import { WorkoutApplicationError } from "../errors/workout-application.error.js";
import { mapActiveProgramDto } from "../mappers/workout-dto.mapper.js";
import type { TransactionManager } from "../services/transaction-manager.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

export class FollowProgramUseCase {
  public constructor(
    private readonly programRepository: ProgramRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly exerciseRepository: ExerciseRepository,
    private readonly workoutSessionRepository: WorkoutSessionRepository,
    private readonly transactionManager: TransactionManager
  ) {}

  public async execute(input: {
    context: RequestContext;
    programId: string;
  }): Promise<UseCaseResult<FollowProgramResponse>> {
    const response = await this.transactionManager.runInTransaction(async (tx) => {
      const existingEnrollment = await this.enrollmentRepository.findActiveByUserId(input.context.userId, {
        tx
      });

      const programDefinition = await this.programRepository.findActiveById(input.programId, { tx });
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
