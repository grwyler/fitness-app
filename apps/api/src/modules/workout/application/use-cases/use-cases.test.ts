import assert from "node:assert/strict";
import type { EffortFeedback, SetFailureStatus, SetRir, StartWorkoutSessionRequest } from "@fitness/shared";
import type { EnrollmentRepository } from "../../repositories/interfaces/enrollment.repository.js";
import type { ExerciseRepository } from "../../repositories/interfaces/exercise.repository.js";
import type { IdempotencyRepository } from "../../repositories/interfaces/idempotency.repository.js";
import type { ProgramRepository } from "../../repositories/interfaces/program.repository.js";
import type { ProgressMetricRepository } from "../../repositories/interfaces/progress-metric.repository.js";
import type { ProgressionStateRepository } from "../../repositories/interfaces/progression-state.repository.js";
import type { ProgressionStateV2Repository } from "../../repositories/interfaces/progression-state-v2.repository.js";
import type { ProgressionRecommendationEventRepository } from "../../repositories/interfaces/progression-recommendation-event.repository.js";
import type { ExerciseProgressionSettingsRepository } from "../../repositories/interfaces/exercise-progression-settings.repository.js";
import type { ProgramTrainingContextRepository } from "../../repositories/interfaces/program-training-context.repository.js";
import type { TrainingSettingsRepository } from "../../repositories/interfaces/training-settings.repository.js";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";
import type { IdempotencyRecord } from "../../repositories/models/idempotency.persistence.js";
import { IdempotencyScopeConflictError } from "../../repositories/models/idempotency.persistence.js";
import type { ProgressionStateV2Record } from "../../repositories/models/progression-state-v2.persistence.js";
import type { WorkoutSessionGraph } from "../../repositories/models/workout-session.persistence.js";
import {
  CUSTOM_WORKOUT_PROGRAM_ID,
  CUSTOM_WORKOUT_TEMPLATE_ID
} from "../../domain/models/custom-workout.js";
import { WorkoutApplicationError } from "../errors/workout-application.error.js";
import { recommendGuidedProgram } from "../services/guided-program-recommendation.service.js";
import { MockTransactionManager } from "../test-helpers/mock-transaction-manager.js";
import type { ApplicationTestCase } from "../test-helpers/application-test-case.js";
import type { ProgramDefinition } from "../../repositories/models/program.persistence.js";
import { CompleteWorkoutSessionUseCase } from "./complete-workout-session.use-case.js";
import { CreateCustomProgramUseCase } from "./create-custom-program.use-case.js";
import { FollowProgramUseCase } from "./follow-program.use-case.js";
import { GetCurrentWorkoutSessionUseCase } from "./get-current-workout-session.use-case.js";
import { GetDashboardUseCase } from "./get-dashboard.use-case.js";
import { GetProgressionUseCase } from "./get-progression.use-case.js";
import { GetWorkoutHistoryUseCase } from "./get-workout-history.use-case.js";
import { ListProgramsUseCase } from "./list-programs.use-case.js";
import { LogSetUseCase } from "./log-set.use-case.js";
import { StartWorkoutSessionUseCase } from "./start-workout-session.use-case.js";

function createBaseWorkoutSessionGraph(): WorkoutSessionGraph {
  return {
    session: {
      id: "session-1",
      userId: "user-1",
      programId: "program-1",
      workoutTemplateId: "template-1",
      status: "in_progress",
      startedAt: new Date("2026-04-24T10:00:00.000Z"),
      completedAt: null,
      durationSeconds: null,
      isPartial: false,
      userEffortFeedback: null,
      recoveryState: null,
      programNameSnapshot: "3-Day Full Body Beginner",
      workoutNameSnapshot: "Workout A",
      createdAt: new Date("2026-04-24T10:00:00.000Z"),
      updatedAt: new Date("2026-04-24T10:00:00.000Z")
    },
    exerciseEntries: [
      {
        id: "entry-1",
        workoutSessionId: "session-1",
        exerciseId: "exercise-1",
        workoutTemplateExerciseEntryId: "template-exercise-1",
        sequenceOrder: 1,
        targetSets: 3,
        targetReps: 8,
        targetDurationSeconds: null,
        targetDistanceMeters: null,
        targetRounds: null,
        targetWeightLbs: 135,
        restSeconds: 120,
        effortFeedback: null,
        completedAt: null,
        exerciseNameSnapshot: "Bench Press",
        exerciseCategorySnapshot: "compound",
        loggingModalitySnapshot: "reps_load",
        progressionRuleSnapshot: { incrementLbs: 5 },
        createdAt: new Date("2026-04-24T10:00:00.000Z"),
        updatedAt: new Date("2026-04-24T10:00:00.000Z")
      }
    ],
    sets: [
      {
        id: "set-1",
        exerciseEntryId: "entry-1",
        setNumber: 1,
        setType: "working",
        targetReps: 8,
        actualReps: null,
        targetWeightLbs: 135,
        actualWeightLbs: null,
        targetDurationSeconds: null,
        actualDurationSeconds: null,
        targetDistanceMeters: null,
        actualDistanceMeters: null,
        targetRounds: null,
        actualRounds: null,
        status: "pending",
        rir: null,
        failureStatus: null,
        completedAt: null,
        createdAt: new Date("2026-04-24T10:00:00.000Z"),
        updatedAt: new Date("2026-04-24T10:00:00.000Z")
      },
      {
        id: "set-2",
        exerciseEntryId: "entry-1",
        setNumber: 2,
        setType: "working",
        targetReps: 8,
        actualReps: null,
        targetWeightLbs: 135,
        actualWeightLbs: null,
        targetDurationSeconds: null,
        actualDurationSeconds: null,
        targetDistanceMeters: null,
        actualDistanceMeters: null,
        targetRounds: null,
        actualRounds: null,
        status: "pending",
        rir: null,
        failureStatus: null,
        completedAt: null,
        createdAt: new Date("2026-04-24T10:00:00.000Z"),
        updatedAt: new Date("2026-04-24T10:00:00.000Z")
      },
      {
        id: "set-3",
        exerciseEntryId: "entry-1",
        setNumber: 3,
        setType: "working",
        targetReps: 8,
        actualReps: null,
        targetWeightLbs: 135,
        actualWeightLbs: null,
        targetDurationSeconds: null,
        actualDurationSeconds: null,
        targetDistanceMeters: null,
        actualDistanceMeters: null,
        targetRounds: null,
        actualRounds: null,
        status: "pending",
        rir: null,
        failureStatus: null,
        completedAt: null,
        createdAt: new Date("2026-04-24T10:00:00.000Z"),
        updatedAt: new Date("2026-04-24T10:00:00.000Z")
      }
    ]
  };
}

function createMockIdempotencyRepository() {
  const records = new Map<string, IdempotencyRecord>();

  const repository: IdempotencyRepository = {
    async findByScope(scope) {
      return records.get(`${scope.userId}:${scope.routeFamily}:${scope.targetResourceId ?? "none"}:${scope.key}`) ?? null;
    },
    async createPending(input) {
      const key = `${input.scope.userId}:${input.scope.routeFamily}:${input.scope.targetResourceId ?? "none"}:${input.scope.key}`;
      if (records.has(key)) {
        throw new IdempotencyScopeConflictError(input.scope);
      }

      const record: IdempotencyRecord = {
        id: `idempotency-${records.size + 1}`,
        userId: input.scope.userId,
        key: input.scope.key,
        routeFamily: input.scope.routeFamily,
        targetResourceId: input.scope.targetResourceId,
        requestFingerprint: input.requestFingerprint,
        status: "pending",
        responseStatusCode: null,
        responseBody: null,
        createdAt: new Date("2026-04-24T10:00:00.000Z"),
        updatedAt: new Date("2026-04-24T10:00:00.000Z"),
        completedAt: null
      };
      records.set(key, record);
      return record;
    },
    async markCompleted(input) {
      const existingRecord = [...records.values()].find((record) => record.id === input.idempotencyRecordId);
      if (!existingRecord) {
        throw new Error("Idempotency record not found.");
      }

      const updatedRecord: IdempotencyRecord = {
        ...existingRecord,
        status: "completed",
        responseStatusCode: input.responseStatusCode,
        responseBody: input.responseBody,
        completedAt: input.completedAt,
        updatedAt: input.completedAt
      };

      const key = `${existingRecord.userId}:${existingRecord.routeFamily}:${existingRecord.targetResourceId ?? "none"}:${existingRecord.key}`;
      records.set(key, updatedRecord);
      return updatedRecord;
    }
  };

  return {
    repository,
    records
  };
}

function createMockProgressionStateV2Repository(input?: {
  findRows?: ProgressionStateV2Record[];
}): ProgressionStateV2Repository {
  return {
    async findByUserIdAndTemplateEntryIds() {
      return input?.findRows ?? [];
    },
    async createMany(inputs) {
      return inputs.map((value, index) => ({
        id: `progression-v2-${index + 1}`,
        ...value,
        createdAt: new Date("2026-04-24T10:00:00.000Z"),
        updatedAt: new Date("2026-04-24T10:00:00.000Z")
      }));
    },
    async updateMany(inputs) {
      return inputs.map((value, index) => ({
        id: `progression-v2-updated-${index + 1}`,
        ...value,
        createdAt: new Date("2026-04-24T10:00:00.000Z"),
        updatedAt: new Date("2026-04-24T10:00:00.000Z")
      }));
    }
  };
}

const defaultProgressionStateV2Repository = createMockProgressionStateV2Repository();

async function completeSingleExerciseWorkoutScenario(input: {
  idempotencyKey: string;
  exerciseFeedback: EffortFeedback | null;
  recoveryState?: "fresh" | "normal" | "fatigued" | "exhausted";
  setOverrides?: Array<{
    status?: "completed" | "failed";
    actualReps?: number | null;
    actualWeightLbs?: number | null;
    rir?: SetRir | null;
    failureStatus?: SetFailureStatus | null;
  }>;
}) {
  const idempotency = createMockIdempotencyRepository();
  let graphReadCount = 0;

  const baseGraph = createBaseWorkoutSessionGraph();
  const inProgressGraph: WorkoutSessionGraph = {
    ...baseGraph,
    session: {
      ...baseGraph.session,
      programId: CUSTOM_WORKOUT_PROGRAM_ID
    },
    exerciseEntries: [
      {
        ...baseGraph.exerciseEntries[0]!,
        targetWeightLbs: 95,
        targetReps: 8
      }
    ],
    sets: baseGraph.sets.map((set, index) => {
      const override = input.setOverrides?.[index] ?? {};
      return {
        ...set,
        actualReps: override.actualReps ?? 8,
        actualWeightLbs: override.actualWeightLbs ?? 95,
        targetReps: 8,
        targetWeightLbs: 95,
        status: override.status ?? "completed",
        rir: override.rir ?? null,
        failureStatus: override.failureStatus ?? null,
        completedAt: new Date("2026-04-24T10:10:00.000Z")
      };
    })
  };

  let completedGraph: WorkoutSessionGraph | null = null;

  const workoutSessionRepository: WorkoutSessionRepository = {
    async findInProgressByUserId() {
      return null;
    },
    async findOwnedById() {
      return null;
    },
    async findOwnedSessionGraphById() {
      return graphReadCount++ === 0 ? inProgressGraph : completedGraph;
    },
    async findOwnedSetForLogging() {
      return null;
    },
    async createSessionGraph() {
      throw new Error("Not implemented.");
    },
    async appendCustomExercise() {
      throw new Error("Not implemented.");
    },
    async updateWorkoutNameSnapshotIfDefault() {
      return false;
    },
    async appendWorkoutSet() {
      throw new Error("Not implemented.");
    },
    async deleteWorkoutSet() {
      throw new Error("Not implemented.");
    },
    async updateWorkoutExerciseEntry() {
      throw new Error("Not implemented.");
    },
    async deleteWorkoutExerciseEntry() {
      throw new Error("Not implemented.");
    },
    async updateLoggedSet() {
      throw new Error("Not implemented.");
    },
    async persistExerciseEntryFeedback() {},
    async skipPendingWorkoutSets() {
      return 0;
    },
    async completeSession(completeInput) {
      completedGraph = {
        ...inProgressGraph,
        session: {
          ...inProgressGraph.session,
          status: "completed",
          completedAt: completeInput.completedAt,
          durationSeconds: completeInput.durationSeconds,
          isPartial: completeInput.isPartial,
          userEffortFeedback: completeInput.userEffortFeedback,
          recoveryState: completeInput.recoveryState
        },
        sets: [...inProgressGraph.sets]
      };

      return completedGraph.session;
    },
    async cancelSession() {
      throw new Error("Not implemented.");
    },
    async listRecentCompletedByUserId() {
      return [];
    },
    async countCompletedByUserIdWithinRange() {
      return 0;
    },
    async countCompletedByUserId() {
      return 0;
    },
    async countCompletedByUserIdAndProgramId() {
      return 0;
    },
    async listCompletedProgressionByUserId() {
      return [];
    }
  };

  const enrollmentRepository: EnrollmentRepository = {
    async findActiveByUserId() {
      return null;
    },
    async updateNextWorkoutTemplate() {
      throw new Error("Not implemented.");
    },
    async cancelEnrollment() {
      throw new Error("Not implemented.");
    }
  };

  const progressionStateRepository: ProgressionStateRepository = {
    async findByUserIdAndExerciseIds() {
      return [];
    },
    async createMany() {
      return [];
    },
    async updateMany() {
      return [];
    }
  };

  const exerciseRepository: ExerciseRepository = {
    async listActive() {
      return [];
    },
    async findTemplateDefinitionById() {
      return null;
    },
    async findProgressionSeedsByExerciseIds() {
      return [
        {
          exerciseId: "exercise-1",
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          equipmentType: null,
          defaultStartingWeightLbs: 95,
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false,
          isProgressionEligible: true
        }
      ];
    },
    async findActiveTemplatesByProgramId() {
      return [];
    },
    async updateWorkoutTemplateExerciseEntry() {
      throw new Error("Not implemented.");
    },
    async softDeleteWorkoutTemplateExerciseEntry() {
      throw new Error("Not implemented.");
    }
  } as any;

  const programRepository: ProgramRepository = {
    async listActive() {
      return [];
    },
    async findActiveById() {
      return null;
    },
    async createEnrollment() {
      throw new Error("Not implemented.");
    }
  };

  const progressMetricRepository: ProgressMetricRepository = {
    async createMany() {
      return [];
    }
  } as any;

  const progressionStateV2Repository: ProgressionStateV2Repository = createMockProgressionStateV2Repository({
    findRows: []
  });

  const progressionRecommendationEventRepository: ProgressionRecommendationEventRepository = {
    async createMany() {
      return [];
    }
  } as any;

  const userRepository = {
    findTrainingProfile: async () => ({ experienceLevel: null, trainingGoal: null })
  } as any;

  const trainingSettingsRepository: TrainingSettingsRepository = {
    findOrCreateByUserId: async (userId: string) => ({
      userId,
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
    }),
    updateByUserId: async (userId: string) => ({
      userId,
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
    })
  } as any;

  const exerciseProgressionSettingsRepository: ExerciseProgressionSettingsRepository = {
    findByUserIdAndExerciseId: async () => ({
      userId: "user-1",
      exerciseId: "exercise-1",
      progressionStrategy: null,
      repRangeMin: 8,
      repRangeMax: 12,
      incrementOverrideLbs: null,
      maxJumpPerSessionLbs: null,
      bodyweightProgressionMode: null
    }),
    upsert: async (record: any) => record
  } as any;

  const useCase = new CompleteWorkoutSessionUseCase(
    workoutSessionRepository,
    enrollmentRepository,
    progressionStateRepository,
    progressionStateV2Repository,
    exerciseRepository,
    userRepository,
    programRepository,
    progressMetricRepository,
    progressionRecommendationEventRepository,
    trainingSettingsRepository,
    exerciseProgressionSettingsRepository,
    new MockTransactionManager(),
    idempotency.repository
  );

  const result = await useCase.execute({
    context: { userId: "user-1", unitSystem: "imperial" },
    sessionId: "session-1",
    request: {
      exerciseFeedback: input.exerciseFeedback ? [{ exerciseEntryId: "entry-1", effortFeedback: input.exerciseFeedback }] : [],
      ...(input.recoveryState ? { recoveryState: input.recoveryState } : {})
    },
    idempotencyKey: input.idempotencyKey
  });

  return result.data;
}

function createProgramDefinition(): ProgramDefinition {
  return {
    program: {
      id: "program-1",
      userId: null,
      source: "predefined" as const,
      name: "3-Day Full Body Beginner",
      description: "A simple strength progression program.",
      daysPerWeek: 3,
      sessionDurationMinutes: 60,
      difficultyLevel: "beginner" as const,
      trainingGoal: null,
      isActive: true,
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
      updatedAt: new Date("2026-04-01T00:00:00.000Z")
    },
    templates: [
      {
        id: "template-1",
        programId: "program-1",
        name: "Workout A",
        category: "Full Body",
        sequenceOrder: 1,
        estimatedDurationMinutes: 60,
        exercises: [
          {
            id: "template-entry-1",
            exerciseId: "exercise-1",
            exerciseName: "Bench Press",
            category: "compound" as const,
            loggingModality: "reps_load",
            movementPattern: null,
            primaryMuscleGroup: null,
            equipmentType: "barbell",
            isBodyweight: false,
            sequenceOrder: 1,
            targetSets: 3,
            targetReps: 8,
            restSeconds: 120
          }
        ]
      }
    ]
  };
}

function createCustomWorkoutTemplateDefinition() {
  return {
    template: {
      id: CUSTOM_WORKOUT_TEMPLATE_ID,
      programId: CUSTOM_WORKOUT_PROGRAM_ID,
      programName: "Custom Workout",
      name: "Custom Workout",
      sequenceOrder: 1,
      estimatedDurationMinutes: 45,
      isActive: true,
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
      updatedAt: new Date("2026-04-01T00:00:00.000Z")
    },
    exercises: []
  };
}

export const applicationUseCaseTestCases: ApplicationTestCase[] = [
  {
    name: "Guided recommendation prefers the closest schedule and experience match",
    run: () => {
      const programA = createProgramDefinition();
      const programB = {
        ...createProgramDefinition(),
        program: {
          ...createProgramDefinition().program,
          id: "program-2",
          name: "4-Day Upper/Lower",
          daysPerWeek: 4,
          sessionDurationMinutes: 45,
          difficultyLevel: "intermediate" as const
        }
      };

      const result = recommendGuidedProgram({
        answers: {
          goal: "general_fitness",
          experienceLevel: "beginner",
          daysPerWeek: 3,
          sessionDurationMinutes: 60,
          equipmentAccess: "full_gym",
          progressionAggressiveness: "balanced",
          recoveryPreference: "adjust_when_needed"
        },
        candidatePrograms: [programB, programA]
      });

      assert.equal(result.programId, "program-1");
    }
  },
  {
    name: "Guided recommendation supports richer V2 profiles (style preference + flexibility)",
    run: () => {
      const fullBody = createProgramDefinition();
      const fullBodyTemplate = fullBody.templates[0]!;
      const split: ProgramDefinition = {
        ...createProgramDefinition(),
        program: {
          ...createProgramDefinition().program,
          id: "program-2",
          name: "3-Day Split Beginner"
        },
        templates: [
          {
            ...fullBodyTemplate,
            id: "template-2",
            programId: "program-2",
            category: "Push"
          }
        ]
      };

      const answersV2 = {
        version: 2 as const,
        intakeDepth: "refined" as const,
        goal: "general_fitness" as const,
        experienceLevel: "beginner" as const,
        schedule: { daysPerWeek: 3 as const, flexibility: "very_flex" as const },
        sessions: { durationMinutes: 60 as const, flexibility: "strict" as const },
        equipment: { access: "full_gym" as const },
        preferences: {
          progressionAggressiveness: "balanced" as const,
          recoveryPreference: "adjust_when_needed" as const,
          trainingStylePreference: "full_body" as const
        }
      };

      const result = recommendGuidedProgram({
        answers: answersV2,
        candidatePrograms: [split, fullBody]
      });

      assert.equal(result.programId, "program-1");

      const flexResult = recommendGuidedProgram({
        answers: {
          ...answersV2,
          preferences: {
            ...answersV2.preferences,
            trainingStylePreference: "no_preference" as const
          },
          schedule: { ...answersV2.schedule, daysPerWeek: 3 as const, flexibility: "very_flex" as const }
        },
        candidatePrograms: [
          {
            ...fullBody,
            program: {
              ...fullBody.program,
              id: "program-3",
              name: "4-Day Full Body Beginner",
              daysPerWeek: 4
            }
          }
        ]
      });

      assert.equal(
        flexResult.warnings.some((warning) => warning.includes("days/week")),
        false
      );
      assert.equal(
        flexResult.reasons.some((reason) => reason.includes("Close to your schedule")),
        true
      );
    }
  },
  {
    name: "Program use-cases list active programs and create an enrollment",
    run: async () => {
      let createdEnrollmentTemplateId: string | null = null;

      const programRepository: ProgramRepository = {
        async listActive() {
          return [createProgramDefinition()];
        },
        async findActiveById() {
          return createProgramDefinition();
        },
        async createEnrollment(input) {
          createdEnrollmentTemplateId = input.currentWorkoutTemplateId;
          return {
            id: "enrollment-1",
            userId: input.userId,
            programId: input.programId,
            status: "active",
            startedAt: input.startedAt,
            completedAt: null,
            currentWorkoutTemplateId: input.currentWorkoutTemplateId,
            createdAt: input.startedAt,
            updatedAt: input.startedAt
          };
        }
      };

      const enrollmentRepository: EnrollmentRepository = {
        async findActiveByUserId() {
          return null;
        },
        async updateNextWorkoutTemplate() {
          throw new Error("Not implemented.");
        },
        async cancelEnrollment() {
          throw new Error("Not implemented.");
        }
      };

      const exerciseRepository: ExerciseRepository = {
        async listActive() {
          return [];
        },
        async findTemplateDefinitionById() {
          return null;
        },
        async findProgressionSeedsByExerciseIds() {
          return [];
        },
        async findActiveTemplatesByProgramId() {
          return [
            {
              id: "template-1",
              programId: "program-1",
              programName: "3-Day Full Body Beginner",
              name: "Workout A",
              sequenceOrder: 1,
              estimatedDurationMinutes: 60,
              isActive: true,
              createdAt: new Date("2026-04-01T00:00:00.000Z"),
              updatedAt: new Date("2026-04-01T00:00:00.000Z")
            }
          ];
        },
        async findByIds() {
          return [];
        },
        async findTemplateExerciseEntryIdsByTemplateIdAndSequenceOrders() {
          return [];
        }
        ,
        async appendWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async softDeleteWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        }
      };

      const workoutSessionRepository: WorkoutSessionRepository = {
        async findInProgressByUserId() {
          return null;
        },
        async findOwnedById() {
          return null;
        },
        async findOwnedSessionGraphById() {
          return null;
        },
        async findOwnedSetForLogging() {
          return null;
        },
        async createSessionGraph() {
          throw new Error("Not implemented.");
        },
        async appendCustomExercise() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutNameSnapshotIfDefault() {
          return false;
        },
        async appendWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateLoggedSet() {
          throw new Error("Not implemented.");
        },
        async persistExerciseEntryFeedback() {},
        async skipPendingWorkoutSets() {
          return 0;
        },
        async completeSession() {
          throw new Error("Not implemented.");
        },
        async cancelSession() {
          throw new Error("Not implemented.");
        },
        async listRecentCompletedByUserId() {
          return [];
        },
        async countCompletedByUserIdWithinRange() {
          return 0;
        },
        async countCompletedByUserId() {
          return 0;
        },
        async countCompletedByUserIdAndProgramId() {
          return 0;
        },
        async listCompletedProgressionByUserId() {
          return [];
        }
      };

      const listProgramsUseCase = new ListProgramsUseCase(programRepository);
      let createdTrainingContextSource: string | null = null;
      const trainingSettingsRepository: TrainingSettingsRepository = {
        async findOrCreateByUserId() {
          return {
            userId: "user-1",
            trainingGoal: null,
            experienceLevel: "beginner",
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
          };
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
        async create(input) {
          createdTrainingContextSource = input.source;
          return {
            id: "context-1",
            userId: input.userId,
            programId: input.programId,
            enrollmentId: input.enrollmentId ?? null,
            source: input.source,
            goalType: input.goalType,
            experienceLevel: input.experienceLevel,
            progressionPreferencesSnapshot: input.progressionPreferencesSnapshot,
            recoveryPreferencesSnapshot: input.recoveryPreferencesSnapshot,
            equipmentSettingsSnapshot: input.equipmentSettingsSnapshot,
            exerciseProgressionSettingsSnapshot: input.exerciseProgressionSettingsSnapshot,
            guidedAnswersSnapshot: input.guidedAnswersSnapshot ?? null,
            guidedRecommendationSnapshot: input.guidedRecommendationSnapshot ?? null,
            coachingEnabled: input.coachingEnabled ?? false,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
      };
      const followProgramUseCase = new FollowProgramUseCase(
        programRepository,
        enrollmentRepository,
        exerciseRepository,
        workoutSessionRepository,
        trainingSettingsRepository,
        exerciseProgressionSettingsRepository,
        programTrainingContextRepository,
        new MockTransactionManager()
      );

      const programsResult = await listProgramsUseCase.execute({
        context: { userId: "user-1", unitSystem: "imperial" }
      });
      const followResult = await followProgramUseCase.execute({
        context: { userId: "user-1", unitSystem: "imperial" },
        programId: "program-1"
      });

      assert.equal(programsResult.data.programs[0]?.workouts[0]?.exercises[0]?.exerciseName, "Bench Press");
      assert.equal(createdEnrollmentTemplateId, "template-1");
      assert.equal(followResult.data.activeProgram.nextWorkoutTemplate?.id, "template-1");
      assert.equal(followResult.data.activeProgram.currentPosition.label, "Week 1 · Day 1");
      assert.equal(createdTrainingContextSource, "predefined");
    }
  },
  {
    name: "CreateCustomProgramUseCase saves assigned workout days as reusable templates",
    run: async () => {
      const idempotency = createMockIdempotencyRepository();
      let persistedWorkoutNames: string[] = [];
      let persistedExerciseIds: string[] = [];

      const programRepository: ProgramRepository = {
        async listActive() {
          return [];
        },
        async findActiveById() {
          return null;
        },
        async createCustomProgram(input) {
          persistedWorkoutNames = input.workouts.map((workout) => workout.name);
          persistedExerciseIds = input.workouts.flatMap((workout) =>
            workout.exercises.map((exercise) => exercise.exerciseId)
          );

          return {
            program: {
              id: "custom-program-1",
              userId: input.userId,
              source: "custom",
              name: input.name,
              description: null,
              daysPerWeek: input.workouts.length,
              sessionDurationMinutes: 60,
              difficultyLevel: "beginner",
              trainingGoal: null,
              isActive: true,
              createdAt: input.createdAt,
              updatedAt: input.createdAt
            },
            templates: input.workouts.map((workout) => ({
              id: `custom-template-${workout.sequenceOrder}`,
              programId: "custom-program-1",
              name: workout.name,
              category: "Full Body",
              sequenceOrder: workout.sequenceOrder,
              estimatedDurationMinutes: null,
              exercises: workout.exercises.map((exercise, index) => ({
                id: `custom-template-entry-${workout.sequenceOrder}-${index + 1}`,
                exerciseId: exercise.exerciseId,
                exerciseName: exercise.exerciseId === "exercise-1" ? "Bench Press" : "Row",
                category: "compound",
                loggingModality: "reps_load",
                movementPattern: null,
                primaryMuscleGroup: null,
                equipmentType: "barbell",
                isBodyweight: false,
                sequenceOrder: index + 1,
                targetSets: exercise.targetSets,
                targetReps: exercise.targetReps,
                restSeconds: exercise.restSeconds
              }))
            }))
          };
        },
        async createEnrollment() {
          throw new Error("Not implemented.");
        }
      };

      let createdTrainingContextSource: string | null = null;
      const trainingSettingsRepository: TrainingSettingsRepository = {
        async findOrCreateByUserId() {
          return {
            userId: "user-1",
            trainingGoal: null,
            experienceLevel: "beginner",
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
          };
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
        async create(input) {
          createdTrainingContextSource = input.source;
          return {
            id: "context-1",
            userId: input.userId,
            programId: input.programId,
            enrollmentId: input.enrollmentId ?? null,
            source: input.source,
            goalType: input.goalType,
            experienceLevel: input.experienceLevel,
            progressionPreferencesSnapshot: input.progressionPreferencesSnapshot,
            recoveryPreferencesSnapshot: input.recoveryPreferencesSnapshot,
            equipmentSettingsSnapshot: input.equipmentSettingsSnapshot,
            exerciseProgressionSettingsSnapshot: input.exerciseProgressionSettingsSnapshot,
            guidedAnswersSnapshot: input.guidedAnswersSnapshot ?? null,
            guidedRecommendationSnapshot: input.guidedRecommendationSnapshot ?? null,
            coachingEnabled: input.coachingEnabled ?? false,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
      };

      const useCase = new CreateCustomProgramUseCase(
        programRepository,
        trainingSettingsRepository,
        exerciseProgressionSettingsRepository,
        programTrainingContextRepository,
        new MockTransactionManager(),
        idempotency.repository
      );

      const result = await useCase.execute({
        context: { userId: "user-1", unitSystem: "imperial" },
        request: {
          name: "Assigned Program",
          workouts: [
            {
              name: "Day 1: Push Strength",
              exercises: [{ exerciseId: "exercise-1", targetSets: 3, targetReps: 5 }]
            },
            {
              name: "Day 2: Pull Strength",
              exercises: [{ exerciseId: "exercise-2", targetSets: 4, targetReps: 8 }]
            }
          ]
        },
        idempotencyKey: "create-program-key-1"
      });

      assert.deepEqual(persistedWorkoutNames, ["Day 1: Push Strength", "Day 2: Pull Strength"]);
      assert.deepEqual(persistedExerciseIds, ["exercise-1", "exercise-2"]);
      assert.equal(result.data.program.source, "custom");
      assert.equal(result.data.program.workouts.length, 2);
      assert.equal(result.data.program.workouts[0]?.exercises[0]?.targetReps, 5);
      assert.equal(result.meta.replayed, false);
      assert.equal(createdTrainingContextSource, "manual");
    }
  },
  {
    name: "StartWorkoutSessionUseCase creates a session graph",
    run: async () => {
      const idempotency = createMockIdempotencyRepository();
      let createdSessionUserId: string | null = null;

      const workoutSessionRepository: WorkoutSessionRepository = {
        async findInProgressByUserId() {
          return null;
        },
        async findOwnedById() {
          return null;
        },
        async findOwnedSessionGraphById() {
          return null;
        },
        async findOwnedSetForLogging() {
          return null;
        },
        async createSessionGraph(input) {
          createdSessionUserId = input.session.userId;
          return createBaseWorkoutSessionGraph();
        },
        async appendCustomExercise() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutNameSnapshotIfDefault() {
          return false;
        },
        async appendWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateLoggedSet() {
          throw new Error("Not implemented.");
        },
        async persistExerciseEntryFeedback() {},
        async skipPendingWorkoutSets() {
          return 0;
        },
        async completeSession() {
          throw new Error("Not implemented.");
        },
        async cancelSession() {
          throw new Error("Not implemented.");
        },
        async listRecentCompletedByUserId() {
          return [];
        },
        async countCompletedByUserIdWithinRange() {
          return 0;
        },
        async countCompletedByUserId() {
          return 0;
        },
        async countCompletedByUserIdAndProgramId() {
          return 0;
        },
        async listCompletedProgressionByUserId() {
          return [];
        }
      };

      const enrollmentRepository: EnrollmentRepository = {
        async findActiveByUserId() {
          return {
            id: "enrollment-1",
            userId: "user-1",
            programId: "program-1",
            status: "active",
            startedAt: new Date("2026-04-01T00:00:00.000Z"),
            completedAt: null,
            currentWorkoutTemplateId: "template-1",
            createdAt: new Date("2026-04-01T00:00:00.000Z"),
            updatedAt: new Date("2026-04-01T00:00:00.000Z")
          };
        },
        async updateNextWorkoutTemplate() {
          throw new Error("Not implemented.");
        },
        async cancelEnrollment() {
          throw new Error("Not implemented.");
        }
      };

      const progressionStateRepository: ProgressionStateRepository = {
        async findByUserIdAndExerciseIds() {
          return [];
        },
        async createMany(inputs) {
          return inputs.map((input, index) => ({
            id: `progression-${index + 1}`,
            ...input,
            createdAt: new Date("2026-04-24T10:00:00.000Z"),
            updatedAt: new Date("2026-04-24T10:00:00.000Z")
          }));
        },
        async updateMany() {
          return [];
        }
      };

      const exerciseRepository: ExerciseRepository = {
        async listActive() {
          return [];
        },
        async findTemplateDefinitionById() {
          return {
            template: {
              id: "template-1",
              programId: "program-1",
              programName: "3-Day Full Body Beginner",
              name: "Workout A",
              sequenceOrder: 1,
              estimatedDurationMinutes: 60,
              isActive: true,
              createdAt: new Date("2026-04-01T00:00:00.000Z"),
              updatedAt: new Date("2026-04-01T00:00:00.000Z")
            },
            exercises: [
              {
                templateExercise: {
                  id: "template-exercise-1",
                  workoutTemplateId: "template-1",
                  exerciseId: "exercise-1",
                  sequenceOrder: 1,
                  targetSets: 3,
                  targetReps: 8,
                  restSeconds: 120,
                  createdAt: new Date("2026-04-01T00:00:00.000Z"),
                  updatedAt: new Date("2026-04-01T00:00:00.000Z")
                },
                exercise: {
                  id: "exercise-1",
                  name: "Bench Press",
                  category: "compound",
                  movementPattern: "push",
                  primaryMuscleGroup: "chest",
                  equipmentType: "barbell",
                  defaultTargetSets: 3,
                  defaultTargetReps: 8,
                  defaultStartingWeightLbs: 95,
                  defaultIncrementLbs: 5,
                  isBodyweight: false,
                  isWeightOptional: false,
                  isProgressionEligible: true,
                  loggingModality: "reps_load",
                  isActive: true,
                  createdAt: new Date("2026-04-01T00:00:00.000Z"),
                  updatedAt: new Date("2026-04-01T00:00:00.000Z")
                }
              }
            ]
          };
        },
        async findProgressionSeedsByExerciseIds() {
          return [
            {
              exerciseId: "exercise-1",
              exerciseName: "Bench Press",
              exerciseCategory: "compound",
              defaultStartingWeightLbs: 135,
              incrementLbs: 5,
              isBodyweight: false,
              isWeightOptional: false,
              isProgressionEligible: true
            }
          ];
        },
        async findActiveTemplatesByProgramId() {
          return [];
        },
        async findByIds() {
          return [];
        },
        async findTemplateExerciseEntryIdsByTemplateIdAndSequenceOrders() {
          return [];
        }
        ,
        async appendWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async softDeleteWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        }
      };

      const progressionStateV2Repository = defaultProgressionStateV2Repository;

      const useCase = new StartWorkoutSessionUseCase(
        workoutSessionRepository,
        enrollmentRepository,
        progressionStateRepository,
        defaultProgressionStateV2Repository,
        exerciseRepository,
        new MockTransactionManager(),
        idempotency.repository
      );

      const result = await useCase.execute({
        context: { userId: "user-1", unitSystem: "imperial" },
        request: {} satisfies StartWorkoutSessionRequest,
        idempotencyKey: "start-key-1"
      });

      assert.equal(createdSessionUserId, "user-1");
      assert.equal(result.data.id, "session-1");
      assert.equal(result.meta.replayed, false);
    }
  },
  {
    name: "StartWorkoutSessionUseCase can start a custom workout without an active enrollment",
    run: async () => {
      let createdSessionProgramId: string | null = null;
      let createdSessionTemplateId: string | null = null;

      const workoutSessionRepository: WorkoutSessionRepository = {
        async findInProgressByUserId() {
          return null;
        },
        async findOwnedById() {
          return null;
        },
        async findOwnedSessionGraphById() {
          return null;
        },
        async findOwnedSetForLogging() {
          return null;
        },
        async createSessionGraph(input) {
          createdSessionProgramId = input.session.programId;
          createdSessionTemplateId = input.session.workoutTemplateId;

          return {
            ...createBaseWorkoutSessionGraph(),
            session: {
              ...createBaseWorkoutSessionGraph().session,
              programId: input.session.programId,
              workoutTemplateId: input.session.workoutTemplateId,
              programNameSnapshot: input.session.programNameSnapshot,
              workoutNameSnapshot: input.session.workoutNameSnapshot
            },
            exerciseEntries: [],
            sets: []
          };
        },
        async appendCustomExercise() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutNameSnapshotIfDefault() {
          return false;
        },
        async appendWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateLoggedSet() {
          throw new Error("Not implemented.");
        },
        async persistExerciseEntryFeedback() {},
        async skipPendingWorkoutSets() {
          return 0;
        },
        async completeSession() {
          throw new Error("Not implemented.");
        },
        async cancelSession() {
          throw new Error("Not implemented.");
        },
        async listRecentCompletedByUserId() {
          return [];
        },
        async countCompletedByUserIdWithinRange() {
          return 0;
        },
        async countCompletedByUserId() {
          return 0;
        },
        async countCompletedByUserIdAndProgramId() {
          return 0;
        },
        async listCompletedProgressionByUserId() {
          return [];
        }
      };

      const enrollmentRepository: EnrollmentRepository = {
        async findActiveByUserId() {
          return null;
        },
        async updateNextWorkoutTemplate() {
          throw new Error("Not implemented.");
        },
        async cancelEnrollment() {
          throw new Error("Not implemented.");
        }
      };

      const progressionStateRepository: ProgressionStateRepository = {
        async findByUserIdAndExerciseIds() {
          return [];
        },
        async createMany() {
          return [];
        },
        async updateMany() {
          return [];
        }
      };

      const exerciseRepository: ExerciseRepository = {
        async listActive() {
          return [];
        },
        async findTemplateDefinitionById(templateId) {
          return templateId === CUSTOM_WORKOUT_TEMPLATE_ID
            ? createCustomWorkoutTemplateDefinition()
            : null;
        },
        async findProgressionSeedsByExerciseIds() {
          return [];
        },
        async findActiveTemplatesByProgramId() {
          return [];
        },
        async findByIds() {
          return [];
        },
        async findTemplateExerciseEntryIdsByTemplateIdAndSequenceOrders() {
          return [];
        }
        ,
        async appendWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async softDeleteWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        }
      };

      const progressionStateV2Repository = defaultProgressionStateV2Repository;

      const idempotency = createMockIdempotencyRepository();
      const useCase = new StartWorkoutSessionUseCase(
        workoutSessionRepository,
        enrollmentRepository,
        progressionStateRepository,
        defaultProgressionStateV2Repository,
        exerciseRepository,
        new MockTransactionManager(),
        idempotency.repository
      );

      const result = await useCase.execute({
        context: { userId: "user-1", unitSystem: "imperial" },
        request: {
          sessionType: "custom"
        },
        idempotencyKey: "start-custom-key-1"
      });

      assert.equal(createdSessionProgramId, CUSTOM_WORKOUT_PROGRAM_ID);
      assert.equal(createdSessionTemplateId, CUSTOM_WORKOUT_TEMPLATE_ID);
      assert.equal(result.data.sessionType, "custom");
      assert.equal(result.data.exercises.length, 0);
    }
  },
  {
    name: "StartWorkoutSessionUseCase rejects selected templates outside the active program",
    run: async () => {
      const idempotency = createMockIdempotencyRepository();

      const workoutSessionRepository: WorkoutSessionRepository = {
        async findInProgressByUserId() {
          return null;
        },
        async findOwnedById() {
          return null;
        },
        async findOwnedSessionGraphById() {
          return null;
        },
        async findOwnedSetForLogging() {
          return null;
        },
        async createSessionGraph() {
          throw new Error("Selected template should be rejected before session creation.");
        },
        async appendCustomExercise() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutNameSnapshotIfDefault() {
          return false;
        },
        async appendWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateLoggedSet() {
          throw new Error("Not implemented.");
        },
        async persistExerciseEntryFeedback() {},
        async skipPendingWorkoutSets() {
          return 0;
        },
        async completeSession() {
          throw new Error("Not implemented.");
        },
        async cancelSession() {
          throw new Error("Not implemented.");
        },
        async listRecentCompletedByUserId() {
          return [];
        },
        async countCompletedByUserIdWithinRange() {
          return 0;
        },
        async countCompletedByUserId() {
          return 0;
        },
        async countCompletedByUserIdAndProgramId() {
          return 0;
        },
        async listCompletedProgressionByUserId() {
          return [];
        }
      };

      const enrollmentRepository: EnrollmentRepository = {
        async findActiveByUserId() {
          return {
            id: "enrollment-1",
            userId: "user-1",
            programId: "program-1",
            status: "active",
            startedAt: new Date("2026-04-01T00:00:00.000Z"),
            completedAt: null,
            currentWorkoutTemplateId: "template-1",
            createdAt: new Date("2026-04-01T00:00:00.000Z"),
            updatedAt: new Date("2026-04-01T00:00:00.000Z")
          };
        },
        async updateNextWorkoutTemplate() {
          throw new Error("Not implemented.");
        },
        async cancelEnrollment() {
          throw new Error("Not implemented.");
        }
      };

      const progressionStateRepository: ProgressionStateRepository = {
        async findByUserIdAndExerciseIds() {
          return [];
        },
        async createMany() {
          return [];
        },
        async updateMany() {
          return [];
        }
      };

      const exerciseRepository: ExerciseRepository = {
        async listActive() {
          return [];
        },
        async findTemplateDefinitionById() {
          return {
            template: {
              id: "template-outside-active-program",
              programId: "program-2",
              programName: "Other Program",
              name: "Other Workout",
              sequenceOrder: 1,
              estimatedDurationMinutes: 45,
              isActive: true,
              createdAt: new Date("2026-04-01T00:00:00.000Z"),
              updatedAt: new Date("2026-04-01T00:00:00.000Z")
            },
            exercises: []
          };
        },
        async findProgressionSeedsByExerciseIds() {
          return [];
        },
        async findActiveTemplatesByProgramId() {
          return [];
        },
        async findByIds() {
          return [];
        },
        async findTemplateExerciseEntryIdsByTemplateIdAndSequenceOrders() {
          return [];
        }
        ,
        async appendWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async softDeleteWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        }
      };

      const useCase = new StartWorkoutSessionUseCase(
        workoutSessionRepository,
        enrollmentRepository,
        progressionStateRepository,
        defaultProgressionStateV2Repository,
        exerciseRepository,
        new MockTransactionManager(),
        idempotency.repository
      );

      await assert.rejects(
        () =>
          useCase.execute({
            context: { userId: "user-1", unitSystem: "imperial" },
            request: {
              workoutTemplateId: "template-outside-active-program"
            },
            idempotencyKey: "start-invalid-selected-key"
          }),
        (error: unknown) =>
          error instanceof WorkoutApplicationError && error.code === "WORKOUT_TEMPLATE_NOT_FOUND"
      );
    }
  },
  {
    name: "LogSetUseCase updates only valid pending sets",
    run: async () => {
      const idempotency = createMockIdempotencyRepository();
      const workoutGraph = createBaseWorkoutSessionGraph();
      const updatedGraph: WorkoutSessionGraph = {
        ...workoutGraph,
        sets: workoutGraph.sets.map((set) =>
          set.id === "set-1"
            ? {
                ...set,
                actualReps: 8,
                actualWeightLbs: 135,
                status: "completed",
                completedAt: new Date("2026-04-24T10:05:00.000Z")
              }
            : set
        )
      };

      const workoutSessionRepository: WorkoutSessionRepository = {
        async findInProgressByUserId() {
          return null;
        },
        async findOwnedById() {
          return null;
        },
        async findOwnedSessionGraphById() {
          return updatedGraph;
        },
        async findOwnedSetForLogging() {
          return {
            set: workoutGraph.sets[0]!,
            exerciseEntry: workoutGraph.exerciseEntries[0]!,
            workoutSession: workoutGraph.session
          };
        },
        async createSessionGraph() {
          throw new Error("Not implemented.");
        },
        async appendCustomExercise() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutNameSnapshotIfDefault() {
          return false;
        },
        async appendWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateLoggedSet() {
          return {
            set: updatedGraph.sets[0]!,
            exerciseEntry: updatedGraph.exerciseEntries[0]!,
            workoutSession: updatedGraph.session
          };
        },
        async persistExerciseEntryFeedback() {},
        async skipPendingWorkoutSets() {
          return 0;
        },
        async completeSession() {
          throw new Error("Not implemented.");
        },
        async cancelSession() {
          throw new Error("Not implemented.");
        },
        async listRecentCompletedByUserId() {
          return [];
        },
        async countCompletedByUserIdWithinRange() {
          return 0;
        },
        async countCompletedByUserId() {
          return 0;
        },
        async countCompletedByUserIdAndProgramId() {
          return 0;
        },
        async listCompletedProgressionByUserId() {
          return [];
        }
      };

      const useCase = new LogSetUseCase(
        workoutSessionRepository,
        new MockTransactionManager(),
        idempotency.repository
      );

      const result = await useCase.execute({
        context: { userId: "user-1", unitSystem: "imperial" },
        setId: "set-1",
        request: {
          actualReps: 8
        },
        idempotencyKey: "log-key-1"
      });

      assert.equal(result.data.set.id, "set-1");
      assert.equal(result.data.set.status, "completed");
      assert.equal(result.data.exerciseEntry.completedSetCount, 1);
      assert.equal(result.meta.replayed, false);
    }
  },
  {
    name: "LogSetUseCase supports reps_only logging (bodyweight reps)",
    run: async () => {
      const idempotency = createMockIdempotencyRepository();
      const base = createBaseWorkoutSessionGraph();

      const workoutGraph: WorkoutSessionGraph = {
        ...base,
        exerciseEntries: [
          {
            ...base.exerciseEntries[0]!,
            exerciseNameSnapshot: "Push-Up",
            loggingModalitySnapshot: "reps_only",
            targetReps: 12,
            targetWeightLbs: null
          }
        ],
        sets: base.sets.map((set) => ({
          ...set,
          targetReps: 12,
          targetWeightLbs: null
        }))
      };

      const updatedGraph: WorkoutSessionGraph = {
        ...workoutGraph,
        sets: workoutGraph.sets.map((set) =>
          set.id === "set-1"
            ? {
                ...set,
                actualReps: 12,
                actualWeightLbs: 0,
                status: "completed",
                completedAt: new Date("2026-04-24T10:05:00.000Z")
              }
            : set
        )
      };

      const workoutSessionRepository: WorkoutSessionRepository = {
        async findInProgressByUserId() {
          return null;
        },
        async findOwnedById() {
          return null;
        },
        async findOwnedSessionGraphById() {
          return updatedGraph;
        },
        async findOwnedSetForLogging() {
          return {
            set: workoutGraph.sets[0]!,
            exerciseEntry: workoutGraph.exerciseEntries[0]!,
            workoutSession: workoutGraph.session
          };
        },
        async createSessionGraph() {
          throw new Error("Not implemented.");
        },
        async appendCustomExercise() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutNameSnapshotIfDefault() {
          return false;
        },
        async appendWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateLoggedSet() {
          return {
            set: updatedGraph.sets[0]!,
            exerciseEntry: updatedGraph.exerciseEntries[0]!,
            workoutSession: updatedGraph.session
          };
        },
        async persistExerciseEntryFeedback() {},
        async skipPendingWorkoutSets() {
          return 0;
        },
        async completeSession() {
          throw new Error("Not implemented.");
        },
        async cancelSession() {
          throw new Error("Not implemented.");
        },
        async listRecentCompletedByUserId() {
          return [];
        },
        async countCompletedByUserIdWithinRange() {
          return 0;
        },
        async countCompletedByUserId() {
          return 0;
        },
        async countCompletedByUserIdAndProgramId() {
          return 0;
        },
        async listCompletedProgressionByUserId() {
          return [];
        }
      };

      const useCase = new LogSetUseCase(
        workoutSessionRepository,
        new MockTransactionManager(),
        idempotency.repository
      );

      const result = await useCase.execute({
        context: { userId: "user-1", unitSystem: "imperial" },
        setId: "set-1",
        request: { actualReps: 12 },
        idempotencyKey: "log-key-reps-only"
      });

      assert.equal(result.data.set.status, "completed");
      assert.equal(result.data.set.actualReps, 12);
      assert.equal(result.data.set.actualWeight?.value ?? 0, 0);
    }
  },
  {
    name: "LogSetUseCase supports hold/time logging (durationSeconds)",
    run: async () => {
      const idempotency = createMockIdempotencyRepository();
      const base = createBaseWorkoutSessionGraph();

      const workoutGraph: WorkoutSessionGraph = {
        ...base,
        exerciseEntries: [
          {
            ...base.exerciseEntries[0]!,
            exerciseNameSnapshot: "Plank",
            loggingModalitySnapshot: "hold",
            targetReps: null,
            targetWeightLbs: null,
            targetDurationSeconds: 30
          }
        ],
        sets: base.sets.map((set) => ({
          ...set,
          targetReps: null,
          targetWeightLbs: null,
          targetDurationSeconds: 30
        }))
      };

      const updatedGraph: WorkoutSessionGraph = {
        ...workoutGraph,
        sets: workoutGraph.sets.map((set) =>
          set.id === "set-1"
            ? {
                ...set,
                actualDurationSeconds: 45,
                status: "completed",
                completedAt: new Date("2026-04-24T10:05:00.000Z")
              }
            : set
        )
      };

      const workoutSessionRepository: WorkoutSessionRepository = {
        async findInProgressByUserId() {
          return null;
        },
        async findOwnedById() {
          return null;
        },
        async findOwnedSessionGraphById() {
          return updatedGraph;
        },
        async findOwnedSetForLogging() {
          return {
            set: workoutGraph.sets[0]!,
            exerciseEntry: workoutGraph.exerciseEntries[0]!,
            workoutSession: workoutGraph.session
          };
        },
        async createSessionGraph() {
          throw new Error("Not implemented.");
        },
        async appendCustomExercise() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutNameSnapshotIfDefault() {
          return false;
        },
        async appendWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateLoggedSet() {
          return {
            set: updatedGraph.sets[0]!,
            exerciseEntry: updatedGraph.exerciseEntries[0]!,
            workoutSession: updatedGraph.session
          };
        },
        async persistExerciseEntryFeedback() {},
        async skipPendingWorkoutSets() {
          return 0;
        },
        async completeSession() {
          throw new Error("Not implemented.");
        },
        async cancelSession() {
          throw new Error("Not implemented.");
        },
        async listRecentCompletedByUserId() {
          return [];
        },
        async countCompletedByUserIdWithinRange() {
          return 0;
        },
        async countCompletedByUserId() {
          return 0;
        },
        async countCompletedByUserIdAndProgramId() {
          return 0;
        },
        async listCompletedProgressionByUserId() {
          return [];
        }
      };

      const useCase = new LogSetUseCase(
        workoutSessionRepository,
        new MockTransactionManager(),
        idempotency.repository
      );

      const result = await useCase.execute({
        context: { userId: "user-1", unitSystem: "imperial" },
        setId: "set-1",
        request: { durationSeconds: 45 },
        idempotencyKey: "log-key-hold"
      });

      assert.equal(result.data.set.status, "completed");
      assert.equal(result.data.set.actualDurationSeconds, 45);
      assert.equal(result.data.set.actualReps, null);
    }
  },
  {
    name: "LogSetUseCase rejects invalid payloads for hold/time modality",
    run: async () => {
      const idempotency = createMockIdempotencyRepository();
      const base = createBaseWorkoutSessionGraph();

      const workoutGraph: WorkoutSessionGraph = {
        ...base,
        exerciseEntries: [
          {
            ...base.exerciseEntries[0]!,
            exerciseNameSnapshot: "Plank",
            loggingModalitySnapshot: "hold",
            targetReps: null,
            targetWeightLbs: null,
            targetDurationSeconds: 30
          }
        ],
        sets: base.sets.map((set) => ({
          ...set,
          targetReps: null,
          targetWeightLbs: null,
          targetDurationSeconds: 30
        }))
      };

      const workoutSessionRepository: WorkoutSessionRepository = {
        async findInProgressByUserId() {
          return null;
        },
        async findOwnedById() {
          return null;
        },
        async findOwnedSessionGraphById() {
          return workoutGraph;
        },
        async findOwnedSetForLogging() {
          return {
            set: workoutGraph.sets[0]!,
            exerciseEntry: workoutGraph.exerciseEntries[0]!,
            workoutSession: workoutGraph.session
          };
        },
        async createSessionGraph() {
          throw new Error("Not implemented.");
        },
        async appendCustomExercise() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutNameSnapshotIfDefault() {
          return false;
        },
        async appendWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateLoggedSet() {
          throw new Error("Not implemented.");
        },
        async persistExerciseEntryFeedback() {},
        async skipPendingWorkoutSets() {
          return 0;
        },
        async completeSession() {
          throw new Error("Not implemented.");
        },
        async cancelSession() {
          throw new Error("Not implemented.");
        },
        async listRecentCompletedByUserId() {
          return [];
        },
        async countCompletedByUserIdWithinRange() {
          return 0;
        },
        async countCompletedByUserId() {
          return 0;
        },
        async countCompletedByUserIdAndProgramId() {
          return 0;
        },
        async listCompletedProgressionByUserId() {
          return [];
        }
      };

      const useCase = new LogSetUseCase(
        workoutSessionRepository,
        new MockTransactionManager(),
        idempotency.repository
      );

      await assert.rejects(
        () =>
          useCase.execute({
            context: { userId: "user-1", unitSystem: "imperial" },
            setId: "set-1",
            request: { actualReps: 5 },
            idempotencyKey: "log-key-hold-invalid"
          }),
        (error: unknown) => error instanceof WorkoutApplicationError && error.code === "VALIDATION_ERROR"
      );
    }
  },
  {
    name: "LogSetUseCase supports time_distance logging (durationSeconds + distanceMeters)",
    run: async () => {
      const idempotency = createMockIdempotencyRepository();
      const base = createBaseWorkoutSessionGraph();

      const workoutGraph: WorkoutSessionGraph = {
        ...base,
        exerciseEntries: [
          {
            ...base.exerciseEntries[0]!,
            exerciseNameSnapshot: "Treadmill Run",
            loggingModalitySnapshot: "time_distance",
            targetReps: null,
            targetWeightLbs: null,
            targetDurationSeconds: 1200,
            targetDistanceMeters: 3218.688
          }
        ],
        sets: base.sets.map((set) => ({
          ...set,
          targetReps: null,
          targetWeightLbs: null,
          targetDurationSeconds: 1200,
          targetDistanceMeters: 3218.688
        }))
      };

      const updatedGraph: WorkoutSessionGraph = {
        ...workoutGraph,
        sets: workoutGraph.sets.map((set) =>
          set.id === "set-1"
            ? {
                ...set,
                actualDurationSeconds: 1500,
                actualDistanceMeters: 4023.36,
                status: "completed",
                completedAt: new Date("2026-04-24T10:25:00.000Z")
              }
            : set
        )
      };

      const workoutSessionRepository: WorkoutSessionRepository = {
        async findInProgressByUserId() {
          return null;
        },
        async findOwnedById() {
          return null;
        },
        async findOwnedSessionGraphById() {
          return updatedGraph;
        },
        async findOwnedSetForLogging() {
          return {
            set: workoutGraph.sets[0]!,
            exerciseEntry: workoutGraph.exerciseEntries[0]!,
            workoutSession: workoutGraph.session
          };
        },
        async createSessionGraph() {
          throw new Error("Not implemented.");
        },
        async appendCustomExercise() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutNameSnapshotIfDefault() {
          return false;
        },
        async appendWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateLoggedSet() {
          return {
            set: updatedGraph.sets[0]!,
            exerciseEntry: updatedGraph.exerciseEntries[0]!,
            workoutSession: updatedGraph.session
          };
        },
        async persistExerciseEntryFeedback() {},
        async skipPendingWorkoutSets() {
          return 0;
        },
        async completeSession() {
          throw new Error("Not implemented.");
        },
        async cancelSession() {
          throw new Error("Not implemented.");
        },
        async listRecentCompletedByUserId() {
          return [];
        },
        async countCompletedByUserIdWithinRange() {
          return 0;
        },
        async countCompletedByUserId() {
          return 0;
        },
        async countCompletedByUserIdAndProgramId() {
          return 0;
        },
        async listCompletedProgressionByUserId() {
          return [];
        }
      };

      const useCase = new LogSetUseCase(
        workoutSessionRepository,
        new MockTransactionManager(),
        idempotency.repository
      );

      const result = await useCase.execute({
        context: { userId: "user-1", unitSystem: "imperial" },
        setId: "set-1",
        request: { durationSeconds: 1500, distanceMeters: 4023.36 },
        idempotencyKey: "log-key-time-distance"
      });

      assert.equal(result.data.set.status, "completed");
      assert.equal(result.data.set.actualDurationSeconds, 1500);
      assert.equal(result.data.set.actualDistanceMeters, 4023.36);
    }
  },
  {
    name: "CompleteWorkoutSessionUseCase updates progression and advances template",
    run: async () => {
      const idempotency = createMockIdempotencyRepository();
      let completeSessionCallCount = 0;
      const inProgressGraph: WorkoutSessionGraph = {
        ...createBaseWorkoutSessionGraph(),
        sets: createBaseWorkoutSessionGraph().sets.map((set) => ({
          ...set,
          actualReps: 8,
          actualWeightLbs: 135,
          status: "completed",
          completedAt: new Date("2026-04-24T10:10:00.000Z")
        }))
      };
      const completedGraph: WorkoutSessionGraph = {
        ...inProgressGraph,
        session: {
          ...inProgressGraph.session,
          status: "completed",
          completedAt: new Date("2026-04-24T10:45:00.000Z"),
          durationSeconds: 2700
        },
        exerciseEntries: [
          {
            ...inProgressGraph.exerciseEntries[0]!,
            effortFeedback: "just_right",
            completedAt: new Date("2026-04-24T10:45:00.000Z")
          }
        ],
        sets: inProgressGraph.sets.map((set) => ({
          ...set,
          actualReps: 8,
          actualWeightLbs: 135,
          status: "completed",
          completedAt: new Date("2026-04-24T10:10:00.000Z")
        }))
      };

      let updatedNextTemplateId: string | null = null;
      let updatedProgressionWeight: number | null = null;

      const workoutSessionRepository: WorkoutSessionRepository = {
        async findInProgressByUserId() {
          return null;
        },
        async findOwnedById() {
          return null;
        },
        async findOwnedSessionGraphById(_userId, _sessionId) {
          return completeSessionCallCount++ === 0 ? inProgressGraph : completedGraph;
        },
        async findOwnedSetForLogging() {
          return null;
        },
        async createSessionGraph() {
          throw new Error("Not implemented.");
        },
        async appendCustomExercise() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutNameSnapshotIfDefault() {
          return false;
        },
        async appendWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateLoggedSet() {
          throw new Error("Not implemented.");
        },
        async persistExerciseEntryFeedback() {},
        async skipPendingWorkoutSets() {
          return 0;
        },
        async completeSession(input) {
          return {
            ...completedGraph.session,
            status: "completed",
            completedAt: input.completedAt,
            durationSeconds: input.durationSeconds,
            isPartial: input.isPartial,
            userEffortFeedback: input.userEffortFeedback
          };
        },
        async cancelSession() {
          throw new Error("Not implemented.");
        },
        async listRecentCompletedByUserId() {
          return [];
        },
        async countCompletedByUserIdWithinRange() {
          return 0;
        },
        async countCompletedByUserId() {
          return 0;
        },
        async countCompletedByUserIdAndProgramId() {
          return 0;
        },
        async listCompletedProgressionByUserId() {
          return [];
        }
      };

      const enrollmentRepository: EnrollmentRepository = {
        async findActiveByUserId() {
          return {
            id: "enrollment-1",
            userId: "user-1",
            programId: "program-1",
            status: "active",
            startedAt: new Date("2026-04-01T00:00:00.000Z"),
            completedAt: null,
            currentWorkoutTemplateId: "template-1",
            createdAt: new Date("2026-04-01T00:00:00.000Z"),
            updatedAt: new Date("2026-04-01T00:00:00.000Z")
          };
        },
        async updateNextWorkoutTemplate(input) {
          updatedNextTemplateId = input.nextWorkoutTemplateId;
          return {
            id: "enrollment-1",
            userId: "user-1",
            programId: "program-1",
            status: "active",
            startedAt: new Date("2026-04-01T00:00:00.000Z"),
            completedAt: null,
            currentWorkoutTemplateId: input.nextWorkoutTemplateId,
            createdAt: new Date("2026-04-01T00:00:00.000Z"),
            updatedAt: new Date("2026-04-24T10:45:00.000Z")
          };
        },
        async cancelEnrollment() {
          throw new Error("Not implemented.");
        }
      };

      const progressionStateRepository: ProgressionStateRepository = {
        async findByUserIdAndExerciseIds() {
          return [
            {
              id: "progression-1",
              userId: "user-1",
              exerciseId: "exercise-1",
              currentWeightLbs: 135,
              lastCompletedWeightLbs: 130,
              consecutiveFailures: 0,
              lastEffortFeedback: "just_right",
              lastPerformedAt: new Date("2026-04-20T10:00:00.000Z"),
              createdAt: new Date("2026-04-01T00:00:00.000Z"),
              updatedAt: new Date("2026-04-20T10:00:00.000Z")
            }
          ];
        },
        async createMany() {
          return [];
        },
        async updateMany(inputs) {
          updatedProgressionWeight = inputs[0]?.currentWeightLbs ?? null;
          return inputs.map((input) => ({
            id: "progression-1",
            ...input,
            createdAt: new Date("2026-04-01T00:00:00.000Z"),
            updatedAt: new Date("2026-04-24T10:45:00.000Z")
          }));
        }
      };

      const progressionStateV2RepositoryCustom = createMockProgressionStateV2Repository({
        findRows: [
          {
            id: "progression-v2-1",
            userId: "user-1",
            workoutTemplateExerciseEntryId: "template-exercise-1",
            currentWeightLbs: 135,
            lastCompletedWeightLbs: 130,
            repGoal: 8,
            repRangeMin: 8,
            repRangeMax: 8,
            consecutiveFailures: 0,
            lastEffortFeedback: "just_right",
            lastPerformedAt: new Date("2026-04-20T10:00:00.000Z"),
            createdAt: new Date("2026-04-01T00:00:00.000Z"),
            updatedAt: new Date("2026-04-20T10:00:00.000Z")
          }
        ]
      });

      const exerciseRepository: ExerciseRepository = {
        async listActive() {
          return [];
        },
        async findTemplateDefinitionById() {
          return null;
        },
        async findProgressionSeedsByExerciseIds() {
          return [
            {
              exerciseId: "exercise-1",
              exerciseName: "Bench Press",
              exerciseCategory: "compound",
              defaultStartingWeightLbs: 135,
              incrementLbs: 5,
              isBodyweight: false,
              isWeightOptional: false,
              isProgressionEligible: true
            }
          ];
        },
        async findActiveTemplatesByProgramId() {
          return [
            {
              id: "template-1",
              programId: "program-1",
              programName: "3-Day Full Body Beginner",
              name: "Workout A",
              sequenceOrder: 1,
              estimatedDurationMinutes: 60,
              isActive: true,
              createdAt: new Date("2026-04-01T00:00:00.000Z"),
              updatedAt: new Date("2026-04-01T00:00:00.000Z")
            },
            {
              id: "template-2",
              programId: "program-1",
              programName: "3-Day Full Body Beginner",
              name: "Workout B",
              sequenceOrder: 2,
              estimatedDurationMinutes: 55,
              isActive: true,
              createdAt: new Date("2026-04-01T00:00:00.000Z"),
              updatedAt: new Date("2026-04-01T00:00:00.000Z")
            }
          ];
        },
        async findByIds() {
          return [];
        },
        async findTemplateExerciseEntryIdsByTemplateIdAndSequenceOrders() {
          return [];
        }
        ,
        async appendWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async softDeleteWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        }
      };

      const progressMetricRepository: ProgressMetricRepository = {
        async createMany(inputs) {
          return inputs.map((input, index) => ({
            id: `metric-${index + 1}`,
            ...input,
            createdAt: input.recordedAt
          }));
        },
        async listRecentByUserId() {
          return [];
        }
      };

      const progressionRecommendationEventRepository: ProgressionRecommendationEventRepository = {
        async createMany(inputs) {
          return inputs.map((input, index) => ({
            id: `event-${index + 1}`,
            ...input,
            createdAt: new Date()
          }));
        },
        async listRecentByUserId() {
          return [];
        }
      };

      const useCase = new CompleteWorkoutSessionUseCase(
        workoutSessionRepository,
        enrollmentRepository,
        progressionStateRepository,
        progressionStateV2RepositoryCustom,
        exerciseRepository,
        { findTrainingProfile: async () => ({ experienceLevel: null, trainingGoal: null }) } as any,
        { findActiveById: async () => ({ program: { trainingGoal: null } }) } as any,
        progressMetricRepository,
        progressionRecommendationEventRepository,
        {
          findOrCreateByUserId: async (userId: string) => ({
            userId,
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
          }),
          updateByUserId: async (userId: string) => ({
            userId,
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
          })
        } as any,
        {
          findByUserIdAndExerciseId: async () => null,
          upsert: async (record: any) => record
        } as any,
        new MockTransactionManager(),
        idempotency.repository
      );

      const result = await useCase.execute({
        context: { userId: "user-1", unitSystem: "imperial" },
        sessionId: "session-1",
        request: {
          completedAt: "2026-04-24T10:45:00.000Z",
          exerciseFeedback: [
            {
              exerciseEntryId: "entry-1",
              effortFeedback: "just_right"
            }
          ],
          userEffortFeedback: "just_right"
        },
        idempotencyKey: "complete-key-1"
      });

      assert.equal(updatedProgressionWeight, 140);
      assert.equal(updatedNextTemplateId, "template-2");
      assert.equal(result.data.progressionUpdates[0]?.nextWeight.value, 140);
      assert.equal(result.data.nextWorkoutTemplate?.id, "template-2");
      assert.equal(result.meta.replayed, false);
    }
  },
  {
    name: "CompleteWorkoutSessionUseCase finishing early skips pending sets and returns a clear skipped progression reason",
    run: async () => {
      const idempotency = createMockIdempotencyRepository();
      let graphReadCount = 0;
      let skippedSetUpdateCount = 0;

      const inProgressGraph: WorkoutSessionGraph = {
        ...createBaseWorkoutSessionGraph(),
        session: {
          ...createBaseWorkoutSessionGraph().session,
          programId: CUSTOM_WORKOUT_PROGRAM_ID
        },
        sets: createBaseWorkoutSessionGraph().sets.map((set) =>
          set.setNumber === 1
            ? {
                ...set,
                actualReps: 8,
                actualWeightLbs: 135,
                status: "completed",
                completedAt: new Date("2026-04-24T10:10:00.000Z")
              }
            : set
        )
      };

      let completedGraph: WorkoutSessionGraph | null = null;

      const workoutSessionRepository: WorkoutSessionRepository = {
        async findInProgressByUserId() {
          return null;
        },
        async findOwnedById() {
          return null;
        },
        async findOwnedSessionGraphById() {
          return graphReadCount++ === 0 ? inProgressGraph : completedGraph;
        },
        async findOwnedSetForLogging() {
          return null;
        },
        async createSessionGraph() {
          throw new Error("Not implemented.");
        },
        async appendCustomExercise() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutNameSnapshotIfDefault() {
          return false;
        },
        async appendWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateLoggedSet() {
          throw new Error("Not implemented.");
        },
        async persistExerciseEntryFeedback() {},
        async skipPendingWorkoutSets() {
          skippedSetUpdateCount += inProgressGraph.sets.filter((set) => set.status === "pending").length;
          inProgressGraph.sets = inProgressGraph.sets.map((set) =>
            set.status === "pending"
              ? {
                  ...set,
                  status: "skipped",
                  completedAt: new Date("2026-04-24T10:30:00.000Z")
                }
              : set
          );
          return skippedSetUpdateCount;
        },
        async completeSession(input) {
          completedGraph = {
            ...inProgressGraph,
            session: {
              ...inProgressGraph.session,
              status: "completed",
              completedAt: input.completedAt,
              durationSeconds: input.durationSeconds,
              isPartial: input.isPartial,
              userEffortFeedback: input.userEffortFeedback
            },
            sets: [...inProgressGraph.sets]
          };

          return completedGraph.session;
        },
        async cancelSession() {
          throw new Error("Not implemented.");
        },
        async listRecentCompletedByUserId() {
          return [];
        },
        async countCompletedByUserIdWithinRange() {
          return 0;
        },
        async countCompletedByUserId() {
          return 0;
        },
        async countCompletedByUserIdAndProgramId() {
          return 0;
        },
        async listCompletedProgressionByUserId() {
          return [];
        }
      };

      const enrollmentRepository: EnrollmentRepository = {
        async findActiveByUserId() {
          return null;
        },
        async updateNextWorkoutTemplate() {
          throw new Error("Not implemented.");
        },
        async cancelEnrollment() {
          throw new Error("Not implemented.");
        }
      };

      const progressionStateRepository: ProgressionStateRepository = {
        async findByUserIdAndExerciseIds() {
          return [];
        },
        async createMany() {
          return [];
        },
        async updateMany() {
          return [];
        }
      };

      const progressionStateV2Repository = defaultProgressionStateV2Repository;

      const exerciseRepository: ExerciseRepository = {
        async listActive() {
          return [];
        },
        async findTemplateDefinitionById() {
          return null;
        },
        async findProgressionSeedsByExerciseIds() {
          return [
            {
              exerciseId: "exercise-1",
              exerciseName: "Bench Press",
              exerciseCategory: "compound",
              defaultStartingWeightLbs: 135,
              incrementLbs: 5,
              isBodyweight: false,
              isWeightOptional: false,
              isProgressionEligible: true
            }
          ];
        },
        async findActiveTemplatesByProgramId() {
          return [];
        },
        async findByIds() {
          return [];
        },
        async findTemplateExerciseEntryIdsByTemplateIdAndSequenceOrders() {
          return [];
        }
        ,
        async appendWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async softDeleteWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        }
      };

      const progressMetricRepository: ProgressMetricRepository = {
        async createMany() {
          return [];
        },
        async listRecentByUserId() {
          return [];
        }
      };

      const progressionRecommendationEventRepository: ProgressionRecommendationEventRepository = {
        async createMany(inputs) {
          return inputs.map((input, index) => ({
            id: `event-${index + 1}`,
            ...input,
            createdAt: new Date()
          }));
        },
        async listRecentByUserId() {
          return [];
        }
      };

      const useCase = new CompleteWorkoutSessionUseCase(
        workoutSessionRepository,
        enrollmentRepository,
        progressionStateRepository,
        defaultProgressionStateV2Repository,
        exerciseRepository,
        { findTrainingProfile: async () => ({ experienceLevel: null, trainingGoal: null }) } as any,
        { findActiveById: async () => ({ program: { trainingGoal: null } }) } as any,
        progressMetricRepository,
        progressionRecommendationEventRepository,
        {
          findOrCreateByUserId: async (userId: string) => ({
            userId,
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
          }),
          updateByUserId: async (userId: string) => ({
            userId,
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
          })
        } as any,
        {
          findByUserIdAndExerciseId: async () => null,
          upsert: async (record: any) => record
        } as any,
        new MockTransactionManager(),
        idempotency.repository
      );

      const result = await useCase.execute({
        context: { userId: "user-1", unitSystem: "imperial" },
        sessionId: "session-1",
        request: {
          exerciseFeedback: [],
          finishEarly: true
        },
        idempotencyKey: "complete-early-key-1"
      });

      assert.equal(skippedSetUpdateCount, 2);
      assert.equal(result.data.workoutSession.isPartial, true);
      assert.equal(
        result.data.workoutSession.exercises.flatMap((exercise) => exercise.sets).some((set) => set.status === "pending"),
        false
      );
      assert.equal(result.data.progressionUpdates[0]?.result, "skipped");
      assert.match(result.data.progressionUpdates[0]?.reason ?? "", /partially completed/);
    }
  },
  {
    name: "CompleteWorkoutSessionUseCase completes without effort feedback and defaults effort to just_right",
    run: async () => {
      const idempotency = createMockIdempotencyRepository();
      let graphReadCount = 0;

      const baseGraph = createBaseWorkoutSessionGraph();
      const inProgressGraph: WorkoutSessionGraph = {
        ...baseGraph,
        session: {
          ...baseGraph.session,
          programId: CUSTOM_WORKOUT_PROGRAM_ID
        },
        sets: baseGraph.sets.map((set) => ({
          ...set,
          actualReps: 8,
          actualWeightLbs: 135,
          status: "completed",
          completedAt: new Date("2026-04-24T10:10:00.000Z")
        }))
      };

      let completedGraph: WorkoutSessionGraph | null = null;

      const workoutSessionRepository: WorkoutSessionRepository = {
        async findInProgressByUserId() {
          return null;
        },
        async findOwnedById() {
          return null;
        },
        async findOwnedSessionGraphById() {
          return graphReadCount++ === 0 ? inProgressGraph : completedGraph;
        },
        async findOwnedSetForLogging() {
          return null;
        },
        async createSessionGraph() {
          throw new Error("Not implemented.");
        },
        async appendCustomExercise() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutNameSnapshotIfDefault() {
          return false;
        },
        async appendWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateLoggedSet() {
          throw new Error("Not implemented.");
        },
        async persistExerciseEntryFeedback() {},
        async skipPendingWorkoutSets() {
          return 0;
        },
        async completeSession(input) {
          completedGraph = {
            ...inProgressGraph,
            session: {
              ...inProgressGraph.session,
              status: "completed",
              completedAt: input.completedAt,
              durationSeconds: input.durationSeconds,
              isPartial: input.isPartial,
              userEffortFeedback: input.userEffortFeedback
            },
            sets: [...inProgressGraph.sets]
          };

          return completedGraph.session;
        },
        async cancelSession() {
          throw new Error("Not implemented.");
        },
        async listRecentCompletedByUserId() {
          return [];
        },
        async countCompletedByUserIdWithinRange() {
          return 0;
        },
        async countCompletedByUserId() {
          return 0;
        },
        async countCompletedByUserIdAndProgramId() {
          return 0;
        },
        async listCompletedProgressionByUserId() {
          return [];
        }
      };

      const enrollmentRepository: EnrollmentRepository = {
        async findActiveByUserId() {
          return null;
        },
        async updateNextWorkoutTemplate() {
          throw new Error("Not implemented.");
        },
        async cancelEnrollment() {
          throw new Error("Not implemented.");
        }
      };

      const progressionStateRepository: ProgressionStateRepository = {
        async findByUserIdAndExerciseIds() {
          return [];
        },
        async createMany() {
          return [];
        },
        async updateMany() {
          return [];
        }
      };

      const exerciseRepository: ExerciseRepository = {
        async listActive() {
          return [];
        },
        async findTemplateDefinitionById() {
          return null;
        },
        async findProgressionSeedsByExerciseIds() {
          return [
            {
              exerciseId: "exercise-1",
              exerciseName: "Bench Press",
              exerciseCategory: "compound",
              defaultStartingWeightLbs: 135,
              incrementLbs: 5,
              isBodyweight: false,
              isWeightOptional: false,
              isProgressionEligible: true
            }
          ];
        },
        async findActiveTemplatesByProgramId() {
          return [];
        },
        async findByIds() {
          return [];
        },
        async findTemplateExerciseEntryIdsByTemplateIdAndSequenceOrders() {
          return [];
        }
        ,
        async appendWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async softDeleteWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        }
      };

      const progressMetricRepository: ProgressMetricRepository = {
        async createMany() {
          return [];
        },
        async listRecentByUserId() {
          return [];
        }
      };

      const progressionRecommendationEventRepository: ProgressionRecommendationEventRepository = {
        async createMany(inputs) {
          return inputs.map((input, index) => ({
            id: `event-${index + 1}`,
            ...input,
            createdAt: new Date()
          }));
        },
        async listRecentByUserId() {
          return [];
        }
      };

      const useCase = new CompleteWorkoutSessionUseCase(
        workoutSessionRepository,
        enrollmentRepository,
        progressionStateRepository,
        defaultProgressionStateV2Repository,
        exerciseRepository,
        { findTrainingProfile: async () => ({ experienceLevel: null, trainingGoal: null }) } as any,
        { findActiveById: async () => ({ program: { trainingGoal: null } }) } as any,
        progressMetricRepository,
        progressionRecommendationEventRepository,
        {
          findOrCreateByUserId: async (userId: string) => ({
            userId,
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
          }),
          updateByUserId: async (userId: string) => ({
            userId,
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
          })
        } as any,
        {
          findByUserIdAndExerciseId: async () => null,
          upsert: async (record: any) => record
        } as any,
        new MockTransactionManager(),
        idempotency.repository
      );

      const result = await useCase.execute({
        context: { userId: "user-1", unitSystem: "imperial" },
        sessionId: "session-1",
        request: {
          exerciseFeedback: []
        },
        idempotencyKey: "complete-missing-feedback-key-1"
      });

      assert.equal(result.data.workoutSession.status, "completed");
      assert.equal(result.data.workoutSession.isPartial, false);
      assert.equal(result.data.progressionUpdates.length, 1);
      assert.equal(result.data.progressionUpdates[0]?.result, "increased");
      assert.equal(result.data.progressionUpdates[0]?.confidence, "medium");
      assert.equal(result.data.progressionUpdates[0]?.nextWeight.value, 140);
    }
  },
  {
    name: "CompleteWorkoutSessionUseCase marks high confidence and increases weight on very easy 5+ RIR performance (no history)",
    run: async () => {
      const idempotency = createMockIdempotencyRepository();
      let graphReadCount = 0;

      const baseGraph = createBaseWorkoutSessionGraph();
      const inProgressGraph: WorkoutSessionGraph = {
        ...baseGraph,
        session: {
          ...baseGraph.session,
          programId: CUSTOM_WORKOUT_PROGRAM_ID
        },
        exerciseEntries: [
          {
            ...baseGraph.exerciseEntries[0]!,
            targetWeightLbs: 95,
            targetReps: 8
          }
        ],
        sets: baseGraph.sets.map((set) => ({
          ...set,
          actualReps: 8,
          actualWeightLbs: 95,
          targetReps: 8,
          targetWeightLbs: 95,
          status: "completed",
          rir: "rir_5_plus",
          completedAt: new Date("2026-04-24T10:10:00.000Z")
        }))
      };

      let completedGraph: WorkoutSessionGraph | null = null;

      const workoutSessionRepository: WorkoutSessionRepository = {
        async findInProgressByUserId() {
          return null;
        },
        async findOwnedById() {
          return null;
        },
        async findOwnedSessionGraphById() {
          return graphReadCount++ === 0 ? inProgressGraph : completedGraph;
        },
        async findOwnedSetForLogging() {
          return null;
        },
        async createSessionGraph() {
          throw new Error("Not implemented.");
        },
        async appendCustomExercise() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutNameSnapshotIfDefault() {
          return false;
        },
        async appendWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateLoggedSet() {
          throw new Error("Not implemented.");
        },
        async persistExerciseEntryFeedback() {},
        async skipPendingWorkoutSets() {
          return 0;
        },
        async completeSession(input) {
          completedGraph = {
            ...inProgressGraph,
            session: {
              ...inProgressGraph.session,
              status: "completed",
              completedAt: input.completedAt,
              durationSeconds: input.durationSeconds,
              isPartial: input.isPartial,
              userEffortFeedback: input.userEffortFeedback,
              recoveryState: input.recoveryState
            },
            sets: [...inProgressGraph.sets]
          };

          return completedGraph.session;
        },
        async cancelSession() {
          throw new Error("Not implemented.");
        },
        async listRecentCompletedByUserId() {
          return [];
        },
        async countCompletedByUserIdWithinRange() {
          return 0;
        },
        async countCompletedByUserId() {
          return 0;
        },
        async countCompletedByUserIdAndProgramId() {
          return 0;
        },
        async listCompletedProgressionByUserId() {
          return [];
        }
      };

      const enrollmentRepository: EnrollmentRepository = {
        async findActiveByUserId() {
          return null;
        },
        async updateNextWorkoutTemplate() {
          throw new Error("Not implemented.");
        },
        async cancelEnrollment() {
          throw new Error("Not implemented.");
        }
      };

      const progressionStateRepository: ProgressionStateRepository = {
        async findByUserIdAndExerciseIds() {
          return [];
        },
        async createMany() {
          return [];
        },
        async updateMany() {
          return [];
        }
      };

      const exerciseRepository: ExerciseRepository = {
        async listActive() {
          return [];
        },
        async findTemplateDefinitionById() {
          return null;
        },
        async findProgressionSeedsByExerciseIds() {
          return [
            {
              exerciseId: "exercise-1",
              exerciseName: "Bench Press",
              exerciseCategory: "compound",
              defaultStartingWeightLbs: 95,
              incrementLbs: 5,
              isBodyweight: false,
              isWeightOptional: false,
              isProgressionEligible: true
            }
          ];
        },
        async findActiveTemplatesByProgramId() {
          return [];
        },
        async findByIds() {
          return [];
        },
        async findTemplateExerciseEntryIdsByTemplateIdAndSequenceOrders() {
          return [];
        },
        async appendWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async softDeleteWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        }
      };

      const progressMetricRepository: ProgressMetricRepository = {
        async createMany() {
          return [];
        },
        async listRecentByUserId() {
          return [];
        }
      };

      const progressionRecommendationEventRepository: ProgressionRecommendationEventRepository = {
        async createMany(inputs) {
          return inputs.map((input, index) => ({
            id: `event-${index + 1}`,
            ...input,
            createdAt: new Date()
          }));
        },
        async listRecentByUserId() {
          return [];
        }
      };

      const useCase = new CompleteWorkoutSessionUseCase(
        workoutSessionRepository,
        enrollmentRepository,
        progressionStateRepository,
        defaultProgressionStateV2Repository,
        exerciseRepository,
        { findTrainingProfile: async () => ({ experienceLevel: null, trainingGoal: null }) } as any,
        { findActiveById: async () => ({ program: { trainingGoal: null } }) } as any,
        progressMetricRepository,
        progressionRecommendationEventRepository,
        {
          findOrCreateByUserId: async (userId: string) => ({
            userId,
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
          }),
          updateByUserId: async (userId: string) => ({
            userId,
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
          })
        } as any,
        {
          findByUserIdAndExerciseId: async () => ({
            userId: "user-1",
            exerciseId: "exercise-1",
            progressionStrategy: null,
            repRangeMin: 8,
            repRangeMax: 12,
            incrementOverrideLbs: null,
            maxJumpPerSessionLbs: null,
            bodyweightProgressionMode: null
          }),
          upsert: async (record: any) => record
        } as any,
        new MockTransactionManager(),
        idempotency.repository
      );

      const result = await useCase.execute({
        context: { userId: "user-1", unitSystem: "imperial" },
        sessionId: "session-1",
        request: {
          exerciseFeedback: [{ exerciseEntryId: "entry-1", effortFeedback: "too_easy" }],
          recoveryState: "fresh"
        },
        idempotencyKey: "complete-too-easy-5plus-rir-key-1"
      });

      assert.equal(result.data.workoutSession.status, "completed");
      assert.equal(result.data.workoutSession.isPartial, false);
      assert.equal(result.data.progressionUpdates.length, 1);
      assert.equal(result.data.progressionUpdates[0]?.result, "increased");
      assert.equal(result.data.progressionUpdates[0]?.confidence, "high");
      assert.equal(result.data.progressionUpdates[0]?.previousWeight.value, 95);
      assert.equal(result.data.progressionUpdates[0]?.nextWeight.value, 100);
      assert.equal(result.data.progressionUpdates[0]?.previousRepGoal, 8);
      assert.equal(result.data.progressionUpdates[0]?.nextRepGoal, 10);
    }
  },
  {
    name: "CompleteWorkoutSessionUseCase keeps exercise-level effort working when no set-level effort exists",
    run: async () => {
      const data = await completeSingleExerciseWorkoutScenario({
        idempotencyKey: "effort-hierarchy-exercise-only-key-1",
        exerciseFeedback: "too_easy",
        recoveryState: "fresh",
        setOverrides: [
          { rir: null, failureStatus: null },
          { rir: null, failureStatus: null },
          { rir: null, failureStatus: null }
        ]
      });

      assert.equal(data.progressionUpdates.length, 1);
      assert.equal(data.progressionUpdates[0]?.result, "increased");
      assert.equal(data.progressionUpdates[0]?.nextWeight.value, 95);
      assert.equal(data.progressionUpdates[0]?.nextRepGoal, 10);
      assert.equal(data.progressionUpdates[0]?.confidence, "medium");
      assert.ok(data.progressionUpdates[0]?.reasonCodes.includes("EXERCISE_LEVEL_EFFORT_USED"));
      assert.ok(!data.progressionUpdates[0]?.reasonCodes.includes("SET_LEVEL_EFFORT_USED"));
    }
  },
  {
    name: "CompleteWorkoutSessionUseCase treats RIR 5+ plus too_hard feedback as conflicting and reduces confidence",
    run: async () => {
      const data = await completeSingleExerciseWorkoutScenario({
        idempotencyKey: "effort-hierarchy-conflict-rir5-too-hard-key-1",
        exerciseFeedback: "too_hard",
        recoveryState: "fresh",
        setOverrides: [
          { rir: "rir_5_plus", failureStatus: null },
          { rir: "rir_5_plus", failureStatus: null },
          { rir: "rir_5_plus", failureStatus: null }
        ]
      });

      assert.equal(data.progressionUpdates.length, 1);
      assert.equal(data.progressionUpdates[0]?.result, "repeated");
      assert.equal(data.progressionUpdates[0]?.nextWeight.value, 95);
      assert.equal(data.progressionUpdates[0]?.nextRepGoal, 8);
      assert.equal(data.progressionUpdates[0]?.confidence, "low");
      assert.ok(data.progressionUpdates[0]?.reasonCodes.includes("CONFLICTING_EFFORT_SIGNALS"));
      assert.ok(data.progressionUpdates[0]?.reasonCodes.includes("SET_LEVEL_EFFORT_USED"));
      assert.ok(data.progressionUpdates[0]?.reasonCodes.includes("HIGH_RIR_REPORTED"));
    }
  },
  {
    name: "CompleteWorkoutSessionUseCase treats muscular failure plus too_easy feedback as conflicting and reduces confidence",
    run: async () => {
      const data = await completeSingleExerciseWorkoutScenario({
        idempotencyKey: "effort-hierarchy-conflict-failure-too-easy-key-1",
        exerciseFeedback: "too_easy",
        recoveryState: "fresh",
        setOverrides: [
          { rir: null, failureStatus: "muscular_failure" },
          { rir: null, failureStatus: null },
          { rir: null, failureStatus: null }
        ]
      });

      assert.equal(data.progressionUpdates.length, 1);
      assert.equal(data.progressionUpdates[0]?.result, "repeated");
      assert.equal(data.progressionUpdates[0]?.nextWeight.value, 95);
      assert.equal(data.progressionUpdates[0]?.nextRepGoal, 8);
      assert.equal(data.progressionUpdates[0]?.confidence, "low");
      assert.ok(data.progressionUpdates[0]?.reasonCodes.includes("FAILURE_REPORTED"));
      assert.ok(data.progressionUpdates[0]?.reasonCodes.includes("CONFLICTING_EFFORT_SIGNALS"));
    }
  },
  {
    name: "CompleteWorkoutSessionUseCase repeats conservatively when a set is marked technical failure",
    run: async () => {
      const data = await completeSingleExerciseWorkoutScenario({
        idempotencyKey: "effort-hierarchy-technical-failure-key-1",
        exerciseFeedback: "too_easy",
        recoveryState: "fresh",
        setOverrides: [
          { rir: null, failureStatus: "technical_failure" },
          { rir: null, failureStatus: null },
          { rir: null, failureStatus: null }
        ]
      });

      assert.equal(data.progressionUpdates.length, 1);
      assert.equal(data.progressionUpdates[0]?.result, "repeated");
      assert.equal(data.progressionUpdates[0]?.nextWeight.value, 95);
      assert.equal(data.progressionUpdates[0]?.nextRepGoal, 8);
      assert.equal(data.progressionUpdates[0]?.confidence, "low");
      assert.ok(data.progressionUpdates[0]?.reasonCodes.includes("SET_TECHNICAL_FAILURE"));
      assert.ok(data.progressionUpdates[0]?.reasonCodes.includes("FAILURE_REPORTED"));
    }
  },
  {
    name: "CompleteWorkoutSessionUseCase treats stopped early as cautious but not as muscular failure",
    run: async () => {
      const data = await completeSingleExerciseWorkoutScenario({
        idempotencyKey: "effort-hierarchy-stopped-early-key-1",
        exerciseFeedback: "too_easy",
        recoveryState: "fresh",
        setOverrides: [
          { status: "failed", actualReps: null, failureStatus: "stopped_early", rir: null },
          { status: "failed", actualReps: null, failureStatus: "stopped_early", rir: null },
          { status: "failed", actualReps: null, failureStatus: "stopped_early", rir: null }
        ]
      });

      assert.equal(data.progressionUpdates.length, 1);
      assert.equal(data.progressionUpdates[0]?.result, "repeated");
      assert.equal(data.progressionUpdates[0]?.nextWeight.value, 95);
      assert.equal(data.progressionUpdates[0]?.confidence, "medium");
      assert.ok(data.progressionUpdates[0]?.reasonCodes.includes("STOPPED_EARLY_REPORTED"));
      assert.ok(!data.progressionUpdates[0]?.reasonCodes.includes("FAILURE_REPORTED"));
    }
  },
  {
    name: "CompleteWorkoutSessionUseCase recalibrates dramatic heavier-weight lower-rep performance",
    run: async () => {
      const idempotency = createMockIdempotencyRepository();
      let updatedProgressionWeight: number | null = null;
      const baseGraph = createBaseWorkoutSessionGraph();
      const heavySets = baseGraph.sets.map((set) => ({
        ...set,
        targetReps: 5,
        actualReps: 4,
        targetWeightLbs: 135,
        actualWeightLbs: 225,
        status: "failed" as const,
        completedAt: new Date("2026-04-24T10:10:00.000Z")
      }));
      const inProgressGraph: WorkoutSessionGraph = {
        ...baseGraph,
        session: {
          ...baseGraph.session,
          programId: CUSTOM_WORKOUT_PROGRAM_ID,
          workoutTemplateId: CUSTOM_WORKOUT_TEMPLATE_ID
        },
        exerciseEntries: [
          {
            ...baseGraph.exerciseEntries[0]!,
            targetReps: 5,
            targetWeightLbs: 135
          }
        ],
        sets: heavySets
      };
      const completedGraph: WorkoutSessionGraph = {
        ...inProgressGraph,
        session: {
          ...inProgressGraph.session,
          status: "completed",
          completedAt: new Date("2026-04-24T10:45:00.000Z"),
          durationSeconds: 2700
        },
        exerciseEntries: [
          {
            ...inProgressGraph.exerciseEntries[0]!,
            effortFeedback: "just_right",
            completedAt: new Date("2026-04-24T10:45:00.000Z")
          }
        ]
      };
      let graphReadCount = 0;

      const workoutSessionRepository: WorkoutSessionRepository = {
        async findInProgressByUserId() {
          return null;
        },
        async findOwnedById() {
          return null;
        },
        async findOwnedSessionGraphById() {
          return graphReadCount++ === 0 ? inProgressGraph : completedGraph;
        },
        async findOwnedSetForLogging() {
          return null;
        },
        async createSessionGraph() {
          throw new Error("Not implemented.");
        },
        async appendCustomExercise() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutNameSnapshotIfDefault() {
          return false;
        },
        async appendWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateLoggedSet() {
          throw new Error("Not implemented.");
        },
        async persistExerciseEntryFeedback() {},
        async skipPendingWorkoutSets() {
          return 0;
        },
        async completeSession(input) {
          return {
            ...completedGraph.session,
            completedAt: input.completedAt,
            durationSeconds: input.durationSeconds,
            isPartial: input.isPartial,
            userEffortFeedback: input.userEffortFeedback
          };
        },
        async cancelSession() {
          throw new Error("Not implemented.");
        },
        async listRecentCompletedByUserId() {
          return [];
        },
        async countCompletedByUserIdWithinRange() {
          return 0;
        },
        async countCompletedByUserId() {
          return 0;
        },
        async countCompletedByUserIdAndProgramId() {
          return 0;
        },
        async listCompletedProgressionByUserId() {
          return [];
        }
      };
      const enrollmentRepository: EnrollmentRepository = {
        async findActiveByUserId() {
          return null;
        },
        async updateNextWorkoutTemplate() {
          throw new Error("Not implemented.");
        },
        async cancelEnrollment() {
          throw new Error("Not implemented.");
        }
      };
      const progressionStateRepository: ProgressionStateRepository = {
        async findByUserIdAndExerciseIds() {
          return [
            {
              id: "progression-1",
              userId: "user-1",
              exerciseId: "exercise-1",
              currentWeightLbs: 135,
              lastCompletedWeightLbs: 130,
              consecutiveFailures: 1,
              lastEffortFeedback: "too_hard",
              lastPerformedAt: new Date("2026-04-20T10:00:00.000Z"),
              createdAt: new Date("2026-04-01T00:00:00.000Z"),
              updatedAt: new Date("2026-04-20T10:00:00.000Z")
            }
          ];
        },
        async createMany() {
          return [];
        },
        async updateMany(inputs) {
          updatedProgressionWeight = inputs[0]?.currentWeightLbs ?? null;
          return inputs.map((input) => ({
            id: "progression-1",
            ...input,
            createdAt: new Date("2026-04-01T00:00:00.000Z"),
            updatedAt: new Date("2026-04-24T10:45:00.000Z")
          }));
        }
      };
      const exerciseRepository: ExerciseRepository = {
        async listActive() {
          return [];
        },
        async findTemplateDefinitionById() {
          return null;
        },
        async findProgressionSeedsByExerciseIds() {
          return [
            {
              exerciseId: "exercise-1",
              exerciseName: "Bench Press",
              exerciseCategory: "compound",
              defaultStartingWeightLbs: 135,
              incrementLbs: 5,
              isBodyweight: false,
              isWeightOptional: false,
              isProgressionEligible: true
            }
          ];
        },
        async findActiveTemplatesByProgramId() {
          return [];
        },
        async findByIds() {
          return [];
        },
        async findTemplateExerciseEntryIdsByTemplateIdAndSequenceOrders() {
          return [];
        }
        ,
        async appendWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async softDeleteWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        }
      };
      const progressMetricRepository: ProgressMetricRepository = {
        async createMany(inputs) {
          return inputs.map((input, index) => ({
            id: `metric-${index + 1}`,
            ...input,
            createdAt: input.recordedAt
          }));
        },
        async listRecentByUserId() {
          return [];
        }
      };

      const progressionRecommendationEventRepository: ProgressionRecommendationEventRepository = {
        async createMany(inputs) {
          return inputs.map((input, index) => ({
            id: `event-${index + 1}`,
            ...input,
            createdAt: new Date()
          }));
        },
        async listRecentByUserId() {
          return [];
        }
      };

      const useCase = new CompleteWorkoutSessionUseCase(
        workoutSessionRepository,
        enrollmentRepository,
        progressionStateRepository,
        defaultProgressionStateV2Repository,
        exerciseRepository,
        { findTrainingProfile: async () => ({ experienceLevel: null, trainingGoal: null }) } as any,
        { findActiveById: async () => ({ program: { trainingGoal: null } }) } as any,
        progressMetricRepository,
        progressionRecommendationEventRepository,
        {
          findOrCreateByUserId: async (userId: string) => ({
            userId,
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
          }),
          updateByUserId: async (userId: string) => ({
            userId,
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
          })
        } as any,
        {
          findByUserIdAndExerciseId: async () => null,
          upsert: async (record: any) => record
        } as any,
        new MockTransactionManager(),
        idempotency.repository
      );

      const result = await useCase.execute({
        context: { userId: "user-1", unitSystem: "imperial" },
        sessionId: "session-1",
        request: {
          completedAt: "2026-04-24T10:45:00.000Z",
          exerciseFeedback: [{ exerciseEntryId: "entry-1", effortFeedback: "just_right" }],
          userEffortFeedback: "just_right"
        },
        idempotencyKey: "complete-recalibration-key"
      });

      assert.equal(result.data.progressionUpdates[0]?.result, "recalibrated");
      assert.equal(result.data.progressionUpdates[0]?.nextWeight.value, 215);
      assert.equal(updatedProgressionWeight, 215);
      assert.match(result.data.progressionUpdates[0]?.reason ?? "", /Recalibrated from 135 lb to 215 lb/);
      assert.equal(result.data.progressMetrics[0]?.displayText, "Adjusted Bench Press working weight based on your performance");
    }
  },
  {
    name: "Idempotency behavior replays identical mutations and rejects conflicting payloads",
    run: async () => {
      const idempotency = createMockIdempotencyRepository();

      const workoutSessionRepository: WorkoutSessionRepository = {
        async findInProgressByUserId() {
          return null;
        },
        async findOwnedById() {
          return null;
        },
        async findOwnedSessionGraphById() {
          return null;
        },
        async findOwnedSetForLogging() {
          return null;
        },
        async createSessionGraph() {
          return createBaseWorkoutSessionGraph();
        },
        async appendCustomExercise() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutNameSnapshotIfDefault() {
          return false;
        },
        async appendWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateLoggedSet() {
          throw new Error("Not implemented.");
        },
        async persistExerciseEntryFeedback() {},
        async skipPendingWorkoutSets() {
          return 0;
        },
        async completeSession() {
          throw new Error("Not implemented.");
        },
        async cancelSession() {
          throw new Error("Not implemented.");
        },
        async listRecentCompletedByUserId() {
          return [];
        },
        async countCompletedByUserIdWithinRange() {
          return 0;
        },
        async countCompletedByUserId() {
          return 0;
        },
        async countCompletedByUserIdAndProgramId() {
          return 0;
        },
        async listCompletedProgressionByUserId() {
          return [];
        }
      };

      const enrollmentRepository: EnrollmentRepository = {
        async findActiveByUserId() {
          return {
            id: "enrollment-1",
            userId: "user-1",
            programId: "program-1",
            status: "active",
            startedAt: new Date("2026-04-01T00:00:00.000Z"),
            completedAt: null,
            currentWorkoutTemplateId: "template-1",
            createdAt: new Date("2026-04-01T00:00:00.000Z"),
            updatedAt: new Date("2026-04-01T00:00:00.000Z")
          };
        },
        async updateNextWorkoutTemplate() {
          throw new Error("Not implemented.");
        },
        async cancelEnrollment() {
          throw new Error("Not implemented.");
        }
      };

      const progressionStateRepository: ProgressionStateRepository = {
        async findByUserIdAndExerciseIds() {
          return [];
        },
        async createMany() {
          return [];
        },
        async updateMany() {
          return [];
        }
      };

      const exerciseRepository: ExerciseRepository = {
        async listActive() {
          return [];
        },
        async findTemplateDefinitionById() {
          return {
            template: {
              id: "template-1",
              programId: "program-1",
              programName: "3-Day Full Body Beginner",
              name: "Workout A",
              sequenceOrder: 1,
              estimatedDurationMinutes: 60,
              isActive: true,
              createdAt: new Date("2026-04-01T00:00:00.000Z"),
              updatedAt: new Date("2026-04-01T00:00:00.000Z")
            },
            exercises: []
          };
        },
        async findProgressionSeedsByExerciseIds() {
          return [];
        },
        async findActiveTemplatesByProgramId() {
          return [];
        },
        async findByIds() {
          return [];
        },
        async findTemplateExerciseEntryIdsByTemplateIdAndSequenceOrders() {
          return [];
        }
        ,
        async appendWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async softDeleteWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        }
      };

      const progressionStateV2Repository = defaultProgressionStateV2Repository;

      const useCase = new StartWorkoutSessionUseCase(
        workoutSessionRepository,
        enrollmentRepository,
        progressionStateRepository,
        progressionStateV2Repository,
        exerciseRepository,
        new MockTransactionManager(),
        idempotency.repository
      );

      const firstResult = await useCase.execute({
        context: { userId: "user-1", unitSystem: "imperial" },
        request: {},
        idempotencyKey: "shared-key"
      });

      const replayedResult = await useCase.execute({
        context: { userId: "user-1", unitSystem: "imperial" },
        request: {},
        idempotencyKey: "shared-key"
      });

      assert.equal(firstResult.data.id, replayedResult.data.id);
      assert.equal(replayedResult.meta.replayed, true);

      await assert.rejects(
        () =>
          useCase.execute({
            context: { userId: "user-1", unitSystem: "imperial" },
            request: {
              workoutTemplateId: "different-template"
            },
            idempotencyKey: "shared-key"
          }),
        (error: unknown) =>
          error instanceof WorkoutApplicationError &&
          error.code === "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD"
      );
    }
  },
  {
    name: "Read use-cases load current workout and dashboard",
    run: async () => {
      const workoutSessionRepository: WorkoutSessionRepository = {
        async findInProgressByUserId() {
          return createBaseWorkoutSessionGraph();
        },
        async findOwnedById() {
          return null;
        },
        async findOwnedSessionGraphById() {
          return null;
        },
        async findOwnedSetForLogging() {
          return null;
        },
        async createSessionGraph() {
          throw new Error("Not implemented.");
        },
        async appendCustomExercise() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutNameSnapshotIfDefault() {
          return false;
        },
        async appendWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutSet() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async deleteWorkoutExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateLoggedSet() {
          throw new Error("Not implemented.");
        },
        async persistExerciseEntryFeedback() {},
        async skipPendingWorkoutSets() {
          return 0;
        },
        async completeSession() {
          throw new Error("Not implemented.");
        },
        async cancelSession() {
          throw new Error("Not implemented.");
        },
        async listRecentCompletedByUserId() {
          return [
            {
              id: "session-1",
              workoutName: "Workout A",
              programName: "3-Day Full Body Beginner",
              status: "completed",
              startedAt: new Date("2026-04-24T10:00:00.000Z"),
              completedAt: new Date("2026-04-24T10:45:00.000Z"),
              durationSeconds: 2700,
              exerciseCount: 1,
              plannedSetCount: 3,
              completedSetCount: 3,
              failedSetCount: 0,
              isPartial: false
            }
          ];
        },
        async countCompletedByUserIdWithinRange() {
          return 1;
        },
        async countCompletedByUserId() {
          return 1;
        },
        async countCompletedByUserIdAndProgramId() {
          return 1;
        },
        async listCompletedProgressionByUserId() {
          return [
            {
              workoutSessionId: "session-1",
              workoutName: "Workout A",
              completedAt: new Date("2026-04-24T10:45:00.000Z"),
              exerciseId: "exercise-1",
              exerciseName: "Bench Press",
              exerciseCategory: "compound",
              setId: "set-1",
              actualReps: 8,
              actualWeightLbs: 135,
              setStatus: "completed"
            }
          ];
        }
      };

      const enrollmentRepository: EnrollmentRepository = {
        async findActiveByUserId() {
          return {
            id: "enrollment-1",
            userId: "user-1",
            programId: "program-1",
            status: "active",
            startedAt: new Date("2026-04-01T00:00:00.000Z"),
            completedAt: null,
            currentWorkoutTemplateId: "template-1",
            createdAt: new Date("2026-04-01T00:00:00.000Z"),
            updatedAt: new Date("2026-04-01T00:00:00.000Z")
          };
        },
        async updateNextWorkoutTemplate() {
          throw new Error("Not implemented.");
        },
        async cancelEnrollment() {
          throw new Error("Not implemented.");
        }
      };

      const exerciseRepository: ExerciseRepository = {
        async listActive() {
          return [];
        },
        async findTemplateDefinitionById() {
          return null;
        },
        async findProgressionSeedsByExerciseIds() {
          return [];
        },
        async findActiveTemplatesByProgramId() {
          return [
            {
              id: "template-1",
              programId: "program-1",
              programName: "3-Day Full Body Beginner",
              name: "Workout A",
              sequenceOrder: 1,
              estimatedDurationMinutes: 60,
              isActive: true,
              createdAt: new Date("2026-04-01T00:00:00.000Z"),
              updatedAt: new Date("2026-04-01T00:00:00.000Z")
            }
          ];
        },
        async findByIds() {
          return [];
        },
        async findTemplateExerciseEntryIdsByTemplateIdAndSequenceOrders() {
          return [];
        }
        ,
        async appendWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async updateWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        },
        async softDeleteWorkoutTemplateExerciseEntry() {
          throw new Error("Not implemented.");
        }
      };

      const progressMetricRepository: ProgressMetricRepository = {
        async createMany() {
          return [];
        },
        async listRecentByUserId() {
          return [
            {
              id: "metric-1",
              userId: "user-1",
              exerciseId: null,
              workoutSessionId: "session-1",
              metricType: "workout_completed",
              metricValue: 1,
              displayText: "Workout completed",
              recordedAt: new Date("2026-04-24T10:45:00.000Z"),
              createdAt: new Date("2026-04-24T10:45:00.000Z")
            }
          ];
        }
      };

      const programRepository: ProgramRepository = {
        async listActive() {
          return [createProgramDefinition()];
        },
        async findActiveById() {
          return createProgramDefinition();
        },
        async createEnrollment() {
          throw new Error("Not implemented.");
        }
      };

      const currentWorkoutUseCase = new GetCurrentWorkoutSessionUseCase(workoutSessionRepository);
      const historyUseCase = new GetWorkoutHistoryUseCase(
        workoutSessionRepository,
        progressMetricRepository
      );
      const progressionUseCase = new GetProgressionUseCase(workoutSessionRepository);
      const dashboardUseCase = new GetDashboardUseCase(
        workoutSessionRepository,
        enrollmentRepository,
        exerciseRepository,
        programRepository,
        progressMetricRepository
      );

      const currentWorkoutResult = await currentWorkoutUseCase.execute({
        context: { userId: "user-1", unitSystem: "imperial" }
      });
      const dashboardResult = await dashboardUseCase.execute({
        context: { userId: "user-1", unitSystem: "imperial" }
      });
      const historyResult = await historyUseCase.execute({
        context: { userId: "user-1", unitSystem: "imperial" },
        limit: 10
      });
      const progressionResult = await progressionUseCase.execute({
        context: { userId: "user-1", unitSystem: "imperial" }
      });

      assert.equal(currentWorkoutResult.data.activeWorkoutSession?.id, "session-1");
      assert.equal(dashboardResult.data.activeProgram?.program.name, "3-Day Full Body Beginner");
      assert.equal(dashboardResult.data.activeProgram?.completedWorkoutCount, 1);
      assert.equal(dashboardResult.data.activeProgram?.currentPosition.label, "Week 1 · Day 2");
      assert.equal(dashboardResult.data.activeProgram?.currentPosition.weekNumber, 1);
      assert.equal(dashboardResult.data.activeProgram?.currentPosition.dayNumber, 2);
      assert.equal(currentWorkoutResult.meta.replayed, false);
      assert.equal(dashboardResult.data.recentWorkoutHistory[0]?.highlights[0], "Workout completed");
      assert.equal(historyResult.data.items[0]?.workoutName, "Workout A");
      assert.equal(historyResult.data.items[0]?.completedSetCount, 3);
      assert.equal(historyResult.data.items[0]?.highlights[0], "Workout completed");
      assert.equal(historyResult.data.nextCursor, null);
      assert.equal(progressionResult.data.totalCompletedWorkouts, 1);
      assert.equal(progressionResult.data.exercises[0]?.exerciseName, "Bench Press");
      assert.equal(progressionResult.data.exercises[0]?.recentBestWeight?.value, 135);
      assert.equal(dashboardResult.meta.replayed, false);
    }
  }
];
