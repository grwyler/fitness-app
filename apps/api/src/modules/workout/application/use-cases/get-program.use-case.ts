import type { GetProgramResponse } from "@fitness/shared";
import type { ProgramRepository } from "../../repositories/interfaces/program.repository.js";
import { WorkoutApplicationError } from "../errors/workout-application.error.js";
import { mapProgramDto } from "../mappers/workout-dto.mapper.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

export class GetProgramUseCase {
  public constructor(private readonly programRepository: ProgramRepository) {}

  public async execute(input: {
    context: RequestContext;
    programId: string;
  }): Promise<UseCaseResult<GetProgramResponse>> {
    const programDefinition = await this.programRepository.findActiveById(
      input.programId,
      input.context.userId
    );

    if (!programDefinition) {
      throw new WorkoutApplicationError("PROGRAM_NOT_FOUND", "The requested program could not be found.");
    }

    return {
      data: {
        program: mapProgramDto(programDefinition)
      },
      meta: {
        replayed: false
      }
    };
  }
}
