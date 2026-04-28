import type { ActiveProgramDto, ProgramWorkoutTemplateDto } from "@fitness/shared";

export function getNextProgramPositionLabel(activeProgram: ActiveProgramDto | null | undefined) {
  if (!activeProgram) {
    return null;
  }

  const completedWorkoutCount = Math.max(0, activeProgram.completedWorkoutCount);
  const daysPerWeek = activeProgram.program.daysPerWeek;
  const nextWorkoutNumber = completedWorkoutCount + 1;

  if (!Number.isInteger(daysPerWeek) || daysPerWeek <= 0) {
    return `Workout ${nextWorkoutNumber}`;
  }

  const week = Math.floor(completedWorkoutCount / daysPerWeek) + 1;
  const day = (completedWorkoutCount % daysPerWeek) + 1;

  return `Week ${week} / Day ${day}`;
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
