import type {
  ExperienceLevel,
  GuidedBusyWeekPreference,
  GuidedEquipmentAccessLevel,
  GuidedEquipmentType,
  GuidedFocusArea,
  GuidedGoalType,
  GuidedProgramAnswersV2,
  GuidedRecoveryPreference,
  GuidedRecoveryTolerance,
  GuidedScheduleFlexibility,
  GuidedSessionDurationFlexibility,
  GuidedTrainingStylePreference,
  ProgressionAggressiveness
} from "@fitness/shared";

export function buildGuidedProgramAnswersV2(input: {
  includeRefinement: boolean;
  goal: GuidedGoalType;
  experienceLevel: ExperienceLevel;
  daysPerWeek: 2 | 3 | 4 | 5 | 6;
  scheduleFlexibility: GuidedScheduleFlexibility;
  sessionDurationMinutes: 30 | 45 | 60 | 75;
  sessionDurationFlexibility: GuidedSessionDurationFlexibility;
  equipmentAccess: GuidedEquipmentAccessLevel;
  avoidEquipment: GuidedEquipmentType[];
  progressionAggressiveness: ProgressionAggressiveness;
  recoveryPreference: GuidedRecoveryPreference;
  trainingStylePreference: GuidedTrainingStylePreference | null;
  focusAreas: GuidedFocusArea[];
  busyWeekPreference: GuidedBusyWeekPreference | null;
  recoveryTolerance: GuidedRecoveryTolerance | null;
  exerciseExclusions: string;
}): GuidedProgramAnswersV2 {
  const exerciseExclusions = input.exerciseExclusions.trim();

  return {
    version: 2,
    intakeDepth: input.includeRefinement ? "refined" : "core",
    goal: input.goal,
    experienceLevel: input.experienceLevel,
    schedule: {
      daysPerWeek: input.daysPerWeek,
      flexibility: input.scheduleFlexibility
    },
    sessions: {
      durationMinutes: input.sessionDurationMinutes,
      flexibility: input.sessionDurationFlexibility
    },
    equipment: {
      access: input.equipmentAccess,
      avoid: input.avoidEquipment.length > 0 ? input.avoidEquipment : undefined
    },
    preferences: {
      progressionAggressiveness: input.progressionAggressiveness,
      recoveryPreference: input.recoveryPreference,
      trainingStylePreference: input.includeRefinement ? (input.trainingStylePreference ?? "no_preference") : undefined,
      focusAreas: input.includeRefinement && input.focusAreas.length > 0 ? input.focusAreas : undefined,
      busyWeekPreference: input.includeRefinement ? input.busyWeekPreference ?? undefined : undefined,
      recoveryTolerance: input.includeRefinement ? input.recoveryTolerance ?? undefined : undefined,
      exerciseExclusions: input.includeRefinement && exerciseExclusions.length > 0 ? exerciseExclusions : null
    }
  };
}

export function getGuidedProgramSavedForLaterPreferences(answers: GuidedProgramAnswersV2): string[] {
  if (answers.intakeDepth !== "refined") {
    return [];
  }

  const saved: string[] = [];

  if (answers.preferences.focusAreas?.length) {
    saved.push("Focus areas");
  }

  if (answers.preferences.busyWeekPreference) {
    saved.push("Busy-week preference");
  }

  if (answers.preferences.recoveryTolerance) {
    saved.push("Recovery tolerance");
  }

  if (answers.preferences.exerciseExclusions) {
    saved.push("Exercise exclusions");
  }

  return saved;
}

