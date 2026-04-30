import type {
  DifficultyLevel,
  ExerciseCategory,
  PredefinedWorkoutCategory
} from "@fitness/shared";

type SeedExercise = {
  slug: string;
  name: string;
  category: ExerciseCategory;
  movementPattern: string;
  primaryMuscleGroup: string;
  equipmentType: string;
  defaultTargetSets: number;
  defaultTargetReps: number;
  defaultStartingWeightLbs: number;
  defaultIncrementLbs: number;
  isBodyweight?: boolean;
  isWeightOptional?: boolean;
  isProgressionEligible?: boolean;
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
  category: PredefinedWorkoutCategory;
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
    defaultTargetSets: 3,
    defaultTargetReps: 8,
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
    defaultTargetSets: 3,
    defaultTargetReps: 8,
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
    defaultTargetSets: 3,
    defaultTargetReps: 8,
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
    defaultTargetSets: 3,
    defaultTargetReps: 5,
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
    defaultTargetSets: 3,
    defaultTargetReps: 8,
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
    defaultTargetSets: 3,
    defaultTargetReps: 12,
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
    defaultTargetSets: 3,
    defaultTargetReps: 12,
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
    defaultTargetSets: 3,
    defaultTargetReps: 12,
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
    defaultTargetSets: 3,
    defaultTargetReps: 10,
    defaultStartingWeightLbs: 50,
    defaultIncrementLbs: 2.5
  },
  {
    slug: "pull-ups",
    name: "Pull-Ups",
    category: "compound",
    movementPattern: "pull",
    primaryMuscleGroup: "lats",
    equipmentType: "bodyweight",
    defaultTargetSets: 3,
    defaultTargetReps: 8,
    defaultStartingWeightLbs: 0,
    defaultIncrementLbs: 2.5,
    isBodyweight: true,
    isWeightOptional: true
  },
  {
    slug: "db-row",
    name: "DB Row",
    category: "compound",
    movementPattern: "pull",
    primaryMuscleGroup: "back",
    equipmentType: "dumbbell",
    defaultTargetSets: 3,
    defaultTargetReps: 10,
    defaultStartingWeightLbs: 35,
    defaultIncrementLbs: 5
  },
  {
    slug: "db-curl",
    name: "DB Curl",
    category: "accessory",
    movementPattern: "pull",
    primaryMuscleGroup: "biceps",
    equipmentType: "dumbbell",
    defaultTargetSets: 3,
    defaultTargetReps: 12,
    defaultStartingWeightLbs: 20,
    defaultIncrementLbs: 2.5
  },
  {
    slug: "overhead-db-tricep-extension",
    name: "Overhead DB Tricep Extension",
    category: "accessory",
    movementPattern: "push",
    primaryMuscleGroup: "triceps",
    equipmentType: "dumbbell",
    defaultTargetSets: 3,
    defaultTargetReps: 12,
    defaultStartingWeightLbs: 25,
    defaultIncrementLbs: 2.5
  },
  {
    slug: "romanian-deadlift",
    name: "Romanian Deadlift",
    category: "compound",
    movementPattern: "hinge",
    primaryMuscleGroup: "hamstrings",
    equipmentType: "barbell",
    defaultTargetSets: 3,
    defaultTargetReps: 8,
    defaultStartingWeightLbs: 95,
    defaultIncrementLbs: 5
  },
  {
    slug: "lunges",
    name: "Lunges",
    category: "accessory",
    movementPattern: "lunge",
    primaryMuscleGroup: "quads",
    equipmentType: "dumbbell",
    defaultTargetSets: 3,
    defaultTargetReps: 10,
    defaultStartingWeightLbs: 25,
    defaultIncrementLbs: 5
  },
  {
    slug: "incline-db-press",
    name: "Incline DB Press",
    category: "compound",
    movementPattern: "push",
    primaryMuscleGroup: "chest",
    equipmentType: "dumbbell",
    defaultTargetSets: 3,
    defaultTargetReps: 10,
    defaultStartingWeightLbs: 35,
    defaultIncrementLbs: 5
  },
  {
    slug: "incline-db-curl",
    name: "Incline DB Curl",
    category: "accessory",
    movementPattern: "pull",
    primaryMuscleGroup: "biceps",
    equipmentType: "dumbbell",
    defaultTargetSets: 3,
    defaultTargetReps: 12,
    defaultStartingWeightLbs: 15,
    defaultIncrementLbs: 2.5
  },
  {
    slug: "skull-crushers",
    name: "Skull Crushers",
    category: "accessory",
    movementPattern: "push",
    primaryMuscleGroup: "triceps",
    equipmentType: "barbell",
    defaultTargetSets: 3,
    defaultTargetReps: 12,
    defaultStartingWeightLbs: 35,
    defaultIncrementLbs: 2.5
  },
  {
    slug: "hammer-curl",
    name: "Hammer Curl",
    category: "accessory",
    movementPattern: "pull",
    primaryMuscleGroup: "biceps",
    equipmentType: "dumbbell",
    defaultTargetSets: 3,
    defaultTargetReps: 12,
    defaultStartingWeightLbs: 20,
    defaultIncrementLbs: 2.5
  },
  {
    slug: "front-squat",
    name: "Front Squat",
    category: "compound",
    movementPattern: "squat",
    primaryMuscleGroup: "quads",
    equipmentType: "barbell",
    defaultTargetSets: 3,
    defaultTargetReps: 6,
    defaultStartingWeightLbs: 95,
    defaultIncrementLbs: 5
  },
  {
    slug: "leg-press",
    name: "Leg Press",
    category: "compound",
    movementPattern: "squat",
    primaryMuscleGroup: "quads",
    equipmentType: "machine",
    defaultTargetSets: 3,
    defaultTargetReps: 10,
    defaultStartingWeightLbs: 90,
    defaultIncrementLbs: 10
  },
  {
    slug: "hack-squat",
    name: "Hack Squat",
    category: "compound",
    movementPattern: "squat",
    primaryMuscleGroup: "quads",
    equipmentType: "machine",
    defaultTargetSets: 3,
    defaultTargetReps: 10,
    defaultStartingWeightLbs: 90,
    defaultIncrementLbs: 10
  },
  {
    slug: "leg-extension",
    name: "Leg Extension",
    category: "accessory",
    movementPattern: "squat",
    primaryMuscleGroup: "quads",
    equipmentType: "machine",
    defaultTargetSets: 3,
    defaultTargetReps: 12,
    defaultStartingWeightLbs: 40,
    defaultIncrementLbs: 5
  },
  {
    slug: "calf-raise",
    name: "Calf Raise",
    category: "accessory",
    movementPattern: "carry",
    primaryMuscleGroup: "calves",
    equipmentType: "machine",
    defaultTargetSets: 3,
    defaultTargetReps: 12,
    defaultStartingWeightLbs: 50,
    defaultIncrementLbs: 5
  },
  {
    slug: "hip-thrust",
    name: "Hip Thrust",
    category: "compound",
    movementPattern: "hinge",
    primaryMuscleGroup: "glutes",
    equipmentType: "barbell",
    defaultTargetSets: 3,
    defaultTargetReps: 8,
    defaultStartingWeightLbs: 95,
    defaultIncrementLbs: 10
  },
  {
    slug: "glute-bridge",
    name: "Glute Bridge",
    category: "accessory",
    movementPattern: "hinge",
    primaryMuscleGroup: "glutes",
    equipmentType: "bodyweight",
    defaultTargetSets: 3,
    defaultTargetReps: 12,
    defaultStartingWeightLbs: 0,
    defaultIncrementLbs: 5,
    isBodyweight: true,
    isWeightOptional: true
  },
  {
    slug: "bulgarian-split-squat",
    name: "Bulgarian Split Squat",
    category: "compound",
    movementPattern: "lunge",
    primaryMuscleGroup: "quads",
    equipmentType: "dumbbell",
    defaultTargetSets: 3,
    defaultTargetReps: 10,
    defaultStartingWeightLbs: 25,
    defaultIncrementLbs: 5
  },
  {
    slug: "walking-lunge",
    name: "Walking Lunge",
    category: "accessory",
    movementPattern: "lunge",
    primaryMuscleGroup: "quads",
    equipmentType: "dumbbell",
    defaultTargetSets: 3,
    defaultTargetReps: 12,
    defaultStartingWeightLbs: 25,
    defaultIncrementLbs: 5
  },
  {
    slug: "step-up",
    name: "Step-Up",
    category: "accessory",
    movementPattern: "lunge",
    primaryMuscleGroup: "quads",
    equipmentType: "dumbbell",
    defaultTargetSets: 3,
    defaultTargetReps: 10,
    defaultStartingWeightLbs: 20,
    defaultIncrementLbs: 5
  },
  {
    slug: "single-leg-romanian-deadlift",
    name: "Single-Leg Romanian Deadlift",
    category: "accessory",
    movementPattern: "hinge",
    primaryMuscleGroup: "hamstrings",
    equipmentType: "dumbbell",
    defaultTargetSets: 3,
    defaultTargetReps: 10,
    defaultStartingWeightLbs: 25,
    defaultIncrementLbs: 5
  },
  {
    slug: "good-morning",
    name: "Good Morning",
    category: "compound",
    movementPattern: "hinge",
    primaryMuscleGroup: "posterior_chain",
    equipmentType: "barbell",
    defaultTargetSets: 3,
    defaultTargetReps: 8,
    defaultStartingWeightLbs: 65,
    defaultIncrementLbs: 5
  },
  {
    slug: "sumo-deadlift",
    name: "Sumo Deadlift",
    category: "compound",
    movementPattern: "hinge",
    primaryMuscleGroup: "posterior_chain",
    equipmentType: "barbell",
    defaultTargetSets: 3,
    defaultTargetReps: 5,
    defaultStartingWeightLbs: 135,
    defaultIncrementLbs: 5
  },
  {
    slug: "nordic-hamstring-curl",
    name: "Nordic Hamstring Curl",
    category: "accessory",
    movementPattern: "hinge",
    primaryMuscleGroup: "hamstrings",
    equipmentType: "bodyweight",
    defaultTargetSets: 3,
    defaultTargetReps: 6,
    defaultStartingWeightLbs: 0,
    defaultIncrementLbs: 2.5,
    isBodyweight: true,
    isWeightOptional: true,
    isProgressionEligible: false
  },
  {
    slug: "standing-calf-raise",
    name: "Standing Calf Raise",
    category: "accessory",
    movementPattern: "carry",
    primaryMuscleGroup: "calves",
    equipmentType: "machine",
    defaultTargetSets: 3,
    defaultTargetReps: 12,
    defaultStartingWeightLbs: 50,
    defaultIncrementLbs: 5
  },
  {
    slug: "seated-calf-raise",
    name: "Seated Calf Raise",
    category: "accessory",
    movementPattern: "carry",
    primaryMuscleGroup: "calves",
    equipmentType: "machine",
    defaultTargetSets: 3,
    defaultTargetReps: 15,
    defaultStartingWeightLbs: 45,
    defaultIncrementLbs: 5
  },
  {
    slug: "hip-abduction",
    name: "Hip Abduction",
    category: "accessory",
    movementPattern: "abduction",
    primaryMuscleGroup: "glutes",
    equipmentType: "machine",
    defaultTargetSets: 3,
    defaultTargetReps: 15,
    defaultStartingWeightLbs: 40,
    defaultIncrementLbs: 5
  },
  {
    slug: "hip-adduction",
    name: "Hip Adduction",
    category: "accessory",
    movementPattern: "adduction",
    primaryMuscleGroup: "adductors",
    equipmentType: "machine",
    defaultTargetSets: 3,
    defaultTargetReps: 15,
    defaultStartingWeightLbs: 40,
    defaultIncrementLbs: 5
  },
  {
    slug: "cable-glute-kickback",
    name: "Cable Glute Kickback",
    category: "accessory",
    movementPattern: "hinge",
    primaryMuscleGroup: "glutes",
    equipmentType: "cable",
    defaultTargetSets: 3,
    defaultTargetReps: 15,
    defaultStartingWeightLbs: 15,
    defaultIncrementLbs: 2.5
  },
  {
    slug: "incline-bench-press",
    name: "Incline Bench Press",
    category: "compound",
    movementPattern: "push",
    primaryMuscleGroup: "chest",
    equipmentType: "barbell",
    defaultTargetSets: 3,
    defaultTargetReps: 8,
    defaultStartingWeightLbs: 85,
    defaultIncrementLbs: 5
  },
  {
    slug: "dumbbell-bench-press",
    name: "DB Bench Press",
    category: "compound",
    movementPattern: "push",
    primaryMuscleGroup: "chest",
    equipmentType: "dumbbell",
    defaultTargetSets: 3,
    defaultTargetReps: 10,
    defaultStartingWeightLbs: 35,
    defaultIncrementLbs: 5
  },
  {
    slug: "machine-chest-press",
    name: "Machine Chest Press",
    category: "compound",
    movementPattern: "push",
    primaryMuscleGroup: "chest",
    equipmentType: "machine",
    defaultTargetSets: 3,
    defaultTargetReps: 10,
    defaultStartingWeightLbs: 50,
    defaultIncrementLbs: 5
  },
  {
    slug: "pec-deck",
    name: "Pec Deck",
    category: "accessory",
    movementPattern: "push",
    primaryMuscleGroup: "chest",
    equipmentType: "machine",
    defaultTargetSets: 3,
    defaultTargetReps: 12,
    defaultStartingWeightLbs: 40,
    defaultIncrementLbs: 5
  },
  {
    slug: "cable-fly",
    name: "Cable Fly",
    category: "accessory",
    movementPattern: "push",
    primaryMuscleGroup: "chest",
    equipmentType: "cable",
    defaultTargetSets: 3,
    defaultTargetReps: 12,
    defaultStartingWeightLbs: 20,
    defaultIncrementLbs: 2.5
  },
  {
    slug: "push-ups",
    name: "Push-Ups",
    category: "compound",
    movementPattern: "push",
    primaryMuscleGroup: "chest",
    equipmentType: "bodyweight",
    defaultTargetSets: 3,
    defaultTargetReps: 12,
    defaultStartingWeightLbs: 0,
    defaultIncrementLbs: 2.5,
    isBodyweight: true,
    isWeightOptional: true
  },
  {
    slug: "dips",
    name: "Dips",
    category: "compound",
    movementPattern: "push",
    primaryMuscleGroup: "triceps",
    equipmentType: "bodyweight",
    defaultTargetSets: 3,
    defaultTargetReps: 8,
    defaultStartingWeightLbs: 0,
    defaultIncrementLbs: 2.5,
    isBodyweight: true,
    isWeightOptional: true
  },
  {
    slug: "close-grip-bench-press",
    name: "Close-Grip Bench Press",
    category: "compound",
    movementPattern: "push",
    primaryMuscleGroup: "triceps",
    equipmentType: "barbell",
    defaultTargetSets: 3,
    defaultTargetReps: 8,
    defaultStartingWeightLbs: 85,
    defaultIncrementLbs: 5
  },
  {
    slug: "lat-raise",
    name: "Lateral Raise",
    category: "accessory",
    movementPattern: "push",
    primaryMuscleGroup: "shoulders",
    equipmentType: "dumbbell",
    defaultTargetSets: 3,
    defaultTargetReps: 15,
    defaultStartingWeightLbs: 10,
    defaultIncrementLbs: 2.5
  },
  {
    slug: "rear-delt-fly",
    name: "Rear Delt Fly",
    category: "accessory",
    movementPattern: "pull",
    primaryMuscleGroup: "shoulders",
    equipmentType: "dumbbell",
    defaultTargetSets: 3,
    defaultTargetReps: 15,
    defaultStartingWeightLbs: 10,
    defaultIncrementLbs: 2.5
  },
  {
    slug: "face-pull",
    name: "Face Pull",
    category: "accessory",
    movementPattern: "pull",
    primaryMuscleGroup: "upper_back",
    equipmentType: "cable",
    defaultTargetSets: 3,
    defaultTargetReps: 15,
    defaultStartingWeightLbs: 25,
    defaultIncrementLbs: 2.5
  },
  {
    slug: "dumbbell-shoulder-press",
    name: "DB Shoulder Press",
    category: "compound",
    movementPattern: "push",
    primaryMuscleGroup: "shoulders",
    equipmentType: "dumbbell",
    defaultTargetSets: 3,
    defaultTargetReps: 10,
    defaultStartingWeightLbs: 25,
    defaultIncrementLbs: 5
  },
  {
    slug: "machine-shoulder-press",
    name: "Machine Shoulder Press",
    category: "compound",
    movementPattern: "push",
    primaryMuscleGroup: "shoulders",
    equipmentType: "machine",
    defaultTargetSets: 3,
    defaultTargetReps: 10,
    defaultStartingWeightLbs: 40,
    defaultIncrementLbs: 5
  },
  {
    slug: "seated-cable-row",
    name: "Seated Cable Row",
    category: "compound",
    movementPattern: "pull",
    primaryMuscleGroup: "back",
    equipmentType: "cable",
    defaultTargetSets: 3,
    defaultTargetReps: 10,
    defaultStartingWeightLbs: 60,
    defaultIncrementLbs: 5
  },
  {
    slug: "chest-supported-row",
    name: "Chest Supported Row",
    category: "compound",
    movementPattern: "pull",
    primaryMuscleGroup: "back",
    equipmentType: "machine",
    defaultTargetSets: 3,
    defaultTargetReps: 10,
    defaultStartingWeightLbs: 60,
    defaultIncrementLbs: 5
  },
  {
    slug: "t-bar-row",
    name: "T-Bar Row",
    category: "compound",
    movementPattern: "pull",
    primaryMuscleGroup: "back",
    equipmentType: "machine",
    defaultTargetSets: 3,
    defaultTargetReps: 8,
    defaultStartingWeightLbs: 70,
    defaultIncrementLbs: 5
  },
  {
    slug: "chin-ups",
    name: "Chin-Ups",
    category: "compound",
    movementPattern: "pull",
    primaryMuscleGroup: "lats",
    equipmentType: "bodyweight",
    defaultStartingWeightLbs: 0,
    defaultIncrementLbs: 2.5,
    defaultTargetSets: 3,
    defaultTargetReps: 8,
    isBodyweight: true,
    isWeightOptional: true
  },
  {
    slug: "cable-tricep-extension",
    name: "Cable Tricep Extension",
    category: "accessory",
    movementPattern: "push",
    primaryMuscleGroup: "triceps",
    equipmentType: "cable",
    defaultTargetSets: 3,
    defaultTargetReps: 12,
    defaultStartingWeightLbs: 25,
    defaultIncrementLbs: 2.5
  },
  {
    slug: "cable-overhead-tricep-extension",
    name: "Cable Overhead Tricep Extension",
    category: "accessory",
    movementPattern: "push",
    primaryMuscleGroup: "triceps",
    equipmentType: "cable",
    defaultTargetSets: 3,
    defaultTargetReps: 12,
    defaultStartingWeightLbs: 20,
    defaultIncrementLbs: 2.5
  },
  {
    slug: "preacher-curl",
    name: "Preacher Curl",
    category: "accessory",
    movementPattern: "pull",
    primaryMuscleGroup: "biceps",
    equipmentType: "machine",
    defaultTargetSets: 3,
    defaultTargetReps: 12,
    defaultStartingWeightLbs: 30,
    defaultIncrementLbs: 2.5
  },
  {
    slug: "cable-curl",
    name: "Cable Curl",
    category: "accessory",
    movementPattern: "pull",
    primaryMuscleGroup: "biceps",
    equipmentType: "cable",
    defaultTargetSets: 3,
    defaultTargetReps: 12,
    defaultStartingWeightLbs: 20,
    defaultIncrementLbs: 2.5
  },
  {
    slug: "plank",
    name: "Plank",
    category: "accessory",
    movementPattern: "core",
    primaryMuscleGroup: "core",
    equipmentType: "bodyweight",
    defaultTargetSets: 3,
    defaultTargetReps: 30,
    defaultStartingWeightLbs: 0,
    defaultIncrementLbs: 2.5,
    isBodyweight: true,
    isWeightOptional: true,
    isProgressionEligible: false
  },
  {
    slug: "hanging-leg-raise",
    name: "Hanging Leg Raise",
    category: "accessory",
    movementPattern: "core",
    primaryMuscleGroup: "core",
    equipmentType: "bodyweight",
    defaultTargetSets: 3,
    defaultTargetReps: 10,
    defaultStartingWeightLbs: 0,
    defaultIncrementLbs: 2.5,
    isBodyweight: true,
    isWeightOptional: true
  },
  {
    slug: "cable-crunch",
    name: "Cable Crunch",
    category: "accessory",
    movementPattern: "core",
    primaryMuscleGroup: "core",
    equipmentType: "cable",
    defaultTargetSets: 3,
    defaultTargetReps: 12,
    defaultStartingWeightLbs: 25,
    defaultIncrementLbs: 2.5
  },
  {
    slug: "ab-wheel",
    name: "Ab Wheel",
    category: "accessory",
    movementPattern: "core",
    primaryMuscleGroup: "core",
    equipmentType: "bodyweight",
    defaultTargetSets: 3,
    defaultTargetReps: 10,
    defaultStartingWeightLbs: 0,
    defaultIncrementLbs: 2.5,
    isBodyweight: true,
    isWeightOptional: true
  },
  {
    slug: "power-clean",
    name: "Power Clean",
    category: "compound",
    movementPattern: "hinge",
    primaryMuscleGroup: "posterior_chain",
    equipmentType: "barbell",
    defaultTargetSets: 3,
    defaultTargetReps: 3,
    defaultStartingWeightLbs: 75,
    defaultIncrementLbs: 5
  },
  {
    slug: "clean-and-jerk",
    name: "Clean and Jerk",
    category: "compound",
    movementPattern: "hinge",
    primaryMuscleGroup: "posterior_chain",
    equipmentType: "barbell",
    defaultTargetSets: 3,
    defaultTargetReps: 2,
    defaultStartingWeightLbs: 65,
    defaultIncrementLbs: 5
  },
  {
    slug: "snatch",
    name: "Snatch",
    category: "compound",
    movementPattern: "hinge",
    primaryMuscleGroup: "posterior_chain",
    equipmentType: "barbell",
    defaultTargetSets: 3,
    defaultTargetReps: 2,
    defaultStartingWeightLbs: 45,
    defaultIncrementLbs: 5
  }
];

export const fullBodyBeginner3Day: SeedProgram = {
  name: "3-Day Full Body Beginner",
  description: "Three approachable full-body sessions with simple add-weight-when-ready progression.",
  daysPerWeek: 3,
  sessionDurationMinutes: 60,
  difficultyLevel: "beginner",
  templates: [
    {
      name: "Full Body Strength",
      category: "Full Body",
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
      name: "Full Body Posterior Chain",
      category: "Full Body",
      sequenceOrder: 2,
      estimatedDurationMinutes: 55,
      exercises: [
        { exerciseSlug: "deadlift", sequenceOrder: 1, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "overhead-press", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "lat-pulldown", sequenceOrder: 3, targetSets: 3, targetReps: 8, restSeconds: 90 },
        { exerciseSlug: "leg-curl", sequenceOrder: 4, targetSets: 3, targetReps: 8, restSeconds: 75 },
        { exerciseSlug: "bicep-curl", sequenceOrder: 5, targetSets: 3, targetReps: 8, restSeconds: 75 }
      ]
    },
    {
      name: "Full Body Press + Legs",
      category: "Full Body",
      sequenceOrder: 3,
      estimatedDurationMinutes: 55,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "overhead-press", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "lat-pulldown", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "leg-curl", sequenceOrder: 4, targetSets: 3, targetReps: 10, restSeconds: 75 }
      ]
    }
  ]
};

export const upperLower4Day: SeedProgram = {
  name: "4-Day Upper/Lower",
  description: "Balanced upper and lower days with steady double-progression targets.",
  daysPerWeek: 4,
  sessionDurationMinutes: 55,
  difficultyLevel: "beginner",
  templates: [
    {
      name: "Upper Strength",
      category: "Push",
      sequenceOrder: 1,
      estimatedDurationMinutes: 55,
      exercises: [
        { exerciseSlug: "bench-press", sequenceOrder: 1, targetSets: 3, targetReps: 6, restSeconds: 120 },
        { exerciseSlug: "barbell-row", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "overhead-press", sequenceOrder: 3, targetSets: 3, targetReps: 8, restSeconds: 90 },
        { exerciseSlug: "lat-pulldown", sequenceOrder: 4, targetSets: 3, targetReps: 10, restSeconds: 90 }
      ]
    },
    {
      name: "Lower Strength",
      category: "Legs",
      sequenceOrder: 2,
      estimatedDurationMinutes: 55,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 3, targetReps: 6, restSeconds: 120 },
        { exerciseSlug: "romanian-deadlift", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "lunges", sequenceOrder: 3, targetSets: 2, targetReps: 10, restSeconds: 90 }
      ]
    },
    {
      name: "Upper Volume",
      category: "Pull",
      sequenceOrder: 3,
      estimatedDurationMinutes: 50,
      exercises: [
        { exerciseSlug: "incline-db-press", sequenceOrder: 1, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "db-row", sequenceOrder: 2, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "tricep-pushdown", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 75 },
        { exerciseSlug: "db-curl", sequenceOrder: 4, targetSets: 3, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Lower Volume",
      category: "Legs",
      sequenceOrder: 4,
      estimatedDurationMinutes: 50,
      exercises: [
        { exerciseSlug: "deadlift", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 120 },
        { exerciseSlug: "leg-curl", sequenceOrder: 2, targetSets: 3, targetReps: 10, restSeconds: 75 },
        { exerciseSlug: "lunges", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 90 }
      ]
    }
  ]
};

export const upperLowerArms4Day: SeedProgram = {
  name: "4-Day Upper/Lower + Arms",
  description: "Four weekly upper/lower sessions with extra arm volume and simple progression targets.",
  daysPerWeek: 4,
  sessionDurationMinutes: 55,
  difficultyLevel: "beginner",
  templates: [
    {
      name: "Push Strength",
      category: "Push",
      sequenceOrder: 1,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "bench-press", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 120 },
        { exerciseSlug: "pull-ups", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "db-row", sequenceOrder: 3, targetSets: 2, targetReps: 8, restSeconds: 90 },
        { exerciseSlug: "db-curl", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 75 },
        {
          exerciseSlug: "overhead-db-tricep-extension",
          sequenceOrder: 5,
          targetSets: 2,
          targetReps: 12,
          restSeconds: 75
        }
      ]
    },
    {
      name: "Legs Strength",
      category: "Legs",
      sequenceOrder: 2,
      estimatedDurationMinutes: 55,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 120 },
        {
          exerciseSlug: "romanian-deadlift",
          sequenceOrder: 2,
          targetSets: 2,
          targetReps: 8,
          restSeconds: 120
        },
        { exerciseSlug: "lunges", sequenceOrder: 3, targetSets: 2, targetReps: 8, restSeconds: 90 }
      ]
    },
    {
      name: "Pull + Arms",
      category: "Pull",
      sequenceOrder: 3,
      estimatedDurationMinutes: 55,
      exercises: [
        { exerciseSlug: "incline-db-press", sequenceOrder: 1, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "pull-ups", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "incline-db-curl", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 75 },
        { exerciseSlug: "skull-crushers", sequenceOrder: 4, targetSets: 3, targetReps: 10, restSeconds: 75 },
        { exerciseSlug: "hammer-curl", sequenceOrder: 5, targetSets: 2, targetReps: 10, restSeconds: 75 }
      ]
    },
    {
      name: "Quick Arms",
      category: "Quick",
      sequenceOrder: 4,
      estimatedDurationMinutes: 35,
      exercises: [
        { exerciseSlug: "db-curl", sequenceOrder: 1, targetSets: 3, targetReps: 10, restSeconds: 75 },
        { exerciseSlug: "skull-crushers", sequenceOrder: 2, targetSets: 3, targetReps: 10, restSeconds: 75 },
        { exerciseSlug: "hammer-curl", sequenceOrder: 3, targetSets: 2, targetReps: 10, restSeconds: 75 }
      ]
    },
  ]
};

export const pushPullLegs5Day: SeedProgram = {
  name: "5-Day Push/Pull/Legs",
  description: "Higher-frequency push, pull, and legs rotation with repeat exposure for skill practice.",
  daysPerWeek: 5,
  sessionDurationMinutes: 55,
  difficultyLevel: "intermediate",
  templates: [
    {
      name: "Push Strength",
      category: "Push",
      sequenceOrder: 1,
      estimatedDurationMinutes: 55,
      exercises: [
        { exerciseSlug: "bench-press", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 120 },
        { exerciseSlug: "overhead-press", sequenceOrder: 2, targetSets: 3, targetReps: 6, restSeconds: 120 },
        { exerciseSlug: "tricep-pushdown", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Pull Strength",
      category: "Pull",
      sequenceOrder: 2,
      estimatedDurationMinutes: 55,
      exercises: [
        { exerciseSlug: "deadlift", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 120 },
        { exerciseSlug: "pull-ups", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "db-row", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 90 }
      ]
    },
    {
      name: "Legs",
      category: "Legs",
      sequenceOrder: 3,
      estimatedDurationMinutes: 55,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 3, targetReps: 6, restSeconds: 120 },
        { exerciseSlug: "romanian-deadlift", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "leg-curl", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Push Hypertrophy",
      category: "Push",
      sequenceOrder: 4,
      estimatedDurationMinutes: 50,
      exercises: [
        { exerciseSlug: "incline-db-press", sequenceOrder: 1, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "overhead-db-tricep-extension", sequenceOrder: 2, targetSets: 3, targetReps: 12, restSeconds: 75 },
        { exerciseSlug: "skull-crushers", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Pull Hypertrophy",
      category: "Pull",
      sequenceOrder: 5,
      estimatedDurationMinutes: 50,
      exercises: [
        { exerciseSlug: "lat-pulldown", sequenceOrder: 1, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "db-row", sequenceOrder: 2, targetSets: 3, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "hammer-curl", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 75 }
      ]
    }
  ]
};

export const strengthFocus3Day: SeedProgram = {
  name: "3-Day Strength Focus",
  description: "Three heavier compound-focused days with modest accessories and conservative load jumps.",
  daysPerWeek: 3,
  sessionDurationMinutes: 60,
  difficultyLevel: "intermediate",
  templates: [
    {
      name: "Squat + Bench",
      category: "Full Body",
      sequenceOrder: 1,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 150 },
        { exerciseSlug: "bench-press", sequenceOrder: 2, targetSets: 3, targetReps: 5, restSeconds: 150 },
        { exerciseSlug: "barbell-row", sequenceOrder: 3, targetSets: 3, targetReps: 6, restSeconds: 120 }
      ]
    },
    {
      name: "Deadlift + Press",
      category: "Full Body",
      sequenceOrder: 2,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "deadlift", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 150 },
        { exerciseSlug: "overhead-press", sequenceOrder: 2, targetSets: 3, targetReps: 5, restSeconds: 120 },
        { exerciseSlug: "pull-ups", sequenceOrder: 3, targetSets: 3, targetReps: 8, restSeconds: 120 }
      ]
    },
    {
      name: "Squat Volume",
      category: "Full Body",
      sequenceOrder: 3,
      estimatedDurationMinutes: 55,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 3, targetReps: 6, restSeconds: 120 },
        { exerciseSlug: "incline-db-press", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 90 },
        { exerciseSlug: "db-row", sequenceOrder: 3, targetSets: 3, targetReps: 8, restSeconds: 90 }
      ]
    }
  ]
};

export const hypertrophyFocus4Day: SeedProgram = {
  name: "4-Day Hypertrophy Focus",
  description: "Moderate-load upper/lower volume days built around accumulating quality sets.",
  daysPerWeek: 4,
  sessionDurationMinutes: 50,
  difficultyLevel: "intermediate",
  templates: [
    {
      name: "Upper Volume Push",
      category: "Push",
      sequenceOrder: 1,
      estimatedDurationMinutes: 50,
      exercises: [
        { exerciseSlug: "incline-db-press", sequenceOrder: 1, targetSets: 4, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "overhead-press", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 90 },
        { exerciseSlug: "tricep-pushdown", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Lower Volume Quads",
      category: "Legs",
      sequenceOrder: 2,
      estimatedDurationMinutes: 50,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 4, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "lunges", sequenceOrder: 2, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "leg-curl", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Upper Volume Pull",
      category: "Pull",
      sequenceOrder: 3,
      estimatedDurationMinutes: 50,
      exercises: [
        { exerciseSlug: "lat-pulldown", sequenceOrder: 1, targetSets: 4, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "db-row", sequenceOrder: 2, targetSets: 3, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "incline-db-curl", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Lower Volume Hinge",
      category: "Legs",
      sequenceOrder: 4,
      estimatedDurationMinutes: 50,
      exercises: [
        { exerciseSlug: "romanian-deadlift", sequenceOrder: 1, targetSets: 4, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "leg-curl", sequenceOrder: 2, targetSets: 3, targetReps: 12, restSeconds: 75 },
        { exerciseSlug: "lunges", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 90 }
      ]
    }
  ]
};

export const seedPrograms = [
  fullBodyBeginner3Day,
  upperLower4Day,
  upperLowerArms4Day,
  pushPullLegs5Day,
  strengthFocus3Day,
  hypertrophyFocus4Day
];
