import type { ExperienceLevel, ProgramTrainingContextSource, TrainingGoal } from "@fitness/shared";
import type { RepositoryOptions } from "../models/persistence-context.js";

export type ProgramTrainingContextRecord = {
  id: string;
  userId: string;
  programId: string;
  enrollmentId: string | null;
  source: ProgramTrainingContextSource;
  goalType: TrainingGoal | null;
  experienceLevel: ExperienceLevel | null;
  progressionPreferencesSnapshot: unknown;
  recoveryPreferencesSnapshot: unknown;
  equipmentSettingsSnapshot: unknown;
  exerciseProgressionSettingsSnapshot: unknown;
  guidedAnswersSnapshot: unknown | null;
  guidedRecommendationSnapshot: unknown | null;
  coachingEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateProgramTrainingContextInput = {
  userId: string;
  programId: string;
  enrollmentId?: string | null;
  source: ProgramTrainingContextSource;
  goalType: TrainingGoal | null;
  experienceLevel: ExperienceLevel | null;
  progressionPreferencesSnapshot: unknown;
  recoveryPreferencesSnapshot: unknown;
  equipmentSettingsSnapshot: unknown;
  exerciseProgressionSettingsSnapshot: unknown;
  guidedAnswersSnapshot?: unknown | null;
  guidedRecommendationSnapshot?: unknown | null;
  coachingEnabled?: boolean;
};

export interface ProgramTrainingContextRepository {
  create(
    input: CreateProgramTrainingContextInput,
    options?: RepositoryOptions
  ): Promise<ProgramTrainingContextRecord>;
}
