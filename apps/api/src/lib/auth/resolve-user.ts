import { randomUUID } from "node:crypto";
import { users } from "@fitness/db";
import { eq } from "drizzle-orm";
import type { UnitSystem } from "@fitness/shared";
import type { AppAuthState } from "./auth.types.js";

type DatabaseLike = {
  select: (...args: any[]) => any;
  insert: (...args: any[]) => any;
};

export type ResolvedAppUser = {
  id: string;
  unitSystem: UnitSystem;
};

async function findUserById(
  database: DatabaseLike,
  userId: string
): Promise<ResolvedAppUser | null> {
  const rows = await database
    .select({
      id: users.id,
      unitSystem: users.unitSystem
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

  await input.database
    .insert(users)
    .values({
      id: input.authUser.userId || randomUUID(),
      authProviderId: input.authUser.userId,
      email: input.authUser.email,
      displayName: input.authUser.email.split("@")[0] ?? null
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
