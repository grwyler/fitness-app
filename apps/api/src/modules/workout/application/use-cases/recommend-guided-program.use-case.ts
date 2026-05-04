import type { RecommendGuidedProgramRequest, RecommendGuidedProgramResponse } from "@fitness/shared";
import type { ProgramRepository } from "../../repositories/interfaces/program.repository.js";
import { mapProgramDto } from "../mappers/workout-dto.mapper.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";
import { recommendGuidedProgram } from "../services/guided-program-recommendation.service.js";

export class RecommendGuidedProgramUseCase {
  public constructor(private readonly programRepository: ProgramRepository) {}

  public async execute(input: {
    context: RequestContext;
    request: RecommendGuidedProgramRequest;
  }): Promise<UseCaseResult<RecommendGuidedProgramResponse>> {
    const programs = await this.programRepository.listActive(input.context.userId);

    const recommendation = recommendGuidedProgram({
      answers: input.request.answers,
      candidatePrograms: programs
    });

    const definition =
      programs.find((candidate) => candidate.program.id === recommendation.programId) ?? null;
    if (!definition) {
      throw new Error("Recommended program was not found.");
    }

    const alternatives = recommendation.alternatives.flatMap((alternative) => {
      const altDefinition =
        programs.find((candidate) => candidate.program.id === alternative.programId) ?? null;
      if (!altDefinition) {
        return [];
      }

      return [
        {
          program: mapProgramDto(altDefinition),
          matchScore: alternative.matchScore,
          matchStrength: alternative.matchStrength,
          reasons: alternative.reasons,
          warnings: alternative.warnings
        }
      ];
    });

    return {
      data: {
        program: mapProgramDto(definition),
        matchScore: recommendation.matchScore,
        matchStrength: recommendation.matchStrength,
        alternatives,
        reasons: recommendation.reasons,
        warnings: recommendation.warnings,
        isExactMatch: recommendation.isExactMatch
      },
      meta: {
        replayed: false
      }
    };
  }
}
