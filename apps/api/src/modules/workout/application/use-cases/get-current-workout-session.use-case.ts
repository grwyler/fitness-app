import type { GetCurrentWorkoutSessionResponse } from "@fitness/shared";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";
import { mapCurrentWorkoutSessionDto } from "../mappers/workout-dto.mapper.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

export class GetCurrentWorkoutSessionUseCase {
  public constructor(private readonly workoutSessionRepository: WorkoutSessionRepository) {}

  public async execute(input: {
    context: RequestContext;
  }): Promise<UseCaseResult<GetCurrentWorkoutSessionResponse>> {
    const workoutSessionGraph = await this.workoutSessionRepository.findInProgressByUserId(
      input.context.userId
    );

    return {
      data: mapCurrentWorkoutSessionDto(workoutSessionGraph),
      meta: {
        replayed: false
      }
    };
  }
}

