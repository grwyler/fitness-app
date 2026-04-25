import { randomUUID } from "node:crypto";
import { users } from "@fitness/db";
import { eq } from "drizzle-orm";
import type { UnitSystem } from "@fitness/shared";
import type { ClerkClientLike } from "./auth.types.js";

type DatabaseLike = {
  select: (...args: any[]) => any;
  insert: (...args: any[]) => any;
};

export type ResolvedAppUser = {
  id: string;
  unitSystem: UnitSystem;
};

function getPreferredEmail(user: Awaited<ReturnType<ClerkClientLike["users"]["getUser"]>>) {
  const primaryEmail = user.emailAddresses?.find(
    (emailAddress) => emailAddress.id === user.primaryEmailAddressId
  );

  return primaryEmail?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress ?? `${user.id}@clerk.local`;
}

function getDisplayName(user: Awaited<ReturnType<ClerkClientLike["users"]["getUser"]>>) {
  const parts = [user.firstName, user.lastName].filter((value): value is string => Boolean(value?.trim()));

  return parts.length > 0 ? parts.join(" ") : user.username ?? null;
}

async function findUserByAuthProviderId(
  database: DatabaseLike,
  clerkUserId: string
): Promise<ResolvedAppUser | null> {
  const rows = await database
    .select({
      id: users.id,
      unitSystem: users.unitSystem
    })
    .from(users)
    .where(eq(users.authProviderId, clerkUserId))
    .limit(1);

  return rows[0] ?? null;
}

export async function resolveUser(input: {
  clerkClient: ClerkClientLike;
  clerkUserId: string;
  database: DatabaseLike;
}): Promise<ResolvedAppUser> {
  const existingUser = await findUserByAuthProviderId(input.database, input.clerkUserId);
  if (existingUser) {
    return existingUser;
  }

  const clerkUser = await input.clerkClient.users.getUser(input.clerkUserId);

  await input.database
    .insert(users)
    .values({
      id: randomUUID(),
      authProviderId: clerkUser.id,
      email: getPreferredEmail(clerkUser),
      displayName: getDisplayName(clerkUser)
    })
    .onConflictDoNothing({
      target: users.authProviderId
    });

  const resolvedUser = await findUserByAuthProviderId(input.database, input.clerkUserId);
  if (!resolvedUser) {
    throw new Error("Unable to resolve authenticated user.");
  }

  return resolvedUser;
}
