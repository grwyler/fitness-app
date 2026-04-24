import type { WorkoutSessionStatus } from "@fitness/shared";

export type ActiveWorkoutTemplate = {
  id: string;
  sequenceOrder: number;
};

export type ProgramAdvancementInput = {
  templates: ActiveWorkoutTemplate[];
  currentTemplateId: string | null;
  completedTemplateId?: string;
  workoutSessionStatus: WorkoutSessionStatus;
};

