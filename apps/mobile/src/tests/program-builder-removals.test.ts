import assert from "node:assert/strict";
import type { MobileTestCase } from "./mobile-test-case.js";
import { removeExerciseFromWorkoutTemplate } from "../features/workout/utils/program-builder-mutations.shared.js";
import type { ProgramWorkoutTemplateDto } from "@fitness/shared";

export const programBuilderRemovalsTestCases: MobileTestCase[] = [
  {
    name: "Remove exercise removes the selected entry and renumbers sequenceOrder",
    run: () => {
      const workout: ProgramWorkoutTemplateDto = {
        id: "w1",
        name: "Upper A",
        category: "Full Body",
        sequenceOrder: 1,
        estimatedDurationMinutes: null,
        exercises: [
          {
            id: "e1",
            exerciseId: "ex1",
            exerciseName: "Bench Press",
            category: "compound",
            loggingModality: "reps_load",
            sequenceOrder: 1,
            targetSets: 3,
            targetReps: 8,
            repTargetText: "8",
            repRangeMin: undefined,
            repRangeMax: undefined,
            targetWeight: undefined,
            targetDurationSeconds: null,
            targetDistanceMeters: null,
            targetRounds: null,
            restSeconds: null,
            progressionStrategy: null,
            setTargets: null,
            notes: undefined
          },
          {
            id: "e2",
            exerciseId: "ex2",
            exerciseName: "Row",
            category: "compound",
            loggingModality: "reps_load",
            sequenceOrder: 2,
            targetSets: 3,
            targetReps: 10,
            repTargetText: "10",
            repRangeMin: undefined,
            repRangeMax: undefined,
            targetWeight: undefined,
            targetDurationSeconds: null,
            targetDistanceMeters: null,
            targetRounds: null,
            restSeconds: null,
            progressionStrategy: null,
            setTargets: null,
            notes: undefined
          }
        ]
      };

      const next = removeExerciseFromWorkoutTemplate({ workout, entryId: "e1" });
      assert.equal(next.exercises.length, 1);
      assert.equal(next.exercises[0]?.id, "e2");
      assert.equal(next.exercises[0]?.sequenceOrder, 1);
    }
  },
  {
    name: "Removing the last exercise leaves the workout empty (does not null the workout)",
    run: () => {
      const workout: ProgramWorkoutTemplateDto = {
        id: "w1",
        name: "",
        category: "Full Body",
        sequenceOrder: 1,
        estimatedDurationMinutes: null,
        exercises: [
          {
            id: "e1",
            exerciseId: "ex1",
            exerciseName: "Bench Press",
            category: "compound",
            loggingModality: "reps_only",
            sequenceOrder: 1,
            targetSets: 3,
            targetReps: 8,
            repTargetText: "8",
            repRangeMin: undefined,
            repRangeMax: undefined,
            targetWeight: undefined,
            targetDurationSeconds: null,
            targetDistanceMeters: null,
            targetRounds: null,
            restSeconds: null,
            progressionStrategy: null,
            setTargets: null,
            notes: undefined
          }
        ]
      };

      const next = removeExerciseFromWorkoutTemplate({ workout, entryId: "e1" });
      assert.equal(next.id, workout.id);
      assert.equal(next.exercises.length, 0);
    }
  }
];
