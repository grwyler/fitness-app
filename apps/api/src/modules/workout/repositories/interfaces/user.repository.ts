import type { ExperienceLevel, TrainingGoal } from "@fitness/shared";
import type { RepositoryOptions } from "../models/persistence-context.js";

export type UserTrainingProfile = {
  experienceLevel: ExperienceLevel | null;
  trainingGoal: TrainingGoal | null;
};

export interface UserRepository {
  findTrainingProfile(userId: string, options?: RepositoryOptions): Promise<UserTrainingProfile | null>;
}

