import type { RepositoryOptions } from "../models/persistence-context.js";
import type {
  CreateCustomProgramInput,
  CreateEnrollmentInput,
  ProgramDefinition,
  UpdateCustomProgramInput
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

  updateCustomProgram?(
    input: UpdateCustomProgramInput,
    options?: RepositoryOptions
  ): Promise<ProgramDefinition | null>;

  createEnrollment(input: CreateEnrollmentInput, options?: RepositoryOptions): Promise<EnrollmentRecord>;
}
