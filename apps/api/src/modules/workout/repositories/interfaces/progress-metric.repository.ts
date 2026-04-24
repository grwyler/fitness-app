import type { RepositoryOptions } from "../models/persistence-context.js";
import type {
  CreateProgressMetricInput,
  ProgressMetricRecord
} from "../models/progress-metric.persistence.js";

export interface ProgressMetricRepository {
  createMany(
    inputs: CreateProgressMetricInput[],
    options?: RepositoryOptions
  ): Promise<ProgressMetricRecord[]>;

  listRecentByUserId(
    userId: string,
    limit: number,
    options?: RepositoryOptions
  ): Promise<ProgressMetricRecord[]>;
}

