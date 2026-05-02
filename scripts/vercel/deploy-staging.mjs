import { spawnSync } from "node:child_process";
import {
  commandExists,
  getRepoRootFromScriptUrl,
  parseArgs,
  readLocalVercelConfig,
  requireNonEmpty,
  resolveProjectConfig
} from "./_lib.mjs";

function deployProject({ label, projectId, scope, token, localConfig, branch, environment, domain, cwd }) {
  const pull = spawnSync(
    "vercel",
    [
      "pull",
      "--yes",
      "--environment",
      environment,
      "--git-branch",
      branch,
      "--project",
      projectId,
      ...(scope ? ["--scope", scope] : []),
      ...(token ? ["--token", token] : [])
    ],
    { encoding: "utf8", stdio: "inherit", cwd, env: { ...process.env, VERCEL_PROJECT_ID: projectId } }
  );
  if (pull.status !== 0) {
    throw new Error(`vercel pull failed for ${label}`);
  }

  const build = spawnSync(
    "vercel",
    [
      "build",
      ...(localConfig ? ["--local-config", localConfig] : []),
      "--project",
      projectId,
      ...(scope ? ["--scope", scope] : []),
      ...(token ? ["--token", token] : [])
    ],
    { encoding: "utf8", stdio: "inherit", cwd, env: { ...process.env, VERCEL_PROJECT_ID: projectId } }
  );
  if (build.status !== 0) {
    throw new Error(`vercel build failed for ${label}`);
  }

  const deploy = spawnSync(
    "vercel",
    [
      "deploy",
      "--prebuilt",
      "--yes",
      ...(localConfig ? ["--local-config", localConfig] : []),
      "--project",
      projectId,
      ...(scope ? ["--scope", scope] : []),
      ...(token ? ["--token", token] : [])
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], cwd, env: { ...process.env, VERCEL_PROJECT_ID: projectId } }
  );
  if (deploy.status !== 0) {
    throw new Error(`vercel deploy failed for ${label}`);
  }

  const output = (deploy.stdout ?? "").trim().split(/\r?\n/);
  const deploymentUrl = output[output.length - 1] ?? "";
  console.log(`[${label}] deployment: ${deploymentUrl}`);

  if (domain) {
    const alias = spawnSync(
      "vercel",
      [
        "alias",
        "set",
        deploymentUrl,
        domain,
        "--project",
        projectId,
        ...(scope ? ["--scope", scope] : []),
        ...(token ? ["--token", token] : [])
      ],
      { encoding: "utf8", stdio: "inherit", cwd, env: { ...process.env, VERCEL_PROJECT_ID: projectId } }
    );
    if (alias.status !== 0) {
      throw new Error(`vercel alias set failed for ${label} (${domain}).`);
    }
  }

  return deploymentUrl;
}

function main() {
  const repoRoot = getRepoRootFromScriptUrl(import.meta.url);
  const args = parseArgs(process.argv.slice(2));

  const branch = typeof args.branch === "string" ? args.branch : "develop";
  const environment = typeof args.env === "string" ? args.env : "preview";

  const localVercel = readLocalVercelConfig(repoRoot);
  const scope = process.env.VERCEL_SCOPE ?? localVercel.VERCEL_SCOPE;
  const token = process.env.VERCEL_TOKEN ?? localVercel.VERCEL_TOKEN;
  const webProjectId = process.env.VERCEL_WEB_PROJECT_ID ?? localVercel.VERCEL_WEB_PROJECT_ID;
  const apiProjectId = process.env.VERCEL_API_PROJECT_ID ?? localVercel.VERCEL_API_PROJECT_ID;

  if (!commandExists("vercel")) {
    throw new Error("Vercel CLI not found. Install it with `npm i -g vercel` and run `vercel login`.");
  }

  const doWeb = Boolean(args.web) || Boolean(args.all) || (!args.api && !args.web);
  const doApi = Boolean(args.api) || Boolean(args.all) || (!args.api && !args.web);

  if (doWeb) {
    const projectId = requireNonEmpty("VERCEL_WEB_PROJECT_ID", webProjectId);
    const domain = process.env.VERCEL_WEB_STAGING_DOMAIN ?? localVercel.VERCEL_WEB_STAGING_DOMAIN;
    const cfg = resolveProjectConfig({ repoRoot, project: "web" });
    deployProject({
      label: "web",
      projectId,
      scope,
      token,
      localConfig: cfg.localConfig,
      branch,
      environment,
      domain,
      cwd: cfg.cwd
    });
  }

  if (doApi) {
    const projectId = requireNonEmpty("VERCEL_API_PROJECT_ID", apiProjectId);
    const domain = process.env.VERCEL_API_STAGING_DOMAIN ?? localVercel.VERCEL_API_STAGING_DOMAIN;
    const cfg = resolveProjectConfig({ repoRoot, project: "api" });
    deployProject({
      label: "api",
      projectId,
      scope,
      token,
      localConfig: cfg.localConfig,
      branch,
      environment,
      domain,
      cwd: cfg.cwd
    });
  }
}

main();
