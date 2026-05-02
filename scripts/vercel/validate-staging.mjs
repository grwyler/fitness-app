import { spawnSync } from "node:child_process";
import {
  commandExists,
  getRepoRootFromScriptUrl,
  parseArgs,
  readLocalVercelConfig,
  requireNonEmpty
} from "./_lib.mjs";

function main() {
  const repoRoot = getRepoRootFromScriptUrl(import.meta.url);
  const args = parseArgs(process.argv.slice(2));

  const branch = typeof args.branch === "string" ? args.branch : "develop";
  const environment = typeof args.env === "string" ? args.env : "preview";

  if (!commandExists("vercel")) {
    throw new Error("Vercel CLI not found. Install it with `npm i -g vercel` and run `vercel login`.");
  }

  const localVercel = readLocalVercelConfig(repoRoot);
  const scope = process.env.VERCEL_SCOPE ?? localVercel.VERCEL_SCOPE;
  const token = process.env.VERCEL_TOKEN ?? localVercel.VERCEL_TOKEN;
  const apiProjectId = process.env.VERCEL_API_PROJECT_ID ?? localVercel.VERCEL_API_PROJECT_ID;
  const resolvedProjectId = requireNonEmpty("VERCEL_API_PROJECT_ID", apiProjectId);

  const result = spawnSync(
    "vercel",
    [
      "env",
      "run",
      "-e",
      environment,
      "--git-branch",
      branch,
      ...(scope ? ["--scope", scope] : []),
      ...(token ? ["--token", token] : []),
      "--project",
      resolvedProjectId,
      "--",
      "npm",
      "run",
      "build:api:vercel"
    ],
    { encoding: "utf8", stdio: "inherit", cwd: repoRoot, env: { ...process.env, VERCEL_PROJECT_ID: resolvedProjectId } }
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

main();

