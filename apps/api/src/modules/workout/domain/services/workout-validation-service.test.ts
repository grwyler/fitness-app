import assert from "node:assert/strict";
import { WorkoutDomainError } from "../errors/workout-domain.error.js";
import type { DomainTestCase } from "../test-helpers/test-case.js";
import { WorkoutValidationService } from "./workout-validation-service.js";

const validationService = new WorkoutValidationService();

export const workoutValidationServiceTestCases: DomainTestCase[] = [
  {
    name: "WorkoutValidationService allows logging a pending set for an in-progress session",
    run: () => {
      assert.doesNotThrow(() =>
        validationService.assertSetCanBeLogged({
          workoutSessionStatus: "in_progress",
          setStatus: "pending"
        })
      );
    }
  },
  {
    name: "WorkoutValidationService rejects set logging when the session is not in progress",
    run: () => {
      assert.throws(
        () =>
          validationService.assertSetCanBeLogged({
            workoutSessionStatus: "completed",
            setStatus: "pending"
          }),
        WorkoutDomainError
      );
    }
  },
  {
    name: "WorkoutValidationService rejects set logging when the set is already logged",
    run: () => {
      assert.throws(
        () =>
          validationService.assertSetCanBeLogged({
            workoutSessionStatus: "in_progress",
            setStatus: "completed"
          }),
        WorkoutDomainError
      );
    }
  },
  {
    name: "WorkoutValidationService allows workout completion when all sets are resolved and all feedback exists",
    run: () => {
      assert.doesNotThrow(() =>
        validationService.assertWorkoutCanBeCompleted({
          workoutSessionStatus: "in_progress",
          exercises: [
            {
              exerciseEntryId: "entry-1",
              setStatuses: ["completed", "failed", "completed"]
            }
          ],
          exerciseFeedback: {
            "entry-1": "just_right"
          }
        })
      );
    }
  },
  {
    name: "WorkoutValidationService rejects workout completion when any set is still pending",
    run: () => {
      assert.throws(
        () =>
          validationService.assertWorkoutCanBeCompleted({
            workoutSessionStatus: "in_progress",
            exercises: [
              {
                exerciseEntryId: "entry-1",
                setStatuses: ["completed", "pending"]
              }
            ],
            exerciseFeedback: {
              "entry-1": "just_right"
            }
          }),
        WorkoutDomainError
      );
    }
  },
  {
    name: "WorkoutValidationService rejects workout completion when exercise feedback is missing",
    run: () => {
      assert.throws(
        () =>
          validationService.assertWorkoutCanBeCompleted({
            workoutSessionStatus: "in_progress",
            exercises: [
              {
                exerciseEntryId: "entry-1",
                setStatuses: ["completed", "completed"]
              }
            ],
            exerciseFeedback: {}
          }),
        WorkoutDomainError
      );
    }
  }
];
