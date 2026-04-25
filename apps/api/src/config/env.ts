import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotEnv } from "dotenv";
import { z } from "zod";

const currentFileDirectory = dirname(fileURLToPath(import.meta.url));
const envCandidatePaths = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "..", ".env"),
  resolve(process.cwd(), "..", "..", ".env"),
  resolve(currentFileDirectory, "..", "..", "..", "..", ".env")
];
const resolvedEnvPath = envCandidatePaths.find((candidatePath) => existsSync(candidatePath));

if (resolvedEnvPath) {
  loadDotEnv({ path: resolvedEnvPath });
}

const envSchema = z.object({
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required").optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required").optional(),
  USE_PGLITE_DEV: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true")
    .default(false)
});

export type AppEnv = z.infer<typeof envSchema>;

function parseEnv() {
  const parsedEnv = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    USE_PGLITE_DEV: process.env.USE_PGLITE_DEV
  });

  if (!parsedEnv.success) {
    const details = parsedEnv.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    const envHint = resolvedEnvPath
      ? `Loaded environment from ${resolvedEnvPath}.`
      : `No .env file found. Checked: ${envCandidatePaths.join(", ")}. Copy .env.example to .env at the repo root and set DATABASE_URL.`;
    throw new Error(`Invalid API environment configuration. ${details} ${envHint}`);
  }

  if (!parsedEnv.data.USE_PGLITE_DEV && !parsedEnv.data.DATABASE_URL) {
    const envHint = resolvedEnvPath
      ? `Loaded environment from ${resolvedEnvPath}.`
      : `No .env file found. Checked: ${envCandidatePaths.join(", ")}.`;
    throw new Error(
      `Invalid API environment configuration. DATABASE_URL is required unless USE_PGLITE_DEV=true. ${envHint}`
    );
  }

  if (parsedEnv.data.NODE_ENV !== "test" && !parsedEnv.data.CLERK_SECRET_KEY) {
    const envHint = resolvedEnvPath
      ? `Loaded environment from ${resolvedEnvPath}.`
      : `No .env file found. Checked: ${envCandidatePaths.join(", ")}.`;
    throw new Error(
      `Invalid API environment configuration. CLERK_SECRET_KEY is required outside tests. ${envHint}`
    );
  }

  return parsedEnv.data;
}

export const env = parseEnv();
