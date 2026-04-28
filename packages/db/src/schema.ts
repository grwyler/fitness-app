import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import {
  difficultyLevels,
  effortFeedbackValues,
  enrollmentStatuses,
  exerciseCategories,
  programSources,
  progressMetricTypes,
  setStatuses,
  unitSystems,
  workoutSessionStatuses
} from "@fitness/shared";

const unitSystemEnum = pgEnum("unit_system", unitSystems);
const difficultyLevelEnum = pgEnum("difficulty_level", difficultyLevels);
const exerciseCategoryEnum = pgEnum("exercise_category", exerciseCategories);
const enrollmentStatusEnum = pgEnum("program_enrollment_status", enrollmentStatuses);
const workoutSessionStatusEnum = pgEnum("workout_session_status", workoutSessionStatuses);
const effortFeedbackEnum = pgEnum("effort_feedback", effortFeedbackValues);
const setStatusEnum = pgEnum("set_status", setStatuses);
const progressMetricTypeEnum = pgEnum("progress_metric_type", progressMetricTypes);
const programSourceEnum = pgEnum("program_source", programSources);
const idempotencyStatusEnum = pgEnum("idempotency_status", ["pending", "completed"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authProviderId: text("auth_provider_id").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    displayName: text("display_name"),
    timezone: text("timezone").notNull().default("America/New_York"),
    unitSystem: unitSystemEnum("unit_system").notNull().default("imperial"),
    experienceLevel: difficultyLevelEnum("experience_level"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    authProviderIdUnique: uniqueIndex("idx_users_auth_provider_id").on(table.authProviderId),
    emailUnique: uniqueIndex("idx_users_email").on(table.email)
  })
);

export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    category: exerciseCategoryEnum("category").notNull(),
    movementPattern: text("movement_pattern"),
    primaryMuscleGroup: text("primary_muscle_group"),
    equipmentType: text("equipment_type"),
    defaultStartingWeightLbs: numeric("default_starting_weight_lbs", { precision: 6, scale: 2 }).notNull(),
    defaultIncrementLbs: numeric("default_increment_lbs", { precision: 5, scale: 2 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps
  },
  (table) => ({
    nameUnique: uniqueIndex("idx_exercises_name").on(table.name),
    categoryIndex: index("idx_exercises_category").on(table.category),
    positiveStartingWeight: check(
      "chk_exercises_default_starting_weight_nonnegative",
      sql`${table.defaultStartingWeightLbs} >= 0`
    ),
    positiveIncrement: check("chk_exercises_default_increment_positive", sql`${table.defaultIncrementLbs} > 0`)
  })
);

export const programs = pgTable(
  "programs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id),
    source: programSourceEnum("source").notNull().default("predefined"),
    name: text("name").notNull(),
    description: text("description"),
    daysPerWeek: integer("days_per_week").notNull(),
    sessionDurationMinutes: integer("session_duration_minutes").notNull(),
    difficultyLevel: difficultyLevelEnum("difficulty_level").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    activeIndex: index("idx_programs_is_active").on(table.isActive),
    userSourceIndex: index("idx_programs_user_source").on(table.userId, table.source),
    validDays: check("chk_programs_days_per_week", sql`${table.daysPerWeek} between 1 and 7`),
    validDuration: check("chk_programs_session_duration_minutes", sql`${table.sessionDurationMinutes} > 0`)
  })
);

export const workoutTemplates = pgTable(
  "workout_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    programId: uuid("program_id").notNull().references(() => programs.id),
    name: text("name").notNull(),
    sequenceOrder: integer("sequence_order").notNull(),
    estimatedDurationMinutes: integer("estimated_duration_minutes"),
    isActive: boolean("is_active").notNull().default(true),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    programIndex: index("idx_workout_templates_program_id").on(table.programId),
    sequenceUnique: uniqueIndex("idx_workout_templates_program_sequence").on(
      table.programId,
      table.sequenceOrder
    )
  })
);

export const userProgramEnrollments = pgTable(
  "user_program_enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    programId: uuid("program_id").notNull().references(() => programs.id),
    status: enrollmentStatusEnum("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    currentWorkoutTemplateId: uuid("current_workout_template_id").references(() => workoutTemplates.id),
    ...timestamps
  },
  (table) => ({
    userIndex: index("idx_user_program_enrollments_user_id").on(table.userId),
    statusIndex: index("idx_user_program_enrollments_status").on(table.status),
    oneActiveEnrollmentPerUser: uniqueIndex("idx_one_active_program_per_user")
      .on(table.userId)
      .where(sql`${table.status} = 'active'`)
  })
);

export const workoutTemplateExerciseEntries = pgTable(
  "workout_template_exercise_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workoutTemplateId: uuid("workout_template_id").notNull().references(() => workoutTemplates.id),
    exerciseId: uuid("exercise_id").notNull().references(() => exercises.id),
    sequenceOrder: integer("sequence_order").notNull(),
    targetSets: integer("target_sets").notNull(),
    targetReps: integer("target_reps").notNull(),
    restSeconds: integer("rest_seconds"),
    ...timestamps
  },
  (table) => ({
    templateSequenceUnique: uniqueIndex("idx_workout_template_entry_sequence").on(
      table.workoutTemplateId,
      table.sequenceOrder
    ),
    positiveSets: check("chk_workout_template_target_sets", sql`${table.targetSets} > 0`),
    positiveReps: check("chk_workout_template_target_reps", sql`${table.targetReps} > 0`)
  })
);

export const workoutSessions = pgTable(
  "workout_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    programId: uuid("program_id").notNull().references(() => programs.id),
    workoutTemplateId: uuid("workout_template_id").notNull().references(() => workoutTemplates.id),
    status: workoutSessionStatusEnum("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds"),
    isPartial: boolean("is_partial").notNull().default(false),
    userEffortFeedback: effortFeedbackEnum("user_effort_feedback"),
    programNameSnapshot: text("program_name_snapshot").notNull(),
    workoutNameSnapshot: text("workout_name_snapshot").notNull(),
    ...timestamps
  },
  (table) => ({
    userIndex: index("idx_workout_sessions_user_id").on(table.userId),
    userStartedIndex: index("idx_workout_sessions_user_started_at").on(table.userId, table.startedAt),
    statusIndex: index("idx_workout_sessions_status").on(table.status),
    oneInProgressPerUser: uniqueIndex("idx_one_in_progress_workout_per_user")
      .on(table.userId)
      .where(sql`${table.status} = 'in_progress'`),
    validDuration: check("chk_workout_sessions_duration_seconds", sql`${table.durationSeconds} is null or ${table.durationSeconds} > 0`)
  })
);

export const exerciseEntries = pgTable(
  "exercise_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workoutSessionId: uuid("workout_session_id").notNull().references(() => workoutSessions.id),
    exerciseId: uuid("exercise_id").notNull().references(() => exercises.id),
    sequenceOrder: integer("sequence_order").notNull(),
    targetSets: integer("target_sets").notNull(),
    targetReps: integer("target_reps").notNull(),
    targetWeightLbs: numeric("target_weight_lbs", { precision: 6, scale: 2 }).notNull(),
    restSeconds: integer("rest_seconds"),
    effortFeedback: effortFeedbackEnum("effort_feedback"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    exerciseNameSnapshot: text("exercise_name_snapshot").notNull(),
    exerciseCategorySnapshot: exerciseCategoryEnum("exercise_category_snapshot").notNull(),
    progressionRuleSnapshot: jsonb("progression_rule_snapshot"),
    ...timestamps
  },
  (table) => ({
    sessionIndex: index("idx_exercise_entries_workout_session_id").on(table.workoutSessionId),
    exerciseIndex: index("idx_exercise_entries_exercise_id").on(table.exerciseId),
    sessionSequenceUnique: uniqueIndex("idx_exercise_entries_session_sequence").on(
      table.workoutSessionId,
      table.sequenceOrder
    ),
    positiveSets: check("chk_exercise_entries_target_sets", sql`${table.targetSets} > 0`),
    positiveReps: check("chk_exercise_entries_target_reps", sql`${table.targetReps} > 0`),
    validWeight: check("chk_exercise_entries_target_weight", sql`${table.targetWeightLbs} >= 0`)
  })
);

export const sets = pgTable(
  "sets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    exerciseEntryId: uuid("exercise_entry_id").notNull().references(() => exerciseEntries.id),
    setNumber: integer("set_number").notNull(),
    targetReps: integer("target_reps").notNull(),
    actualReps: integer("actual_reps"),
    targetWeightLbs: numeric("target_weight_lbs", { precision: 6, scale: 2 }).notNull(),
    actualWeightLbs: numeric("actual_weight_lbs", { precision: 6, scale: 2 }),
    status: setStatusEnum("status").notNull().default("pending"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    entryIndex: index("idx_sets_exercise_entry_id").on(table.exerciseEntryId),
    entrySetNumberUnique: uniqueIndex("idx_sets_entry_set_number").on(table.exerciseEntryId, table.setNumber),
    positiveTargetReps: check("chk_sets_target_reps", sql`${table.targetReps} > 0`),
    validActualReps: check("chk_sets_actual_reps", sql`${table.actualReps} is null or ${table.actualReps} >= 0`),
    validTargetWeight: check("chk_sets_target_weight", sql`${table.targetWeightLbs} >= 0`),
    validActualWeight: check("chk_sets_actual_weight", sql`${table.actualWeightLbs} is null or ${table.actualWeightLbs} >= 0`)
  })
);

export const progressionStates = pgTable(
  "progression_states",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    exerciseId: uuid("exercise_id").notNull().references(() => exercises.id),
    currentWeightLbs: numeric("current_weight_lbs", { precision: 6, scale: 2 }).notNull(),
    lastCompletedWeightLbs: numeric("last_completed_weight_lbs", { precision: 6, scale: 2 }),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    lastEffortFeedback: effortFeedbackEnum("last_effort_feedback"),
    lastPerformedAt: timestamp("last_performed_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    userExerciseUnique: uniqueIndex("idx_progression_states_user_exercise").on(table.userId, table.exerciseId),
    userIndex: index("idx_progression_states_user_id").on(table.userId),
    validCurrentWeight: check("chk_progression_states_current_weight", sql`${table.currentWeightLbs} >= 0`),
    validFailureCount: check("chk_progression_states_consecutive_failures", sql`${table.consecutiveFailures} >= 0`)
  })
);

export const progressMetrics = pgTable(
  "progress_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    exerciseId: uuid("exercise_id").references(() => exercises.id),
    workoutSessionId: uuid("workout_session_id").references(() => workoutSessions.id),
    metricType: progressMetricTypeEnum("metric_type").notNull(),
    metricValue: numeric("metric_value", { precision: 8, scale: 2 }),
    displayText: text("display_text").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userRecordedIndex: index("idx_progress_metrics_user_recorded_at").on(table.userId, table.recordedAt),
    userMetricTypeIndex: index("idx_progress_metrics_user_metric_type").on(table.userId, table.metricType),
    exerciseIndex: index("idx_progress_metrics_exercise_id").on(table.exerciseId)
  })
);

export const idempotencyRecords = pgTable(
  "idempotency_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    key: text("key").notNull(),
    routeFamily: text("route_family").notNull(),
    targetResourceId: text("target_resource_id").notNull().default(""),
    requestFingerprint: text("request_fingerprint").notNull(),
    status: idempotencyStatusEnum("status").notNull(),
    responseStatusCode: integer("response_status_code"),
    responseBody: text("response_body"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    scopeUnique: uniqueIndex("idx_idempotency_scope").on(
      table.userId,
      table.key,
      table.routeFamily,
      table.targetResourceId
    ),
    statusIndex: index("idx_idempotency_status").on(table.status)
  })
);

export const schema = {
  users,
  exercises,
  programs,
  workoutTemplates,
  userProgramEnrollments,
  workoutTemplateExerciseEntries,
  workoutSessions,
  exerciseEntries,
  sets,
  progressionStates,
  progressMetrics,
  idempotencyRecords
};
