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
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required")
});

export type AppEnv = z.infer<typeof envSchema>;

function parseEnv() {
  const parsedEnv = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL
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

  return parsedEnv.data;
}

export const env = parseEnv();
