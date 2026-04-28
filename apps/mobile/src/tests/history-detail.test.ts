import assert from "node:assert/strict";
import type { ProgressionSummaryDto, WorkoutSessionDto } from "@fitness/shared";
import {
  buildWorkoutDetailProgressHighlights,
  getWorkoutDetailStats
} from "../features/workout/utils/history-detail.shared.js";
import type { MobileTestCase } from "./mobile-test-case.js";

const workout: WorkoutSessionDto = {
  id: "session-2",
  status: "completed",
  sessionType: "program",
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
        sets: [
          {
            id: "set-1",
            exerciseEntryId: "entry-1",
            setNumber: 1,
            targetReps: 8,
            actualReps: 8,
            targetWeight: { value: 145, unit: "lb" },
            actualWeight: { value: 145, unit: "lb" },
            status: "completed",
            completedAt: "2026-04-24T10:10:00.000Z"
          },
          {
            id: "set-2",
            exerciseEntryId: "entry-1",
            setNumber: 2,
            targetReps: 8,
            actualReps: 6,
            targetWeight: { value: 145, unit: "lb" },
            actualWeight: { value: 145, unit: "lb" },
            status: "failed",
            completedAt: "2026-04-24T10:15:00.000Z"
          },
          {
            id: "set-3",
            exerciseEntryId: "entry-1",
            setNumber: 3,
            targetReps: 8,
            actualReps: null,
            targetWeight: { value: 145, unit: "lb" },
            actualWeight: null,
            status: "pending",
            completedAt: null
          }
        ]
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
  },
  {
    name: "History detail stats summarize completed sets and volume",
    run: () => {
      assert.deepEqual(getWorkoutDetailStats(workout), {
        completedSetCount: 1,
        failedSetCount: 1,
        plannedSetCount: 3,
        totalVolume: 2030
      });
    }
  }
];
