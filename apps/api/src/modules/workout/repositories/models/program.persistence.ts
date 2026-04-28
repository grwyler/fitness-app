import type { DifficultyLevel, ExerciseCategory, ProgramSource } from "@fitness/shared";

export type ProgramRecord = {
  id: string;
  userId: string | null;
  source: ProgramSource;
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

export type CreateCustomProgramExerciseInput = {
  exerciseId: string;
  targetSets: number;
  targetReps: number;
  restSeconds: number | null;
};

export type CreateCustomProgramWorkoutInput = {
  name: string;
  sequenceOrder: number;
  exercises: CreateCustomProgramExerciseInput[];
};

export type CreateCustomProgramInput = {
  userId: string;
  name: string;
  workouts: CreateCustomProgramWorkoutInput[];
  createdAt: Date;
};
