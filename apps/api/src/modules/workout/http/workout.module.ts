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
import { CancelWorkoutSessionUseCase } from "../application/use-cases/cancel-workout-session.use-case.js";
import { AddCustomWorkoutExerciseUseCase } from "../application/use-cases/add-custom-workout-exercise.use-case.js";
import { AddWorkoutSetUseCase } from "../application/use-cases/add-workout-set.use-case.js";
import { DeleteWorkoutSetUseCase } from "../application/use-cases/delete-workout-set.use-case.js";
import { FollowProgramUseCase } from "../application/use-cases/follow-program.use-case.js";
import { CreateCustomProgramUseCase } from "../application/use-cases/create-custom-program.use-case.js";
import { GetCurrentWorkoutSessionUseCase } from "../application/use-cases/get-current-workout-session.use-case.js";
import { GetDashboardUseCase } from "../application/use-cases/get-dashboard.use-case.js";
import { GetProgramUseCase } from "../application/use-cases/get-program.use-case.js";
import { GetProgressionUseCase } from "../application/use-cases/get-progression.use-case.js";
import { GetWorkoutHistoryDetailUseCase } from "../application/use-cases/get-workout-history-detail.use-case.js";
import { GetWorkoutHistoryUseCase } from "../application/use-cases/get-workout-history.use-case.js";
import { ListExercisesUseCase } from "../application/use-cases/list-exercises.use-case.js";
import { ListProgramsUseCase } from "../application/use-cases/list-programs.use-case.js";
import { LogSetUseCase } from "../application/use-cases/log-set.use-case.js";
import { StartWorkoutSessionUseCase } from "../application/use-cases/start-workout-session.use-case.js";
import { UpdateCustomProgramUseCase } from "../application/use-cases/update-custom-program.use-case.js";
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

  const addCustomWorkoutExerciseUseCase = new AddCustomWorkoutExerciseUseCase(
    workoutSessionRepository,
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

  const addWorkoutSetUseCase = new AddWorkoutSetUseCase(
    workoutSessionRepository,
    transactionManager,
    idempotencyRepository
  );

  const deleteWorkoutSetUseCase = new DeleteWorkoutSetUseCase(
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
  const cancelWorkoutSessionUseCase = new CancelWorkoutSessionUseCase(
    workoutSessionRepository,
    transactionManager,
    idempotencyRepository
  );

  const getCurrentWorkoutSessionUseCase = new GetCurrentWorkoutSessionUseCase(workoutSessionRepository);
  const getWorkoutHistoryUseCase = new GetWorkoutHistoryUseCase(
    workoutSessionRepository,
    progressMetricRepository
  );
  const getWorkoutHistoryDetailUseCase = new GetWorkoutHistoryDetailUseCase(workoutSessionRepository);
  const getProgressionUseCase = new GetProgressionUseCase(workoutSessionRepository);
  const listProgramsUseCase = new ListProgramsUseCase(programRepository);
  const getProgramUseCase = new GetProgramUseCase(programRepository);
  const createCustomProgramUseCase = new CreateCustomProgramUseCase(
    programRepository,
    transactionManager,
    idempotencyRepository
  );
  const updateCustomProgramUseCase = new UpdateCustomProgramUseCase(
    programRepository,
    transactionManager
  );
  const listExercisesUseCase = new ListExercisesUseCase(exerciseRepository);
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
    getProgramUseCase,
    createCustomProgramUseCase,
    updateCustomProgramUseCase,
    listExercisesUseCase,
    followProgramUseCase,
    getDashboardUseCase,
    getProgressionUseCase,
    getWorkoutHistoryUseCase,
    getWorkoutHistoryDetailUseCase,
    getCurrentWorkoutSessionUseCase,
    startWorkoutSessionUseCase,
    addCustomWorkoutExerciseUseCase,
    addWorkoutSetUseCase,
    deleteWorkoutSetUseCase,
    logSetUseCase,
    cancelWorkoutSessionUseCase,
    completeWorkoutSessionUseCase
  });
}
