import { userProgramEnrollments } from "@fitness/db";
import type { EnrollmentRepository } from "../../repositories/interfaces/enrollment.repository.js";
import type { RepositoryOptions } from "../../repositories/models/persistence-context.js";
import type {
  CancelEnrollmentInput,
  EnrollmentRecord,
  UpdateEnrollmentNextTemplateInput
} from "../../repositories/models/enrollment.persistence.js";
import { and, eq, resolveExecutor } from "../db/drizzle-helpers.js";

function mapEnrollmentRecord(row: typeof userProgramEnrollments.$inferSelect): EnrollmentRecord {
  return {
    id: row.id,
    userId: row.userId,
    programId: row.programId,
    status: row.status,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    currentWorkoutTemplateId: row.currentWorkoutTemplateId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class DrizzleEnrollmentRepository implements EnrollmentRepository {
  public constructor(private readonly db: any) {}

  public async findActiveByUserId(
    userId: string,
    options?: RepositoryOptions
  ): Promise<EnrollmentRecord | null> {
    const executor = resolveExecutor(this.db, options);
    const row = await executor.query.userProgramEnrollments.findFirst({
      where: and(eq(userProgramEnrollments.userId, userId), eq(userProgramEnrollments.status, "active"))
    });

    return row ? mapEnrollmentRecord(row) : null;
  }

  public async updateNextWorkoutTemplate(
    input: UpdateEnrollmentNextTemplateInput,
    options?: RepositoryOptions
  ): Promise<EnrollmentRecord> {
    const executor = resolveExecutor(this.db, options);
    const [row] = await executor
      .update(userProgramEnrollments)
      .set({
        currentWorkoutTemplateId: input.nextWorkoutTemplateId,
        updatedAt: new Date()
      })
      .where(eq(userProgramEnrollments.id, input.enrollmentId))
      .returning();

    if (!row) {
      throw new Error(`Enrollment ${input.enrollmentId} was not found for update.`);
    }

    return mapEnrollmentRecord(row);
  }

  public async cancelEnrollment(
    input: CancelEnrollmentInput,
    options?: RepositoryOptions
  ): Promise<EnrollmentRecord> {
    const executor = resolveExecutor(this.db, options);
    const [row] = await executor
      .update(userProgramEnrollments)
      .set({
        status: "cancelled",
        completedAt: input.completedAt,
        updatedAt: input.completedAt
      })
      .where(eq(userProgramEnrollments.id, input.enrollmentId))
      .returning();

    if (!row) {
      throw new Error(`Enrollment ${input.enrollmentId} was not found for cancellation.`);
    }

    return mapEnrollmentRecord(row);
  }
}
