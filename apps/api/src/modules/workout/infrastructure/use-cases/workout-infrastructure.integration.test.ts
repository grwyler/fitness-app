import assert from "node:assert/strict";
import { seedPrograms } from "@fitness/db";
import { bootstrapDevelopmentDatabase, DEV_USER_ID } from "../../../../lib/db/dev-bootstrap.js";
import { createPgliteClient } from "../../../../lib/db/connection.js";
import { WorkoutApplicationError } from "../../application/errors/workout-application.error.js";
import { CompleteWorkoutSessionUseCase } from "../../application/use-cases/complete-workout-session.use-case.js";
import { CreateCustomProgramUseCase } from "../../application/use-cases/create-custom-program.use-case.js";
import { LogSetUseCase } from "../../application/use-cases/log-set.use-case.js";
import { StartWorkoutSessionUseCase } from "../../application/use-cases/start-workout-session.use-case.js";
import { UpdateLoggedSetUseCase } from "../../application/use-cases/update-logged-set.use-case.js";
import { UpdateCustomProgramUseCase } from "../../application/use-cases/update-custom-program.use-case.js";
import type { InfrastructureTestCase } from "../test-helpers/infrastructure-test-case.js";
import { eq } from "../db/drizzle-helpers.js";
import {
  countRecords,
  createWorkoutInfrastructureTestContext,
  disposeWorkoutInfrastructureTestContext,
  exercises,
  idempotencyRecords,
  progressMetrics,
  progressionRecommendationEvents,
  progressionStates,
  progressionStatesV2,
  users,
  seedBaseWorkoutProgram,
  seedInProgressWorkout,
  sets,
  userProgramEnrollments,
  workoutTemplateExerciseEntries,
  workoutTemplates,
  workoutSessions
} from "../test-helpers/integration-db.js";

async function cancelActiveEnrollment(context: Awaited<ReturnType<typeof createWorkoutInfrastructureTestContext>>, userId: string) {
  await context.db
    .update(userProgramEnrollments)
    .set({
      status: "cancelled",
      completedAt: new Date("2026-04-24T10:00:00.000Z"),
      updatedAt: new Date("2026-04-24T10:00:00.000Z")
    })
    .where(eq(userProgramEnrollments.userId, userId));
}

async function createAndEnrollCustomProgram(input: {
  context: Awaited<ReturnType<typeof createWorkoutInfrastructureTestContext>>;
  userId: string;
  programName: string;
  workouts: Array<{
    name: string;
    exercises: Array<{
      exerciseId: string;
      targetSets: number;
      targetReps: number;
    }>;
  }>;
  idempotencyKey: string;
}) {
  const createUseCase = new CreateCustomProgramUseCase(
    input.context.repositories.programRepository,
    input.context.repositories.trainingSettingsRepository,
    input.context.repositories.exerciseProgressionSettingsRepository,
    input.context.repositories.programTrainingContextRepository,
    input.context.transactionManager,
    input.context.repositories.idempotencyRepository
  );

  const created = await createUseCase.execute({
    context: { userId: input.userId, unitSystem: "imperial" },
    request: {
      name: input.programName,
      workouts: input.workouts
    },
    idempotencyKey: input.idempotencyKey
  });

  const firstTemplateId = created.data.program.workouts[0]?.id;
  if (!firstTemplateId) {
    throw new Error("Custom program did not create a workout template.");
  }

  await cancelActiveEnrollment(input.context, input.userId);

  await input.context.db.insert(userProgramEnrollments).values({
    id: `enrollment-${input.userId}-${input.idempotencyKey}`,
    userId: input.userId,
    programId: created.data.program.id,
    status: "active",
    startedAt: new Date("2026-04-24T10:00:00.000Z"),
    completedAt: null,
    currentWorkoutTemplateId: firstTemplateId,
    createdAt: new Date("2026-04-24T10:00:00.000Z"),
    updatedAt: new Date("2026-04-24T10:00:00.000Z")
  });

  return created.data.program;
}

async function startAndCompleteWorkout(input: {
  context: Awaited<ReturnType<typeof createWorkoutInfrastructureTestContext>>;
  userId: string;
  templateId: string;
  idempotencyKey: string;
}) {
  const startUseCase = new StartWorkoutSessionUseCase(
    input.context.repositories.workoutSessionRepository,
    input.context.repositories.enrollmentRepository,
    input.context.repositories.progressionStateRepository,
    input.context.repositories.progressionStateV2Repository,
    input.context.repositories.exerciseRepository,
    input.context.transactionManager,
    input.context.repositories.idempotencyRepository
  );
  const logUseCase = new LogSetUseCase(
    input.context.repositories.workoutSessionRepository,
    input.context.transactionManager,
    input.context.repositories.idempotencyRepository
  );
  const completeUseCase = new CompleteWorkoutSessionUseCase(
    input.context.repositories.workoutSessionRepository,
    input.context.repositories.enrollmentRepository,
    input.context.repositories.progressionStateRepository,
    input.context.repositories.progressionStateV2Repository,
    input.context.repositories.exerciseRepository,
    input.context.repositories.userRepository,
    input.context.repositories.programRepository,
    input.context.repositories.progressMetricRepository,
    input.context.repositories.progressionRecommendationEventRepository,
    input.context.repositories.trainingSettingsRepository,
    input.context.repositories.exerciseProgressionSettingsRepository,
    input.context.transactionManager,
    input.context.repositories.idempotencyRepository
  );

  const started = await startUseCase.execute({
    context: { userId: input.userId, unitSystem: "imperial" },
    request: { workoutTemplateId: input.templateId },
    idempotencyKey: `${input.idempotencyKey}:start`
  });

  for (const exercise of started.data.exercises) {
    for (const set of exercise.sets) {
      await logUseCase.execute({
        context: { userId: input.userId, unitSystem: "imperial" },
        setId: set.id,
        request: { actualReps: set.targetReps },
        idempotencyKey: `${input.idempotencyKey}:log:${set.id}`
      });
    }
  }

  const completed = await completeUseCase.execute({
    context: { userId: input.userId, unitSystem: "imperial" },
    sessionId: started.data.id,
    request: {
      completedAt: "2026-04-24T10:45:00.000Z",
      exerciseFeedback: started.data.exercises.map((exercise) => ({
        exerciseEntryId: exercise.id,
        effortFeedback: "just_right"
      })),
      userEffortFeedback: "just_right"
    },
    idempotencyKey: `${input.idempotencyKey}:complete`
  });

  return {
    started: started.data,
    completed: completed.data
  };
}

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

        const bootstrappedNames = programRows.rows.map((row) => row.name);
        assert.deepEqual(bootstrappedNames.slice(0, 6), [
          "3-Day Full Body Beginner",
          "4-Day Upper/Lower",
          "4-Day Upper/Lower + Arms",
          "5-Day Push/Pull/Legs",
          "3-Day Strength Focus",
          "4-Day Hypertrophy Focus"
        ]);
        assert.ok(bootstrappedNames.includes("2-Day Beginner Full Body"));

        await client.query(
          `update workout_template_exercise_entries
           set id = $1, target_sets = 9
           where workout_template_id = $2 and sequence_order = 1`,
          [
            "77777777-7777-7777-7777-777777770001",
            "33333333-3333-3333-3333-333333333333"
          ]
        );
        await client.query(
          `insert into programs
           (id, user_id, source, name, description, days_per_week, session_duration_minutes, difficulty_level, is_active)
           values ($1, $2, 'custom', 'User Custom Program', null, 1, 45, 'beginner', true)`,
          ["99999999-9999-9999-9999-999999999901", DEV_USER_ID]
        );
        await client.query(
          `insert into workout_templates
           (id, program_id, name, category, sequence_order, estimated_duration_minutes, is_active)
           values ($1, $2, 'User Custom Day', 'Full Body', 1, 45, true)`,
          ["99999999-9999-9999-9999-999999999902", "99999999-9999-9999-9999-999999999901"]
        );
        await client.query(
          `insert into workout_template_exercise_entries
           (id, workout_template_id, exercise_id, sequence_order, target_sets, target_reps, rest_seconds)
           values ($1, $2, $3, 1, 2, 12, 60)`,
          [
            "99999999-9999-9999-9999-999999999903",
            "99999999-9999-9999-9999-999999999902",
            "66666666-6666-6666-6666-666666666602"
          ]
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
        const duplicateTemplateEntryRows = (await client.query(
          `select workout_template_id, sequence_order, count(*) as count
           from workout_template_exercise_entries
           group by workout_template_id, sequence_order
           having count(*) > 1`
        )) as { rows: Array<{ workout_template_id: string; sequence_order: number; count: string }> };
        const restoredEntryRows = (await client.query(
          `select id, target_sets
           from workout_template_exercise_entries
           where workout_template_id = $1 and sequence_order = 1`,
          ["33333333-3333-3333-3333-333333333333"]
        )) as { rows: Array<{ id: string; target_sets: number }> };
        const customRows = (await client.query(
          `select p.id as program_id, wt.id as template_id, wtee.id as entry_id
           from programs p
           join workout_templates wt on wt.program_id = p.id
           join workout_template_exercise_entries wtee on wtee.workout_template_id = wt.id
           where p.id = $1`,
          ["99999999-9999-9999-9999-999999999901"]
        )) as { rows: Array<{ program_id: string; template_id: string; entry_id: string }> };

        const actualNames = programRows.rows.map((row) => row.name);
        const expectedNames = [...seedPrograms.map((program) => program.name), "User Custom Program"];
        assert.deepEqual(
          [...actualNames].sort((a, b) => a.localeCompare(b)),
          [...expectedNames].sort((a, b) => a.localeCompare(b))
        );
        assert.equal(activeEnrollmentRows.rows.length, 1);
        assert.equal(activeEnrollmentRows.rows[0]?.program_id, "22222222-2222-2222-2222-222222222223");
        assert.equal(duplicateTemplateEntryRows.rows.length, 0);
        assert.equal(restoredEntryRows.rows.length, 1);
        assert.equal(restoredEntryRows.rows[0]?.id, "77777777-7777-7777-7777-780000000001");
        assert.equal(Number(restoredEntryRows.rows[0]?.target_sets), 3);
        assert.equal(customRows.rows.length, 1);
        assert.equal(customRows.rows[0]?.template_id, "99999999-9999-9999-9999-999999999902");
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
          context.repositories.progressionStateV2Repository,
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
        assert.equal(counts.progressionStatesV2, 1);
        assert.equal(counts.idempotencyRecords, 1);
        assert.equal(result.data.exercises[0]?.workoutTemplateExerciseEntryId, "template-entry-1");
        assert.equal(result.data.exercises[0]?.repRangeMin, 8);
        assert.equal(result.data.exercises[0]?.repRangeMax, 8);
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Start workout seeds progression v2 from existing v1 state",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);

        await context.db.insert(progressionStates).values({
          id: "progression-1",
          userId: "user-1",
          exerciseId: "exercise-1",
          currentWeightLbs: "150.00",
          lastCompletedWeightLbs: "145.00",
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt: new Date("2026-04-20T10:00:00.000Z"),
          createdAt: new Date("2026-04-20T10:00:00.000Z"),
          updatedAt: new Date("2026-04-20T10:00:00.000Z")
        });

        const useCase = new StartWorkoutSessionUseCase(
          context.repositories.workoutSessionRepository,
          context.repositories.enrollmentRepository,
          context.repositories.progressionStateRepository,
          context.repositories.progressionStateV2Repository,
          context.repositories.exerciseRepository,
          context.transactionManager,
          context.repositories.idempotencyRepository
        );

        const result = await useCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" },
          request: {},
          idempotencyKey: "start-key-seed-v2"
        });

        const [row] = await context.db.select().from(progressionStatesV2);

        assert.equal(result.data.exercises[0]?.targetWeight.value, 150);
        assert.equal(String(row?.currentWeightLbs), "150.00");
        assert.equal(String(row?.lastCompletedWeightLbs), "145.00");
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Progression v2 is independent per template entry for the same exercise",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);

        await context.db.insert(workoutTemplates).values({
          id: "template-2b",
          programId: "program-1",
          name: "Workout B",
          category: "Full Body",
          sequenceOrder: 99,
          estimatedDurationMinutes: 55,
          isActive: true,
          createdAt: new Date("2026-04-24T10:00:00.000Z"),
          updatedAt: new Date("2026-04-24T10:00:00.000Z")
        });

        await context.db.insert(workoutTemplateExerciseEntries).values({
          id: "template-entry-2b",
          workoutTemplateId: "template-2b",
          exerciseId: "exercise-1",
          sequenceOrder: 1,
          targetSets: 3,
          targetReps: 8,
          restSeconds: 120,
          createdAt: new Date("2026-04-24T10:00:00.000Z"),
          updatedAt: new Date("2026-04-24T10:00:00.000Z")
        });

        await context.db
          .update(userProgramEnrollments)
          .set({ currentWorkoutTemplateId: "template-1" })
          .where(eq(userProgramEnrollments.id, "enrollment-1"));

        const startUseCase = new StartWorkoutSessionUseCase(
          context.repositories.workoutSessionRepository,
          context.repositories.enrollmentRepository,
          context.repositories.progressionStateRepository,
          context.repositories.progressionStateV2Repository,
          context.repositories.exerciseRepository,
          context.transactionManager,
          context.repositories.idempotencyRepository
        );

        await startUseCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" },
          request: {},
          idempotencyKey: "start-template-1"
        });

        await context.db
          .update(workoutSessions)
          .set({
            status: "completed",
            completedAt: new Date("2026-04-24T10:30:00.000Z"),
            durationSeconds: 1800,
            updatedAt: new Date("2026-04-24T10:30:00.000Z")
          })
          .where(eq(workoutSessions.userId, "user-1"));

        await context.db
          .update(progressionStatesV2)
          .set({ currentWeightLbs: "200.00" })
          .where(eq(progressionStatesV2.workoutTemplateExerciseEntryId, "template-entry-1"));

        await context.db
          .update(userProgramEnrollments)
          .set({ currentWorkoutTemplateId: "template-2b" })
          .where(eq(userProgramEnrollments.id, "enrollment-1"));

        await startUseCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" },
          request: {},
          idempotencyKey: "start-template-2b"
        });

        const v2Rows = await context.db.select().from(progressionStatesV2);
        const row1 = v2Rows.find((row) => row.workoutTemplateExerciseEntryId === "template-entry-1");
        const row2 = v2Rows.find((row) => row.workoutTemplateExerciseEntryId === "template-entry-2b");

        assert.equal(String(row1?.currentWeightLbs), "200.00");
        assert.equal(String(row2?.currentWeightLbs), "135.00");
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Custom program edit (rename-only) preserves progression_states_v2 by template entry id",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);

        const program = await createAndEnrollCustomProgram({
          context,
          userId: "user-1",
          programName: "My Custom Program",
          workouts: [
            {
              name: "Day 1",
              exercises: [{ exerciseId: "exercise-1", targetSets: 3, targetReps: 8 }]
            }
          ],
          idempotencyKey: "custom-edit-rename-only"
        });

        await startAndCompleteWorkout({
          context,
          userId: "user-1",
          templateId: program.workouts[0]!.id,
          idempotencyKey: "custom-edit-rename-only"
        });

        const templateEntryId = program.workouts[0]!.exercises[0]!.id;
        const [before] = await context.db
          .select()
          .from(progressionStatesV2)
          .where(eq(progressionStatesV2.workoutTemplateExerciseEntryId, templateEntryId));

        assert.equal(String(before?.currentWeightLbs), "140.00");

        const updateUseCase = new UpdateCustomProgramUseCase(
          context.repositories.programRepository,
          context.transactionManager
        );

        await updateUseCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" },
          programId: program.id,
          request: {
            name: "My Custom Program (Renamed)",
            workouts: [
              {
                name: "Day 1",
                exercises: [
                  {
                    exerciseId: "exercise-1",
                    workoutTemplateExerciseEntryId: templateEntryId,
                    targetSets: 3,
                    targetReps: 8
                  }
                ]
              }
            ]
          }
        });

        const startUseCase = new StartWorkoutSessionUseCase(
          context.repositories.workoutSessionRepository,
          context.repositories.enrollmentRepository,
          context.repositories.progressionStateRepository,
          context.repositories.progressionStateV2Repository,
          context.repositories.exerciseRepository,
          context.transactionManager,
          context.repositories.idempotencyRepository
        );

        const started = await startUseCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" },
          request: { workoutTemplateId: program.workouts[0]!.id },
          idempotencyKey: "custom-edit-rename-only:start-again"
        });

        assert.equal(started.data.exercises[0]!.workoutTemplateExerciseEntryId, templateEntryId);
        assert.equal(started.data.exercises[0]!.targetWeight.value, 140);
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Custom program edit (reorder/add/remove) preserves progression_states_v2 and seeds new entries",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);

        await context.db.insert(exercises).values({
          id: "exercise-2",
          name: "Barbell Row",
          category: "compound",
          movementPattern: "pull",
          primaryMuscleGroup: "back",
          equipmentType: "barbell",
          defaultStartingWeightLbs: "95.00",
          defaultIncrementLbs: "5.00",
          isActive: true,
          createdAt: new Date("2026-04-24T10:00:00.000Z"),
          updatedAt: new Date("2026-04-24T10:00:00.000Z")
        });

        await context.db.insert(exercises).values({
          id: "exercise-3",
          name: "Dumbbell Curl",
          category: "accessory",
          movementPattern: "pull",
          primaryMuscleGroup: "biceps",
          equipmentType: "dumbbell",
          defaultStartingWeightLbs: "25.00",
          defaultIncrementLbs: "2.50",
          isActive: true,
          createdAt: new Date("2026-04-24T10:00:00.000Z"),
          updatedAt: new Date("2026-04-24T10:00:00.000Z")
        });

        const program = await createAndEnrollCustomProgram({
          context,
          userId: "user-1",
          programName: "Two Exercise Program",
          workouts: [
            {
              name: "Day 1",
              exercises: [
                { exerciseId: "exercise-1", targetSets: 3, targetReps: 8 },
                { exerciseId: "exercise-2", targetSets: 3, targetReps: 8 }
              ]
            }
          ],
          idempotencyKey: "custom-edit-reorder-add-remove"
        });

        await startAndCompleteWorkout({
          context,
          userId: "user-1",
          templateId: program.workouts[0]!.id,
          idempotencyKey: "custom-edit-reorder-add-remove"
        });

        const entryA = program.workouts[0]!.exercises.find((exercise) => exercise.exerciseId === "exercise-1")!.id;
        const entryB = program.workouts[0]!.exercises.find((exercise) => exercise.exerciseId === "exercise-2")!.id;

        const v2RowsBefore = await context.db
          .select()
          .from(progressionStatesV2)
          .where(eq(progressionStatesV2.userId, "user-1"));
        const v2ByEntryId = new Map(v2RowsBefore.map((row) => [row.workoutTemplateExerciseEntryId, row]));

        const weightA = Number(v2ByEntryId.get(entryA)!.currentWeightLbs);
        const weightB = Number(v2ByEntryId.get(entryB)!.currentWeightLbs);

        const updateUseCase = new UpdateCustomProgramUseCase(
          context.repositories.programRepository,
          context.transactionManager
        );

        await updateUseCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" },
          programId: program.id,
          request: {
            name: "Two Exercise Program (Edited)",
            workouts: [
              {
                name: "Day 1",
                exercises: [
                  { exerciseId: "exercise-2", workoutTemplateExerciseEntryId: entryB, targetSets: 3, targetReps: 8 },
                  { exerciseId: "exercise-1", workoutTemplateExerciseEntryId: entryA, targetSets: 3, targetReps: 8 },
                  { exerciseId: "exercise-3", targetSets: 2, targetReps: 12 }
                ]
              }
            ]
          }
        });

        const startUseCase = new StartWorkoutSessionUseCase(
          context.repositories.workoutSessionRepository,
          context.repositories.enrollmentRepository,
          context.repositories.progressionStateRepository,
          context.repositories.progressionStateV2Repository,
          context.repositories.exerciseRepository,
          context.transactionManager,
          context.repositories.idempotencyRepository
        );

        const startedAfterAdd = await startUseCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" },
          request: { workoutTemplateId: program.workouts[0]!.id },
          idempotencyKey: "custom-edit-reorder-add-remove:start-after-add"
        });

        assert.equal(startedAfterAdd.data.exercises[0]!.exerciseId, "exercise-2");
        assert.equal(startedAfterAdd.data.exercises[0]!.targetWeight.value, weightB);
        assert.equal(startedAfterAdd.data.exercises[1]!.exerciseId, "exercise-1");
        assert.equal(startedAfterAdd.data.exercises[1]!.targetWeight.value, weightA);
        assert.equal(startedAfterAdd.data.exercises[2]!.exerciseId, "exercise-3");
        assert.equal(startedAfterAdd.data.exercises[2]!.targetWeight.value, 25);

        await context.db
          .update(workoutSessions)
          .set({ status: "abandoned", updatedAt: new Date("2026-04-24T10:46:00.000Z") })
          .where(eq(workoutSessions.id, startedAfterAdd.data.id));

        await cancelActiveEnrollment(context, "user-1");
        await context.db.insert(userProgramEnrollments).values({
          id: "enrollment-user-1-custom-edit-reorder-add-remove-2",
          userId: "user-1",
          programId: program.id,
          status: "active",
          startedAt: new Date("2026-04-24T10:00:00.000Z"),
          completedAt: null,
          currentWorkoutTemplateId: program.workouts[0]!.id,
          createdAt: new Date("2026-04-24T10:00:00.000Z"),
          updatedAt: new Date("2026-04-24T10:00:00.000Z")
        });

        await updateUseCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" },
          programId: program.id,
          request: {
            name: "Two Exercise Program (Removed B)",
            workouts: [
              {
                name: "Day 1",
                exercises: [
                  { exerciseId: "exercise-1", workoutTemplateExerciseEntryId: entryA, targetSets: 3, targetReps: 8 }
                ]
              }
            ]
          }
        });

        const startedAfterRemove = await startUseCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" },
          request: { workoutTemplateId: program.workouts[0]!.id },
          idempotencyKey: "custom-edit-reorder-add-remove:start-after-remove"
        });

        assert.deepEqual(
          startedAfterRemove.data.exercises.map((exercise) => exercise.exerciseId),
          ["exercise-1"]
        );
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Custom program edit preserves separate progression states for duplicate exercises when entry ids are provided",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);

        const program = await createAndEnrollCustomProgram({
          context,
          userId: "user-1",
          programName: "Duplicate Exercise Program",
          workouts: [
            {
              name: "Day 1",
              exercises: [
                { exerciseId: "exercise-1", targetSets: 3, targetReps: 8 },
                { exerciseId: "exercise-1", targetSets: 4, targetReps: 8 }
              ]
            }
          ],
          idempotencyKey: "custom-edit-duplicate"
        });

        const startUseCase = new StartWorkoutSessionUseCase(
          context.repositories.workoutSessionRepository,
          context.repositories.enrollmentRepository,
          context.repositories.progressionStateRepository,
          context.repositories.progressionStateV2Repository,
          context.repositories.exerciseRepository,
          context.transactionManager,
          context.repositories.idempotencyRepository
        );

        const started = await startUseCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" },
          request: { workoutTemplateId: program.workouts[0]!.id },
          idempotencyKey: "custom-edit-duplicate:start"
        });

        const [firstEntryId, secondEntryId] = started.data.exercises.map((exercise) => exercise.workoutTemplateExerciseEntryId);
        if (!firstEntryId || !secondEntryId) {
          throw new Error("Expected template entry ids for duplicate exercises.");
        }

        await context.db
          .update(progressionStatesV2)
          .set({ currentWeightLbs: "111.00", updatedAt: new Date("2026-04-24T10:30:00.000Z") })
          .where(eq(progressionStatesV2.workoutTemplateExerciseEntryId, firstEntryId));
        await context.db
          .update(progressionStatesV2)
          .set({ currentWeightLbs: "222.00", updatedAt: new Date("2026-04-24T10:30:00.000Z") })
          .where(eq(progressionStatesV2.workoutTemplateExerciseEntryId, secondEntryId));

        await context.db
          .update(workoutSessions)
          .set({ status: "abandoned", updatedAt: new Date("2026-04-24T10:31:00.000Z") })
          .where(eq(workoutSessions.id, started.data.id));

        const updateUseCase = new UpdateCustomProgramUseCase(
          context.repositories.programRepository,
          context.transactionManager
        );

        await updateUseCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" },
          programId: program.id,
          request: {
            name: "Duplicate Exercise Program (Reordered)",
            workouts: [
              {
                name: "Day 1",
                exercises: [
                  { exerciseId: "exercise-1", workoutTemplateExerciseEntryId: secondEntryId, targetSets: 4, targetReps: 8 },
                  { exerciseId: "exercise-1", workoutTemplateExerciseEntryId: firstEntryId, targetSets: 3, targetReps: 8 }
                ]
              }
            ]
          }
        });

        const restarted = await startUseCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" },
          request: { workoutTemplateId: program.workouts[0]!.id },
          idempotencyKey: "custom-edit-duplicate:restart"
        });

        assert.equal(restarted.data.exercises[0]!.workoutTemplateExerciseEntryId, secondEntryId);
        assert.equal(restarted.data.exercises[0]!.targetWeight.value, 222);
        assert.equal(restarted.data.exercises[1]!.workoutTemplateExerciseEntryId, firstEntryId);
        assert.equal(restarted.data.exercises[1]!.targetWeight.value, 111);
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Custom program edit rejects invalid or foreign workoutTemplateExerciseEntryId references",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);

        const program = await createAndEnrollCustomProgram({
          context,
          userId: "user-1",
          programName: "Validation Program",
          workouts: [
            {
              name: "Day 1",
              exercises: [{ exerciseId: "exercise-1", targetSets: 3, targetReps: 8 }]
            }
          ],
          idempotencyKey: "custom-edit-invalid-entry"
        });

        const updateUseCase = new UpdateCustomProgramUseCase(
          context.repositories.programRepository,
          context.transactionManager
        );

        await assert.rejects(
          () =>
            updateUseCase.execute({
              context: { userId: "user-1", unitSystem: "imperial" },
              programId: program.id,
              request: {
                name: "Validation Program",
                workouts: [
                  {
                    name: "Day 1",
                    exercises: [
                      {
                        exerciseId: "exercise-1",
                        workoutTemplateExerciseEntryId: "not-a-real-entry",
                        targetSets: 3,
                        targetReps: 8
                      }
                    ]
                  }
                ]
              }
            }),
          (error: unknown) =>
            error instanceof WorkoutApplicationError &&
            error.code === "VALIDATION_ERROR" &&
            /workoutTemplateExerciseEntryId/i.test(error.message)
        );

        await context.db.insert(users).values({
          id: "user-2",
          authProviderId: "auth-user-2",
          email: "user-2@example.com",
          displayName: "User Two",
          timezone: "America/New_York",
          unitSystem: "imperial",
          experienceLevel: "beginner",
          createdAt: new Date("2026-04-24T10:00:00.000Z"),
          updatedAt: new Date("2026-04-24T10:00:00.000Z")
        });

        const otherProgram = await createAndEnrollCustomProgram({
          context,
          userId: "user-2",
          programName: "Other User Program",
          workouts: [
            {
              name: "Day 1",
              exercises: [{ exerciseId: "exercise-1", targetSets: 3, targetReps: 8 }]
            }
          ],
          idempotencyKey: "custom-edit-foreign-entry"
        });

        const foreignEntryId = otherProgram.workouts[0]!.exercises[0]!.id;

        await assert.rejects(
          () =>
            updateUseCase.execute({
              context: { userId: "user-1", unitSystem: "imperial" },
              programId: program.id,
              request: {
                name: "Validation Program",
                workouts: [
                  {
                    name: "Day 1",
                    exercises: [
                      {
                        exerciseId: "exercise-1",
                        workoutTemplateExerciseEntryId: foreignEntryId,
                        targetSets: 3,
                        targetReps: 8
                      }
                    ]
                  }
                ]
              }
            }),
          (error: unknown) =>
            error instanceof WorkoutApplicationError &&
            error.code === "VALIDATION_ERROR" &&
            /workoutTemplateExerciseEntryId/i.test(error.message)
        );
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
          context.repositories.progressionStateV2Repository,
          context.repositories.exerciseRepository,
          context.repositories.userRepository,
          context.repositories.programRepository,
          context.repositories.progressMetricRepository,
          context.repositories.progressionRecommendationEventRepository,
          context.repositories.trainingSettingsRepository,
          context.repositories.exerciseProgressionSettingsRepository,
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
        const [persistedProgressionStateV2] = await context.db.select().from(progressionStatesV2);
        const persistedMetrics = await context.db.select().from(progressMetrics);
        const [persistedEnrollment] = await context.db.select().from(userProgramEnrollments);

        assert.equal(result.data.workoutSession.status, "completed");
        assert.equal(result.data.progressionUpdates[0]?.nextWeight.value, 140);
        assert.equal(persistedSession?.status, "completed");
        assert.equal(String(persistedProgressionState?.currentWeightLbs), "140.00");
        assert.equal(String(persistedProgressionState?.lastCompletedWeightLbs), "135.00");
        assert.equal(persistedProgressionState?.consecutiveFailures, 0);
        assert.equal(String(persistedProgressionStateV2?.currentWeightLbs), "140.00");
        assert.equal(String(persistedProgressionStateV2?.lastCompletedWeightLbs), "135.00");
        assert.equal(persistedProgressionStateV2?.repGoal, 8);
        assert.equal(persistedMetrics.length, 2);
        assert.equal(persistedEnrollment?.currentWorkoutTemplateId, "template-2");
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Complete workout (double progression) increases rep goal within range and does not affect other template entries",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);

        await context.db.insert(workoutTemplates).values({
          id: "template-2b",
          programId: "program-1",
          name: "Workout B",
          category: "Full Body",
          sequenceOrder: 99,
          estimatedDurationMinutes: 55,
          isActive: true,
          createdAt: new Date("2026-04-24T10:00:00.000Z"),
          updatedAt: new Date("2026-04-24T10:00:00.000Z")
        });

        await context.db.insert(workoutTemplateExerciseEntries).values({
          id: "template-entry-2b",
          workoutTemplateId: "template-2b",
          exerciseId: "exercise-1",
          sequenceOrder: 1,
          targetSets: 3,
          targetReps: 8,
          restSeconds: 120,
          createdAt: new Date("2026-04-24T10:00:00.000Z"),
          updatedAt: new Date("2026-04-24T10:00:00.000Z")
        });

        await context.db.insert(progressionStatesV2).values([
          {
            id: "v2-template-1",
            userId: "user-1",
            workoutTemplateExerciseEntryId: "template-entry-1",
            currentWeightLbs: "135.00",
            lastCompletedWeightLbs: "130.00",
            repGoal: 8,
            repRangeMin: 6,
            repRangeMax: 10,
            consecutiveFailures: 0,
            lastEffortFeedback: "just_right",
            lastPerformedAt: new Date("2026-04-20T10:00:00.000Z"),
            createdAt: new Date("2026-04-20T10:00:00.000Z"),
            updatedAt: new Date("2026-04-20T10:00:00.000Z")
          },
          {
            id: "v2-template-2b",
            userId: "user-1",
            workoutTemplateExerciseEntryId: "template-entry-2b",
            currentWeightLbs: "155.00",
            lastCompletedWeightLbs: "150.00",
            repGoal: 8,
            repRangeMin: 6,
            repRangeMax: 10,
            consecutiveFailures: 0,
            lastEffortFeedback: "just_right",
            lastPerformedAt: new Date("2026-04-20T10:00:00.000Z"),
            createdAt: new Date("2026-04-20T10:00:00.000Z"),
            updatedAt: new Date("2026-04-20T10:00:00.000Z")
          }
        ]);

        await seedInProgressWorkout(context, {
          setStatuses: ["completed", "completed", "completed"],
          actualReps: [8, 8, 8]
        });

        const useCase = new CompleteWorkoutSessionUseCase(
          context.repositories.workoutSessionRepository,
          context.repositories.enrollmentRepository,
          context.repositories.progressionStateRepository,
          context.repositories.progressionStateV2Repository,
          context.repositories.exerciseRepository,
          context.repositories.userRepository,
          context.repositories.programRepository,
          context.repositories.progressMetricRepository,
          context.repositories.progressionRecommendationEventRepository,
          context.repositories.trainingSettingsRepository,
          context.repositories.exerciseProgressionSettingsRepository,
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
          idempotencyKey: "complete-key-double-1"
        });

        assert.equal(result.data.progressionUpdates[0]?.previousRepGoal, 8);
        assert.equal(result.data.progressionUpdates[0]?.nextRepGoal, 9);
        assert.equal(result.data.progressionUpdates[0]?.nextWeight.value, 135);

        const v2Rows = await context.db.select().from(progressionStatesV2);
        const row1 = v2Rows.find((row) => row.workoutTemplateExerciseEntryId === "template-entry-1");
        const row2 = v2Rows.find((row) => row.workoutTemplateExerciseEntryId === "template-entry-2b");

        assert.equal(row1?.repGoal, 9);
        assert.equal(String(row1?.currentWeightLbs), "135.00");
        assert.equal(row2?.repGoal, 8);
        assert.equal(String(row2?.currentWeightLbs), "155.00");
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Progression recommendation events persist (increased)",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        await seedInProgressWorkout(context);

        const useCase = new CompleteWorkoutSessionUseCase(
          context.repositories.workoutSessionRepository,
          context.repositories.enrollmentRepository,
          context.repositories.progressionStateRepository,
          context.repositories.progressionStateV2Repository,
          context.repositories.exerciseRepository,
          context.repositories.userRepository,
          context.repositories.programRepository,
          context.repositories.progressMetricRepository,
          context.repositories.progressionRecommendationEventRepository,
          context.repositories.trainingSettingsRepository,
          context.repositories.exerciseProgressionSettingsRepository,
          context.transactionManager,
          context.repositories.idempotencyRepository
        );

        const result = await useCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" },
          sessionId: "session-1",
          request: {
            completedAt: "2026-04-24T10:45:00.000Z",
            exerciseFeedback: [{ exerciseEntryId: "entry-1", effortFeedback: "just_right" }]
          },
          idempotencyKey: "complete-event-increased-key-1"
        });

        assert.equal(result.data.progressionUpdates[0]?.result, "increased");

        const events = await context.db
          .select()
          .from(progressionRecommendationEvents)
          .where(eq(progressionRecommendationEvents.workoutSessionId, "session-1"));

        assert.equal(events.length, 1);
        assert.equal(events[0]?.result, "increased");
        assert.equal(events[0]?.userId, "user-1");
        assert.equal(events[0]?.exerciseEntryId, "entry-1");
        assert.equal(events[0]?.workoutSessionId, "session-1");
        assert.ok(events[0]?.reason.length > 0);
        assert.ok(Array.isArray(events[0]?.reasonCodes));
        assert.ok(Array.isArray(events[0]?.evidence));
        assert.equal(typeof events[0]?.inputSnapshot, "object");
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Progression recommendation events persist (repeated)",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        await seedInProgressWorkout(context);

        const useCase = new CompleteWorkoutSessionUseCase(
          context.repositories.workoutSessionRepository,
          context.repositories.enrollmentRepository,
          context.repositories.progressionStateRepository,
          context.repositories.progressionStateV2Repository,
          context.repositories.exerciseRepository,
          context.repositories.userRepository,
          context.repositories.programRepository,
          context.repositories.progressMetricRepository,
          context.repositories.progressionRecommendationEventRepository,
          context.repositories.trainingSettingsRepository,
          context.repositories.exerciseProgressionSettingsRepository,
          context.transactionManager,
          context.repositories.idempotencyRepository
        );

        const result = await useCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" },
          sessionId: "session-1",
          request: {
            completedAt: "2026-04-24T10:45:00.000Z",
            exerciseFeedback: [{ exerciseEntryId: "entry-1", effortFeedback: "too_hard" }]
          },
          idempotencyKey: "complete-event-repeated-key-1"
        });

        assert.equal(result.data.progressionUpdates[0]?.result, "repeated");

        const events = await context.db
          .select()
          .from(progressionRecommendationEvents)
          .where(eq(progressionRecommendationEvents.workoutSessionId, "session-1"));

        assert.equal(events.length, 1);
        assert.equal(events[0]?.result, "repeated");
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Progression recommendation events persist (reduced)",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        await seedInProgressWorkout(context);

        await context.db
          .update(progressionStates)
          .set({ lastPerformedAt: new Date("2026-03-01T10:00:00.000Z") })
          .where(eq(progressionStates.id, "progression-1"));

        const useCase = new CompleteWorkoutSessionUseCase(
          context.repositories.workoutSessionRepository,
          context.repositories.enrollmentRepository,
          context.repositories.progressionStateRepository,
          context.repositories.progressionStateV2Repository,
          context.repositories.exerciseRepository,
          context.repositories.userRepository,
          context.repositories.programRepository,
          context.repositories.progressMetricRepository,
          context.repositories.progressionRecommendationEventRepository,
          context.repositories.trainingSettingsRepository,
          context.repositories.exerciseProgressionSettingsRepository,
          context.transactionManager,
          context.repositories.idempotencyRepository
        );

        const result = await useCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" },
          sessionId: "session-1",
          request: {
            completedAt: "2026-04-24T10:45:00.000Z",
            exerciseFeedback: [{ exerciseEntryId: "entry-1", effortFeedback: "just_right" }]
          },
          idempotencyKey: "complete-event-reduced-key-1"
        });

        assert.equal(result.data.progressionUpdates[0]?.result, "reduced");

        const events = await context.db
          .select()
          .from(progressionRecommendationEvents)
          .where(eq(progressionRecommendationEvents.workoutSessionId, "session-1"));

        assert.equal(events.length, 1);
        assert.equal(events[0]?.result, "reduced");
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Progression recommendation events persist (recalibrated)",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        await seedInProgressWorkout(context, { setStatuses: ["completed", "completed", "completed"], actualReps: [4, 4, 8] });

        await context.db.update(sets).set({ actualWeightLbs: "215.00" }).where(eq(sets.id, "set-1"));
        await context.db.update(sets).set({ actualWeightLbs: "215.00" }).where(eq(sets.id, "set-2"));

        const useCase = new CompleteWorkoutSessionUseCase(
          context.repositories.workoutSessionRepository,
          context.repositories.enrollmentRepository,
          context.repositories.progressionStateRepository,
          context.repositories.progressionStateV2Repository,
          context.repositories.exerciseRepository,
          context.repositories.userRepository,
          context.repositories.programRepository,
          context.repositories.progressMetricRepository,
          context.repositories.progressionRecommendationEventRepository,
          context.repositories.trainingSettingsRepository,
          context.repositories.exerciseProgressionSettingsRepository,
          context.transactionManager,
          context.repositories.idempotencyRepository
        );

        const result = await useCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" },
          sessionId: "session-1",
          request: {
            completedAt: "2026-04-24T10:45:00.000Z",
            exerciseFeedback: [{ exerciseEntryId: "entry-1", effortFeedback: "just_right" }]
          },
          idempotencyKey: "complete-event-recalibrated-key-1"
        });

        assert.equal(result.data.progressionUpdates[0]?.result, "recalibrated");

        const events = await context.db
          .select()
          .from(progressionRecommendationEvents)
          .where(eq(progressionRecommendationEvents.workoutSessionId, "session-1"));

        assert.equal(events.length, 1);
        assert.equal(events[0]?.result, "recalibrated");
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Progression recommendation events persist (skipped)",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        await seedInProgressWorkout(context);

        const useCase = new CompleteWorkoutSessionUseCase(
          context.repositories.workoutSessionRepository,
          context.repositories.enrollmentRepository,
          context.repositories.progressionStateRepository,
          context.repositories.progressionStateV2Repository,
          context.repositories.exerciseRepository,
          context.repositories.userRepository,
          context.repositories.programRepository,
          context.repositories.progressMetricRepository,
          context.repositories.progressionRecommendationEventRepository,
          context.repositories.trainingSettingsRepository,
          context.repositories.exerciseProgressionSettingsRepository,
          context.transactionManager,
          context.repositories.idempotencyRepository
        );

        const result = await useCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" },
          sessionId: "session-1",
          request: {
            completedAt: "2026-04-24T10:45:00.000Z",
            exerciseFeedback: []
          },
          idempotencyKey: "complete-event-skipped-key-1"
        });

        assert.equal(result.data.progressionUpdates[0]?.result, "skipped");

        const [persistedProgressionStateV2] = await context.db.select().from(progressionStatesV2);
        assert.equal(persistedProgressionStateV2?.repGoal, 8);
        assert.equal(String(persistedProgressionStateV2?.currentWeightLbs), "135.00");
        assert.equal(
          persistedProgressionStateV2?.lastPerformedAt?.toISOString(),
          new Date("2026-04-24T10:45:00.000Z").toISOString()
        );

        const events = await context.db
          .select()
          .from(progressionRecommendationEvents)
          .where(eq(progressionRecommendationEvents.workoutSessionId, "session-1"));

        assert.equal(events.length, 1);
        assert.equal(events[0]?.result, "skipped");
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Skipped progression updates lastPerformedAt when strategy is no_progression",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        await seedInProgressWorkout(context);

        await context.db
          .update(workoutTemplateExerciseEntries)
          .set({ progressionStrategy: "no_progression" })
          .where(eq(workoutTemplateExerciseEntries.id, "template-entry-1"));

        const useCase = new CompleteWorkoutSessionUseCase(
          context.repositories.workoutSessionRepository,
          context.repositories.enrollmentRepository,
          context.repositories.progressionStateRepository,
          context.repositories.progressionStateV2Repository,
          context.repositories.exerciseRepository,
          context.repositories.userRepository,
          context.repositories.programRepository,
          context.repositories.progressMetricRepository,
          context.repositories.progressionRecommendationEventRepository,
          context.repositories.trainingSettingsRepository,
          context.repositories.exerciseProgressionSettingsRepository,
          context.transactionManager,
          context.repositories.idempotencyRepository
        );

        const result = await useCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" },
          sessionId: "session-1",
          request: {
            completedAt: "2026-04-24T10:45:00.000Z",
            exerciseFeedback: []
          },
          idempotencyKey: "complete-event-no-progression-key-1"
        });

        assert.equal(result.data.progressionUpdates[0]?.result, "skipped");

        const [persistedProgressionStateV2] = await context.db.select().from(progressionStatesV2);
        assert.equal(String(persistedProgressionStateV2?.currentWeightLbs), "135.00");
        assert.equal(persistedProgressionStateV2?.repGoal, 8);
        assert.equal(
          persistedProgressionStateV2?.lastPerformedAt?.toISOString(),
          new Date("2026-04-24T10:45:00.000Z").toISOString()
        );

        const events = await context.db
          .select()
          .from(progressionRecommendationEvents)
          .where(eq(progressionRecommendationEvents.workoutSessionId, "session-1"));

        assert.equal(events.length, 1);
        assert.equal(events[0]?.result, "skipped");
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Partially logged exercises do not update progression state bookkeeping",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        await seedInProgressWorkout(context, { setStatuses: ["completed", "pending", "pending"] });

        await context.db.insert(progressionStatesV2).values({
          id: "v2-template-1",
          userId: "user-1",
          workoutTemplateExerciseEntryId: "template-entry-1",
          currentWeightLbs: "135.00",
          lastCompletedWeightLbs: "130.00",
          repGoal: 8,
          repRangeMin: 8,
          repRangeMax: 8,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt: new Date("2026-04-20T10:00:00.000Z"),
          createdAt: new Date("2026-04-24T10:00:00.000Z"),
          updatedAt: new Date("2026-04-24T10:00:00.000Z")
        });

        const useCase = new CompleteWorkoutSessionUseCase(
          context.repositories.workoutSessionRepository,
          context.repositories.enrollmentRepository,
          context.repositories.progressionStateRepository,
          context.repositories.progressionStateV2Repository,
          context.repositories.exerciseRepository,
          context.repositories.userRepository,
          context.repositories.programRepository,
          context.repositories.progressMetricRepository,
          context.repositories.progressionRecommendationEventRepository,
          context.repositories.trainingSettingsRepository,
          context.repositories.exerciseProgressionSettingsRepository,
          context.transactionManager,
          context.repositories.idempotencyRepository
        );

        const result = await useCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" },
          sessionId: "session-1",
          request: {
            completedAt: "2026-04-24T10:45:00.000Z",
            exerciseFeedback: [{ exerciseEntryId: "entry-1", effortFeedback: "just_right" }],
            finishEarly: true
          },
          idempotencyKey: "complete-event-partial-skipped-key-1"
        });

        assert.equal(result.data.workoutSession.isPartial, true);
        assert.equal(result.data.progressionUpdates[0]?.result, "skipped");

        const [persistedProgressionStateV2] = await context.db.select().from(progressionStatesV2);
        assert.equal(
          persistedProgressionStateV2?.lastPerformedAt?.toISOString(),
          new Date("2026-04-20T10:00:00.000Z").toISOString()
        );

        const events = await context.db
          .select()
          .from(progressionRecommendationEvents)
          .where(eq(progressionRecommendationEvents.workoutSessionId, "session-1"));

        assert.equal(events.length, 1);
        assert.equal(events[0]?.result, "skipped");
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Missing actual weight holds target load and does not increase weight",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        await seedInProgressWorkout(context);

        await context.db.update(sets).set({ actualWeightLbs: null }).where(eq(sets.id, "set-1"));

        const useCase = new CompleteWorkoutSessionUseCase(
          context.repositories.workoutSessionRepository,
          context.repositories.enrollmentRepository,
          context.repositories.progressionStateRepository,
          context.repositories.progressionStateV2Repository,
          context.repositories.exerciseRepository,
          context.repositories.userRepository,
          context.repositories.programRepository,
          context.repositories.progressMetricRepository,
          context.repositories.progressionRecommendationEventRepository,
          context.repositories.trainingSettingsRepository,
          context.repositories.exerciseProgressionSettingsRepository,
          context.transactionManager,
          context.repositories.idempotencyRepository
        );

        const result = await useCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" },
          sessionId: "session-1",
          request: {
            completedAt: "2026-04-24T10:45:00.000Z",
            exerciseFeedback: [{ exerciseEntryId: "entry-1", effortFeedback: "just_right" }]
          },
          idempotencyKey: "complete-event-missing-weight-hold-key-1"
        });

        assert.equal(result.data.progressionUpdates[0]?.result, "repeated");
        assert.equal(result.data.progressionUpdates[0]?.nextWeight.value, 135);
        assert.equal(
          result.data.progressionUpdates[0]?.reason,
          "Weight was not confirmed, so target load was held."
        );
        assert.equal(result.data.progressionUpdates[0]?.confidence, "low");

        const [persistedProgressionStateV2] = await context.db.select().from(progressionStatesV2);
        assert.equal(String(persistedProgressionStateV2?.currentWeightLbs), "135.00");
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
            programNameSnapshot: "3-Day Full Body Beginner",
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
            programNameSnapshot: "3-Day Full Body Beginner",
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
    name: "Can update a logged set while the workout session is in_progress",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        await seedInProgressWorkout(context, {
          setStatuses: ["completed", "completed", "completed"],
          actualReps: [8, 8, 8]
        });

        const useCase = new UpdateLoggedSetUseCase(
          context.repositories.workoutSessionRepository,
          context.transactionManager,
          context.repositories.idempotencyRepository
        );

        await useCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" },
          setId: "set-1",
          request: {
            actualReps: 7,
            actualWeight: { value: 135, unit: "lb" },
            completedAt: "2026-04-24T10:12:00.000Z"
          },
          idempotencyKey: "update-in-progress-set-1"
        });

        const [updatedSet] = await context.db.select().from(sets).where(eq(sets.id, "set-1"));
        assert.equal(updatedSet?.actualReps, 7);
        assert.equal(updatedSet?.actualWeightLbs, "135.00");
        assert.equal(updatedSet?.status, "failed");
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Cannot update a logged set when the parent workout session is completed",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);

        const completed = await startAndCompleteWorkout({
          context,
          userId: "user-1",
          templateId: "template-1",
          idempotencyKey: "complete-before-edit"
        });

        const setId = completed.started.exercises[0]?.sets[0]?.id;
        assert.ok(setId);

        const useCase = new UpdateLoggedSetUseCase(
          context.repositories.workoutSessionRepository,
          context.transactionManager,
          context.repositories.idempotencyRepository
        );

        await assert.rejects(
          () =>
            useCase.execute({
              context: { userId: "user-1", unitSystem: "imperial" },
              setId,
              request: {
                actualReps: 7,
                actualWeight: { value: 135, unit: "lb" },
                completedAt: "2026-04-24T10:50:00.000Z"
              },
              idempotencyKey: "update-completed-set-1"
            }),
          (error: unknown) =>
            error instanceof WorkoutApplicationError && error.code === "COMPLETED_WORKOUT_READ_ONLY"
        );
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Rejected completed-session set update does not change set data",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);

        const completed = await startAndCompleteWorkout({
          context,
          userId: "user-1",
          templateId: "template-1",
          idempotencyKey: "complete-before-edit-no-set-change"
        });

        const setId = completed.started.exercises[0]?.sets[0]?.id;
        assert.ok(setId);

        const [beforeSet] = await context.db.select().from(sets).where(eq(sets.id, setId));
        assert.ok(beforeSet);

        const useCase = new UpdateLoggedSetUseCase(
          context.repositories.workoutSessionRepository,
          context.transactionManager,
          context.repositories.idempotencyRepository
        );

        await assert.rejects(
          () =>
            useCase.execute({
              context: { userId: "user-1", unitSystem: "imperial" },
              setId,
              request: {
                actualReps: 1,
                actualWeight: { value: 45, unit: "lb" },
                completedAt: "2026-04-24T10:55:00.000Z"
              },
              idempotencyKey: "update-completed-set-no-set-change"
            }),
          (error: unknown) =>
            error instanceof WorkoutApplicationError && error.code === "COMPLETED_WORKOUT_READ_ONLY"
        );

        const [afterSet] = await context.db.select().from(sets).where(eq(sets.id, setId));
        assert.deepEqual(afterSet, beforeSet);
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Rejected completed-session set update does not change progression state",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);

        const completed = await startAndCompleteWorkout({
          context,
          userId: "user-1",
          templateId: "template-1",
          idempotencyKey: "complete-before-edit-no-progression-change"
        });

        const setId = completed.started.exercises[0]?.sets[0]?.id;
        assert.ok(setId);

        const progressionBefore = await context.db.select().from(progressionStates);
        const progressionV2Before = await context.db.select().from(progressionStatesV2);

        const useCase = new UpdateLoggedSetUseCase(
          context.repositories.workoutSessionRepository,
          context.transactionManager,
          context.repositories.idempotencyRepository
        );

        await assert.rejects(
          () =>
            useCase.execute({
              context: { userId: "user-1", unitSystem: "imperial" },
              setId,
              request: {
                actualReps: 1,
                actualWeight: { value: 45, unit: "lb" },
                completedAt: "2026-04-24T10:56:00.000Z"
              },
              idempotencyKey: "update-completed-set-no-progression-change"
            }),
          (error: unknown) =>
            error instanceof WorkoutApplicationError && error.code === "COMPLETED_WORKOUT_READ_ONLY"
        );

        const progressionAfter = await context.db.select().from(progressionStates);
        const progressionV2After = await context.db.select().from(progressionStatesV2);

        assert.deepEqual(progressionAfter, progressionBefore);
        assert.deepEqual(progressionV2After, progressionV2Before);
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Rejected completed-session set update does not create recommendation events",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);

        const completed = await startAndCompleteWorkout({
          context,
          userId: "user-1",
          templateId: "template-1",
          idempotencyKey: "complete-before-edit-no-rec-event"
        });

        const setId = completed.started.exercises[0]?.sets[0]?.id;
        assert.ok(setId);

        const recommendationEventsBefore = await context.db.select().from(progressionRecommendationEvents);

        const useCase = new UpdateLoggedSetUseCase(
          context.repositories.workoutSessionRepository,
          context.transactionManager,
          context.repositories.idempotencyRepository
        );

        await assert.rejects(
          () =>
            useCase.execute({
              context: { userId: "user-1", unitSystem: "imperial" },
              setId,
              request: {
                actualReps: 1,
                actualWeight: { value: 45, unit: "lb" },
                completedAt: "2026-04-24T10:57:00.000Z"
              },
              idempotencyKey: "update-completed-set-no-rec-event"
            }),
          (error: unknown) =>
            error instanceof WorkoutApplicationError && error.code === "COMPLETED_WORKOUT_READ_ONLY"
        );

        const recommendationEventsAfter = await context.db.select().from(progressionRecommendationEvents);
        assert.equal(recommendationEventsAfter.length, recommendationEventsBefore.length);
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
          context.repositories.progressionStateV2Repository,
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
