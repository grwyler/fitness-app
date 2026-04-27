import { Router } from "express";
import { createWorkoutHandlers } from "./workout.handlers.js";
import type { CompleteWorkoutSessionUseCase } from "../application/use-cases/complete-workout-session.use-case.js";
import type { FollowProgramUseCase } from "../application/use-cases/follow-program.use-case.js";
import type { GetCurrentWorkoutSessionUseCase } from "../application/use-cases/get-current-workout-session.use-case.js";
import type { GetDashboardUseCase } from "../application/use-cases/get-dashboard.use-case.js";
import type { GetProgressionUseCase } from "../application/use-cases/get-progression.use-case.js";
import type { GetWorkoutHistoryDetailUseCase } from "../application/use-cases/get-workout-history-detail.use-case.js";
import type { GetWorkoutHistoryUseCase } from "../application/use-cases/get-workout-history.use-case.js";
import type { ListProgramsUseCase } from "../application/use-cases/list-programs.use-case.js";
import type { LogSetUseCase } from "../application/use-cases/log-set.use-case.js";
import type { StartWorkoutSessionUseCase } from "../application/use-cases/start-workout-session.use-case.js";

export function createWorkoutRouter(dependencies: {
  listProgramsUseCase: ListProgramsUseCase;
  followProgramUseCase: FollowProgramUseCase;
  getDashboardUseCase: GetDashboardUseCase;
  getProgressionUseCase: GetProgressionUseCase;
  getWorkoutHistoryUseCase: GetWorkoutHistoryUseCase;
  getWorkoutHistoryDetailUseCase: GetWorkoutHistoryDetailUseCase;
  getCurrentWorkoutSessionUseCase: GetCurrentWorkoutSessionUseCase;
  startWorkoutSessionUseCase: StartWorkoutSessionUseCase;
  logSetUseCase: LogSetUseCase;
  completeWorkoutSessionUseCase: CompleteWorkoutSessionUseCase;
}) {
  const router = Router();
  const handlers = createWorkoutHandlers(dependencies);

  router.get("/programs", handlers.listPrograms);
  router.post("/programs/:programId/follow", handlers.followProgram);
  router.get("/dashboard", handlers.getDashboard);
  router.get("/progression", handlers.getProgression);
  router.get("/workout-history", handlers.getWorkoutHistory);
  router.get("/workout-history/:sessionId", handlers.getWorkoutHistoryDetail);
  router.get("/workout-sessions/current", handlers.getCurrentWorkoutSession);
  router.post("/workout-sessions/start", handlers.startWorkoutSession);
  router.post("/sets/:setId/log", handlers.logSet);
  router.post("/workout-sessions/:sessionId/complete", handlers.completeWorkoutSession);

  return router;
}
