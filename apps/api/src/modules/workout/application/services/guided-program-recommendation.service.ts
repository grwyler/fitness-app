import type {
  GuidedEquipmentAccessLevel,
  GuidedGoalType,
  GuidedProgramAnswers,
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

  const desiredGoal = mapGuidedGoalToTrainingGoal(input.answers.goal);
  const desiredDifficultyRank = toDifficultyRank(input.answers.experienceLevel);
  const allowedEquipment = buildAllowedEquipment(input.answers.equipmentAccess);
  const desiredDuration = input.answers.sessionDurationMinutes;

  let best: { definition: ProgramDefinition; score: number; warnings: string[]; reasons: string[] } | null = null;

  for (const definition of candidates) {
    const warnings: string[] = [];
    const reasons: string[] = [];
    let score = 0;

    const dayDiff = Math.abs(definition.program.daysPerWeek - input.answers.daysPerWeek);
    if (dayDiff === 0) {
      score += 120;
      reasons.push(`Matches your ${input.answers.daysPerWeek} days/week schedule.`);
    } else {
      score += Math.max(0, 80 - dayDiff * 25);
      warnings.push(
        `Recommended plan is ${definition.program.daysPerWeek} days/week (you selected ${input.answers.daysPerWeek}).`
      );
    }

    const durationDiff = Math.abs(definition.program.sessionDurationMinutes - desiredDuration);
    if (durationDiff <= 10) {
      score += 60;
      reasons.push(`Fits your ~${desiredDuration} minute session preference.`);
    } else {
      score += Math.max(0, 40 - Math.floor(durationDiff / 5) * 5);
      warnings.push(
        `Plan sessions are about ${definition.program.sessionDurationMinutes} minutes (you selected ${desiredDuration}).`
      );
    }

    const programDifficultyRank = toDifficultyRank(definition.program.difficultyLevel);
    const difficultyDiff = Math.abs(programDifficultyRank - desiredDifficultyRank);
    if (difficultyDiff === 0) {
      score += 70;
      reasons.push(`Designed for ${definition.program.difficultyLevel} lifters.`);
    } else {
      score += Math.max(0, 40 - difficultyDiff * 25);
      warnings.push(
        `Plan difficulty is ${definition.program.difficultyLevel} (you selected ${input.answers.experienceLevel}).`
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

