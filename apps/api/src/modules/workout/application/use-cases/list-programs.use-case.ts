import type { ListProgramsResponse } from "@fitness/shared";
import type { ProgramRepository } from "../../repositories/interfaces/program.repository.js";
import { mapProgramDto } from "../mappers/workout-dto.mapper.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

export class ListProgramsUseCase {
  public constructor(private readonly programRepository: ProgramRepository) {}

  public async execute(input: {
    context: RequestContext;
  }): Promise<UseCaseResult<ListProgramsResponse>> {
    const programs = await this.programRepository.listActive(input.context.userId);

    return {
      data: {
        programs: programs.map(mapProgramDto)
      },
      meta: {
        replayed: false
      }
    };
  }
}
