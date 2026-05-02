import {
  exerciseEntries,
  exercises,
  idempotencyRecords,
  progressMetrics,
  progressionRecommendationEvents,
  progressionStates,
  progressionStatesV2,
  programs,
  sets,
  userProgramEnrollments,
  userExerciseProgressionSettings,
  userTrainingSettings,
  users,
  workoutSessions,
  workoutTemplateExerciseEntries,
  workoutTemplates
} from "@fitness/db";
import {
  CUSTOM_WORKOUT_PROGRAM_ID,
  CUSTOM_WORKOUT_TEMPLATE_ID
} from "../../domain/models/custom-workout.js";
import { createPgliteClient, createPgliteDatabase, type PgliteDatabase } from "../../../../lib/db/connection.js";
import { DrizzleTransactionManager } from "../db/drizzle-transaction-manager.js";
import { DrizzleEnrollmentRepository } from "../repositories/drizzle-enrollment.repository.js";
import { DrizzleExerciseRepository } from "../repositories/drizzle-exercise.repository.js";
import { DrizzleIdempotencyRepository } from "../repositories/drizzle-idempotency.repository.js";
import { DrizzleProgressMetricRepository } from "../repositories/drizzle-progress-metric.repository.js";
import { DrizzleProgressionStateRepository } from "../repositories/drizzle-progression-state.repository.js";
import { DrizzleProgressionStateV2Repository } from "../repositories/drizzle-progression-state-v2.repository.js";
import { DrizzleProgressionRecommendationEventRepository } from "../repositories/drizzle-progression-recommendation-event.repository.js";
import { DrizzleProgramRepository } from "../repositories/drizzle-program.repository.js";
import { DrizzleTrainingSettingsRepository } from "../repositories/drizzle-training-settings.repository.js";
import { DrizzleExerciseProgressionSettingsRepository } from "../repositories/drizzle-exercise-progression-settings.repository.js";
import { DrizzleUserRepository } from "../repositories/drizzle-user.repository.js";
import { DrizzleWorkoutSessionRepository } from "../repositories/drizzle-workout-session.repository.js";

const schemaSql = `
create table users (
  id text primary key,
  auth_provider_id text not null unique,
  email text not null unique,
  password_hash text,
  display_name text,
  role text not null default 'user',
  timezone text not null default 'America/New_York',
  unit_system text not null default 'imperial',
  experience_level text,
  training_goal text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_training_settings (
  user_id text primary key references users(id),
  progression_aggressiveness text not null default 'balanced',
  default_barbell_increment_lbs numeric(5,2) not null default 5,
  default_dumbbell_increment_lbs numeric(5,2) not null default 5,
  default_machine_increment_lbs numeric(5,2) not null default 10,
  default_cable_increment_lbs numeric(5,2) not null default 5,
  use_recovery_adjustments boolean not null default true,
  default_recovery_state text not null default 'normal',
  allow_auto_deload boolean not null default true,
  allow_recalibration boolean not null default true,
  prefer_rep_progression_before_weight boolean not null default true,
  minimum_confidence_for_increase text not null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table password_reset_tokens (
  id text primary key,
  user_id text not null references users(id),
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_password_reset_tokens_user_id on password_reset_tokens(user_id);
create index idx_password_reset_tokens_expires_at on password_reset_tokens(expires_at);

create table exercises (
  id text primary key,
  name text not null unique,
  category text not null,
  movement_pattern text,
  primary_muscle_group text,
  equipment_type text,
  default_target_sets integer,
  default_target_reps integer,
  default_starting_weight_lbs numeric(6,2) not null,
  default_increment_lbs numeric(5,2) not null,
  is_bodyweight boolean not null default false,
  is_weight_optional boolean not null default false,
  is_progression_eligible boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_exercise_progression_settings (
  id text primary key,
  user_id text not null references users(id),
  exercise_id text not null references exercises(id),
  progression_strategy text,
  rep_range_min integer,
  rep_range_max integer,
  increment_override_lbs numeric(5,2),
  max_jump_per_session_lbs numeric(6,2),
  bodyweight_progression_mode text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index idx_user_exercise_progression_unique on user_exercise_progression_settings(user_id, exercise_id);

create table programs (
  id text primary key,
  user_id text references users(id),
  source text not null default 'predefined',
  name text not null,
  description text,
  days_per_week integer not null,
  session_duration_minutes integer not null,
  difficulty_level text not null,
  training_goal text,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workout_templates (
  id text primary key,
  program_id text not null references programs(id),
  name text not null,
  category text not null default 'Full Body',
  sequence_order integer not null,
  estimated_duration_minutes integer,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index idx_workout_templates_program_sequence on workout_templates(program_id, sequence_order);
create index idx_programs_user_source on programs(user_id, source);

create table user_program_enrollments (
  id text primary key,
  user_id text not null references users(id),
  program_id text not null references programs(id),
  status text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  current_workout_template_id text references workout_templates(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index idx_one_active_program_per_user on user_program_enrollments(user_id) where status = 'active';

create table workout_template_exercise_entries (
  id text primary key,
  workout_template_id text not null references workout_templates(id),
  exercise_id text not null references exercises(id),
  sequence_order integer not null,
  target_sets integer not null,
  target_reps integer not null,
  rep_range_min integer,
  rep_range_max integer,
  rest_seconds integer,
  progression_strategy text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index idx_workout_template_entry_sequence on workout_template_exercise_entries(workout_template_id, sequence_order);
create index idx_workout_template_exercise_entries_active_template on workout_template_exercise_entries(workout_template_id) where deleted_at is null;

create table workout_sessions (
  id text primary key,
  user_id text not null references users(id),
  program_id text not null references programs(id),
  workout_template_id text not null references workout_templates(id),
  status text not null,
  started_at timestamptz,
  completed_at timestamptz,
  duration_seconds integer,
  is_partial boolean not null default false,
  user_effort_feedback text,
  recovery_state text,
  program_name_snapshot text not null,
  workout_name_snapshot text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index idx_one_in_progress_workout_per_user on workout_sessions(user_id) where status = 'in_progress';

create table exercise_entries (
  id text primary key,
  workout_session_id text not null references workout_sessions(id),
  exercise_id text not null references exercises(id),
  workout_template_exercise_entry_id text references workout_template_exercise_entries(id),
  sequence_order integer not null,
  target_sets integer not null,
  target_reps integer not null,
  target_weight_lbs numeric(6,2) not null,
  rest_seconds integer,
  effort_feedback text,
  completed_at timestamptz,
  exercise_name_snapshot text not null,
  exercise_category_snapshot text not null,
  progression_rule_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index idx_exercise_entries_session_sequence on exercise_entries(workout_session_id, sequence_order);
create index idx_exercise_entries_template_entry_id on exercise_entries(workout_template_exercise_entry_id);

create table sets (
  id text primary key,
  exercise_entry_id text not null references exercise_entries(id),
  set_number integer not null,
  target_reps integer not null,
  actual_reps integer,
  target_weight_lbs numeric(6,2) not null,
  actual_weight_lbs numeric(6,2),
  status text not null default 'pending',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index idx_sets_entry_set_number on sets(exercise_entry_id, set_number);

create table progression_states (
  id text primary key,
  user_id text not null references users(id),
  exercise_id text not null references exercises(id),
  current_weight_lbs numeric(6,2) not null,
  last_completed_weight_lbs numeric(6,2),
  consecutive_failures integer not null default 0,
  last_effort_feedback text,
  last_performed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index idx_progression_states_user_exercise on progression_states(user_id, exercise_id);

create table progression_states_v2 (
  id text primary key,
  user_id text not null references users(id),
  workout_template_exercise_entry_id text not null references workout_template_exercise_entries(id),
  current_weight_lbs numeric(6,2) not null,
  last_completed_weight_lbs numeric(6,2),
  rep_goal integer not null,
  rep_range_min integer not null,
  rep_range_max integer not null,
  consecutive_failures integer not null default 0,
  last_effort_feedback text,
  last_performed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_progression_states_v2_current_weight check (current_weight_lbs >= 0),
  constraint chk_progression_states_v2_rep_range_min check (rep_range_min > 0),
  constraint chk_progression_states_v2_rep_range_max check (rep_range_max >= rep_range_min),
  constraint chk_progression_states_v2_rep_goal check (rep_goal between rep_range_min and rep_range_max)
);
create unique index idx_progression_states_v2_user_template_entry on progression_states_v2(user_id, workout_template_exercise_entry_id);
create index idx_progression_states_v2_user_id on progression_states_v2(user_id);

create table progress_metrics (
  id text primary key,
  user_id text not null references users(id),
  exercise_id text references exercises(id),
  workout_session_id text references workout_sessions(id),
  metric_type text not null,
  metric_value numeric(8,2),
  display_text text not null,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table progression_recommendation_events (
  id text primary key,
  user_id text not null references users(id),
  exercise_id text references exercises(id),
  workout_template_exercise_entry_id text references workout_template_exercise_entries(id),
  workout_session_id text not null references workout_sessions(id),
  exercise_entry_id text not null references exercise_entries(id),
  previous_weight_lbs numeric(6,2) not null,
  next_weight_lbs numeric(6,2) not null,
  previous_rep_goal integer,
  next_rep_goal integer,
  result text not null,
  reason text not null,
  confidence text not null,
  reason_codes jsonb not null,
  evidence jsonb not null,
  input_snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create index idx_progression_recommendation_events_user_id on progression_recommendation_events(user_id);
create index idx_progression_recommendation_events_session_id on progression_recommendation_events(workout_session_id);

create table idempotency_records (
  id text primary key,
  user_id text not null,
  key text not null,
  route_family text not null,
  target_resource_id text not null default '',
  request_fingerprint text not null,
  status text not null,
  response_status_code integer,
  response_body text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index idx_idempotency_scope on idempotency_records(user_id, key, route_family, target_resource_id);

create table feedback_entries (
  id text primary key,
  reporter_user_id text not null references users(id),
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  description text not null,
  category text not null,
  severity text not null,
  priority text not null,
  context jsonb not null
);
create index idx_feedback_entries_reporter_user_id on feedback_entries(reporter_user_id);
create index idx_feedback_entries_created_at on feedback_entries(created_at);
`;

export type WorkoutInfrastructureTestContext = {
  db: PgliteDatabase;
  client: { exec: (sql: string) => Promise<unknown>; close?: () => Promise<void> };
  transactionManager: DrizzleTransactionManager;
  repositories: {
    workoutSessionRepository: DrizzleWorkoutSessionRepository;
    enrollmentRepository: DrizzleEnrollmentRepository;
    programRepository: DrizzleProgramRepository;
    userRepository: DrizzleUserRepository;
    progressionStateRepository: DrizzleProgressionStateRepository;
    progressionStateV2Repository: DrizzleProgressionStateV2Repository;
    exerciseRepository: DrizzleExerciseRepository;
    progressMetricRepository: DrizzleProgressMetricRepository;
    progressionRecommendationEventRepository: DrizzleProgressionRecommendationEventRepository;
    trainingSettingsRepository: DrizzleTrainingSettingsRepository;
    exerciseProgressionSettingsRepository: DrizzleExerciseProgressionSettingsRepository;
    idempotencyRepository: DrizzleIdempotencyRepository;
  };
};

export async function createWorkoutInfrastructureTestContext(): Promise<WorkoutInfrastructureTestContext> {
  const client = createPgliteClient();
  await client.exec(schemaSql);

  const db = createPgliteDatabase(client);

  return {
    db,
    client,
    transactionManager: new DrizzleTransactionManager(db),
    repositories: {
      workoutSessionRepository: new DrizzleWorkoutSessionRepository(db),
      enrollmentRepository: new DrizzleEnrollmentRepository(db),
      programRepository: new DrizzleProgramRepository(db),
      userRepository: new DrizzleUserRepository(db),
      progressionStateRepository: new DrizzleProgressionStateRepository(db),
      progressionStateV2Repository: new DrizzleProgressionStateV2Repository(db),
      exerciseRepository: new DrizzleExerciseRepository(db),
      progressMetricRepository: new DrizzleProgressMetricRepository(db),
      progressionRecommendationEventRepository: new DrizzleProgressionRecommendationEventRepository(db),
      trainingSettingsRepository: new DrizzleTrainingSettingsRepository(db),
      exerciseProgressionSettingsRepository: new DrizzleExerciseProgressionSettingsRepository(db),
      idempotencyRepository: new DrizzleIdempotencyRepository(db)
    }
  };
}

export async function disposeWorkoutInfrastructureTestContext(
  context: WorkoutInfrastructureTestContext
): Promise<void> {
  await context.client.close?.();
}

export async function seedBaseWorkoutProgram(context: WorkoutInfrastructureTestContext) {
  const now = new Date("2026-04-24T10:00:00.000Z");

  await context.db.insert(users).values({
    id: "user-1",
    authProviderId: "auth-user-1",
    email: "user-1@example.com",
    displayName: "User One",
    timezone: "America/New_York",
    unitSystem: "imperial",
    experienceLevel: "beginner",
    createdAt: now,
    updatedAt: now
  });

  await context.db.insert(programs).values({
    id: "program-1",
    userId: null,
    source: "predefined",
    name: "3-Day Full Body Beginner",
    description: "A simple strength progression program.",
    daysPerWeek: 3,
    sessionDurationMinutes: 60,
    difficultyLevel: "beginner",
    isActive: true,
    createdAt: now,
    updatedAt: now
  });

  await context.db.insert(programs).values({
    id: CUSTOM_WORKOUT_PROGRAM_ID,
    userId: null,
    source: "predefined",
    name: "Custom Workout",
    description: "Ad hoc training session without a predefined program template.",
    daysPerWeek: 1,
    sessionDurationMinutes: 45,
    difficultyLevel: "beginner",
    isActive: false,
    createdAt: now,
    updatedAt: now
  });

  await context.db.insert(workoutTemplates).values([
    {
      id: "template-1",
      programId: "program-1",
      name: "Workout A",
      category: "Full Body",
      sequenceOrder: 1,
      estimatedDurationMinutes: 60,
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "template-2",
      programId: "program-1",
      name: "Workout B",
      category: "Full Body",
      sequenceOrder: 2,
      estimatedDurationMinutes: 55,
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: CUSTOM_WORKOUT_TEMPLATE_ID,
      programId: CUSTOM_WORKOUT_PROGRAM_ID,
      name: "Custom Workout",
      category: "Full Body",
      sequenceOrder: 1,
      estimatedDurationMinutes: 45,
      isActive: true,
      createdAt: now,
      updatedAt: now
    }
  ]);

  await context.db.insert(exercises).values({
    id: "exercise-1",
    name: "Bench Press",
    category: "compound",
    movementPattern: "push",
    primaryMuscleGroup: "chest",
    equipmentType: "barbell",
    defaultStartingWeightLbs: "135.00",
    defaultIncrementLbs: "5.00",
    isActive: true,
    createdAt: now,
    updatedAt: now
  });

  await context.db.insert(workoutTemplateExerciseEntries).values({
    id: "template-entry-1",
    workoutTemplateId: "template-1",
    exerciseId: "exercise-1",
    sequenceOrder: 1,
    targetSets: 3,
    targetReps: 8,
    restSeconds: 120,
    createdAt: now,
    updatedAt: now
  });

  await context.db.insert(userProgramEnrollments).values({
    id: "enrollment-1",
    userId: "user-1",
    programId: "program-1",
    status: "active",
    startedAt: now,
    completedAt: null,
    currentWorkoutTemplateId: "template-1",
    createdAt: now,
    updatedAt: now
  });
}

export async function seedUpperLowerArmsProgram(context: WorkoutInfrastructureTestContext) {
  const now = new Date("2026-04-24T10:00:00.000Z");

  await context.db.insert(programs).values({
    id: "program-2",
    userId: null,
    source: "predefined",
    name: "4-Day Upper/Lower + Arms",
    description: "Four weekly upper/lower sessions with extra arm volume and simple progression targets.",
    daysPerWeek: 4,
    sessionDurationMinutes: 55,
    difficultyLevel: "beginner",
    isActive: true,
    createdAt: now,
    updatedAt: now
  });

  await context.db.insert(workoutTemplates).values([
    {
      id: "template-3",
      programId: "program-2",
      name: "Day 1 - Upper Strength",
      category: "Push",
      sequenceOrder: 1,
      estimatedDurationMinutes: 60,
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "template-4",
      programId: "program-2",
      name: "Day 2 - Lower",
      category: "Legs",
      sequenceOrder: 2,
      estimatedDurationMinutes: 55,
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "template-5",
      programId: "program-2",
      name: "Day 3 - Upper Arms Focus",
      category: "Pull",
      sequenceOrder: 3,
      estimatedDurationMinutes: 55,
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "template-6",
      programId: "program-2",
      name: "Day 4 - Arms Quick",
      category: "Quick",
      sequenceOrder: 4,
      estimatedDurationMinutes: 35,
      isActive: true,
      createdAt: now,
      updatedAt: now
    }
  ]);

  await context.db.insert(exercises).values([
    {
      id: "exercise-2",
      name: "Squat",
      category: "compound",
      movementPattern: "squat",
      primaryMuscleGroup: "quads",
      equipmentType: "barbell",
      defaultStartingWeightLbs: "95.00",
      defaultIncrementLbs: "5.00",
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "exercise-3",
      name: "Pull-Ups",
      category: "compound",
      movementPattern: "pull",
      primaryMuscleGroup: "lats",
      equipmentType: "bodyweight",
      defaultStartingWeightLbs: "0.00",
      defaultIncrementLbs: "2.50",
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "exercise-4",
      name: "DB Row",
      category: "compound",
      movementPattern: "pull",
      primaryMuscleGroup: "back",
      equipmentType: "dumbbell",
      defaultStartingWeightLbs: "35.00",
      defaultIncrementLbs: "5.00",
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "exercise-5",
      name: "DB Curl",
      category: "accessory",
      movementPattern: "pull",
      primaryMuscleGroup: "biceps",
      equipmentType: "dumbbell",
      defaultStartingWeightLbs: "20.00",
      defaultIncrementLbs: "2.50",
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "exercise-6",
      name: "Overhead DB Tricep Extension",
      category: "accessory",
      movementPattern: "push",
      primaryMuscleGroup: "triceps",
      equipmentType: "dumbbell",
      defaultStartingWeightLbs: "25.00",
      defaultIncrementLbs: "2.50",
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "exercise-7",
      name: "Romanian Deadlift",
      category: "compound",
      movementPattern: "hinge",
      primaryMuscleGroup: "hamstrings",
      equipmentType: "barbell",
      defaultStartingWeightLbs: "95.00",
      defaultIncrementLbs: "5.00",
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "exercise-8",
      name: "Lunges",
      category: "accessory",
      movementPattern: "lunge",
      primaryMuscleGroup: "quads",
      equipmentType: "dumbbell",
      defaultStartingWeightLbs: "25.00",
      defaultIncrementLbs: "5.00",
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "exercise-9",
      name: "Incline DB Press",
      category: "compound",
      movementPattern: "push",
      primaryMuscleGroup: "chest",
      equipmentType: "dumbbell",
      defaultStartingWeightLbs: "35.00",
      defaultIncrementLbs: "5.00",
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "exercise-10",
      name: "Incline DB Curl",
      category: "accessory",
      movementPattern: "pull",
      primaryMuscleGroup: "biceps",
      equipmentType: "dumbbell",
      defaultStartingWeightLbs: "15.00",
      defaultIncrementLbs: "2.50",
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "exercise-11",
      name: "Skull Crushers",
      category: "accessory",
      movementPattern: "push",
      primaryMuscleGroup: "triceps",
      equipmentType: "barbell",
      defaultStartingWeightLbs: "35.00",
      defaultIncrementLbs: "2.50",
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "exercise-12",
      name: "Hammer Curl",
      category: "accessory",
      movementPattern: "pull",
      primaryMuscleGroup: "biceps",
      equipmentType: "dumbbell",
      defaultStartingWeightLbs: "20.00",
      defaultIncrementLbs: "2.50",
      isActive: true,
      createdAt: now,
      updatedAt: now
    }
  ]);

  await context.db.insert(workoutTemplateExerciseEntries).values([
    { id: "template-entry-2", workoutTemplateId: "template-3", exerciseId: "exercise-1", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 120, createdAt: now, updatedAt: now },
    { id: "template-entry-3", workoutTemplateId: "template-3", exerciseId: "exercise-3", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 120, createdAt: now, updatedAt: now },
    { id: "template-entry-4", workoutTemplateId: "template-3", exerciseId: "exercise-4", sequenceOrder: 3, targetSets: 2, targetReps: 8, restSeconds: 90, createdAt: now, updatedAt: now },
    { id: "template-entry-5", workoutTemplateId: "template-3", exerciseId: "exercise-5", sequenceOrder: 4, targetSets: 2, targetReps: 12, restSeconds: 75, createdAt: now, updatedAt: now },
    { id: "template-entry-6", workoutTemplateId: "template-3", exerciseId: "exercise-6", sequenceOrder: 5, targetSets: 2, targetReps: 12, restSeconds: 75, createdAt: now, updatedAt: now },
    { id: "template-entry-7", workoutTemplateId: "template-4", exerciseId: "exercise-2", sequenceOrder: 1, targetSets: 3, targetReps: 5, restSeconds: 120, createdAt: now, updatedAt: now },
    { id: "template-entry-8", workoutTemplateId: "template-4", exerciseId: "exercise-7", sequenceOrder: 2, targetSets: 2, targetReps: 8, restSeconds: 120, createdAt: now, updatedAt: now },
    { id: "template-entry-9", workoutTemplateId: "template-4", exerciseId: "exercise-8", sequenceOrder: 3, targetSets: 2, targetReps: 8, restSeconds: 90, createdAt: now, updatedAt: now },
    { id: "template-entry-10", workoutTemplateId: "template-5", exerciseId: "exercise-9", sequenceOrder: 1, targetSets: 3, targetReps: 8, restSeconds: 120, createdAt: now, updatedAt: now },
    { id: "template-entry-11", workoutTemplateId: "template-5", exerciseId: "exercise-3", sequenceOrder: 2, targetSets: 3, targetReps: 8, restSeconds: 120, createdAt: now, updatedAt: now },
    { id: "template-entry-12", workoutTemplateId: "template-5", exerciseId: "exercise-10", sequenceOrder: 3, targetSets: 3, targetReps: 10, restSeconds: 75, createdAt: now, updatedAt: now },
    { id: "template-entry-13", workoutTemplateId: "template-5", exerciseId: "exercise-11", sequenceOrder: 4, targetSets: 3, targetReps: 10, restSeconds: 75, createdAt: now, updatedAt: now },
    { id: "template-entry-14", workoutTemplateId: "template-5", exerciseId: "exercise-12", sequenceOrder: 5, targetSets: 2, targetReps: 10, restSeconds: 75, createdAt: now, updatedAt: now },
    { id: "template-entry-15", workoutTemplateId: "template-6", exerciseId: "exercise-5", sequenceOrder: 1, targetSets: 3, targetReps: 10, restSeconds: 75, createdAt: now, updatedAt: now },
    { id: "template-entry-16", workoutTemplateId: "template-6", exerciseId: "exercise-11", sequenceOrder: 2, targetSets: 3, targetReps: 10, restSeconds: 75, createdAt: now, updatedAt: now },
    { id: "template-entry-17", workoutTemplateId: "template-6", exerciseId: "exercise-12", sequenceOrder: 3, targetSets: 2, targetReps: 10, restSeconds: 75, createdAt: now, updatedAt: now }
  ]);
}

export async function seedInProgressWorkout(context: WorkoutInfrastructureTestContext, options?: {
  progressionFailures?: number;
  setStatuses?: Array<"pending" | "completed" | "failed">;
  actualReps?: number[];
  includeSecondExercise?: {
    setStatuses: Array<"pending" | "completed" | "failed">;
    actualReps?: number[];
  };
}) {
  const startedAt = new Date("2026-04-24T10:00:00.000Z");
  const completedAt = new Date("2026-04-24T10:10:00.000Z");
  const statuses = options?.setStatuses ?? ["completed", "completed", "completed"];
  const actualReps = options?.actualReps ?? [8, 8, 8];

  await context.db.insert(progressionStates).values({
    id: "progression-1",
    userId: "user-1",
    exerciseId: "exercise-1",
    currentWeightLbs: "135.00",
    lastCompletedWeightLbs: "130.00",
    consecutiveFailures: options?.progressionFailures ?? 0,
    lastEffortFeedback: "just_right",
    lastPerformedAt: new Date("2026-04-20T10:00:00.000Z"),
    createdAt: startedAt,
    updatedAt: startedAt
  });

  await context.db.insert(workoutSessions).values({
    id: "session-1",
    userId: "user-1",
    programId: "program-1",
    workoutTemplateId: "template-1",
    status: "in_progress",
    startedAt,
    completedAt: null,
    durationSeconds: null,
    isPartial: false,
    userEffortFeedback: null,
    programNameSnapshot: "3-Day Full Body Beginner",
    workoutNameSnapshot: "Workout A",
    createdAt: startedAt,
    updatedAt: startedAt
  });

  await context.db.insert(exerciseEntries).values({
    id: "entry-1",
    workoutSessionId: "session-1",
    exerciseId: "exercise-1",
    workoutTemplateExerciseEntryId: "template-entry-1",
    sequenceOrder: 1,
    targetSets: 3,
    targetReps: 8,
    targetWeightLbs: "135.00",
    restSeconds: 120,
    effortFeedback: null,
    completedAt: null,
    exerciseNameSnapshot: "Bench Press",
    exerciseCategorySnapshot: "compound",
    progressionRuleSnapshot: { incrementLbs: 5 },
    createdAt: startedAt,
    updatedAt: startedAt
  });

  await context.db.insert(sets).values(
    statuses.map((status, index) => ({
      id: `set-${index + 1}`,
      exerciseEntryId: "entry-1",
      setNumber: index + 1,
      targetReps: 8,
      actualReps: actualReps[index] ?? 8,
      targetWeightLbs: "135.00",
      actualWeightLbs: status === "pending" ? null : "135.00",
      status,
      completedAt: status === "pending" ? null : completedAt,
      createdAt: startedAt,
      updatedAt: completedAt
    }))
  );

  if (options?.includeSecondExercise) {
    const secondStatuses = options.includeSecondExercise.setStatuses;
    const secondActualReps = options.includeSecondExercise.actualReps ?? secondStatuses.map(() => 8);

    await context.db
      .insert(exercises)
      .values({
        id: "exercise-4",
        name: "DB Row",
        category: "compound",
        movementPattern: "pull",
        primaryMuscleGroup: "back",
        equipmentType: "dumbbell",
        defaultStartingWeightLbs: "35.00",
        defaultIncrementLbs: "5.00",
        isActive: true,
        createdAt: startedAt,
        updatedAt: startedAt
      })
      .onConflictDoNothing({ target: exercises.id });

    await context.db.insert(progressionStates).values({
      id: "progression-2",
      userId: "user-1",
      exerciseId: "exercise-4",
      currentWeightLbs: "50.00",
      lastCompletedWeightLbs: "45.00",
      consecutiveFailures: 0,
      lastEffortFeedback: "just_right",
      lastPerformedAt: new Date("2026-04-20T10:00:00.000Z"),
      createdAt: startedAt,
      updatedAt: startedAt
    });

    await context.db.insert(exerciseEntries).values({
      id: "entry-2",
      workoutSessionId: "session-1",
      exerciseId: "exercise-4",
      workoutTemplateExerciseEntryId: null,
      sequenceOrder: 2,
      targetSets: secondStatuses.length,
      targetReps: 8,
      targetWeightLbs: "50.00",
      restSeconds: 90,
      effortFeedback: null,
      completedAt: null,
      exerciseNameSnapshot: "DB Row",
      exerciseCategorySnapshot: "compound",
      progressionRuleSnapshot: { incrementLbs: 5 },
      createdAt: startedAt,
      updatedAt: startedAt
    });

    await context.db.insert(sets).values(
      secondStatuses.map((status, index) => ({
        id: `set-2-${index + 1}`,
        exerciseEntryId: "entry-2",
        setNumber: index + 1,
        targetReps: 8,
        actualReps: secondActualReps[index] ?? 8,
        targetWeightLbs: "50.00",
        actualWeightLbs: status === "pending" ? null : "50.00",
        status,
        completedAt: status === "pending" ? null : completedAt,
        createdAt: startedAt,
        updatedAt: completedAt
      }))
    );
  }
}

export async function countRecords(context: WorkoutInfrastructureTestContext) {
  const [sessionsResult, exerciseEntriesResult, setsResult, progressionStatesResult, progressionStatesV2Result, idempotencyResult] =
    await Promise.all([
      context.db.select().from(workoutSessions),
      context.db.select().from(exerciseEntries),
      context.db.select().from(sets),
      context.db.select().from(progressionStates),
      context.db.select().from(progressionStatesV2),
      context.db.select().from(idempotencyRecords)
    ]);

  return {
    workoutSessions: sessionsResult.length,
    exerciseEntries: exerciseEntriesResult.length,
    sets: setsResult.length,
    progressionStates: progressionStatesResult.length,
    progressionStatesV2: progressionStatesV2Result.length,
    idempotencyRecords: idempotencyResult.length
  };
}

export {
  exercises,
  idempotencyRecords,
  progressMetrics,
  progressionRecommendationEvents,
  progressionStates,
  progressionStatesV2,
  sets,
  userProgramEnrollments,
  users,
  workoutTemplateExerciseEntries,
  workoutTemplates,
  workoutSessions
};
