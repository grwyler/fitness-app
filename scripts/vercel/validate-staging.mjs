import {
  commandExists,
  getRepoRootFromScriptUrl,
  parseArgs,
  readLocalVercelConfig,
  spawnVercelSync,
  resolveProjectConfig
} from "./_lib.mjs";

function main() {
  const repoRoot = getRepoRootFromScriptUrl(import.meta.url);
  const args = parseArgs(process.argv.slice(2));

  const branch = typeof args.branch === "string" ? args.branch : "develop";
  const environment = typeof args.env === "string" ? args.env : "preview";

  const vercelProbe = spawnVercelSync(["--version"], { stdio: "ignore" });
  if (vercelProbe.error) {
    throw new Error("Vercel CLI not found. Install it with `npm i -g vercel` and run `vercel login`.");
  }

  const localVercel = readLocalVercelConfig(repoRoot);
  const scope = process.env.VERCEL_SCOPE ?? localVercel.VERCEL_SCOPE;
  const token = process.env.VERCEL_TOKEN ?? localVercel.VERCEL_TOKEN;
  const apiProject = resolveProjectConfig({ repoRoot, project: "api" });

  const bootstrap = [
    "process.env.VERCEL='1';",
    `process.env.VERCEL_ENV=${JSON.stringify(environment)};`,
    `process.env.VERCEL_GIT_COMMIT_REF=${JSON.stringify(branch)};`,
    "const { spawnSync } = require('child_process');",
    "const r = spawnSync('npm', ['run','build:vercel'], { stdio: 'inherit', shell: true });",
    "process.exit(typeof r.status === 'number' ? r.status : 1);"
  ].join("");

  const result = spawnVercelSync(
    [
      "env",
      "run",
      "-e",
      environment,
      "--git-branch",
      branch,
      ...(scope ? ["--scope", scope] : []),
      ...(token ? ["--token", token] : []),
      "--",
      "node",
      "-e",
      bootstrap
    ],
    { encoding: "utf8", stdio: "inherit", cwd: apiProject.cwd, env: { ...process.env } }
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

main();
