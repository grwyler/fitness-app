import type { PgliteDatabase, PostgresDatabase } from "../../../lib/db/connection.js";
import { DrizzleTransactionManager } from "../infrastructure/db/drizzle-transaction-manager.js";
import { DrizzleEnrollmentRepository } from "../infrastructure/repositories/drizzle-enrollment.repository.js";
import { DrizzleExerciseRepository } from "../infrastructure/repositories/drizzle-exercise.repository.js";
import { DrizzleIdempotencyRepository } from "../infrastructure/repositories/drizzle-idempotency.repository.js";
import { DrizzleProgramRepository } from "../infrastructure/repositories/drizzle-program.repository.js";
import { DrizzleProgressMetricRepository } from "../infrastructure/repositories/drizzle-progress-metric.repository.js";
import { DrizzleProgressionStateRepository } from "../infrastructure/repositories/drizzle-progression-state.repository.js";
import { DrizzleWorkoutSessionRepository } from "../infrastructure/repositories/drizzle-workout-session.repository.js";
import { CompleteWorkoutSessionUseCase } from "../application/use-cases/complete-workout-session.use-case.js";
import { FollowProgramUseCase } from "../application/use-cases/follow-program.use-case.js";
import { GetCurrentWorkoutSessionUseCase } from "../application/use-cases/get-current-workout-session.use-case.js";
import { GetDashboardUseCase } from "../application/use-cases/get-dashboard.use-case.js";
import { ListProgramsUseCase } from "../application/use-cases/list-programs.use-case.js";
import { LogSetUseCase } from "../application/use-cases/log-set.use-case.js";
import { StartWorkoutSessionUseCase } from "../application/use-cases/start-workout-session.use-case.js";
import { createWorkoutRouter } from "./workout.routes.js";

export type WorkoutDatabase = PostgresDatabase | PgliteDatabase | any;

export function createWorkoutHttpRouter(database: WorkoutDatabase) {
  const workoutSessionRepository = new DrizzleWorkoutSessionRepository(database);
  const enrollmentRepository = new DrizzleEnrollmentRepository(database);
  const programRepository = new DrizzleProgramRepository(database);
  const progressionStateRepository = new DrizzleProgressionStateRepository(database);
  const exerciseRepository = new DrizzleExerciseRepository(database);
  const progressMetricRepository = new DrizzleProgressMetricRepository(database);
  const idempotencyRepository = new DrizzleIdempotencyRepository(database);
  const transactionManager = new DrizzleTransactionManager(database);

  const startWorkoutSessionUseCase = new StartWorkoutSessionUseCase(
    workoutSessionRepository,
    enrollmentRepository,
    progressionStateRepository,
    exerciseRepository,
    transactionManager,
    idempotencyRepository
  );

  const logSetUseCase = new LogSetUseCase(
    workoutSessionRepository,
    transactionManager,
    idempotencyRepository
  );

  const completeWorkoutSessionUseCase = new CompleteWorkoutSessionUseCase(
    workoutSessionRepository,
    enrollmentRepository,
    progressionStateRepository,
    exerciseRepository,
    progressMetricRepository,
    transactionManager,
    idempotencyRepository
  );

  const getCurrentWorkoutSessionUseCase = new GetCurrentWorkoutSessionUseCase(workoutSessionRepository);
  const listProgramsUseCase = new ListProgramsUseCase(programRepository);
  const followProgramUseCase = new FollowProgramUseCase(
    programRepository,
    enrollmentRepository,
    exerciseRepository,
    workoutSessionRepository,
    transactionManager
  );
  const getDashboardUseCase = new GetDashboardUseCase(
    workoutSessionRepository,
    enrollmentRepository,
    exerciseRepository,
    programRepository,
    progressMetricRepository
  );

  return createWorkoutRouter({
    listProgramsUseCase,
    followProgramUseCase,
    getDashboardUseCase,
    getCurrentWorkoutSessionUseCase,
    startWorkoutSessionUseCase,
    logSetUseCase,
    completeWorkoutSessionUseCase
  });
}
