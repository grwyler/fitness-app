import { Router } from "express";
import { createWorkoutHandlers } from "./workout.handlers.js";
import type { CompleteWorkoutSessionUseCase } from "../application/use-cases/complete-workout-session.use-case.js";
import type { CancelWorkoutSessionUseCase } from "../application/use-cases/cancel-workout-session.use-case.js";
import type { AddCustomWorkoutExerciseUseCase } from "../application/use-cases/add-custom-workout-exercise.use-case.js";
import type { AddWorkoutSetUseCase } from "../application/use-cases/add-workout-set.use-case.js";
import type { DeleteWorkoutSetUseCase } from "../application/use-cases/delete-workout-set.use-case.js";
import type { FollowProgramUseCase } from "../application/use-cases/follow-program.use-case.js";
import type { CreateCustomProgramUseCase } from "../application/use-cases/create-custom-program.use-case.js";
import type { GetCurrentWorkoutSessionUseCase } from "../application/use-cases/get-current-workout-session.use-case.js";
import type { GetDashboardUseCase } from "../application/use-cases/get-dashboard.use-case.js";
import type { GetProgramUseCase } from "../application/use-cases/get-program.use-case.js";
import type { GetProgressionUseCase } from "../application/use-cases/get-progression.use-case.js";
import type { GetWorkoutHistoryDetailUseCase } from "../application/use-cases/get-workout-history-detail.use-case.js";
import type { GetWorkoutHistoryUseCase } from "../application/use-cases/get-workout-history.use-case.js";
import type { ListExercisesUseCase } from "../application/use-cases/list-exercises.use-case.js";
import type { ListProgramsUseCase } from "../application/use-cases/list-programs.use-case.js";
import type { LogSetUseCase } from "../application/use-cases/log-set.use-case.js";
import type { StartWorkoutSessionUseCase } from "../application/use-cases/start-workout-session.use-case.js";
import type { UpdateCustomProgramUseCase } from "../application/use-cases/update-custom-program.use-case.js";

export function createWorkoutRouter(dependencies: {
  listProgramsUseCase: ListProgramsUseCase;
  getProgramUseCase: GetProgramUseCase;
  createCustomProgramUseCase: CreateCustomProgramUseCase;
  updateCustomProgramUseCase: UpdateCustomProgramUseCase;
  listExercisesUseCase: ListExercisesUseCase;
  followProgramUseCase: FollowProgramUseCase;
  getDashboardUseCase: GetDashboardUseCase;
  getProgressionUseCase: GetProgressionUseCase;
  getWorkoutHistoryUseCase: GetWorkoutHistoryUseCase;
  getWorkoutHistoryDetailUseCase: GetWorkoutHistoryDetailUseCase;
  getCurrentWorkoutSessionUseCase: GetCurrentWorkoutSessionUseCase;
  startWorkoutSessionUseCase: StartWorkoutSessionUseCase;
  addCustomWorkoutExerciseUseCase: AddCustomWorkoutExerciseUseCase;
  addWorkoutSetUseCase: AddWorkoutSetUseCase;
  deleteWorkoutSetUseCase: DeleteWorkoutSetUseCase;
  logSetUseCase: LogSetUseCase;
  cancelWorkoutSessionUseCase: CancelWorkoutSessionUseCase;
  completeWorkoutSessionUseCase: CompleteWorkoutSessionUseCase;
}) {
  const router = Router();
  const handlers = createWorkoutHandlers(dependencies);

  router.get("/programs", handlers.listPrograms);
  router.post("/programs", handlers.createCustomProgram);
  router.get("/programs/:programId", handlers.getProgram);
  router.put("/programs/:programId", handlers.updateCustomProgram);
  router.get("/exercises", handlers.listExercises);
  router.post("/programs/:programId/follow", handlers.followProgram);
  router.get("/dashboard", handlers.getDashboard);
  router.get("/progression", handlers.getProgression);
  router.get("/workout-history", handlers.getWorkoutHistory);
  router.get("/workout-history/:sessionId", handlers.getWorkoutHistoryDetail);
  router.get("/workout-sessions/current", handlers.getCurrentWorkoutSession);
  router.post("/workout-sessions/start", handlers.startWorkoutSession);
  router.post("/workout-sessions/:sessionId/exercises", handlers.addCustomWorkoutExercise);
  router.post("/workout-sessions/:sessionId/exercises/:exerciseEntryId/sets", handlers.addWorkoutSet);
  router.delete("/sets/:setId", handlers.deleteWorkoutSet);
  router.post("/sets/:setId/log", handlers.logSet);
  router.post("/workout-sessions/:sessionId/cancel", handlers.cancelWorkoutSession);
  router.post("/workout-sessions/:sessionId/complete", handlers.completeWorkoutSession);

  return router;
}
