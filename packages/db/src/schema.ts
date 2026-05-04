import { sql } from "drizzle-orm";
import type { ExperienceLevel, PredefinedWorkoutCategory } from "@fitness/shared";
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
  programTrainingContextSources,
  progressMetricTypes,
  progressionStrategies,
  progressionAggressivenessLevels,
  recoveryStates,
  setStatuses,
  trainingGoals,
  unitSystems,
  bodyweightProgressionModes,
  progressionConfidenceLevels,
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
const progressionStrategyEnum = pgEnum("progression_strategy", progressionStrategies);
const progressionAggressivenessEnum = pgEnum("progression_aggressiveness", progressionAggressivenessLevels);
const programSourceEnum = pgEnum("program_source", programSources);
const programTrainingContextSourceEnum = pgEnum(
  "program_training_context_source",
  programTrainingContextSources
);
const trainingGoalEnum = pgEnum("training_goal", trainingGoals);
const recoveryStateEnum = pgEnum("recovery_state", recoveryStates);
const idempotencyStatusEnum = pgEnum("idempotency_status", ["pending", "completed"]);
const progressionConfidenceEnum = pgEnum("progression_confidence", progressionConfidenceLevels);
const bodyweightProgressionModeEnum = pgEnum("bodyweight_progression_mode", bodyweightProgressionModes);
const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

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
    tokensInvalidBefore: timestamp("tokens_invalid_before", { withTimezone: true }),
    displayName: text("display_name"),
    role: userRoleEnum("role").notNull().default("user"),
    timezone: text("timezone").notNull().default("America/New_York"),
    unitSystem: unitSystemEnum("unit_system").notNull().default("imperial"),
    experienceLevel: difficultyLevelEnum("experience_level"),
    trainingGoal: trainingGoalEnum("training_goal"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    authProviderIdUnique: uniqueIndex("idx_users_auth_provider_id").on(table.authProviderId),
    emailUnique: uniqueIndex("idx_users_email").on(table.email)
  })
);

export const userTrainingSettings = pgTable(
  "user_training_settings",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id),
    progressionAggressiveness: progressionAggressivenessEnum("progression_aggressiveness")
      .notNull()
      .default("balanced"),
    defaultBarbellIncrementLbs: numeric("default_barbell_increment_lbs", { precision: 5, scale: 2 })
      .notNull()
      .default("5"),
    defaultDumbbellIncrementLbs: numeric("default_dumbbell_increment_lbs", { precision: 5, scale: 2 })
      .notNull()
      .default("5"),
    defaultMachineIncrementLbs: numeric("default_machine_increment_lbs", { precision: 5, scale: 2 })
      .notNull()
      .default("10"),
    defaultCableIncrementLbs: numeric("default_cable_increment_lbs", { precision: 5, scale: 2 })
      .notNull()
      .default("5"),
    useRecoveryAdjustments: boolean("use_recovery_adjustments").notNull().default(true),
    defaultRecoveryState: recoveryStateEnum("default_recovery_state").notNull().default("normal"),
    allowAutoDeload: boolean("allow_auto_deload").notNull().default(true),
    allowRecalibration: boolean("allow_recalibration").notNull().default(true),
    preferRepProgressionBeforeWeight: boolean("prefer_rep_progression_before_weight").notNull().default(true),
    minimumConfidenceForIncrease: progressionConfidenceEnum("minimum_confidence_for_increase")
      .notNull()
      .default("medium"),
    ...timestamps
  },
  (table) => ({
    userIdIndex: index("idx_user_training_settings_user_id").on(table.userId)
  })
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("idx_password_reset_tokens_token_hash").on(table.tokenHash),
    userIndex: index("idx_password_reset_tokens_user_id").on(table.userId),
    expiresIndex: index("idx_password_reset_tokens_expires_at").on(table.expiresAt)
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
    defaultTargetSets: integer("default_target_sets"),
    defaultTargetReps: integer("default_target_reps"),
    defaultStartingWeightLbs: numeric("default_starting_weight_lbs", { precision: 6, scale: 2 }).notNull(),
    defaultIncrementLbs: numeric("default_increment_lbs", { precision: 5, scale: 2 }).notNull(),
    isBodyweight: boolean("is_bodyweight").notNull().default(false),
    isWeightOptional: boolean("is_weight_optional").notNull().default(false),
    isProgressionEligible: boolean("is_progression_eligible").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps
  },
  (table) => ({
    nameUnique: uniqueIndex("idx_exercises_name").on(table.name),
    categoryIndex: index("idx_exercises_category").on(table.category),
    validDefaultTargetSets: check(
      "chk_exercises_default_target_sets_positive",
      sql`${table.defaultTargetSets} is null or ${table.defaultTargetSets} > 0`
    ),
    validDefaultTargetReps: check(
      "chk_exercises_default_target_reps_positive",
      sql`${table.defaultTargetReps} is null or ${table.defaultTargetReps} > 0`
    ),
    positiveStartingWeight: check(
      "chk_exercises_default_starting_weight_nonnegative",
      sql`${table.defaultStartingWeightLbs} >= 0`
    ),
    positiveIncrement: check("chk_exercises_default_increment_positive", sql`${table.defaultIncrementLbs} > 0`)
  })
);

export const userExerciseProgressionSettings = pgTable(
  "user_exercise_progression_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    exerciseId: uuid("exercise_id").notNull().references(() => exercises.id),
    progressionStrategy: progressionStrategyEnum("progression_strategy"),
    repRangeMin: integer("rep_range_min"),
    repRangeMax: integer("rep_range_max"),
    incrementOverrideLbs: numeric("increment_override_lbs", { precision: 5, scale: 2 }),
    maxJumpPerSessionLbs: numeric("max_jump_per_session_lbs", { precision: 6, scale: 2 }),
    bodyweightProgressionMode: bodyweightProgressionModeEnum("bodyweight_progression_mode"),
    ...timestamps
  },
  (table) => ({
    userExerciseUnique: uniqueIndex("idx_user_exercise_progression_unique").on(table.userId, table.exerciseId),
    userIndex: index("idx_user_exercise_progression_user_id").on(table.userId),
    exerciseIndex: index("idx_user_exercise_progression_exercise_id").on(table.exerciseId),
    repRangeValid: check(
      "chk_user_exercise_progression_rep_range_valid",
      sql`(
        (${table.repRangeMin} is null and ${table.repRangeMax} is null)
        or (
          ${table.repRangeMin} is not null
          and ${table.repRangeMax} is not null
          and ${table.repRangeMin} > 0
          and ${table.repRangeMax} >= ${table.repRangeMin}
        )
      )`
    ),
    maxJumpPositive: check(
      "chk_user_exercise_progression_max_jump_positive",
      sql`${table.maxJumpPerSessionLbs} is null or ${table.maxJumpPerSessionLbs} > 0`
    ),
    incrementPositive: check(
      "chk_user_exercise_progression_increment_positive",
      sql`${table.incrementOverrideLbs} is null or ${table.incrementOverrideLbs} > 0`
    )
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
    trainingGoal: trainingGoalEnum("training_goal"),
    metadata: jsonb("metadata"),
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
    category: text("category").$type<PredefinedWorkoutCategory>().notNull().default("Full Body"),
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

export const programTrainingContexts = pgTable(
  "program_training_contexts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    programId: uuid("program_id").notNull().references(() => programs.id),
    enrollmentId: uuid("enrollment_id").references(() => userProgramEnrollments.id),
    source: programTrainingContextSourceEnum("source").notNull(),
    goalType: trainingGoalEnum("goal_type"),
    experienceLevel: difficultyLevelEnum("experience_level").$type<ExperienceLevel>(),
    progressionPreferencesSnapshot: jsonb("progression_preferences_snapshot").notNull(),
    recoveryPreferencesSnapshot: jsonb("recovery_preferences_snapshot").notNull(),
    equipmentSettingsSnapshot: jsonb("equipment_settings_snapshot").notNull(),
    exerciseProgressionSettingsSnapshot: jsonb("exercise_progression_settings_snapshot").notNull(),
    guidedAnswersSnapshot: jsonb("guided_answers_snapshot"),
    guidedRecommendationSnapshot: jsonb("guided_recommendation_snapshot"),
    coachingEnabled: boolean("coaching_enabled").notNull().default(false),
    ...timestamps
  },
  (table) => ({
    userIndex: index("idx_program_training_contexts_user_id").on(table.userId),
    programIndex: index("idx_program_training_contexts_program_id").on(table.programId),
    enrollmentIndex: index("idx_program_training_contexts_enrollment_id").on(table.enrollmentId),
    userProgramIndex: index("idx_program_training_contexts_user_program").on(table.userId, table.programId)
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
    repRangeMin: integer("rep_range_min"),
    repRangeMax: integer("rep_range_max"),
    restSeconds: integer("rest_seconds"),
    progressionStrategy: progressionStrategyEnum("progression_strategy"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    templateSequenceUnique: uniqueIndex("idx_workout_template_entry_sequence").on(
      table.workoutTemplateId,
      table.sequenceOrder
    ),
    positiveSets: check("chk_workout_template_target_sets", sql`${table.targetSets} > 0`),
    positiveReps: check("chk_workout_template_target_reps", sql`${table.targetReps} > 0`),
    validRepRange: check(
      "chk_workout_template_rep_range_valid",
      sql`(
        (${table.repRangeMin} is null and ${table.repRangeMax} is null)
        or (
          ${table.repRangeMin} is not null
          and ${table.repRangeMax} is not null
          and ${table.repRangeMin} > 0
          and ${table.repRangeMax} >= ${table.repRangeMin}
          and ${table.targetReps} between ${table.repRangeMin} and ${table.repRangeMax}
        )
      )`
    )
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
    recoveryState: recoveryStateEnum("recovery_state"),
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
    workoutTemplateExerciseEntryId: uuid("workout_template_exercise_entry_id").references(
      () => workoutTemplateExerciseEntries.id
    ),
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
    templateEntryIndex: index("idx_exercise_entries_template_entry_id").on(
      table.workoutTemplateExerciseEntryId
    ),
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

export const progressionStatesV2 = pgTable(
  "progression_states_v2",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    workoutTemplateExerciseEntryId: uuid("workout_template_exercise_entry_id")
      .notNull()
      .references(() => workoutTemplateExerciseEntries.id),
    currentWeightLbs: numeric("current_weight_lbs", { precision: 6, scale: 2 }).notNull(),
    lastCompletedWeightLbs: numeric("last_completed_weight_lbs", { precision: 6, scale: 2 }),
    repGoal: integer("rep_goal").notNull(),
    repRangeMin: integer("rep_range_min").notNull(),
    repRangeMax: integer("rep_range_max").notNull(),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    lastEffortFeedback: effortFeedbackEnum("last_effort_feedback"),
    lastPerformedAt: timestamp("last_performed_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    userTemplateEntryUnique: uniqueIndex("idx_progression_states_v2_user_template_entry").on(
      table.userId,
      table.workoutTemplateExerciseEntryId
    ),
    userIndex: index("idx_progression_states_v2_user_id").on(table.userId),
    templateEntryIndex: index("idx_progression_states_v2_template_entry_id").on(
      table.workoutTemplateExerciseEntryId
    ),
    validCurrentWeight: check(
      "chk_progression_states_v2_current_weight",
      sql`${table.currentWeightLbs} >= 0`
    ),
    validRepRangeMin: check("chk_progression_states_v2_rep_range_min", sql`${table.repRangeMin} > 0`),
    validRepRangeMax: check(
      "chk_progression_states_v2_rep_range_max",
      sql`${table.repRangeMax} >= ${table.repRangeMin}`
    ),
    validRepGoal: check(
      "chk_progression_states_v2_rep_goal",
      sql`${table.repGoal} between ${table.repRangeMin} and ${table.repRangeMax}`
    ),
    validFailureCount: check(
      "chk_progression_states_v2_consecutive_failures",
      sql`${table.consecutiveFailures} >= 0`
    )
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

export const progressionRecommendationEvents = pgTable(
  "progression_recommendation_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    exerciseId: uuid("exercise_id").references(() => exercises.id),
    workoutTemplateExerciseEntryId: uuid("workout_template_exercise_entry_id").references(
      () => workoutTemplateExerciseEntries.id
    ),
    workoutSessionId: uuid("workout_session_id").notNull().references(() => workoutSessions.id),
    exerciseEntryId: uuid("exercise_entry_id").notNull().references(() => exerciseEntries.id),
    previousWeightLbs: numeric("previous_weight_lbs", { precision: 6, scale: 2 }).notNull(),
    nextWeightLbs: numeric("next_weight_lbs", { precision: 6, scale: 2 }).notNull(),
    previousRepGoal: integer("previous_rep_goal"),
    nextRepGoal: integer("next_rep_goal"),
    result: text("result").notNull(),
    reason: text("reason").notNull(),
    confidence: text("confidence").notNull(),
    reasonCodes: jsonb("reason_codes").notNull(),
    evidence: jsonb("evidence").notNull(),
    inputSnapshot: jsonb("input_snapshot").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIndex: index("idx_progression_recommendation_events_user_id").on(table.userId),
    sessionIndex: index("idx_progression_recommendation_events_session_id").on(table.workoutSessionId),
    exerciseIndex: index("idx_progression_recommendation_events_exercise_id").on(table.exerciseId),
    templateEntryIndex: index("idx_progression_recommendation_events_template_entry_id").on(
      table.workoutTemplateExerciseEntryId
    )
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

export const feedbackEntries = pgTable(
  "feedback_entries",
  {
    id: text("id").primaryKey(),
    reporterUserId: uuid("reporter_user_id").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    severity: text("severity").notNull(),
    priority: text("priority").notNull(),
    context: jsonb("context").notNull()
  },
  (table) => ({
    reporterIndex: index("idx_feedback_entries_reporter_user_id").on(table.reporterUserId),
    createdAtIndex: index("idx_feedback_entries_created_at").on(table.createdAt)
  })
);

export const schema = {
  users,
  passwordResetTokens,
  exercises,
  programs,
  workoutTemplates,
  userProgramEnrollments,
  workoutTemplateExerciseEntries,
  workoutSessions,
  exerciseEntries,
  sets,
  progressionStates,
  progressionStatesV2,
  progressMetrics,
  progressionRecommendationEvents,
  idempotencyRecords,
  feedbackEntries
};
