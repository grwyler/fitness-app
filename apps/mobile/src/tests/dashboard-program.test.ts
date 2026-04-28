import assert from "node:assert/strict";
import type { ActiveProgramDto, ProgramWorkoutTemplateDto } from "@fitness/shared";
import {
  findProgramWorkoutById,
  getHiddenExerciseCount,
  getNextProgramPositionLabel,
  getPlannedExerciseLines,
  getProgramWorkoutPositionLabel,
  getProgramWorkouts,
  getWorkoutIntentSummary
} from "../features/workout/utils/dashboard-program.shared.js";
import type { MobileTestCase } from "./mobile-test-case.js";

const workoutA: ProgramWorkoutTemplateDto = {
  id: "template-1",
  name: "Workout A",
  sequenceOrder: 1,
  estimatedDurationMinutes: 60,
  exercises: [
    {
      id: "entry-1",
      exerciseId: "exercise-1",
      exerciseName: "Bench Press",
      category: "compound",
      sequenceOrder: 2,
      targetSets: 3,
      targetReps: 8,
      restSeconds: 120
    },
    {
      id: "entry-2",
      exerciseId: "exercise-2",
      exerciseName: "Back Squat",
      category: "compound",
      sequenceOrder: 1,
      targetSets: 3,
      targetReps: 8,
      restSeconds: 120
    },
    {
      id: "entry-3",
      exerciseId: "exercise-3",
      exerciseName: "Bicep Curl",
      category: "accessory",
      sequenceOrder: 3,
      targetSets: 3,
      targetReps: 8,
      restSeconds: 75
    }
  ]
};

const workoutB: ProgramWorkoutTemplateDto = {
  id: "template-2",
  name: "Workout B",
  sequenceOrder: 2,
  estimatedDurationMinutes: 55,
  exercises: [
    {
      id: "entry-4",
      exerciseId: "exercise-4",
      exerciseName: "Overhead Press",
      category: "compound",
      sequenceOrder: 1,
      targetSets: 3,
      targetReps: 8,
      restSeconds: 120
    }
  ]
};

function createActiveProgram(overrides?: {
  completedWorkoutCount?: number;
  daysPerWeek?: number;
}): ActiveProgramDto {
  return {
    enrollmentId: "enrollment-1",
    program: {
      id: "program-1",
      name: "Beginner Full Body V1",
      description: "Three full-body sessions per week.",
      daysPerWeek: overrides?.daysPerWeek ?? 3,
      sessionDurationMinutes: 60,
      difficultyLevel: "beginner",
      workouts: [workoutB, workoutA]
    },
    status: "active",
    startedAt: "2026-04-01T00:00:00.000Z",
    completedAt: null,
    nextWorkoutTemplate: {
      id: "template-1",
      name: "Workout A",
      sequenceOrder: 1,
      estimatedDurationMinutes: 60
    },
    completedWorkoutCount: overrides?.completedWorkoutCount ?? 0,
    currentPosition: {
      workoutNumber: (overrides?.completedWorkoutCount ?? 0) + 1,
      weekNumber:
        overrides?.daysPerWeek === 0
          ? null
          : Math.floor((overrides?.completedWorkoutCount ?? 0) / (overrides?.daysPerWeek ?? 3)) + 1,
      dayNumber:
        overrides?.daysPerWeek === 0
          ? null
          : ((overrides?.completedWorkoutCount ?? 0) % (overrides?.daysPerWeek ?? 3)) + 1,
      label:
        overrides?.daysPerWeek === 0
          ? `Workout ${(overrides?.completedWorkoutCount ?? 0) + 1}`
          : `Week ${
              Math.floor((overrides?.completedWorkoutCount ?? 0) / (overrides?.daysPerWeek ?? 3)) + 1
            } · Day ${((overrides?.completedWorkoutCount ?? 0) % (overrides?.daysPerWeek ?? 3)) + 1}`
    }
  };
}

export const dashboardProgramTestCases: MobileTestCase[] = [
  {
    name: "Dashboard program label derives next week and day from completed count",
    run: () => {
      assert.equal(getNextProgramPositionLabel(createActiveProgram()), "Week 1 · Day 1");
      assert.equal(
        getNextProgramPositionLabel(createActiveProgram({ completedWorkoutCount: 2 })),
        "Week 1 · Day 3"
      );
      assert.equal(
        getNextProgramPositionLabel(createActiveProgram({ completedWorkoutCount: 3 })),
        "Week 2 · Day 1"
      );
    }
  },
  {
    name: "Dashboard program label falls back to workout count when days per week is unavailable",
    run: () => {
      assert.equal(
        getNextProgramPositionLabel(
          createActiveProgram({
            completedWorkoutCount: 4,
            daysPerWeek: 0
          })
        ),
        "Workout 5"
      );
    }
  },
  {
    name: "Dashboard workout intent summarizes planned exercises and targets",
    run: () => {
      const workout = findProgramWorkoutById({
        activeProgram: createActiveProgram(),
        workoutTemplateId: "template-1"
      });

      assert.equal(workout?.name, "Workout A");
      assert.equal(getWorkoutIntentSummary(workout), "3 exercises - 9 sets total - 3 x 8 each");
      assert.deepEqual(getPlannedExerciseLines(workout, 2), [
        "Back Squat: 3 x 8",
        "Bench Press: 3 x 8"
      ]);
      assert.equal(getHiddenExerciseCount(workout, 2), 1);
    }
  },
  {
    name: "Dashboard workout picker helpers sort workouts and label program positions",
    run: () => {
      const activeProgram = createActiveProgram();
      const workouts = getProgramWorkouts(activeProgram);

      assert.deepEqual(
        workouts.map((workout) => workout.id),
        ["template-1", "template-2"]
      );
      assert.equal(
        getProgramWorkoutPositionLabel({
          activeProgram,
          workout: workoutB
        }),
        "Week 1 · Day 2"
      );
    }
  }
];
