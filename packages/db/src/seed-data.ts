import type {
  DifficultyLevel,
  ExerciseCategory,
  PredefinedWorkoutCategory,
  TrainingGoal,
  ProgressionStrategy,
  PredefinedProgramMetadataDto
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
  repRangeMin?: number;
  repRangeMax?: number;
  restSeconds: number;
  progressionStrategy?: ProgressionStrategy;
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
  trainingGoal: TrainingGoal | null;
  metadata: PredefinedProgramMetadataDto;
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
    slug: "dumbbell-romanian-deadlift",
    name: "DB Romanian Deadlift",
    category: "compound",
    movementPattern: "hinge",
    primaryMuscleGroup: "hamstrings",
    equipmentType: "dumbbell",
    defaultTargetSets: 3,
    defaultTargetReps: 10,
    defaultStartingWeightLbs: 40,
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
    slug: "goblet-squat",
    name: "Goblet Squat",
    category: "compound",
    movementPattern: "squat",
    primaryMuscleGroup: "quads",
    equipmentType: "dumbbell",
    defaultTargetSets: 3,
    defaultTargetReps: 10,
    defaultStartingWeightLbs: 35,
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
  trainingGoal: "general_fitness",
  metadata: {
    version: 1,
    goalTypes: ["general_fitness", "strength", "consistency"],
    experienceLevels: ["beginner"],
    splitType: "full_body",
    estimatedSessionMinutes: 60,
    sessionDurationRange: { min: 45, max: 70 },
    equipmentRequired: ["barbell", "dumbbell", "machine", "cable"],
    primaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["conservative", "balanced"],
    recoveryDemand: "moderate",
    fatigueToleranceFit: "normal",
    scheduleRealismFit: "some_flex",
    complexityLevel: "low",
    weeklyVolumeLevel: "moderate",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 8,
    goodFor: [
      "Beginners who want a full-body plan that hits all major muscle groups",
      "People who like repeating the basics and progressing steadily",
      "Anyone returning to the gym and rebuilding a consistent routine"
    ],
    notIdealFor: [
      "Dumbbell-only or bodyweight-only setups",
      "Advanced lifters who want very high volume or specialization"
    ],
    rationale:
      "Simple full-body training 3x/week builds consistency and strength without excessive complexity or volume.",
    tags: ["beginner", "full_body", "consistency", "general_fitness", "strength"]
  },
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
  trainingGoal: "general_fitness",
  metadata: {
    version: 1,
    goalTypes: ["general_fitness", "hypertrophy", "strength", "consistency"],
    experienceLevels: ["beginner", "intermediate"],
    splitType: "upper_lower",
    estimatedSessionMinutes: 55,
    sessionDurationRange: { min: 45, max: 70 },
    equipmentRequired: ["barbell", "dumbbell", "cable", "machine"],
    primaryFocusAreas: ["balanced"],
    secondaryFocusAreas: ["upper_body", "lower_body"],
    progressionStyleCompatibility: ["conservative", "balanced"],
    recoveryDemand: "moderate",
    fatigueToleranceFit: "normal",
    scheduleRealismFit: "some_flex",
    complexityLevel: "moderate",
    weeklyVolumeLevel: "moderate",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 8,
    goodFor: [
      "Beginners ready to move from full-body to a simple upper/lower split",
      "People who want balanced strength and muscle-building work across the week"
    ],
    notIdealFor: [
      "Bodyweight-only setups",
      "Anyone who can only train 2-3 days/week"
    ],
    rationale:
      "Upper/lower splits are an efficient next step: enough weekly volume to grow, with manageable session length and recovery.",
    tags: ["upper_lower", "beginner", "intermediate", "balanced", "hybrid"]
  },
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
  trainingGoal: "hypertrophy",
  metadata: {
    version: 1,
    goalTypes: ["hypertrophy", "general_fitness"],
    experienceLevels: ["beginner", "intermediate"],
    splitType: "upper_lower",
    estimatedSessionMinutes: 55,
    sessionDurationRange: { min: 45, max: 75 },
    equipmentRequired: ["barbell", "dumbbell", "bodyweight"],
    primaryFocusAreas: ["arms", "upper_body"],
    secondaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["balanced", "aggressive"],
    recoveryDemand: "moderate",
    fatigueToleranceFit: "normal",
    scheduleRealismFit: "some_flex",
    complexityLevel: "moderate",
    weeklyVolumeLevel: "high",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 8,
    goodFor: [
      "Lifters who want an upper/lower split with extra arm work",
      "People chasing muscle gain without going to 5-6 days/week"
    ],
    notIdealFor: [
      "Low recovery tolerance or very short sessions",
      "Anyone who can only train 2-3 days/week"
    ],
    rationale:
      "Adds targeted arm volume while keeping the main lifts straightforward and repeatable across the week.",
    tags: ["upper_lower", "arms", "hypertrophy", "4_day"]
  },
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
  trainingGoal: "hypertrophy",
  metadata: {
    version: 1,
    goalTypes: ["hypertrophy", "strength"],
    experienceLevels: ["intermediate", "advanced"],
    splitType: "push_pull_legs",
    estimatedSessionMinutes: 55,
    sessionDurationRange: { min: 45, max: 75 },
    equipmentRequired: ["barbell", "dumbbell", "cable", "machine", "bodyweight"],
    primaryFocusAreas: ["balanced"],
    secondaryFocusAreas: ["upper_body", "lower_body"],
    progressionStyleCompatibility: ["balanced", "aggressive"],
    recoveryDemand: "high",
    fatigueToleranceFit: "high",
    scheduleRealismFit: "strict",
    complexityLevel: "moderate",
    weeklyVolumeLevel: "high",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 8,
    goodFor: [
      "Intermediate lifters who enjoy training most days of the week",
      "Hypertrophy with frequent practice on the main movement patterns"
    ],
    notIdealFor: [
      "Low recovery tolerance or inconsistent schedules",
      "Anyone limited to minimal equipment"
    ],
    rationale:
      "A 5-day PPL rotation increases weekly volume and practice frequency, but demands consistent scheduling and solid recovery.",
    tags: ["ppl", "hypertrophy", "intermediate", "high_volume", "5_day"]
  },
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
  trainingGoal: "strength",
  metadata: {
    version: 1,
    goalTypes: ["strength", "general_fitness", "sport_support"],
    experienceLevels: ["intermediate", "advanced"],
    splitType: "full_body",
    estimatedSessionMinutes: 60,
    sessionDurationRange: { min: 50, max: 75 },
    equipmentRequired: ["barbell", "bodyweight", "dumbbell"],
    primaryFocusAreas: ["balanced"],
    secondaryFocusAreas: ["lower_body", "upper_body"],
    progressionStyleCompatibility: ["conservative", "balanced"],
    recoveryDemand: "moderate",
    fatigueToleranceFit: "normal",
    scheduleRealismFit: "some_flex",
    complexityLevel: "moderate",
    weeklyVolumeLevel: "moderate",
    intensityLevel: "high",
    recommendedBlockWeeks: 8,
    goodFor: [
      "Intermediate lifters prioritizing strength on the big lifts",
      "Athletes who want strength support without excessive soreness"
    ],
    notIdealFor: [
      "Beginners who are still learning the main lifts",
      "People chasing very high hypertrophy volume"
    ],
    rationale:
      "Focuses on a few compound lifts per day with enough assistance to stay balanced, keeping weekly fatigue manageable.",
    tags: ["strength", "full_body", "3_day", "intermediate"]
  },
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
  trainingGoal: "hypertrophy",
  metadata: {
    version: 1,
    goalTypes: ["hypertrophy"],
    experienceLevels: ["intermediate", "advanced"],
    splitType: "upper_lower",
    estimatedSessionMinutes: 50,
    sessionDurationRange: { min: 40, max: 70 },
    equipmentRequired: ["barbell", "dumbbell", "machine", "cable"],
    primaryFocusAreas: ["balanced"],
    secondaryFocusAreas: ["upper_body", "lower_body"],
    progressionStyleCompatibility: ["balanced", "aggressive"],
    recoveryDemand: "moderate",
    fatigueToleranceFit: "normal",
    scheduleRealismFit: "some_flex",
    complexityLevel: "moderate",
    weeklyVolumeLevel: "high",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 8,
    goodFor: [
      "Intermediate lifters building muscle with a straightforward upper/lower split",
      "People who prefer moderate-length sessions with consistent weekly volume"
    ],
    notIdealFor: [
      "Inconsistent schedules that frequently miss workouts",
      "Minimal-equipment setups"
    ],
    rationale:
      "Upper/lower hypertrophy emphasizes quality weekly volume without pushing session length too far.",
    tags: ["hypertrophy", "upper_lower", "4_day", "intermediate"]
  },
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

export const beginnerFullBody2Day: SeedProgram = {
  name: "2-Day Beginner Full Body",
  description: "Two full-body sessions that cover the basics with low complexity and easy recovery.",
  daysPerWeek: 2,
  sessionDurationMinutes: 45,
  difficultyLevel: "beginner",
  trainingGoal: "general_fitness",
  metadata: {
    version: 1,
    goalTypes: ["general_fitness", "consistency", "strength"],
    experienceLevels: ["beginner"],
    splitType: "full_body",
    estimatedSessionMinutes: 45,
    sessionDurationRange: { min: 30, max: 55 },
    equipmentRequired: ["barbell", "dumbbell", "machine", "cable"],
    primaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["conservative", "balanced"],
    recoveryDemand: "low",
    fatigueToleranceFit: "low",
    scheduleRealismFit: "very_flex",
    complexityLevel: "low",
    weeklyVolumeLevel: "low",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 6,
    goodFor: ["Busy beginners", "People easing into a routine", "Low recovery tolerance"],
    notIdealFor: ["Hypertrophy specialization", "Bodyweight-only or dumbbell-only setups"],
    rationale: "Two well-rounded sessions make it easy to stay consistent while building basic strength.",
    tags: ["beginner", "2_day", "full_body", "consistency", "low_fatigue"]
  },
  templates: [
    {
      name: "Full Body A",
      category: "Full Body",
      sequenceOrder: 1,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "bench-press", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "lat-pulldown", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "leg-curl", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Full Body B",
      category: "Full Body",
      sequenceOrder: 2,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "deadlift", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 150 },
        { exerciseSlug: "overhead-press", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "barbell-row", sequenceOrder: 3, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "db-curl", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 75 }
      ]
    }
  ]
};

export const beginnerStrength3Day: SeedProgram = {
  name: "3-Day Beginner Strength",
  description: "A simple 3-day strength plan that emphasizes the big lifts without high volume.",
  daysPerWeek: 3,
  sessionDurationMinutes: 60,
  difficultyLevel: "beginner",
  trainingGoal: "strength",
  metadata: {
    version: 1,
    goalTypes: ["strength", "general_fitness"],
    experienceLevels: ["beginner"],
    splitType: "full_body",
    estimatedSessionMinutes: 60,
    sessionDurationRange: { min: 45, max: 70 },
    equipmentRequired: ["barbell", "dumbbell", "bodyweight"],
    primaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["conservative", "balanced"],
    recoveryDemand: "moderate",
    fatigueToleranceFit: "normal",
    scheduleRealismFit: "some_flex",
    complexityLevel: "low",
    weeklyVolumeLevel: "low",
    intensityLevel: "high",
    recommendedBlockWeeks: 8,
    goodFor: ["Beginners learning the main barbell lifts", "Strength-first goals on a 3-day schedule"],
    notIdealFor: ["Minimal equipment setups", "High-volume hypertrophy goals"],
    rationale: "Low-to-moderate volume lets beginners practice heavy compounds without getting buried in fatigue.",
    tags: ["beginner", "strength", "3_day", "barbell"]
  },
  templates: [
    {
      name: "Squat + Bench",
      category: "Full Body",
      sequenceOrder: 1,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 150 },
        { exerciseSlug: "bench-press", sequenceOrder: 2, targetSets: 3, targetReps: 5, restSeconds: 150 },
        { exerciseSlug: "barbell-row", sequenceOrder: 3, targetSets: 3, targetReps: 8, restSeconds: 120 }
      ]
    },
    {
      name: "Deadlift + Press",
      category: "Full Body",
      sequenceOrder: 2,
      estimatedDurationMinutes: 55,
      exercises: [
        { exerciseSlug: "deadlift", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 150 },
        { exerciseSlug: "overhead-press", sequenceOrder: 2, targetSets: 3, targetReps: 6, restSeconds: 120 },
        { exerciseSlug: "pull-ups", sequenceOrder: 3, targetSets: 3, targetReps: 6, restSeconds: 120 }
      ]
    },
    {
      name: "Squat + Bench (Volume)",
      category: "Full Body",
      sequenceOrder: 3,
      estimatedDurationMinutes: 55,
      exercises: [
        { exerciseSlug: "front-squat", sequenceOrder: 1, targetSets: 3, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "incline-db-press", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "db-row", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 90 }
      ]
    }
  ]
};

export const beginnerHypertrophy3Day: SeedProgram = {
  name: "3-Day Beginner Hypertrophy",
  description: "Beginner-friendly hypertrophy with moderate reps and manageable weekly volume.",
  daysPerWeek: 3,
  sessionDurationMinutes: 60,
  difficultyLevel: "beginner",
  trainingGoal: "hypertrophy",
  metadata: {
    version: 1,
    goalTypes: ["hypertrophy", "general_fitness"],
    experienceLevels: ["beginner"],
    splitType: "full_body",
    estimatedSessionMinutes: 60,
    sessionDurationRange: { min: 45, max: 75 },
    equipmentRequired: ["barbell", "dumbbell", "machine", "cable"],
    primaryFocusAreas: ["balanced"],
    secondaryFocusAreas: ["upper_body", "lower_body"],
    progressionStyleCompatibility: ["balanced"],
    recoveryDemand: "moderate",
    fatigueToleranceFit: "normal",
    scheduleRealismFit: "some_flex",
    complexityLevel: "low",
    weeklyVolumeLevel: "moderate",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 8,
    goodFor: ["Beginners who want to build muscle without 5+ training days", "People who like full-body training"],
    notIdealFor: ["Very short sessions", "Minimal equipment setups"],
    rationale: "Full-body hypertrophy 3x/week builds muscle efficiently while keeping sessions repeatable and not overly long.",
    tags: ["beginner", "hypertrophy", "full_body", "3_day"]
  },
  templates: [
    {
      name: "Full Body Pump A",
      category: "Full Body",
      sequenceOrder: 1,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 3, targetReps: 10, restSeconds: 120 },
        { exerciseSlug: "incline-db-press", sequenceOrder: 2, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "lat-pulldown", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "leg-extension", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 75 },
        { exerciseSlug: "tricep-pushdown", sequenceOrder: 5, targetSets: 2, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Full Body Pump B",
      category: "Full Body",
      sequenceOrder: 2,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "romanian-deadlift", sequenceOrder: 1, targetSets: 3, targetReps: 10, restSeconds: 120 },
        { exerciseSlug: "dumbbell-shoulder-press", sequenceOrder: 2, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "seated-cable-row", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "leg-curl", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 75 },
        { exerciseSlug: "db-curl", sequenceOrder: 5, targetSets: 2, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Full Body Pump C",
      category: "Full Body",
      sequenceOrder: 3,
      estimatedDurationMinutes: 55,
      exercises: [
        { exerciseSlug: "leg-press", sequenceOrder: 1, targetSets: 3, targetReps: 12, restSeconds: 120 },
        { exerciseSlug: "machine-chest-press", sequenceOrder: 2, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "db-row", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "lat-raise", sequenceOrder: 4, targetSets: 2, targetReps: 15, restSeconds: 60 },
        { exerciseSlug: "hammer-curl", sequenceOrder: 5, targetSets: 2, targetReps: 12, restSeconds: 60 }
      ]
    }
  ]
};

export const quickStart30Min3Day: SeedProgram = {
  name: "3-Day Quick Start (30 min)",
  description: "Short, simple sessions that build momentum when time is tight.",
  daysPerWeek: 3,
  sessionDurationMinutes: 30,
  difficultyLevel: "beginner",
  trainingGoal: "general_fitness",
  metadata: {
    version: 1,
    goalTypes: ["consistency", "general_fitness", "strength"],
    experienceLevels: ["beginner", "intermediate"],
    splitType: "full_body",
    estimatedSessionMinutes: 30,
    sessionDurationRange: { min: 25, max: 40 },
    equipmentRequired: ["barbell", "cable", "bodyweight", "dumbbell"],
    primaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["conservative", "balanced"],
    recoveryDemand: "low",
    fatigueToleranceFit: "low",
    scheduleRealismFit: "very_flex",
    complexityLevel: "low",
    weeklyVolumeLevel: "low",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 6,
    goodFor: ["Busy schedules", "People who want the fastest path to consistency"],
    notIdealFor: ["High-volume hypertrophy goals", "Advanced lifters seeking specialization"],
    rationale: "Three short full-body sessions keep the habit alive while still training the main patterns.",
    tags: ["quick", "30_min", "consistency", "full_body", "beginner"]
  },
  templates: [
    {
      name: "Quick Full Body A",
      category: "Quick",
      sequenceOrder: 1,
      estimatedDurationMinutes: 30,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 2, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "bench-press", sequenceOrder: 2, targetSets: 2, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "lat-pulldown", sequenceOrder: 3, targetSets: 2, targetReps: 10, restSeconds: 90 }
      ]
    },
    {
      name: "Quick Full Body B",
      category: "Quick",
      sequenceOrder: 2,
      estimatedDurationMinutes: 30,
      exercises: [
        { exerciseSlug: "deadlift", sequenceOrder: 1, targetSets: 2, targetReps: 5, restSeconds: 150 },
        { exerciseSlug: "overhead-press", sequenceOrder: 2, targetSets: 2, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "pull-ups", sequenceOrder: 3, targetSets: 2, targetReps: 6, restSeconds: 120 }
      ]
    },
    {
      name: "Quick Full Body C",
      category: "Quick",
      sequenceOrder: 3,
      estimatedDurationMinutes: 30,
      exercises: [
        { exerciseSlug: "goblet-squat", sequenceOrder: 1, targetSets: 2, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "incline-db-press", sequenceOrder: 2, targetSets: 2, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "seated-cable-row", sequenceOrder: 3, targetSets: 2, targetReps: 10, restSeconds: 90 }
      ]
    }
  ]
};

export const returnToTraining2Day: SeedProgram = {
  name: "2-Day Return to Training",
  description: "Low-soreness full-body sessions to rebuild strength and confidence after time off.",
  daysPerWeek: 2,
  sessionDurationMinutes: 45,
  difficultyLevel: "beginner",
  trainingGoal: "general_fitness",
  metadata: {
    version: 1,
    goalTypes: ["general_fitness", "consistency"],
    experienceLevels: ["beginner", "intermediate"],
    splitType: "full_body",
    estimatedSessionMinutes: 45,
    sessionDurationRange: { min: 35, max: 55 },
    equipmentRequired: ["machine", "cable", "dumbbell"],
    equipmentLimitations: ["Designed to be joint-friendly and low-soreness (moderate loads, fewer hard sets)."],
    primaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["conservative"],
    recoveryDemand: "low",
    fatigueToleranceFit: "low",
    scheduleRealismFit: "very_flex",
    complexityLevel: "low",
    weeklyVolumeLevel: "low",
    intensityLevel: "low",
    recommendedBlockWeeks: 6,
    goodFor: ["Coming back after a layoff", "Low recovery tolerance", "People who get sore easily"],
    notIdealFor: ["Strength peaking", "High-volume hypertrophy"],
    rationale: "Machine-leaning exercise selection and moderate effort help you rebuild without crippling soreness.",
    tags: ["returning", "low_soreness", "2_day", "general_fitness"]
  },
  templates: [
    {
      name: "Rebuild A",
      category: "Full Body",
      sequenceOrder: 1,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "leg-press", sequenceOrder: 1, targetSets: 3, targetReps: 10, restSeconds: 120 },
        { exerciseSlug: "machine-chest-press", sequenceOrder: 2, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "seated-cable-row", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "leg-curl", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Rebuild B",
      category: "Full Body",
      sequenceOrder: 2,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "hack-squat", sequenceOrder: 1, targetSets: 3, targetReps: 10, restSeconds: 120 },
        { exerciseSlug: "pec-deck", sequenceOrder: 2, targetSets: 3, targetReps: 12, restSeconds: 75 },
        { exerciseSlug: "lat-pulldown", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "db-curl", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 60 }
      ]
    }
  ]
};

export const generalFitness2Day: SeedProgram = {
  name: "2-Day General Fitness",
  description: "Two balanced sessions for strength and muscle maintenance without a big time commitment.",
  daysPerWeek: 2,
  sessionDurationMinutes: 45,
  difficultyLevel: "beginner",
  trainingGoal: "general_fitness",
  metadata: {
    version: 1,
    goalTypes: ["general_fitness", "consistency"],
    experienceLevels: ["beginner", "intermediate"],
    splitType: "full_body",
    estimatedSessionMinutes: 45,
    sessionDurationRange: { min: 35, max: 60 },
    equipmentRequired: ["barbell", "dumbbell", "bodyweight"],
    primaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["conservative", "balanced"],
    recoveryDemand: "low",
    fatigueToleranceFit: "low",
    scheduleRealismFit: "very_flex",
    complexityLevel: "low",
    weeklyVolumeLevel: "low",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 8,
    goodFor: ["Busy schedules", "Staying strong with 2 sessions/week"],
    notIdealFor: ["High-frequency training preferences", "Advanced hypertrophy volume"],
    rationale: "Two full-body workouts cover the essentials and are easy to schedule year-round.",
    tags: ["general_fitness", "2_day", "full_body"]
  },
  templates: [
    {
      name: "Full Body A",
      category: "Full Body",
      sequenceOrder: 1,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "incline-db-press", sequenceOrder: 2, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "db-row", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "hanging-leg-raise", sequenceOrder: 4, targetSets: 2, targetReps: 10, restSeconds: 60 }
      ]
    },
    {
      name: "Full Body B",
      category: "Full Body",
      sequenceOrder: 2,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "romanian-deadlift", sequenceOrder: 1, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "dumbbell-shoulder-press", sequenceOrder: 2, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "pull-ups", sequenceOrder: 3, targetSets: 3, targetReps: 6, restSeconds: 120 },
        { exerciseSlug: "hanging-leg-raise", sequenceOrder: 4, targetSets: 2, targetReps: 10, restSeconds: 60 }
      ]
    }
  ]
};

export const generalFitness3Day: SeedProgram = {
  name: "3-Day General Fitness",
  description: "Three full-body workouts that balance strength, muscle, and overall fitness.",
  daysPerWeek: 3,
  sessionDurationMinutes: 45,
  difficultyLevel: "beginner",
  trainingGoal: "general_fitness",
  metadata: {
    version: 1,
    goalTypes: ["general_fitness", "consistency"],
    experienceLevels: ["beginner", "intermediate"],
    splitType: "full_body",
    estimatedSessionMinutes: 45,
    sessionDurationRange: { min: 35, max: 60 },
    equipmentRequired: ["barbell", "dumbbell", "cable", "machine"],
    primaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["conservative", "balanced"],
    recoveryDemand: "moderate",
    fatigueToleranceFit: "normal",
    scheduleRealismFit: "some_flex",
    complexityLevel: "low",
    weeklyVolumeLevel: "moderate",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 8,
    goodFor: ["Beginners who want a balanced plan", "People who like full-body training"],
    notIdealFor: ["Hypertrophy specialization", "Very short sessions"],
    rationale: "Three full-body days lets you hit each pattern multiple times without needing long workouts.",
    tags: ["general_fitness", "3_day", "full_body"]
  },
  templates: [
    {
      name: "Full Body A",
      category: "Full Body",
      sequenceOrder: 1,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "bench-press", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "seated-cable-row", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 90 }
      ]
    },
    {
      name: "Full Body B",
      category: "Full Body",
      sequenceOrder: 2,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "deadlift", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 150 },
        { exerciseSlug: "dumbbell-shoulder-press", sequenceOrder: 2, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "lat-pulldown", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 90 }
      ]
    },
    {
      name: "Full Body C",
      category: "Full Body",
      sequenceOrder: 3,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "leg-press", sequenceOrder: 1, targetSets: 3, targetReps: 10, restSeconds: 120 },
        { exerciseSlug: "incline-db-press", sequenceOrder: 2, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "db-row", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 90 }
      ]
    }
  ]
};

export const minimalistStrength2Day: SeedProgram = {
  name: "2-Day Minimalist Strength",
  description: "Two hard-working days focused on the main barbell lifts and efficient assistance work.",
  daysPerWeek: 2,
  sessionDurationMinutes: 60,
  difficultyLevel: "intermediate",
  trainingGoal: "strength",
  metadata: {
    version: 1,
    goalTypes: ["strength", "sport_support", "general_fitness"],
    experienceLevels: ["intermediate", "advanced"],
    splitType: "full_body",
    estimatedSessionMinutes: 60,
    sessionDurationRange: { min: 50, max: 75 },
    equipmentRequired: ["barbell", "bodyweight"],
    primaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["conservative", "balanced"],
    recoveryDemand: "moderate",
    fatigueToleranceFit: "normal",
    scheduleRealismFit: "very_flex",
    complexityLevel: "moderate",
    weeklyVolumeLevel: "low",
    intensityLevel: "high",
    recommendedBlockWeeks: 8,
    goodFor: ["Strength with only 2 training days", "In-season strength maintenance"],
    notIdealFor: ["Hypertrophy specialization", "Beginners learning technique"],
    rationale: "Two full-body strength sessions drive progress while leaving recovery room for life or sport.",
    tags: ["strength", "2_day", "minimalist", "full_body"]
  },
  templates: [
    {
      name: "Strength A",
      category: "Full Body",
      sequenceOrder: 1,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "bench-press", sequenceOrder: 2, targetSets: 3, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "barbell-row", sequenceOrder: 3, targetSets: 3, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "hanging-leg-raise", sequenceOrder: 4, targetSets: 2, targetReps: 10, restSeconds: 60 }
      ]
    },
    {
      name: "Strength B",
      category: "Full Body",
      sequenceOrder: 2,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "deadlift", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "overhead-press", sequenceOrder: 2, targetSets: 3, targetReps: 5, restSeconds: 150 },
        { exerciseSlug: "pull-ups", sequenceOrder: 3, targetSets: 3, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "hanging-leg-raise", sequenceOrder: 4, targetSets: 2, targetReps: 10, restSeconds: 60 }
      ]
    }
  ]
};

export const upperLowerStrength4Day: SeedProgram = {
  name: "4-Day Upper/Lower Strength",
  description: "A straightforward upper/lower split that prioritizes strength on the big lifts.",
  daysPerWeek: 4,
  sessionDurationMinutes: 60,
  difficultyLevel: "intermediate",
  trainingGoal: "strength",
  metadata: {
    version: 1,
    goalTypes: ["strength"],
    experienceLevels: ["intermediate", "advanced"],
    splitType: "upper_lower",
    estimatedSessionMinutes: 60,
    sessionDurationRange: { min: 50, max: 75 },
    equipmentRequired: ["barbell", "dumbbell", "cable", "machine", "bodyweight"],
    primaryFocusAreas: ["balanced"],
    secondaryFocusAreas: ["upper_body", "lower_body"],
    progressionStyleCompatibility: ["balanced"],
    recoveryDemand: "high",
    fatigueToleranceFit: "high",
    scheduleRealismFit: "strict",
    complexityLevel: "moderate",
    weeklyVolumeLevel: "moderate",
    intensityLevel: "high",
    recommendedBlockWeeks: 8,
    goodFor: ["Intermediate lifters who want a classic strength split", "People with consistent 4-day schedules"],
    notIdealFor: ["Low recovery tolerance", "2-3 day schedules"],
    rationale: "More weekly exposure to the main lifts while keeping each session focused and recoverable.",
    tags: ["strength", "upper_lower", "4_day"]
  },
  templates: [
    {
      name: "Upper A",
      category: "Push",
      sequenceOrder: 1,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "bench-press", sequenceOrder: 1, targetSets: 4, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "barbell-row", sequenceOrder: 2, targetSets: 4, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "overhead-press", sequenceOrder: 3, targetSets: 3, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "lat-pulldown", sequenceOrder: 4, targetSets: 3, targetReps: 10, restSeconds: 90 }
      ]
    },
    {
      name: "Lower A",
      category: "Legs",
      sequenceOrder: 2,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 4, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "romanian-deadlift", sequenceOrder: 2, targetSets: 3, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "leg-curl", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "calf-raise", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Upper B",
      category: "Pull",
      sequenceOrder: 3,
      estimatedDurationMinutes: 55,
      exercises: [
        { exerciseSlug: "incline-bench-press", sequenceOrder: 1, targetSets: 4, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "pull-ups", sequenceOrder: 2, targetSets: 4, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "seated-cable-row", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "face-pull", sequenceOrder: 4, targetSets: 2, targetReps: 15, restSeconds: 60 }
      ]
    },
    {
      name: "Lower B",
      category: "Legs",
      sequenceOrder: 4,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "deadlift", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "front-squat", sequenceOrder: 2, targetSets: 3, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "leg-press", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 120 },
        { exerciseSlug: "cable-crunch", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 60 }
      ]
    }
  ]
};

export const strengthAccessories4Day: SeedProgram = {
  name: "4-Day Strength + Accessories",
  description: "Strength-focused upper/lower days with extra accessories for balanced muscle development.",
  daysPerWeek: 4,
  sessionDurationMinutes: 75,
  difficultyLevel: "intermediate",
  trainingGoal: "strength",
  metadata: {
    version: 1,
    goalTypes: ["strength", "hypertrophy"],
    experienceLevels: ["intermediate", "advanced"],
    splitType: "upper_lower",
    estimatedSessionMinutes: 75,
    sessionDurationRange: { min: 60, max: 90 },
    equipmentRequired: ["barbell", "dumbbell", "cable", "machine", "bodyweight"],
    primaryFocusAreas: ["balanced"],
    secondaryFocusAreas: ["upper_body", "lower_body"],
    progressionStyleCompatibility: ["balanced", "aggressive"],
    recoveryDemand: "high",
    fatigueToleranceFit: "high",
    scheduleRealismFit: "strict",
    complexityLevel: "high",
    weeklyVolumeLevel: "high",
    intensityLevel: "high",
    recommendedBlockWeeks: 8,
    goodFor: ["Strength with extra muscle-building volume", "People who like longer sessions"],
    notIdealFor: ["Short sessions", "Low recovery tolerance"],
    rationale: "Keeps heavy compounds first, then adds accessories to build weak points and improve balance.",
    tags: ["strength", "upper_lower", "accessories", "75_min"]
  },
  templates: [
    {
      name: "Upper Heavy",
      category: "Push",
      sequenceOrder: 1,
      estimatedDurationMinutes: 75,
      exercises: [
        { exerciseSlug: "bench-press", sequenceOrder: 1, targetSets: 4, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "barbell-row", sequenceOrder: 2, targetSets: 4, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "overhead-press", sequenceOrder: 3, targetSets: 3, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "lat-pulldown", sequenceOrder: 4, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "tricep-pushdown", sequenceOrder: 5, targetSets: 3, targetReps: 12, restSeconds: 75 },
        { exerciseSlug: "db-curl", sequenceOrder: 6, targetSets: 3, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Lower Heavy",
      category: "Legs",
      sequenceOrder: 2,
      estimatedDurationMinutes: 75,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 4, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "romanian-deadlift", sequenceOrder: 2, targetSets: 3, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "leg-press", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 120 },
        { exerciseSlug: "leg-curl", sequenceOrder: 4, targetSets: 3, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "calf-raise", sequenceOrder: 5, targetSets: 3, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Upper Volume",
      category: "Pull",
      sequenceOrder: 3,
      estimatedDurationMinutes: 70,
      exercises: [
        { exerciseSlug: "incline-bench-press", sequenceOrder: 1, targetSets: 3, targetReps: 8, restSeconds: 150 },
        { exerciseSlug: "pull-ups", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 150 },
        { exerciseSlug: "seated-cable-row", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "lat-raise", sequenceOrder: 4, targetSets: 3, targetReps: 15, restSeconds: 60 },
        { exerciseSlug: "skull-crushers", sequenceOrder: 5, targetSets: 3, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Lower Volume",
      category: "Legs",
      sequenceOrder: 4,
      estimatedDurationMinutes: 70,
      exercises: [
        { exerciseSlug: "front-squat", sequenceOrder: 1, targetSets: 3, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "deadlift", sequenceOrder: 2, targetSets: 3, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "leg-extension", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 75 },
        { exerciseSlug: "hip-thrust", sequenceOrder: 4, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "cable-crunch", sequenceOrder: 5, targetSets: 2, targetReps: 12, restSeconds: 60 }
      ]
    }
  ]
};

export const hypertrophyFullBody3Day: SeedProgram = {
  name: "3-Day Full Body Hypertrophy",
  description: "Full-body hypertrophy with balanced weekly volume and repeatable sessions.",
  daysPerWeek: 3,
  sessionDurationMinutes: 60,
  difficultyLevel: "intermediate",
  trainingGoal: "hypertrophy",
  metadata: {
    version: 1,
    goalTypes: ["hypertrophy"],
    experienceLevels: ["intermediate", "advanced"],
    splitType: "full_body",
    estimatedSessionMinutes: 60,
    sessionDurationRange: { min: 50, max: 75 },
    equipmentRequired: ["barbell", "dumbbell", "machine", "cable", "bodyweight"],
    primaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["balanced", "aggressive"],
    recoveryDemand: "moderate",
    fatigueToleranceFit: "normal",
    scheduleRealismFit: "some_flex",
    complexityLevel: "moderate",
    weeklyVolumeLevel: "high",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 8,
    goodFor: ["Hypertrophy goals on a 3-day schedule", "People who prefer full-body training"],
    notIdealFor: ["Very short sessions", "Low recovery tolerance"],
    rationale: "Accumulates quality weekly volume while keeping frequency high enough for steady progress.",
    tags: ["hypertrophy", "full_body", "3_day"]
  },
  templates: [
    {
      name: "Full Body A (Quads + Push)",
      category: "Full Body",
      sequenceOrder: 1,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "leg-press", sequenceOrder: 1, targetSets: 4, targetReps: 10, restSeconds: 120 },
        { exerciseSlug: "incline-bench-press", sequenceOrder: 2, targetSets: 4, targetReps: 8, restSeconds: 150 },
        { exerciseSlug: "seated-cable-row", sequenceOrder: 3, targetSets: 4, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "leg-extension", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 75 },
        { exerciseSlug: "tricep-pushdown", sequenceOrder: 5, targetSets: 2, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Full Body B (Hinge + Pull)",
      category: "Full Body",
      sequenceOrder: 2,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "romanian-deadlift", sequenceOrder: 1, targetSets: 4, targetReps: 8, restSeconds: 150 },
        { exerciseSlug: "pull-ups", sequenceOrder: 2, targetSets: 4, targetReps: 8, restSeconds: 150 },
        { exerciseSlug: "machine-chest-press", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "leg-curl", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 75 },
        { exerciseSlug: "db-curl", sequenceOrder: 5, targetSets: 2, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Full Body C (Glutes + Shoulders)",
      category: "Full Body",
      sequenceOrder: 3,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 3, targetReps: 8, restSeconds: 150 },
        { exerciseSlug: "dumbbell-shoulder-press", sequenceOrder: 2, targetSets: 4, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "db-row", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "hip-thrust", sequenceOrder: 4, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "lat-raise", sequenceOrder: 5, targetSets: 2, targetReps: 15, restSeconds: 60 }
      ]
    }
  ]
};

export const torsoLimbs4Day: SeedProgram = {
  name: "4-Day Torso/Limbs Hypertrophy",
  description: "A torso/limbs split for hypertrophy with efficient sessions and clear weekly structure.",
  daysPerWeek: 4,
  sessionDurationMinutes: 60,
  difficultyLevel: "intermediate",
  trainingGoal: "hypertrophy",
  metadata: {
    version: 1,
    goalTypes: ["hypertrophy"],
    experienceLevels: ["intermediate", "advanced"],
    splitType: "torso_limbs",
    estimatedSessionMinutes: 60,
    sessionDurationRange: { min: 50, max: 75 },
    equipmentRequired: ["barbell", "dumbbell", "machine", "cable", "bodyweight"],
    primaryFocusAreas: ["balanced"],
    secondaryFocusAreas: ["upper_body", "lower_body"],
    progressionStyleCompatibility: ["balanced", "aggressive"],
    recoveryDemand: "high",
    fatigueToleranceFit: "high",
    scheduleRealismFit: "strict",
    complexityLevel: "high",
    weeklyVolumeLevel: "high",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 8,
    goodFor: ["Hypertrophy with a clear split", "People who like slightly higher weekly volume"],
    notIdealFor: ["Inconsistent schedules", "Low recovery tolerance"],
    rationale: "Torso/limbs concentrates upper and lower work into dedicated days, enabling higher weekly volume without overly long sessions.",
    tags: ["hypertrophy", "torso_limbs", "4_day", "high_volume"]
  },
  templates: [
    {
      name: "Torso A",
      category: "Push",
      sequenceOrder: 1,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "incline-bench-press", sequenceOrder: 1, targetSets: 4, targetReps: 8, restSeconds: 150 },
        { exerciseSlug: "pull-ups", sequenceOrder: 2, targetSets: 4, targetReps: 8, restSeconds: 150 },
        { exerciseSlug: "dumbbell-shoulder-press", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "seated-cable-row", sequenceOrder: 4, targetSets: 3, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "tricep-pushdown", sequenceOrder: 5, targetSets: 2, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Limbs A",
      category: "Legs",
      sequenceOrder: 2,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "leg-press", sequenceOrder: 1, targetSets: 4, targetReps: 10, restSeconds: 120 },
        { exerciseSlug: "romanian-deadlift", sequenceOrder: 2, targetSets: 4, targetReps: 8, restSeconds: 150 },
        { exerciseSlug: "leg-extension", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 75 },
        { exerciseSlug: "leg-curl", sequenceOrder: 4, targetSets: 3, targetReps: 12, restSeconds: 75 },
        { exerciseSlug: "calf-raise", sequenceOrder: 5, targetSets: 2, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Torso B",
      category: "Pull",
      sequenceOrder: 3,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "machine-chest-press", sequenceOrder: 1, targetSets: 4, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "lat-pulldown", sequenceOrder: 2, targetSets: 4, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "overhead-press", sequenceOrder: 3, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "face-pull", sequenceOrder: 4, targetSets: 3, targetReps: 15, restSeconds: 60 },
        { exerciseSlug: "db-curl", sequenceOrder: 5, targetSets: 2, targetReps: 12, restSeconds: 60 }
      ]
    },
    {
      name: "Limbs B",
      category: "Legs",
      sequenceOrder: 4,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "hack-squat", sequenceOrder: 1, targetSets: 4, targetReps: 10, restSeconds: 120 },
        { exerciseSlug: "hip-thrust", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "leg-curl", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 75 },
        { exerciseSlug: "walking-lunge", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "cable-crunch", sequenceOrder: 5, targetSets: 2, targetReps: 12, restSeconds: 60 }
      ]
    }
  ]
};

export const upperLowerFocus5Day: SeedProgram = {
  name: "5-Day Upper/Lower + Focus Day",
  description: "Upper/lower hypertrophy with an extra focus day for shoulders and arms.",
  daysPerWeek: 5,
  sessionDurationMinutes: 60,
  difficultyLevel: "intermediate",
  trainingGoal: "hypertrophy",
  metadata: {
    version: 1,
    goalTypes: ["hypertrophy"],
    experienceLevels: ["intermediate", "advanced"],
    splitType: "upper_lower",
    estimatedSessionMinutes: 60,
    sessionDurationRange: { min: 50, max: 80 },
    equipmentRequired: ["barbell", "dumbbell", "cable", "machine", "bodyweight"],
    primaryFocusAreas: ["arms", "upper_body"],
    secondaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["balanced", "aggressive"],
    recoveryDemand: "high",
    fatigueToleranceFit: "high",
    scheduleRealismFit: "strict",
    complexityLevel: "high",
    weeklyVolumeLevel: "very_high",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 8,
    goodFor: ["Hypertrophy with extra arm/shoulder emphasis", "People who enjoy training 5 days/week"],
    notIdealFor: ["Low recovery tolerance", "Inconsistent schedules"],
    rationale: "Adds a dedicated focus day while keeping the rest of the week anchored by upper/lower structure.",
    tags: ["hypertrophy", "upper_lower", "focus_day", "arms", "5_day"]
  },
  templates: [
    {
      name: "Upper A",
      category: "Push",
      sequenceOrder: 1,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "incline-bench-press", sequenceOrder: 1, targetSets: 4, targetReps: 8, restSeconds: 150 },
        { exerciseSlug: "seated-cable-row", sequenceOrder: 2, targetSets: 4, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "overhead-press", sequenceOrder: 3, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "tricep-pushdown", sequenceOrder: 4, targetSets: 3, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Lower A",
      category: "Legs",
      sequenceOrder: 2,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 4, targetReps: 8, restSeconds: 150 },
        { exerciseSlug: "romanian-deadlift", sequenceOrder: 2, targetSets: 3, targetReps: 10, restSeconds: 120 },
        { exerciseSlug: "leg-extension", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 75 },
        { exerciseSlug: "leg-curl", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Upper B",
      category: "Pull",
      sequenceOrder: 3,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "bench-press", sequenceOrder: 1, targetSets: 3, targetReps: 8, restSeconds: 150 },
        { exerciseSlug: "pull-ups", sequenceOrder: 2, targetSets: 4, targetReps: 8, restSeconds: 150 },
        { exerciseSlug: "face-pull", sequenceOrder: 3, targetSets: 3, targetReps: 15, restSeconds: 60 },
        { exerciseSlug: "db-curl", sequenceOrder: 4, targetSets: 3, targetReps: 12, restSeconds: 60 }
      ]
    },
    {
      name: "Lower B",
      category: "Legs",
      sequenceOrder: 4,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "deadlift", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "leg-press", sequenceOrder: 2, targetSets: 3, targetReps: 10, restSeconds: 120 },
        { exerciseSlug: "hip-thrust", sequenceOrder: 3, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "calf-raise", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Focus Day (Arms + Shoulders)",
      category: "Push",
      sequenceOrder: 5,
      estimatedDurationMinutes: 55,
      exercises: [
        { exerciseSlug: "lat-raise", sequenceOrder: 1, targetSets: 4, targetReps: 15, restSeconds: 60 },
        { exerciseSlug: "rear-delt-fly", sequenceOrder: 2, targetSets: 3, targetReps: 15, restSeconds: 60 },
        { exerciseSlug: "skull-crushers", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 75 },
        { exerciseSlug: "incline-db-curl", sequenceOrder: 4, targetSets: 3, targetReps: 12, restSeconds: 60 },
        { exerciseSlug: "tricep-pushdown", sequenceOrder: 5, targetSets: 2, targetReps: 12, restSeconds: 60 }
      ]
    }
  ]
};

export const pushPullLegs6Day: SeedProgram = {
  name: "6-Day Push/Pull/Legs Hypertrophy",
  description: "High-frequency PPL hypertrophy for advanced lifters with strong recovery capacity.",
  daysPerWeek: 6,
  sessionDurationMinutes: 75,
  difficultyLevel: "advanced",
  trainingGoal: "hypertrophy",
  metadata: {
    version: 1,
    goalTypes: ["hypertrophy"],
    experienceLevels: ["advanced"],
    splitType: "push_pull_legs",
    estimatedSessionMinutes: 75,
    sessionDurationRange: { min: 60, max: 90 },
    equipmentRequired: ["barbell", "dumbbell", "machine", "cable", "bodyweight"],
    primaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["balanced", "aggressive"],
    recoveryDemand: "high",
    fatigueToleranceFit: "high",
    scheduleRealismFit: "strict",
    complexityLevel: "high",
    weeklyVolumeLevel: "very_high",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 6,
    goodFor: ["Advanced hypertrophy with 6-day availability", "People who recover well and like high volume"],
    notIdealFor: ["Beginners/intermediates", "Inconsistent schedules", "Low recovery tolerance"],
    rationale: "Six days allows high weekly volume spread across shorter muscle-specific sessions, but demands consistency and recovery.",
    tags: ["hypertrophy", "ppl", "6_day", "advanced", "very_high_volume"]
  },
  templates: [
    {
      name: "Push A",
      category: "Push",
      sequenceOrder: 1,
      estimatedDurationMinutes: 75,
      exercises: [
        { exerciseSlug: "bench-press", sequenceOrder: 1, targetSets: 4, targetReps: 8, restSeconds: 150 },
        { exerciseSlug: "incline-db-press", sequenceOrder: 2, targetSets: 4, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "lat-raise", sequenceOrder: 3, targetSets: 4, targetReps: 15, restSeconds: 60 },
        { exerciseSlug: "tricep-pushdown", sequenceOrder: 4, targetSets: 4, targetReps: 12, restSeconds: 60 }
      ]
    },
    {
      name: "Pull A",
      category: "Pull",
      sequenceOrder: 2,
      estimatedDurationMinutes: 75,
      exercises: [
        { exerciseSlug: "pull-ups", sequenceOrder: 1, targetSets: 4, targetReps: 8, restSeconds: 150 },
        { exerciseSlug: "seated-cable-row", sequenceOrder: 2, targetSets: 4, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "face-pull", sequenceOrder: 3, targetSets: 4, targetReps: 15, restSeconds: 60 },
        { exerciseSlug: "incline-db-curl", sequenceOrder: 4, targetSets: 4, targetReps: 12, restSeconds: 60 }
      ]
    },
    {
      name: "Legs A",
      category: "Legs",
      sequenceOrder: 3,
      estimatedDurationMinutes: 75,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 4, targetReps: 8, restSeconds: 180 },
        { exerciseSlug: "romanian-deadlift", sequenceOrder: 2, targetSets: 4, targetReps: 10, restSeconds: 150 },
        { exerciseSlug: "leg-extension", sequenceOrder: 3, targetSets: 4, targetReps: 12, restSeconds: 75 },
        { exerciseSlug: "leg-curl", sequenceOrder: 4, targetSets: 3, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Push B",
      category: "Push",
      sequenceOrder: 4,
      estimatedDurationMinutes: 70,
      exercises: [
        { exerciseSlug: "machine-chest-press", sequenceOrder: 1, targetSets: 4, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "overhead-press", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "pec-deck", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 75 },
        { exerciseSlug: "skull-crushers", sequenceOrder: 4, targetSets: 3, targetReps: 12, restSeconds: 75 }
      ]
    },
    {
      name: "Pull B",
      category: "Pull",
      sequenceOrder: 5,
      estimatedDurationMinutes: 70,
      exercises: [
        { exerciseSlug: "lat-pulldown", sequenceOrder: 1, targetSets: 4, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "db-row", sequenceOrder: 2, targetSets: 4, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "rear-delt-fly", sequenceOrder: 3, targetSets: 3, targetReps: 15, restSeconds: 60 },
        { exerciseSlug: "hammer-curl", sequenceOrder: 4, targetSets: 3, targetReps: 12, restSeconds: 60 }
      ]
    },
    {
      name: "Legs B",
      category: "Legs",
      sequenceOrder: 6,
      estimatedDurationMinutes: 75,
      exercises: [
        { exerciseSlug: "leg-press", sequenceOrder: 1, targetSets: 4, targetReps: 12, restSeconds: 120 },
        { exerciseSlug: "hip-thrust", sequenceOrder: 2, targetSets: 4, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "walking-lunge", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "calf-raise", sequenceOrder: 4, targetSets: 3, targetReps: 12, restSeconds: 75 }
      ]
    }
  ]
};

export const sportSupport2Day: SeedProgram = {
  name: "2-Day Sport Support Strength",
  description: "Low-interference strength sessions designed to support sport without excessive soreness.",
  daysPerWeek: 2,
  sessionDurationMinutes: 45,
  difficultyLevel: "intermediate",
  trainingGoal: "maintenance",
  metadata: {
    version: 1,
    goalTypes: ["sport_support", "strength", "general_fitness"],
    experienceLevels: ["beginner", "intermediate", "advanced"],
    splitType: "full_body",
    estimatedSessionMinutes: 45,
    sessionDurationRange: { min: 35, max: 60 },
    equipmentRequired: ["barbell", "bodyweight"],
    primaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["conservative"],
    recoveryDemand: "low",
    fatigueToleranceFit: "low",
    scheduleRealismFit: "very_flex",
    complexityLevel: "low",
    weeklyVolumeLevel: "low",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 6,
    goodFor: ["In-season athletes", "People doing hard conditioning or sport practice"],
    notIdealFor: ["Hypertrophy specialization", "Chasing rapid strength gains"],
    rationale: "Keeps volume modest and prioritizes repeatable, low-soreness strength work.",
    tags: ["sport_support", "maintenance", "2_day", "low_interference"]
  },
  templates: [
    {
      name: "Support A",
      category: "Full Body",
      sequenceOrder: 1,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "bench-press", sequenceOrder: 2, targetSets: 3, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "pull-ups", sequenceOrder: 3, targetSets: 3, targetReps: 6, restSeconds: 150 }
      ]
    },
    {
      name: "Support B",
      category: "Full Body",
      sequenceOrder: 2,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "deadlift", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "overhead-press", sequenceOrder: 2, targetSets: 3, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "barbell-row", sequenceOrder: 3, targetSets: 3, targetReps: 6, restSeconds: 150 }
      ]
    }
  ]
};

export const dumbbellOnly3Day: SeedProgram = {
  name: "3-Day Dumbbell-Only Hypertrophy",
  description: "Dumbbell-only training that still hits all major muscle groups for hypertrophy.",
  daysPerWeek: 3,
  sessionDurationMinutes: 45,
  difficultyLevel: "beginner",
  trainingGoal: "hypertrophy",
  metadata: {
    version: 1,
    goalTypes: ["hypertrophy", "general_fitness", "consistency"],
    experienceLevels: ["beginner", "intermediate"],
    splitType: "full_body",
    estimatedSessionMinutes: 45,
    sessionDurationRange: { min: 35, max: 60 },
    equipmentRequired: ["dumbbell"],
    primaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["balanced"],
    recoveryDemand: "moderate",
    fatigueToleranceFit: "normal",
    scheduleRealismFit: "some_flex",
    complexityLevel: "low",
    weeklyVolumeLevel: "moderate",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 8,
    goodFor: ["Dumbbell-only home setups", "Hypertrophy on a 3-day schedule"],
    notIdealFor: ["Barbell strength-specific goals", "Very high volume specialists"],
    rationale: "Uses dumbbell-friendly patterns (squat, hinge, press, row, lunge) to build muscle without needing a full gym.",
    tags: ["dumbbell_only", "hypertrophy", "3_day", "home"]
  },
  templates: [
    {
      name: "DB Full Body A",
      category: "Full Body",
      sequenceOrder: 1,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "goblet-squat", sequenceOrder: 1, targetSets: 4, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "incline-db-press", sequenceOrder: 2, targetSets: 4, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "db-row", sequenceOrder: 3, targetSets: 4, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "lat-raise", sequenceOrder: 4, targetSets: 2, targetReps: 15, restSeconds: 60 }
      ]
    },
    {
      name: "DB Full Body B",
      category: "Full Body",
      sequenceOrder: 2,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "dumbbell-romanian-deadlift", sequenceOrder: 1, targetSets: 4, targetReps: 10, restSeconds: 120 },
        { exerciseSlug: "dumbbell-shoulder-press", sequenceOrder: 2, targetSets: 4, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "bulgarian-split-squat", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "overhead-db-tricep-extension", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 60 }
      ]
    },
    {
      name: "DB Full Body C",
      category: "Full Body",
      sequenceOrder: 3,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "walking-lunge", sequenceOrder: 1, targetSets: 3, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "incline-db-press", sequenceOrder: 2, targetSets: 3, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "db-row", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "hammer-curl", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 60 }
      ]
    }
  ]
};

export const homeGymUpperLower4Day: SeedProgram = {
  name: "4-Day Home Gym Upper/Lower",
  description: "Upper/lower training built for a home gym with barbell + dumbbells (no machines required).",
  daysPerWeek: 4,
  sessionDurationMinutes: 60,
  difficultyLevel: "intermediate",
  trainingGoal: "hypertrophy",
  metadata: {
    version: 1,
    goalTypes: ["hypertrophy", "strength", "general_fitness"],
    experienceLevels: ["intermediate", "advanced"],
    splitType: "upper_lower",
    estimatedSessionMinutes: 60,
    sessionDurationRange: { min: 50, max: 75 },
    equipmentRequired: ["barbell", "dumbbell", "bodyweight"],
    equipmentLimitations: ["No machines or cables required."],
    primaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["balanced"],
    recoveryDemand: "high",
    fatigueToleranceFit: "high",
    scheduleRealismFit: "strict",
    complexityLevel: "moderate",
    weeklyVolumeLevel: "high",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 8,
    goodFor: ["Home gym lifters", "Upper/lower preference without machines"],
    notIdealFor: ["Bodyweight-only setups", "Inconsistent schedules"],
    rationale: "Uses barbell and dumbbell staples plus pull-ups to cover the main patterns without needing cables or machines.",
    tags: ["home_gym", "upper_lower", "4_day", "hypertrophy"]
  },
  templates: [
    {
      name: "Upper A",
      category: "Push",
      sequenceOrder: 1,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "bench-press", sequenceOrder: 1, targetSets: 4, targetReps: 8, restSeconds: 150 },
        { exerciseSlug: "pull-ups", sequenceOrder: 2, targetSets: 4, targetReps: 8, restSeconds: 150 },
        { exerciseSlug: "dumbbell-shoulder-press", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "db-row", sequenceOrder: 4, targetSets: 3, targetReps: 12, restSeconds: 90 }
      ]
    },
    {
      name: "Lower A",
      category: "Legs",
      sequenceOrder: 2,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 4, targetReps: 8, restSeconds: 150 },
        { exerciseSlug: "dumbbell-romanian-deadlift", sequenceOrder: 2, targetSets: 3, targetReps: 10, restSeconds: 120 },
        { exerciseSlug: "bulgarian-split-squat", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "glute-bridge", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 60 }
      ]
    },
    {
      name: "Upper B",
      category: "Pull",
      sequenceOrder: 3,
      estimatedDurationMinutes: 55,
      exercises: [
        { exerciseSlug: "incline-db-press", sequenceOrder: 1, targetSets: 4, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "barbell-row", sequenceOrder: 2, targetSets: 4, targetReps: 8, restSeconds: 150 },
        { exerciseSlug: "lat-raise", sequenceOrder: 3, targetSets: 3, targetReps: 15, restSeconds: 60 },
        { exerciseSlug: "db-curl", sequenceOrder: 4, targetSets: 3, targetReps: 12, restSeconds: 60 }
      ]
    },
    {
      name: "Lower B",
      category: "Legs",
      sequenceOrder: 4,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "deadlift", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "front-squat", sequenceOrder: 2, targetSets: 3, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "walking-lunge", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "hanging-leg-raise", sequenceOrder: 4, targetSets: 2, targetReps: 10, restSeconds: 60 }
      ]
    }
  ]
};

export const machinesCablesHypertrophy4Day: SeedProgram = {
  name: "4-Day Machines/Cables Hypertrophy",
  description: "Hypertrophy-focused training that leans on machines and cables for stable, joint-friendly volume.",
  daysPerWeek: 4,
  sessionDurationMinutes: 60,
  difficultyLevel: "intermediate",
  trainingGoal: "hypertrophy",
  metadata: {
    version: 1,
    goalTypes: ["hypertrophy", "general_fitness"],
    experienceLevels: ["beginner", "intermediate", "advanced"],
    splitType: "upper_lower",
    estimatedSessionMinutes: 60,
    sessionDurationRange: { min: 45, max: 75 },
    equipmentRequired: ["machine", "cable", "dumbbell"],
    equipmentLimitations: ["Barbell not required."],
    primaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["balanced"],
    recoveryDemand: "moderate",
    fatigueToleranceFit: "normal",
    scheduleRealismFit: "some_flex",
    complexityLevel: "moderate",
    weeklyVolumeLevel: "high",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 8,
    goodFor: ["Machine-friendly gyms", "Joint-friendly hypertrophy volume", "People who dislike heavy barbell work"],
    notIdealFor: ["Barbell strength specialists", "Minimal equipment setups"],
    rationale: "Machines and cables allow consistent tension and stable execution, making it easier to accumulate hypertrophy volume safely.",
    tags: ["machines", "cables", "hypertrophy", "4_day"]
  },
  templates: [
    {
      name: "Upper A (Machines)",
      category: "Push",
      sequenceOrder: 1,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "machine-chest-press", sequenceOrder: 1, targetSets: 4, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "lat-pulldown", sequenceOrder: 2, targetSets: 4, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "machine-shoulder-press", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "face-pull", sequenceOrder: 4, targetSets: 3, targetReps: 15, restSeconds: 60 },
        { exerciseSlug: "tricep-pushdown", sequenceOrder: 5, targetSets: 3, targetReps: 12, restSeconds: 60 }
      ]
    },
    {
      name: "Lower A (Machines)",
      category: "Legs",
      sequenceOrder: 2,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "leg-press", sequenceOrder: 1, targetSets: 4, targetReps: 12, restSeconds: 120 },
        { exerciseSlug: "leg-extension", sequenceOrder: 2, targetSets: 3, targetReps: 12, restSeconds: 75 },
        { exerciseSlug: "leg-curl", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 75 },
        { exerciseSlug: "seated-calf-raise", sequenceOrder: 4, targetSets: 3, targetReps: 15, restSeconds: 60 }
      ]
    },
    {
      name: "Upper B (Cables)",
      category: "Pull",
      sequenceOrder: 3,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "seated-cable-row", sequenceOrder: 1, targetSets: 4, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "cable-fly", sequenceOrder: 2, targetSets: 3, targetReps: 12, restSeconds: 60 },
        { exerciseSlug: "rear-delt-fly", sequenceOrder: 3, targetSets: 3, targetReps: 15, restSeconds: 60 },
        { exerciseSlug: "db-curl", sequenceOrder: 4, targetSets: 3, targetReps: 12, restSeconds: 60 }
      ]
    },
    {
      name: "Lower B (Glutes/Hamstrings)",
      category: "Legs",
      sequenceOrder: 4,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "hack-squat", sequenceOrder: 1, targetSets: 4, targetReps: 10, restSeconds: 120 },
        { exerciseSlug: "dumbbell-romanian-deadlift", sequenceOrder: 2, targetSets: 4, targetReps: 10, restSeconds: 120 },
        { exerciseSlug: "leg-curl", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 75 },
        { exerciseSlug: "cable-crunch", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 60 }
      ]
    }
  ]
};

export const bodyweightOnly3Day: SeedProgram = {
  name: "3-Day Bodyweight Minimal",
  description: "A minimalist bodyweight plan when you truly have almost no equipment.",
  daysPerWeek: 3,
  sessionDurationMinutes: 30,
  difficultyLevel: "beginner",
  trainingGoal: "general_fitness",
  metadata: {
    version: 1,
    goalTypes: ["consistency", "general_fitness"],
    experienceLevels: ["beginner", "intermediate"],
    splitType: "other",
    estimatedSessionMinutes: 30,
    sessionDurationRange: { min: 20, max: 40 },
    equipmentRequired: ["bodyweight"],
    equipmentLimitations: ["Lower-body options are limited without any external load."],
    primaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["conservative"],
    recoveryDemand: "low",
    fatigueToleranceFit: "low",
    scheduleRealismFit: "very_flex",
    complexityLevel: "low",
    weeklyVolumeLevel: "low",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 6,
    goodFor: ["No-gym situations", "Travel", "Getting started with minimal friction"],
    notIdealFor: ["Strength or hypertrophy specialization", "Lower-body muscle gain"],
    rationale: "Uses simple bodyweight staples to maintain momentum until more equipment is available.",
    tags: ["bodyweight", "minimal", "3_day", "quick"]
  },
  templates: [
    {
      name: "Upper Body",
      category: "Full Body",
      sequenceOrder: 1,
      estimatedDurationMinutes: 30,
      exercises: [
        { exerciseSlug: "push-ups", sequenceOrder: 1, targetSets: 4, targetReps: 12, restSeconds: 60 },
        { exerciseSlug: "pull-ups", sequenceOrder: 2, targetSets: 4, targetReps: 6, restSeconds: 90 },
        { exerciseSlug: "dips", sequenceOrder: 3, targetSets: 3, targetReps: 8, restSeconds: 90 },
        { exerciseSlug: "hanging-leg-raise", sequenceOrder: 4, targetSets: 2, targetReps: 10, restSeconds: 60 }
      ]
    },
    {
      name: "Posterior Chain",
      category: "Full Body",
      sequenceOrder: 2,
      estimatedDurationMinutes: 30,
      exercises: [
        { exerciseSlug: "glute-bridge", sequenceOrder: 1, targetSets: 4, targetReps: 12, restSeconds: 60 },
        { exerciseSlug: "nordic-hamstring-curl", sequenceOrder: 2, targetSets: 3, targetReps: 6, restSeconds: 120 },
        { exerciseSlug: "hanging-leg-raise", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 60 }
      ]
    },
    {
      name: "Full Body",
      category: "Full Body",
      sequenceOrder: 3,
      estimatedDurationMinutes: 30,
      exercises: [
        { exerciseSlug: "push-ups", sequenceOrder: 1, targetSets: 3, targetReps: 12, restSeconds: 60 },
        { exerciseSlug: "pull-ups", sequenceOrder: 2, targetSets: 3, targetReps: 6, restSeconds: 90 },
        { exerciseSlug: "glute-bridge", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 60 },
        { exerciseSlug: "hanging-leg-raise", sequenceOrder: 4, targetSets: 2, targetReps: 10, restSeconds: 60 }
      ]
    }
  ]
};

export const inSeasonMaintenance2Day: SeedProgram = {
  name: "2-Day In-Season Maintenance",
  description: "Very low fatigue strength work to maintain performance during a demanding sport season.",
  daysPerWeek: 2,
  sessionDurationMinutes: 45,
  difficultyLevel: "intermediate",
  trainingGoal: "maintenance",
  metadata: {
    version: 1,
    goalTypes: ["sport_support", "general_fitness", "strength"],
    experienceLevels: ["intermediate", "advanced"],
    splitType: "full_body",
    estimatedSessionMinutes: 45,
    sessionDurationRange: { min: 35, max: 55 },
    equipmentRequired: ["barbell", "bodyweight"],
    primaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["conservative"],
    recoveryDemand: "low",
    fatigueToleranceFit: "low",
    scheduleRealismFit: "very_flex",
    complexityLevel: "low",
    weeklyVolumeLevel: "low",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 6,
    goodFor: ["In-season training", "Sport + lifting with minimal interference"],
    notIdealFor: ["Hypertrophy goals", "People chasing rapid strength progression"],
    rationale: "Keeps the stimulus high enough to maintain strength while minimizing soreness and total fatigue.",
    tags: ["maintenance", "in_season", "2_day", "low_fatigue"]
  },
  templates: [
    {
      name: "Maintain A",
      category: "Full Body",
      sequenceOrder: 1,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 2, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "bench-press", sequenceOrder: 2, targetSets: 2, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "pull-ups", sequenceOrder: 3, targetSets: 2, targetReps: 6, restSeconds: 150 }
      ]
    },
    {
      name: "Maintain B",
      category: "Full Body",
      sequenceOrder: 2,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "deadlift", sequenceOrder: 1, targetSets: 2, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "overhead-press", sequenceOrder: 2, targetSets: 2, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "barbell-row", sequenceOrder: 3, targetSets: 2, targetReps: 6, restSeconds: 150 }
      ]
    }
  ]
};

export const sportSupport3Day: SeedProgram = {
  name: "3-Day Sport Support Strength",
  description: "Three lower-volume full-body sessions to build strength without heavy soreness.",
  daysPerWeek: 3,
  sessionDurationMinutes: 45,
  difficultyLevel: "intermediate",
  trainingGoal: "maintenance",
  metadata: {
    version: 1,
    goalTypes: ["sport_support", "strength", "general_fitness"],
    experienceLevels: ["intermediate", "advanced"],
    splitType: "full_body",
    estimatedSessionMinutes: 45,
    sessionDurationRange: { min: 35, max: 60 },
    equipmentRequired: ["barbell", "bodyweight"],
    primaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["conservative"],
    recoveryDemand: "moderate",
    fatigueToleranceFit: "low",
    scheduleRealismFit: "some_flex",
    complexityLevel: "low",
    weeklyVolumeLevel: "moderate",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 6,
    goodFor: ["Sport support 3x/week", "People who recover slower but still want frequent practice"],
    notIdealFor: ["Hypertrophy specialization"],
    rationale: "Spreads modest volume across three days to keep sessions short and soreness low.",
    tags: ["sport_support", "3_day", "low_interference"]
  },
  templates: [
    {
      name: "Support A",
      category: "Full Body",
      sequenceOrder: 1,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "bench-press", sequenceOrder: 2, targetSets: 3, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "pull-ups", sequenceOrder: 3, targetSets: 3, targetReps: 6, restSeconds: 150 }
      ]
    },
    {
      name: "Support B",
      category: "Full Body",
      sequenceOrder: 2,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "deadlift", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "overhead-press", sequenceOrder: 2, targetSets: 3, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "barbell-row", sequenceOrder: 3, targetSets: 3, targetReps: 6, restSeconds: 150 }
      ]
    },
    {
      name: "Support C",
      category: "Full Body",
      sequenceOrder: 3,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "front-squat", sequenceOrder: 1, targetSets: 3, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "incline-bench-press", sequenceOrder: 2, targetSets: 3, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "pull-ups", sequenceOrder: 3, targetSets: 3, targetReps: 6, restSeconds: 150 }
      ]
    }
  ]
};

export const dumbbellOnly2Day: SeedProgram = {
  name: "2-Day Dumbbell-Only Full Body",
  description: "Two dumbbell-only workouts that cover the essentials with simple, repeatable sessions.",
  daysPerWeek: 2,
  sessionDurationMinutes: 45,
  difficultyLevel: "beginner",
  trainingGoal: "general_fitness",
  metadata: {
    version: 1,
    goalTypes: ["general_fitness", "consistency", "hypertrophy"],
    experienceLevels: ["beginner", "intermediate"],
    splitType: "full_body",
    estimatedSessionMinutes: 45,
    sessionDurationRange: { min: 35, max: 60 },
    equipmentRequired: ["dumbbell"],
    primaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["conservative", "balanced"],
    recoveryDemand: "low",
    fatigueToleranceFit: "low",
    scheduleRealismFit: "very_flex",
    complexityLevel: "low",
    weeklyVolumeLevel: "low",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 8,
    goodFor: ["Dumbbell-only setups", "Busy schedules"],
    notIdealFor: ["Barbell strength specialization"],
    rationale: "Two efficient full-body days keep training consistent without needing a full gym.",
    tags: ["dumbbell_only", "2_day", "full_body"]
  },
  templates: [
    {
      name: "DB Full Body A",
      category: "Full Body",
      sequenceOrder: 1,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "goblet-squat", sequenceOrder: 1, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "incline-db-press", sequenceOrder: 2, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "db-row", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "lat-raise", sequenceOrder: 4, targetSets: 2, targetReps: 15, restSeconds: 60 }
      ]
    },
    {
      name: "DB Full Body B",
      category: "Full Body",
      sequenceOrder: 2,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "dumbbell-romanian-deadlift", sequenceOrder: 1, targetSets: 3, targetReps: 10, restSeconds: 120 },
        { exerciseSlug: "dumbbell-shoulder-press", sequenceOrder: 2, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "walking-lunge", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "db-curl", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 60 }
      ]
    }
  ]
};

export const dumbbellOnly4Day: SeedProgram = {
  name: "4-Day Dumbbell-Only Upper/Lower",
  description: "A dumbbell-only upper/lower split that builds muscle without machines or barbells.",
  daysPerWeek: 4,
  sessionDurationMinutes: 60,
  difficultyLevel: "intermediate",
  trainingGoal: "hypertrophy",
  metadata: {
    version: 1,
    goalTypes: ["hypertrophy", "general_fitness"],
    experienceLevels: ["intermediate", "advanced"],
    splitType: "upper_lower",
    estimatedSessionMinutes: 60,
    sessionDurationRange: { min: 45, max: 75 },
    equipmentRequired: ["dumbbell"],
    equipmentOptional: ["bodyweight"],
    primaryFocusAreas: ["balanced"],
    secondaryFocusAreas: ["upper_body", "lower_body"],
    progressionStyleCompatibility: ["balanced"],
    recoveryDemand: "high",
    fatigueToleranceFit: "high",
    scheduleRealismFit: "strict",
    complexityLevel: "moderate",
    weeklyVolumeLevel: "high",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 8,
    goodFor: ["Dumbbell-only home gyms", "Hypertrophy on a 4-day schedule"],
    notIdealFor: ["Strength specialization on the barbell lifts"],
    rationale: "Upper/lower with dumbbells creates enough weekly volume for hypertrophy while keeping exercise selection simple.",
    tags: ["dumbbell_only", "upper_lower", "4_day", "hypertrophy"]
  },
  templates: [
    {
      name: "Upper A",
      category: "Push",
      sequenceOrder: 1,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "incline-db-press", sequenceOrder: 1, targetSets: 4, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "db-row", sequenceOrder: 2, targetSets: 4, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "dumbbell-shoulder-press", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "overhead-db-tricep-extension", sequenceOrder: 4, targetSets: 3, targetReps: 12, restSeconds: 60 }
      ]
    },
    {
      name: "Lower A",
      category: "Legs",
      sequenceOrder: 2,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "goblet-squat", sequenceOrder: 1, targetSets: 4, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "dumbbell-romanian-deadlift", sequenceOrder: 2, targetSets: 4, targetReps: 10, restSeconds: 120 },
        { exerciseSlug: "bulgarian-split-squat", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "glute-bridge", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 60 }
      ]
    },
    {
      name: "Upper B",
      category: "Pull",
      sequenceOrder: 3,
      estimatedDurationMinutes: 55,
      exercises: [
        { exerciseSlug: "incline-db-press", sequenceOrder: 1, targetSets: 3, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "db-row", sequenceOrder: 2, targetSets: 3, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "rear-delt-fly", sequenceOrder: 3, targetSets: 3, targetReps: 15, restSeconds: 60 },
        { exerciseSlug: "incline-db-curl", sequenceOrder: 4, targetSets: 3, targetReps: 12, restSeconds: 60 }
      ]
    },
    {
      name: "Lower B",
      category: "Legs",
      sequenceOrder: 4,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "walking-lunge", sequenceOrder: 1, targetSets: 4, targetReps: 12, restSeconds: 90 },
        { exerciseSlug: "single-leg-romanian-deadlift", sequenceOrder: 2, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "step-up", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "hanging-leg-raise", sequenceOrder: 4, targetSets: 2, targetReps: 10, restSeconds: 60 }
      ]
    }
  ]
};

export const barbellRackOnly3Day: SeedProgram = {
  name: "3-Day Barbell + Rack Only Strength",
  description: "Barbell-focused strength work for lifters with a rack, barbell, and a pull-up option.",
  daysPerWeek: 3,
  sessionDurationMinutes: 60,
  difficultyLevel: "intermediate",
  trainingGoal: "strength",
  metadata: {
    version: 1,
    goalTypes: ["strength", "general_fitness", "sport_support"],
    experienceLevels: ["intermediate", "advanced"],
    splitType: "full_body",
    estimatedSessionMinutes: 60,
    sessionDurationRange: { min: 50, max: 75 },
    equipmentRequired: ["barbell", "bodyweight"],
    equipmentLimitations: ["No machines or cables required."],
    primaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["conservative", "balanced"],
    recoveryDemand: "moderate",
    fatigueToleranceFit: "normal",
    scheduleRealismFit: "some_flex",
    complexityLevel: "moderate",
    weeklyVolumeLevel: "moderate",
    intensityLevel: "high",
    recommendedBlockWeeks: 8,
    goodFor: ["Garage/home gym setups", "Strength on the main lifts without machines"],
    notIdealFor: ["Hypertrophy specialization"],
    rationale: "Barbell staples plus pull-ups provide a complete strength base with minimal equipment.",
    tags: ["barbell", "rack", "strength", "3_day"]
  },
  templates: [
    {
      name: "Day 1",
      category: "Full Body",
      sequenceOrder: 1,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 4, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "bench-press", sequenceOrder: 2, targetSets: 4, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "barbell-row", sequenceOrder: 3, targetSets: 3, targetReps: 6, restSeconds: 150 }
      ]
    },
    {
      name: "Day 2",
      category: "Full Body",
      sequenceOrder: 2,
      estimatedDurationMinutes: 55,
      exercises: [
        { exerciseSlug: "deadlift", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "overhead-press", sequenceOrder: 2, targetSets: 4, targetReps: 5, restSeconds: 150 },
        { exerciseSlug: "pull-ups", sequenceOrder: 3, targetSets: 4, targetReps: 6, restSeconds: 150 }
      ]
    },
    {
      name: "Day 3",
      category: "Full Body",
      sequenceOrder: 3,
      estimatedDurationMinutes: 55,
      exercises: [
        { exerciseSlug: "front-squat", sequenceOrder: 1, targetSets: 4, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "incline-bench-press", sequenceOrder: 2, targetSets: 4, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "barbell-row", sequenceOrder: 3, targetSets: 3, targetReps: 8, restSeconds: 120 }
      ]
    }
  ]
};

export const balancedHybrid4Day: SeedProgram = {
  name: "4-Day Balanced Strength + Hypertrophy",
  description: "A balanced upper/lower plan that builds strength while also accumulating hypertrophy volume.",
  daysPerWeek: 4,
  sessionDurationMinutes: 60,
  difficultyLevel: "intermediate",
  trainingGoal: "general_fitness",
  metadata: {
    version: 1,
    goalTypes: ["strength", "hypertrophy", "general_fitness"],
    experienceLevels: ["intermediate", "advanced"],
    splitType: "upper_lower",
    estimatedSessionMinutes: 60,
    sessionDurationRange: { min: 50, max: 75 },
    equipmentRequired: ["barbell", "dumbbell", "cable", "machine"],
    primaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["balanced"],
    recoveryDemand: "moderate",
    fatigueToleranceFit: "normal",
    scheduleRealismFit: "some_flex",
    complexityLevel: "moderate",
    weeklyVolumeLevel: "moderate",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 8,
    goodFor: ["Hybrid goals: strength + muscle", "People who want a balanced 4-day routine"],
    notIdealFor: ["Very high-volume hypertrophy", "Strength peaking"],
    rationale: "Combines heavy compounds early in the week with slightly higher-rep volume later, balancing progress and recovery.",
    tags: ["hybrid", "upper_lower", "4_day", "balanced"]
  },
  templates: [
    {
      name: "Upper A (Strength)",
      category: "Push",
      sequenceOrder: 1,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "bench-press", sequenceOrder: 1, targetSets: 4, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "barbell-row", sequenceOrder: 2, targetSets: 4, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "overhead-press", sequenceOrder: 3, targetSets: 3, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "lat-pulldown", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 90 }
      ]
    },
    {
      name: "Lower A (Strength)",
      category: "Legs",
      sequenceOrder: 2,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 4, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "romanian-deadlift", sequenceOrder: 2, targetSets: 3, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "leg-press", sequenceOrder: 3, targetSets: 2, targetReps: 10, restSeconds: 120 }
      ]
    },
    {
      name: "Upper B (Volume)",
      category: "Pull",
      sequenceOrder: 3,
      estimatedDurationMinutes: 55,
      exercises: [
        { exerciseSlug: "incline-db-press", sequenceOrder: 1, targetSets: 4, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "seated-cable-row", sequenceOrder: 2, targetSets: 4, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "lat-raise", sequenceOrder: 3, targetSets: 3, targetReps: 15, restSeconds: 60 },
        { exerciseSlug: "db-curl", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 60 }
      ]
    },
    {
      name: "Lower B (Volume)",
      category: "Legs",
      sequenceOrder: 4,
      estimatedDurationMinutes: 60,
      exercises: [
        { exerciseSlug: "leg-press", sequenceOrder: 1, targetSets: 4, targetReps: 12, restSeconds: 120 },
        { exerciseSlug: "hip-thrust", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "leg-curl", sequenceOrder: 3, targetSets: 3, targetReps: 12, restSeconds: 75 },
        { exerciseSlug: "cable-crunch", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 60 }
      ]
    }
  ]
};

export const flexibleSchedule3Day: SeedProgram = {
  name: "3-Day Flexible Full Body",
  description: "Three full-body workouts you can rotate through when your schedule is unpredictable.",
  daysPerWeek: 3,
  sessionDurationMinutes: 45,
  difficultyLevel: "beginner",
  trainingGoal: "general_fitness",
  metadata: {
    version: 1,
    goalTypes: ["consistency", "general_fitness", "strength"],
    experienceLevels: ["beginner", "intermediate"],
    splitType: "full_body",
    estimatedSessionMinutes: 45,
    sessionDurationRange: { min: 35, max: 60 },
    equipmentRequired: ["barbell", "dumbbell", "bodyweight"],
    primaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["conservative", "balanced"],
    recoveryDemand: "low",
    fatigueToleranceFit: "low",
    scheduleRealismFit: "very_flex",
    complexityLevel: "low",
    weeklyVolumeLevel: "moderate",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 8,
    goodFor: ["Inconsistent schedules", "People who want a plan that still works when you miss a day"],
    notIdealFor: ["High-frequency split preferences"],
    rationale: "Each workout stands alone. If you miss a day, you just do the next workout when you can.",
    tags: ["flexible", "consistency", "full_body", "3_day"]
  },
  templates: [
    {
      name: "Workout 1",
      category: "Full Body",
      sequenceOrder: 1,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "bench-press", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "db-row", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 90 }
      ]
    },
    {
      name: "Workout 2",
      category: "Full Body",
      sequenceOrder: 2,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "deadlift", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 150 },
        { exerciseSlug: "dumbbell-shoulder-press", sequenceOrder: 2, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "pull-ups", sequenceOrder: 3, targetSets: 3, targetReps: 6, restSeconds: 120 }
      ]
    },
    {
      name: "Workout 3",
      category: "Full Body",
      sequenceOrder: 3,
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseSlug: "front-squat", sequenceOrder: 1, targetSets: 3, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "incline-db-press", sequenceOrder: 2, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "barbell-row", sequenceOrder: 3, targetSets: 3, targetReps: 8, restSeconds: 120 }
      ]
    }
  ]
};

export const busy30Min4Day: SeedProgram = {
  name: "4-Day Busy Schedule (30 min)",
  description: "Four short sessions that split the week into simple, fast workouts.",
  daysPerWeek: 4,
  sessionDurationMinutes: 30,
  difficultyLevel: "intermediate",
  trainingGoal: "general_fitness",
  metadata: {
    version: 1,
    goalTypes: ["consistency", "general_fitness", "hypertrophy"],
    experienceLevels: ["beginner", "intermediate"],
    splitType: "upper_lower",
    estimatedSessionMinutes: 30,
    sessionDurationRange: { min: 25, max: 40 },
    equipmentRequired: ["barbell", "dumbbell", "bodyweight"],
    primaryFocusAreas: ["balanced"],
    progressionStyleCompatibility: ["balanced"],
    recoveryDemand: "moderate",
    fatigueToleranceFit: "normal",
    scheduleRealismFit: "some_flex",
    complexityLevel: "low",
    weeklyVolumeLevel: "moderate",
    intensityLevel: "moderate",
    recommendedBlockWeeks: 6,
    goodFor: ["People who prefer short sessions but can train 4 days/week"],
    notIdealFor: ["Very low recovery tolerance"],
    rationale: "Shorter sessions stay realistic by keeping exercise count low and focusing on a few key movements.",
    tags: ["busy", "30_min", "4_day", "short_sessions"]
  },
  templates: [
    {
      name: "Upper A",
      category: "Quick",
      sequenceOrder: 1,
      estimatedDurationMinutes: 30,
      exercises: [
        { exerciseSlug: "bench-press", sequenceOrder: 1, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "db-row", sequenceOrder: 2, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "lat-raise", sequenceOrder: 3, targetSets: 2, targetReps: 15, restSeconds: 60 }
      ]
    },
    {
      name: "Lower A",
      category: "Quick",
      sequenceOrder: 2,
      estimatedDurationMinutes: 30,
      exercises: [
        { exerciseSlug: "back-squat", sequenceOrder: 1, targetSets: 3, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "romanian-deadlift", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 120 },
        { exerciseSlug: "glute-bridge", sequenceOrder: 3, targetSets: 2, targetReps: 12, restSeconds: 60 }
      ]
    },
    {
      name: "Upper B",
      category: "Quick",
      sequenceOrder: 3,
      estimatedDurationMinutes: 30,
      exercises: [
        { exerciseSlug: "incline-db-press", sequenceOrder: 1, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseSlug: "pull-ups", sequenceOrder: 2, targetSets: 3, targetReps: 6, restSeconds: 120 },
        { exerciseSlug: "overhead-db-tricep-extension", sequenceOrder: 3, targetSets: 2, targetReps: 12, restSeconds: 60 }
      ]
    },
    {
      name: "Lower B",
      category: "Quick",
      sequenceOrder: 4,
      estimatedDurationMinutes: 30,
      exercises: [
        { exerciseSlug: "deadlift", sequenceOrder: 1, targetSets: 2, targetReps: 5, restSeconds: 180 },
        { exerciseSlug: "front-squat", sequenceOrder: 2, targetSets: 3, targetReps: 6, restSeconds: 150 },
        { exerciseSlug: "walking-lunge", sequenceOrder: 3, targetSets: 2, targetReps: 12, restSeconds: 90 }
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
  hypertrophyFocus4Day,
  beginnerFullBody2Day,
  beginnerStrength3Day,
  beginnerHypertrophy3Day,
  quickStart30Min3Day,
  returnToTraining2Day,
  generalFitness2Day,
  generalFitness3Day,
  minimalistStrength2Day,
  upperLowerStrength4Day,
  strengthAccessories4Day,
  hypertrophyFullBody3Day,
  torsoLimbs4Day,
  upperLowerFocus5Day,
  pushPullLegs6Day,
  sportSupport2Day,
  dumbbellOnly3Day,
  homeGymUpperLower4Day,
  machinesCablesHypertrophy4Day,
  bodyweightOnly3Day,
  inSeasonMaintenance2Day,
  sportSupport3Day,
  dumbbellOnly2Day,
  dumbbellOnly4Day,
  barbellRackOnly3Day,
  balancedHybrid4Day,
  flexibleSchedule3Day,
  busy30Min4Day
];
