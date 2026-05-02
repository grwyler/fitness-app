import type { EffortFeedback, ExerciseCategory, EquipmentType } from "@fitness/shared";

export type ProgressionStateRecord = {
  id: string;
  userId: string;
  exerciseId: string;
  currentWeightLbs: number;
  lastCompletedWeightLbs: number | null;
  consecutiveFailures: number;
  lastEffortFeedback: EffortFeedback | null;
  lastPerformedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateProgressionStateInput = {
  userId: string;
  exerciseId: string;
  currentWeightLbs: number;
  lastCompletedWeightLbs: number | null;
  consecutiveFailures: number;
  lastEffortFeedback: EffortFeedback | null;
  lastPerformedAt: Date | null;
};

export type UpdateProgressionStateInput = {
  userId: string;
  exerciseId: string;
  currentWeightLbs: number;
  lastCompletedWeightLbs: number | null;
  consecutiveFailures: number;
  lastEffortFeedback: EffortFeedback | null;
  lastPerformedAt: Date | null;
};

export type ExerciseProgressionSeedRecord = {
  exerciseId: string;
  exerciseName: string;
  exerciseCategory: ExerciseCategory;
  equipmentType?: EquipmentType | null;
  defaultStartingWeightLbs: number;
  incrementLbs: number;
  isBodyweight: boolean;
  isWeightOptional: boolean;
  isProgressionEligible: boolean;
};
