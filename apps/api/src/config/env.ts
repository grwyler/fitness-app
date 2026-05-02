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

const trimmedOptionalNumber = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.coerce.number().optional()
);

const emailProviderSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.enum(["console", "resend"]).optional()
);

const envSchema = z.object({
  CORS_ALLOWED_ORIGINS: trimmedOptionalString,
  DATABASE_URL: trimmedOptionalString.pipe(z.string().min(1, "DATABASE_URL is required").optional()),
  EMAIL_FROM: trimmedOptionalString,
  EMAIL_PROVIDER: emailProviderSchema,
  JWT_SECRET: trimmedOptionalString.pipe(z.string().min(32, "JWT_SECRET must be at least 32 characters").optional()),
  NODE_ENV: z
    .preprocess((value) => (typeof value === "string" ? value.trim() : value), z.enum(["development", "test", "production"]))
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  PASSWORD_RESET_LINK_BASE_URL: trimmedOptionalString,
  PASSWORD_RESET_TOKEN_SECRET: trimmedOptionalString,
  PASSWORD_RESET_TOKEN_TTL_MINUTES: trimmedOptionalNumber
    .pipe(z.number().int().positive().optional())
    .transform((value) => value ?? 30),
  RESEND_API_KEY: trimmedOptionalString,
  USE_PGLITE_DEV: z
    .preprocess(
      (value) => (typeof value === "string" ? value.trim() : value),
      z.enum(["true", "false"]).optional()
    )
    .transform((value) => value === "true")
    .default(false)
});

export type AppEnv = z.infer<typeof envSchema> & {
  EMAIL_PROVIDER: "console" | "resend";
  JWT_SECRET: string;
  PASSWORD_RESET_LINK_BASE_URL: string;
  PASSWORD_RESET_TOKEN_SECRET: string;
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
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    JWT_SECRET: process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    PASSWORD_RESET_LINK_BASE_URL: process.env.PASSWORD_RESET_LINK_BASE_URL,
    PASSWORD_RESET_TOKEN_SECRET: process.env.PASSWORD_RESET_TOKEN_SECRET,
    PASSWORD_RESET_TOKEN_TTL_MINUTES: process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
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

  const emailProvider = parsedEnv.data.EMAIL_PROVIDER ?? (parsedEnv.data.NODE_ENV === "production" ? undefined : "console");
  if (parsedEnv.data.NODE_ENV === "production" && !emailProvider) {
    throw new Error(
      "Invalid API environment configuration. EMAIL_PROVIDER is required in production. Set EMAIL_PROVIDER=resend."
    );
  }

  const resolvedEmailProvider = emailProvider ?? "console";

  if (parsedEnv.data.NODE_ENV === "production") {
    if (resolvedEmailProvider !== "resend") {
      throw new Error(
        "Invalid API environment configuration. EMAIL_PROVIDER must be resend in production."
      );
    }

    if (!parsedEnv.data.RESEND_API_KEY || parsedEnv.data.RESEND_API_KEY.length === 0) {
      throw new Error("Invalid API environment configuration. RESEND_API_KEY is required in production.");
    }

    if (!parsedEnv.data.EMAIL_FROM || parsedEnv.data.EMAIL_FROM.length === 0) {
      throw new Error("Invalid API environment configuration. EMAIL_FROM is required in production.");
    }

    if (!parsedEnv.data.PASSWORD_RESET_LINK_BASE_URL || parsedEnv.data.PASSWORD_RESET_LINK_BASE_URL.length === 0) {
      throw new Error("Invalid API environment configuration. PASSWORD_RESET_LINK_BASE_URL is required in production.");
    }
  }

  return {
    ...parsedEnv.data,
    EMAIL_PROVIDER: resolvedEmailProvider,
    JWT_SECRET: parsedEnv.data.JWT_SECRET ?? "development-only-jwt-secret-change-before-production",
    PASSWORD_RESET_LINK_BASE_URL:
      parsedEnv.data.PASSWORD_RESET_LINK_BASE_URL ?? "fitnessapp://reset-password",
    PASSWORD_RESET_TOKEN_SECRET:
      parsedEnv.data.PASSWORD_RESET_TOKEN_SECRET ??
      (parsedEnv.data.JWT_SECRET ?? "development-only-jwt-secret-change-before-production")
  };
}

export const env = parseEnv();
