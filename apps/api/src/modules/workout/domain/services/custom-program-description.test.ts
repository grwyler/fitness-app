import assert from "node:assert/strict";
import { generateCustomProgramDescription } from "./custom-program-description.js";
import type { DomainTestCase } from "../test-helpers/test-case.js";

export const customProgramDescriptionTestCases: DomainTestCase[] = [
  {
    name: "Custom program description falls back when there are no exercises",
    run: () => {
      assert.equal(generateCustomProgramDescription({ templates: [] }), "Custom program.");
      assert.equal(generateCustomProgramDescription({ templates: [{ exercises: [] }] }), "Custom program.");
    }
  },
  {
    name: "Custom program description generates a push-focused workout sentence for a single workout",
    run: () => {
      const description = generateCustomProgramDescription({
        templates: [
          {
            exercises: [
              { targetReps: 8, exercise: { name: "Bench Press", primaryMuscleGroup: "chest", movementPattern: "push" } },
              { targetReps: 10, exercise: { name: "Overhead Press", primaryMuscleGroup: "shoulders", movementPattern: "push" } },
              { targetReps: 12, exercise: { name: "Tricep Pushdown", primaryMuscleGroup: "triceps", movementPattern: "push" } }
            ]
          }
        ]
      });

      assert.ok(description.toLowerCase().includes("push-focused workout"));
      assert.ok(description.length <= 160);
    }
  },
  {
    name: "Custom program description includes workout count for multi-workout programs",
    run: () => {
      const description = generateCustomProgramDescription({
        templates: [
          {
            exercises: [{ targetReps: 5, exercise: { name: "Squat", primaryMuscleGroup: "quads", movementPattern: "squat" } }]
          },
          {
            exercises: [{ targetReps: 5, exercise: { name: "Bench Press", primaryMuscleGroup: "chest", movementPattern: "push" } }]
          },
          {
            exercises: [{ targetReps: 5, exercise: { name: "Row", primaryMuscleGroup: "back", movementPattern: "pull" } }]
          }
        ]
      });

      assert.ok(description.startsWith("3-workout custom program"));
      assert.ok(description.length <= 160);
    }
  },
  {
    name: "Custom program description preserves a safe fallback when metadata is unknown",
    run: () => {
      const description = generateCustomProgramDescription({
        templates: [
          {
            exercises: [
              { targetReps: 8, exercise: { name: "Exercise A", primaryMuscleGroup: null, movementPattern: null } },
              { targetReps: 8, exercise: { name: "Exercise B", primaryMuscleGroup: null, movementPattern: null } }
            ]
          }
        ]
      });

      assert.ok(description.length > 0);
      assert.ok(description.length <= 160);
    }
  }
];

