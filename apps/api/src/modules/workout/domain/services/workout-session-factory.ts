import type { EffortFeedback } from "@fitness/shared";
import type { WorkoutTemplateDefinition } from "../../repositories/models/exercise.persistence.js";
import type { ProgressionStateV2Record } from "../../repositories/models/progression-state-v2.persistence.js";
import type { CreateWorkoutSessionGraphInput } from "../../repositories/models/workout-session.persistence.js";

export type BuildWorkoutSessionGraphInput = {
  userId: string;
  programId: string;
  programName: string;
  workoutTemplateDefinition: WorkoutTemplateDefinition;
  progressionStatesV2: ProgressionStateV2Record[];
  startedAt: Date;
};

export class WorkoutSessionFactory {
  private applyDefaultTargets(input: {
    modality: CreateWorkoutSessionGraphInput["exerciseEntries"][number]["loggingModalitySnapshot"];
    targetDurationSeconds: number | null;
    targetDistanceMeters: number | null;
    targetRounds: number | null;
  }) {
    const modality = input.modality;

    if (modality === "hold") {
      return {
        targetDurationSeconds: input.targetDurationSeconds ?? 30,
        targetDistanceMeters: input.targetDistanceMeters,
        targetRounds: input.targetRounds
      };
    }

    if (modality === "time") {
      return {
        targetDurationSeconds: input.targetDurationSeconds ?? 20 * 60,
        targetDistanceMeters: input.targetDistanceMeters,
        targetRounds: input.targetRounds
      };
    }

    if (modality === "time_distance") {
      return {
        targetDurationSeconds:
          input.targetDurationSeconds === null && input.targetDistanceMeters === null
            ? 20 * 60
            : input.targetDurationSeconds,
        targetDistanceMeters: input.targetDistanceMeters,
        targetRounds: input.targetRounds
      };
    }

    if (modality === "distance") {
      return {
        targetDurationSeconds: input.targetDurationSeconds,
        targetDistanceMeters: input.targetDistanceMeters ?? 2000,
        targetRounds: input.targetRounds
      };
    }

    if (modality === "interval") {
      return {
        targetDurationSeconds: input.targetDurationSeconds,
        targetDistanceMeters: input.targetDistanceMeters,
        targetRounds: input.targetRounds ?? 5
      };
    }

    return {
      targetDurationSeconds: input.targetDurationSeconds,
      targetDistanceMeters: input.targetDistanceMeters,
      targetRounds: input.targetRounds
    };
  }

  public build(input: BuildWorkoutSessionGraphInput): CreateWorkoutSessionGraphInput {
    const progressionStateByTemplateEntryId = new Map(
      input.progressionStatesV2.map((progressionState) => [
        progressionState.workoutTemplateExerciseEntryId,
        progressionState
      ])
    );

    const session: CreateWorkoutSessionGraphInput["session"] = {
      userId: input.userId,
      programId: input.programId,
      workoutTemplateId: input.workoutTemplateDefinition.template.id,
      status: "in_progress",
      startedAt: input.startedAt,
      completedAt: null,
      durationSeconds: null,
      isPartial: false,
      userEffortFeedback: null as EffortFeedback | null,
      recoveryState: null,
      programNameSnapshot: input.programName,
      workoutNameSnapshot: input.workoutTemplateDefinition.template.name
    };

    const exerciseEntries: CreateWorkoutSessionGraphInput["exerciseEntries"] =
      input.workoutTemplateDefinition.exercises.map(({ exercise, templateExercise }) => {
        const shouldUseProgression =
          exercise.isProgressionEligible &&
          (exercise.loggingModality === "reps_load" || exercise.loggingModality === "reps_only");

        const progressionState = progressionStateByTemplateEntryId.get(templateExercise.id) ?? null;
        if (shouldUseProgression && !progressionState) {
          throw new Error(`Missing progression state for template exercise entry ${templateExercise.id}.`);
        }

        const entryLevelTarget =
          templateExercise.setTargets && templateExercise.setTargets.length === 1
            ? templateExercise.setTargets[0] ?? null
            : null;

        const baseTargets = {
          targetDurationSeconds: entryLevelTarget?.durationSeconds ?? templateExercise.targetDurationSeconds ?? null,
          targetDistanceMeters: entryLevelTarget?.distanceMeters ?? templateExercise.targetDistanceMeters ?? null,
          targetRounds: templateExercise.targetRounds ?? null
        };

        const normalizedTargets = this.applyDefaultTargets({
          modality: exercise.loggingModality,
          ...baseTargets
        });

        return {
          workoutSessionId: "__SESSION__",
          exerciseId: exercise.id,
          workoutTemplateExerciseEntryId: templateExercise.id,
          sequenceOrder: templateExercise.sequenceOrder,
          targetSets: templateExercise.targetSets,
          targetReps: shouldUseProgression ? progressionState!.repGoal : (templateExercise.targetReps ?? null),
          targetWeightLbs: shouldUseProgression
            ? progressionState!.currentWeightLbs
            : (templateExercise.targetWeightLbs ?? null),
          targetDurationSeconds: normalizedTargets.targetDurationSeconds,
          targetDistanceMeters: normalizedTargets.targetDistanceMeters,
          targetRounds: normalizedTargets.targetRounds,
          restSeconds: templateExercise.restSeconds,
          effortFeedback: null,
          completedAt: null,
          exerciseNameSnapshot: exercise.name,
          exerciseCategorySnapshot: exercise.category,
          loggingModalitySnapshot: exercise.loggingModality,
          progressionRuleSnapshot: {
            incrementLbs: exercise.defaultIncrementLbs,
            progressionStrategy: templateExercise.progressionStrategy ?? null
          }
        };
      });

    const sets: CreateWorkoutSessionGraphInput["sets"] = exerciseEntries.flatMap(
      (exerciseEntry, exerciseEntryIndex) => {
        const templateExercise =
          input.workoutTemplateDefinition.exercises[exerciseEntryIndex]?.templateExercise ?? null;

        return Array.from({ length: exerciseEntry.targetSets }, (_, setIndex) => {
          const setTarget = templateExercise?.setTargets?.[setIndex] ?? null;

          return {
            exerciseEntryId: `__EXERCISE_ENTRY_${exerciseEntryIndex}__`,
            setNumber: setIndex + 1,
            setType: "working" as const,
            targetReps: exerciseEntry.targetReps,
            actualReps: null,
            targetWeightLbs: exerciseEntry.targetWeightLbs,
            actualWeightLbs: null,
            targetDurationSeconds: setTarget?.durationSeconds ?? exerciseEntry.targetDurationSeconds ?? null,
            actualDurationSeconds: null,
            targetDistanceMeters: setTarget?.distanceMeters ?? exerciseEntry.targetDistanceMeters ?? null,
            actualDistanceMeters: null,
            targetRounds: exerciseEntry.targetRounds ?? null,
            actualRounds: null,
            status: "pending" as const,
            rir: null,
            failureStatus: null,
            completedAt: null
          };
        });
      }
    );

    return {
      session,
      exerciseEntries,
      sets
    };
  }
}
