import { users } from "@fitness/db";
import type { UserRepository, UserTrainingProfile } from "../../repositories/interfaces/user.repository.js";
import type { RepositoryOptions } from "../../repositories/models/persistence-context.js";
import { eq, resolveExecutor } from "../db/drizzle-helpers.js";

export class DrizzleUserRepository implements UserRepository {
  public constructor(private readonly db: any) {}

  public async findTrainingProfile(userId: string, options?: RepositoryOptions): Promise<UserTrainingProfile | null> {
    const executor = resolveExecutor(this.db, options);
    const rows = await executor
      .select({
        experienceLevel: users.experienceLevel,
        trainingGoal: users.trainingGoal,
        deletedAt: users.deletedAt
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const [row] = rows;
    if (!row) {
      return null;
    }

    if (row.deletedAt) {
      return null;
    }

    return {
      experienceLevel: row.experienceLevel ?? null,
      trainingGoal: row.trainingGoal ?? null
    };
  }
}
