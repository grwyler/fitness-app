import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getRepoRootFromScriptUrl, parseArgs, spawnVercelSync } from "./_lib.mjs";

function readProjectId(projectJsonPath) {
  const raw = readFileSync(projectJsonPath, "utf8");
  const parsed = JSON.parse(raw);
  if (typeof parsed?.projectId !== "string" || parsed.projectId.trim() === "") {
    throw new Error(`Missing projectId in ${projectJsonPath}`);
  }
  return parsed.projectId.trim();
}

function patchProjectSsoProtection({ projectId, dryRun }) {
  const body = JSON.stringify({ ssoProtection: null });
  if (dryRun) {
    console.log(`[dry-run] disable ssoProtection for ${projectId}: ${body}`);
    return;
  }

  const result = spawnVercelSync(
    ["api", `/v9/projects/${projectId}`, "-X", "PATCH", "--input", "-"],
    { input: body, encoding: "utf8", stdio: "inherit" }
  );

  if (result.status !== 0) {
    throw new Error(`Failed to disable ssoProtection for ${projectId}`);
  }
}

function main() {
  const repoRoot = getRepoRootFromScriptUrl(import.meta.url);
  const args = parseArgs(process.argv.slice(2));
  const dryRun = Boolean(args["dry-run"]);

  const vercelProbe = spawnVercelSync(["--version"], { stdio: "ignore" });
  if (vercelProbe.error) {
    throw new Error("Vercel CLI not found. Install it with `npm i -g vercel` and run `vercel login`.");
  }

  const mobileProjectId = readProjectId(resolve(repoRoot, "apps", "mobile", ".vercel", "project.json"));
  const apiProjectId = readProjectId(resolve(repoRoot, "apps", "api", ".vercel", "project.json"));

  patchProjectSsoProtection({ projectId: mobileProjectId, dryRun });
  patchProjectSsoProtection({ projectId: apiProjectId, dryRun });

  console.log("Done.");
}

main();

