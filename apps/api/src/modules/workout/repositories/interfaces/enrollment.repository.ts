import type {
  CancelEnrollmentInput,
  EnrollmentRecord,
  UpdateEnrollmentNextTemplateInput
} from "../models/enrollment.persistence.js";
import type { RepositoryOptions } from "../models/persistence-context.js";

export interface EnrollmentRepository {
  findActiveByUserId(
    userId: string,
    options?: RepositoryOptions
  ): Promise<EnrollmentRecord | null>;

  updateNextWorkoutTemplate(
    input: UpdateEnrollmentNextTemplateInput,
    options?: RepositoryOptions
  ): Promise<EnrollmentRecord>;

  cancelEnrollment(input: CancelEnrollmentInput, options?: RepositoryOptions): Promise<EnrollmentRecord>;
}
