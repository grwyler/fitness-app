export const DEV_USER_ID = "11111111-1111-1111-1111-111111111111";
const PROGRAM_ID = "22222222-2222-2222-2222-222222222222";
const TEMPLATE_A_ID = "33333333-3333-3333-3333-333333333333";
const TEMPLATE_B_ID = "44444444-4444-4444-4444-444444444444";
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
  { slug: "lat-pulldown", name: "Lat Pulldown", category: "accessory", movementPattern: "pull", primaryMuscleGroup: "lats", equipmentType: "cable", defaultStartingWeightLbs: 50, defaultIncrementLbs: 2.5 }
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
  "lat-pulldown": "66666666-6666-6666-6666-666666666609"
};

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
  { id: "77777777-7777-7777-7777-777777777710", templateId: TEMPLATE_B_ID, exerciseSlug: "bicep-curl", order: 5, sets: 3, reps: 8, rest: 75 }
] as const;

const schemaSql = `
create table if not exists users (id uuid primary key, auth_provider_id text not null unique, email text not null unique, display_name text, timezone text not null default 'America/New_York', unit_system text not null default 'imperial', experience_level text, deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists exercises (id uuid primary key, name text not null unique, category text not null, movement_pattern text, primary_muscle_group text, equipment_type text, default_starting_weight_lbs numeric(6,2) not null, default_increment_lbs numeric(5,2) not null, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists programs (id uuid primary key, name text not null, description text, days_per_week integer not null, session_duration_minutes integer not null, difficulty_level text not null, is_active boolean not null default true, deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists workout_templates (id uuid primary key, program_id uuid not null references programs(id), name text not null, sequence_order integer not null, estimated_duration_minutes integer, is_active boolean not null default true, deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index if not exists idx_workout_templates_program_sequence on workout_templates(program_id, sequence_order);
create table if not exists user_program_enrollments (id uuid primary key, user_id uuid not null references users(id), program_id uuid not null references programs(id), status text not null, started_at timestamptz not null, completed_at timestamptz, current_workout_template_id uuid references workout_templates(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index if not exists idx_one_active_program_per_user on user_program_enrollments(user_id) where status = 'active';
create table if not exists workout_template_exercise_entries (id uuid primary key, workout_template_id uuid not null references workout_templates(id), exercise_id uuid not null references exercises(id), sequence_order integer not null, target_sets integer not null, target_reps integer not null, rest_seconds integer, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index if not exists idx_workout_template_entry_sequence on workout_template_exercise_entries(workout_template_id, sequence_order);
create table if not exists workout_sessions (id uuid primary key, user_id uuid not null references users(id), program_id uuid not null references programs(id), workout_template_id uuid not null references workout_templates(id), status text not null, started_at timestamptz, completed_at timestamptz, duration_seconds integer, user_effort_feedback text, program_name_snapshot text not null, workout_name_snapshot text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
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

  await executor.query(
    `insert into programs (id, name, description, days_per_week, session_duration_minutes, difficulty_level, is_active)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (id) do update
     set name = excluded.name, description = excluded.description, days_per_week = excluded.days_per_week, session_duration_minutes = excluded.session_duration_minutes, difficulty_level = excluded.difficulty_level, is_active = excluded.is_active, updated_at = now()`,
    [PROGRAM_ID, "Beginner Full Body V1", "Three full-body sessions per week with deterministic weight progression.", 3, 60, "beginner", true]
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

  await executor.query(
    `insert into workout_templates (id, program_id, name, sequence_order, estimated_duration_minutes, is_active)
     values ($1, $3, $5, $7, $9, $11), ($2, $4, $6, $8, $10, $12)
     on conflict (id) do update
     set program_id = excluded.program_id, name = excluded.name, sequence_order = excluded.sequence_order, estimated_duration_minutes = excluded.estimated_duration_minutes, is_active = excluded.is_active, updated_at = now()`,
    [TEMPLATE_A_ID, TEMPLATE_B_ID, PROGRAM_ID, PROGRAM_ID, "Workout A", "Workout B", 1, 2, 60, 55, true, true]
  );

  for (const entry of templateEntries) {
    await executor.query(
      `insert into workout_template_exercise_entries (id, workout_template_id, exercise_id, sequence_order, target_sets, target_reps, rest_seconds)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (id) do update
       set workout_template_id = excluded.workout_template_id, exercise_id = excluded.exercise_id, sequence_order = excluded.sequence_order, target_sets = excluded.target_sets, target_reps = excluded.target_reps, rest_seconds = excluded.rest_seconds, updated_at = now()`,
      [entry.id, entry.templateId, EXERCISE_IDS[entry.exerciseSlug], entry.order, entry.sets, entry.reps, entry.rest]
    );
  }

  await executor.query(
    `insert into user_program_enrollments (id, user_id, program_id, status, started_at, current_workout_template_id)
     values ($1, $2, $3, $4, now(), $5)
     on conflict (id) do update
     set user_id = excluded.user_id, program_id = excluded.program_id, status = excluded.status, current_workout_template_id = excluded.current_workout_template_id, updated_at = now()`,
    [ENROLLMENT_ID, DEV_USER_ID, PROGRAM_ID, "active", TEMPLATE_A_ID]
  );
}
