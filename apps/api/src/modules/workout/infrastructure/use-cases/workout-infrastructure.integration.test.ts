import assert from "node:assert/strict";
import { bootstrapDevelopmentDatabase, DEV_USER_ID } from "../../../../lib/db/dev-bootstrap.js";
import { createPgliteClient } from "../../../../lib/db/connection.js";
import { WorkoutApplicationError } from "../../application/errors/workout-application.error.js";
import { CompleteWorkoutSessionUseCase } from "../../application/use-cases/complete-workout-session.use-case.js";
import { LogSetUseCase } from "../../application/use-cases/log-set.use-case.js";
import { StartWorkoutSessionUseCase } from "../../application/use-cases/start-workout-session.use-case.js";
import type { InfrastructureTestCase } from "../test-helpers/infrastructure-test-case.js";
import {
  countRecords,
  createWorkoutInfrastructureTestContext,
  disposeWorkoutInfrastructureTestContext,
  idempotencyRecords,
  progressMetrics,
  progressionStates,
  seedBaseWorkoutProgram,
  seedInProgressWorkout,
  userProgramEnrollments,
  workoutSessions
} from "../test-helpers/integration-db.js";

export const workoutInfrastructureIntegrationTestCases: InfrastructureTestCase[] = [
  {
    name: "Development bootstrap syncs all predefined programs without replacing active enrollment",
    run: async () => {
      const client = createPgliteClient();

      try {
        await bootstrapDevelopmentDatabase(client as any);

        let programRows = (await client.query(
          "select name from programs where is_active = true and deleted_at is null order by created_at"
        )) as { rows: Array<{ name: string }> };

        assert.deepEqual(
          programRows.rows.map((row) => row.name),
          ["Beginner Full Body V1", "4-Day Upper/Lower + Arms"]
        );

        await client.query(
          "update user_program_enrollments set status = 'cancelled', completed_at = now() where user_id = $1",
          [DEV_USER_ID]
        );
        await client.query(
          `insert into user_program_enrollments
           (id, user_id, program_id, status, started_at, current_workout_template_id)
           values ($1, $2, $3, 'active', now(), $4)`,
          [
            "55555555-5555-5555-5555-555555555556",
            DEV_USER_ID,
            "22222222-2222-2222-2222-222222222223",
            "33333333-3333-3333-3333-333333333341"
          ]
        );

        await bootstrapDevelopmentDatabase(client as any);

        programRows = (await client.query(
          "select name from programs where is_active = true and deleted_at is null order by created_at"
        )) as { rows: Array<{ name: string }> };
        const activeEnrollmentRows = (await client.query(
          "select program_id from user_program_enrollments where user_id = $1 and status = 'active'",
          [DEV_USER_ID]
        )) as { rows: Array<{ program_id: string }> };

        assert.deepEqual(
          programRows.rows.map((row) => row.name),
          ["Beginner Full Body V1", "4-Day Upper/Lower + Arms"]
        );
        assert.equal(activeEnrollmentRows.rows.length, 1);
        assert.equal(activeEnrollmentRows.rows[0]?.program_id, "22222222-2222-2222-2222-222222222223");
      } finally {
        await client.close();
      }
    }
  },
  {
    name: "Start workout persists a full session graph and creates progression state",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);

        const useCase = new StartWorkoutSessionUseCase(
          context.repositories.workoutSessionRepository,
          context.repositories.enrollmentRepository,
          context.repositories.progressionStateRepository,
          context.repositories.exerciseRepository,
          context.transactionManager,
          context.repositories.idempotencyRepository
        );

        const result = await useCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" },
          request: {},
          idempotencyKey: "start-key-1"
        });

        const counts = await countRecords(context);

        assert.equal(result.data.status, "in_progress");
        assert.equal(result.data.exercises.length, 1);
        assert.equal(result.data.exercises[0]?.sets.length, 3);
        assert.equal(counts.workoutSessions, 1);
        assert.equal(counts.exerciseEntries, 1);
        assert.equal(counts.sets, 3);
        assert.equal(counts.progressionStates, 1);
        assert.equal(counts.idempotencyRecords, 1);
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Log set persists only a valid pending set update",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        await seedInProgressWorkout(context, {
          setStatuses: ["pending", "pending", "pending"],
          actualReps: [0, 0, 0]
        });

        const useCase = new LogSetUseCase(
          context.repositories.workoutSessionRepository,
          context.transactionManager,
          context.repositories.idempotencyRepository
        );

        const result = await useCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" },
          setId: "set-1",
          request: {
            actualReps: 8
          },
          idempotencyKey: "log-key-1"
        });

        const sessionGraph = await context.repositories.workoutSessionRepository.findOwnedSessionGraphById(
          "user-1",
          "session-1"
        );

        assert.equal(result.data.set.status, "completed");
        assert.equal(result.data.exerciseEntry.completedSetCount, 1);
        assert.equal(sessionGraph?.sets.find((set) => set.id === "set-1")?.status, "completed");
        assert.equal(sessionGraph?.sets.find((set) => set.id === "set-2")?.status, "pending");
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Complete workout persists progression, metrics, session completion, and enrollment advancement",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        await seedInProgressWorkout(context);

        const useCase = new CompleteWorkoutSessionUseCase(
          context.repositories.workoutSessionRepository,
          context.repositories.enrollmentRepository,
          context.repositories.progressionStateRepository,
          context.repositories.exerciseRepository,
          context.repositories.progressMetricRepository,
          context.transactionManager,
          context.repositories.idempotencyRepository
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

        const [persistedSession] = await context.db.select().from(workoutSessions);
        const [persistedProgressionState] = await context.db.select().from(progressionStates);
        const persistedMetrics = await context.db.select().from(progressMetrics);
        const [persistedEnrollment] = await context.db.select().from(userProgramEnrollments);

        assert.equal(result.data.workoutSession.status, "completed");
        assert.equal(result.data.progressionUpdates[0]?.nextWeight.value, 140);
        assert.equal(persistedSession?.status, "completed");
        assert.equal(String(persistedProgressionState?.currentWeightLbs), "140.00");
        assert.equal(String(persistedProgressionState?.lastCompletedWeightLbs), "135.00");
        assert.equal(persistedProgressionState?.consecutiveFailures, 0);
        assert.equal(persistedMetrics.length, 2);
        assert.equal(persistedEnrollment?.currentWorkoutTemplateId, "template-2");
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Workout history orders completed workouts by completion time",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);

        await context.db.insert(workoutSessions).values([
          {
            id: "session-started-later",
            userId: "user-1",
            programId: "program-1",
            workoutTemplateId: "template-1",
            status: "completed",
            startedAt: new Date("2026-04-25T10:00:00.000Z"),
            completedAt: new Date("2026-04-25T10:45:00.000Z"),
            durationSeconds: 2700,
            isPartial: false,
            userEffortFeedback: "just_right",
            programNameSnapshot: "Beginner Full Body V1",
            workoutNameSnapshot: "Workout A",
            createdAt: new Date("2026-04-25T10:00:00.000Z"),
            updatedAt: new Date("2026-04-25T10:45:00.000Z")
          },
          {
            id: "session-completed-later",
            userId: "user-1",
            programId: "program-1",
            workoutTemplateId: "template-1",
            status: "completed",
            startedAt: new Date("2026-04-24T10:00:00.000Z"),
            completedAt: new Date("2026-04-26T10:45:00.000Z"),
            durationSeconds: 2700,
            isPartial: false,
            userEffortFeedback: "just_right",
            programNameSnapshot: "Beginner Full Body V1",
            workoutNameSnapshot: "Workout A",
            createdAt: new Date("2026-04-24T10:00:00.000Z"),
            updatedAt: new Date("2026-04-26T10:45:00.000Z")
          }
        ]);

        const history = await context.repositories.workoutSessionRepository.listRecentCompletedByUserId(
          "user-1",
          10
        );

        assert.equal(history[0]?.id, "session-completed-later");
        assert.equal(history[1]?.id, "session-started-later");
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Idempotency persists replay behavior and rejects conflicting payloads",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);

        const useCase = new StartWorkoutSessionUseCase(
          context.repositories.workoutSessionRepository,
          context.repositories.enrollmentRepository,
          context.repositories.progressionStateRepository,
          context.repositories.exerciseRepository,
          context.transactionManager,
          context.repositories.idempotencyRepository
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

        const idempotencyRows = await context.db.select().from(idempotencyRecords);

        assert.equal(firstResult.data.id, replayedResult.data.id);
        assert.equal(replayedResult.meta.replayed, true);
        assert.equal(idempotencyRows.length, 1);
        assert.equal(idempotencyRows[0]?.status, "completed");

        await assert.rejects(
          () =>
            useCase.execute({
              context: { userId: "user-1", unitSystem: "imperial" },
              request: {
                workoutTemplateId: "template-2"
              },
              idempotencyKey: "shared-key"
            }),
          (error: unknown) =>
            error instanceof WorkoutApplicationError &&
            error.code === "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD"
        );
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  }
];
