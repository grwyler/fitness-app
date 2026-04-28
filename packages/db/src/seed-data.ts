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
  },
  {
    slug: "pull-ups",
    name: "Pull-Ups",
    category: "compound",
    movementPattern: "pull",
    primaryMuscleGroup: "lats",
    equipmentType: "bodyweight",
    defaultStartingWeightLbs: 0,
    defaultIncrementLbs: 2.5
  },
  {
    slug: "db-row",
    name: "DB Row",
    category: "compound",
    movementPattern: "pull",
    primaryMuscleGroup: "back",
    equipmentType: "dumbbell",
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
    defaultStartingWeightLbs: 20,
    defaultIncrementLbs: 2.5
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
