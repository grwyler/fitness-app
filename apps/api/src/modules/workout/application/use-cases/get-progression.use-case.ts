import type {
  ExerciseProgressionPointDto,
  ExerciseProgressionSummaryDto,
  GetProgressionResponse,
  ProgressionVolumePointDto
} from "@fitness/shared";
import type { CompletedWorkoutProgressionRecord } from "../../repositories/models/workout-session.persistence.js";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

const DEFAULT_SESSION_LIMIT = 50;
const RECENT_VOLUME_LIMIT = 8;
const EXERCISE_LIMIT = 6;
const EXERCISE_POINT_LIMIT = 8;

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

function toWeightValue(value: number) {
  return {
    value: Math.round(value * 100) / 100,
    unit: "lb" as const
  };
}

function setVolume(row: CompletedWorkoutProgressionRecord) {
  if (row.actualWeightLbs === null || row.actualReps === null) {
    return 0;
  }

  return row.actualWeightLbs * row.actualReps;
}

function isLoggedSet(row: CompletedWorkoutProgressionRecord) {
  return (row.setStatus === "completed" || row.setStatus === "failed") && row.actualReps !== null;
}

function uniqueCompletedSessions(rows: CompletedWorkoutProgressionRecord[]) {
  const sessionsById = new Map<string, { id: string; workoutName: string; completedAt: Date }>();

  for (const row of rows) {
    sessionsById.set(row.workoutSessionId, {
      id: row.workoutSessionId,
      workoutName: row.workoutName,
      completedAt: row.completedAt
    });
  }

  return [...sessionsById.values()].sort(
    (left, right) => right.completedAt.getTime() - left.completedAt.getTime()
  );
}

function calculateCurrentStreakDays(completedDates: Date[]) {
  const completedDayKeys = [
    ...new Set(completedDates.map((date) => date.toISOString().slice(0, 10)))
  ].sort((left, right) => (left < right ? 1 : -1));

  if (completedDayKeys.length === 0) {
    return 0;
  }

  let streak = 1;
  let previous = new Date(`${completedDayKeys[0]}T00:00:00.000Z`);

  for (const dayKey of completedDayKeys.slice(1)) {
    const current = new Date(`${dayKey}T00:00:00.000Z`);
    const diffDays = Math.round((previous.getTime() - current.getTime()) / 86_400_000);
    if (diffDays !== 1) {
      break;
    }

    streak += 1;
    previous = current;
  }

  return streak;
}

function buildRecentWorkoutVolume(
  rows: CompletedWorkoutProgressionRecord[],
  sessions: ReturnType<typeof uniqueCompletedSessions>
): ProgressionVolumePointDto[] {
  return sessions
    .slice(0, RECENT_VOLUME_LIMIT)
    .map((session) => {
      const totalVolume = rows
        .filter((row) => row.workoutSessionId === session.id && isLoggedSet(row))
        .reduce((sum, row) => sum + setVolume(row), 0);

      return {
        workoutSessionId: session.id,
        workoutName: session.workoutName,
        completedAt: session.completedAt.toISOString(),
        totalVolume: toWeightValue(totalVolume)
      };
    })
    .reverse();
}

function buildExerciseSummaries(
  rows: CompletedWorkoutProgressionRecord[]
): ExerciseProgressionSummaryDto[] {
  const byExerciseId = new Map<string, CompletedWorkoutProgressionRecord[]>();

  for (const row of rows.filter(isLoggedSet)) {
    const existingRows = byExerciseId.get(row.exerciseId) ?? [];
    existingRows.push(row);
    byExerciseId.set(row.exerciseId, existingRows);
  }

  return [...byExerciseId.entries()]
    .map(([exerciseId, exerciseRows]) => {
      const firstRow = exerciseRows[0]!;
      const sessions = uniqueCompletedSessions(exerciseRows);
      const recentBestWeight = exerciseRows.reduce<number | null>(
        (best, row) =>
          row.actualWeightLbs === null ? best : best === null ? row.actualWeightLbs : Math.max(best, row.actualWeightLbs),
        null
      );
      const recentBestReps = exerciseRows.reduce<number | null>(
        (best, row) =>
          row.actualReps === null ? best : best === null ? row.actualReps : Math.max(best, row.actualReps),
        null
      );

      const points: ExerciseProgressionPointDto[] = sessions
        .slice(0, EXERCISE_POINT_LIMIT)
        .map((session) => {
          const sessionRows = exerciseRows.filter((row) => row.workoutSessionId === session.id);
          const bestWeight = sessionRows.reduce<number | null>(
            (best, row) =>
              row.actualWeightLbs === null
                ? best
                : best === null
                  ? row.actualWeightLbs
                  : Math.max(best, row.actualWeightLbs),
            null
          );
          const bestReps = sessionRows.reduce<number | null>(
            (best, row) =>
              row.actualReps === null ? best : best === null ? row.actualReps : Math.max(best, row.actualReps),
            null
          );
          const totalVolume = sessionRows.reduce((sum, row) => sum + setVolume(row), 0);

          return {
            workoutSessionId: session.id,
            completedAt: session.completedAt.toISOString(),
            bestWeight: bestWeight === null ? null : toWeightValue(bestWeight),
            bestReps,
            totalVolume: toWeightValue(totalVolume)
          };
        })
        .reverse();

      return {
        exerciseId,
        exerciseName: firstRow.exerciseName,
        category: firstRow.exerciseCategory,
        completedWorkoutCount: sessions.length,
        recentBestWeight: recentBestWeight === null ? null : toWeightValue(recentBestWeight),
        recentBestReps,
        lastPerformedAt: sessions[0]?.completedAt.toISOString() ?? null,
        points
      };
    })
    .sort((left, right) => {
      if (right.completedWorkoutCount !== left.completedWorkoutCount) {
        return right.completedWorkoutCount - left.completedWorkoutCount;
      }

      return (right.lastPerformedAt ?? "").localeCompare(left.lastPerformedAt ?? "");
    })
    .slice(0, EXERCISE_LIMIT);
}

export class GetProgressionUseCase {
  public constructor(private readonly workoutSessionRepository: WorkoutSessionRepository) {}

  public async execute(input: {
    context: RequestContext;
  }): Promise<UseCaseResult<GetProgressionResponse>> {
    const [totalCompletedWorkouts, rows] = await Promise.all([
      this.workoutSessionRepository.countCompletedByUserId(input.context.userId),
      this.workoutSessionRepository.listCompletedProgressionByUserId(
        input.context.userId,
        DEFAULT_SESSION_LIMIT
      )
    ]);
    const completedSessions = uniqueCompletedSessions(rows);
    const weekRange = getWeekRange(new Date());

    return {
      data: {
        totalCompletedWorkouts,
        workoutsCompletedThisWeek: completedSessions.filter(
          (session) =>
            session.completedAt >= weekRange.startsAt && session.completedAt < weekRange.endsAt
        ).length,
        currentStreakDays: calculateCurrentStreakDays(
          completedSessions.map((session) => session.completedAt)
        ),
        recentWorkoutVolume: buildRecentWorkoutVolume(rows, completedSessions),
        exercises: buildExerciseSummaries(rows),
        assumptions: [
          "Volume uses logged actual reps and actual weight from completed or failed sets.",
          "Streak counts consecutive UTC calendar days with at least one completed workout.",
          "Exercise summaries are limited to the most frequently completed recent exercises."
        ]
      },
      meta: {
        replayed: false
      }
    };
  }
}
