import type { RepositoryOptions } from "../models/persistence-context.js";
import type {
  ExerciseRecord,
  WorkoutTemplateDefinition,
  WorkoutTemplateRecord
} from "../models/exercise.persistence.js";
import type { ExerciseProgressionSeedRecord } from "../models/progression-state.persistence.js";
import type { ProgressionStrategy } from "@fitness/shared";

export interface ExerciseRepository {
  listActive(options?: RepositoryOptions): Promise<ExerciseRecord[]>;

  findTemplateDefinitionById(
    templateId: string,
    options?: RepositoryOptions
  ): Promise<WorkoutTemplateDefinition | null>;

  findProgressionSeedsByExerciseIds(
    exerciseIds: string[],
    options?: RepositoryOptions
  ): Promise<ExerciseProgressionSeedRecord[]>;

  findActiveTemplatesByProgramId(
    programId: string,
    options?: RepositoryOptions
  ): Promise<WorkoutTemplateRecord[]>;

  findByIds(
    exerciseIds: string[],
    options?: RepositoryOptions
  ): Promise<ExerciseRecord[]>;

  findTemplateExerciseEntryIdsByTemplateIdAndSequenceOrders(
    templateId: string,
    sequenceOrders: number[],
    options?: RepositoryOptions
  ): Promise<Array<{ sequenceOrder: number; workoutTemplateExerciseEntryId: string }>>;

  appendWorkoutTemplateExerciseEntry(
    input: {
      workoutTemplateId: string;
      exerciseId: string;
      sequenceOrder: number;
      targetSets: number;
      targetReps: number | null;
      repRangeMin?: number;
      repRangeMax?: number;
      targetDurationSeconds?: number | null;
      targetDistanceMeters?: number | null;
      targetRounds?: number | null;
      restSeconds: number | null;
      progressionStrategy?: ProgressionStrategy;
    },
    options?: RepositoryOptions
  ): Promise<string>;
}
