import type { GetDashboardResponse } from "@fitness/shared";
import type { EnrollmentRepository } from "../../repositories/interfaces/enrollment.repository.js";
import type { ExerciseRepository } from "../../repositories/interfaces/exercise.repository.js";
import type { ProgramRepository } from "../../repositories/interfaces/program.repository.js";
import type { ProgressMetricRepository } from "../../repositories/interfaces/progress-metric.repository.js";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";
import { AppError } from "../../../../lib/http/errors.js";
import { logger } from "../../../../lib/observability/logger.js";
import { mapActiveProgramDto, mapDashboardDto } from "../mappers/workout-dto.mapper.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

function getWeekRange(now: Date) {
  const start = new Date(now);
  const day = start.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setUTCDate(start.getUTCDate() + diffToMonday);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  return {
    startsAt: start,
    endsAt: end
  };
}

async function runDashboardStage<T>(
  stage: string,
  context: RequestContext,
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const cause = (error as { cause?: unknown } | null)?.cause;
    logger.error("Dashboard stage failed", {
      stage,
      userId: context.userId,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : "NonErrorThrown",
      errorStack: error instanceof Error ? error.stack : undefined,
      causeMessage: cause instanceof Error ? cause.message : cause ? String(cause) : undefined,
      causeName: cause instanceof Error ? cause.name : cause ? "NonErrorThrown" : undefined
    });
    throw new AppError(500, "INTERNAL_ERROR", "Unable to load dashboard.", [
      { field: "stage", message: stage }
    ]);
  }
}

export class GetDashboardUseCase {
  public constructor(
    private readonly workoutSessionRepository: WorkoutSessionRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly exerciseRepository: ExerciseRepository,
    private readonly programRepository: ProgramRepository,
    private readonly progressMetricRepository: ProgressMetricRepository
  ) {}

  public async execute(input: {
    context: RequestContext;
  }): Promise<UseCaseResult<GetDashboardResponse>> {
    const [activeWorkoutSessionGraph, activeEnrollment, recentProgressMetrics, recentWorkoutHistory] =
      await Promise.all([
        runDashboardStage(
          "workoutSessionRepository.findInProgressByUserId",
          input.context,
          () => this.workoutSessionRepository.findInProgressByUserId(input.context.userId)
        ),
        runDashboardStage(
          "enrollmentRepository.findActiveByUserId",
          input.context,
          () => this.enrollmentRepository.findActiveByUserId(input.context.userId)
        ),
        runDashboardStage(
          "progressMetricRepository.listRecentByUserId",
          input.context,
          () => this.progressMetricRepository.listRecentByUserId(input.context.userId, 20)
        ),
        runDashboardStage(
          "workoutSessionRepository.listRecentCompletedByUserId",
          input.context,
          () => this.workoutSessionRepository.listRecentCompletedByUserId(input.context.userId, 20)
        )
      ]);

    let nextWorkoutTemplate = null;
    let activeProgram = null;
    if (activeEnrollment?.currentWorkoutTemplateId) {
      const activeTemplates = await runDashboardStage(
        "exerciseRepository.findActiveTemplatesByProgramId",
        input.context,
        () => this.exerciseRepository.findActiveTemplatesByProgramId(activeEnrollment.programId)
      );
      nextWorkoutTemplate =
        activeTemplates.find((template) => template.id === activeEnrollment.currentWorkoutTemplateId) ??
        null;

      const [programDefinition, completedWorkoutCount] = await Promise.all([
        runDashboardStage(
          "programRepository.findActiveById",
          input.context,
          () => this.programRepository.findActiveById(activeEnrollment.programId, input.context.userId)
        ),
        runDashboardStage(
          "workoutSessionRepository.countCompletedByUserIdAndProgramId",
          input.context,
          () =>
            this.workoutSessionRepository.countCompletedByUserIdAndProgramId(
              input.context.userId,
              activeEnrollment.programId
            )
        )
      ]);

      if (programDefinition) {
        activeProgram = mapActiveProgramDto({
          enrollment: activeEnrollment,
          programDefinition,
          nextWorkoutTemplate,
          completedWorkoutCount
        });
      }
    }

    const weeklyWorkoutCount = await runDashboardStage(
      "workoutSessionRepository.countCompletedByUserIdWithinRange",
      input.context,
      () =>
        this.workoutSessionRepository.countCompletedByUserIdWithinRange(
          input.context.userId,
          getWeekRange(new Date())
        )
    );

    return {
      data: mapDashboardDto({
        activeProgram,
        activeWorkoutSessionGraph,
        nextWorkoutTemplate,
        recentProgressMetrics,
        recentWorkoutHistory,
        weeklyWorkoutCount,
        userUnitSystem: input.context.unitSystem
      }),
      meta: {
        replayed: false
      }
    };
  }
}
