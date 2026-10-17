import type {
  ProgressionConfidence,
  ProgressionRecommendationResolutionType,
  ProgressionResult
} from "@fitness/shared";

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
  resolutionType: ProgressionRecommendationResolutionType;
  resolvedByUserId: string | null;
  resolvedAt: Date | null;
  resolutionNote: string | null;
  resolutionOriginalSnapshot: Record<string, unknown> | null;
  resolutionFinalSnapshot: Record<string, unknown> | null;
  resolutionRelatedSetIds: string[] | null;
  createdAt: Date;
};

export type CreateProgressionRecommendationEventInput = {
  id?: string;
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
};
