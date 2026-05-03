import { spawnVercelSync } from "./_lib.mjs";
import {
  getRepoRootFromScriptUrl,
  looksSensitiveKey,
  parseArgs,
  readDotEnvFile,
  readLocalVercelConfig,
  requireNonEmpty,
  resolveProjectConfig
} from "./_lib.mjs";

function usageAndExit() {
  console.error(
    [
      "Usage:",
      "  node scripts/vercel/push-staging-env.mjs --project api --file .env.api.staging",
      "",
      "Defaults:",
      "- --env preview",
      "- --branch develop",
      "",
      "This script reads a local ignored env file and pushes ALL keys to Vercel as branch-specific Preview env vars."
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

  const vercelProbe = spawnVercelSync(["--version"], { stdio: "ignore" });
  if (vercelProbe.error) {
    throw new Error("Vercel CLI not found. Install it with `npm i -g vercel` and run `vercel login`.");
  }

  const projectConfig = resolveProjectConfig({ repoRoot, project });
  const file = typeof args.file === "string" ? args.file : projectConfig.envFile;
  const envVars = readDotEnvFile(file);

  const localVercel = readLocalVercelConfig(repoRoot);
  const scope = process.env.VERCEL_SCOPE ?? localVercel.VERCEL_SCOPE;
  const token = process.env.VERCEL_TOKEN ?? localVercel.VERCEL_TOKEN;

  const globalArgs = [
    ...(scope ? ["--scope", scope] : []),
    ...(token ? ["--token", token] : [])
  ];

  const keys = Object.keys(envVars).sort();
  if (keys.length === 0) {
    throw new Error(`No env vars found in ${file}`);
  }

  const disallowUsePglite = environment === "preview" && branch === "develop";
  if (disallowUsePglite && envVars.USE_PGLITE_DEV?.toLowerCase() === "true") {
    throw new Error("Refusing to push USE_PGLITE_DEV=true to preview/develop staging environment.");
  }

  for (const key of keys) {
    const value = requireNonEmpty(key, envVars[key]);
    const sensitiveArgs = looksSensitiveKey(key) ? ["--sensitive"] : [];

    // `vercel env update --sensitive` attempts to *change* sensitivity, and can fail for already-sensitive vars.
    // Updating the value should preserve existing sensitivity, so avoid `--sensitive` here.
    const updateArgs = ["env", "update", key, environment, branch, "--yes", ...globalArgs];
    const addArgs = ["env", "add", key, environment, branch, ...sensitiveArgs, ...globalArgs];

    const updateResult = spawnVercelSync(updateArgs, {
      input: value,
      encoding: "utf8",
      stdio: ["pipe", "inherit", "inherit"],
      cwd: projectConfig.cwd,
      env: { ...process.env }
    });

    if (updateResult.status === 0) {
      continue;
    }

    const addResult = spawnVercelSync(addArgs, {
      input: value,
      encoding: "utf8",
      stdio: ["pipe", "inherit", "inherit"],
      cwd: projectConfig.cwd,
      env: { ...process.env }
    });

    if (addResult.status === 0) {
      continue;
    }

    // Some Vercel env vars (notably sensitive vars like DATABASE_URL) can fail to update in-place with an API error.
    // When that happens and the var already exists, do a safe replace: remove then add.
    const rmArgs = ["env", "rm", key, environment, branch, "--yes", ...globalArgs];
    const rmResult = spawnVercelSync(rmArgs, {
      stdio: ["ignore", "inherit", "inherit"],
      cwd: projectConfig.cwd,
      env: { ...process.env }
    });

    if (rmResult.status !== 0) {
      throw new Error(`Failed to add/update ${key} for ${project} (${environment}/${branch}).`);
    }

    const addAgainResult = spawnVercelSync(addArgs, {
      input: value,
      encoding: "utf8",
      stdio: ["pipe", "inherit", "inherit"],
      cwd: projectConfig.cwd,
      env: { ...process.env }
    });

    if (addAgainResult.status !== 0) {
      throw new Error(`Failed to add/update ${key} for ${project} (${environment}/${branch}).`);
    }
  }

  console.log(`Pushed ${keys.length} env var(s) to ${project} (${environment}/${branch}).`);
}

main();
