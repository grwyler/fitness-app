import type { ProgressionConfidence, ProgressionResult } from "@fitness/shared";

export type ProgressionRecommendationEventRecord = {
  id: string;
  userId: string;
  exerciseId: string | null;
  workoutTemplateExerciseEntryId: string | null;
  workoutSessionId: string;
  exerciseEntryId: string;
  previousWeightLbs: number;
  nextWeightLbs: number;
  previousRepGoal: number | null;
  nextRepGoal: number | null;
  result: ProgressionResult;
  reason: string;
  confidence: ProgressionConfidence;
  reasonCodes: string[];
  evidence: string[];
  inputSnapshot: Record<string, unknown>;
  createdAt: Date;
};

export type CreateProgressionRecommendationEventInput = Omit<
  ProgressionRecommendationEventRecord,
  "id" | "createdAt"
> & {
  id?: string;
};
