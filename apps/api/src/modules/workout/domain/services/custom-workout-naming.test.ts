import assert from "node:assert/strict";
import { generateCustomWorkoutNameFromExercises } from "@fitness/shared";
import type { DomainTestCase } from "../test-helpers/test-case.js";

export const customWorkoutNamingTestCases: DomainTestCase[] = [
  {
    name: "Custom workout naming returns null when there are no exercises",
    run: () => {
      assert.equal(generateCustomWorkoutNameFromExercises([]), null);
    }
  },
  {
    name: "Custom workout naming uses 'Bench Press Workout' for one exercise",
    run: () => {
      assert.equal(
        generateCustomWorkoutNameFromExercises([
          { name: "Bench Press", primaryMuscleGroup: "chest", movementPattern: "push", category: "compound" }
        ]),
        "Bench Press Workout"
      );
    }
  },
  {
    name: "Custom workout naming uses 'Bench Press + Row' for two exercises",
    run: () => {
      assert.equal(
        generateCustomWorkoutNameFromExercises([
          { name: "Bench Press", primaryMuscleGroup: "chest" },
          { name: "Row", primaryMuscleGroup: "back" }
        ]),
        "Bench Press + Row"
      );
    }
  },
  {
    name: "Custom workout naming avoids repeating duplicate exercise names",
    run: () => {
      assert.equal(
        generateCustomWorkoutNameFromExercises([
          { name: "Bench Press", primaryMuscleGroup: "chest" },
          { name: "Bench Press", primaryMuscleGroup: "chest" },
          { name: "Row", primaryMuscleGroup: "back" }
        ]),
        "Bench Press + Row"
      );
    }
  },
  {
    name: "Custom workout naming prefers category titles for push-dominant workouts",
    run: () => {
      assert.equal(
        generateCustomWorkoutNameFromExercises([
          { name: "Bench Press", primaryMuscleGroup: "chest" },
          { name: "Overhead Press", primaryMuscleGroup: "shoulders" },
          { name: "Tricep Pushdown", primaryMuscleGroup: "triceps" }
        ]),
        "Push Workout"
      );
    }
  },
  {
    name: "Custom workout naming prefers 'Leg Day' for leg-dominant workouts",
    run: () => {
      assert.equal(
        generateCustomWorkoutNameFromExercises([
          { name: "Squat", primaryMuscleGroup: "quads" },
          { name: "Leg Curl", primaryMuscleGroup: "hamstrings" },
          { name: "Calf Raise", primaryMuscleGroup: "calves" }
        ]),
        "Leg Day"
      );
    }
  },
  {
    name: "Custom workout naming falls back to a compact exercise list when metadata is unknown",
    run: () => {
      assert.equal(
        generateCustomWorkoutNameFromExercises([
          { name: "Bench Press" },
          { name: "Row" },
          { name: "Deadlift" },
          { name: "Curl" }
        ]),
        "Bench Press + Row + 2 more"
      );
    }
  }
];

