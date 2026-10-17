import type { EffortFeedback } from "@fitness/shared";
import type { WorkoutTemplateDefinition } from "../../repositories/models/exercise.persistence.js";
import type { ProgressionStateV2Record } from "../../repositories/models/progression-state-v2.persistence.js";
import type { CreateWorkoutSessionGraphInput } from "../../repositories/models/workout-session.persistence.js";
import type { GeneratedSetTarget } from "../models/progression.js";

export type BuildWorkoutSessionGraphInput = {
  userId: string;
  programId: string;
  programName: string;
  workoutTemplateDefinition: WorkoutTemplateDefinition;
  progressionStatesV2: ProgressionStateV2Record[];
  prescribedTargetsByTemplateEntryId: Map<string, GeneratedSetTarget[]>;
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
      input.progressionStatesV2.map((state) => [state.workoutTemplateExerciseEntryId, state])
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

        const prescribedTargets = input.prescribedTargetsByTemplateEntryId.get(templateExercise.id) ?? null;
        const progressionState = progressionStateByTemplateEntryId.get(templateExercise.id) ?? null;
        if (shouldUseProgression && (!prescribedTargets || !progressionState)) {
          throw new Error(`Missing canonical progression prescription for template exercise entry ${templateExercise.id}.`);
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
          targetReps: shouldUseProgression
            ? progressionState!.repGoal
            : (templateExercise.targetReps ?? null),
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
            progressionStrategy: templateExercise.progressionStrategy ?? null,
            setScheme: templateExercise.setScheme ?? "straight"
          }
        };
      });

    const sets: CreateWorkoutSessionGraphInput["sets"] = exerciseEntries.flatMap(
      (exerciseEntry, exerciseEntryIndex) => {
        const templateExercise =
          input.workoutTemplateDefinition.exercises[exerciseEntryIndex]?.templateExercise ?? null;

        const exerciseDefinition = input.workoutTemplateDefinition.exercises[exerciseEntryIndex];
        const templateEntry = exerciseDefinition?.templateExercise;
        const exercise = exerciseDefinition?.exercise;
        const generated = input.prescribedTargetsByTemplateEntryId.get(templateEntry?.id ?? "") ??
          Array.from({ length: exerciseEntry.targetSets }, (_, i) => ({
              setNumber: i + 1,
              targetReps: templateExercise?.setTargets?.[i]?.repTargetText?.toUpperCase() === "AMRAP"
                ? null
                : templateExercise?.setTargets?.[i]?.targetReps ?? exerciseEntry.targetReps,
              targetWeightLbs: templateExercise?.setTargets?.[i]?.targetWeight?.value ?? exerciseEntry.targetWeightLbs,
              repTargetText: templateExercise?.setTargets?.[i]?.repTargetText ?? null,
              tiers: templateExercise?.setTargets?.[i]?.tiers?.map((tier) => ({ ...tier, status: "pending" as const })) ?? null,
              previousActualReps: null,
              previousActualWeightLbs: null,
              reason: null
          }));

        return generated.map((target, setIndex) => {
          const setTarget = templateExercise?.setTargets?.[setIndex] ?? null;
          return {
            exerciseEntryId: `__EXERCISE_ENTRY_${exerciseEntryIndex}__`,
            setNumber: setIndex + 1,
            setType: "working" as const,
            repTargetText: target.repTargetText,
            targetReps: target.targetReps,
            actualReps: null,
            previousActualReps: target.previousActualReps ?? null,
            targetWeightLbs: target.targetWeightLbs,
            previousActualWeightLbs: target.previousActualWeightLbs ?? null,
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
            completedAt: null,
            tiers: target.tiers,
          adaptationReason: target.reason ?? null
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
