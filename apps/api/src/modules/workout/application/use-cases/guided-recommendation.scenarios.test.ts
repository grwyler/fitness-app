import assert from "node:assert/strict";
import { seedExercises, seedPrograms } from "@fitness/db";
import type { GuidedProgramAnswersV2 } from "@fitness/shared";
import type { ProgramDefinition } from "../../repositories/models/program.persistence.js";
import type { ApplicationTestCase } from "../test-helpers/application-test-case.js";
import { recommendGuidedProgram } from "../services/guided-program-recommendation.service.js";

const exerciseBySlug = new Map(seedExercises.map((exercise) => [exercise.slug, exercise]));
const seedProgramByName = new Map(seedPrograms.map((program) => [program.name, program]));

function toProgramDefinition(programName: string): ProgramDefinition {
  const seedProgram = seedProgramByName.get(programName);
  if (!seedProgram) {
    throw new Error(`Unknown seed program: ${programName}`);
  }

  return {
    program: {
      id: programName,
      userId: null,
      source: "predefined",
      name: seedProgram.name,
      description: seedProgram.description,
      daysPerWeek: seedProgram.daysPerWeek,
      sessionDurationMinutes: seedProgram.sessionDurationMinutes,
      difficultyLevel: seedProgram.difficultyLevel,
      trainingGoal: seedProgram.trainingGoal,
      metadata: seedProgram.metadata,
      isActive: true,
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
      updatedAt: new Date("2026-04-01T00:00:00.000Z")
    },
    templates: seedProgram.templates.map((template) => ({
      id: `${programName}:${template.sequenceOrder}`,
      programId: programName,
      name: template.name,
      category: template.category,
      sequenceOrder: template.sequenceOrder,
      estimatedDurationMinutes: template.estimatedDurationMinutes,
      exercises: template.exercises.map((entry) => {
        const exercise = exerciseBySlug.get(entry.exerciseSlug);
        if (!exercise) {
          throw new Error(`Unknown exerciseSlug in ${programName}: ${entry.exerciseSlug}`);
        }

        return {
          id: `${programName}:${template.sequenceOrder}:${entry.sequenceOrder}`,
          exerciseId: entry.exerciseSlug,
          exerciseName: exercise.name,
          category: exercise.category,
          movementPattern: exercise.movementPattern,
          primaryMuscleGroup: exercise.primaryMuscleGroup,
          equipmentType: exercise.equipmentType,
          isBodyweight: exercise.isBodyweight ?? exercise.equipmentType === "bodyweight",
          sequenceOrder: entry.sequenceOrder,
          targetSets: entry.targetSets,
          targetReps: entry.targetReps,
          repRangeMin: entry.repRangeMin ?? null,
          repRangeMax: entry.repRangeMax ?? null,
          restSeconds: entry.restSeconds,
          progressionStrategy: entry.progressionStrategy ?? null
        };
      })
    }))
  };
}

function recommendFor(input: { answers: GuidedProgramAnswersV2; candidates: string[] }) {
  return recommendGuidedProgram({
    answers: input.answers,
    candidatePrograms: input.candidates.map(toProgramDefinition)
  });
}

function baseAnswers(overrides: Partial<GuidedProgramAnswersV2>): GuidedProgramAnswersV2 {
  return {
    version: 2,
    intakeDepth: "refined",
    goal: "general_fitness",
    experienceLevel: "beginner",
    schedule: { daysPerWeek: 3, flexibility: "some_flex" },
    sessions: { durationMinutes: 45, flexibility: "strict" },
    equipment: { access: "full_gym" },
    preferences: {
      progressionAggressiveness: "balanced",
      recoveryPreference: "adjust_when_needed",
      trainingStylePreference: "no_preference",
      focusAreas: [],
      busyWeekPreference: "either",
      recoveryTolerance: "normal",
      exerciseExclusions: null
    },
    ...overrides
  };
}

export const guidedRecommendationScenarioTestCases: ApplicationTestCase[] = [
  {
    name: "Scenario 1: beginner 2-day 45min low recovery -> 2-Day Beginner Full Body",
    run: () => {
      const result = recommendFor({
        answers: baseAnswers({
          goal: "general_fitness",
          experienceLevel: "beginner",
          schedule: { daysPerWeek: 2, flexibility: "strict" },
          sessions: { durationMinutes: 45, flexibility: "strict" },
          preferences: { ...baseAnswers({}).preferences, recoveryTolerance: "low" }
        }),
        candidates: ["2-Day Beginner Full Body", "3-Day General Fitness", "5-Day Push/Pull/Legs"]
      });

      assert.equal(result.programId, "2-Day Beginner Full Body");
    }
  },
  {
    name: "Scenario 2: beginner 3-day strength -> 3-Day Beginner Strength",
    run: () => {
      const result = recommendFor({
        answers: baseAnswers({
          goal: "strength",
          experienceLevel: "beginner",
          schedule: { daysPerWeek: 3, flexibility: "strict" },
          sessions: { durationMinutes: 60, flexibility: "some_flex" }
        }),
        candidates: ["3-Day Beginner Strength", "3-Day Full Body Beginner", "4-Day Upper/Lower"]
      });

      assert.equal(result.programId, "3-Day Beginner Strength");
    }
  },
  {
    name: "Scenario 3: beginner hypertrophy 3-day -> 3-Day Beginner Hypertrophy",
    run: () => {
      const result = recommendFor({
        answers: baseAnswers({
          goal: "hypertrophy",
          experienceLevel: "beginner",
          schedule: { daysPerWeek: 3, flexibility: "strict" },
          sessions: { durationMinutes: 60, flexibility: "some_flex" }
        }),
        candidates: ["3-Day Beginner Hypertrophy", "4-Day Hypertrophy Focus", "3-Day Full Body Beginner"]
      });

      assert.equal(result.programId, "3-Day Beginner Hypertrophy");
    }
  },
  {
    name: "Scenario 4: returning user 2-day -> 2-Day Return to Training",
    run: () => {
      const result = recommendFor({
        answers: baseAnswers({
          goal: "consistency",
          experienceLevel: "beginner",
          schedule: { daysPerWeek: 2, flexibility: "very_flex" },
          sessions: { durationMinutes: 45, flexibility: "strict" },
          preferences: { ...baseAnswers({}).preferences, recoveryTolerance: "low" }
        }),
        candidates: ["2-Day Return to Training", "2-Day General Fitness", "4-Day Upper/Lower"]
      });

      assert.equal(result.programId, "2-Day Return to Training");
    }
  },
  {
    name: "Scenario 5: intermediate strength 4-day -> 4-Day Upper/Lower Strength",
    run: () => {
      const result = recommendFor({
        answers: baseAnswers({
          goal: "strength",
          experienceLevel: "intermediate",
          schedule: { daysPerWeek: 4, flexibility: "strict" },
          sessions: { durationMinutes: 60, flexibility: "some_flex" },
          preferences: { ...baseAnswers({}).preferences, recoveryTolerance: "high" }
        }),
        candidates: ["4-Day Upper/Lower Strength", "3-Day Strength Focus", "5-Day Push/Pull/Legs"]
      });

      assert.equal(result.programId, "4-Day Upper/Lower Strength");
    }
  },
  {
    name: "Scenario 6: intermediate hypertrophy 4-day -> 4-Day Hypertrophy Focus",
    run: () => {
      const result = recommendFor({
        answers: baseAnswers({
          goal: "hypertrophy",
          experienceLevel: "intermediate",
          schedule: { daysPerWeek: 4, flexibility: "strict" },
          sessions: { durationMinutes: 60, flexibility: "some_flex" }
        }),
        candidates: ["4-Day Hypertrophy Focus", "3-Day Full Body Hypertrophy", "4-Day Upper/Lower Strength"]
      });

      assert.equal(result.programId, "4-Day Hypertrophy Focus");
    }
  },
  {
    name: "Scenario 7: intermediate hybrid 4-day -> 4-Day Balanced Strength + Hypertrophy",
    run: () => {
      const result = recommendFor({
        answers: baseAnswers({
          goal: "general_fitness",
          experienceLevel: "intermediate",
          schedule: { daysPerWeek: 4, flexibility: "strict" },
          sessions: { durationMinutes: 60, flexibility: "some_flex" }
        }),
        candidates: ["4-Day Balanced Strength + Hypertrophy", "4-Day Upper/Lower Strength", "4-Day Hypertrophy Focus"]
      });

      assert.equal(result.programId, "4-Day Balanced Strength + Hypertrophy");
    }
  },
  {
    name: "Scenario 8: advanced hypertrophy 6-day high recovery -> 6-Day Push/Pull/Legs Hypertrophy",
    run: () => {
      const result = recommendFor({
        answers: baseAnswers({
          goal: "hypertrophy",
          experienceLevel: "advanced",
          schedule: { daysPerWeek: 6, flexibility: "strict" },
          sessions: { durationMinutes: 75, flexibility: "some_flex" },
          preferences: { ...baseAnswers({}).preferences, recoveryTolerance: "high" }
        }),
        candidates: ["6-Day Push/Pull/Legs Hypertrophy", "5-Day Upper/Lower + Focus Day", "4-Day Torso/Limbs Hypertrophy"]
      });

      assert.equal(result.programId, "6-Day Push/Pull/Legs Hypertrophy");
    }
  },
  {
    name: "Scenario 9: dumbbell-only 3-day -> 3-Day Dumbbell-Only Hypertrophy",
    run: () => {
      const result = recommendFor({
        answers: baseAnswers({
          goal: "hypertrophy",
          experienceLevel: "beginner",
          schedule: { daysPerWeek: 3, flexibility: "some_flex" },
          sessions: { durationMinutes: 45, flexibility: "strict" },
          equipment: { access: "dumbbells" }
        }),
        candidates: ["3-Day Dumbbell-Only Hypertrophy", "3-Day Full Body Beginner", "4-Day Upper/Lower"]
      });

      assert.equal(result.programId, "3-Day Dumbbell-Only Hypertrophy");
    }
  },
  {
    name: "Scenario 10: home gym 4-day -> 4-Day Home Gym Upper/Lower",
    run: () => {
      const result = recommendFor({
        answers: baseAnswers({
          goal: "hypertrophy",
          experienceLevel: "intermediate",
          schedule: { daysPerWeek: 4, flexibility: "strict" },
          sessions: { durationMinutes: 60, flexibility: "some_flex" },
          equipment: { access: "home_gym" }
        }),
        candidates: ["4-Day Home Gym Upper/Lower", "4-Day Hypertrophy Focus", "4-Day Machines/Cables Hypertrophy"]
      });

      assert.equal(result.programId, "4-Day Home Gym Upper/Lower");
    }
  },
  {
    name: "Scenario 11: sport-support 2-day -> 2-Day In-Season Maintenance",
    run: () => {
      const result = recommendFor({
        answers: baseAnswers({
          goal: "sport_support",
          experienceLevel: "intermediate",
          schedule: { daysPerWeek: 2, flexibility: "very_flex" },
          sessions: { durationMinutes: 45, flexibility: "strict" },
          preferences: { ...baseAnswers({}).preferences, recoveryTolerance: "low" }
        }),
        candidates: ["2-Day In-Season Maintenance", "2-Day Sport Support Strength", "3-Day Strength Focus"]
      });

      assert.equal(result.programId, "2-Day In-Season Maintenance");
    }
  },
  {
    name: "Scenario 12: sport-support 3-day -> 3-Day Sport Support Strength",
    run: () => {
      const result = recommendFor({
        answers: baseAnswers({
          goal: "sport_support",
          experienceLevel: "intermediate",
          schedule: { daysPerWeek: 3, flexibility: "some_flex" },
          sessions: { durationMinutes: 45, flexibility: "strict" },
          preferences: { ...baseAnswers({}).preferences, recoveryTolerance: "low" }
        }),
        candidates: ["3-Day Sport Support Strength", "3-Day Strength Focus", "5-Day Push/Pull/Legs"]
      });

      assert.equal(result.programId, "3-Day Sport Support Strength");
    }
  },
  {
    name: "Scenario 13: 30-min hard limit -> 3-Day Quick Start (30 min)",
    run: () => {
      const result = recommendFor({
        answers: baseAnswers({
          goal: "consistency",
          experienceLevel: "beginner",
          schedule: { daysPerWeek: 3, flexibility: "very_flex" },
          sessions: { durationMinutes: 30, flexibility: "strict" }
        }),
        candidates: ["3-Day Quick Start (30 min)", "3-Day General Fitness", "3-Day Full Body Beginner"]
      });

      assert.equal(result.programId, "3-Day Quick Start (30 min)");
    }
  },
  {
    name: "Scenario 14: 45-min flexible -> 3-Day General Fitness",
    run: () => {
      const result = recommendFor({
        answers: baseAnswers({
          goal: "general_fitness",
          experienceLevel: "beginner",
          schedule: { daysPerWeek: 3, flexibility: "some_flex" },
          sessions: { durationMinutes: 45, flexibility: "very_flex" }
        }),
        candidates: ["3-Day General Fitness", "3-Day Full Body Beginner", "4-Day Upper/Lower"]
      });

      assert.equal(result.programId, "3-Day General Fitness");
    }
  },
  {
    name: "Scenario 15: inconsistent schedule -> 3-Day Flexible Full Body",
    run: () => {
      const result = recommendFor({
        answers: baseAnswers({
          goal: "consistency",
          experienceLevel: "beginner",
          schedule: { daysPerWeek: 3, flexibility: "very_flex" },
          sessions: { durationMinutes: 45, flexibility: "some_flex" }
        }),
        candidates: ["3-Day Flexible Full Body", "4-Day Upper/Lower", "5-Day Push/Pull/Legs"]
      });

      assert.equal(result.programId, "3-Day Flexible Full Body");
    }
  },
  {
    name: "Scenario 16: prefers upper/lower -> 4-Day Upper/Lower",
    run: () => {
      const result = recommendFor({
        answers: baseAnswers({
          goal: "general_fitness",
          experienceLevel: "beginner",
          schedule: { daysPerWeek: 4, flexibility: "strict" },
          sessions: { durationMinutes: 60, flexibility: "some_flex" },
          preferences: { ...baseAnswers({}).preferences, trainingStylePreference: "split" }
        }),
        candidates: ["4-Day Upper/Lower", "3-Day Full Body Beginner", "2-Day Beginner Full Body"]
      });

      assert.equal(result.programId, "4-Day Upper/Lower");
    }
  },
  {
    name: "Scenario 17: prefers full-body -> 3-Day Full Body Beginner",
    run: () => {
      const result = recommendFor({
        answers: baseAnswers({
          goal: "general_fitness",
          experienceLevel: "beginner",
          schedule: { daysPerWeek: 3, flexibility: "strict" },
          sessions: { durationMinutes: 60, flexibility: "some_flex" },
          preferences: { ...baseAnswers({}).preferences, trainingStylePreference: "full_body" }
        }),
        candidates: ["3-Day Full Body Beginner", "4-Day Upper/Lower", "4-Day Upper/Lower + Arms"]
      });

      assert.equal(result.programId, "3-Day Full Body Beginner");
    }
  },
  {
    name: "Scenario 18: low recovery tolerance avoids 5-day PPL when 3-day exists",
    run: () => {
      const result = recommendFor({
        answers: baseAnswers({
          goal: "hypertrophy",
          experienceLevel: "intermediate",
          schedule: { daysPerWeek: 3, flexibility: "some_flex" },
          sessions: { durationMinutes: 60, flexibility: "some_flex" },
          preferences: { ...baseAnswers({}).preferences, recoveryTolerance: "low" }
        }),
        candidates: ["3-Day Full Body Hypertrophy", "5-Day Push/Pull/Legs", "6-Day Push/Pull/Legs Hypertrophy"]
      });

      assert.equal(result.programId, "3-Day Full Body Hypertrophy");
    }
  },
  {
    name: "Scenario 19: high recovery + aggressive progression leans toward higher demand",
    run: () => {
      const result = recommendFor({
        answers: baseAnswers({
          goal: "hypertrophy",
          experienceLevel: "advanced",
          schedule: { daysPerWeek: 5, flexibility: "strict" },
          sessions: { durationMinutes: 60, flexibility: "some_flex" },
          preferences: { ...baseAnswers({}).preferences, recoveryTolerance: "high", progressionAggressiveness: "aggressive" }
        }),
        candidates: ["5-Day Upper/Lower + Focus Day", "4-Day Hypertrophy Focus", "3-Day Full Body Hypertrophy"]
      });

      assert.equal(result.programId, "5-Day Upper/Lower + Focus Day");
    }
  },
  {
    name: "Scenario 20: limited equipment should not receive full-gym plan",
    run: () => {
      const result = recommendFor({
        answers: baseAnswers({
          goal: "general_fitness",
          experienceLevel: "beginner",
          schedule: { daysPerWeek: 2, flexibility: "very_flex" },
          sessions: { durationMinutes: 45, flexibility: "strict" },
          equipment: { access: "dumbbells" }
        }),
        candidates: ["2-Day Dumbbell-Only Full Body", "2-Day Beginner Full Body", "2-Day General Fitness"]
      });

      assert.equal(result.programId, "2-Day Dumbbell-Only Full Body");
    }
  }
];

