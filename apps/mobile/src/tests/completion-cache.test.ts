import assert from "node:assert/strict";
import type { CompleteWorkoutSessionResponse, GetWorkoutHistoryResponse } from "@fitness/shared";
import {
  applyCompletedWorkoutToDashboard,
  upsertCompletedWorkoutIntoHistory
} from "../features/workout/utils/completion-cache.shared.js";
import type { MobileTestCase } from "./mobile-test-case.js";

function createCompletionSummary(overrides?: {
  completedAt?: string;
  id?: string;
}): CompleteWorkoutSessionResponse {
  return {
    workoutSession: {
      id: overrides?.id ?? "session-2",
      status: "completed",
      sessionType: "program",
      isPartial: false,
      programId: "program-1",
      workoutTemplateId: "template-1",
      programName: "Beginner Full Body V1",
      workoutName: "Workout A",
      startedAt: "2026-04-24T10:00:00.000Z",
      completedAt: overrides?.completedAt ?? "2026-04-24T10:45:00.000Z",
      durationSeconds: 2700,
      exercises: [
        {
          id: "entry-1",
          exerciseId: "exercise-1",
          exerciseName: "Bench Press",
          category: "compound",
          sequenceOrder: 1,
          targetSets: 2,
          targetReps: 8,
          targetWeight: { value: 135, unit: "lb" },
          restSeconds: 120,
          effortFeedback: "just_right",
          completedAt: "2026-04-24T10:40:00.000Z",
          sets: [
            {
              id: "set-1",
              exerciseEntryId: "entry-1",
              setNumber: 1,
              targetReps: 8,
              actualReps: 8,
              targetWeight: { value: 135, unit: "lb" },
              actualWeight: { value: 135, unit: "lb" },
              status: "completed",
              completedAt: "2026-04-24T10:10:00.000Z"
            },
            {
              id: "set-2",
              exerciseEntryId: "entry-1",
              setNumber: 2,
              targetReps: 8,
              actualReps: 6,
              targetWeight: { value: 135, unit: "lb" },
              actualWeight: { value: 135, unit: "lb" },
              status: "failed",
              completedAt: "2026-04-24T10:15:00.000Z"
            }
          ]
        }
      ]
    },
    progressionUpdates: [],
    progressMetrics: [
      {
        id: "metric-1",
        metricType: "workout_completed",
        metricValue: 1,
        displayText: "Workout completed",
        recordedAt: overrides?.completedAt ?? "2026-04-24T10:45:00.000Z"
      }
    ],
    nextWorkoutTemplate: {
      id: "template-2",
      name: "Workout B",
      category: "Full Body",
      sequenceOrder: 2,
      estimatedDurationMinutes: 55
    }
  };
}

const existingHistory: GetWorkoutHistoryResponse = {
  items: [
    {
      id: "session-1",
      workoutName: "Workout A",
      programName: "Beginner Full Body V1",
      status: "completed",
      isPartial: false,
      startedAt: "2026-04-20T10:00:00.000Z",
      completedAt: "2026-04-20T10:45:00.000Z",
      durationSeconds: 2700,
      exerciseCount: 1,
      plannedSetCount: 2,
      completedSetCount: 2,
      failedSetCount: 0,
      highlights: ["Workout completed"]
    }
  ],
  nextCursor: null
};

export const completionCacheTestCases: MobileTestCase[] = [
  {
    name: "Completion cache upserts the saved workout into history immediately",
    run: () => {
      const history = upsertCompletedWorkoutIntoHistory(existingHistory, createCompletionSummary());

      assert.equal(history?.items[0]?.id, "session-2");
      assert.equal(history?.items[0]?.completedSetCount, 1);
      assert.equal(history?.items[0]?.failedSetCount, 1);
      assert.deepEqual(history?.items[0]?.highlights, ["Workout completed"]);
      assert.equal(history?.items[1]?.id, "session-1");
    }
  },
  {
    name: "Completion cache replaces an existing history item instead of duplicating it",
    run: () => {
      const first = upsertCompletedWorkoutIntoHistory(existingHistory, createCompletionSummary());
      const second = upsertCompletedWorkoutIntoHistory(first, createCompletionSummary());

      assert.equal(second?.items.filter((item) => item.id === "session-2").length, 1);
    }
  },
  {
    name: "Completion cache clears active dashboard workout from server-confirmed completion",
    run: () => {
      const dashboard = applyCompletedWorkoutToDashboard(
        {
          activeProgram: null,
          activeWorkoutSession: createCompletionSummary({ id: "session-active" }).workoutSession,
          nextWorkoutTemplate: null,
          recentProgressMetrics: [],
          recentWorkoutHistory: [],
          weeklyWorkoutCount: 0,
          userUnitSystem: "imperial"
        },
        createCompletionSummary()
      );

      assert.equal(dashboard?.activeWorkoutSession, null);
      assert.equal(dashboard?.nextWorkoutTemplate?.id, "template-2");
      assert.equal(dashboard?.recentWorkoutHistory[0]?.id, "session-2");
      assert.equal(dashboard?.weeklyWorkoutCount, 0);
    }
  }
];
