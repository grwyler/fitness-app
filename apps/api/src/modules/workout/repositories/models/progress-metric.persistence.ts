import type { ProgressMetricType } from "@fitness/shared";

export type ProgressMetricRecord = {
  id: string;
  userId: string;
  exerciseId: string | null;
  workoutSessionId: string | null;
  metricType: ProgressMetricType;
  metricValue: number | null;
  displayText: string;
  recordedAt: Date;
  createdAt: Date;
};

export type CreateProgressMetricInput = {
  userId: string;
  exerciseId: string | null;
  workoutSessionId: string | null;
  metricType: ProgressMetricType;
  metricValue: number | null;
  displayText: string;
  recordedAt: Date;
};

