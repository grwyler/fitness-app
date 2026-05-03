import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  commandExists,
  getRepoRootFromScriptUrl,
  parseArgs,
  readLocalVercelConfig,
  requireNonEmpty,
  runCapture
} from "./_lib.mjs";
import { loadVercelApiConfig, vercelApiFetch } from "./vercel-api.mjs";

function readLinkedProjectJson(pathToProjectJson) {
  try {
    const raw = readFileSync(pathToProjectJson, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function main() {
  const repoRoot = getRepoRootFromScriptUrl(import.meta.url);
  const args = parseArgs(process.argv.slice(2));

  if (!commandExists("git")) {
    throw new Error("git is required.");
  }

  if (!commandExists("vercel")) {
    throw new Error("Vercel CLI not found. Install it with `npm i -g vercel` and run `vercel login`.");
  }

  const local = readLocalVercelConfig(repoRoot);
  const webProjectId = process.env.VERCEL_WEB_PROJECT_ID ?? local.VERCEL_WEB_PROJECT_ID;
  const apiProjectId = process.env.VERCEL_API_PROJECT_ID ?? local.VERCEL_API_PROJECT_ID;
  const token = process.env.VERCEL_TOKEN ?? local.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID ?? local.VERCEL_TEAM_ID;

  const gitRemote = runCapture("git", ["remote", "get-url", "origin"], { cwd: repoRoot }).stdout.trim();
  const gitBranchMainExists = runCapture("git", ["show-ref", "--verify", "--quiet", "refs/heads/main"], { cwd: repoRoot });
  void gitBranchMainExists;

  console.log("Repo:");
  console.log(`- root: ${repoRoot}`);
  console.log(`- origin: ${gitRemote || "(no origin remote found)"}`);

  ensureDevelopBranch(repoRoot);

  const webLinked = existsSync(resolve(repoRoot, ".vercel", "project.json"));
  const apiLinked = existsSync(resolve(repoRoot, "apps", "api", ".vercel", "project.json"));
  const mobileLinked = existsSync(resolve(repoRoot, "apps", "mobile", ".vercel", "project.json"));

  console.log("Vercel CLI project linking:");
  console.log(`- web linked (repo root): ${webLinked ? "yes" : "no"}`);
  console.log(`- web linked (apps/mobile): ${mobileLinked ? "yes" : "no"}`);
  console.log(`- api linked (apps/api): ${apiLinked ? "yes" : "no"}`);

  if (webLinked) {
    const linked = readLinkedProjectJson(resolve(repoRoot, ".vercel", "project.json"));
    if (linked?.projectId) {
      console.log(`- web linked projectId: ${linked.projectId}`);
    }
  }
  if (mobileLinked) {
    const linked = readLinkedProjectJson(resolve(repoRoot, "apps", "mobile", ".vercel", "project.json"));
    if (linked?.projectId) {
      console.log(`- mobile linked projectId: ${linked.projectId}`);
    }
  }
  if (apiLinked) {
    const linked = readLinkedProjectJson(resolve(repoRoot, "apps", "api", ".vercel", "project.json"));
    if (linked?.projectId) {
      console.log(`- api linked projectId: ${linked.projectId}`);
    }
  }

  console.log("Project IDs (recommended for non-interactive automation):");
  console.log(`- VERCEL_WEB_PROJECT_ID: ${webProjectId ? "set" : "missing"}`);
  console.log(`- VERCEL_API_PROJECT_ID: ${apiProjectId ? "set" : "missing"}`);

  if (Boolean(args.verify) || Boolean(args["verify-production-branch"])) {
    await verifyProductionBranch({
      repoRoot,
      token,
      teamId,
      webProjectId,
      apiProjectId
    });
  } else {
    console.log("Tip: run `npm run vercel:staging:setup -- --verify` to verify Vercel project settings via REST API (requires VERCEL_TOKEN).");
  }

  console.log("");
  console.log("Next steps:");
  console.log("- Create `.env.web.staging` and/or `.env.api.staging` (see *.example files).");
  console.log("- Push develop-specific Preview env vars:");
  console.log("  - `npm run vercel:staging:env:push:web`");
  console.log("  - `npm run vercel:staging:env:push:api`");
  console.log("- Verify required keys exist:");
  console.log("  - `npm run vercel:staging:env:check`");
  console.log("- Validate API build under develop Preview env:");
  console.log("  - `npm run vercel:staging:validate`");
  console.log("- Deploy (manual): `npm run vercel:staging:deploy`");
  console.log("- Protect branches: `npm run github:protect-branches`");
}

function ensureDevelopBranch(repoRoot) {
  const developExists = spawnOk("git", ["show-ref", "--verify", "--quiet", "refs/heads/develop"], repoRoot);
  if (developExists) {
    return;
  }

  console.log("Creating local `develop` branch from `main`...");
  runCapture("git", ["checkout", "main"], { cwd: repoRoot });
  runCapture("git", ["checkout", "-b", "develop"], { cwd: repoRoot });
  runCapture("git", ["checkout", "main"], { cwd: repoRoot });
}

function spawnOk(cmd, args, cwd) {
  try {
    runCapture(cmd, args, { cwd });
    return true;
  } catch {
    return false;
  }
}

async function verifyProductionBranch({ repoRoot, token, teamId, webProjectId, apiProjectId }) {
  const { token: resolvedToken } = loadVercelApiConfig({ repoRoot, overrides: { VERCEL_TOKEN: token } });
  const webId = webProjectId;
  const apiId = apiProjectId;

  console.log("");
  console.log("Verifying Vercel productionBranch via REST API:");

  if (webId) {
    const project = await vercelApiFetch({
      token: requireNonEmpty("VERCEL_TOKEN", resolvedToken),
      teamId,
      path: `/v9/projects/${encodeURIComponent(webId)}`
    });
    const productionBranch = project?.productionBranch ?? "(unknown)";
    console.log(`- web project productionBranch: ${productionBranch}`);
    if (productionBranch !== "main") {
      throw new Error(`Web project productionBranch must remain 'main' (got ${productionBranch}).`);
    }
  }

  if (apiId) {
    const project = await vercelApiFetch({
      token: requireNonEmpty("VERCEL_TOKEN", resolvedToken),
      teamId,
      path: `/v9/projects/${encodeURIComponent(apiId)}`
    });
    const productionBranch = project?.productionBranch ?? "(unknown)";
    console.log(`- api project productionBranch: ${productionBranch}`);
    if (productionBranch !== "main") {
      throw new Error(`API project productionBranch must remain 'main' (got ${productionBranch}).`);
    }
  }
}

await main();
