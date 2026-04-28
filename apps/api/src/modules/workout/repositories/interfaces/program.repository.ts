import type { RepositoryOptions } from "../models/persistence-context.js";
import type {
  CreateCustomProgramInput,
  CreateEnrollmentInput,
  ProgramDefinition
} from "../models/program.persistence.js";
import type { EnrollmentRecord } from "../models/enrollment.persistence.js";

export interface ProgramRepository {
  listActive(userId: string, options?: RepositoryOptions): Promise<ProgramDefinition[]>;

  findActiveById(
    programId: string,
    userId: string,
    options?: RepositoryOptions
  ): Promise<ProgramDefinition | null>;

  createCustomProgram?(
    input: CreateCustomProgramInput,
    options?: RepositoryOptions
  ): Promise<ProgramDefinition>;

  createEnrollment(input: CreateEnrollmentInput, options?: RepositoryOptions): Promise<EnrollmentRecord>;
}
