import { createHash, randomUUID } from "node:crypto";
import { oauthStates, userOauthIdentities, users } from "@fitness/db";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { AppEnv } from "../../../config/env.js";
import { resolveRoleForEmail } from "../admin-email-allowlist.js";
import type { OAuthIntent, OAuthProfile, OAuthProviderName } from "./oauth.types.js";

type DatabaseLike = {
  select: (...args: any[]) => any;
  insert: (...args: any[]) => any;
  update: (...args: any[]) => any;
  transaction: <T>(operation: (tx: any) => Promise<T>) => Promise<T>;
};

function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function isUniqueConstraintViolation(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const errorCode = (error as { code?: unknown }).code;
  if (errorCode === "23505") {
    return true;
  }

  const message = (error as { message?: unknown }).message;
  if (typeof message !== "string") {
    return false;
  }

  return (
    message.toLowerCase().includes("unique constraint") ||
    message.toLowerCase().includes("unique constraint failed") ||
    message.toLowerCase().includes("duplicate key value")
  );
}

export class OAuthStateError extends Error {
  readonly name = "OAuthStateError";
}

export class OAuthEmailError extends Error {
  readonly name = "OAuthEmailError";
  readonly reason: "missing_email" | "unverified_email" | "email_conflict_unverified";

  constructor(message: string, reason: OAuthEmailError["reason"]) {
    super(message);
    this.reason = reason;
  }
}

export class OAuthLinkError extends Error {
  readonly name = "OAuthLinkError";
  readonly reason: "identity_already_linked" | "provider_already_linked";

  constructor(message: string, reason: OAuthLinkError["reason"]) {
    super(message);
    this.reason = reason;
  }
}

export function hashOAuthState(state: string) {
  return sha256Hex(state);
}

export async function registerOAuthState(input: {
  database: DatabaseLike;
  provider: OAuthProviderName;
  state: string;
  intent: OAuthIntent | null;
  ttlMinutes: number;
}) {
  const now = Date.now();
  const expiresAt = new Date(now + input.ttlMinutes * 60_000);
  const stateHash = hashOAuthState(input.state);

  await input.database
    .insert(oauthStates)
    .values({
      id: randomUUID(),
      provider: input.provider,
      intent: input.intent,
      stateHash,
      expiresAt
    })
    .onConflictDoNothing({
      target: oauthStates.stateHash
    });
}

export async function consumeOAuthState(input: {
  database: DatabaseLike;
  provider: OAuthProviderName;
  state: string;
}) {
  const now = new Date();
  const stateHash = hashOAuthState(input.state);

  const rows = await input.database
    .update(oauthStates)
    .set({ consumedAt: now })
    .where(
      and(
        eq(oauthStates.provider, input.provider),
        eq(oauthStates.stateHash, stateHash),
        isNull(oauthStates.consumedAt),
        gt(oauthStates.expiresAt, now)
      )
    )
    .returning({ id: oauthStates.id });

  return Boolean(rows[0]);
}

type PublicUser = {
  email: string;
  id: string;
  role: "user" | "admin";
};

async function findUserById(database: DatabaseLike, userId: string): Promise<PublicUser | null> {
  const rows = await database
    .select({
      email: users.email,
      id: users.id,
      role: users.role
    })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  return rows[0] ?? null;
}

async function findUserByEmail(database: DatabaseLike, email: string): Promise<PublicUser | null> {
  const rows = await database
    .select({
      email: users.email,
      id: users.id,
      role: users.role
    })
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);

  return rows[0] ?? null;
}

async function findIdentity(database: DatabaseLike, input: { provider: OAuthProviderName; providerUserId: string }) {
  const rows = await database
    .select({
      userId: userOauthIdentities.userId
    })
    .from(userOauthIdentities)
    .where(
      and(eq(userOauthIdentities.provider, input.provider), eq(userOauthIdentities.providerUserId, input.providerUserId))
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function resolveUserForOAuthProfile(input: {
  database: DatabaseLike;
  env: AppEnv;
  profile: OAuthProfile;
}): Promise<PublicUser> {
  const existingIdentity = await findIdentity(input.database, {
    provider: input.profile.provider,
    providerUserId: input.profile.providerUserId
  });
  if (existingIdentity) {
    const user = await findUserById(input.database, existingIdentity.userId);
    if (!user) {
      throw new Error("OAuth identity is linked to a missing user.");
    }
    return user;
  }

  const email = input.profile.email;
  if (!email) {
    throw new OAuthEmailError("Your provider did not share an email address.", "missing_email");
  }

  if (input.env.OAUTH_REQUIRE_VERIFIED_EMAIL && !input.profile.emailVerified) {
    throw new OAuthEmailError("Your email must be verified to continue.", "unverified_email");
  }

  const displayName = input.profile.displayName ?? (email.split("@")[0] ?? null);
  const now = new Date();

  return input.database.transaction(async (tx) => {
    const existingUser = await findUserByEmail(tx, email);
    if (existingUser) {
      if (!input.profile.emailVerified) {
        throw new OAuthEmailError(
          "An account already exists for this email. Sign in with your email and password to continue.",
          "email_conflict_unverified"
        );
      }

      try {
        await tx.insert(userOauthIdentities).values({
          id: randomUUID(),
          userId: existingUser.id,
          provider: input.profile.provider,
          providerUserId: input.profile.providerUserId,
          email,
          emailVerified: input.profile.emailVerified,
          displayName: input.profile.displayName,
          avatarUrl: input.profile.avatarUrl,
          createdAt: now,
          updatedAt: now
        });
      } catch (error) {
        if (isUniqueConstraintViolation(error)) {
          const linked = await findIdentity(tx, {
            provider: input.profile.provider,
            providerUserId: input.profile.providerUserId
          });
          if (linked && linked.userId !== existingUser.id) {
            throw new OAuthLinkError("This provider account is already linked to another user.", "identity_already_linked");
          }
          throw new OAuthLinkError("This provider is already linked to your account.", "provider_already_linked");
        }
        throw error;
      }

      if (displayName) {
        await tx
          .update(users)
          .set({ displayName, updatedAt: now })
          .where(and(eq(users.id, existingUser.id), isNull(users.displayName)));
      }

      return existingUser;
    }

    const userId = randomUUID();
    const role = resolveRoleForEmail({ email, adminEmails: input.env.ADMIN_EMAILS });

    try {
      await tx.insert(users).values({
        id: userId,
        authProviderId: userId,
        email,
        displayName,
        role,
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        const refetched = await findUserByEmail(tx, email);
        if (refetched) {
          return refetched;
        }
      }
      throw error;
    }

    try {
      await tx.insert(userOauthIdentities).values({
        id: randomUUID(),
        userId,
        provider: input.profile.provider,
        providerUserId: input.profile.providerUserId,
        email,
        emailVerified: input.profile.emailVerified,
        displayName: input.profile.displayName,
        avatarUrl: input.profile.avatarUrl,
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new OAuthLinkError("This provider account is already linked to another user.", "identity_already_linked");
      }
      throw error;
    }

    const created = await findUserById(tx, userId);
    if (!created) {
      throw new Error("Unable to create user for OAuth sign in.");
    }

    return created;
  });
}
