export const unitSystems = ["imperial", "metric"] as const;
export type UnitSystem = (typeof unitSystems)[number];

export const experienceLevels = ["beginner", "intermediate", "advanced"] as const;
export type ExperienceLevel = (typeof experienceLevels)[number];

export const exerciseCategories = ["compound", "accessory"] as const;
export type ExerciseCategory = (typeof exerciseCategories)[number];

export const movementPatterns = [
  "push",
  "pull",
  "squat",
  "hinge",
  "lunge",
  "carry",
  "core"
] as const;
export type MovementPattern = (typeof movementPatterns)[number];

export const equipmentTypes = ["barbell", "dumbbell", "machine", "bodyweight", "cable"] as const;
export type EquipmentType = (typeof equipmentTypes)[number];

export const difficultyLevels = ["beginner", "intermediate", "advanced"] as const;
export type DifficultyLevel = (typeof difficultyLevels)[number];

export const programSources = ["predefined", "custom"] as const;
export type ProgramSource = (typeof programSources)[number];

export const programTrainingContextSources = ["manual", "predefined", "guided"] as const;
export type ProgramTrainingContextSource = (typeof programTrainingContextSources)[number];

export const enrollmentStatuses = ["active", "paused", "completed", "cancelled"] as const;
export type EnrollmentStatus = (typeof enrollmentStatuses)[number];

export const workoutSessionStatuses = ["planned", "in_progress", "completed", "abandoned"] as const;
export type WorkoutSessionStatus = (typeof workoutSessionStatuses)[number];

export const effortFeedbackValues = ["too_easy", "just_right", "too_hard"] as const;
export type EffortFeedback = (typeof effortFeedbackValues)[number];

export const setStatuses = ["pending", "completed", "skipped", "failed"] as const;
export type SetStatus = (typeof setStatuses)[number];

export const progressMetricTypes = [
  "weight_increase",
  "personal_best",
  "workout_completed",
  "weekly_workout_count",
  "completion_streak",
  "volume_increase"
] as const;
export type ProgressMetricType = (typeof progressMetricTypes)[number];

export const progressionResults = ["increased", "repeated", "reduced", "recalibrated", "skipped"] as const;
export type ProgressionResult = (typeof progressionResults)[number];

export const progressionConfidenceLevels = ["low", "medium", "high"] as const;
export type ProgressionConfidence = (typeof progressionConfidenceLevels)[number];

export const progressionAggressivenessLevels = ["conservative", "balanced", "aggressive"] as const;
export type ProgressionAggressiveness = (typeof progressionAggressivenessLevels)[number];

export const progressionStrategies = [
  "fixed_weight",
  "double_progression",
  "bodyweight_reps",
  "bodyweight_weighted",
  "no_progression"
] as const;
export type ProgressionStrategy = (typeof progressionStrategies)[number];

export const bodyweightProgressionModes = ["auto", "reps", "weighted"] as const;
export type BodyweightProgressionMode = (typeof bodyweightProgressionModes)[number];

export const trainingGoals = [
  "strength",
  "hypertrophy",
  "general_fitness",
  "endurance",
  "maintenance"
] as const;
export type TrainingGoal = (typeof trainingGoals)[number];

export const guidedGoalTypes = [
  "hypertrophy",
  "strength",
  "general_fitness",
  "consistency",
  "sport_support",
  "custom"
] as const;
export type GuidedGoalType = (typeof guidedGoalTypes)[number];

export const guidedEquipmentAccessLevels = [
  "full_gym",
  "barbell_rack",
  "dumbbells",
  "machines_cables",
  "bodyweight_only",
  "home_gym"
] as const;
export type GuidedEquipmentAccessLevel = (typeof guidedEquipmentAccessLevels)[number];

export const guidedRecoveryPreferences = [
  "adjust_when_needed",
  "small_adjustments_only",
  "keep_fixed"
] as const;
export type GuidedRecoveryPreference = (typeof guidedRecoveryPreferences)[number];

export const recoveryStates = ["fresh", "normal", "fatigued", "exhausted"] as const;
export type RecoveryState = (typeof recoveryStates)[number];
