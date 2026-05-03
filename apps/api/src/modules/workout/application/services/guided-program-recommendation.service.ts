import type {
  GuidedEquipmentAccessLevel,
  GuidedGoalType,
  GuidedProgramAnswers,
  GuidedProgramAnswersV2,
  GuidedScheduleFlexibility,
  GuidedSessionDurationFlexibility,
  GuidedTrainingStylePreference,
  TrainingGoal
} from "@fitness/shared";
import type { ProgramDefinition } from "../../repositories/models/program.persistence.js";

export type GuidedProgramRecommendation = {
  programId: string;
  isExactMatch: boolean;
  reasons: string[];
  warnings: string[];
};

function mapGuidedGoalToTrainingGoal(goal: GuidedGoalType): TrainingGoal | null {
  switch (goal) {
    case "hypertrophy":
    case "strength":
    case "general_fitness":
      return goal;
    case "consistency":
      return "general_fitness";
    case "sport_support":
      return "endurance";
    case "custom":
      return null;
  }
}

function toDifficultyRank(value: string | null | undefined): number {
  switch (value) {
    case "beginner":
      return 0;
    case "intermediate":
      return 1;
    case "advanced":
      return 2;
    default:
      return 1;
  }
}

function buildAllowedEquipment(access: GuidedEquipmentAccessLevel) {
  switch (access) {
    case "full_gym":
      return new Set(["barbell", "dumbbell", "machine", "cable", "bodyweight"]);
    case "barbell_rack":
      return new Set(["barbell", "bodyweight", "dumbbell"]);
    case "dumbbells":
      return new Set(["dumbbell", "bodyweight"]);
    case "machines_cables":
      return new Set(["machine", "cable", "bodyweight", "dumbbell"]);
    case "bodyweight_only":
      return new Set(["bodyweight"]);
    case "home_gym":
      return new Set(["barbell", "dumbbell", "cable", "bodyweight"]);
  }
}

type NormalizedGuidedProgramProfile = {
  intakeDepth: "core" | "refined";
  goal: GuidedGoalType;
  experienceLevel: string;
  daysPerWeek: 2 | 3 | 4 | 5 | 6;
  scheduleFlexibility: GuidedScheduleFlexibility;
  sessionDurationMinutes: 30 | 45 | 60 | 75;
  sessionDurationFlexibility: GuidedSessionDurationFlexibility;
  equipmentAccess: GuidedEquipmentAccessLevel;
  avoidEquipment: Set<string>;
  progressionAggressiveness: string;
  recoveryPreference: string;
  trainingStylePreference: GuidedTrainingStylePreference | null;
  hasRefinement: boolean;
};

function isGuidedAnswersV2(input: GuidedProgramAnswers): input is GuidedProgramAnswersV2 {
  return typeof (input as GuidedProgramAnswersV2).version === "number" && (input as GuidedProgramAnswersV2).version === 2;
}

function normalizeGuidedProgramAnswers(input: GuidedProgramAnswers): NormalizedGuidedProgramProfile {
  if (!isGuidedAnswersV2(input)) {
    return {
      intakeDepth: "core",
      goal: input.goal,
      experienceLevel: input.experienceLevel,
      daysPerWeek: input.daysPerWeek,
      scheduleFlexibility: "some_flex",
      sessionDurationMinutes: input.sessionDurationMinutes,
      sessionDurationFlexibility: "some_flex",
      equipmentAccess: input.equipmentAccess,
      avoidEquipment: new Set(),
      progressionAggressiveness: input.progressionAggressiveness,
      recoveryPreference: input.recoveryPreference,
      trainingStylePreference: null,
      hasRefinement: false
    };
  }

  const avoid = new Set<string>((input.equipment.avoid ?? []) as string[]);

  return {
    intakeDepth: input.intakeDepth,
    goal: input.goal,
    experienceLevel: input.experienceLevel,
    daysPerWeek: input.schedule.daysPerWeek,
    scheduleFlexibility: input.schedule.flexibility,
    sessionDurationMinutes: input.sessions.durationMinutes,
    sessionDurationFlexibility: input.sessions.flexibility,
    equipmentAccess: input.equipment.access,
    avoidEquipment: avoid,
    progressionAggressiveness: input.preferences.progressionAggressiveness,
    recoveryPreference: input.preferences.recoveryPreference,
    trainingStylePreference: input.preferences.trainingStylePreference ?? null,
    hasRefinement: input.intakeDepth === "refined"
  };
}

function getProgramEquipmentTypes(definition: ProgramDefinition) {
  const types = new Set<string>();
  let hasUnknown = false;

  for (const template of definition.templates) {
    for (const exercise of template.exercises) {
      const raw = exercise.equipmentType ?? null;
      if (!raw) {
        hasUnknown = true;
        continue;
      }
      types.add(raw);
    }
  }

  return { types, hasUnknown };
}

function getProgramStyle(definition: ProgramDefinition): "full_body" | "split" | "unknown" {
  const categories = definition.templates
    .map((template) => template.category ?? null)
    .filter(
      (value): value is NonNullable<ProgramDefinition["templates"][number]["category"]> =>
        value !== null
    );

  if (categories.length === 0) {
    return "unknown";
  }

  if (categories.every((category) => category === "Full Body")) {
    return "full_body";
  }

  return "split";
}

function getDaysWarningThreshold(flexibility: GuidedScheduleFlexibility) {
  switch (flexibility) {
    case "strict":
      return 1;
    case "some_flex":
      return 2;
    case "very_flex":
      return 3;
  }
}

function getDurationWarningThresholdMinutes(flexibility: GuidedSessionDurationFlexibility) {
  switch (flexibility) {
    case "strict":
      return 10;
    case "some_flex":
      return 20;
    case "very_flex":
      return 30;
  }
}

export function recommendGuidedProgram(input: {
  answers: GuidedProgramAnswers;
  candidatePrograms: ProgramDefinition[];
}): GuidedProgramRecommendation {
  const candidates = input.candidatePrograms.filter(
    (definition) => definition.program.source === "predefined" && definition.program.isActive
  );
  if (candidates.length === 0) {
    throw new Error("No predefined programs are available for recommendations.");
  }

  const profile = normalizeGuidedProgramAnswers(input.answers);
  const desiredGoal = mapGuidedGoalToTrainingGoal(profile.goal);
  const desiredDifficultyRank = toDifficultyRank(profile.experienceLevel);
  const allowedEquipment = buildAllowedEquipment(profile.equipmentAccess);
  for (const avoid of profile.avoidEquipment) {
    allowedEquipment.delete(avoid);
  }
  const desiredDuration = profile.sessionDurationMinutes;
  const dayWarningThreshold = getDaysWarningThreshold(profile.scheduleFlexibility);
  const durationWarningThreshold = getDurationWarningThresholdMinutes(profile.sessionDurationFlexibility);

  let best: { definition: ProgramDefinition; score: number; warnings: string[]; reasons: string[] } | null = null;

  for (const definition of candidates) {
    const warnings: string[] = [];
    const reasons: string[] = [];
    let score = 0;

    const dayDiff = Math.abs(definition.program.daysPerWeek - profile.daysPerWeek);
    if (dayDiff === 0) {
      score += 120;
      reasons.push(`Matches your ${profile.daysPerWeek} days/week schedule.`);
    } else {
      score += Math.max(0, 80 - dayDiff * 25);
      if (dayDiff >= dayWarningThreshold) {
        warnings.push(
          `Recommended plan is ${definition.program.daysPerWeek} days/week (you selected ${profile.daysPerWeek}).`
        );
      } else {
        reasons.push(
          `Close to your schedule (${definition.program.daysPerWeek} days/week; you selected ${profile.daysPerWeek}).`
        );
      }
    }

    const durationDiff = Math.abs(definition.program.sessionDurationMinutes - desiredDuration);
    if (durationDiff <= 10) {
      score += 60;
      reasons.push(`Fits your ~${desiredDuration} minute session preference.`);
    } else {
      score += Math.max(0, 40 - Math.floor(durationDiff / 5) * 5);
      if (durationDiff > durationWarningThreshold) {
        warnings.push(
          `Plan sessions are about ${definition.program.sessionDurationMinutes} minutes (you selected ${desiredDuration}).`
        );
      } else {
        reasons.push(
          `Close to your preferred session length (${definition.program.sessionDurationMinutes} min; you selected ${desiredDuration}).`
        );
      }
    }

    const programDifficultyRank = toDifficultyRank(definition.program.difficultyLevel);
    const difficultyDiff = Math.abs(programDifficultyRank - desiredDifficultyRank);
    if (difficultyDiff === 0) {
      score += 70;
      reasons.push(`Designed for ${definition.program.difficultyLevel} lifters.`);
    } else {
      score += Math.max(0, 40 - difficultyDiff * 25);
      warnings.push(
        `Plan difficulty is ${definition.program.difficultyLevel} (you selected ${profile.experienceLevel}).`
      );
    }

    if (desiredGoal && definition.program.trainingGoal === desiredGoal) {
      score += 70;
      reasons.push("Aligns with your goal.");
    } else if (definition.program.trainingGoal == null || desiredGoal == null) {
      score += 35;
      if (desiredGoal) {
        warnings.push("This plan doesn't have a goal tag yet, so we matched based on other factors.");
      }
    } else {
      score += 10;
      warnings.push("This plan was selected as the closest match even though the goal tag differs.");
    }

    const { types: programEquipmentTypes, hasUnknown } = getProgramEquipmentTypes(definition);
    if (hasUnknown) {
      warnings.push("Some exercises have unknown equipment requirements.");
    }

    const unsupported = [...programEquipmentTypes].filter((type) => !allowedEquipment.has(type));
    if (unsupported.length === 0) {
      score += 50;
      reasons.push("Fits your equipment access.");
    } else {
      score -= 80;
      warnings.push(`May require equipment you didn't select: ${unsupported.join(", ")}.`);
    }

    if (profile.trainingStylePreference && profile.trainingStylePreference !== "no_preference") {
      const programStyle = getProgramStyle(definition);
      if (programStyle === "unknown") {
        warnings.push("We couldn't detect this plan's style yet, so we matched on other factors.");
      } else if (programStyle === profile.trainingStylePreference) {
        score += 25;
        reasons.push("Matches your preferred plan style.");
      } else {
        score -= 10;
        warnings.push("Plan style doesn't match your preference, but it was the closest overall fit.");
      }
    }

    if (!best || score > best.score) {
      best = { definition, score, warnings, reasons };
    }
  }

  if (!best) {
    throw new Error("Unable to recommend a program.");
  }

  const isExactMatch = best.warnings.length === 0;

  return {
    programId: best.definition.program.id,
    isExactMatch,
    reasons: best.reasons.length > 0 ? best.reasons : ["Selected as the closest match for your answers."],
    warnings: best.warnings
  };
}

export function mapGuidedAnswersToTrainingGoal(goal: GuidedGoalType): TrainingGoal | null {
  return mapGuidedGoalToTrainingGoal(goal);
}
