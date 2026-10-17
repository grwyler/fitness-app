import type { GetProgramCoachReviewResponse } from "@fitness/shared";
import type { ProgramRepository } from "../../repositories/interfaces/program.repository.js";
import type { ProgressionRecommendationEventRepository } from "../../repositories/interfaces/progression-recommendation-event.repository.js";
import type { TrainingBlockRepository } from "../../repositories/interfaces/training-block.repository.js";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";
import { WorkoutApplicationError } from "../errors/workout-application.error.js";
import { buildCoachReviewSnapshot } from "../services/coach-review-snapshot.service.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function clampWeek(week: number) {
  if (!Number.isFinite(week) || week < 1) return 1;
  if (week > 10_000) return 10_000;
  return week;
}

function getWeekInfo(startDate: Date, now: Date) {
  const diffMs = now.getTime() - startDate.getTime();
  const weeksSinceStart = diffMs > 0 ? Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) : 0;
  const currentWeek = clampWeek(weeksSinceStart + 1);
  const weekStart = addDays(startDate, weeksSinceStart * 7);
  const weekEnd = addDays(weekStart, 7);

  return { currentWeek, weekStart, weekEnd };
}

export class GetProgramCoachReviewUseCase {
  public constructor(
    private readonly programRepository: ProgramRepository,
    private readonly trainingBlockRepository: TrainingBlockRepository,
    private readonly workoutSessionRepository: WorkoutSessionRepository,
    private readonly progressionRecommendationEventRepository: ProgressionRecommendationEventRepository
  ) {}

  public async execute(input: {
    context: RequestContext;
    programId: string;
  }): Promise<UseCaseResult<GetProgramCoachReviewResponse>> {
    const program = await this.programRepository.findActiveById(input.programId, input.context.userId);
    if (!program) {
      throw new WorkoutApplicationError("PROGRAM_NOT_FOUND", "The requested program could not be found.");
    }

    const activeBlock = await this.trainingBlockRepository.findActiveByUserProgram({
      userId: input.context.userId,
      programId: input.programId
    });

    if (!activeBlock) {
      return {
        data: {
          trainingBlock: null,
          coachReview: null
        },
        meta: { replayed: false }
      };
    }

    const now = new Date();
    const { currentWeek, weekStart, weekEnd } = getWeekInfo(activeBlock.startDate, now);

    const completedWorkoutsTotal = await this.workoutSessionRepository.countCompletedByUserIdAndProgramIdWithinRange(
      input.context.userId,
      input.programId,
      { startsAt: activeBlock.startDate, endsAt: now }
    );
    const completedWorkoutsThisWeek = await this.workoutSessionRepository.countCompletedByUserIdAndProgramIdWithinRange(
      input.context.userId,
      input.programId,
      { startsAt: weekStart, endsAt: weekEnd }
    );

    const unresolvedRecommendationsThisWeek =
      await this.progressionRecommendationEventRepository.countUnresolvedByUserIdAndProgramIdWithinRange({
        userId: input.context.userId,
        programId: input.programId,
        startsAt: weekStart,
        endsAt: weekEnd
      });

    const coachReview = buildCoachReviewSnapshot({
      targetWorkoutsPerWeek: activeBlock.targetWorkoutsPerWeek,
      completedWorkoutsThisWeek,
      completedWorkoutsTotal,
      unresolvedRecommendationsThisWeek
    });

    return {
      data: {
        trainingBlock: {
          id: activeBlock.id,
          programId: activeBlock.programId,
          name: activeBlock.name,
          source: "manual",
          status: activeBlock.status,
          startDate: activeBlock.startDate.toISOString(),
          plannedWeeks: activeBlock.plannedWeeks,
          targetWorkoutsPerWeek: activeBlock.targetWorkoutsPerWeek,
          progressionStyle: activeBlock.progressionStyle,
          currentWeek,
          completedWorkoutsThisWeek,
          completedWorkoutsTotal
        },
        coachReview
      },
      meta: { replayed: false }
    };
  }
}

