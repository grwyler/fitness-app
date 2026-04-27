import type { DifficultyLevel, ExerciseCategory } from "@fitness/shared";

export type ProgramRecord = {
  id: string;
  name: string;
  description: string | null;
  daysPerWeek: number;
  sessionDurationMinutes: number;
  difficultyLevel: DifficultyLevel;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ProgramTemplateExerciseRecord = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  category: ExerciseCategory;
  sequenceOrder: number;
  targetSets: number;
  targetReps: number;
  restSeconds: number | null;
};

export type ProgramTemplateRecord = {
  id: string;
  programId: string;
  name: string;
  sequenceOrder: number;
  estimatedDurationMinutes: number | null;
  exercises: ProgramTemplateExerciseRecord[];
};

export type ProgramDefinition = {
  program: ProgramRecord;
  templates: ProgramTemplateRecord[];
};

export type CreateEnrollmentInput = {
  userId: string;
  programId: string;
  currentWorkoutTemplateId: string;
  startedAt: Date;
};
