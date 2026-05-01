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
        const progressionState = progressionStateByTemplateEntryId.get(templateExercise.id);
        if (!progressionState) {
          throw new Error(`Missing progression state for template exercise entry ${templateExercise.id}.`);
        }

        return {
          workoutSessionId: "__SESSION__",
          exerciseId: exercise.id,
          workoutTemplateExerciseEntryId: templateExercise.id,
          sequenceOrder: templateExercise.sequenceOrder,
          targetSets: templateExercise.targetSets,
          targetReps: progressionState.repGoal,
          targetWeightLbs: progressionState.currentWeightLbs,
          restSeconds: templateExercise.restSeconds,
          effortFeedback: null,
          completedAt: null,
          exerciseNameSnapshot: exercise.name,
          exerciseCategorySnapshot: exercise.category,
          progressionRuleSnapshot: {
            incrementLbs: exercise.defaultIncrementLbs,
            progressionStrategy: templateExercise.progressionStrategy ?? null
          }
        };
      });

    const sets: CreateWorkoutSessionGraphInput["sets"] = exerciseEntries.flatMap(
      (exerciseEntry, exerciseEntryIndex) =>
        Array.from({ length: exerciseEntry.targetSets }, (_, setIndex) => ({
          exerciseEntryId: `__EXERCISE_ENTRY_${exerciseEntryIndex}__`,
          setNumber: setIndex + 1,
          targetReps: exerciseEntry.targetReps,
          actualReps: null,
          targetWeightLbs: exerciseEntry.targetWeightLbs,
          actualWeightLbs: null,
          status: "pending" as const,
          completedAt: null
        }))
    );

    return {
      session,
      exerciseEntries,
      sets
    };
  }
}
