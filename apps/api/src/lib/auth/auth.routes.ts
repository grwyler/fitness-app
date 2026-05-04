import { randomUUID } from "node:crypto";
import { passwordResetTokens, users } from "@fitness/db";
import { and, eq, gt, isNull } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { failure, success } from "../http/envelope.js";
import { createRateLimitMiddleware } from "../http/rate-limit.js";
import { createSoftRateLimiter } from "../http/soft-rate-limit.js";
import { getEmailService } from "../email/email.service.js";
import { logger } from "../observability/logger.js";
import { hashPassword, verifyPassword } from "./password.js";
import { buildPasswordResetLink, generatePasswordResetToken, hashPasswordResetToken } from "./password-reset.js";
import { issueAuthToken } from "./token.js";
import type { UserRole } from "../../modules/workout/application/types/request-context.js";
import { getEnv } from "../../config/env.js";
import { resolveRoleForEmail } from "./admin-email-allowlist.js";

type DatabaseLike = {
  select: (...args: any[]) => any;
  insert: (...args: any[]) => any;
  update: (...args: any[]) => any;
  transaction: <T>(operation: (tx: any) => Promise<T>) => Promise<T>;
};

const credentialsSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8)
});

const passwordResetRequestSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase())
});

const passwordResetConfirmSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8)
});

function publicUser(user: { email: string; id: string; role: UserRole }) {
  return {
    email: user.email,
    id: user.id,
    role: user.role
  };
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

function normalizeEmailFromBody(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

async function findUserByEmail(database: DatabaseLike, email: string) {
  const rows = await database
    .select({
      email: users.email,
      id: users.id,
      role: users.role,
      passwordHash: users.passwordHash,
      deletedAt: users.deletedAt
    })
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);

  return rows[0] ?? null;
}

async function findUserById(database: DatabaseLike, userId: string) {
  const rows = await database
    .select({
      email: users.email,
      id: users.id,
      role: users.role,
      deletedAt: users.deletedAt
    })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  return rows[0] ?? null;
}

export function createPublicAuthRouter(database: DatabaseLike) {
  const router = Router();
  const env = getEnv();

  const signUpRateLimit = createRateLimitMiddleware({
    key: (request) => `auth_signup|email=${normalizeEmailFromBody((request.body as any)?.email) ?? "none"}`,
    max: 5,
    windowMs: 60_000
  });
  const signInRateLimit = createRateLimitMiddleware({
    key: (request) => `auth_signin|email=${normalizeEmailFromBody((request.body as any)?.email) ?? "none"}`,
    max: 10,
    windowMs: 60_000
  });

  const passwordResetRequestLimiter = createSoftRateLimiter({
    key: (request) => `auth_password_reset_request|email=${normalizeEmailFromBody((request.body as any)?.email) ?? "none"}`,
    max: 3,
    windowMs: 60_000
  });

  router.post("/auth/signup", signUpRateLimit, async (request, response, next) => {
    try {
      const parsedCredentials = credentialsSchema.safeParse(request.body);
      if (!parsedCredentials.success) {
        response.status(400).json(failure("VALIDATION_ERROR", "Enter a valid email and a password with at least 8 characters."));
        return;
      }

      const existingUser = await findUserByEmail(database, parsedCredentials.data.email);
      if (existingUser) {
        response.status(409).json(failure("CONFLICT", "An account already exists for this email."));
        return;
      }

      const userId = randomUUID();
      const passwordHash = await hashPassword(parsedCredentials.data.password);
      const role = resolveRoleForEmail({ email: parsedCredentials.data.email, adminEmails: env.ADMIN_EMAILS });
      try {
        await database.insert(users).values({
          id: userId,
          authProviderId: userId,
          email: parsedCredentials.data.email,
          displayName: parsedCredentials.data.email.split("@")[0] ?? null,
          passwordHash,
          role
        });
      } catch (error) {
        if (isUniqueConstraintViolation(error)) {
          response.status(409).json(failure("CONFLICT", "An account already exists for this email."));
          return;
        }

        throw error;
      }

      const token = issueAuthToken({
        email: parsedCredentials.data.email,
        userId
      });

      response.status(201).json(success({
        token,
        user: publicUser({
          email: parsedCredentials.data.email,
          id: userId,
          role
        })
      }));
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/signin", signInRateLimit, async (request, response, next) => {
    try {
      const parsedCredentials = credentialsSchema.safeParse(request.body);
      if (!parsedCredentials.success) {
        response.status(400).json(failure("VALIDATION_ERROR", "Enter a valid email and password."));
        return;
      }

      const existingUser = await findUserByEmail(database, parsedCredentials.data.email);
      const passwordMatches = await verifyPassword(parsedCredentials.data.password, existingUser?.passwordHash);
      if (!existingUser || !passwordMatches) {
        response.status(401).json(failure("UNAUTHENTICATED", "Email or password is incorrect."));
        return;
      }

      const desiredRole = resolveRoleForEmail({ email: existingUser.email, adminEmails: env.ADMIN_EMAILS });
      if (desiredRole === "admin" && existingUser.role !== "admin") {
        await database
          .update(users)
          .set({ role: "admin", updatedAt: new Date() })
          .where(eq(users.id, existingUser.id));
        existingUser.role = "admin";
      }

      const token = issueAuthToken({
        email: existingUser.email,
        userId: existingUser.id
      });

      response.json(success({
        token,
        user: publicUser(existingUser)
      }));
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/password-reset/request", async (request, response, next) => {
    try {
      const parsed = passwordResetRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json(failure("VALIDATION_ERROR", "Enter a valid email address."));
        return;
      }

      if (!passwordResetRequestLimiter.allow(request)) {
        response.json(success({}));
        return;
      }

      const existingUser = await findUserByEmail(database, parsed.data.email);
      if (existingUser) {
        try {
          const tokenDetails = generatePasswordResetToken();
          const resetLink = buildPasswordResetLink(tokenDetails.token);

          await database.transaction(async (tx) => {
            await tx
              .update(passwordResetTokens)
              .set({
                consumedAt: new Date()
              })
              .where(and(eq(passwordResetTokens.userId, existingUser.id), isNull(passwordResetTokens.consumedAt)));

            await tx.insert(passwordResetTokens).values({
              id: randomUUID(),
              userId: existingUser.id,
              tokenHash: tokenDetails.tokenHash,
              expiresAt: tokenDetails.expiresAt
            });
          });

          await getEmailService().sendPasswordResetEmail({
            to: existingUser.email,
            resetLink
          });
        } catch (error) {
          logger.error("password_reset_request_failed", {
            userId: existingUser.id,
            email: existingUser.email,
            errorMessage: error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : "NonErrorThrown"
          });
        }
      }

      response.json(success({}));
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/password-reset/confirm", async (request, response, next) => {
    try {
      const parsed = passwordResetConfirmSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json(failure("VALIDATION_ERROR", "Enter a valid reset token and a password with at least 8 characters."));
        return;
      }

      const now = new Date();
      const tokensInvalidBefore = new Date(Math.floor(now.getTime() / 1000) * 1000);
      const tokenHash = hashPasswordResetToken(parsed.data.token);
      const passwordHash = await hashPassword(parsed.data.password);

      const updatedUserId = await database.transaction(async (tx) => {
        const [tokenRow] = await tx
          .update(passwordResetTokens)
          .set({
            consumedAt: now
          })
          .where(
            and(
              eq(passwordResetTokens.tokenHash, tokenHash),
              isNull(passwordResetTokens.consumedAt),
              gt(passwordResetTokens.expiresAt, now)
            )
          )
          .returning({
            userId: passwordResetTokens.userId
          });

        if (!tokenRow) {
          return null;
        }

        await tx
          .update(users)
          .set({
            passwordHash,
            tokensInvalidBefore,
            updatedAt: now
          })
          .where(eq(users.id, tokenRow.userId));

        return tokenRow.userId as string;
      });

      if (!updatedUserId) {
        response.status(400).json(failure("VALIDATION_ERROR", "Invalid or expired reset token."));
        return;
      }

      response.json(success({}));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function createProtectedAuthRouter(database: DatabaseLike) {
  const router = Router();

  router.get("/auth/me", async (request, response, next) => {
    try {
      if (!request.authUser) {
        response.status(401).json(failure("UNAUTHENTICATED", "Authentication is required."));
        return;
      }

      const existingUser = await findUserById(database, request.authUser.userId);
      if (!existingUser) {
        response.status(401).json(failure("UNAUTHENTICATED", "Authentication is required."));
        return;
      }

      response.json(success({
        user: publicUser(existingUser)
      }));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
