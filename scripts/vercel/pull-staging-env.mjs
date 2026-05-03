import {
  getRepoRootFromScriptUrl,
  parseArgs,
  readLocalVercelConfig,
  spawnVercelSync,
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

  const vercelProbe = spawnVercelSync(["--version"], { stdio: "ignore" });
  if (vercelProbe.error) {
    throw new Error("Vercel CLI not found. Install it with `npm i -g vercel` and run `vercel login`.");
  }

  const projectConfig = resolveProjectConfig({ repoRoot, project });
  const localVercel = readLocalVercelConfig(repoRoot);
  const scope = process.env.VERCEL_SCOPE ?? localVercel.VERCEL_SCOPE;
  const token = process.env.VERCEL_TOKEN ?? localVercel.VERCEL_TOKEN;

  const result = spawnVercelSync(
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
      ...(token ? ["--token", token] : [])
    ],
    { encoding: "utf8", stdio: "inherit", cwd: projectConfig.cwd, env: { ...process.env } }
  );

  if (result.status !== 0) {
    throw new Error(`Failed to pull ${project} env vars.`);
  }
}

main();
