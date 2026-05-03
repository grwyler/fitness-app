import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotEnv } from "dotenv";
import { z } from "zod";
import { detectDeploymentStage, type DeploymentStage } from "./deployment-stage.js";

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

let didLoadDotEnv = false;
function loadDotEnvOnce() {
  if (didLoadDotEnv) {
    return;
  }
  didLoadDotEnv = true;

  if (resolvedEnvPath) {
    loadDotEnv({ path: resolvedEnvPath });
  }
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
  ADMIN_EMAILS: trimmedOptionalString,
  CORS_ALLOWED_ORIGINS: trimmedOptionalString,
  DATABASE_URL: trimmedOptionalString.pipe(z.string().min(1, "DATABASE_URL is required").optional()),
  EMAIL_FROM: trimmedOptionalString,
  EMAIL_PROVIDER: emailProviderSchema,
  JWT_SECRET: trimmedOptionalString.pipe(z.string().min(32, "JWT_SECRET must be at least 32 characters").optional()),
  NODE_ENV: z
    .preprocess((value) => (typeof value === "string" ? value.trim() : value), z.enum(["development", "test", "production"]))
    .default("development"),
  OBSERVABILITY_ENABLED: z
    .preprocess(
      (value) => (typeof value === "string" ? value.trim() : value),
      z.enum(["true", "false"]).optional()
    )
    .transform((value) => (value === undefined ? undefined : value === "true")),
  PORT: z.coerce.number().int().positive().default(4000),
  PASSWORD_RESET_LINK_BASE_URL: trimmedOptionalString,
  PASSWORD_RESET_TOKEN_SECRET: trimmedOptionalString,
  PASSWORD_RESET_TOKEN_TTL_MINUTES: trimmedOptionalNumber
    .pipe(z.number().int().positive().optional())
    .transform((value) => value ?? 30),
  RESEND_API_KEY: trimmedOptionalString,
  SENTRY_DSN: trimmedOptionalString,
  SENTRY_ENVIRONMENT: trimmedOptionalString,
  SENTRY_RELEASE: trimmedOptionalString,
  VERCEL: trimmedOptionalString,
  VERCEL_ENV: trimmedOptionalString,
  VERCEL_GIT_COMMIT_REF: trimmedOptionalString,
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
  const isVercel = process.env.VERCEL === "1";
  const vercelEnv = process.env.VERCEL_ENV;
  const vercelBranch = process.env.VERCEL_GIT_COMMIT_REF;

  if (isVercel) {
    const scope = typeof vercelEnv === "string" && vercelEnv.length > 0 ? vercelEnv : "production";
    const branchHint =
      scope === "preview" && typeof vercelBranch === "string" && vercelBranch.length > 0
        ? ` (git branch: ${vercelBranch})`
        : "";
    return `Vercel detected (VERCEL_ENV=${scope})${branchHint}. Configure env vars in Vercel Project Settings -> Environment Variables -> ${scope} (and branch overrides when needed), then redeploy.`;
  }

  if (resolvedEnvPath) {
    return `Loaded environment from ${resolvedEnvPath}.`;
  }

  return `No .env file found. Checked: ${envCandidatePaths.join(", ")}. Copy .env.example to .env at the repo root.`;
}

export class EnvConfigError extends Error {
  readonly name = "EnvConfigError";
  readonly problems: string[];
  readonly hint: string;

  constructor(input: { problems: string[]; hint: string }) {
    const formattedProblems = input.problems.map((problem) => `- ${problem}`).join("\n");
    const isVercel = process.env.VERCEL === "1";
    const vercelEnv = process.env.VERCEL_ENV;
    const vercelScope = typeof vercelEnv === "string" && vercelEnv.length > 0 ? vercelEnv : "production";
    const vercelBranch = process.env.VERCEL_GIT_COMMIT_REF;
    const branchSuffix =
      vercelScope === "preview" && typeof vercelBranch === "string" && vercelBranch.length > 0
        ? ` (branch: ${vercelBranch})`
        : "";

    const fixLines = isVercel
      ? [
          "Fix (Vercel):",
          `- Project Settings -> Environment Variables -> ${vercelScope}${branchSuffix}`,
          "  - EMAIL_PROVIDER=resend",
          "  - RESEND_API_KEY=<your Resend API key>",
          "  - EMAIL_FROM=\"Your App <no-reply@your-domain.com>\"",
          "  - PASSWORD_RESET_LINK_BASE_URL=<deep link or URL used in password reset emails>",
          "- Redeploy after updating env vars (Vercel only injects env vars into new deployments)."
        ]
      : [
          "Fix (local):",
          "- Copy .env.example -> .env and set required values, or export them in your shell environment.",
          "- For production hosting, configure environment variables in your hosting provider and redeploy."
        ];

    const message = [
      "Invalid API environment configuration.",
      formattedProblems.length > 0 ? formattedProblems : "- Unknown error.",
      "",
      ...fixLines,
      "",
      input.hint,
      "See DEPLOYMENT.md (API Vercel project setup) for the full list."
    ].join("\n");

    super(message);
    this.problems = input.problems;
    this.hint = input.hint;
  }
}

export function parseEnvFrom(values: Record<string, string | undefined>): AppEnv {
  const parsedEnv = envSchema.safeParse(values);
  const problems: string[] = [];

  if (!parsedEnv.success) {
    for (const issue of parsedEnv.error.issues) {
      const key = issue.path.join(".") || "env";
      problems.push(`${key}: ${issue.message}`);
    }
  } else {
    const data = parsedEnv.data;

    const stage: DeploymentStage = detectDeploymentStage({
      nodeEnv: data.NODE_ENV,
      vercel: data.VERCEL,
      vercelEnv: data.VERCEL_ENV,
      vercelGitCommitRef: data.VERCEL_GIT_COMMIT_REF
    });

    const requiresHostedDependencies = stage === "production" || stage === "staging";

    if (!data.USE_PGLITE_DEV && !data.DATABASE_URL) {
      problems.push("DATABASE_URL is required unless USE_PGLITE_DEV=true.");
    }

    if (requiresHostedDependencies && data.USE_PGLITE_DEV) {
      problems.push("USE_PGLITE_DEV must be false/unset in staging/production.");
    }

    const emailProvider = data.EMAIL_PROVIDER ?? (requiresHostedDependencies ? undefined : "console");
    const resolvedEmailProvider = emailProvider ?? "console";

    if (requiresHostedDependencies) {
      if (!data.JWT_SECRET) {
        problems.push("JWT_SECRET is required in staging/production (min 32 characters).");
      }

      if (!emailProvider) {
        problems.push("EMAIL_PROVIDER is required in staging/production (set EMAIL_PROVIDER=resend).");
      } else if (resolvedEmailProvider !== "resend") {
        problems.push("EMAIL_PROVIDER must be resend in staging/production.");
      }

      if (!data.RESEND_API_KEY) {
        problems.push("RESEND_API_KEY is required in staging/production (Resend).");
      }

      if (!data.EMAIL_FROM) {
        problems.push("EMAIL_FROM is required in staging/production (Resend sender address).");
      }

      if (!data.PASSWORD_RESET_LINK_BASE_URL) {
        problems.push("PASSWORD_RESET_LINK_BASE_URL is required in staging/production (password reset link base).");
      }
    }

    if (problems.length === 0) {
      return {
        ...data,
        EMAIL_PROVIDER: resolvedEmailProvider,
        JWT_SECRET: data.JWT_SECRET ?? "development-only-jwt-secret-change-before-production",
        PASSWORD_RESET_LINK_BASE_URL: data.PASSWORD_RESET_LINK_BASE_URL ?? "fitnessapp://reset-password",
        PASSWORD_RESET_TOKEN_SECRET:
          data.PASSWORD_RESET_TOKEN_SECRET ??
          (data.JWT_SECRET ?? "development-only-jwt-secret-change-before-production")
      };
    }
  }

  throw new EnvConfigError({ problems, hint: getEnvHint() });
}

export function parseEnvFromProcess(): AppEnv {
  loadDotEnvOnce();
  return parseEnvFrom({
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS,
    DATABASE_URL: process.env.DATABASE_URL,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    JWT_SECRET: process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    OBSERVABILITY_ENABLED: process.env.OBSERVABILITY_ENABLED,
    PORT: process.env.PORT,
    PASSWORD_RESET_LINK_BASE_URL: process.env.PASSWORD_RESET_LINK_BASE_URL,
    PASSWORD_RESET_TOKEN_SECRET: process.env.PASSWORD_RESET_TOKEN_SECRET,
    PASSWORD_RESET_TOKEN_TTL_MINUTES: process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
    SENTRY_RELEASE: process.env.SENTRY_RELEASE,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
    USE_PGLITE_DEV: process.env.USE_PGLITE_DEV
  });
}

let cachedEnv: AppEnv | null = null;
let cachedEnvError: unknown | null = null;

export function resetEnvForTests() {
  cachedEnv = null;
  cachedEnvError = null;
  didLoadDotEnv = false;
}

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }
  if (cachedEnvError) {
    throw cachedEnvError;
  }

  try {
    cachedEnv = parseEnvFromProcess();
    return cachedEnv;
  } catch (error) {
    cachedEnvError = error;
    throw error;
  }
}
