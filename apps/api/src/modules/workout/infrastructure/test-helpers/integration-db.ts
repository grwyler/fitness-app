import {
  exerciseEntries,
  exercises,
  idempotencyRecords,
  progressMetrics,
  progressionStates,
  programs,
  sets,
  userProgramEnrollments,
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
import { DrizzleWorkoutSessionRepository } from "../repositories/drizzle-workout-session.repository.js";

const schemaSql = `
create table users (
  id text primary key,
  auth_provider_id text not null unique,
  email text not null unique,
  password_hash text,
  display_name text,
  timezone text not null default 'America/New_York',
  unit_system text not null default 'imperial',
  experience_level text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table exercises (
  id text primary key,
  name text not null unique,
  category text not null,
  movement_pattern text,
  primary_muscle_group text,
  equipment_type text,
  default_starting_weight_lbs numeric(6,2) not null,
  default_increment_lbs numeric(5,2) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table programs (
  id text primary key,
  name text not null,
  description text,
  days_per_week integer not null,
  session_duration_minutes integer not null,
  difficulty_level text not null,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workout_templates (
  id text primary key,
  program_id text not null references programs(id),
  name text not null,
  sequence_order integer not null,
  estimated_duration_minutes integer,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index idx_workout_templates_program_sequence on workout_templates(program_id, sequence_order);

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
  rest_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index idx_workout_template_entry_sequence on workout_template_exercise_entries(workout_template_id, sequence_order);

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
`;

export type WorkoutInfrastructureTestContext = {
  db: PgliteDatabase;
  client: { exec: (sql: string) => Promise<unknown>; close?: () => Promise<void> };
  transactionManager: DrizzleTransactionManager;
  repositories: {
    workoutSessionRepository: DrizzleWorkoutSessionRepository;
    enrollmentRepository: DrizzleEnrollmentRepository;
    progressionStateRepository: DrizzleProgressionStateRepository;
    exerciseRepository: DrizzleExerciseRepository;
    progressMetricRepository: DrizzleProgressMetricRepository;
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
      progressionStateRepository: new DrizzleProgressionStateRepository(db),
      exerciseRepository: new DrizzleExerciseRepository(db),
      progressMetricRepository: new DrizzleProgressMetricRepository(db),
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
    name: "Beginner Full Body V1",
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
    programNameSnapshot: "Beginner Full Body V1",
    workoutNameSnapshot: "Workout A",
    createdAt: startedAt,
    updatedAt: startedAt
  });

  await context.db.insert(exerciseEntries).values({
    id: "entry-1",
    workoutSessionId: "session-1",
    exerciseId: "exercise-1",
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
}

export async function countRecords(context: WorkoutInfrastructureTestContext) {
  const [sessionsResult, exerciseEntriesResult, setsResult, progressionStatesResult, idempotencyResult] =
    await Promise.all([
      context.db.select().from(workoutSessions),
      context.db.select().from(exerciseEntries),
      context.db.select().from(sets),
      context.db.select().from(progressionStates),
      context.db.select().from(idempotencyRecords)
    ]);

  return {
    workoutSessions: sessionsResult.length,
    exerciseEntries: exerciseEntriesResult.length,
    sets: setsResult.length,
    progressionStates: progressionStatesResult.length,
    idempotencyRecords: idempotencyResult.length
  };
}

export {
  idempotencyRecords,
  progressMetrics,
  progressionStates,
  userProgramEnrollments,
  workoutSessions
};
