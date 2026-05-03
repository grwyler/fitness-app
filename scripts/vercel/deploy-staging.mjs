import {
  commandExists,
  getRepoRootFromScriptUrl,
  parseArgs,
  readLocalVercelConfig,
  spawnVercelSync,
  resolveProjectConfig
} from "./_lib.mjs";

function deployProject({ label, scope, token, localConfig, branch, environment, domain, cwd }) {
  const pull = spawnVercelSync(
    [
      "pull",
      "--yes",
      "--environment",
      environment,
      "--git-branch",
      branch,
      ...(scope ? ["--scope", scope] : []),
      ...(token ? ["--token", token] : [])
    ],
    { encoding: "utf8", stdio: "inherit", cwd, env: { ...process.env } }
  );
  if (pull.status !== 0) {
    throw new Error(`vercel pull failed for ${label}`);
  }

  const build = spawnVercelSync(
    [
      "build",
      ...(localConfig ? ["--local-config", localConfig] : []),
      ...(scope ? ["--scope", scope] : []),
      ...(token ? ["--token", token] : [])
    ],
    { encoding: "utf8", stdio: "inherit", cwd, env: { ...process.env } }
  );
  if (build.status !== 0) {
    throw new Error(`vercel build failed for ${label}`);
  }

  const deploy = spawnVercelSync(
    [
      "deploy",
      "--prebuilt",
      "--yes",
      ...(localConfig ? ["--local-config", localConfig] : []),
      ...(scope ? ["--scope", scope] : []),
      ...(token ? ["--token", token] : [])
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], cwd, env: { ...process.env } }
  );
  if (deploy.status !== 0) {
    throw new Error(`vercel deploy failed for ${label}`);
  }

  const output = (deploy.stdout ?? "").trim().split(/\r?\n/);
  const deploymentUrl = output[output.length - 1] ?? "";
  console.log(`[${label}] deployment: ${deploymentUrl}`);

  if (domain) {
    const alias = spawnVercelSync(
      [
        "alias",
        "set",
        deploymentUrl,
        domain,
        ...(scope ? ["--scope", scope] : []),
        ...(token ? ["--token", token] : [])
      ],
      { encoding: "utf8", stdio: "inherit", cwd, env: { ...process.env } }
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

  const vercelProbe = spawnVercelSync(["--version"], { stdio: "ignore" });
  if (vercelProbe.error) {
    throw new Error("Vercel CLI not found. Install it with `npm i -g vercel` and run `vercel login`.");
  }

  const doWeb = Boolean(args.web) || Boolean(args.all) || (!args.api && !args.web);
  const doApi = Boolean(args.api) || Boolean(args.all) || (!args.api && !args.web);

  if (doWeb) {
    const domain = process.env.VERCEL_WEB_STAGING_DOMAIN ?? localVercel.VERCEL_WEB_STAGING_DOMAIN;
    const cfg = resolveProjectConfig({ repoRoot, project: "web" });
    deployProject({
      label: "web",
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
    const domain = process.env.VERCEL_API_STAGING_DOMAIN ?? localVercel.VERCEL_API_STAGING_DOMAIN;
    const cfg = resolveProjectConfig({ repoRoot, project: "api" });
    deployProject({
      label: "api",
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
