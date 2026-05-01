import { seedExercises as catalogSeedExercises, seedPrograms as catalogSeedPrograms } from "@fitness/db";
import { hashPassword } from "../auth/password.js";

export const DEV_USER_ID = "11111111-1111-1111-1111-111111111111";
export const TEST_USER_ID = "99999999-9999-9999-9999-999999999999";
export const TEST_USER_EMAIL = "test@test.com";
const PROGRAM_ID = "22222222-2222-2222-2222-222222222222";
const UPPER_LOWER_ARMS_PROGRAM_ID = "22222222-2222-2222-2222-222222222223";
const CUSTOM_WORKOUT_PROGRAM_ID = "22222222-2222-2222-2222-222222222299";
const TEMPLATE_A_ID = "33333333-3333-3333-3333-333333333333";
const TEMPLATE_B_ID = "44444444-4444-4444-4444-444444444444";
const UPPER_LOWER_DAY_1_TEMPLATE_ID = "33333333-3333-3333-3333-333333333341";
const UPPER_LOWER_DAY_2_TEMPLATE_ID = "33333333-3333-3333-3333-333333333342";
const UPPER_LOWER_DAY_3_TEMPLATE_ID = "33333333-3333-3333-3333-333333333343";
const UPPER_LOWER_DAY_4_TEMPLATE_ID = "33333333-3333-3333-3333-333333333344";
const PUSH_HYPERTROPHY_TEMPLATE_ID = "33333333-3333-3333-3333-333333333345";
const PULL_HYPERTROPHY_TEMPLATE_ID = "33333333-3333-3333-3333-333333333346";
const LEGS_VOLUME_TEMPLATE_ID = "33333333-3333-3333-3333-333333333347";
const QUICK_FULL_BODY_TEMPLATE_ID = "33333333-3333-3333-3333-333333333348";
const CUSTOM_WORKOUT_TEMPLATE_ID = "33333333-3333-3333-3333-333333333399";
const ENROLLMENT_ID = "55555555-5555-5555-5555-555555555555";

const PROGRAM_IDS_BY_NAME: Record<string, string> = {
  "3-Day Full Body Beginner": PROGRAM_ID,
  "4-Day Upper/Lower": "22222222-2222-2222-2222-222222222224",
  "4-Day Upper/Lower + Arms": UPPER_LOWER_ARMS_PROGRAM_ID,
  "5-Day Push/Pull/Legs": "22222222-2222-2222-2222-222222222225",
  "3-Day Strength Focus": "22222222-2222-2222-2222-222222222226",
  "4-Day Hypertrophy Focus": "22222222-2222-2222-2222-222222222227"
};

const TEMPLATE_IDS_BY_PROGRAM_NAME: Record<string, string[]> = {
  "3-Day Full Body Beginner": [
    TEMPLATE_A_ID,
    TEMPLATE_B_ID,
    "33333333-3333-3333-3333-333333333331"
  ],
  "4-Day Upper/Lower": [
    "33333333-3333-3333-3333-333333333351",
    "33333333-3333-3333-3333-333333333352",
    "33333333-3333-3333-3333-333333333353",
    "33333333-3333-3333-3333-333333333354"
  ],
  "4-Day Upper/Lower + Arms": [
    UPPER_LOWER_DAY_1_TEMPLATE_ID,
    UPPER_LOWER_DAY_2_TEMPLATE_ID,
    UPPER_LOWER_DAY_3_TEMPLATE_ID,
    UPPER_LOWER_DAY_4_TEMPLATE_ID
  ],
  "5-Day Push/Pull/Legs": [
    "33333333-3333-3333-3333-333333333361",
    "33333333-3333-3333-3333-333333333362",
    "33333333-3333-3333-3333-333333333363",
    "33333333-3333-3333-3333-333333333364",
    "33333333-3333-3333-3333-333333333365"
  ],
  "3-Day Strength Focus": [
    "33333333-3333-3333-3333-333333333371",
    "33333333-3333-3333-3333-333333333372",
    "33333333-3333-3333-3333-333333333373"
  ],
  "4-Day Hypertrophy Focus": [
    "33333333-3333-3333-3333-333333333381",
    "33333333-3333-3333-3333-333333333382",
    "33333333-3333-3333-3333-333333333383",
    "33333333-3333-3333-3333-333333333384"
  ]
};

function createSeedEntryId(index: number) {
  return `77777777-7777-7777-7777-${String(780000000000 + index).padStart(12, "0")}`;
}

const seedExercises = [
  { slug: "back-squat", name: "Squat", category: "compound", movementPattern: "squat", primaryMuscleGroup: "quads", equipmentType: "barbell", defaultStartingWeightLbs: 95, defaultIncrementLbs: 5 },
  { slug: "bench-press", name: "Bench Press", category: "compound", movementPattern: "push", primaryMuscleGroup: "chest", equipmentType: "barbell", defaultStartingWeightLbs: 95, defaultIncrementLbs: 5 },
  { slug: "barbell-row", name: "Row", category: "compound", movementPattern: "pull", primaryMuscleGroup: "back", equipmentType: "barbell", defaultStartingWeightLbs: 95, defaultIncrementLbs: 5 },
  { slug: "deadlift", name: "Deadlift", category: "compound", movementPattern: "hinge", primaryMuscleGroup: "posterior_chain", equipmentType: "barbell", defaultStartingWeightLbs: 135, defaultIncrementLbs: 5 },
  { slug: "overhead-press", name: "Overhead Press", category: "compound", movementPattern: "push", primaryMuscleGroup: "shoulders", equipmentType: "barbell", defaultStartingWeightLbs: 65, defaultIncrementLbs: 5 },
  { slug: "bicep-curl", name: "Bicep Curl", category: "accessory", movementPattern: "pull", primaryMuscleGroup: "biceps", equipmentType: "dumbbell", defaultStartingWeightLbs: 20, defaultIncrementLbs: 2.5 },
  { slug: "tricep-pushdown", name: "Tricep Pushdown", category: "accessory", movementPattern: "push", primaryMuscleGroup: "triceps", equipmentType: "cable", defaultStartingWeightLbs: 30, defaultIncrementLbs: 2.5 },
  { slug: "leg-curl", name: "Leg Curl", category: "accessory", movementPattern: "hinge", primaryMuscleGroup: "hamstrings", equipmentType: "machine", defaultStartingWeightLbs: 40, defaultIncrementLbs: 2.5 },
  { slug: "lat-pulldown", name: "Lat Pulldown", category: "accessory", movementPattern: "pull", primaryMuscleGroup: "lats", equipmentType: "cable", defaultStartingWeightLbs: 50, defaultIncrementLbs: 2.5 },
  { slug: "pull-ups", name: "Pull-Ups", category: "compound", movementPattern: "pull", primaryMuscleGroup: "lats", equipmentType: "bodyweight", defaultStartingWeightLbs: 0, defaultIncrementLbs: 2.5 },
  { slug: "db-row", name: "DB Row", category: "compound", movementPattern: "pull", primaryMuscleGroup: "back", equipmentType: "dumbbell", defaultStartingWeightLbs: 35, defaultIncrementLbs: 5 },
  { slug: "db-curl", name: "DB Curl", category: "accessory", movementPattern: "pull", primaryMuscleGroup: "biceps", equipmentType: "dumbbell", defaultStartingWeightLbs: 20, defaultIncrementLbs: 2.5 },
  { slug: "overhead-db-tricep-extension", name: "Overhead DB Tricep Extension", category: "accessory", movementPattern: "push", primaryMuscleGroup: "triceps", equipmentType: "dumbbell", defaultStartingWeightLbs: 25, defaultIncrementLbs: 2.5 },
  { slug: "romanian-deadlift", name: "Romanian Deadlift", category: "compound", movementPattern: "hinge", primaryMuscleGroup: "hamstrings", equipmentType: "barbell", defaultStartingWeightLbs: 95, defaultIncrementLbs: 5 },
  { slug: "lunges", name: "Lunges", category: "accessory", movementPattern: "lunge", primaryMuscleGroup: "quads", equipmentType: "dumbbell", defaultStartingWeightLbs: 25, defaultIncrementLbs: 5 },
  { slug: "incline-db-press", name: "Incline DB Press", category: "compound", movementPattern: "push", primaryMuscleGroup: "chest", equipmentType: "dumbbell", defaultStartingWeightLbs: 35, defaultIncrementLbs: 5 },
  { slug: "incline-db-curl", name: "Incline DB Curl", category: "accessory", movementPattern: "pull", primaryMuscleGroup: "biceps", equipmentType: "dumbbell", defaultStartingWeightLbs: 15, defaultIncrementLbs: 2.5 },
  { slug: "skull-crushers", name: "Skull Crushers", category: "accessory", movementPattern: "push", primaryMuscleGroup: "triceps", equipmentType: "barbell", defaultStartingWeightLbs: 35, defaultIncrementLbs: 2.5 },
  { slug: "hammer-curl", name: "Hammer Curl", category: "accessory", movementPattern: "pull", primaryMuscleGroup: "biceps", equipmentType: "dumbbell", defaultStartingWeightLbs: 20, defaultIncrementLbs: 2.5 }
] as const;

const EXERCISE_IDS: Record<string, string> = {
  "back-squat": "66666666-6666-6666-6666-666666666601",
  "bench-press": "66666666-6666-6666-6666-666666666602",
  "barbell-row": "66666666-6666-6666-6666-666666666603",
  deadlift: "66666666-6666-6666-6666-666666666604",
  "overhead-press": "66666666-6666-6666-6666-666666666605",
  "bicep-curl": "66666666-6666-6666-6666-666666666606",
  "tricep-pushdown": "66666666-6666-6666-6666-666666666607",
  "leg-curl": "66666666-6666-6666-6666-666666666608",
  "lat-pulldown": "66666666-6666-6666-6666-666666666609",
  "pull-ups": "66666666-6666-6666-6666-666666666610",
  "db-row": "66666666-6666-6666-6666-666666666611",
  "db-curl": "66666666-6666-6666-6666-666666666612",
  "overhead-db-tricep-extension": "66666666-6666-6666-6666-666666666613",
  "romanian-deadlift": "66666666-6666-6666-6666-666666666614",
  lunges: "66666666-6666-6666-6666-666666666615",
  "incline-db-press": "66666666-6666-6666-6666-666666666616",
  "incline-db-curl": "66666666-6666-6666-6666-666666666617",
  "skull-crushers": "66666666-6666-6666-6666-666666666618",
  "hammer-curl": "66666666-6666-6666-6666-666666666619",
  "front-squat": "66666666-6666-6666-6666-666666666620",
  "leg-press": "66666666-6666-6666-6666-666666666621",
  "hack-squat": "66666666-6666-6666-6666-666666666622",
  "leg-extension": "66666666-6666-6666-6666-666666666623",
  "calf-raise": "66666666-6666-6666-6666-666666666624",
  "hip-thrust": "66666666-6666-6666-6666-666666666625",
  "glute-bridge": "66666666-6666-6666-6666-666666666626",
  "incline-bench-press": "66666666-6666-6666-6666-666666666627",
  "dumbbell-bench-press": "66666666-6666-6666-6666-666666666628",
  "machine-chest-press": "66666666-6666-6666-6666-666666666629",
  "pec-deck": "66666666-6666-6666-6666-666666666630",
  "cable-fly": "66666666-6666-6666-6666-666666666631",
  "push-ups": "66666666-6666-6666-6666-666666666632",
  dips: "66666666-6666-6666-6666-666666666633",
  "close-grip-bench-press": "66666666-6666-6666-6666-666666666634",
  "lat-raise": "66666666-6666-6666-6666-666666666635",
  "rear-delt-fly": "66666666-6666-6666-6666-666666666636",
  "face-pull": "66666666-6666-6666-6666-666666666637",
  "dumbbell-shoulder-press": "66666666-6666-6666-6666-666666666638",
  "machine-shoulder-press": "66666666-6666-6666-6666-666666666639",
  "seated-cable-row": "66666666-6666-6666-6666-666666666640",
  "chest-supported-row": "66666666-6666-6666-6666-666666666641",
  "t-bar-row": "66666666-6666-6666-6666-666666666642",
  "chin-ups": "66666666-6666-6666-6666-666666666643",
  "cable-tricep-extension": "66666666-6666-6666-6666-666666666644",
  "cable-overhead-tricep-extension": "66666666-6666-6666-6666-666666666645",
  "preacher-curl": "66666666-6666-6666-6666-666666666646",
  "cable-curl": "66666666-6666-6666-6666-666666666647",
  plank: "66666666-6666-6666-6666-666666666648",
  "hanging-leg-raise": "66666666-6666-6666-6666-666666666649",
  "cable-crunch": "66666666-6666-6666-6666-666666666650",
  "ab-wheel": "66666666-6666-6666-6666-666666666651",
  "power-clean": "66666666-6666-6666-6666-666666666652",
  "clean-and-jerk": "66666666-6666-6666-6666-666666666653",
  snatch: "66666666-6666-6666-6666-666666666654",
  "bulgarian-split-squat": "66666666-6666-6666-6666-666666666655",
  "walking-lunge": "66666666-6666-6666-6666-666666666656",
  "step-up": "66666666-6666-6666-6666-666666666657",
  "single-leg-romanian-deadlift": "66666666-6666-6666-6666-666666666658",
  "good-morning": "66666666-6666-6666-6666-666666666659",
  "sumo-deadlift": "66666666-6666-6666-6666-666666666660",
  "nordic-hamstring-curl": "66666666-6666-6666-6666-666666666661",
  "standing-calf-raise": "66666666-6666-6666-6666-666666666662",
  "seated-calf-raise": "66666666-6666-6666-6666-666666666663",
  "hip-abduction": "66666666-6666-6666-6666-666666666664",
  "hip-adduction": "66666666-6666-6666-6666-666666666665",
  "cable-glute-kickback": "66666666-6666-6666-6666-666666666666"
};

const templateDefinitions = [
  { id: TEMPLATE_A_ID, programId: PROGRAM_ID, name: "Full Body Strength", category: "Full Body", order: 1, duration: 60 },
  { id: TEMPLATE_B_ID, programId: PROGRAM_ID, name: "Full Body Posterior Chain", category: "Full Body", order: 2, duration: 55 },
  { id: UPPER_LOWER_DAY_1_TEMPLATE_ID, programId: UPPER_LOWER_ARMS_PROGRAM_ID, name: "Push Strength", category: "Push", order: 1, duration: 60 },
  { id: UPPER_LOWER_DAY_2_TEMPLATE_ID, programId: UPPER_LOWER_ARMS_PROGRAM_ID, name: "Legs Strength", category: "Legs", order: 2, duration: 55 },
  { id: UPPER_LOWER_DAY_3_TEMPLATE_ID, programId: UPPER_LOWER_ARMS_PROGRAM_ID, name: "Pull + Arms", category: "Pull", order: 3, duration: 55 },
  { id: UPPER_LOWER_DAY_4_TEMPLATE_ID, programId: UPPER_LOWER_ARMS_PROGRAM_ID, name: "Quick Arms", category: "Quick", order: 4, duration: 35 },
  { id: PUSH_HYPERTROPHY_TEMPLATE_ID, programId: UPPER_LOWER_ARMS_PROGRAM_ID, name: "Push Hypertrophy", category: "Push", order: 5, duration: 50 },
  { id: PULL_HYPERTROPHY_TEMPLATE_ID, programId: UPPER_LOWER_ARMS_PROGRAM_ID, name: "Pull Hypertrophy", category: "Pull", order: 6, duration: 50 },
  { id: LEGS_VOLUME_TEMPLATE_ID, programId: UPPER_LOWER_ARMS_PROGRAM_ID, name: "Legs Volume", category: "Legs", order: 7, duration: 50 },
  { id: QUICK_FULL_BODY_TEMPLATE_ID, programId: UPPER_LOWER_ARMS_PROGRAM_ID, name: "Quick Full Body", category: "Quick", order: 8, duration: 30 },
  { id: CUSTOM_WORKOUT_TEMPLATE_ID, programId: CUSTOM_WORKOUT_PROGRAM_ID, name: "Custom Workout", category: "Full Body", order: 1, duration: 45 }
] as const;

const templateEntries = [
  { id: "77777777-7777-7777-7777-777777777701", templateId: TEMPLATE_A_ID, exerciseSlug: "back-squat", order: 1, sets: 3, reps: 8, rest: 120 },
  { id: "77777777-7777-7777-7777-777777777702", templateId: TEMPLATE_A_ID, exerciseSlug: "bench-press", order: 2, sets: 3, reps: 8, rest: 120 },
  { id: "77777777-7777-7777-7777-777777777703", templateId: TEMPLATE_A_ID, exerciseSlug: "barbell-row", order: 3, sets: 3, reps: 8, rest: 120 },
  { id: "77777777-7777-7777-7777-777777777704", templateId: TEMPLATE_A_ID, exerciseSlug: "bicep-curl", order: 4, sets: 3, reps: 8, rest: 75 },
  { id: "77777777-7777-7777-7777-777777777705", templateId: TEMPLATE_A_ID, exerciseSlug: "tricep-pushdown", order: 5, sets: 3, reps: 8, rest: 75 },
  { id: "77777777-7777-7777-7777-777777777706", templateId: TEMPLATE_B_ID, exerciseSlug: "deadlift", order: 1, sets: 3, reps: 8, rest: 120 },
  { id: "77777777-7777-7777-7777-777777777707", templateId: TEMPLATE_B_ID, exerciseSlug: "overhead-press", order: 2, sets: 3, reps: 8, rest: 120 },
  { id: "77777777-7777-7777-7777-777777777708", templateId: TEMPLATE_B_ID, exerciseSlug: "lat-pulldown", order: 3, sets: 3, reps: 8, rest: 90 },
  { id: "77777777-7777-7777-7777-777777777709", templateId: TEMPLATE_B_ID, exerciseSlug: "leg-curl", order: 4, sets: 3, reps: 8, rest: 75 },
  { id: "77777777-7777-7777-7777-777777777710", templateId: TEMPLATE_B_ID, exerciseSlug: "bicep-curl", order: 5, sets: 3, reps: 8, rest: 75 },
  { id: "77777777-7777-7777-7777-777777777711", templateId: UPPER_LOWER_DAY_1_TEMPLATE_ID, exerciseSlug: "bench-press", order: 1, sets: 3, reps: 5, rest: 120 },
  { id: "77777777-7777-7777-7777-777777777712", templateId: UPPER_LOWER_DAY_1_TEMPLATE_ID, exerciseSlug: "pull-ups", order: 2, sets: 3, reps: 8, rest: 120 },
  { id: "77777777-7777-7777-7777-777777777713", templateId: UPPER_LOWER_DAY_1_TEMPLATE_ID, exerciseSlug: "db-row", order: 3, sets: 2, reps: 8, rest: 90 },
  { id: "77777777-7777-7777-7777-777777777714", templateId: UPPER_LOWER_DAY_1_TEMPLATE_ID, exerciseSlug: "db-curl", order: 4, sets: 2, reps: 12, rest: 75 },
  { id: "77777777-7777-7777-7777-777777777715", templateId: UPPER_LOWER_DAY_1_TEMPLATE_ID, exerciseSlug: "overhead-db-tricep-extension", order: 5, sets: 2, reps: 12, rest: 75 },
  { id: "77777777-7777-7777-7777-777777777716", templateId: UPPER_LOWER_DAY_2_TEMPLATE_ID, exerciseSlug: "back-squat", order: 1, sets: 3, reps: 5, rest: 120 },
  { id: "77777777-7777-7777-7777-777777777717", templateId: UPPER_LOWER_DAY_2_TEMPLATE_ID, exerciseSlug: "romanian-deadlift", order: 2, sets: 2, reps: 8, rest: 120 },
  { id: "77777777-7777-7777-7777-777777777718", templateId: UPPER_LOWER_DAY_2_TEMPLATE_ID, exerciseSlug: "lunges", order: 3, sets: 2, reps: 8, rest: 90 },
  { id: "77777777-7777-7777-7777-777777777719", templateId: UPPER_LOWER_DAY_3_TEMPLATE_ID, exerciseSlug: "incline-db-press", order: 1, sets: 3, reps: 8, rest: 120 },
  { id: "77777777-7777-7777-7777-777777777720", templateId: UPPER_LOWER_DAY_3_TEMPLATE_ID, exerciseSlug: "pull-ups", order: 2, sets: 3, reps: 8, rest: 120 },
  { id: "77777777-7777-7777-7777-777777777721", templateId: UPPER_LOWER_DAY_3_TEMPLATE_ID, exerciseSlug: "incline-db-curl", order: 3, sets: 3, reps: 10, rest: 75 },
  { id: "77777777-7777-7777-7777-777777777722", templateId: UPPER_LOWER_DAY_3_TEMPLATE_ID, exerciseSlug: "skull-crushers", order: 4, sets: 3, reps: 10, rest: 75 },
  { id: "77777777-7777-7777-7777-777777777723", templateId: UPPER_LOWER_DAY_3_TEMPLATE_ID, exerciseSlug: "hammer-curl", order: 5, sets: 2, reps: 10, rest: 75 },
  { id: "77777777-7777-7777-7777-777777777724", templateId: UPPER_LOWER_DAY_4_TEMPLATE_ID, exerciseSlug: "db-curl", order: 1, sets: 3, reps: 10, rest: 75 },
  { id: "77777777-7777-7777-7777-777777777725", templateId: UPPER_LOWER_DAY_4_TEMPLATE_ID, exerciseSlug: "skull-crushers", order: 2, sets: 3, reps: 10, rest: 75 },
  { id: "77777777-7777-7777-7777-777777777726", templateId: UPPER_LOWER_DAY_4_TEMPLATE_ID, exerciseSlug: "hammer-curl", order: 3, sets: 2, reps: 10, rest: 75 },
  { id: "77777777-7777-7777-7777-777777777727", templateId: PUSH_HYPERTROPHY_TEMPLATE_ID, exerciseSlug: "incline-db-press", order: 1, sets: 3, reps: 10, rest: 90 },
  { id: "77777777-7777-7777-7777-777777777728", templateId: PUSH_HYPERTROPHY_TEMPLATE_ID, exerciseSlug: "overhead-press", order: 2, sets: 3, reps: 8, rest: 90 },
  { id: "77777777-7777-7777-7777-777777777729", templateId: PUSH_HYPERTROPHY_TEMPLATE_ID, exerciseSlug: "tricep-pushdown", order: 3, sets: 3, reps: 12, rest: 75 },
  { id: "77777777-7777-7777-7777-777777777730", templateId: PULL_HYPERTROPHY_TEMPLATE_ID, exerciseSlug: "pull-ups", order: 1, sets: 3, reps: 8, rest: 120 },
  { id: "77777777-7777-7777-7777-777777777731", templateId: PULL_HYPERTROPHY_TEMPLATE_ID, exerciseSlug: "db-row", order: 2, sets: 3, reps: 10, rest: 90 },
  { id: "77777777-7777-7777-7777-777777777732", templateId: PULL_HYPERTROPHY_TEMPLATE_ID, exerciseSlug: "hammer-curl", order: 3, sets: 3, reps: 12, rest: 75 },
  { id: "77777777-7777-7777-7777-777777777733", templateId: LEGS_VOLUME_TEMPLATE_ID, exerciseSlug: "back-squat", order: 1, sets: 3, reps: 8, rest: 120 },
  { id: "77777777-7777-7777-7777-777777777734", templateId: LEGS_VOLUME_TEMPLATE_ID, exerciseSlug: "romanian-deadlift", order: 2, sets: 3, reps: 8, rest: 120 },
  { id: "77777777-7777-7777-7777-777777777735", templateId: LEGS_VOLUME_TEMPLATE_ID, exerciseSlug: "lunges", order: 3, sets: 2, reps: 10, rest: 90 },
  { id: "77777777-7777-7777-7777-777777777736", templateId: QUICK_FULL_BODY_TEMPLATE_ID, exerciseSlug: "back-squat", order: 1, sets: 2, reps: 8, rest: 90 },
  { id: "77777777-7777-7777-7777-777777777737", templateId: QUICK_FULL_BODY_TEMPLATE_ID, exerciseSlug: "bench-press", order: 2, sets: 2, reps: 8, rest: 90 },
  { id: "77777777-7777-7777-7777-777777777738", templateId: QUICK_FULL_BODY_TEMPLATE_ID, exerciseSlug: "barbell-row", order: 3, sets: 2, reps: 8, rest: 90 }
] as const;

const schemaSql = `
create table if not exists users (id uuid primary key, auth_provider_id text not null unique, email text not null unique, password_hash text, display_name text, timezone text not null default 'America/New_York', unit_system text not null default 'imperial', experience_level text, training_goal text, deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table users add column if not exists password_hash text;
create table if not exists password_reset_tokens (id uuid primary key, user_id uuid not null references users(id), token_hash text not null unique, expires_at timestamptz not null, consumed_at timestamptz, created_at timestamptz not null default now());
create index if not exists idx_password_reset_tokens_user_id on password_reset_tokens(user_id);
create index if not exists idx_password_reset_tokens_expires_at on password_reset_tokens(expires_at);
create table if not exists exercises (id uuid primary key, name text not null unique, category text not null, movement_pattern text, primary_muscle_group text, equipment_type text, default_target_sets integer, default_target_reps integer, default_starting_weight_lbs numeric(6,2) not null, default_increment_lbs numeric(5,2) not null, is_bodyweight boolean not null default false, is_weight_optional boolean not null default false, is_progression_eligible boolean not null default true, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table exercises add column if not exists default_target_sets integer;
alter table exercises add column if not exists default_target_reps integer;
alter table exercises add column if not exists default_starting_weight_lbs numeric(6,2) not null default 0;
alter table exercises add column if not exists is_bodyweight boolean not null default false;
alter table exercises add column if not exists is_weight_optional boolean not null default false;
alter table exercises add column if not exists is_progression_eligible boolean not null default true;
create table if not exists programs (id uuid primary key, user_id uuid references users(id), source text not null default 'predefined', name text not null, description text, days_per_week integer not null, session_duration_minutes integer not null, difficulty_level text not null, training_goal text, is_active boolean not null default true, deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table programs add column if not exists user_id uuid references users(id);
alter table programs add column if not exists source text not null default 'predefined';
create index if not exists idx_programs_user_source on programs(user_id, source);
create table if not exists workout_templates (id uuid primary key, program_id uuid not null references programs(id), name text not null, category text not null default 'Full Body', sequence_order integer not null, estimated_duration_minutes integer, is_active boolean not null default true, deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table workout_templates add column if not exists category text not null default 'Full Body';
create unique index if not exists idx_workout_templates_program_sequence on workout_templates(program_id, sequence_order);
create table if not exists user_program_enrollments (id uuid primary key, user_id uuid not null references users(id), program_id uuid not null references programs(id), status text not null, started_at timestamptz not null, completed_at timestamptz, current_workout_template_id uuid references workout_templates(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index if not exists idx_one_active_program_per_user on user_program_enrollments(user_id) where status = 'active';
create table if not exists workout_template_exercise_entries (id uuid primary key, workout_template_id uuid not null references workout_templates(id), exercise_id uuid not null references exercises(id), sequence_order integer not null, target_sets integer not null, target_reps integer not null, rep_range_min integer, rep_range_max integer, rest_seconds integer, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table workout_template_exercise_entries add column if not exists rep_range_min integer;
alter table workout_template_exercise_entries add column if not exists rep_range_max integer;
alter table workout_template_exercise_entries add column if not exists progression_strategy text;
create unique index if not exists idx_workout_template_entry_sequence on workout_template_exercise_entries(workout_template_id, sequence_order);
create table if not exists workout_sessions (id uuid primary key, user_id uuid not null references users(id), program_id uuid not null references programs(id), workout_template_id uuid not null references workout_templates(id), status text not null, started_at timestamptz, completed_at timestamptz, duration_seconds integer, is_partial boolean not null default false, user_effort_feedback text, recovery_state text, program_name_snapshot text not null, workout_name_snapshot text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table workout_sessions add column if not exists is_partial boolean not null default false;
create unique index if not exists idx_one_in_progress_workout_per_user on workout_sessions(user_id) where status = 'in_progress';
create table if not exists exercise_entries (id uuid primary key, workout_session_id uuid not null references workout_sessions(id), exercise_id uuid not null references exercises(id), sequence_order integer not null, target_sets integer not null, target_reps integer not null, target_weight_lbs numeric(6,2) not null, rest_seconds integer, effort_feedback text, completed_at timestamptz, exercise_name_snapshot text not null, exercise_category_snapshot text not null, progression_rule_snapshot jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table exercise_entries add column if not exists workout_template_exercise_entry_id uuid references workout_template_exercise_entries(id);
create unique index if not exists idx_exercise_entries_session_sequence on exercise_entries(workout_session_id, sequence_order);
create index if not exists idx_exercise_entries_template_entry_id on exercise_entries(workout_template_exercise_entry_id);
create table if not exists sets (id uuid primary key, exercise_entry_id uuid not null references exercise_entries(id), set_number integer not null, target_reps integer not null, actual_reps integer, target_weight_lbs numeric(6,2) not null, actual_weight_lbs numeric(6,2), status text not null default 'pending', completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index if not exists idx_sets_entry_set_number on sets(exercise_entry_id, set_number);
create table if not exists progression_states (id uuid primary key, user_id uuid not null references users(id), exercise_id uuid not null references exercises(id), current_weight_lbs numeric(6,2) not null, last_completed_weight_lbs numeric(6,2), consecutive_failures integer not null default 0, last_effort_feedback text, last_performed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index if not exists idx_progression_states_user_exercise on progression_states(user_id, exercise_id);
create table if not exists progression_states_v2 (id uuid primary key, user_id uuid not null references users(id), workout_template_exercise_entry_id uuid not null references workout_template_exercise_entries(id), current_weight_lbs numeric(6,2) not null, last_completed_weight_lbs numeric(6,2), rep_goal integer not null, rep_range_min integer not null, rep_range_max integer not null, consecutive_failures integer not null default 0, last_effort_feedback text, last_performed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint chk_progression_states_v2_current_weight check (current_weight_lbs >= 0), constraint chk_progression_states_v2_rep_range_min check (rep_range_min > 0), constraint chk_progression_states_v2_rep_range_max check (rep_range_max >= rep_range_min), constraint chk_progression_states_v2_rep_goal check (rep_goal between rep_range_min and rep_range_max));
create unique index if not exists idx_progression_states_v2_user_template_entry on progression_states_v2(user_id, workout_template_exercise_entry_id);
create index if not exists idx_progression_states_v2_user_id on progression_states_v2(user_id);
create table if not exists progress_metrics (id uuid primary key, user_id uuid not null references users(id), exercise_id uuid references exercises(id), workout_session_id uuid references workout_sessions(id), metric_type text not null, metric_value numeric(8,2), display_text text not null, recorded_at timestamptz not null, created_at timestamptz not null default now());
create table if not exists progression_recommendation_events (id uuid primary key, user_id uuid not null references users(id), exercise_id uuid references exercises(id), workout_template_exercise_entry_id uuid references workout_template_exercise_entries(id), workout_session_id uuid not null references workout_sessions(id), exercise_entry_id uuid not null references exercise_entries(id), previous_weight_lbs numeric(6,2) not null, next_weight_lbs numeric(6,2) not null, previous_rep_goal integer, next_rep_goal integer, result text not null, reason text not null, confidence text not null, reason_codes jsonb not null, evidence jsonb not null, input_snapshot jsonb not null, created_at timestamptz not null default now());
create table if not exists idempotency_records (id uuid primary key, user_id text not null, key text not null, route_family text not null, target_resource_id text not null default '', request_fingerprint text not null, status text not null, response_status_code integer, response_body text, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index if not exists idx_idempotency_scope on idempotency_records(user_id, key, route_family, target_resource_id);
create table if not exists feedback_entries (id text primary key, reporter_user_id uuid not null references users(id), created_at timestamptz not null, updated_at timestamptz not null default now(), description text not null, category text not null, severity text not null, priority text not null, context jsonb not null);
create index if not exists idx_feedback_entries_reporter_user_id on feedback_entries(reporter_user_id);
create index if not exists idx_feedback_entries_created_at on feedback_entries(created_at);
`;

type SqlExecutor = {
  query: (text: string, params?: unknown[]) => Promise<unknown>;
  exec?: (sql: string) => Promise<unknown>;
};

export async function bootstrapDevelopmentDatabase(executor: SqlExecutor) {
  const schemaStatements = schemaSql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  for (const statement of schemaStatements) {
    if (executor.exec) {
      await executor.exec(statement);
    } else {
      await executor.query(statement);
    }
  }

  const testUserPasswordHash = await hashPassword("password");

  await executor.query(
    `insert into users (id, auth_provider_id, email, password_hash, display_name, timezone, unit_system, experience_level)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (email) do update
     set password_hash = excluded.password_hash,
         deleted_at = null,
         display_name = excluded.display_name,
         timezone = excluded.timezone,
         unit_system = excluded.unit_system,
         experience_level = excluded.experience_level,
         updated_at = now()`,
    [TEST_USER_ID, TEST_USER_ID, TEST_USER_EMAIL, testUserPasswordHash, "test", "America/New_York", "imperial", "beginner"]
  );

  await executor.query(
    `insert into users (id, auth_provider_id, email, display_name, timezone, unit_system, experience_level)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (id) do update
     set auth_provider_id = excluded.auth_provider_id, email = excluded.email, display_name = excluded.display_name, timezone = excluded.timezone, unit_system = excluded.unit_system, experience_level = excluded.experience_level, updated_at = now()`,
    [DEV_USER_ID, "dev-user-1", "dev-user@example.com", "Development User", "America/New_York", "imperial", "beginner"]
  );

  await syncPredefinedProgramCatalog(executor);

  await executor.query(
    `insert into user_program_enrollments (id, user_id, program_id, status, started_at, current_workout_template_id)
     select $1, $2, $3, $4, now(), $5
     where not exists (
       select 1 from user_program_enrollments where user_id = $2 and status = 'active'
     )
     on conflict (id) do update
     set user_id = excluded.user_id,
         program_id = excluded.program_id,
         status = excluded.status,
         current_workout_template_id = excluded.current_workout_template_id,
         updated_at = now()
     where not exists (
       select 1 from user_program_enrollments where user_id = $2 and status = 'active'
     )`,
    [ENROLLMENT_ID, DEV_USER_ID, PROGRAM_ID, "active", TEMPLATE_A_ID]
  );
}

export async function syncPredefinedProgramCatalog(executor: SqlExecutor) {
  for (const program of catalogSeedPrograms) {
    const programId = PROGRAM_IDS_BY_NAME[program.name];
    if (!programId) {
      throw new Error(`Missing predefined program id for ${program.name}.`);
    }

    await executor.query(
      `insert into programs (id, user_id, source, name, description, days_per_week, session_duration_minutes, difficulty_level, is_active)
       values ($1, null, 'predefined', $2, $3, $4, $5, $6, $7)
       on conflict (id) do update
       set user_id = null, source = 'predefined', name = excluded.name, description = excluded.description, days_per_week = excluded.days_per_week, session_duration_minutes = excluded.session_duration_minutes, difficulty_level = excluded.difficulty_level, is_active = excluded.is_active, updated_at = now()`,
      [
        programId,
        program.name,
        program.description,
        program.daysPerWeek,
        program.sessionDurationMinutes,
        program.difficultyLevel,
        true
      ]
    );
  }

  await executor.query(
    `insert into programs (id, user_id, source, name, description, days_per_week, session_duration_minutes, difficulty_level, is_active)
     values ($1, null, 'predefined', $2, $3, $4, $5, $6, $7)
     on conflict (id) do update
     set user_id = null, source = 'predefined', name = excluded.name, description = excluded.description, days_per_week = excluded.days_per_week, session_duration_minutes = excluded.session_duration_minutes, difficulty_level = excluded.difficulty_level, is_active = excluded.is_active, updated_at = now()`,
    [
      CUSTOM_WORKOUT_PROGRAM_ID,
      "Custom Workout",
      "Ad hoc training session without a predefined program template.",
      1,
      45,
      "beginner",
      false
    ]
  );

  for (const exercise of catalogSeedExercises) {
    await executor.query(
      `insert into exercises (id, name, category, movement_pattern, primary_muscle_group, equipment_type, default_target_sets, default_target_reps, default_starting_weight_lbs, default_increment_lbs, is_bodyweight, is_weight_optional, is_progression_eligible, is_active)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       on conflict (id) do update
       set name = excluded.name, category = excluded.category, movement_pattern = excluded.movement_pattern, primary_muscle_group = excluded.primary_muscle_group, equipment_type = excluded.equipment_type, default_target_sets = excluded.default_target_sets, default_target_reps = excluded.default_target_reps, default_starting_weight_lbs = excluded.default_starting_weight_lbs, default_increment_lbs = excluded.default_increment_lbs, is_bodyweight = excluded.is_bodyweight, is_weight_optional = excluded.is_weight_optional, is_progression_eligible = excluded.is_progression_eligible, is_active = excluded.is_active, updated_at = now()`,
      [
        EXERCISE_IDS[exercise.slug],
        exercise.name,
        exercise.category,
        exercise.movementPattern,
        exercise.primaryMuscleGroup,
        exercise.equipmentType,
        exercise.defaultTargetSets,
        exercise.defaultTargetReps,
        exercise.defaultStartingWeightLbs.toFixed(2),
        exercise.defaultIncrementLbs.toFixed(2),
        exercise.isBodyweight ?? exercise.equipmentType === "bodyweight",
        exercise.isWeightOptional ?? exercise.equipmentType === "bodyweight",
        exercise.isProgressionEligible ?? true,
        true
      ]
    );
  }

  let templateEntryIndex = 1;
  for (const program of catalogSeedPrograms) {
    const programId = PROGRAM_IDS_BY_NAME[program.name];
    const templateIds = TEMPLATE_IDS_BY_PROGRAM_NAME[program.name];
    if (!programId || !templateIds || templateIds.length < program.templates.length) {
      throw new Error(`Missing predefined workout template ids for ${program.name}.`);
    }

    for (const template of program.templates) {
      const templateId = templateIds[template.sequenceOrder - 1];
      if (!templateId) {
        throw new Error(`Missing predefined workout template id for ${program.name} day ${template.sequenceOrder}.`);
      }

      await executor.query(
        `insert into workout_templates (id, program_id, name, category, sequence_order, estimated_duration_minutes, is_active)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (id) do update
         set program_id = excluded.program_id, name = excluded.name, category = excluded.category, sequence_order = excluded.sequence_order, estimated_duration_minutes = excluded.estimated_duration_minutes, is_active = excluded.is_active, updated_at = now()`,
        [
          templateId,
          programId,
          template.name,
          template.category,
          template.sequenceOrder,
          template.estimatedDurationMinutes,
          true
        ]
      );

      await executor.query(
        `delete from workout_template_exercise_entries
         where workout_template_id = $1`,
        [templateId]
      );

      for (const entry of template.exercises) {
        await executor.query(
          `insert into workout_template_exercise_entries (id, workout_template_id, exercise_id, sequence_order, target_sets, target_reps, rest_seconds)
           values ($1, $2, $3, $4, $5, $6, $7)
           on conflict (id) do update
           set workout_template_id = excluded.workout_template_id, exercise_id = excluded.exercise_id, sequence_order = excluded.sequence_order, target_sets = excluded.target_sets, target_reps = excluded.target_reps, rest_seconds = excluded.rest_seconds, updated_at = now()`,
          [
            createSeedEntryId(templateEntryIndex++),
            templateId,
            EXERCISE_IDS[entry.exerciseSlug],
            entry.sequenceOrder,
            entry.targetSets,
            entry.targetReps,
            entry.restSeconds
          ]
        );
      }
    }
  }
}
