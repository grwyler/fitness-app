import assert from "node:assert/strict";
import type { CompleteWorkoutSessionResponse, WorkoutSessionDto } from "@fitness/shared";
import {
  getWorkoutSummaryEncouragement,
  getWorkoutSummaryHeadline,
  getWorkoutSummaryOutcomes,
  getWorkoutSummaryStats,
  getUnusualProgressionReviewItems,
  getProgressionUpdateConfidenceDisplay,
  getProgressionUpdateReasonText,
  getProgressionUpdateResultLabel,
  getProgressionUpdateSummaryText
} from "../features/workout/utils/workout-summary.shared.js";
import type { MobileTestCase } from "./mobile-test-case.js";

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

export const workoutSummaryTestCases: MobileTestCase[] = [
  {
    name: "Workout summary helpers calculate lightweight completion stats",
    run: () => {
      const workout = createWorkout();
      const stats = getWorkoutSummaryStats(workout);

      assert.equal(stats.completedExerciseCount, 1);
      assert.equal(stats.completedSetCount, 1);
      assert.equal(stats.exerciseCount, 1);
      assert.equal(stats.failedSetCount, 1);
      assert.equal(stats.plannedSetCount, 2);
      assert.equal(stats.totalVolume, 2025);
      assert.equal(stats.durationMinutes, 45);
    }
  },
  {
    name: "Workout summary headline highlights progression when available",
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

      assert.equal(getWorkoutSummaryHeadline(summary), "1 lift moving up next time");
      assert.equal(getWorkoutSummaryEncouragement(summary), "Bench Press moves to 140 lb next time.");
      assert.deepEqual(getWorkoutSummaryOutcomes(summary), [
        {
          label: "Exercises",
          value: "1/1",
          detail: "completed"
        },
        {
          label: "Sets",
          value: "1/2",
          detail: "1 missed"
        },
        {
          label: "Volume",
          value: "2,025 lb",
          detail: "total work"
        },
        {
          label: "Progress",
          value: "1",
          detail: "lift moving up"
        }
      ]);
    }
  },
  {
    name: "Workout summary progression copy avoids misleading no-change arrows",
    run: () => {
      assert.equal(
        getProgressionUpdateSummaryText({
          exerciseId: "exercise-1",
          exerciseName: "Bench Press",
          previousWeight: { value: 135, unit: "lb" },
          nextWeight: { value: 135, unit: "lb" },
          previousRepGoal: 8,
          nextRepGoal: 8,
          result: "repeated",
          reason: "Keep the same weight.",
          confidence: "medium",
          reasonCodes: ["REPEATED"],
          evidence: []
        }),
        "Repeat same weight and reps"
      );
    }
  },
  {
    name: "Workout summary shows rep-only increases when weight stays the same",
    run: () => {
      assert.equal(
        getProgressionUpdateSummaryText({
          exerciseId: "exercise-1",
          exerciseName: "Bench Press",
          previousWeight: { value: 135, unit: "lb" },
          nextWeight: { value: 135, unit: "lb" },
          previousRepGoal: 8,
          nextRepGoal: 9,
          result: "increased",
          reason: "Increased reps.",
          confidence: "high",
          reasonCodes: ["REP_GOAL_INCREASED"],
          evidence: []
        }),
        "Increase reps from 8 to 9"
      );
    }
  },
  {
    name: "Workout summary renders skipped progression updates clearly",
    run: () => {
      assert.equal(
        getProgressionUpdateSummaryText({
          exerciseId: "exercise-1",
          exerciseName: "Pull-Ups",
          previousWeight: { value: 0, unit: "lb" },
          nextWeight: { value: 0, unit: "lb" },
          previousRepGoal: 8,
          nextRepGoal: 8,
          result: "skipped",
          reason: "No weight progression because Pull-Ups is weight-optional and you logged 0 lb of external load.",
          confidence: "low",
          reasonCodes: ["SKIPPED"],
          evidence: []
        }),
        "No progression update"
      );
    }
  },
  {
    name: "Workout summary maps progression results to user-friendly labels",
    run: () => {
      assert.equal(getProgressionUpdateResultLabel("increased"), "Increased");
      assert.equal(getProgressionUpdateResultLabel("repeated"), "Repeated");
      assert.equal(getProgressionUpdateResultLabel("reduced"), "Reduced");
      assert.equal(getProgressionUpdateResultLabel("recalibrated"), "Recalibrated");
      assert.equal(getProgressionUpdateResultLabel("skipped"), "Skipped");
    }
  },
  {
    name: "Workout summary presents skipped progression reasons without sounding scary",
    run: () => {
      assert.equal(
        getProgressionUpdateReasonText({
          exerciseId: "exercise-1",
          exerciseName: "Bench Press",
          previousWeight: { value: 135, unit: "lb" },
          nextWeight: { value: 135, unit: "lb" },
          previousRepGoal: 8,
          nextRepGoal: 8,
          result: "skipped",
          reason: "Effort feedback was not provided.",
          confidence: "low",
          reasonCodes: ["SKIPPED_MISSING_FEEDBACK"],
          evidence: []
        }),
        "Progression skipped because effort feedback was not provided."
      );

      assert.equal(
        getProgressionUpdateReasonText({
          exerciseId: "exercise-1",
          exerciseName: "Bench Press",
          previousWeight: { value: 135, unit: "lb" },
          nextWeight: { value: 135, unit: "lb" },
          previousRepGoal: 8,
          nextRepGoal: 8,
          result: "skipped",
          reason: "because effort feedback was not provided.",
          confidence: "low",
          reasonCodes: ["SKIPPED_MISSING_FEEDBACK"],
          evidence: []
        }),
        "Progression skipped because effort feedback was not provided."
      );
    }
  },
  {
    name: "Workout summary displays recalibration feedback returned by backend",
    run: () => {
      const summary: CompleteWorkoutSessionResponse = {
        workoutSession: createWorkout(),
        progressionUpdates: [
          {
            exerciseId: "exercise-1",
            exerciseName: "Bench Press",
            previousWeight: { value: 135, unit: "lb" },
            nextWeight: { value: 215, unit: "lb" },
            previousRepGoal: 8,
            nextRepGoal: 8,
            result: "recalibrated",
            reason: "Adjusted Bench Press working weight based on your performance.",
            confidence: "medium",
            reasonCodes: ["RECALIBRATED"],
            evidence: []
          }
        ],
        progressMetrics: [],
        nextWorkoutTemplate: null
      };

      assert.equal(getWorkoutSummaryHeadline(summary), "1 lift recalibrated");
      assert.equal(
        getWorkoutSummaryEncouragement(summary),
        "Adjusted Bench Press to 215 lb based on your performance."
      );
      assert.equal(getProgressionUpdateSummaryText(summary.progressionUpdates[0]!), "Adjusted to 215 lb next time");
      assert.equal(getWorkoutSummaryOutcomes(summary)[3]?.detail, "lift recalibrated");
    }
  }
  ,
  {
    name: "Workout summary builds a review item for rep-overperformance recalibration updates",
    run: () => {
      const summary: CompleteWorkoutSessionResponse = {
        workoutSession: {
          ...createWorkout(),
          exercises: [
            {
              ...createWorkout().exercises[0]!,
              targetReps: 8,
              targetWeight: { value: 135, unit: "lb" },
              sets: [
                {
                  id: "set-1",
                  exerciseEntryId: "entry-1",
                  setNumber: 1,
                  targetReps: 8,
                  actualReps: 40,
                  targetWeight: { value: 135, unit: "lb" },
                  actualWeight: { value: 135, unit: "lb" },
                  status: "completed",
                  completedAt: "2026-04-24T10:10:00.000Z"
                }
              ]
            }
          ]
        },
        progressionUpdates: [
          {
            exerciseId: "exercise-1",
            exerciseName: "Bench Press",
            previousWeight: { value: 135, unit: "lb" },
            nextWeight: { value: 235, unit: "lb" },
            previousRepGoal: 8,
            nextRepGoal: 8,
            result: "recalibrated",
            reason: "Recalibrated because reps greatly exceeded the target at the prescribed weight.",
            confidence: "medium",
            reasonCodes: ["RECALIBRATED", "REPS_GREATLY_EXCEEDED_TARGET"],
            evidence: ["Reps greatly exceeded target"]
          }
        ],
        progressMetrics: [],
        nextWorkoutTemplate: null
      };

      const items = getUnusualProgressionReviewItems(summary);
      assert.equal(items.length, 1);
      assert.equal(items[0]?.exerciseName, "Bench Press");
      assert.match(items[0]?.message ?? "", /far more reps than prescribed/i);
      assert.ok(items[0]?.evidence.some((line) => /Logged best: 40 reps/i.test(line)));
    }
  },
  {
    name: "Workout summary shows cautious label for medium-confidence rep-overperformance recalibration",
    run: () => {
      assert.equal(
        getProgressionUpdateConfidenceDisplay({
          update: {
            exerciseId: "exercise-1",
            exerciseName: "Bench Press",
            previousWeight: { value: 135, unit: "lb" },
            nextWeight: { value: 235, unit: "lb" },
            previousRepGoal: 8,
            nextRepGoal: 8,
            result: "recalibrated",
            reason: "Recalibrated because reps greatly exceeded the target at the prescribed weight.",
            confidence: "medium",
            reasonCodes: ["RECALIBRATED", "REPS_GREATLY_EXCEEDED_TARGET"],
            evidence: []
          }
        }),
        "Cautious"
      );
    }
  },
  {
    name: "Workout summary does not crash when rep-overperformance evidence fields are missing",
    run: () => {
      const summary: CompleteWorkoutSessionResponse = {
        workoutSession: createWorkout(),
        progressionUpdates: [
          {
            exerciseId: "exercise-1",
            exerciseName: "Bench Press",
            previousWeight: { value: 135, unit: "lb" },
            nextWeight: { value: 235, unit: "lb" },
            previousRepGoal: 8,
            nextRepGoal: 8,
            result: "recalibrated",
            reason: "Recalibrated because reps greatly exceeded the target at the prescribed weight.",
            confidence: "medium",
            reasonCodes: ["RECALIBRATED", "REPS_GREATLY_EXCEEDED_TARGET"],
            evidence: null as any
          }
        ],
        progressMetrics: [],
        nextWorkoutTemplate: null
      };

      const items = getUnusualProgressionReviewItems(summary);
      assert.equal(items.length, 1);
      assert.ok(Array.isArray(items[0]?.evidence));
    }
  }
];
