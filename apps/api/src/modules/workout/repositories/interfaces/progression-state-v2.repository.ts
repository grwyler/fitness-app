import type { RepositoryOptions } from "../models/persistence-context.js";
import type {
  CreateProgressionStateV2Input,
  ProgressionStateV2Record,
  UpdateProgressionStateV2Input
} from "../models/progression-state-v2.persistence.js";

export interface ProgressionStateV2Repository {
  findByUserIdAndTemplateEntryIds(
    userId: string,
    workoutTemplateExerciseEntryIds: string[],
    options?: RepositoryOptions
  ): Promise<ProgressionStateV2Record[]>;

  createMany(
    inputs: CreateProgressionStateV2Input[],
    options?: RepositoryOptions
  ): Promise<ProgressionStateV2Record[]>;

  updateMany(
    inputs: UpdateProgressionStateV2Input[],
    options?: RepositoryOptions
  ): Promise<ProgressionStateV2Record[]>;
}

