import type {
  ActiveProgramDto,
  PredefinedWorkoutCategory,
  ProgramDto,
  ProgramWorkoutTemplateDto
} from "@fitness/shared";

export const predefinedWorkoutCategories: PredefinedWorkoutCategory[] = [
  "Push",
  "Pull",
  "Legs",
  "Full Body",
  "Quick"
];

export type PredefinedWorkoutChoice = {
  id: string;
  category: PredefinedWorkoutCategory;
  programId: string;
  programName: string;
  positionLabel: string;
  workout: ProgramWorkoutTemplateDto;
};

export type PredefinedWorkoutCategoryGroup = {
  category: PredefinedWorkoutCategory;
  workouts: PredefinedWorkoutChoice[];
};

export type CurrentProgramWorkoutChoice = {
  id: string;
  positionLabel: string;
  workout: ProgramWorkoutTemplateDto;
};

export function getProgramWorkoutDayLabel(input: {
  activeProgram: ActiveProgramDto | null | undefined;
  workout: ProgramWorkoutTemplateDto;
}) {
  const workoutIndex = getProgramWorkouts(input.activeProgram).findIndex(
    (workout) => workout.id === input.workout.id
  );
  const workoutNumber = workoutIndex >= 0 ? workoutIndex + 1 : input.workout.sequenceOrder;
  const daysPerWeek = input.activeProgram?.program.daysPerWeek ?? 0;

  if (!Number.isInteger(daysPerWeek) || daysPerWeek <= 0) {
    return `Workout ${workoutNumber}`;
  }

  return `Day ${((workoutNumber - 1) % daysPerWeek) + 1}`;
}

export type DashboardPrimarySection = "currentProgram" | "programSetup" | "startWorkout";

export function getDashboardPrimarySectionOrder(input: {
  hasActiveProgram: boolean;
}): DashboardPrimarySection[] {
  return [input.hasActiveProgram ? "currentProgram" : "programSetup", "startWorkout"];
}

export function getProgramSectionActionLabels(input: { hasActiveProgram: boolean }) {
  return input.hasActiveProgram
    ? ["Change Program", "Create Program"]
    : ["Choose Program", "Create Program"];
}

export function getNextProgramPositionLabel(activeProgram: ActiveProgramDto | null | undefined) {
  if (!activeProgram) {
    return null;
  }

  if (activeProgram.currentPosition?.label) {
    return activeProgram.currentPosition.label;
  }

  const completedWorkoutCount = Math.max(0, activeProgram.completedWorkoutCount);
  const daysPerWeek = activeProgram.program.daysPerWeek;
  const nextWorkoutNumber = completedWorkoutCount + 1;

  if (!Number.isInteger(daysPerWeek) || daysPerWeek <= 0) {
    return `Workout ${nextWorkoutNumber}`;
  }

  const week = Math.floor(completedWorkoutCount / daysPerWeek) + 1;
  const day = (completedWorkoutCount % daysPerWeek) + 1;

  return `Week ${week} • Day ${day}`;
}

export function findProgramWorkoutById(input: {
  activeProgram: ActiveProgramDto | null | undefined;
  workoutTemplateId: string | null | undefined;
}): ProgramWorkoutTemplateDto | null {
  if (!input.activeProgram || !input.workoutTemplateId) {
    return null;
  }

  return (
    input.activeProgram.program.workouts.find((workout) => workout.id === input.workoutTemplateId) ??
    null
  );
}

export function getProgramWorkouts(activeProgram: ActiveProgramDto | null | undefined) {
  if (!activeProgram) {
    return [];
  }

  return [...activeProgram.program.workouts].sort(
    (left, right) => left.sequenceOrder - right.sequenceOrder
  );
}

export function getCurrentProgramWorkoutChoices(
  activeProgram: ActiveProgramDto | null | undefined
): CurrentProgramWorkoutChoice[] {
  return getProgramWorkouts(activeProgram).map((workout) => ({
    id: workout.id,
    positionLabel: getProgramWorkoutDayLabel({
      activeProgram,
      workout
    }),
    workout
  }));
}

export function getPredefinedWorkoutChoices(input: {
  activeProgram: ActiveProgramDto | null | undefined;
  programs: ProgramDto[];
}): PredefinedWorkoutChoice[] {
  const choicesById = new Map<string, PredefinedWorkoutChoice>();

  if (input.activeProgram?.program.source === "predefined") {
    for (const workout of getProgramWorkouts(input.activeProgram)) {
      choicesById.set(workout.id, {
        id: workout.id,
        category: workout.category,
        programId: input.activeProgram.program.id,
        programName: input.activeProgram.program.name,
        positionLabel: getProgramWorkoutDayLabel({
          activeProgram: input.activeProgram,
          workout
        }),
        workout
      });
    }
  }

  for (const program of input.programs) {
    if (program.source !== "predefined") {
      continue;
    }

    for (const workout of [...program.workouts].sort(
      (left, right) => left.sequenceOrder - right.sequenceOrder
    )) {
      if (choicesById.has(workout.id)) {
        continue;
      }

      choicesById.set(workout.id, {
        id: workout.id,
        category: workout.category,
        programId: program.id,
        programName: program.name,
        positionLabel: `Day ${workout.sequenceOrder}`,
        workout
      });
    }
  }

  return [...choicesById.values()].sort((left, right) => {
    const categoryDelta =
      predefinedWorkoutCategories.indexOf(left.category) -
      predefinedWorkoutCategories.indexOf(right.category);

    if (categoryDelta !== 0) {
      return categoryDelta;
    }

    const programDelta = left.programName.localeCompare(right.programName);

    if (programDelta !== 0) {
      return programDelta;
    }

    return left.workout.sequenceOrder - right.workout.sequenceOrder;
  });
}

export function groupPredefinedWorkoutChoicesByCategory(
  choices: PredefinedWorkoutChoice[]
): PredefinedWorkoutCategoryGroup[] {
  return predefinedWorkoutCategories
    .map((category) => ({
      category,
      workouts: choices.filter((choice) => choice.category === category)
    }))
    .filter((group) => group.workouts.length > 0);
}

export function getProgramWorkoutPositionLabel(input: {
  activeProgram: ActiveProgramDto | null | undefined;
  workout: ProgramWorkoutTemplateDto;
}) {
  const workoutIndex = getProgramWorkouts(input.activeProgram).findIndex(
    (workout) => workout.id === input.workout.id
  );
  const workoutNumber = workoutIndex >= 0 ? workoutIndex + 1 : input.workout.sequenceOrder;
  const daysPerWeek = input.activeProgram?.program.daysPerWeek ?? 0;

  if (!Number.isInteger(daysPerWeek) || daysPerWeek <= 0) {
    return `Workout ${workoutNumber}`;
  }

  const week = Math.floor((workoutNumber - 1) / daysPerWeek) + 1;
  const day = ((workoutNumber - 1) % daysPerWeek) + 1;

  return `Week ${week} • Day ${day}`;
}

export function getWorkoutIntentSummary(workout: ProgramWorkoutTemplateDto | null | undefined) {
  if (!workout) {
    return "Workout plan unavailable.";
  }

  if (workout.exercises.length === 0) {
    return "No planned exercises yet.";
  }

  const exerciseCount = workout.exercises.length;
  const plannedSetCount = workout.exercises.reduce((sum, exercise) => sum + exercise.targetSets, 0);
  const firstExercise = workout.exercises[0];
  const commonTarget =
    firstExercise &&
    workout.exercises.every(
      (exercise) =>
        exercise.targetSets === firstExercise.targetSets &&
        exercise.targetReps === firstExercise.targetReps
    )
      ? `${firstExercise.targetSets} x ${firstExercise.targetReps}`
      : null;

  return commonTarget
    ? `${exerciseCount} exercises - ${plannedSetCount} sets total - ${commonTarget} each`
    : `${exerciseCount} exercises - ${plannedSetCount} sets total`;
}

export function getPlannedExerciseLines(
  workout: ProgramWorkoutTemplateDto | null | undefined,
  limit = 4
) {
  if (!workout) {
    return [];
  }

  return [...workout.exercises]
    .sort((left, right) => left.sequenceOrder - right.sequenceOrder)
    .slice(0, limit)
    .map((exercise) => `${exercise.exerciseName}: ${exercise.targetSets} x ${exercise.targetReps}`);
}

export function getHiddenExerciseCount(
  workout: ProgramWorkoutTemplateDto | null | undefined,
  visibleCount: number
) {
  if (!workout) {
    return 0;
  }

  return Math.max(0, workout.exercises.length - visibleCount);
}

export function getWorkoutStartActionLabels(input: {
  activeWorkout: boolean;
  hasActiveProgram: boolean;
  hasPredefinedChoices: boolean;
  hasRecommendedWorkout: boolean;
  recommendedWorkoutName?: string | null;
}) {
  return [
    ...(input.hasActiveProgram && input.hasRecommendedWorkout
      ? [`Start ${input.recommendedWorkoutName ?? "Next Workout"}`]
      : []),
    "Create Custom Workout",
    ...(input.hasPredefinedChoices ? ["Choose Predefined Workout"] : [])
  ];
}
