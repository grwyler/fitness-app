import { spawnSync } from "node:child_process";
import {
  commandExists,
  getRepoRootFromScriptUrl,
  parseArgs,
  readLocalVercelConfig,
  requireNonEmpty,
  resolveProjectConfig
} from "./_lib.mjs";

function usageAndExit() {
  console.error(
    [
      "Usage:",
      "  node scripts/vercel/pull-staging-env.mjs --project api --out .vercel/.env.staging.develop.local",
      "",
      "Defaults:",
      "- --env preview",
      "- --branch develop"
    ].join("\n")
  );
  process.exit(1);
}

function main() {
  const repoRoot = getRepoRootFromScriptUrl(import.meta.url);
  const args = parseArgs(process.argv.slice(2));

  const project = typeof args.project === "string" ? args.project : null;
  if (!project) {
    usageAndExit();
  }

  const branch = typeof args.branch === "string" ? args.branch : "develop";
  const environment = typeof args.env === "string" ? args.env : "preview";
  const out = typeof args.out === "string" ? args.out : null;
  if (!out) {
    usageAndExit();
  }

  if (!commandExists("vercel")) {
    throw new Error("Vercel CLI not found. Install it with `npm i -g vercel` and run `vercel login`.");
  }

  const projectConfig = resolveProjectConfig({ repoRoot, project });
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
      "pull",
      out,
      "--yes",
      "--environment",
      environment,
      "--git-branch",
      branch,
      ...(scope ? ["--scope", scope] : []),
      ...(token ? ["--token", token] : []),
      "--project",
      resolvedProjectId
    ],
    { encoding: "utf8", stdio: "inherit", cwd: projectConfig.cwd, env: { ...process.env, VERCEL_PROJECT_ID: resolvedProjectId } }
  );

  if (result.status !== 0) {
    throw new Error(`Failed to pull ${project} env vars.`);
  }
}

main();

