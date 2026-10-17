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
import { UpdateWorkoutExerciseEntryUseCase } from "../../application/use-cases/update-workout-exercise-entry.use-case.js";
import { UpdateCustomProgramUseCase } from "../../application/use-cases/update-custom-program.use-case.js";
import type { InfrastructureTestCase } from "../test-helpers/infrastructure-test-case.js";
import { eq } from "../db/drizzle-helpers.js";
import {
  countRecords,
  createWorkoutInfrastructureTestContext,
  disposeWorkoutInfrastructureTestContext,
  exerciseEntries,
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
      setScheme?: import("@fitness/shared").ExerciseSetScheme;
      repRangeMin?: number;
      repRangeMax?: number;
      targetWeight?: { value: number; unit: "lb" };
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
    name: "Conflicting exercise vs set effort signals reduce confidence and are evidenced",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        await seedInProgressWorkout(context);

        await context.db
          .update(sets)
          .set({ rir: "rir_0", failureStatus: null })
          .where(eq(sets.id, "set-1"));

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
            exerciseFeedback: [{ exerciseEntryId: "entry-1", effortFeedback: "too_easy" }]
          },
          idempotencyKey: "complete-conflicting-effort-key-1"
        });

        assert.equal(result.data.progressionUpdates.length, 1);
        assert.equal(result.data.progressionUpdates[0]?.confidence, "low");
        assert.ok(result.data.progressionUpdates[0]?.reasonCodes.includes("CONFLICTING_EFFORT_SIGNALS"));
        assert.ok(result.data.progressionUpdates[0]?.reasonCodes.includes("SET_NEAR_FAILURE"));
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
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
        assert.equal(result.data.exercises[0]?.repRangeMin, 6);
        assert.equal(result.data.exercises[0]?.repRangeMax, 10);
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

        assert.equal(result.data.exercises[0]!.targetWeight!.value, 150);
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

        assert.equal(String(before?.currentWeightLbs), "135.00");

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
        assert.equal(started.data.exercises[0]!.targetWeight!.value, 135);
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
        assert.equal(startedAfterAdd.data.exercises[0]!.targetWeight!.value, weightB);
        assert.equal(startedAfterAdd.data.exercises[1]!.exerciseId, "exercise-1");
        assert.equal(startedAfterAdd.data.exercises[1]!.targetWeight!.value, weightA);
        assert.equal(startedAfterAdd.data.exercises[2]!.exerciseId, "exercise-3");
        assert.equal(startedAfterAdd.data.exercises[2]!.targetWeight!.value, 25);

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
        assert.equal(restarted.data.exercises[0]!.targetWeight!.value, 222);
        assert.equal(restarted.data.exercises[1]!.workoutTemplateExerciseEntryId, firstEntryId);
        assert.equal(restarted.data.exercises[1]!.targetWeight!.value, 111);
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
    name: "Drop tier logging preserves target and actual snapshots across repository reload",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();
      try {
        await seedBaseWorkoutProgram(context);
        await seedInProgressWorkout(context, { setStatuses: ["pending", "pending", "pending"], actualReps: [0, 0, 0] });
        await context.db.insert(progressionStatesV2).values({
          id: "v2-tier-adaptation",
          userId: "user-1",
          workoutTemplateExerciseEntryId: "template-entry-1",
          currentWeightLbs: "135.00",
          lastCompletedWeightLbs: "135.00",
          repGoal: 8,
          repRangeMin: 8,
          repRangeMax: 16,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt: new Date("2026-04-24T10:00:00.000Z"),
          createdAt: new Date("2026-04-24T10:00:00.000Z"),
          updatedAt: new Date("2026-04-24T10:00:00.000Z")
        });
        const targets = [
          { order: 1, originalTargetWeight: { value: 135, unit: "lb" as const }, originalTargetReps: 8, targetWeight: { value: 135, unit: "lb" as const }, targetReps: 8, actualWeight: null, actualReps: null, status: "pending" as const },
          { order: 2, originalTargetWeight: { value: 115, unit: "lb" as const }, originalTargetReps: 10, targetWeight: { value: 115, unit: "lb" as const }, targetReps: 10, actualWeight: null, actualReps: null, status: "pending" as const },
          { order: 3, originalTargetWeight: { value: 95, unit: "lb" as const }, originalTargetReps: 12, targetWeight: { value: 95, unit: "lb" as const }, targetReps: 12, actualWeight: null, actualReps: null, status: "pending" as const }
        ];
        await context.db.update(sets).set({ tiers: targets }).where(eq(sets.id, "set-1"));
        const useCase = new LogSetUseCase(context.repositories.workoutSessionRepository, context.transactionManager, context.repositories.idempotencyRepository);
        await useCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" }, setId: "set-1",
          request: {
            actualReps: 8, actualWeight: { value: 135, unit: "lb" },
            tiers: [
              { order: 1, status: "completed", actualReps: 9, actualWeight: { value: 140, unit: "lb" } },
              { order: 2, status: "completed", actualReps: 10, actualWeight: { value: 115, unit: "lb" } },
              { order: 3, status: "skipped" }
            ]
          }, idempotencyKey: "log-drop-partial-set"
        });
        const reloaded = await context.repositories.workoutSessionRepository.findOwnedSessionGraphById("user-1", "session-1");
        const set = reloaded?.sets.find((item) => item.id === "set-1");
        assert.equal(set?.status, "failed");
        assert.deepEqual(set?.tiers?.map((tier) => [tier.order, tier.originalTargetWeight?.value, tier.targetWeight?.value, tier.actualWeight?.value ?? null, tier.actualReps, tier.status]), [
          [1, 135, 135, 140, 9, "completed"], [2, 115, 115, 115, 10, "completed"], [3, 95, 95, null, null, "skipped"]
        ]);
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Completed tier sequences adapt only pending tier targets and preserve manual tier overrides",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();
      try {
        await seedBaseWorkoutProgram(context);
        await seedInProgressWorkout(context, { setStatuses: ["pending", "pending", "pending"], actualReps: [0, 0, 0] });
        const tierTargets = [
          { order: 1, originalTargetWeight: { value: 135, unit: "lb" as const }, originalTargetReps: 8, targetWeight: { value: 135, unit: "lb" as const }, targetReps: 8, actualWeight: null, actualReps: null, status: "pending" as const },
          { order: 2, originalTargetWeight: { value: 115, unit: "lb" as const }, originalTargetReps: 10, targetWeight: { value: 115, unit: "lb" as const }, targetReps: 10, actualWeight: null, actualReps: null, status: "pending" as const },
          { order: 3, originalTargetWeight: { value: 95, unit: "lb" as const }, originalTargetReps: 12, targetWeight: { value: 95, unit: "lb" as const }, targetReps: 12, actualWeight: null, actualReps: null, status: "pending" as const }
        ];
        await context.db.update(sets).set({ tiers: tierTargets }).where(eq(sets.id, "set-1"));
        await context.db.update(sets).set({ tiers: tierTargets }).where(eq(sets.id, "set-2"));
        await context.db.update(sets).set({ tiers: tierTargets.map((tier) => ({ ...tier, adaptationReason: tier.order === 2 ? "manual override" : null })) }).where(eq(sets.id, "set-3"));
        const useCase = new LogSetUseCase(context.repositories.workoutSessionRepository, context.transactionManager, context.repositories.idempotencyRepository);
        await useCase.execute({
          context: { userId: "user-1", unitSystem: "imperial" }, setId: "set-1",
          request: {
            actualReps: 10, actualWeight: { value: 135, unit: "lb" }, rir: "rir_4",
            tiers: [
              { order: 1, status: "completed", actualReps: 10, actualWeight: { value: 135, unit: "lb" } },
              { order: 2, status: "completed", actualReps: 12, actualWeight: { value: 115, unit: "lb" } },
              { order: 3, status: "completed", actualReps: 14, actualWeight: { value: 95, unit: "lb" } }
            ]
          }, idempotencyKey: "log-drop-complete-adapt"
        });
        const reloaded = await context.repositories.workoutSessionRepository.findOwnedSessionGraphById("user-1", "session-1");
        const adapted = reloaded?.sets.find((item) => item.id === "set-2")?.tiers;
        const manual = reloaded?.sets.find((item) => item.id === "set-3")?.tiers;
        assert.deepEqual(adapted?.map((tier) => tier.targetReps), [9, 11, 13]);
        assert.deepEqual(manual?.map((tier) => tier.targetReps), [9, 10, 13]);
        assert.equal(manual?.[1]?.adaptationReason, "manual override");
        assert.ok(adapted?.every((tier) => tier.adaptationReason === "+1 rep after successful tier sequence"));
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
    name: "Progression recommendation events persist when effort feedback is defaulted",
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

        assert.equal(result.data.progressionUpdates[0]?.result, "increased");
        assert.equal(result.data.progressionUpdates[0]?.confidence, "medium");

        const [persistedProgressionStateV2] = await context.db.select().from(progressionStatesV2);
        assert.equal(persistedProgressionStateV2?.repGoal, 8);
        assert.equal(String(persistedProgressionStateV2?.currentWeightLbs), "140.00");
        assert.equal(
          persistedProgressionStateV2?.lastPerformedAt?.toISOString(),
          new Date("2026-04-24T10:45:00.000Z").toISOString()
        );

        const events = await context.db
          .select()
          .from(progressionRecommendationEvents)
          .where(eq(progressionRecommendationEvents.workoutSessionId, "session-1"));

        assert.equal(events.length, 1);
        assert.equal(events[0]?.result, "increased");
        assert.equal(events[0]?.confidence, "medium");
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
          .update(exerciseEntries)
          .set({ progressionRuleSnapshot: { incrementLbs: 5, progressionStrategy: "no_progression" } })
          .where(eq(exerciseEntries.id, "entry-1"));

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
  },
  {
    name: "Reusable set schemes survive plan reload, workout history, and next-session generation",
    run: async () => {
      const schemes = ["straight", "ascending_pyramid", "reverse_pyramid", "amrap", "drop_multi_tier"] as const;
      for (const scheme of schemes) {
        const context = await createWorkoutInfrastructureTestContext();
        try {
          await seedBaseWorkoutProgram(context);
          const program = await createAndEnrollCustomProgram({
            context, userId: "user-1", programName: `Lifecycle ${scheme}`, idempotencyKey: `create-scheme-${scheme}`,
            workouts: [{ name: `Day ${scheme}`, exercises: [{ exerciseId: "exercise-1", targetSets: 3, targetReps: 8, targetWeight: { value: 100, unit: "lb" }, repRangeMin: 8, repRangeMax: 10, setScheme: scheme }] }]
          });
          const templateId = program.workouts[0]?.id;
          assert.ok(templateId, `${scheme}: saved template id`);
          const reloadedPlan = await context.repositories.programRepository.findActiveById(program.id, "user-1");
          const planEntry = reloadedPlan?.templates[0]?.exercises[0];
          assert.equal(planEntry?.setScheme, scheme, `${scheme}: scheme persisted on plan reload`);
          assert.equal(planEntry?.repRangeMin, 8, `${scheme}: explicit minimum range persisted`);
          assert.equal(planEntry?.repRangeMax, 10, `${scheme}: explicit maximum range persisted`);

          const start = new StartWorkoutSessionUseCase(context.repositories.workoutSessionRepository, context.repositories.enrollmentRepository, context.repositories.progressionStateRepository, context.repositories.progressionStateV2Repository, context.repositories.exerciseRepository, context.transactionManager, context.repositories.idempotencyRepository);
          const log = new LogSetUseCase(context.repositories.workoutSessionRepository, context.transactionManager, context.repositories.idempotencyRepository);
          const complete = new CompleteWorkoutSessionUseCase(context.repositories.workoutSessionRepository, context.repositories.enrollmentRepository, context.repositories.progressionStateRepository, context.repositories.progressionStateV2Repository, context.repositories.exerciseRepository, context.repositories.userRepository, context.repositories.programRepository, context.repositories.progressMetricRepository, context.repositories.progressionRecommendationEventRepository, context.repositories.trainingSettingsRepository, context.repositories.exerciseProgressionSettingsRepository, context.transactionManager, context.repositories.idempotencyRepository);
          const first = await start.execute({ context: { userId: "user-1", unitSystem: "imperial" }, request: { workoutTemplateId: templateId }, idempotencyKey: `start-scheme-${scheme}-1` });
          const firstExercise = first.data.exercises[0]!;
          assert.equal(firstExercise.setScheme, scheme);
          if (scheme === "ascending_pyramid") assert.ok((firstExercise.sets[0]?.targetWeight?.value ?? 0) < (firstExercise.sets[2]?.targetWeight?.value ?? 0));
          if (scheme === "reverse_pyramid") assert.ok((firstExercise.sets[0]?.targetWeight?.value ?? 0) > (firstExercise.sets[2]?.targetWeight?.value ?? 0));
          if (scheme === "amrap") assert.equal(firstExercise.sets[2]?.repTargetText, "AMRAP");
          if (scheme === "drop_multi_tier") assert.equal(firstExercise.sets[0]?.tiers?.length, 2);

          for (const set of firstExercise.sets) {
            const reps = set.targetReps == null ? 10 : set.targetReps + 1;
            const firstTier = set.tiers?.[0];
            await log.execute({ context: { userId: "user-1", unitSystem: "imperial" }, setId: set.id, request: {
              actualReps: reps,
              actualWeight: set.targetWeight ?? firstTier?.targetWeight ?? { value: 100, unit: "lb" },
              ...(set.tiers?.length ? { tiers: set.tiers.map((tier) => ({ order: tier.order, status: "completed" as const, actualReps: (tier.targetReps ?? 8) + 1, actualWeight: tier.targetWeight ?? { value: 0, unit: "lb" as const } })) } : {})
            }, idempotencyKey: `log-scheme-${scheme}-${set.id}` });
          }
          await complete.execute({ context: { userId: "user-1", unitSystem: "imperial" }, sessionId: first.data.id, request: { completedAt: "2026-07-01T10:45:00.000Z", exerciseFeedback: [] }, idempotencyKey: `complete-scheme-${scheme}-1` });
          const historyGraph = await context.repositories.workoutSessionRepository.findOwnedSessionGraphById("user-1", first.data.id);
          assert.equal(historyGraph?.exerciseEntries[0]?.progressionRuleSnapshot?.setScheme, scheme);
          assert.equal(historyGraph?.sets[0]?.targetReps, firstExercise.sets[0]?.targetReps);
          assert.equal(historyGraph?.sets[0]?.actualWeightLbs, firstExercise.sets[0]?.targetWeight?.value ?? firstExercise.sets[0]?.tiers?.[0]?.targetWeight?.value);
          if (scheme === "drop_multi_tier") assert.ok(historyGraph?.sets[0]?.tiers?.every((tier) => tier.actualReps != null && tier.actualWeight != null));

          const next = await start.execute({ context: { userId: "user-1", unitSystem: "imperial" }, request: {}, idempotencyKey: `start-scheme-${scheme}-2` });
          const nextExercise = next.data.exercises[0]!;
          assert.equal(nextExercise.setScheme, scheme, `${scheme}: scheme remains on next workout`);
          assert.equal(nextExercise.sets.length, 3);
          if (scheme === "ascending_pyramid") assert.ok((nextExercise.sets[0]?.targetWeight?.value ?? 0) < (nextExercise.sets[2]?.targetWeight?.value ?? 0));
          if (scheme === "reverse_pyramid") assert.ok((nextExercise.sets[0]?.targetWeight?.value ?? 0) > (nextExercise.sets[2]?.targetWeight?.value ?? 0));
          if (scheme === "amrap") assert.equal(nextExercise.sets[2]?.repTargetText, "AMRAP");
          if (scheme === "drop_multi_tier") {
            assert.ok((nextExercise.sets[0]?.tiers?.[0]?.targetReps ?? 0) > (firstExercise.sets[0]?.tiers?.[0]?.targetReps ?? 0));
          } else {
            assert.ok((nextExercise.sets[0]?.targetReps ?? 0) >= (firstExercise.sets[0]?.targetReps ?? 0));
          }
        } finally {
          await disposeWorkoutInfrastructureTestContext(context);
        }
      }
    }
  },
  {
    name: "Drop-tier history preserves full, partial, and changed-load outcomes into the next prescription",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();
      try {
        await seedBaseWorkoutProgram(context);
        const program = await createAndEnrollCustomProgram({ context, userId: "user-1", programName: "Drop Tier Lifecycle", workouts: [{ name: "Day 1", exercises: [{ exerciseId: "exercise-1", targetSets: 3, targetReps: 8, targetWeight: { value: 100, unit: "lb" }, repRangeMin: 8, repRangeMax: 10, setScheme: "drop_multi_tier" }] }], idempotencyKey: "drop-tier-lifecycle" });
        const start = new StartWorkoutSessionUseCase(context.repositories.workoutSessionRepository, context.repositories.enrollmentRepository, context.repositories.progressionStateRepository, context.repositories.progressionStateV2Repository, context.repositories.exerciseRepository, context.transactionManager, context.repositories.idempotencyRepository);
        const log = new LogSetUseCase(context.repositories.workoutSessionRepository, context.transactionManager, context.repositories.idempotencyRepository);
        const complete = new CompleteWorkoutSessionUseCase(context.repositories.workoutSessionRepository, context.repositories.enrollmentRepository, context.repositories.progressionStateRepository, context.repositories.progressionStateV2Repository, context.repositories.exerciseRepository, context.repositories.userRepository, context.repositories.programRepository, context.repositories.progressMetricRepository, context.repositories.progressionRecommendationEventRepository, context.repositories.trainingSettingsRepository, context.repositories.exerciseProgressionSettingsRepository, context.transactionManager, context.repositories.idempotencyRepository);
        const first = await start.execute({ context: { userId: "user-1", unitSystem: "imperial" }, request: { workoutTemplateId: program.workouts[0]!.id }, idempotencyKey: "drop-tier-start-1" });
        const firstSets = first.data.exercises[0]!.sets;
        assert.ok(firstSets.every((set) => set.tiers?.length === 2));
        for (const initial of firstSets) {
          const latest = await context.repositories.workoutSessionRepository.findOwnedSessionGraphById("user-1", first.data.id);
          const set = latest!.sets.find((item) => item.id === initial.id)!;
          const tiers = set.tiers!;
          let tierLog: Array<{ order: number; status: "completed" | "skipped"; actualReps?: number; actualWeight?: { value: number; unit: "lb" } }>;
          if (set.setNumber === 2) {
            tierLog = [
              { order: 1, status: "completed", actualReps: tiers[0]!.targetReps ?? 8, actualWeight: tiers[0]!.targetWeight ?? { value: 100, unit: "lb" } },
              { order: 2, status: "skipped" }
            ];
          } else {
            tierLog = tiers.map((tier) => ({ order: tier.order, status: "completed" as const, actualReps: (tier.targetReps ?? 8) + 1, actualWeight: { value: (tier.targetWeight?.value ?? 100) + (set.setNumber === 3 && tier.order === 1 ? 5 : 0), unit: "lb" as const } }));
          }
          await log.execute({ context: { userId: "user-1", unitSystem: "imperial" }, setId: set.id, request: { actualReps: tierLog[0]?.actualReps ?? null, actualWeight: tierLog[0]?.actualWeight ?? null, tiers: tierLog }, idempotencyKey: `drop-tier-log-${set.id}` });
        }
        await complete.execute({ context: { userId: "user-1", unitSystem: "imperial" }, sessionId: first.data.id, request: { completedAt: "2026-07-01T10:45:00.000Z", exerciseFeedback: [] }, idempotencyKey: "drop-tier-complete-1" });
        const reloaded = await context.repositories.workoutSessionRepository.findOwnedSessionGraphById("user-1", first.data.id);
        const partial = reloaded?.sets.find((set) => set.setNumber === 2);
        const changed = reloaded?.sets.find((set) => set.setNumber === 3);
        assert.equal(partial?.status, "failed");
        assert.deepEqual(partial?.tiers?.map((tier) => tier.status), ["completed", "skipped"]);
        assert.equal(changed?.tiers?.[0]?.targetWeight?.value, changed?.tiers?.[0]?.originalTargetWeight?.value);
        assert.equal(changed?.tiers?.[0]?.actualWeight?.value, (changed?.tiers?.[0]?.targetWeight?.value ?? 0) + 5);

        const next = await start.execute({ context: { userId: "user-1", unitSystem: "imperial" }, request: {}, idempotencyKey: "drop-tier-start-2" });
        const nextSets = next.data.exercises[0]!.sets;
        assert.equal(next.data.exercises[0]?.setScheme, "drop_multi_tier");
        assert.equal(nextSets[0]?.tiers?.[0]?.targetReps, (firstSets[0]?.tiers?.[0]?.targetReps ?? 0) + 2);
        assert.equal(nextSets[1]?.tiers?.[0]?.targetReps, firstSets[1]?.tiers?.[0]?.targetReps, "partial tier sequence holds instead of receiving full-sequence progression");
        assert.equal(nextSets[2]?.tiers?.[0]?.targetWeight?.value, changed?.tiers?.[0]?.actualWeight?.value, "the performed tier load seeds its comparable next tier");
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Session-only load, rep, and scheme overrides remain local while explicit reusable changes persist",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();
      try {
        await seedBaseWorkoutProgram(context);
        const program = await createAndEnrollCustomProgram({
          context, userId: "user-1", programName: "Override Lifecycle",
          workouts: [{ name: "Day 1", exercises: [{ exerciseId: "exercise-1", targetSets: 3, targetReps: 8, targetWeight: { value: 100, unit: "lb" }, repRangeMin: 6, repRangeMax: 12, setScheme: "straight" }] }],
          idempotencyKey: "override-lifecycle"
        });
        const start = new StartWorkoutSessionUseCase(context.repositories.workoutSessionRepository, context.repositories.enrollmentRepository, context.repositories.progressionStateRepository, context.repositories.progressionStateV2Repository, context.repositories.exerciseRepository, context.transactionManager, context.repositories.idempotencyRepository);
        const log = new LogSetUseCase(context.repositories.workoutSessionRepository, context.transactionManager, context.repositories.idempotencyRepository);
        const complete = new CompleteWorkoutSessionUseCase(context.repositories.workoutSessionRepository, context.repositories.enrollmentRepository, context.repositories.progressionStateRepository, context.repositories.progressionStateV2Repository, context.repositories.exerciseRepository, context.repositories.userRepository, context.repositories.programRepository, context.repositories.progressMetricRepository, context.repositories.progressionRecommendationEventRepository, context.repositories.trainingSettingsRepository, context.repositories.exerciseProgressionSettingsRepository, context.transactionManager, context.repositories.idempotencyRepository);
        const update = new UpdateWorkoutExerciseEntryUseCase(context.repositories.workoutSessionRepository, context.repositories.exerciseRepository, context.repositories.progressionStateV2Repository, context.repositories.programRepository, context.transactionManager, context.repositories.idempotencyRepository);
        const first = await start.execute({ context: { userId: "user-1", unitSystem: "imperial" }, request: { workoutTemplateId: program.workouts[0]!.id }, idempotencyKey: "override-session-1" });
        const entryId = first.data.exercises[0]!.id;
        assert.equal(first.data.exercises[0]?.sets[0]?.targetWeight?.value, 100, "Reusable plan load overrides exercise profile defaults.");
        await update.execute({ context: { userId: "user-1", unitSystem: "imperial" }, sessionId: first.data.id, exerciseEntryId: entryId, request: { targetSets: 3, targetReps: 10, targetWeight: { value: 110, unit: "lb" }, setScheme: "reverse_pyramid", updatePlan: false }, idempotencyKey: "override-session-only" });
        const adaptedSession = await context.repositories.workoutSessionRepository.findOwnedSessionGraphById("user-1", first.data.id);
        assert.equal(adaptedSession?.exerciseEntries[0]?.progressionRuleSnapshot?.setScheme, "reverse_pyramid");
        const adaptedPending = adaptedSession?.sets.filter((set) => set.status === "pending").sort((a, b) => a.setNumber - b.setNumber) ?? [];
        assert.deepEqual(adaptedPending.map((set) => set.targetWeightLbs), [120, 115, 110]);
        assert.deepEqual(adaptedPending.map((set) => set.targetReps), [10, 11, 12]);
        assert.ok(adaptedPending.every((set) => set.adaptationReason?.startsWith("manual")));
        const planAfterSessionChange = await context.repositories.programRepository.findActiveById(program.id, "user-1");
        const planEntry = planAfterSessionChange?.templates.flatMap((template) => template.exercises).find((exercise) => exercise.id === program.workouts[0]!.exercises[0]!.id);
        assert.equal(planEntry?.setScheme, "straight");
        assert.equal(planEntry?.targetWeight?.value, 100);
        for (const set of first.data.exercises[0]!.sets) {
          await log.execute({ context: { userId: "user-1", unitSystem: "imperial" }, setId: set.id, request: { actualReps: set.setNumber === 1 ? 8 : 10, actualWeight: { value: 100, unit: "lb" } }, idempotencyKey: `override-log-1-${set.id}` });
        }
        const afterFirstLog = await context.repositories.workoutSessionRepository.findOwnedSessionGraphById("user-1", first.data.id);
        assert.equal(afterFirstLog?.sets[0]?.actualWeightLbs, 100);
        assert.equal(afterFirstLog?.sets[0]?.targetWeightLbs, 120);
        assert.equal(afterFirstLog?.sets[1]?.targetReps, 11);
        assert.equal(afterFirstLog?.sets[1]?.targetWeightLbs, 115);
        await complete.execute({ context: { userId: "user-1", unitSystem: "imperial" }, sessionId: first.data.id, request: { completedAt: "2026-07-01T10:45:00.000Z", exerciseFeedback: [] }, idempotencyKey: "override-complete-1" });

        const second = await start.execute({ context: { userId: "user-1", unitSystem: "imperial" }, request: { workoutTemplateId: program.workouts[0]!.id }, idempotencyKey: "override-session-2" });
        assert.equal(second.data.exercises[0]?.setScheme, "straight");
        assert.notEqual(second.data.exercises[0]?.sets[0]?.targetWeight?.value, 110, "Session-only 110 lb target must not become the future prescription when it was not performed.");
        await update.execute({ context: { userId: "user-1", unitSystem: "imperial" }, sessionId: second.data.id, exerciseEntryId: second.data.exercises[0]!.id, request: { targetSets: 3, targetReps: 9, targetWeight: { value: 120, unit: "lb" }, setScheme: "reverse_pyramid", updatePlan: true }, idempotencyKey: "override-reusable-plan" });
        const savedPlan = await context.repositories.programRepository.findActiveById(program.id, "user-1");
        const savedEntry = savedPlan?.templates.flatMap((template) => template.exercises).find((exercise) => exercise.id === program.workouts[0]!.exercises[0]!.id);
        assert.equal(savedEntry?.setScheme, "reverse_pyramid");
        assert.equal(savedEntry?.targetWeight?.value, 120);
        const secondSets = second.data.exercises[0]!.sets;
        for (const set of secondSets) await log.execute({ context: { userId: "user-1", unitSystem: "imperial" }, setId: set.id, request: { actualReps: 9, actualWeight: { value: 120, unit: "lb" } }, idempotencyKey: `override-log-2-${set.id}` });
        await complete.execute({ context: { userId: "user-1", unitSystem: "imperial" }, sessionId: second.data.id, request: { completedAt: "2026-07-02T10:45:00.000Z", exerciseFeedback: [] }, idempotencyKey: "override-complete-2" });
        const third = await start.execute({ context: { userId: "user-1", unitSystem: "imperial" }, request: { workoutTemplateId: program.workouts[0]!.id }, idempotencyKey: "override-session-3" });
        assert.equal(third.data.exercises[0]?.setScheme, "reverse_pyramid");
        assert.equal(third.data.exercises[0]?.targetWeight?.value, 120);
        const immutableHistory = await context.repositories.workoutSessionRepository.findOwnedSessionGraphById("user-1", first.data.id);
        assert.equal(immutableHistory?.sets[0]?.targetWeightLbs, 120);
        assert.equal(immutableHistory?.sets[0]?.actualWeightLbs, 100);
        assert.equal(immutableHistory?.exerciseEntries[0]?.progressionRuleSnapshot?.setScheme, "reverse_pyramid");
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Comparable history is isolated by template entry and ignores incompatible schemes",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();
      try {
        await seedBaseWorkoutProgram(context);
        const program = await createAndEnrollCustomProgram({
          context,
          userId: "user-1",
          programName: "Comparable History",
          idempotencyKey: "comparable-history-plan",
          workouts: [{ name: "Day 1", exercises: [
            { exerciseId: "exercise-1", targetSets: 2, targetReps: 8, targetWeight: { value: 100, unit: "lb" }, repRangeMin: 8, repRangeMax: 10, setScheme: "straight" },
            { exerciseId: "exercise-1", targetSets: 3, targetReps: 8, targetWeight: { value: 100, unit: "lb" }, repRangeMin: 8, repRangeMax: 10, setScheme: "reverse_pyramid" }
          ] }]
        });
        const start = new StartWorkoutSessionUseCase(context.repositories.workoutSessionRepository, context.repositories.enrollmentRepository, context.repositories.progressionStateRepository, context.repositories.progressionStateV2Repository, context.repositories.exerciseRepository, context.transactionManager, context.repositories.idempotencyRepository);
        const log = new LogSetUseCase(context.repositories.workoutSessionRepository, context.transactionManager, context.repositories.idempotencyRepository);
        const complete = new CompleteWorkoutSessionUseCase(context.repositories.workoutSessionRepository, context.repositories.enrollmentRepository, context.repositories.progressionStateRepository, context.repositories.progressionStateV2Repository, context.repositories.exerciseRepository, context.repositories.userRepository, context.repositories.programRepository, context.repositories.progressMetricRepository, context.repositories.progressionRecommendationEventRepository, context.repositories.trainingSettingsRepository, context.repositories.exerciseProgressionSettingsRepository, context.transactionManager, context.repositories.idempotencyRepository);
        const first = await start.execute({ context: { userId: "user-1", unitSystem: "imperial" }, request: { workoutTemplateId: program.workouts[0]!.id }, idempotencyKey: "comparable-history-start-1" });
        for (const [exerciseIndex, exercise] of first.data.exercises.entries()) {
          for (const set of exercise.sets) {
            await log.execute({ context: { userId: "user-1", unitSystem: "imperial" }, setId: set.id, request: {
              actualReps: set.targetReps ?? 8,
              actualWeight: { value: exerciseIndex === 0 ? 105 : 135, unit: "lb" }
            }, idempotencyKey: `comparable-history-log-${set.id}` });
          }
        }
        await complete.execute({ context: { userId: "user-1", unitSystem: "imperial" }, sessionId: first.data.id, request: { completedAt: "2026-07-03T10:45:00.000Z", exerciseFeedback: [] }, idempotencyKey: "comparable-history-complete-1" });

        const next = await start.execute({ context: { userId: "user-1", unitSystem: "imperial" }, request: { workoutTemplateId: program.workouts[0]!.id }, idempotencyKey: "comparable-history-start-2" });
        assert.equal(next.data.exercises[0]?.sets[0]?.previousActualWeight?.value, 105, "straight entry keeps its own same-entry history");
        assert.equal(next.data.exercises[1]?.sets[0]?.previousActualWeight?.value, 135, "duplicate exercise entry keeps its own pyramid history");

        const straightPlanEntry = program.workouts[0]!.exercises[0]!;
        const reversePlanEntry = program.workouts[0]!.exercises[1]!;
        const mismatched = await context.repositories.workoutSessionRepository.findMostRecentComparableExerciseHistory?.({
          userId: "user-1",
          exerciseId: "exercise-1",
          workoutTemplateExerciseEntryId: straightPlanEntry.id,
          setScheme: "ascending_pyramid",
          targetSets: 2
        });
        assert.equal(mismatched, null, "different scheme evidence is not used as comparable history");
        const matchingReverse = await context.repositories.workoutSessionRepository.findMostRecentComparableExerciseHistory?.({
          userId: "user-1",
          exerciseId: "exercise-1",
          workoutTemplateExerciseEntryId: reversePlanEntry.id,
          setScheme: "reverse_pyramid",
          targetSets: 3
        });
        assert.equal(matchingReverse?.sets[0]?.actualWeightLbs, 135);
        for (const [exerciseIndex, exercise] of next.data.exercises.entries()) {
          for (const set of exercise.sets) {
            await log.execute({ context: { userId: "user-1", unitSystem: "imperial" }, setId: set.id, request: {
              actualReps: (set.targetReps ?? 8) + 3,
              actualWeight: { value: exerciseIndex === 0 ? 107 : 137, unit: "lb" }
            }, idempotencyKey: `comparable-history-cross-log-${set.id}` });
          }
        }
        await complete.execute({ context: { userId: "user-1", unitSystem: "imperial" }, sessionId: next.data.id, request: { completedAt: "2026-07-04T10:45:00.000Z", exerciseFeedback: [] }, idempotencyKey: "comparable-history-finish-cross-plan" });

        const otherPlan = await createAndEnrollCustomProgram({
          context,
          userId: "user-1",
          programName: "Second Comparable Plan",
          idempotencyKey: "comparable-history-second-plan",
          workouts: [{ name: "Day 1", exercises: [
            { exerciseId: "exercise-1", targetSets: 2, targetReps: 8, targetWeight: { value: 100, unit: "lb" }, repRangeMin: 8, repRangeMax: 10, setScheme: "straight" }
          ] }]
        });
        const crossPlan = await start.execute({ context: { userId: "user-1", unitSystem: "imperial" }, request: { workoutTemplateId: otherPlan.workouts[0]!.id }, idempotencyKey: "comparable-history-start-cross-plan" });
        assert.equal(crossPlan.data.exercises[0]?.sets[0]?.previousActualWeight?.value, 107, "compatible same-exercise history can seed a different plan entry");
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  }
];
