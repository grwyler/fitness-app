import assert from "node:assert/strict";
import { formatWeightForUser, kgToLbs, lbsToKg, parseWeightInputForUser } from "@fitness/shared";
import { formatExerciseTargetSummary } from "../features/workout/utils/weight-display.shared.js";
import { buildLogSetRequestFromDraft, getSetLogDefaultDraft } from "../features/workout/utils/set-logging.shared.js";
import type { SetDto } from "@fitness/shared";
import { getWorkoutSummaryEncouragement, getWorkoutSummaryOutcomes } from "../features/workout/utils/workout-summary.shared.js";
import type { CompleteWorkoutSessionResponse, WorkoutSessionDto } from "@fitness/shared";
import type { MobileTestCase } from "./mobile-test-case.js";

function approxEqual(actual: number, expected: number, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `Expected ${actual} ≈ ${expected}`);
}

function createSet(overrides: Partial<SetDto> = {}): SetDto {
  return {
    id: "set-1",
    exerciseEntryId: "entry-1",
    setNumber: 1,
    targetReps: 8,
    actualReps: null,
    targetWeight: {
      value: 135,
      unit: "lb"
    },
    actualWeight: null,
    status: "pending",
    completedAt: null,
    ...overrides
  };
}

function createWorkout(): WorkoutSessionDto {
  return {
    id: "session-1",
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
        targetSets: 2,
        targetReps: 8,
        targetWeight: { value: 135, unit: "lb" },
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
            actualReps: 7,
            targetWeight: { value: 135, unit: "lb" },
            actualWeight: { value: 135, unit: "lb" },
            status: "failed",
            completedAt: "2026-04-24T10:15:00.000Z"
          }
        ]
      }
    ]
  };
}

export const unitSystemMetricTestCases: MobileTestCase[] = [
  {
    name: "Weight conversion utilities map lbs <-> kg consistently",
    run: () => {
      approxEqual(lbsToKg(1), 0.45359237);
      approxEqual(kgToLbs(0.45359237), 1);

      const pounds = 135;
      const kilograms = lbsToKg(pounds);
      approxEqual(kgToLbs(kilograms), pounds);
    }
  },
  {
    name: "Active workout display formats canonical pounds as kg for metric users",
    run: () => {
      assert.equal(
        formatExerciseTargetSummary({
          targetSets: 3,
          targetReps: 8,
          repRangeMin: null,
          repRangeMax: null,
          targetWeightLbs: 135,
          unitSystem: "metric"
        }),
        "3 x 8 at 61.2 kg"
      );
    }
  },
  {
    name: "Set logging converts metric kg input to canonical lbs for API requests",
    run: () => {
      const request = buildLogSetRequestFromDraft({ repsText: "8", weightText: "60" }, { unitSystem: "metric" });
      assert.ok(request);
      assert.equal(request?.actualReps, 8);
      assert.equal(request?.actualWeight?.unit, "lb");
      assert.equal(request?.actualWeight?.value, 132.28);
    }
  },
  {
    name: "Set logging defaults show previous/prescribed load in kg for metric users",
    run: () => {
      const draft = getSetLogDefaultDraft({ set: createSet(), unitSystem: "metric" });
      assert.equal(draft.weightText, "61.2");
    }
  },
  {
    name: "Workout summary recommendation and volume display in kg for metric users",
    run: () => {
      const summary: CompleteWorkoutSessionResponse = {
        workoutSession: createWorkout(),
        progressionUpdates: [
          {
            exerciseId: "exercise-1",
            exerciseName: "Bench Press",
            previousWeight: { value: 135, unit: "lb" },
            nextWeight: { value: 140, unit: "lb" },
            previousRepGoal: 8,
            nextRepGoal: 8,
            result: "increased",
            reason: "Completed successfully.",
            confidence: "high",
            reasonCodes: ["ALL_SETS_COMPLETED", "WEIGHT_INCREASED"],
            evidence: ["Completed 2/2 sets"]
          }
        ],
        progressMetrics: [],
        nextWorkoutTemplate: null
      };

      assert.equal(getWorkoutSummaryEncouragement(summary, "metric"), "Bench Press moves to 63.5 kg next time.");
      assert.equal(getWorkoutSummaryOutcomes(summary, "metric")[2]?.value, "919 kg");
    }
  },
  {
    name: "Equipment increments format and parse correctly for metric users",
    run: () => {
      assert.equal(
        formatWeightForUser({ weightLbs: 5, unitSystem: "metric", includeUnit: false, maximumFractionDigits: 1 }).text,
        "2.3"
      );
      assert.equal(parseWeightInputForUser({ weightText: "2.5", unitSystem: "metric" }), 5.51);
    }
  }
];
