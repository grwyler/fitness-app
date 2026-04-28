import type { ListExercisesResponse } from "@fitness/shared";
import type { ExerciseRepository } from "../../repositories/interfaces/exercise.repository.js";
import { mapExerciseCatalogItemDto } from "../mappers/workout-dto.mapper.js";
import type { UseCaseResult } from "../types/use-case-result.js";

export class ListExercisesUseCase {
  public constructor(private readonly exerciseRepository: ExerciseRepository) {}

  public async execute(): Promise<UseCaseResult<ListExercisesResponse>> {
    const exercises = await this.exerciseRepository.listActive();

    return {
      data: {
        exercises: exercises.map(mapExerciseCatalogItemDto)
      },
      meta: {
        replayed: false
      }
    };
  }
}
