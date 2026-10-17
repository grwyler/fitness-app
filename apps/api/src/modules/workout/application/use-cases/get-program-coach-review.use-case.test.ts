import assert from "node:assert/strict";
import type { ApplicationTestCase } from "../test-helpers/application-test-case.js";
import { GetProgramCoachReviewUseCase } from "./get-program-coach-review.use-case.js";
import type { ProgramRepository } from "../../repositories/interfaces/program.repository.js";
import type { ProgressionRecommendationEventRepository } from "../../repositories/interfaces/progression-recommendation-event.repository.js";
import type { TrainingBlockRepository } from "../../repositories/interfaces/training-block.repository.js";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";

export const getProgramCoachReviewUseCaseTestCases: ApplicationTestCase[] = [
  {
    name: "Coach review: returns nulls when no active training block exists",
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
      const trainingBlockRepository: TrainingBlockRepository = {
        async findActiveByUserProgram() {
          return null;
        },
        async create() {
          throw new Error("Not implemented.");
        },
        async updateById() {
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
        async persistExerciseEntryFeedback() {
          return;
        },
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
        async countCompletedByUserIdAndProgramIdWithinRange() {
          return 0;
        },
        async listCompletedProgressionByUserId() {
          return [];
        }
      };
      const progressionRecommendationEventRepository: ProgressionRecommendationEventRepository = {
        async createMany() {
          return [];
        },
        async findOwnedById() {
          return null;
        },
        async listBySessionId() {
          return [];
        },
        async resolveOwnedEvent() {
          throw new Error("Not implemented.");
        },
        async listRecentByUserId() {
          return [];
        },
        async countUnresolvedByUserIdAndProgramIdWithinRange() {
          return 0;
        }
      };

      const useCase = new GetProgramCoachReviewUseCase(
        programRepository,
        trainingBlockRepository,
        workoutSessionRepository,
        progressionRecommendationEventRepository
      );

      const result = await useCase.execute({
        context: { userId: "u1", requestId: "r1" } as any,
        programId: "p1"
      });

      assert.equal(result.data.trainingBlock, null);
      assert.equal(result.data.coachReview, null);
    }
  }
];
