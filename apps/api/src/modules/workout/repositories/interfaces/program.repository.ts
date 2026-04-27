import type { RepositoryOptions } from "../models/persistence-context.js";
import type {
  CreateEnrollmentInput,
  ProgramDefinition
} from "../models/program.persistence.js";
import type { EnrollmentRecord } from "../models/enrollment.persistence.js";

export interface ProgramRepository {
  listActive(options?: RepositoryOptions): Promise<ProgramDefinition[]>;

  findActiveById(programId: string, options?: RepositoryOptions): Promise<ProgramDefinition | null>;

  createEnrollment(input: CreateEnrollmentInput, options?: RepositoryOptions): Promise<EnrollmentRecord>;
}
