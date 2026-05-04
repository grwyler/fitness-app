import { z } from "zod";
import {
  bodyweightProgressionModes,
  effortFeedbackValues,
  progressionAggressivenessLevels,
  progressionConfidenceLevels,
  progressionStrategies,
  recoveryStates,
  trainingGoals,
  unitSystems,
  experienceLevels,
  guidedEquipmentAccessLevels,
  guidedGoalTypes,
  guidedRecoveryPreferences,
  guidedScheduleFlexibilities,
  guidedSessionDurationFlexibilities,
  guidedTrainingStylePreferences,
  guidedFocusAreas,
  guidedBusyWeekPreferences,
  guidedRecoveryTolerances,
  guidedEquipmentTypes
} from "@fitness/shared";

const weightValueSchema = z.object({
  value: z.number().finite().min(0),
  unit: z.literal("lb")
});

const isoDateTimeSchema = z.string().datetime({ offset: true });

export const workoutHeadersSchema = z.object({
  authorization: z.string().min(1).optional(),
  "idempotency-key": z.string().min(1).optional()
});

export const workoutSessionParamsSchema = z.object({
  sessionId: z.string().min(1)
});

export const workoutSessionExerciseParamsSchema = z.object({
  sessionId: z.string().min(1),
  exerciseEntryId: z.string().min(1)
});

export const programParamsSchema = z.object({
  programId: z.string().min(1)
});

const guidedProgramAnswersV1Schema = z.object({
  goal: z.enum(guidedGoalTypes),
  experienceLevel: z.enum(experienceLevels),
  daysPerWeek: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
  sessionDurationMinutes: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(75)]),
  equipmentAccess: z.enum(guidedEquipmentAccessLevels),
  progressionAggressiveness: z.enum(progressionAggressivenessLevels),
  recoveryPreference: z.enum(guidedRecoveryPreferences)
});

const guidedProgramAnswersV2Schema = z.object({
  version: z.literal(2),
  intakeDepth: z.enum(["core", "refined"]),
  goal: z.enum(guidedGoalTypes),
  experienceLevel: z.enum(experienceLevels),
  schedule: z.object({
    daysPerWeek: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
    flexibility: z.enum(guidedScheduleFlexibilities)
  }),
  sessions: z.object({
    durationMinutes: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(75)]),
    flexibility: z.enum(guidedSessionDurationFlexibilities)
  }),
  equipment: z.object({
    access: z.enum(guidedEquipmentAccessLevels),
    avoid: z.array(z.enum(guidedEquipmentTypes)).max(5).optional()
  }),
  preferences: z.object({
    progressionAggressiveness: z.enum(progressionAggressivenessLevels),
    recoveryPreference: z.enum(guidedRecoveryPreferences),
    trainingStylePreference: z.enum(guidedTrainingStylePreferences).optional(),
    focusAreas: z.array(z.enum(guidedFocusAreas)).max(3).optional(),
    busyWeekPreference: z.enum(guidedBusyWeekPreferences).optional(),
    recoveryTolerance: z.enum(guidedRecoveryTolerances).optional(),
    exerciseExclusions: z.string().max(400).nullable().optional()
  })
});

export const recommendGuidedProgramBodySchema = z.object({
  answers: z.union([guidedProgramAnswersV1Schema, guidedProgramAnswersV2Schema])
});

export const followProgramBodySchema = z
  .object({
    activationSource: z.literal("guided").optional(),
    guidedAnswers: recommendGuidedProgramBodySchema.shape.answers.optional(),
    guidedRecommendation: z
      .object({
        reasons: z.array(z.string().min(1)).default([]),
        warnings: z.array(z.string()).default([]),
        isExactMatch: z.boolean()
      })
      .optional()
  })
  .superRefine((value, ctx) => {
    if (!value) {
      return;
    }

    if (value.activationSource === "guided" && !value.guidedAnswers) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "guidedAnswers is required when activationSource is guided."
      });
    }
  })
  .optional();

const createCustomProgramExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  workoutTemplateExerciseEntryId: z.string().min(1).optional(),
  targetSets: z.number().int().min(1).max(20),
  targetReps: z.number().int().min(1).max(100),
  repRangeMin: z.number().int().min(1).max(100).nullable().optional(),
  repRangeMax: z.number().int().min(1).max(100).nullable().optional(),
  restSeconds: z.number().int().min(0).max(1800).nullable().optional(),
  progressionStrategy: z.enum(progressionStrategies).nullable().optional()
}).superRefine((value, ctx) => {
  const min = value.repRangeMin ?? null;
  const max = value.repRangeMax ?? null;

  if (min === null && max === null) {
    return;
  }

  if (min === null || max === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "repRangeMin and repRangeMax must both be provided when using a rep range."
    });
    return;
  }

  if (max < min) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "repRangeMax must be greater than or equal to repRangeMin."
    });
  }

  if (value.targetReps < min || value.targetReps > max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "targetReps must be within the rep range."
    });
  }
});

const createCustomProgramWorkoutSchema = z.object({
  name: z.string().trim().min(1).max(80),
  exercises: z.array(createCustomProgramExerciseSchema).min(1).max(30)
});

export const createCustomProgramBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(160).nullable().optional(),
  workouts: z.array(createCustomProgramWorkoutSchema).min(1).max(14)
});

export const workoutHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.literal("completed").optional()
});

export const setParamsSchema = z.object({
  setId: z.string().min(1)
});

export const startWorkoutSessionBodySchema = z.object({
  sessionType: z.enum(["program", "custom"]).optional(),
  workoutTemplateId: z.string().min(1).optional(),
  startedAt: isoDateTimeSchema.optional()
});

export const addCustomWorkoutExerciseBodySchema = z.object({
  exerciseId: z.string().min(1),
  targetSets: z.number().int().min(1).max(20),
  targetReps: z.number().int().min(1).max(100),
  targetWeight: weightValueSchema.optional(),
  restSeconds: z.number().int().min(0).max(1800).nullable().optional()
});

export const logSetBodySchema = z.object({
  actualReps: z.number().int().min(0),
  actualWeight: weightValueSchema.optional(),
  completedAt: isoDateTimeSchema.optional()
});

export const completeWorkoutSessionBodySchema = z.object({
  completedAt: isoDateTimeSchema.optional(),
  exerciseFeedback: z
    .array(
      z.object({
        exerciseEntryId: z.string().min(1),
        effortFeedback: z.enum(effortFeedbackValues)
      })
    )
    .default([]),
  userEffortFeedback: z.enum(effortFeedbackValues).optional(),
  finishEarly: z.boolean().optional(),
  recoveryState: z.enum(recoveryStates).optional()
});

export const getExerciseProgressionSettingsQuerySchema = z.object({
  exerciseId: z.string().min(1)
});

export const updateTrainingSettingsBodySchema = z.object({
  trainingGoal: z.enum(trainingGoals).nullable().optional(),
  experienceLevel: z.enum(experienceLevels).nullable().optional(),
  unitSystem: z.enum(unitSystems).optional(),
  progressionAggressiveness: z.enum(progressionAggressivenessLevels).optional(),
  defaultBarbellIncrement: z.number().finite().positive().optional(),
  defaultDumbbellIncrement: z.number().finite().positive().optional(),
  defaultMachineIncrement: z.number().finite().positive().optional(),
  defaultCableIncrement: z.number().finite().positive().optional(),
  useRecoveryAdjustments: z.boolean().optional(),
  defaultRecoveryState: z.enum(recoveryStates).optional(),
  allowAutoDeload: z.boolean().optional(),
  allowRecalibration: z.boolean().optional(),
  preferRepProgressionBeforeWeight: z.boolean().optional(),
  minimumConfidenceForIncrease: z.enum(progressionConfidenceLevels).optional()
});

export const updateExerciseProgressionSettingsBodySchema = z.object({
  exerciseId: z.string().min(1),
  progressionStrategy: z.enum(progressionStrategies).nullable(),
  repRangeMin: z.number().int().min(1).max(100).nullable(),
  repRangeMax: z.number().int().min(1).max(200).nullable(),
  incrementOverride: z.number().finite().positive().nullable(),
  maxJumpPerSession: z.number().finite().positive().nullable(),
  bodyweightProgressionMode: z.enum(bodyweightProgressionModes).nullable()
});

export type WorkoutHeaders = z.infer<typeof workoutHeadersSchema>;
export type WorkoutSessionParams = z.infer<typeof workoutSessionParamsSchema>;
export type WorkoutSessionExerciseParams = z.infer<typeof workoutSessionExerciseParamsSchema>;
export type ProgramParams = z.infer<typeof programParamsSchema>;
export type RecommendGuidedProgramBody = z.infer<typeof recommendGuidedProgramBodySchema>;
export type FollowProgramBody = z.infer<typeof followProgramBodySchema>;
export type CreateCustomProgramBody = z.infer<typeof createCustomProgramBodySchema>;
export type WorkoutHistoryQuery = z.infer<typeof workoutHistoryQuerySchema>;
export type SetParams = z.infer<typeof setParamsSchema>;
export type StartWorkoutSessionBody = z.infer<typeof startWorkoutSessionBodySchema>;
export type AddCustomWorkoutExerciseBody = z.infer<typeof addCustomWorkoutExerciseBodySchema>;
export type LogSetBody = z.infer<typeof logSetBodySchema>;
export type CompleteWorkoutSessionBody = z.infer<typeof completeWorkoutSessionBodySchema>;
export type GetExerciseProgressionSettingsQuery = z.infer<typeof getExerciseProgressionSettingsQuerySchema>;
export type UpdateTrainingSettingsBody = z.infer<typeof updateTrainingSettingsBodySchema>;
export type UpdateExerciseProgressionSettingsBody = z.infer<typeof updateExerciseProgressionSettingsBodySchema>;
