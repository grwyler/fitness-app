import type { EffortFeedback } from "@fitness/shared";
import type { WorkoutTemplateDefinition } from "../../repositories/models/exercise.persistence.js";
import type { ProgressionStateRecord } from "../../repositories/models/progression-state.persistence.js";
import type { CreateWorkoutSessionGraphInput } from "../../repositories/models/workout-session.persistence.js";

export type BuildWorkoutSessionGraphInput = {
  userId: string;
  programId: string;
  programName: string;
  workoutTemplateDefinition: WorkoutTemplateDefinition;
  progressionStates: ProgressionStateRecord[];
  startedAt: Date;
};

export class WorkoutSessionFactory {
  public build(input: BuildWorkoutSessionGraphInput): CreateWorkoutSessionGraphInput {
    const progressionStateByExerciseId = new Map(
      input.progressionStates.map((progressionState) => [progressionState.exerciseId, progressionState])
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
      programNameSnapshot: input.programName,
      workoutNameSnapshot: input.workoutTemplateDefinition.template.name
    };

    const exerciseEntries: CreateWorkoutSessionGraphInput["exerciseEntries"] =
      input.workoutTemplateDefinition.exercises.map(({ exercise, templateExercise }) => {
        const progressionState = progressionStateByExerciseId.get(exercise.id);
        if (!progressionState) {
          throw new Error(`Missing progression state for exercise ${exercise.id}.`);
        }

        return {
          workoutSessionId: "__SESSION__",
          exerciseId: exercise.id,
          sequenceOrder: templateExercise.sequenceOrder,
          targetSets: templateExercise.targetSets,
          targetReps: templateExercise.targetReps,
          targetWeightLbs: progressionState.currentWeightLbs,
          restSeconds: templateExercise.restSeconds,
          effortFeedback: null,
          completedAt: null,
          exerciseNameSnapshot: exercise.name,
          exerciseCategorySnapshot: exercise.category,
          progressionRuleSnapshot: {
            incrementLbs: exercise.defaultIncrementLbs
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
