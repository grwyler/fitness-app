import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotEnv } from "dotenv";
import { z } from "zod";

const workspaceRootEnvPath = resolve(process.cwd(), ".env");

if (existsSync(workspaceRootEnvPath)) {
  loadDotEnv({ path: workspaceRootEnvPath });
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
    const envHint = existsSync(workspaceRootEnvPath)
      ? `Checked ${workspaceRootEnvPath}.`
      : `No .env file found at ${workspaceRootEnvPath}. Copy .env.example to .env and set DATABASE_URL.`;
    throw new Error(`Invalid API environment configuration. ${details} ${envHint}`);
  }

  return parsedEnv.data;
}

export const env = parseEnv();
