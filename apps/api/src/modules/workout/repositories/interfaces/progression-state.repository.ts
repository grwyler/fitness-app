import type { RepositoryOptions } from "../models/persistence-context.js";
import type {
  CreateProgressionStateInput,
  ProgressionStateRecord,
  UpdateProgressionStateInput
} from "../models/progression-state.persistence.js";

export interface ProgressionStateRepository {
  findByUserIdAndExerciseIds(
    userId: string,
    exerciseIds: string[],
    options?: RepositoryOptions
  ): Promise<ProgressionStateRecord[]>;

  createMany(
    inputs: CreateProgressionStateInput[],
    options?: RepositoryOptions
  ): Promise<ProgressionStateRecord[]>;

  updateMany(
    inputs: UpdateProgressionStateInput[],
    options?: RepositoryOptions
  ): Promise<ProgressionStateRecord[]>;
}

