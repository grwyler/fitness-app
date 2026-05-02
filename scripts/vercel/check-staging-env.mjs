import { spawnSync } from "node:child_process";
import {
  commandExists,
  getRepoRootFromScriptUrl,
  parseArgs,
  readLocalVercelConfig,
  requireNonEmpty
} from "./_lib.mjs";

const requiredByProject = {
  api: [
    "DATABASE_URL",
    "JWT_SECRET",
    "EMAIL_PROVIDER",
    "RESEND_API_KEY",
    "EMAIL_FROM",
    "PASSWORD_RESET_LINK_BASE_URL"
  ],
  web: ["EXPO_PUBLIC_API_BASE_URL"]
};

function usageAndExit() {
  console.error(
    [
      "Usage:",
      "  node scripts/vercel/check-staging-env.mjs --project api",
      "",
      "Defaults:",
      "- --env preview",
      "- --branch develop"
    ].join("\n")
  );
  process.exit(1);
}

function parseEnvLsOutput(stdout) {
  const keys = new Set();
  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    // Heuristic: env var names are typically the first token in a row.
    const first = line.split(/\s+/)[0] ?? "";
    if (/^[A-Z][A-Z0-9_]*$/.test(first)) {
      keys.add(first);
    }
  }
  return keys;
}

function main() {
  const repoRoot = getRepoRootFromScriptUrl(import.meta.url);
  const args = parseArgs(process.argv.slice(2));

  const project = typeof args.project === "string" ? args.project : null;
  if (!project || !(project in requiredByProject)) {
    usageAndExit();
  }

  const branch = typeof args.branch === "string" ? args.branch : "develop";
  const environment = typeof args.env === "string" ? args.env : "preview";

  if (!commandExists("vercel")) {
    throw new Error("Vercel CLI not found. Install it with `npm i -g vercel` and run `vercel login`.");
  }

  const localVercel = readLocalVercelConfig(repoRoot);
  const scope = process.env.VERCEL_SCOPE ?? localVercel.VERCEL_SCOPE;
  const token = process.env.VERCEL_TOKEN ?? localVercel.VERCEL_TOKEN;
  const webProjectId = process.env.VERCEL_WEB_PROJECT_ID ?? localVercel.VERCEL_WEB_PROJECT_ID;
  const apiProjectId = process.env.VERCEL_API_PROJECT_ID ?? localVercel.VERCEL_API_PROJECT_ID;
  const projectId = project === "api" ? apiProjectId : webProjectId;
  const resolvedProjectId = requireNonEmpty(
    project === "api" ? "VERCEL_API_PROJECT_ID" : "VERCEL_WEB_PROJECT_ID",
    projectId
  );

  const result = spawnSync(
    "vercel",
    [
      "env",
      "ls",
      environment,
      branch,
      ...(scope ? ["--scope", scope] : []),
      ...(token ? ["--token", token] : []),
      "--project",
      resolvedProjectId
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], env: { ...process.env, VERCEL_PROJECT_ID: resolvedProjectId } }
  );

  if (result.status !== 0) {
    throw new Error("Failed to list Vercel env vars.");
  }

  const keys = parseEnvLsOutput(result.stdout ?? "");
  const required = requiredByProject[project];
  const missing = required.filter((key) => !keys.has(key));

  if (missing.length > 0) {
    console.error(`Missing ${missing.length} required env var(s) for ${project} (${environment}/${branch}):`);
    for (const key of missing) {
      console.error(`- ${key}`);
    }
    process.exit(1);
  }

  console.log(`OK: required env vars present for ${project} (${environment}/${branch}).`);
}

main();
