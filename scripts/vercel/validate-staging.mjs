import {
  getRepoRootFromScriptUrl,
  parseArgs,
  readLocalVercelConfig,
  spawnVercelSync,
  resolveProjectConfig
} from "./_lib.mjs";

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function parseDotEnvFile(path) {
  const contents = readFileSync(path, "utf8");
  const vars = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const idx = line.indexOf("=");
    if (idx === -1) {
      continue;
    }
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1);
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

function main() {
  const repoRoot = getRepoRootFromScriptUrl(import.meta.url);
  const args = parseArgs(process.argv.slice(2));

  const branch = typeof args.branch === "string" ? args.branch : "develop";
  const environment = typeof args.env === "string" ? args.env : "preview";

  const vercelProbe = spawnVercelSync(["--version"], { stdio: "ignore" });
  if (vercelProbe.error) {
    throw new Error("Vercel CLI not found. Install it with `npm i -g vercel` and run `vercel login`.");
  }

  const apiProject = resolveProjectConfig({ repoRoot, project: "api" });

  // Vercel CLI intentionally may redact secret values for local `env run` / `env pull` in some setups.
  // For a reliable staging validation, we validate using the same local ignored file that we push to Vercel.
  const localEnvPath = `${repoRoot}\\.env.api.staging`;
  const stagingEnv = parseDotEnvFile(localEnvPath);

  const result = spawnSync("npm", ["run", "build:vercel", "--workspace", "@fitness/api"], {
    stdio: "inherit",
    cwd: repoRoot,
    shell: true,
    env: {
      ...process.env,
      ...stagingEnv,
      NODE_ENV: "production",
      VERCEL: "1",
      VERCEL_ENV: environment,
      VERCEL_GIT_COMMIT_REF: branch
    }
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

main();
