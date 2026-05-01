import type { RepositoryOptions } from "../models/persistence-context.js";
import type {
  CreateProgressionRecommendationEventInput,
  ProgressionRecommendationEventRecord
} from "../models/progression-recommendation-event.persistence.js";

export interface ProgressionRecommendationEventRepository {
  createMany(
    inputs: CreateProgressionRecommendationEventInput[],
    options?: RepositoryOptions
  ): Promise<ProgressionRecommendationEventRecord[]>;

  listRecentByUserId(
    userId: string,
    limit: number,
    options?: RepositoryOptions
  ): Promise<ProgressionRecommendationEventRecord[]>;
}

