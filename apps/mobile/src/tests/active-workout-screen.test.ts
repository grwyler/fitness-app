import assert from "node:assert/strict";
import type { WorkoutSessionDto } from "@fitness/shared";
import {
  buildCompleteWorkoutRequest,
  getFinishWorkoutPressAction,
  getWorkoutCompletionErrorMessage,
  getWorkoutCompletionUiState
} from "../features/workout/utils/active-workout-screen.shared.js";
import type { MobileTestCase } from "./mobile-test-case.js";

function createWorkout(overrides?: {
  setStatuses?: Array<"pending" | "completed" | "failed">;
}): WorkoutSessionDto {
  const setStatuses = overrides?.setStatuses ?? ["completed", "pending", "pending"];

  return {
    id: "session-1",
    status: "in_progress",
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
    name: "Full completion behavior still requires feedback before enabling completion",
    run: () => {
      const workout = createWorkout({
        setStatuses: ["completed", "completed", "completed"]
      });
      const missingFeedbackState = getWorkoutCompletionUiState(workout, {});
      const completeFeedbackState = getWorkoutCompletionUiState(workout, {
        "entry-1": "just_right"
      });

      assert.equal(missingFeedbackState.finishButtonLabel, "Complete workout");
      assert.equal(missingFeedbackState.finishButtonDisabled, true);
      assert.equal(completeFeedbackState.finishButtonDisabled, false);
      assert.equal(
        getFinishWorkoutPressAction({
          hasPendingSets: completeFeedbackState.hasPendingSets,
          finishButtonDisabled: completeFeedbackState.finishButtonDisabled
        }),
        "complete_workout"
      );
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
  }
];
