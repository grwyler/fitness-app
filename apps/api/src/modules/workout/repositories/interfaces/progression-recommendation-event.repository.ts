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

  findOwnedById(
    userId: string,
    id: string,
    options?: RepositoryOptions
  ): Promise<ProgressionRecommendationEventRecord | null>;

  listBySessionId(
    userId: string,
    workoutSessionId: string,
    options?: RepositoryOptions
  ): Promise<ProgressionRecommendationEventRecord[]>;

  resolveOwnedEvent(input: {
    userId: string;
    id: string;
    workoutSessionId: string;
    resolutionType: ProgressionRecommendationEventRecord["resolutionType"];
    resolvedByUserId: string;
    resolvedAt: Date;
    note: string | null;
    resolutionOriginalSnapshot: Record<string, unknown>;
    resolutionFinalSnapshot: Record<string, unknown>;
    relatedSetIds: string[] | null;
  }, options?: RepositoryOptions): Promise<ProgressionRecommendationEventRecord>;

  listRecentByUserId(
    userId: string,
    limit: number,
    options?: RepositoryOptions
  ): Promise<ProgressionRecommendationEventRecord[]>;
}
