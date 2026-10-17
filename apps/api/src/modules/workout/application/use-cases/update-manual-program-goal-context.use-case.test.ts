import assert from "node:assert/strict";
import type { ApplicationTestCase } from "../test-helpers/application-test-case.js";
import { UpdateManualProgramGoalContextUseCase } from "./update-manual-program-goal-context.use-case.js";
import type { ExerciseProgressionSettingsRepository } from "../../repositories/interfaces/exercise-progression-settings.repository.js";
import type { ProgramRepository } from "../../repositories/interfaces/program.repository.js";
import type { ProgramTrainingContextRepository } from "../../repositories/interfaces/program-training-context.repository.js";
import type { TrainingBlockRepository } from "../../repositories/interfaces/training-block.repository.js";
import type { TrainingSettingsRepository } from "../../repositories/interfaces/training-settings.repository.js";

export const updateManualProgramGoalContextUseCaseTestCases: ApplicationTestCase[] = [
  {
    name: "Manual goal context save creates an active training block when none exists",
    run: async () => {
      const programRepository: ProgramRepository = {
        async listActive() {
          return [];
        },
        async findActiveById() {
          return { id: "p1" } as any;
        },
        async createEnrollment() {
          throw new Error("Not implemented.");
        },
        async createCustomProgram() {
          throw new Error("Not implemented.");
        },
        async updateCustomProgram() {
          throw new Error("Not implemented.");
        }
      };
      const trainingSettingsRepository: TrainingSettingsRepository = {
        async findOrCreateByUserId() {
          return {
            userId: "u1",
            trainingGoal: null,
            experienceLevel: null,
            unitSystem: "imperial",
            progressionAggressiveness: "balanced",
            defaultBarbellIncrementLbs: 5,
            defaultDumbbellIncrementLbs: 5,
            defaultMachineIncrementLbs: 10,
            defaultCableIncrementLbs: 5,
            useRecoveryAdjustments: true,
            defaultRecoveryState: "normal",
            allowAutoDeload: true,
            allowRecalibration: true,
            preferRepProgressionBeforeWeight: true,
            minimumConfidenceForIncrease: "medium"
          } as any;
        },
        async updateByUserId() {
          throw new Error("Not implemented.");
        }
      };
      const exerciseProgressionSettingsRepository: ExerciseProgressionSettingsRepository = {
        async listByUserId() {
          return [];
        },
        async findByUserIdAndExerciseId() {
          return null;
        },
        async upsert() {
          throw new Error("Not implemented.");
        }
      };

      let createdContextId: string | null = null;
      const programTrainingContextRepository: ProgramTrainingContextRepository = {
        async create() {
          createdContextId = "ctx-1";
          return {
            id: "ctx-1",
            userId: "u1",
            programId: "p1",
            enrollmentId: null,
            source: "manual",
            goalType: null,
            experienceLevel: null,
            progressionPreferencesSnapshot: {},
            recoveryPreferencesSnapshot: {},
            equipmentSettingsSnapshot: {},
            exerciseProgressionSettingsSnapshot: [],
            guidedAnswersSnapshot: {},
            guidedRecommendationSnapshot: null,
            coachingEnabled: false,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        },
        async findLatestByUserProgram() {
          return null;
        }
      };

      let createdBlock = false;
      const trainingBlockRepository: TrainingBlockRepository = {
        async findActiveByUserProgram() {
          return null;
        },
        async create(input) {
          createdBlock = true;
          assert.equal(input.programTrainingContextId, createdContextId);
          assert.equal(input.status, "active");
          return {
            id: "b1",
            userId: input.userId,
            programId: input.programId,
            programTrainingContextId: input.programTrainingContextId ?? null,
            name: input.name,
            goalType: input.goalType,
            source: "manual",
            status: input.status,
            startDate: input.startDate,
            plannedWeeks: input.plannedWeeks,
            targetWorkoutsPerWeek: input.targetWorkoutsPerWeek,
            progressionStyle: input.progressionStyle,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        },
        async updateById() {
          throw new Error("Not implemented.");
        }
      };

      const useCase = new UpdateManualProgramGoalContextUseCase(
        programRepository,
        trainingSettingsRepository,
        exerciseProgressionSettingsRepository,
        programTrainingContextRepository,
        trainingBlockRepository
      );

      await useCase.execute({
        context: { userId: "u1", requestId: "r1" } as any,
        programId: "p1",
        request: {
          manualGoalContext: {
            goalType: "strength",
            targetWorkoutsPerWeek: 4,
            plannedWeeks: 8,
            progressionStyle: "balanced"
          }
        }
      });

      assert.equal(createdBlock, true);
    }
  },
  {
    name: "Manual goal context edit updates the active training block when it exists",
    run: async () => {
      const programRepository: ProgramRepository = {
        async listActive() {
          return [];
        },
        async findActiveById() {
          return { id: "p1" } as any;
        },
        async createEnrollment() {
          throw new Error("Not implemented.");
        },
        async createCustomProgram() {
          throw new Error("Not implemented.");
        },
        async updateCustomProgram() {
          throw new Error("Not implemented.");
        }
      };
      const trainingSettingsRepository: TrainingSettingsRepository = {
        async findOrCreateByUserId() {
          return {
            userId: "u1",
            trainingGoal: null,
            experienceLevel: null,
            unitSystem: "imperial",
            progressionAggressiveness: "balanced",
            defaultBarbellIncrementLbs: 5,
            defaultDumbbellIncrementLbs: 5,
            defaultMachineIncrementLbs: 10,
            defaultCableIncrementLbs: 5,
            useRecoveryAdjustments: true,
            defaultRecoveryState: "normal",
            allowAutoDeload: true,
            allowRecalibration: true,
            preferRepProgressionBeforeWeight: true,
            minimumConfidenceForIncrease: "medium"
          } as any;
        },
        async updateByUserId() {
          throw new Error("Not implemented.");
        }
      };
      const exerciseProgressionSettingsRepository: ExerciseProgressionSettingsRepository = {
        async listByUserId() {
          return [];
        },
        async findByUserIdAndExerciseId() {
          return null;
        },
        async upsert() {
          throw new Error("Not implemented.");
        }
      };

      const programTrainingContextRepository: ProgramTrainingContextRepository = {
        async create() {
          return {
            id: "ctx-2",
            userId: "u1",
            programId: "p1",
            enrollmentId: null,
            source: "manual",
            goalType: null,
            experienceLevel: null,
            progressionPreferencesSnapshot: {},
            recoveryPreferencesSnapshot: {},
            equipmentSettingsSnapshot: {},
            exerciseProgressionSettingsSnapshot: [],
            guidedAnswersSnapshot: {},
            guidedRecommendationSnapshot: null,
            coachingEnabled: false,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        },
        async findLatestByUserProgram() {
          return null;
        }
      };

      let updated = false;
      const trainingBlockRepository: TrainingBlockRepository = {
        async findActiveByUserProgram() {
          return {
            id: "b1",
            userId: "u1",
            programId: "p1",
            programTrainingContextId: "ctx-old",
            name: "Training block",
            goalType: "strength",
            source: "manual",
            status: "active",
            startDate: new Date(),
            plannedWeeks: 8,
            targetWorkoutsPerWeek: 4,
            progressionStyle: "balanced",
            createdAt: new Date(),
            updatedAt: new Date()
          };
        },
        async create() {
          throw new Error("Not implemented.");
        },
        async updateById(id, input) {
          updated = true;
          assert.equal(id, "b1");
          assert.equal(input.programTrainingContextId, "ctx-2");
          assert.equal(input.targetWorkoutsPerWeek, 3);
          return {
            id: "b1",
            userId: "u1",
            programId: "p1",
            programTrainingContextId: input.programTrainingContextId ?? null,
            name: "Training block",
            goalType: input.goalType ?? null,
            source: "manual",
            status: "active",
            startDate: new Date(),
            plannedWeeks: input.plannedWeeks ?? 0,
            targetWorkoutsPerWeek: input.targetWorkoutsPerWeek ?? 0,
            progressionStyle: input.progressionStyle ?? null,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
      };

      const useCase = new UpdateManualProgramGoalContextUseCase(
        programRepository,
        trainingSettingsRepository,
        exerciseProgressionSettingsRepository,
        programTrainingContextRepository,
        trainingBlockRepository
      );

      await useCase.execute({
        context: { userId: "u1", requestId: "r1" } as any,
        programId: "p1",
        request: {
          manualGoalContext: {
            goalType: "strength",
            targetWorkoutsPerWeek: 3,
            plannedWeeks: 8,
            progressionStyle: "balanced"
          }
        }
      });

      assert.equal(updated, true);
    }
  }
];
