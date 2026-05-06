import type {
  ExerciseCategory,
  ExerciseLoggingModality,
  PredefinedWorkoutCategory,
  ProgressionStrategy,
  WorkoutSetTargetDto
} from "@fitness/shared";

export type ExerciseRecord = {
  id: string;
  name: string;
  aliases?: string[];
  category: ExerciseCategory;
  movementPattern: string | null;
  primaryMuscleGroup: string | null;
  equipmentType: string | null;
  defaultTargetSets: number | null;
  defaultTargetReps: number | null;
  defaultStartingWeightLbs: number;
  defaultIncrementLbs: number;
  isBodyweight: boolean;
  isWeightOptional: boolean;
  isProgressionEligible: boolean;
  loggingModality: ExerciseLoggingModality;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkoutTemplateRecord = {
  id: string;
  programId: string;
  programName: string;
  name: string;
  category?: PredefinedWorkoutCategory;
  sequenceOrder: number;
  estimatedDurationMinutes: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkoutTemplateExerciseRecord = {
  id: string;
  workoutTemplateId: string;
  exerciseId: string;
  sequenceOrder: number;
  targetSets: number;
  targetReps: number | null;
  repRangeMin?: number | null;
  repRangeMax?: number | null;
  targetDurationSeconds?: number | null;
  targetDistanceMeters?: number | null;
  targetRounds?: number | null;
  restSeconds: number | null;
  progressionStrategy?: ProgressionStrategy | null;
  repTargetText?: string | null;
  targetWeightLbs?: number | null;
  notes?: string | null;
  setTargets?: WorkoutSetTargetDto[] | null;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkoutTemplateDefinition = {
  template: WorkoutTemplateRecord;
  exercises: Array<{
    templateExercise: WorkoutTemplateExerciseRecord;
    exercise: ExerciseRecord;
  }>;
};
