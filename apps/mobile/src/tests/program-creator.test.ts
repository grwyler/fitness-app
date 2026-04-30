import assert from "node:assert/strict";
import type {
  ExerciseCatalogItemDto,
  ProgramDto,
  ProgramWorkoutTemplateDto,
  WorkoutSessionDto
} from "@fitness/shared";
import {
  buildAssignedProgramRequest,
  buildCustomWorkoutExerciseRequestsFromProgramWorkout,
  buildProgramDayWorkoutFromExerciseSelection,
  buildProgramDayWorkoutFromCustomSession,
  createProgramDayAssignments,
  getAssignableWorkoutDescription,
  getAssignableWorkoutChoices,
  groupAssignableWorkoutChoices
} from "../features/workout/utils/program-creator.shared.js";
import { getPlannedExerciseLines } from "../features/workout/utils/dashboard-program.shared.js";
import { getCustomExercisePickerActionLabel } from "../features/workout/utils/custom-workout-builder.shared.js";
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

const customWorkoutSession: WorkoutSessionDto = {
  id: "custom-session-1",
  status: "in_progress",
  sessionType: "custom",
  isPartial: false,
  programId: "custom-workout-program",
  workoutTemplateId: "custom-workout-template",
  programName: "Custom Workout",
  workoutName: "Custom Workout",
  startedAt: "2026-04-28T12:00:00.000Z",
  completedAt: null,
  durationSeconds: null,
  exercises: [
    {
      id: "session-entry-row",
      exerciseId: "exercise-row",
      exerciseName: "Barbell Row",
      category: "compound",
      sequenceOrder: 2,
      targetSets: 3,
      targetReps: 8,
      targetWeight: {
        value: 95,
        unit: "lb"
      },
      restSeconds: null,
      effortFeedback: null,
      completedAt: null,
      sets: []
    },
    {
      id: "session-entry-bench",
      exerciseId: "exercise-bench",
      exerciseName: "Bench Press",
      category: "compound",
      sequenceOrder: 1,
      targetSets: 3,
      targetReps: 8,
      targetWeight: {
        value: 135,
        unit: "lb"
      },
      restSeconds: null,
      effortFeedback: null,
      completedAt: null,
      sets: []
    }
  ]
};

const selectedExercises: ExerciseCatalogItemDto[] = [
  {
    id: "exercise-bench",
    name: "Bench Press",
    category: "compound",
    movementPattern: "horizontal_push",
    primaryMuscleGroup: "chest",
    equipmentType: "barbell",
    defaultTargetSets: 3,
    defaultTargetReps: 8,
    defaultStartingWeight: { value: 95, unit: "lb" },
    isBodyweight: false,
    isWeightOptional: false,
    isProgressionEligible: true
  },
  {
    id: "exercise-row",
    name: "Barbell Row",
    category: "compound",
    movementPattern: "horizontal_pull",
    primaryMuscleGroup: "back",
    equipmentType: "barbell",
    defaultTargetSets: 3,
    defaultTargetReps: 8,
    defaultStartingWeight: { value: 95, unit: "lb" },
    isBodyweight: false,
    isWeightOptional: false,
    isProgressionEligible: true
  },
  {
    id: "exercise-split-squat",
    name: "Split Squat",
    category: "compound",
    movementPattern: "squat",
    primaryMuscleGroup: "quads",
    equipmentType: "dumbbell",
    defaultTargetSets: 3,
    defaultTargetReps: 10,
    defaultStartingWeight: { value: 25, unit: "lb" },
    isBodyweight: false,
    isWeightOptional: false,
    isProgressionEligible: true
  }
];

export const programCreatorTestCases: MobileTestCase[] = [
  {
    name: "Custom workout picker keeps dashboard submit label in start mode",
    run: () => {
      assert.equal(
        getCustomExercisePickerActionLabel({
          selectedExerciseCount: 3,
          mode: "start"
        }),
        "Start with 3 exercises"
      );
    }
  },
  {
    name: "Custom workout picker uses program-day submit label in assignment mode",
    run: () => {
      assert.equal(
        getCustomExercisePickerActionLabel({
          selectedExerciseCount: 3,
          mode: "assignToProgramDay",
          programDayNumber: 1
        }),
        "Add to Day 1"
      );
    }
  },
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
    name: "Program creator workout picker descriptions describe workouts instead of source programs",
    run: () => {
      const [choice] = getAssignableWorkoutChoices([predefinedProgram]);

      assert.equal(choice?.programName, "4-Day Upper/Lower");
      assert.equal(getAssignableWorkoutDescription(choice!), "1 exercise");
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
  },
  {
    name: "Program creator converts a custom workout builder session into a program day workout",
    run: () => {
      const workout = buildProgramDayWorkoutFromCustomSession({
        workout: customWorkoutSession
      });

      assert.equal(workout.name, "Custom Workout");
      assert.deepEqual(
        workout.exercises.map((exercise) => exercise.exerciseName),
        ["Bench Press", "Barbell Row"]
      );
      assert.equal(workout.exercises[0]?.exerciseId, "exercise-bench");
      assert.equal(workout.exercises[1]?.exerciseId, "exercise-row");
    }
  },
  {
    name: "Program creator saves custom-built workout days with manually added exercises",
    run: () => {
      const [day] = createProgramDayAssignments(1);
      const customBuiltWorkout = buildProgramDayWorkoutFromCustomSession({
        workout: customWorkoutSession
      });
      const result = buildAssignedProgramRequest({
        name: "My Built Program",
        days: [{ ...day!, workout: customBuiltWorkout }]
      });

      assert.equal(result.error, null);
      assert.equal(result.request?.name, "My Built Program");
      assert.equal(result.request?.workouts[0]?.name, "Day 1: Custom Workout");
      assert.deepEqual(
        result.request?.workouts[0]?.exercises.map((exercise) => exercise.exerciseId),
        ["exercise-bench", "exercise-row"]
      );
      assert.equal(result.request?.workouts[0]?.exercises[0]?.targetSets, 3);
      assert.equal(result.request?.workouts[0]?.exercises[0]?.targetReps, 8);
    }
  },
  {
    name: "Program creator builds a program-day workout directly from selected exercises",
    run: () => {
      const workout = buildProgramDayWorkoutFromExerciseSelection({
        exercises: selectedExercises,
        name: "Day 1 Builder",
        targetSets: 3,
        targetReps: 8
      });

      assert.equal(workout.name, "Day 1 Builder");
      assert.deepEqual(
        workout.exercises.map((exercise) => exercise.exerciseName),
        ["Bench Press", "Barbell Row", "Split Squat"]
      );
      assert.equal(workout.exercises[0]?.targetSets, 3);
      assert.equal(workout.exercises[2]?.targetReps, 8);
    }
  },
  {
    name: "Assigned custom workout keeps exercise summary lines for the program day preview",
    run: () => {
      const customBuiltWorkout = buildProgramDayWorkoutFromExerciseSelection({
        exercises: selectedExercises,
        name: "Day 1 Builder",
        targetSets: 3,
        targetReps: 8
      });

      assert.deepEqual(getPlannedExerciseLines(customBuiltWorkout, 3), [
        "Bench Press: 3 x 8",
        "Barbell Row: 3 x 8",
        "Split Squat: 3 x 8"
      ]);
    }
  },
  {
    name: "Program creator uses optional custom workout name when assigning builder workout",
    run: () => {
      const [day] = createProgramDayAssignments(1);
      const customBuiltWorkout = buildProgramDayWorkoutFromExerciseSelection({
        exercises: selectedExercises,
        name: "  Bench and Rows  ",
        targetSets: 3,
        targetReps: 8
      });
      const result = buildAssignedProgramRequest({
        name: "Named Program",
        days: [{ ...day!, workout: customBuiltWorkout }]
      });

      assert.equal(customBuiltWorkout.name, "Bench and Rows");
      assert.equal(result.request?.workouts[0]?.name, "Day 1: Bench and Rows");
    }
  },
  {
    name: "Program creator can build custom-workout edit requests from a workout template",
    run: () => {
      const requests = buildCustomWorkoutExerciseRequestsFromProgramWorkout(customWorkout);

      assert.deepEqual(
        requests.map((request) => request.exerciseId),
        ["exercise-2"]
      );
      assert.equal(requests[0]?.targetSets, 4);
      assert.equal(requests[0]?.targetReps, 8);
    }
  }
];
