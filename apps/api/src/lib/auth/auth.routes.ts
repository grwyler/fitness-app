import { randomUUID } from "node:crypto";
import { users } from "@fitness/db";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { failure, success } from "../http/envelope.js";
import { hashPassword, verifyPassword } from "./password.js";
import { issueAuthToken } from "./token.js";

type DatabaseLike = {
  select: (...args: any[]) => any;
  insert: (...args: any[]) => any;
};

const credentialsSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8)
});

function publicUser(user: { email: string; id: string }) {
  return {
    email: user.email,
    id: user.id
  };
}

async function findUserByEmail(database: DatabaseLike, email: string) {
  const rows = await database
    .select({
      email: users.email,
      id: users.id,
      passwordHash: users.passwordHash
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return rows[0] ?? null;
}

async function findUserById(database: DatabaseLike, userId: string) {
  const rows = await database
    .select({
      email: users.email,
      id: users.id
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return rows[0] ?? null;
}

export function createPublicAuthRouter(database: DatabaseLike) {
  const router = Router();

  router.post("/auth/signup", async (request, response, next) => {
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
      await database.insert(users).values({
        id: userId,
        authProviderId: userId,
        email: parsedCredentials.data.email,
        displayName: parsedCredentials.data.email.split("@")[0] ?? null,
        passwordHash
      });

      const token = issueAuthToken({
        email: parsedCredentials.data.email,
        userId
      });

      response.status(201).json(success({
        token,
        user: publicUser({
          email: parsedCredentials.data.email,
          id: userId
        })
      }));
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/signin", async (request, response, next) => {
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
