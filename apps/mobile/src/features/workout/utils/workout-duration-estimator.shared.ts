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

export function estimateWorkoutDurationMinutes(workout: ProgramWorkoutTemplateDto) {
  if (!workout.exercises.length) {
    return 0;
  }

  const sortedExercises = [...workout.exercises].sort(
    (left, right) => left.sequenceOrder - right.sequenceOrder
  );

  const warmupSeconds = clampNumber(3 * 60 + sortedExercises.length * 30, 3 * 60, 8 * 60);
  let totalSeconds = warmupSeconds;

  sortedExercises.forEach((exercise, index) => {
    const targetSets = Math.round(clampNumber(exercise.targetSets, 1, 12));
    const restSeconds = getRestDurationSeconds({
      restSeconds: exercise.restSeconds,
      exerciseCategory: exercise.category
    });

    const setupSeconds = exercise.category === "accessory" ? 45 : 75;
    totalSeconds += setupSeconds;

    const setWorkSeconds = estimateSetWorkSeconds(exercise.targetReps);
    totalSeconds += targetSets * setWorkSeconds;
    totalSeconds += Math.max(0, targetSets - 1) * restSeconds;

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

