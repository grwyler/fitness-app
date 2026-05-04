import assert from "node:assert/strict";
import type { WorkoutSessionDto } from "@fitness/shared";
import {
  buildCompleteWorkoutRequest,
  getFinishWorkoutPressAction,
  getLoggedSetUpdateErrorMessage,
  getWorkoutDiscardErrorMessage,
  getWorkoutCompletionErrorMessage,
  getWorkoutCompletionUiState
} from "../features/workout/utils/active-workout-screen.shared.js";
import { MobileApiError } from "../api/errors.js";
import type { MobileTestCase } from "./mobile-test-case.js";

function createWorkout(overrides?: {
  setStatuses?: Array<"pending" | "completed" | "failed">;
}): WorkoutSessionDto {
  const setStatuses = overrides?.setStatuses ?? ["completed", "pending", "pending"];

  return {
    id: "session-1",
    status: "in_progress",
    sessionType: "program",
    isPartial: false,
    programId: "program-1",
    workoutTemplateId: "template-1",
    programName: "Beginner Full Body V1",
    workoutName: "Workout A",
    startedAt: "2026-04-24T10:00:00.000Z",
    completedAt: null,
    durationSeconds: null,
    exercises: [
      {
        id: "entry-1",
        exerciseId: "exercise-1",
        exerciseName: "Bench Press",
        category: "compound",
        sequenceOrder: 1,
        targetSets: 3,
        targetReps: 8,
        targetWeight: {
          value: 135,
          unit: "lb"
        },
        restSeconds: 120,
        effortFeedback: null,
        completedAt: null,
        sets: setStatuses.map((status, index) => ({
          id: `set-${index + 1}`,
          exerciseEntryId: "entry-1",
          setNumber: index + 1,
          targetReps: 8,
          actualReps: status === "pending" ? null : 8,
          targetWeight: {
            value: 135,
            unit: "lb"
          },
          actualWeight:
            status === "pending"
              ? null
              : {
                  value: 135,
                  unit: "lb"
                },
          status,
          completedAt: status === "pending" ? null : "2026-04-24T10:10:00.000Z"
        }))
      }
    ]
  };
}

export const activeWorkoutScreenTestCases: MobileTestCase[] = [
  {
    name: "Active workout shows End Workout when planned work is incomplete",
    run: () => {
      const state = getWorkoutCompletionUiState(createWorkout(), {});

      assert.equal(state.finishButtonLabel, "End workout");
      assert.equal(state.finishButtonDisabled, false);
      assert.equal(state.hasPendingSets, true);
    }
  },
  {
    name: "Tapping End Workout with incomplete work opens confirmation",
    run: () => {
      const state = getWorkoutCompletionUiState(createWorkout(), {});
      const action = getFinishWorkoutPressAction({
        hasPendingSets: state.hasPendingSets,
        finishButtonDisabled: state.finishButtonDisabled
      });

      assert.equal(action, "show_finish_early_confirmation");
    }
  },
  {
    name: "Confirming early finish builds a partial completion request",
    run: () => {
      const request = buildCompleteWorkoutRequest(createWorkout(), {}, { finishEarly: true });

      assert.equal(request.finishEarly, true);
      assert.deepEqual(request.exerciseFeedback, []);
    }
  },
  {
    name: "Full completion keeps finish enabled with missing feedback (UI highlights on press)",
    run: () => {
      const workout = createWorkout({
        setStatuses: ["completed", "completed", "completed"]
      });
      const missingFeedbackState = getWorkoutCompletionUiState(workout, {});
      const completeFeedbackState = getWorkoutCompletionUiState(workout, {
        "entry-1": "just_right"
      });

      assert.equal(missingFeedbackState.finishButtonLabel, "Complete workout");
      assert.equal(missingFeedbackState.finishButtonDisabled, false);
      assert.equal(
        missingFeedbackState.footerMessage,
        "Rate effort for each exercise to unlock progression updates."
      );
      assert.equal(completeFeedbackState.finishButtonDisabled, false);
      assert.equal(
        getFinishWorkoutPressAction({
          hasPendingSets: completeFeedbackState.hasPendingSets,
          finishButtonDisabled: completeFeedbackState.finishButtonDisabled
        }),
        "complete_workout"
      );
      assert.equal(
        getFinishWorkoutPressAction({
          hasPendingSets: missingFeedbackState.hasPendingSets,
          finishButtonDisabled: missingFeedbackState.finishButtonDisabled
        }),
        "complete_workout"
      );
    }
  },
  {
    name: "Finish-early UI surfaces missing feedback count for completed exercises",
    run: () => {
      const workout: WorkoutSessionDto = {
        ...createWorkout({
          setStatuses: ["completed", "pending", "pending"]
        }),
        exercises: [
          {
            ...createWorkout({
              setStatuses: ["completed", "completed", "completed"]
            }).exercises[0]!,
            id: "entry-1",
            sets: createWorkout({
              setStatuses: ["completed", "completed", "completed"]
            }).exercises[0]!.sets.map((set) => ({
              ...set,
              exerciseEntryId: "entry-1"
            }))
          },
          {
            ...createWorkout({
              setStatuses: ["completed", "pending", "pending"]
            }).exercises[0]!,
            id: "entry-2",
            sets: createWorkout({
              setStatuses: ["completed", "pending", "pending"]
            }).exercises[0]!.sets.map((set) => ({
              ...set,
              id: `set-2-${set.setNumber}`,
              exerciseEntryId: "entry-2"
            }))
          }
        ]
      };
      const state = getWorkoutCompletionUiState(workout, {});

      assert.equal(state.finishButtonLabel, "End workout");
      assert.equal(state.finishButtonDisabled, false);
      assert.equal(state.missingEffortFeedbackCompletedExerciseCount, 1);
    }
  },
  {
    name: "Completion waits for in-flight set saves before allowing finish",
    run: () => {
      const workout = createWorkout({
        setStatuses: ["completed", "completed", "completed"]
      });
      const state = getWorkoutCompletionUiState(
        workout,
        {
          "entry-1": "just_right"
        },
        {
          hasPendingSetSave: true
        }
      );

      assert.equal(state.finishButtonLabel, "Complete workout");
      assert.equal(state.finishButtonDisabled, true);
      assert.equal(state.footerMessage, "Saving your last set before finishing.");
      assert.equal(
        getFinishWorkoutPressAction({
          hasPendingSets: state.hasPendingSets,
          finishButtonDisabled: state.finishButtonDisabled
        }),
        "blocked"
      );
    }
  },
  {
    name: "Completion errors are converted to visible copy",
    run: () => {
      assert.equal(getWorkoutCompletionErrorMessage(new Error("Workout not saved yet.")), "Workout not saved yet.");
      assert.equal(
        getWorkoutCompletionErrorMessage(null),
        "Workout not saved. Check your connection and try again."
      );
    }
  },
  {
    name: "Discard errors are converted to visible copy",
    run: () => {
      assert.equal(getWorkoutDiscardErrorMessage(new Error("Workout not discarded yet.")), "Workout not discarded yet.");
      assert.equal(
        getWorkoutDiscardErrorMessage(null),
        "Workout not discarded. Check your connection and try again."
      );
    }
  },
  {
    name: "Completed-workout read-only edits surface a clear message",
    run: () => {
      assert.equal(
        getLoggedSetUpdateErrorMessage(
          new MobileApiError({
            code: "COMPLETED_WORKOUT_READ_ONLY",
            message: "Completed workouts are read-only for now.",
            status: 409
          })
        ),
        "Completed workouts are read-only for now."
      );
    }
  },
  {
    name: "Empty custom workouts require an exercise before completion",
    run: () => {
      const state = getWorkoutCompletionUiState(
        {
          ...createWorkout({
            setStatuses: []
          }),
          sessionType: "custom",
          programName: "Custom Workout",
          workoutName: "Custom Workout",
          exercises: []
        },
        {}
      );

      assert.equal(state.hasPendingSets, false);
      assert.equal(state.finishButtonLabel, "Complete workout");
      assert.equal(state.finishButtonDisabled, true);
      assert.equal(state.footerMessage, "Add at least one exercise to continue.");
    }
  }
];
