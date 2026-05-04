import type {
  DifficultyLevel,
  ExerciseCategory,
  PredefinedWorkoutCategory,
  ProgramSource,
  ProgressionStrategy,
  TrainingGoal,
  PredefinedProgramMetadataDto
} from "@fitness/shared";

export type ProgramRecord = {
  id: string;
  userId: string | null;
  source: ProgramSource;
  name: string;
  description: string | null;
  daysPerWeek: number;
  sessionDurationMinutes: number;
  difficultyLevel: DifficultyLevel;
  trainingGoal: TrainingGoal | null;
  metadata?: PredefinedProgramMetadataDto | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ProgramTemplateExerciseRecord = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  category: ExerciseCategory;
  movementPattern: string | null;
  primaryMuscleGroup: string | null;
  equipmentType: string | null;
  isBodyweight: boolean;
  sequenceOrder: number;
  targetSets: number;
  targetReps: number;
  repRangeMin?: number | null;
  repRangeMax?: number | null;
  restSeconds: number | null;
  progressionStrategy?: ProgressionStrategy | null;
};

export type ProgramTemplateRecord = {
  id: string;
  programId: string;
  name: string;
  category?: PredefinedWorkoutCategory;
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
  workoutTemplateExerciseEntryId?: string | null;
  targetSets: number;
  targetReps: number;
  repRangeMin?: number | null;
  repRangeMax?: number | null;
  restSeconds: number | null;
  progressionStrategy?: ProgressionStrategy | null;
};

export type CreateCustomProgramWorkoutInput = {
  name: string;
  sequenceOrder: number;
  exercises: CreateCustomProgramExerciseInput[];
};

export type CreateCustomProgramInput = {
  userId: string;
  name: string;
  description: string | null;
  workouts: CreateCustomProgramWorkoutInput[];
  createdAt: Date;
};

export type UpdateCustomProgramInput = {
  programId: string;
  userId: string;
  name: string;
  description: string | null;
  workouts: CreateCustomProgramWorkoutInput[];
  updatedAt: Date;
};
