import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotEnv } from "dotenv";
import { z } from "zod";

const currentFileDirectory = dirname(fileURLToPath(import.meta.url));
const envCandidatePaths = [
  resolve(process.cwd(), ".env.local"),
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "..", ".env.local"),
  resolve(process.cwd(), "..", ".env"),
  resolve(process.cwd(), "..", "..", ".env.local"),
  resolve(process.cwd(), "..", "..", ".env"),
  resolve(currentFileDirectory, "..", "..", "..", "..", ".env.local"),
  resolve(currentFileDirectory, "..", "..", "..", "..", ".env")
];
const resolvedEnvPath = envCandidatePaths.find((candidatePath) => existsSync(candidatePath));

if (resolvedEnvPath) {
  loadDotEnv({ path: resolvedEnvPath });
}

const trimmedOptionalString = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().optional()
);

const envSchema = z.object({
  CORS_ALLOWED_ORIGINS: trimmedOptionalString,
  DATABASE_URL: trimmedOptionalString.pipe(z.string().min(1, "DATABASE_URL is required").optional()),
  JWT_SECRET: trimmedOptionalString.pipe(z.string().min(32, "JWT_SECRET must be at least 32 characters").optional()),
  NODE_ENV: z
    .preprocess((value) => (typeof value === "string" ? value.trim() : value), z.enum(["development", "test", "production"]))
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  USE_PGLITE_DEV: z
    .preprocess(
      (value) => (typeof value === "string" ? value.trim() : value),
      z.enum(["true", "false"]).optional()
    )
    .transform((value) => value === "true")
    .default(false)
});

export type AppEnv = z.infer<typeof envSchema> & {
  JWT_SECRET: string;
};

function getEnvHint() {
  return resolvedEnvPath
    ? `Loaded environment from ${resolvedEnvPath}.`
    : `No .env file found. Checked: ${envCandidatePaths.join(", ")}. Copy .env.example to .env at the repo root.`;
}

function parseEnv(): AppEnv {
  const parsedEnv = envSchema.safeParse({
    CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    USE_PGLITE_DEV: process.env.USE_PGLITE_DEV
  });

  if (!parsedEnv.success) {
    const details = parsedEnv.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid API environment configuration. ${details} ${getEnvHint()}`);
  }

  if (!parsedEnv.data.USE_PGLITE_DEV && !parsedEnv.data.DATABASE_URL) {
    throw new Error(
      `Invalid API environment configuration. DATABASE_URL is required unless USE_PGLITE_DEV=true. ${getEnvHint()}`
    );
  }

  if (parsedEnv.data.NODE_ENV === "production" && !parsedEnv.data.JWT_SECRET) {
    throw new Error(
      "Invalid API environment configuration. JWT_SECRET is required in production and must be at least 32 characters."
    );
  }

  return {
    ...parsedEnv.data,
    JWT_SECRET:
      parsedEnv.data.JWT_SECRET ??
      "development-only-jwt-secret-change-before-production"
  };
}

export const env = parseEnv();
