import assert from "node:assert/strict";
import type { ProgramDto, ProgramWorkoutTemplateDto } from "@fitness/shared";
import {
  buildAssignedProgramRequest,
  createProgramDayAssignments,
  getAssignableWorkoutChoices,
  groupAssignableWorkoutChoices
} from "../features/workout/utils/program-creator.shared.js";
import type { MobileTestCase } from "./mobile-test-case.js";

const predefinedWorkout: ProgramWorkoutTemplateDto = {
  id: "predefined-template-1",
  name: "Push Strength",
  category: "Push",
  sequenceOrder: 1,
  estimatedDurationMinutes: 55,
  exercises: [
    {
      id: "template-entry-1",
      exerciseId: "exercise-1",
      exerciseName: "Bench Press",
      category: "compound",
      sequenceOrder: 1,
      targetSets: 3,
      targetReps: 5,
      restSeconds: 120
    }
  ]
};

const customWorkout: ProgramWorkoutTemplateDto = {
  id: "custom-template-1",
  name: "My Pull Day",
  category: "Pull",
  sequenceOrder: 1,
  estimatedDurationMinutes: null,
  exercises: [
    {
      id: "custom-entry-1",
      exerciseId: "exercise-2",
      exerciseName: "Row",
      category: "compound",
      sequenceOrder: 1,
      targetSets: 4,
      targetReps: 8,
      restSeconds: null
    }
  ]
};

const predefinedProgram: ProgramDto = {
  id: "program-predefined",
  source: "predefined",
  name: "4-Day Upper/Lower",
  description: "Balanced weekly plan.",
  daysPerWeek: 4,
  sessionDurationMinutes: 55,
  difficultyLevel: "beginner",
  workouts: [predefinedWorkout]
};

const customProgram: ProgramDto = {
  id: "program-custom",
  source: "custom",
  name: "My Saved Program",
  description: null,
  daysPerWeek: 1,
  sessionDurationMinutes: 60,
  difficultyLevel: "beginner",
  workouts: [customWorkout]
};

export const programCreatorTestCases: MobileTestCase[] = [
  {
    name: "Program creator lists predefined workouts by category",
    run: () => {
      const groups = groupAssignableWorkoutChoices(getAssignableWorkoutChoices([predefinedProgram]));

      assert.deepEqual(
        groups.map((group) => group.title),
        ["Push"]
      );
      assert.equal(groups[0]?.workouts[0]?.workout.name, "Push Strength");
    }
  },
  {
    name: "Program creator lists reusable custom program workouts under Your Workouts",
    run: () => {
      const groups = groupAssignableWorkoutChoices(
        getAssignableWorkoutChoices([predefinedProgram, customProgram])
      );

      assert.equal(groups[0]?.title, "Your Workouts");
      assert.equal(groups[0]?.workouts[0]?.source, "custom");
      assert.equal(groups[0]?.workouts[0]?.workout.name, "My Pull Day");
    }
  },
  {
    name: "Program creator saves assigned predefined workout days",
    run: () => {
      const [day] = createProgramDayAssignments(1);
      const result = buildAssignedProgramRequest({
        name: "My Assigned Program",
        days: [{ ...day!, workout: predefinedWorkout }]
      });

      assert.equal(result.error, null);
      assert.equal(result.request?.name, "My Assigned Program");
      assert.equal(result.request?.workouts[0]?.name, "Day 1: Push Strength");
      assert.equal(result.request?.workouts[0]?.exercises[0]?.exerciseId, "exercise-1");
      assert.equal(result.request?.workouts[0]?.exercises[0]?.targetSets, 3);
    }
  },
  {
    name: "Program creator saves assigned user-created workout days when reusable templates exist",
    run: () => {
      const [day] = createProgramDayAssignments(1);
      const result = buildAssignedProgramRequest({
        name: "My Custom Mix",
        days: [{ ...day!, workout: customWorkout }]
      });

      assert.equal(result.error, null);
      assert.equal(result.request?.workouts[0]?.name, "Day 1: My Pull Day");
      assert.equal(result.request?.workouts[0]?.exercises[0]?.exerciseId, "exercise-2");
      assert.equal(result.request?.workouts[0]?.exercises[0]?.targetReps, 8);
    }
  }
];
