import assert from "node:assert/strict";
import type { StartWorkoutSessionRequest } from "@fitness/shared";
import type { EnrollmentRepository } from "../../repositories/interfaces/enrollment.repository.js";
import type { ExerciseRepository } from "../../repositories/interfaces/exercise.repository.js";
import type { IdempotencyRepository } from "../../repositories/interfaces/idempotency.repository.js";
import type { ProgramRepository } from "../../repositories/interfaces/program.repository.js";
import type { ProgressMetricRepository } from "../../repositories/interfaces/progress-metric.repository.js";
import type { ProgressionStateRepository } from "../../repositories/interfaces/progression-state.repository.js";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";
import type { IdempotencyRecord } from "../../repositories/models/idempotency.persistence.js";
import type { WorkoutSessionGraph } from "../../repositories/models/workout-session.persistence.js";
import { WorkoutApplicationError } from "../errors/workout-application.error.js";
import { MockTransactionManager } from "../test-helpers/mock-transaction-manager.js";
import type { ApplicationTestCase } from "../test-helpers/application-test-case.js";
import { CompleteWorkoutSessionUseCase } from "./complete-workout-session.use-case.js";
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
      programNameSnapshot: "Beginner Full Body V1",
      workoutNameSnapshot: "Workout A",
      createdAt: new Date("2026-04-24T10:00:00.000Z"),
      updatedAt: new Date("2026-04-24T10:00:00.000Z")
    },
    exerciseEntries: [
      {
        id: "entry-1",
        workoutSessionId: "session-1",
        exerciseId: "exercise-1",
        sequenceOrder: 1,
        targetSets: 3,
        targetReps: 8,
        targetWeightLbs: 135,
        restSeconds: 120,
        effortFeedback: null,
        completedAt: null,
        exerciseNameSnapshot: "Bench Press",
        exerciseCategorySnapshot: "compound",
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
        targetReps: 8,
        actualReps: null,
        targetWeightLbs: 135,
        actualWeightLbs: null,
        status: "pending",
        completedAt: null,
        createdAt: new Date("2026-04-24T10:00:00.000Z"),
        updatedAt: new Date("2026-04-24T10:00:00.000Z")
      },
      {
        id: "set-2",
        exerciseEntryId: "entry-1",
        setNumber: 2,
        targetReps: 8,
        actualReps: null,
        targetWeightLbs: 135,
        actualWeightLbs: null,
        status: "pending",
        completedAt: null,
        createdAt: new Date("2026-04-24T10:00:00.000Z"),
        updatedAt: new Date("2026-04-24T10:00:00.000Z")
      },
      {
        id: "set-3",
        exerciseEntryId: "entry-1",
        setNumber: 3,
        targetReps: 8,
        actualReps: null,
        targetWeightLbs: 135,
        actualWeightLbs: null,
        status: "pending",
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

function createProgramDefinition() {
  return {
    program: {
      id: "program-1",
      name: "Beginner Full Body V1",
      description: "A simple strength progression program.",
      daysPerWeek: 3,
      sessionDurationMinutes: 60,
      difficultyLevel: "beginner" as const,
      isActive: true,
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
      updatedAt: new Date("2026-04-01T00:00:00.000Z")
    },
    templates: [
      {
        id: "template-1",
        programId: "program-1",
        name: "Workout A",
        sequenceOrder: 1,
        estimatedDurationMinutes: 60,
        exercises: [
          {
            id: "template-entry-1",
            exerciseId: "exercise-1",
            exerciseName: "Bench Press",
            category: "compound" as const,
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

export const applicationUseCaseTestCases: ApplicationTestCase[] = [
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
              programName: "Beginner Full Body V1",
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
        async updateLoggedSet() {
          throw new Error("Not implemented.");
        },
        async persistExerciseEntryFeedback() {},
        async completeSession() {
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
      const followProgramUseCase = new FollowProgramUseCase(
        programRepository,
        enrollmentRepository,
        exerciseRepository,
        workoutSessionRepository,
        new MockTransactionManager()
      );

      const programsResult = await listProgramsUseCase.execute();
      const followResult = await followProgramUseCase.execute({
        context: { userId: "user-1", unitSystem: "imperial" },
        programId: "program-1"
      });

      assert.equal(programsResult.data.programs[0]?.workouts[0]?.exercises[0]?.exerciseName, "Bench Press");
      assert.equal(createdEnrollmentTemplateId, "template-1");
      assert.equal(followResult.data.activeProgram.nextWorkoutTemplate?.id, "template-1");
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
        async updateLoggedSet() {
          throw new Error("Not implemented.");
        },
        async persistExerciseEntryFeedback() {},
        async completeSession() {
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
        async findTemplateDefinitionById() {
          return {
            template: {
              id: "template-1",
              programId: "program-1",
              programName: "Beginner Full Body V1",
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
                  defaultIncrementLbs: 5,
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
              incrementLbs: 5
            }
          ];
        },
        async findActiveTemplatesByProgramId() {
          return [];
        },
        async findByIds() {
          return [];
        }
      };

      const useCase = new StartWorkoutSessionUseCase(
        workoutSessionRepository,
        enrollmentRepository,
        progressionStateRepository,
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
        async updateLoggedSet() {
          return {
            set: updatedGraph.sets[0]!,
            exerciseEntry: updatedGraph.exerciseEntries[0]!,
            workoutSession: updatedGraph.session
          };
        },
        async persistExerciseEntryFeedback() {},
        async completeSession() {
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
        async updateLoggedSet() {
          throw new Error("Not implemented.");
        },
        async persistExerciseEntryFeedback() {},
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

      const exerciseRepository: ExerciseRepository = {
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
              incrementLbs: 5
            }
          ];
        },
        async findActiveTemplatesByProgramId() {
          return [
            {
              id: "template-1",
              programId: "program-1",
              programName: "Beginner Full Body V1",
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
              programName: "Beginner Full Body V1",
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

      const useCase = new CompleteWorkoutSessionUseCase(
        workoutSessionRepository,
        enrollmentRepository,
        progressionStateRepository,
        exerciseRepository,
        progressMetricRepository,
        new MockTransactionManager(),
        idempotency.repository
      );

      const result = await useCase.execute({
        context: { userId: "user-1", unitSystem: "imperial" },
        sessionId: "session-1",
        request: {
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
        async updateLoggedSet() {
          throw new Error("Not implemented.");
        },
        async persistExerciseEntryFeedback() {},
        async completeSession() {
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
        async findTemplateDefinitionById() {
          return {
            template: {
              id: "template-1",
              programId: "program-1",
              programName: "Beginner Full Body V1",
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
        }
      };

      const useCase = new StartWorkoutSessionUseCase(
        workoutSessionRepository,
        enrollmentRepository,
        progressionStateRepository,
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
        async updateLoggedSet() {
          throw new Error("Not implemented.");
        },
        async persistExerciseEntryFeedback() {},
        async completeSession() {
          throw new Error("Not implemented.");
        },
        async listRecentCompletedByUserId() {
          return [
            {
              id: "session-1",
              workoutName: "Workout A",
              programName: "Beginner Full Body V1",
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
              programName: "Beginner Full Body V1",
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
      const historyUseCase = new GetWorkoutHistoryUseCase(workoutSessionRepository);
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
      assert.equal(dashboardResult.data.activeProgram?.program.name, "Beginner Full Body V1");
      assert.equal(dashboardResult.data.activeProgram?.completedWorkoutCount, 1);
      assert.equal(currentWorkoutResult.meta.replayed, false);
      assert.equal(dashboardResult.data.recentWorkoutHistory[0]?.highlights[0], "Workout completed");
      assert.equal(historyResult.data.items[0]?.workoutName, "Workout A");
      assert.equal(historyResult.data.items[0]?.completedSetCount, 3);
      assert.equal(historyResult.data.nextCursor, null);
      assert.equal(progressionResult.data.totalCompletedWorkouts, 1);
      assert.equal(progressionResult.data.exercises[0]?.exerciseName, "Bench Press");
      assert.equal(progressionResult.data.exercises[0]?.recentBestWeight?.value, 135);
      assert.equal(dashboardResult.meta.replayed, false);
    }
  }
];
