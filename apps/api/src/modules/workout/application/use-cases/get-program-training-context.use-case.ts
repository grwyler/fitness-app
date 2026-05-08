import type { GetProgramTrainingContextResponse, ManualProgramGoalContextDto } from "@fitness/shared";
import type { ProgramRepository } from "../../repositories/interfaces/program.repository.js";
import type { ProgramTrainingContextRepository } from "../../repositories/interfaces/program-training-context.repository.js";
import { WorkoutApplicationError } from "../errors/workout-application.error.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

function extractManualGoalContext(snapshot: unknown | null): ManualProgramGoalContextDto | null {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }

  const record = snapshot as { manualGoalContextV1?: unknown };
  const value = record.manualGoalContextV1;
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as ManualProgramGoalContextDto;
}

export class GetProgramTrainingContextUseCase {
  public constructor(
    private readonly programRepository: ProgramRepository,
    private readonly programTrainingContextRepository: ProgramTrainingContextRepository
  ) {}

  public async execute(input: {
    context: RequestContext;
    programId: string;
  }): Promise<UseCaseResult<GetProgramTrainingContextResponse>> {
    const programDefinition = await this.programRepository.findActiveById(
      input.programId,
      input.context.userId
    );

    if (!programDefinition) {
      throw new WorkoutApplicationError("PROGRAM_NOT_FOUND", "The requested program could not be found.");
    }

    const latest = await this.programTrainingContextRepository.findLatestByUserProgram({
      userId: input.context.userId,
      programId: input.programId
    });

    return {
      data: {
        manualGoalContext: extractManualGoalContext(latest?.guidedAnswersSnapshot ?? null)
      },
      meta: {
        replayed: false
      }
    };
  }
}

