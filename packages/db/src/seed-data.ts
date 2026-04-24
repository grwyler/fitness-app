import type { DifficultyLevel, ExerciseCategory } from "@fitness/shared";

type SeedExercise = {
  slug: string;
  name: string;
  category: ExerciseCategory;
  movementPattern: string;
  primaryMuscleGroup: string;
  equipmentType: string;
  defaultStartingWeightLbs: number;
  defaultIncrementLbs: number;
};

type SeedWorkoutExercise = {
  exerciseSlug: string;
  sequenceOrder: number;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
};

type SeedWorkoutTemplate = {
  name: string;
  sequenceOrder: number;
  estimatedDurationMinutes: number;
  exercises: SeedWorkoutExercise[];
};

type SeedProgram = {
  name: string;
  description: string;
  daysPerWeek: number;
  sessionDurationMinutes: number;
  difficultyLevel: DifficultyLevel;
  templates: SeedWorkoutTemplate[];
};

export const seedExercises: SeedExercise[] = [
  {
    slug: "back-squat",
    name: "Squat",
    category: "compound",
    movementPattern: "squat",
    primaryMuscleGroup: "quads",
    equipmentType: "barbell",
    defaultStartingWeightLbs: 95,
    defaultIncrementLbs: 5
  },
  {
    slug: "bench-press",
    name: "Bench Press",
    category: "compound",
    movementPattern: "push",
    primaryMuscleGroup: "chest",
    equipmentType: "barbell",
    defaultStartingWeightLbs: 95,
    defaultIncrementLbs: 5
  },
  {
    slug: "barbell-row",
    name: "Row",
    category: "compound",
    movementPattern: "pull",
    primaryMuscleGroup: "back",
    equipmentType: "barbell",
    defaultStartingWeightLbs: 95,
    defaultIncrementLbs: 5
  },
  {
    slug: "deadlift",
    name: "Deadlift",
    category: "compound",
    movementPattern: "hinge",
    primaryMuscleGroup: "posterior_chain",
    equipmentType: "barbell",
    defaultStartingWeightLbs: 135,
    defaultIncrementLbs: 5
  },
  {
    slug: "overhead-press",
    name: "Overhead Press",
    category: "compound",
    movementPattern: "push",
    primaryMuscleGroup: "shoulders",
    equipmentType: "barbell",
    defaultStartingWeightLbs: 65,
    defaultIncrementLbs: 5
  },
  {
    slug: "bicep-curl",
    name: "Bicep Curl",
    category: "accessory",
    movementPattern: "pull",
    primaryMuscleGroup: "biceps",
    equipmentType: "dumbbell",
    defaultStartingWeightLbs: 20,
    defaultIncrementLbs: 2.5
  },
  {
    slug: "tricep-pushdown",
    name: "Tricep Pushdown",
    category: "accessory",
    movementPattern: "push",
    primaryMuscleGroup: "triceps",
    equipmentType: "cable",
    defaultStartingWeightLbs: 30,
    defaultIncrementLbs: 2.5
  },
  {
    slug: "leg-curl",
    name: "Leg Curl",
    category: "accessory",
    movementPattern: "hinge",
    primaryMuscleGroup: "hamstrings",
    equipmentType: "machine",
    defaultStartingWeightLbs: 40,
    defaultIncrementLbs: 2.5
  },
  {
    slug: "lat-pulldown",
    name: "Lat Pulldown",
    category: "accessory",
    movementPattern: "pull",
    primaryMuscleGroup: "lats",
    equipmentType: "cable",
    defaultStartingWeightLbs: 50,
    defaultIncrementLbs: 2.5
  }
];

export const beginnerFullBodyV1: SeedProgram = {
  name: "Beginner Full Body V1",
  description: "Three full-body sessions per week with deterministic weight progression.",
  daysPerWeek: 3,
  sessionDurationMinutes: 60,
  difficultyLevel: "beginner",
  templates: [
    {
      name: "Workout A",
      sequenceOrder: 1,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "bench-press", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "barbell-row", sequenceOrder: 3, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "bicep-curl", sequenceOrder: 4, targetSets: 3, targetReps: 8, restSeconds: 75 },
        { exerciseSlug: "tricep-pushdown", sequenceOrder: 5, targetSets: 3, targetReps: 8, restSeconds: 75 }
      ]
    },
    {
      name: "Workout B",
      sequenceOrder: 2,
      estimatedDurationMinutes: 55,
      exercises: [
        { exerciseSlug: "deadlift", sequenceOrder: 1, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "overhead-press", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "lat-pulldown", sequenceOrder: 3, targetSets: 3, targetReps: 8, restSeconds: 90 },
        { exerciseSlug: "leg-curl", sequenceOrder: 4, targetSets: 3, targetReps: 8, restSeconds: 75 },
        { exerciseSlug: "bicep-curl", sequenceOrder: 5, targetSets: 3, targetReps: 8, restSeconds: 75 }
      ]
    }
  ]
};

export const seedPrograms = [beginnerFullBodyV1];
