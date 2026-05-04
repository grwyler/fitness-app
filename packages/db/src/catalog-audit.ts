import type { PredefinedWorkoutCategory } from "@fitness/shared";
import { seedExercises, seedPrograms } from "./seed-data.js";

type AuditIssue = {
  code: string;
  message: string;
  programName?: string;
  workoutName?: string;
};

export type CatalogAuditResult = {
  ok: boolean;
  issues: AuditIssue[];
};

function pushIssue(issues: AuditIssue[], issue: AuditIssue) {
  issues.push(issue);
}

function isPositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isWorkoutCategory(value: unknown): value is PredefinedWorkoutCategory {
  return (
    value === "Push" ||
    value === "Pull" ||
    value === "Legs" ||
    value === "Full Body" ||
    value === "Quick"
  );
}

export function auditSeedProgramCatalog(): CatalogAuditResult {
  const issues: AuditIssue[] = [];

  const exerciseBySlug = new Map(seedExercises.map((exercise) => [exercise.slug, exercise]));
  const seenProgramNames = new Set<string>();

  for (const program of seedPrograms) {
    if (seenProgramNames.has(program.name)) {
      pushIssue(issues, { code: "DUPLICATE_PROGRAM_NAME", message: `Duplicate program name: ${program.name}`, programName: program.name });
      continue;
    }
    seenProgramNames.add(program.name);

    if (!program.metadata || program.metadata.version !== 1) {
      pushIssue(issues, { code: "MISSING_METADATA", message: "Program metadata is missing or invalid.", programName: program.name });
    }

    if (!isPositiveInteger(program.daysPerWeek)) {
      pushIssue(issues, { code: "INVALID_DAYS", message: "daysPerWeek must be a positive integer.", programName: program.name });
    }

    if (!isPositiveInteger(program.sessionDurationMinutes)) {
      pushIssue(issues, { code: "INVALID_DURATION", message: "sessionDurationMinutes must be a positive integer.", programName: program.name });
    }

    if (!Array.isArray(program.templates) || program.templates.length === 0) {
      pushIssue(issues, { code: "NO_TEMPLATES", message: "Program must include at least one workout template.", programName: program.name });
      continue;
    }

    if (program.templates.length !== program.daysPerWeek) {
      pushIssue(issues, { code: "DAYS_MISMATCH", message: `daysPerWeek=${program.daysPerWeek} but templates=${program.templates.length}.`, programName: program.name });
    }

    if (program.difficultyLevel === "beginner") {
      const meta = program.metadata;
      if (meta?.complexityLevel === "high") {
        pushIssue(issues, { code: "BEGINNER_TOO_COMPLEX", message: "Beginner plan marked high complexity.", programName: program.name });
      }
      if (meta?.weeklyVolumeLevel === "very_high") {
        pushIssue(issues, { code: "BEGINNER_TOO_HIGH_VOLUME", message: "Beginner plan marked very high weekly volume.", programName: program.name });
      }
    }

    if (program.daysPerWeek >= 6 && program.difficultyLevel === "beginner") {
      pushIssue(issues, { code: "BEGINNER_TOO_FREQUENT", message: "Beginner plans should not be 6+ days/week.", programName: program.name });
    }

    const allowedEquipment = new Set([
      ...(program.metadata?.equipmentRequired ?? []),
      ...((program.metadata?.equipmentOptional ?? []) as string[])
    ]);

    for (const template of program.templates) {
      if (!template.name || template.name.trim().length === 0) {
        pushIssue(issues, { code: "WORKOUT_NAME_MISSING", message: "Workout template missing name.", programName: program.name });
      }

      if (!isWorkoutCategory(template.category)) {
        pushIssue(issues, { code: "WORKOUT_CATEGORY_INVALID", message: "Workout template category is invalid.", programName: program.name, workoutName: template.name });
      }

      if (!isPositiveInteger(template.sequenceOrder)) {
        pushIssue(issues, { code: "WORKOUT_ORDER_INVALID", message: "Workout template sequenceOrder must be a positive integer.", programName: program.name, workoutName: template.name });
      }

      if (!isPositiveInteger(template.estimatedDurationMinutes)) {
        pushIssue(issues, { code: "WORKOUT_DURATION_INVALID", message: "Workout template estimatedDurationMinutes must be a positive integer.", programName: program.name, workoutName: template.name });
      }

      if (!Array.isArray(template.exercises) || template.exercises.length === 0) {
        pushIssue(issues, { code: "WORKOUT_NO_EXERCISES", message: "Workout template must include at least one exercise.", programName: program.name, workoutName: template.name });
        continue;
      }

      const exerciseOrders = template.exercises.map((entry) => entry.sequenceOrder);
      const uniqueExerciseOrders = new Set(exerciseOrders);
      if (uniqueExerciseOrders.size !== exerciseOrders.length) {
        pushIssue(issues, { code: "WORKOUT_DUPLICATE_EXERCISE_ORDER", message: "Workout template has duplicate exercise sequenceOrder values.", programName: program.name, workoutName: template.name });
      }

      let totalSets = 0;
      let totalEstimatedRestSeconds = 0;

      for (const entry of template.exercises) {
        const exercise = exerciseBySlug.get(entry.exerciseSlug) ?? null;
        if (!exercise) {
          pushIssue(issues, { code: "UNKNOWN_EXERCISE", message: `Unknown exerciseSlug: ${entry.exerciseSlug}`, programName: program.name, workoutName: template.name });
          continue;
        }

        if (!isPositiveInteger(entry.targetSets) || !isPositiveInteger(entry.targetReps) || !isPositiveInteger(entry.restSeconds)) {
          pushIssue(issues, { code: "INVALID_EXERCISE_TARGETS", message: `Invalid sets/reps/rest for ${entry.exerciseSlug}.`, programName: program.name, workoutName: template.name });
        }

        totalSets += entry.targetSets;
        const restSeconds = entry.restSeconds ?? 0;
        totalEstimatedRestSeconds += Math.max(0, entry.targetSets - 1) * restSeconds;

        if (allowedEquipment.size > 0 && !allowedEquipment.has(exercise.equipmentType as any)) {
          pushIssue(issues, { code: "EQUIPMENT_MISMATCH", message: `Metadata equipment does not include required type: ${exercise.equipmentType} (${entry.exerciseSlug}).`, programName: program.name, workoutName: template.name });
        }
      }

      // Very rough plausibility check: assume ~35s per set plus rests.
      const estimatedWorkSeconds = totalSets * 35;
      const estimatedMinutes = (estimatedWorkSeconds + totalEstimatedRestSeconds) / 60;
      const claimedMinutes = template.estimatedDurationMinutes ?? 0;

      if (claimedMinutes > 0) {
        if (claimedMinutes < estimatedMinutes - 10) {
          pushIssue(issues, { code: "WORKOUT_DURATION_TOO_SHORT", message: `Estimated duration seems too short (${claimedMinutes} min vs ~${Math.round(estimatedMinutes)} min).`, programName: program.name, workoutName: template.name });
        }
        if (claimedMinutes > estimatedMinutes + 65) {
          pushIssue(issues, { code: "WORKOUT_DURATION_TOO_LONG", message: `Estimated duration seems too long (${claimedMinutes} min vs ~${Math.round(estimatedMinutes)} min).`, programName: program.name, workoutName: template.name });
        }
      }

      if (program.difficultyLevel === "beginner") {
        if (template.exercises.length > 7) {
          pushIssue(issues, { code: "BEGINNER_WORKOUT_TOO_MANY_EXERCISES", message: "Beginner workouts should not have too many exercises.", programName: program.name, workoutName: template.name });
        }
        if (totalSets > 22) {
          pushIssue(issues, { code: "BEGINNER_WORKOUT_TOO_MANY_SETS", message: "Beginner workouts should not have excessive total sets.", programName: program.name, workoutName: template.name });
        }
      }
    }
  }

  return { ok: issues.length === 0, issues };
}
