export const DEV_USER_ID = "11111111-1111-1111-1111-111111111111";
const PROGRAM_ID = "22222222-2222-2222-2222-222222222222";
const UPPER_LOWER_ARMS_PROGRAM_ID = "22222222-2222-2222-2222-222222222223";
const TEMPLATE_A_ID = "33333333-3333-3333-3333-333333333333";
const TEMPLATE_B_ID = "44444444-4444-4444-4444-444444444444";
const UPPER_LOWER_DAY_1_TEMPLATE_ID = "33333333-3333-3333-3333-333333333341";
const UPPER_LOWER_DAY_2_TEMPLATE_ID = "33333333-3333-3333-3333-333333333342";
const UPPER_LOWER_DAY_3_TEMPLATE_ID = "33333333-3333-3333-3333-333333333343";
const UPPER_LOWER_DAY_4_TEMPLATE_ID = "33333333-3333-3333-3333-333333333344";
const ENROLLMENT_ID = "55555555-5555-5555-5555-555555555555";

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
  "hammer-curl": "66666666-6666-6666-6666-666666666619"
};

const templateDefinitions = [
  { id: TEMPLATE_A_ID, programId: PROGRAM_ID, name: "Workout A", order: 1, duration: 60 },
  { id: TEMPLATE_B_ID, programId: PROGRAM_ID, name: "Workout B", order: 2, duration: 55 },
  { id: UPPER_LOWER_DAY_1_TEMPLATE_ID, programId: UPPER_LOWER_ARMS_PROGRAM_ID, name: "Day 1 - Upper Strength", order: 1, duration: 60 },
  { id: UPPER_LOWER_DAY_2_TEMPLATE_ID, programId: UPPER_LOWER_ARMS_PROGRAM_ID, name: "Day 2 - Lower", order: 2, duration: 55 },
  { id: UPPER_LOWER_DAY_3_TEMPLATE_ID, programId: UPPER_LOWER_ARMS_PROGRAM_ID, name: "Day 3 - Upper Arms Focus", order: 3, duration: 55 },
  { id: UPPER_LOWER_DAY_4_TEMPLATE_ID, programId: UPPER_LOWER_ARMS_PROGRAM_ID, name: "Day 4 - Arms Quick", order: 4, duration: 35 }
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
  { id: "77777777-7777-7777-7777-777777777726", templateId: UPPER_LOWER_DAY_4_TEMPLATE_ID, exerciseSlug: "hammer-curl", order: 3, sets: 2, reps: 10, rest: 75 }
] as const;

const schemaSql = `
create table if not exists users (id uuid primary key, auth_provider_id text not null unique, email text not null unique, password_hash text, display_name text, timezone text not null default 'America/New_York', unit_system text not null default 'imperial', experience_level text, deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table users add column if not exists password_hash text;
create table if not exists exercises (id uuid primary key, name text not null unique, category text not null, movement_pattern text, primary_muscle_group text, equipment_type text, default_starting_weight_lbs numeric(6,2) not null, default_increment_lbs numeric(5,2) not null, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists programs (id uuid primary key, name text not null, description text, days_per_week integer not null, session_duration_minutes integer not null, difficulty_level text not null, is_active boolean not null default true, deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists workout_templates (id uuid primary key, program_id uuid not null references programs(id), name text not null, sequence_order integer not null, estimated_duration_minutes integer, is_active boolean not null default true, deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index if not exists idx_workout_templates_program_sequence on workout_templates(program_id, sequence_order);
create table if not exists user_program_enrollments (id uuid primary key, user_id uuid not null references users(id), program_id uuid not null references programs(id), status text not null, started_at timestamptz not null, completed_at timestamptz, current_workout_template_id uuid references workout_templates(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index if not exists idx_one_active_program_per_user on user_program_enrollments(user_id) where status = 'active';
create table if not exists workout_template_exercise_entries (id uuid primary key, workout_template_id uuid not null references workout_templates(id), exercise_id uuid not null references exercises(id), sequence_order integer not null, target_sets integer not null, target_reps integer not null, rest_seconds integer, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index if not exists idx_workout_template_entry_sequence on workout_template_exercise_entries(workout_template_id, sequence_order);
create table if not exists workout_sessions (id uuid primary key, user_id uuid not null references users(id), program_id uuid not null references programs(id), workout_template_id uuid not null references workout_templates(id), status text not null, started_at timestamptz, completed_at timestamptz, duration_seconds integer, is_partial boolean not null default false, user_effort_feedback text, program_name_snapshot text not null, workout_name_snapshot text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table workout_sessions add column if not exists is_partial boolean not null default false;
create unique index if not exists idx_one_in_progress_workout_per_user on workout_sessions(user_id) where status = 'in_progress';
create table if not exists exercise_entries (id uuid primary key, workout_session_id uuid not null references workout_sessions(id), exercise_id uuid not null references exercises(id), sequence_order integer not null, target_sets integer not null, target_reps integer not null, target_weight_lbs numeric(6,2) not null, rest_seconds integer, effort_feedback text, completed_at timestamptz, exercise_name_snapshot text not null, exercise_category_snapshot text not null, progression_rule_snapshot jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index if not exists idx_exercise_entries_session_sequence on exercise_entries(workout_session_id, sequence_order);
create table if not exists sets (id uuid primary key, exercise_entry_id uuid not null references exercise_entries(id), set_number integer not null, target_reps integer not null, actual_reps integer, target_weight_lbs numeric(6,2) not null, actual_weight_lbs numeric(6,2), status text not null default 'pending', completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index if not exists idx_sets_entry_set_number on sets(exercise_entry_id, set_number);
create table if not exists progression_states (id uuid primary key, user_id uuid not null references users(id), exercise_id uuid not null references exercises(id), current_weight_lbs numeric(6,2) not null, last_completed_weight_lbs numeric(6,2), consecutive_failures integer not null default 0, last_effort_feedback text, last_performed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index if not exists idx_progression_states_user_exercise on progression_states(user_id, exercise_id);
create table if not exists progress_metrics (id uuid primary key, user_id uuid not null references users(id), exercise_id uuid references exercises(id), workout_session_id uuid references workout_sessions(id), metric_type text not null, metric_value numeric(8,2), display_text text not null, recorded_at timestamptz not null, created_at timestamptz not null default now());
create table if not exists idempotency_records (id uuid primary key, user_id text not null, key text not null, route_family text not null, target_resource_id text not null default '', request_fingerprint text not null, status text not null, response_status_code integer, response_body text, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index if not exists idx_idempotency_scope on idempotency_records(user_id, key, route_family, target_resource_id);
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
  await executor.query(
    `insert into programs (id, name, description, days_per_week, session_duration_minutes, difficulty_level, is_active)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (id) do update
     set name = excluded.name, description = excluded.description, days_per_week = excluded.days_per_week, session_duration_minutes = excluded.session_duration_minutes, difficulty_level = excluded.difficulty_level, is_active = excluded.is_active, updated_at = now()`,
    [PROGRAM_ID, "Beginner Full Body V1", "Three full-body sessions per week with deterministic weight progression.", 3, 60, "beginner", true]
  );

  await executor.query(
    `insert into programs (id, name, description, days_per_week, session_duration_minutes, difficulty_level, is_active)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (id) do update
     set name = excluded.name, description = excluded.description, days_per_week = excluded.days_per_week, session_duration_minutes = excluded.session_duration_minutes, difficulty_level = excluded.difficulty_level, is_active = excluded.is_active, updated_at = now()`,
    [
      UPPER_LOWER_ARMS_PROGRAM_ID,
      "4-Day Upper/Lower + Arms",
      "Four weekly upper/lower sessions with extra arm volume and simple progression targets.",
      4,
      55,
      "beginner",
      true
    ]
  );

  for (const exercise of seedExercises) {
    await executor.query(
      `insert into exercises (id, name, category, movement_pattern, primary_muscle_group, equipment_type, default_starting_weight_lbs, default_increment_lbs, is_active)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (id) do update
       set name = excluded.name, category = excluded.category, movement_pattern = excluded.movement_pattern, primary_muscle_group = excluded.primary_muscle_group, equipment_type = excluded.equipment_type, default_starting_weight_lbs = excluded.default_starting_weight_lbs, default_increment_lbs = excluded.default_increment_lbs, is_active = excluded.is_active, updated_at = now()`,
      [EXERCISE_IDS[exercise.slug], exercise.name, exercise.category, exercise.movementPattern, exercise.primaryMuscleGroup, exercise.equipmentType, exercise.defaultStartingWeightLbs.toFixed(2), exercise.defaultIncrementLbs.toFixed(2), true]
    );
  }

  for (const template of templateDefinitions) {
    await executor.query(
      `insert into workout_templates (id, program_id, name, sequence_order, estimated_duration_minutes, is_active)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (id) do update
       set program_id = excluded.program_id, name = excluded.name, sequence_order = excluded.sequence_order, estimated_duration_minutes = excluded.estimated_duration_minutes, is_active = excluded.is_active, updated_at = now()`,
      [template.id, template.programId, template.name, template.order, template.duration, true]
    );
  }

  for (const entry of templateEntries) {
    await executor.query(
      `insert into workout_template_exercise_entries (id, workout_template_id, exercise_id, sequence_order, target_sets, target_reps, rest_seconds)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (id) do update
       set workout_template_id = excluded.workout_template_id, exercise_id = excluded.exercise_id, sequence_order = excluded.sequence_order, target_sets = excluded.target_sets, target_reps = excluded.target_reps, rest_seconds = excluded.rest_seconds, updated_at = now()`,
      [entry.id, entry.templateId, EXERCISE_IDS[entry.exerciseSlug], entry.order, entry.sets, entry.reps, entry.rest]
    );
  }
}
