import type {
  ActiveProgramDto,
  PredefinedWorkoutCategory,
  ProgramWorkoutTemplateDto,
  UnitSystem
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

  if (input.activeProgram?.program.source === "custom") {
    return `Workout ${workoutNumber}`;
  }

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

export function getNextProgramPositionLabel(activeProgram: ActiveProgramDto | null | undefined) {
  if (!activeProgram) {
    return null;
  }

  if (activeProgram.currentPosition?.label) {
    if (activeProgram.program.source === "custom") {
      const completedWorkoutCount = Math.max(0, activeProgram.completedWorkoutCount);
      return `Workout ${completedWorkoutCount + 1}`;
    }

    return activeProgram.currentPosition.label;
  }

  const completedWorkoutCount = Math.max(0, activeProgram.completedWorkoutCount);
  const daysPerWeek = activeProgram.program.daysPerWeek;
  const nextWorkoutNumber = completedWorkoutCount + 1;

  if (activeProgram.program.source === "custom") {
    return `Workout ${nextWorkoutNumber}`;
  }

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

  if (input.activeProgram?.program.source === "custom") {
    return `Workout ${workoutNumber}`;
  }

  if (!Number.isInteger(daysPerWeek) || daysPerWeek <= 0) {
    return `Workout ${workoutNumber}`;
  }

  const week = Math.floor((workoutNumber - 1) / daysPerWeek) + 1;
  const day = ((workoutNumber - 1) % daysPerWeek) + 1;

  return `Week ${week} • Day ${day}`;
}

function formatDurationSecondsCompact(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function formatDistanceCompact(distanceMeters: number, unitSystem: UnitSystem) {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    return null;
  }

  const value = unitSystem === "metric" ? distanceMeters / 1000 : distanceMeters / 1609.344;
  const unit = unitSystem === "metric" ? "km" : "mi";
  const text = value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${text} ${unit}`;
}

function formatExerciseIntentTarget(
  exercise: ProgramWorkoutTemplateDto["exercises"][number],
  unitSystem: UnitSystem
) {
  const modality = exercise.loggingModality ?? "reps_load";

  if (modality === "reps_load" || modality === "reps_only") {
    const repText =
      exercise.repRangeMin != null &&
      exercise.repRangeMax != null &&
      exercise.repRangeMax > exercise.repRangeMin
        ? `${exercise.repRangeMin}-${exercise.repRangeMax}`
        : `${exercise.targetReps ?? "reps"}`;
    return `${exercise.targetSets} x ${repText}`;
  }

  if (modality === "time" || modality === "hold") {
    const duration =
      exercise.targetDurationSeconds != null ? formatDurationSecondsCompact(exercise.targetDurationSeconds) : null;
    return duration
      ? `${exercise.targetSets} x ${duration}`
      : `${exercise.targetSets} set${exercise.targetSets === 1 ? "" : "s"}`;
  }

  if (modality === "time_distance") {
    const duration =
      exercise.targetDurationSeconds != null ? formatDurationSecondsCompact(exercise.targetDurationSeconds) : null;
    const distance =
      exercise.targetDistanceMeters != null ? formatDistanceCompact(exercise.targetDistanceMeters, unitSystem) : null;
    if (duration && distance) return `${distance} · ${duration}`;
    if (duration) return duration;
    if (distance) return distance;
    return `${exercise.targetSets} set${exercise.targetSets === 1 ? "" : "s"}`;
  }

  if (modality === "distance") {
    const distance =
      exercise.targetDistanceMeters != null ? formatDistanceCompact(exercise.targetDistanceMeters, unitSystem) : null;
    return distance ?? `${exercise.targetSets} set${exercise.targetSets === 1 ? "" : "s"}`;
  }

  // interval
  const rounds = exercise.targetRounds ?? null;
  const duration =
    exercise.targetDurationSeconds != null ? formatDurationSecondsCompact(exercise.targetDurationSeconds) : null;
  if (rounds != null && duration) return `${rounds} rounds · ${duration}`;
  if (rounds != null) return `${rounds} rounds`;
  return duration ?? `${exercise.targetSets} set${exercise.targetSets === 1 ? "" : "s"}`;
}

export function getWorkoutIntentSummary(
  workout: ProgramWorkoutTemplateDto | null | undefined,
  unitSystem: UnitSystem = "imperial"
) {
  if (!workout) {
    return "Workout plan unavailable.";
  }

  if (workout.exercises.length === 0) {
    return "No planned exercises yet.";
  }

  const exerciseCount = workout.exercises.length;
  const plannedSetCount = workout.exercises.reduce((sum, exercise) => sum + exercise.targetSets, 0);
  const firstExercise = workout.exercises[0];
  const firstTarget = firstExercise ? formatExerciseIntentTarget(firstExercise, unitSystem) : null;
  const commonTarget =
    firstExercise &&
    firstTarget &&
    workout.exercises.every((exercise) => formatExerciseIntentTarget(exercise, unitSystem) === firstTarget)
      ? firstTarget
      : null;

  return commonTarget
    ? `${exerciseCount} exercises - ${plannedSetCount} sets total - ${commonTarget} each`
    : `${exerciseCount} exercises - ${plannedSetCount} sets total`;
}

export function getPlannedExerciseLines(
  workout: ProgramWorkoutTemplateDto | null | undefined,
  limit = 4,
  unitSystem: UnitSystem = "imperial"
) {
  if (!workout) {
    return [];
  }

  return [...workout.exercises]
    .sort((left, right) => left.sequenceOrder - right.sequenceOrder)
    .slice(0, limit)
    .map((exercise) => `${exercise.exerciseName}: ${formatExerciseIntentTarget(exercise, unitSystem)}`);
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
