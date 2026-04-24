import type { RepositoryOptions } from "../models/persistence-context.js";
import type {
  ExerciseRecord,
  WorkoutTemplateDefinition,
  WorkoutTemplateRecord
} from "../models/exercise.persistence.js";
import type { ExerciseProgressionSeedRecord } from "../models/progression-state.persistence.js";

export interface ExerciseRepository {
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
}
