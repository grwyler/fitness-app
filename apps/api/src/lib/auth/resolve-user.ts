import { randomUUID } from "node:crypto";
import { users } from "@fitness/db";
import { eq } from "drizzle-orm";
import type { UnitSystem } from "@fitness/shared";
import type { AppAuthState } from "./auth.types.js";
import type { UserRole } from "../../modules/workout/application/types/request-context.js";
import { getEnv } from "../../config/env.js";
import { resolveRoleForEmail } from "./admin-email-allowlist.js";

type DatabaseLike = {
  select: (...args: any[]) => any;
  insert: (...args: any[]) => any;
};

export type ResolvedAppUser = {
  id: string;
  unitSystem: UnitSystem;
  role: UserRole;
};

async function findUserById(
  database: DatabaseLike,
  userId: string
): Promise<ResolvedAppUser | null> {
  const rows = await database
    .select({
      id: users.id,
      unitSystem: users.unitSystem,
      role: users.role
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return rows[0] ?? null;
}

export async function resolveUser(input: {
  authUser: AppAuthState;
  database: DatabaseLike;
}): Promise<ResolvedAppUser> {
  const existingUser = await findUserById(input.database, input.authUser.userId);
  if (existingUser) {
    return existingUser;
  }

  const env = getEnv();
  const role = resolveRoleForEmail({ email: input.authUser.email, adminEmails: env.ADMIN_EMAILS });

  await input.database
    .insert(users)
    .values({
      id: input.authUser.userId || randomUUID(),
      authProviderId: input.authUser.userId,
      email: input.authUser.email,
      displayName: input.authUser.email.split("@")[0] ?? null,
      role
    })
    .onConflictDoNothing({
      target: users.id
    });

  const resolvedUser = await findUserById(input.database, input.authUser.userId);
  if (!resolvedUser) {
    throw new Error("Unable to resolve authenticated user.");
  }

  return resolvedUser;
}
