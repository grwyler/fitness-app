import type {
  ActiveProgramDto,
  PredefinedWorkoutCategory,
  ProgramWorkoutTemplateDto
} from "@fitness/shared";

export const predefinedWorkoutCategories: PredefinedWorkoutCategory[] = [
  "Push",
  "Pull",
  "Legs",
  "Full Body",
  "Quick"
];

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
  return input.hasActiveProgram ? ["currentProgram", "startWorkout"] : ["programSetup"];
}

export function getProgramSectionActionLabels(input: { hasActiveProgram: boolean }) {
  return input.hasActiveProgram
    ? ["Switch Program", "Build My Own Program"]
    : ["Choose Ready-Made Plan", "Build My Own Program"];
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
  const formatRepTarget = (exercise: NonNullable<typeof firstExercise>) =>
    exercise.repRangeMin != null && exercise.repRangeMax != null && exercise.repRangeMax > exercise.repRangeMin
      ? `${exercise.targetSets} x ${exercise.repRangeMin}-${exercise.repRangeMax}`
      : `${exercise.targetSets} x ${exercise.targetReps}`;
  const commonTarget =
    firstExercise &&
    workout.exercises.every(
      (exercise) =>
        exercise.targetSets === firstExercise.targetSets &&
        exercise.targetReps === firstExercise.targetReps &&
        (exercise.repRangeMin ?? null) === (firstExercise.repRangeMin ?? null) &&
        (exercise.repRangeMax ?? null) === (firstExercise.repRangeMax ?? null)
    )
      ? formatRepTarget(firstExercise)
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
    .map((exercise) => {
      const repText =
        exercise.repRangeMin != null && exercise.repRangeMax != null && exercise.repRangeMax > exercise.repRangeMin
          ? `${exercise.repRangeMin}-${exercise.repRangeMax}`
          : String(exercise.targetReps);

      return `${exercise.exerciseName}: ${exercise.targetSets} x ${repText}`;
    });
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
