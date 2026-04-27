import assert from "node:assert/strict";
import type { ProgressionSummaryDto, WorkoutSessionDto } from "@fitness/shared";
import { buildWorkoutDetailProgressHighlights } from "../features/workout/utils/history-detail.shared.js";
import type { MobileTestCase } from "./mobile-test-case.js";

const workout: WorkoutSessionDto = {
  id: "session-2",
  status: "completed",
  isPartial: false,
  programId: "program-1",
  workoutTemplateId: "template-1",
  programName: "Beginner Full Body V1",
  workoutName: "Workout A",
  startedAt: "2026-04-24T10:00:00.000Z",
  completedAt: "2026-04-24T10:45:00.000Z",
  durationSeconds: 2700,
  exercises: [
    {
      id: "entry-1",
      exerciseId: "exercise-1",
      exerciseName: "Bench Press",
      category: "compound",
      sequenceOrder: 1,
      targetSets: 1,
      targetReps: 8,
      targetWeight: { value: 145, unit: "lb" },
      restSeconds: 120,
      effortFeedback: "just_right",
      completedAt: "2026-04-24T10:20:00.000Z",
      sets: []
    }
  ]
};

const progression: ProgressionSummaryDto = {
  totalCompletedWorkouts: 2,
  workoutsCompletedThisWeek: 2,
  currentStreakDays: 2,
  recentWorkoutVolume: [],
  assumptions: [],
  exercises: [
    {
      exerciseId: "exercise-1",
      exerciseName: "Bench Press",
      category: "compound",
      completedWorkoutCount: 2,
      recentBestWeight: { value: 145, unit: "lb" },
      recentBestReps: 8,
      lastPerformedAt: "2026-04-24T10:45:00.000Z",
      points: [
        {
          workoutSessionId: "session-1",
          completedAt: "2026-04-17T10:45:00.000Z",
          bestWeight: { value: 135, unit: "lb" },
          bestReps: 8,
          totalVolume: { value: 3240, unit: "lb" }
        },
        {
          workoutSessionId: "session-2",
          completedAt: "2026-04-24T10:45:00.000Z",
          bestWeight: { value: 145, unit: "lb" },
          bestReps: 8,
          totalVolume: { value: 3480, unit: "lb" }
        }
      ]
    }
  ]
};

export const historyDetailTestCases: MobileTestCase[] = [
  {
    name: "History detail highlights obvious weight improvements from progression data",
    run: () => {
      assert.deepEqual(buildWorkoutDetailProgressHighlights({ workout, progression }), [
        {
          exerciseEntryId: "entry-1",
          text: "+10 lb from last time"
        }
      ]);
    }
  }
];
