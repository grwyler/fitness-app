import type { ListProgramsResponse } from "@fitness/shared";
import type { ProgramRepository } from "../../repositories/interfaces/program.repository.js";
import { mapProgramDto } from "../mappers/workout-dto.mapper.js";
import type { UseCaseResult } from "../types/use-case-result.js";

export class ListProgramsUseCase {
  public constructor(private readonly programRepository: ProgramRepository) {}

  public async execute(): Promise<UseCaseResult<ListProgramsResponse>> {
    const programs = await this.programRepository.listActive();

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
