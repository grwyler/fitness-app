import type { ProgramWorkoutTemplateDto } from "@fitness/shared";
import { getRestDurationSeconds } from "./set-logging.shared";

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function estimateSetWorkSeconds(targetReps: number) {
  const reps = clampNumber(targetReps, 1, 30);
  return clampNumber(10 + reps * 3, 18, 75);
}

function estimateDistanceSeconds(distanceMeters: number) {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return 0;
  }

  // MVP heuristic: ~6:00/km pace (easy/moderate steady state)
  const secondsPerKm = 360;
  return Math.max(1, Math.round((distanceMeters / 1000) * secondsPerKm));
}

function estimateExerciseWorkSeconds(exercise: ProgramWorkoutTemplateDto["exercises"][number]) {
  const modality = exercise.loggingModality ?? "reps_load";

  if (modality === "reps_load" || modality === "reps_only") {
    const reps = exercise.targetReps ?? 8;
    return Math.round(clampNumber(exercise.targetSets, 1, 12)) * estimateSetWorkSeconds(reps);
  }

  if (modality === "time" || modality === "hold") {
    const duration = exercise.targetDurationSeconds ?? 0;
    return Math.round(clampNumber(exercise.targetSets, 1, 12)) * Math.max(0, duration);
  }

  if (modality === "time_distance") {
    const duration = exercise.targetDurationSeconds ?? null;
    const distance = exercise.targetDistanceMeters ?? null;
    if (duration != null) {
      return Math.round(clampNumber(exercise.targetSets, 1, 12)) * Math.max(0, duration);
    }
    if (distance != null) {
      return estimateDistanceSeconds(distance);
    }
    return 0;
  }

  if (modality === "distance") {
    const distance = exercise.targetDistanceMeters ?? null;
    return distance != null ? estimateDistanceSeconds(distance) : 0;
  }

  // interval
  const rounds = exercise.targetRounds ?? null;
  const duration = exercise.targetDurationSeconds ?? null;
  if (rounds != null && duration != null) {
    return Math.max(1, rounds) * Math.max(0, duration);
  }
  if (duration != null) {
    return Math.max(0, duration);
  }
  if (rounds != null) {
    // default 1:00 per round if no better data
    return Math.max(1, rounds) * 60;
  }

  return 0;
}

export function estimateWorkoutDurationMinutes(workout: ProgramWorkoutTemplateDto) {
  if (!workout.exercises.length) {
    return 0;
  }

  const sortedExercises = [...workout.exercises].sort(
    (left, right) => left.sequenceOrder - right.sequenceOrder
  );

  const hasRepsBased = sortedExercises.some(
    (exercise) => exercise.loggingModality === "reps_load" || exercise.loggingModality === "reps_only"
  );
  let totalSeconds = 0;

  sortedExercises.forEach((exercise, index) => {
    const targetSets = Math.round(clampNumber(exercise.targetSets, 1, 12));
    const workSeconds = estimateExerciseWorkSeconds(exercise);
    totalSeconds += workSeconds;

    if (hasRepsBased) {
      const restSeconds = getRestDurationSeconds({
        restSeconds: exercise.restSeconds,
        exerciseCategory: exercise.category
      });

      const setupSeconds = exercise.category === "accessory" ? 45 : 75;
      totalSeconds += setupSeconds;
      totalSeconds += Math.max(0, targetSets - 1) * restSeconds;
    }

    if (index < sortedExercises.length - 1) {
      totalSeconds += 40;
    }
  });

  return Math.max(1, Math.round(totalSeconds / 60));
}

export function getWorkoutEstimatedDurationMinutes(workout: ProgramWorkoutTemplateDto) {
  if (typeof workout.estimatedDurationMinutes === "number" && workout.estimatedDurationMinutes > 0) {
    return workout.estimatedDurationMinutes;
  }

  const estimate = estimateWorkoutDurationMinutes(workout);
  return estimate > 0 ? estimate : 1;
}

