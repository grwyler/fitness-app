import type {
  AddCustomWorkoutExerciseRequest,
  CreateCustomProgramRequest,
  ExerciseCatalogItemDto,
  PredefinedWorkoutCategory,
  ProgramDto,
  ProgramWorkoutTemplateDto,
  WorkoutSessionDto
} from "@fitness/shared";
import { predefinedWorkoutCategories } from "./dashboard-program.shared";

export const CUSTOM_WORKOUT_BUILDER_PREFIX = "custom-builder:";

export type AssignableWorkoutSource = "predefined" | "custom";

export type AssignableWorkoutChoice = {
  id: string;
  source: AssignableWorkoutSource;
  category: PredefinedWorkoutCategory | "Your Workouts";
  programId: string;
  programName: string;
  workout: ProgramWorkoutTemplateDto;
};

export type AssignableWorkoutGroup = {
  title: string;
  source: AssignableWorkoutSource;
  workouts: AssignableWorkoutChoice[];
};

export type ProgramDayAssignment = {
  dayNumber: number;
  workout: ProgramWorkoutTemplateDto | null;
};

export type BuildAssignedProgramRequestResult =
  | {
      request: CreateCustomProgramRequest;
      error: null;
    }
  | {
      request: null;
      error: string;
    };

export function createProgramDayAssignments(daysPerWeek: number): ProgramDayAssignment[] {
  return Array.from({ length: daysPerWeek }, (_, index) => ({
    dayNumber: index + 1,
    workout: null
  }));
}

export function resizeProgramDayAssignments(input: {
  current: ProgramDayAssignment[];
  daysPerWeek: number;
}): ProgramDayAssignment[] {
  return Array.from({ length: input.daysPerWeek }, (_, index) => {
    const existing = input.current[index];
    return {
      dayNumber: index + 1,
      workout: existing?.workout ?? null
    };
  });
}

export function getAssignableWorkoutChoices(programs: ProgramDto[]): AssignableWorkoutChoice[] {
  return programs.flatMap((program) =>
    [...program.workouts]
      .sort((left, right) => left.sequenceOrder - right.sequenceOrder)
      .filter((workout) => workout.exercises.length > 0)
      .map((workout) => ({
        id: `${program.id}:${workout.id}`,
        source: program.source === "custom" ? "custom" : "predefined",
        category: program.source === "custom" ? "Your Workouts" : workout.category,
        programId: program.id,
        programName: program.name,
        workout
      }))
  );
}

export function groupAssignableWorkoutChoices(
  choices: AssignableWorkoutChoice[]
): AssignableWorkoutGroup[] {
  const customChoices = choices
    .filter((choice) => choice.source === "custom")
    .sort(compareAssignableWorkoutChoices);
  const predefinedChoices = choices.filter((choice) => choice.source === "predefined");

  return [
    ...(customChoices.length > 0
      ? [
          {
            title: "Your Workouts",
            source: "custom" as const,
            workouts: customChoices
          }
        ]
      : []),
    ...predefinedWorkoutCategories
      .map((category) => ({
        title: category,
        source: "predefined" as const,
        workouts: predefinedChoices
          .filter((choice) => choice.category === category)
          .sort(compareAssignableWorkoutChoices)
      }))
      .filter((group) => group.workouts.length > 0)
  ];
}

export function getAssignableWorkoutDescription(choice: AssignableWorkoutChoice) {
  return `${choice.workout.exercises.length} exercise${
    choice.workout.exercises.length === 1 ? "" : "s"
  }`;
}

export function buildAssignedProgramRequest(input: {
  name: string;
  days: ProgramDayAssignment[];
}): BuildAssignedProgramRequestResult {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) {
    return {
      request: null,
      error: "Program name is required."
    };
  }

  if (input.days.length === 0) {
    return {
      request: null,
      error: "Select at least one day per week."
    };
  }

  const missingDay = input.days.find((day) => !day.workout);
  if (missingDay) {
    return {
      request: null,
      error: `Choose a workout for Day ${missingDay.dayNumber}.`
    };
  }

  return {
    request: {
      name,
      workouts: input.days.map((day) => {
        const workout = day.workout!;

        return {
          name: `Day ${day.dayNumber}: ${workout.name}`,
          exercises: [...workout.exercises]
            .sort((left, right) => left.sequenceOrder - right.sequenceOrder)
            .map((exercise) => ({
              exerciseId: exercise.exerciseId,
              targetSets: exercise.targetSets,
              targetReps: exercise.targetReps,
              ...(exercise.repRangeMin != null && exercise.repRangeMax != null && exercise.repRangeMax > exercise.repRangeMin
                ? { repRangeMin: exercise.repRangeMin, repRangeMax: exercise.repRangeMax }
                : {}),
              ...(exercise.restSeconds !== null ? { restSeconds: exercise.restSeconds } : {})
            }))
        };
      })
    },
    error: null
  };
}

export function buildProgramDayWorkoutFromCustomSession(input: {
  workout: WorkoutSessionDto;
  name?: string;
}): ProgramWorkoutTemplateDto {
  const name = input.name?.trim().replace(/\s+/g, " ") || input.workout.workoutName;

  return {
    id: `custom-session:${input.workout.id}`,
    name,
    category: "Full Body",
    sequenceOrder: 1,
    estimatedDurationMinutes: null,
    exercises: [...input.workout.exercises]
      .sort((left, right) => left.sequenceOrder - right.sequenceOrder)
      .map((exercise) => ({
        id: `custom-session:${input.workout.id}:${exercise.id}`,
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        category: exercise.category,
        sequenceOrder: exercise.sequenceOrder,
        targetSets: exercise.targetSets,
        targetReps: exercise.targetReps,
        ...(exercise.repRangeMin != null && exercise.repRangeMax != null && exercise.repRangeMax > exercise.repRangeMin
          ? { repRangeMin: exercise.repRangeMin, repRangeMax: exercise.repRangeMax }
          : {}),
        restSeconds: exercise.restSeconds
      }))
  };
}

export function buildProgramDayWorkoutFromExerciseSelection(input: {
  exercises: ExerciseCatalogItemDto[];
  name?: string;
  targetSets: number;
  targetReps: number;
}): ProgramWorkoutTemplateDto {
  const name = input.name?.trim().replace(/\s+/g, " ") || "Custom Workout";
  const workoutIdSuffix = input.exercises.map((exercise) => exercise.id).join(":") || "empty";

  return {
    id: `${CUSTOM_WORKOUT_BUILDER_PREFIX}${workoutIdSuffix}`,
    name,
    category: "Full Body",
    sequenceOrder: 1,
    estimatedDurationMinutes: null,
    exercises: input.exercises.map((exercise, index) => ({
      id: `${CUSTOM_WORKOUT_BUILDER_PREFIX}${exercise.id}`,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      category: exercise.category,
      sequenceOrder: index + 1,
      targetSets: input.targetSets,
      targetReps: input.targetReps,
      restSeconds: null
    }))
  };
}

export function isProgramDayWorkoutBuilderWorkout(workout: ProgramWorkoutTemplateDto | null | undefined) {
  return Boolean(workout?.id.startsWith(CUSTOM_WORKOUT_BUILDER_PREFIX));
}

export function buildCustomWorkoutExerciseRequestsFromProgramWorkout(
  workout: ProgramWorkoutTemplateDto
): AddCustomWorkoutExerciseRequest[] {
  return [...workout.exercises]
    .sort((left, right) => left.sequenceOrder - right.sequenceOrder)
    .map((exercise) => ({
      exerciseId: exercise.exerciseId,
      targetSets: exercise.targetSets,
      targetReps: exercise.targetReps,
      ...(exercise.repRangeMin != null && exercise.repRangeMax != null && exercise.repRangeMax > exercise.repRangeMin
        ? { repRangeMin: exercise.repRangeMin, repRangeMax: exercise.repRangeMax }
        : {}),
      ...(exercise.restSeconds !== null ? { restSeconds: exercise.restSeconds } : {})
    }));
}

function compareAssignableWorkoutChoices(
  left: AssignableWorkoutChoice,
  right: AssignableWorkoutChoice
) {
  const programDelta = left.programName.localeCompare(right.programName);
  if (programDelta !== 0) {
    return programDelta;
  }

  return left.workout.sequenceOrder - right.workout.sequenceOrder;
}
