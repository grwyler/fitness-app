import { getRepoRootFromScriptUrl, parseArgs, readLocalVercelConfig, requireNonEmpty } from "./_lib.mjs";
import { loadVercelApiConfig, vercelApiFetch } from "./vercel-api.mjs";

function usageAndExit() {
  console.error(
    [
      "Usage:",
      "  node scripts/vercel/set-branch-domain.mjs --project-id prj_... --domain api-test.example.com --branch develop",
      "",
      "Notes:",
      "- This uses the Vercel REST API PATCH endpoint to set a domain's gitBranch association.",
      "- Per Vercel docs, branch-configured domains are automatically applied when using the Git Integration.",
      "- For CLI-based deployments, prefer `vercel alias set` (see `deploy-staging.mjs`)."
    ].join("\n")
  );
  process.exit(1);
}

async function main() {
  const repoRoot = getRepoRootFromScriptUrl(import.meta.url);
  const args = parseArgs(process.argv.slice(2));

  const local = readLocalVercelConfig(repoRoot);
  const token = process.env.VERCEL_TOKEN ?? local.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID ?? local.VERCEL_TEAM_ID;

  const projectId = typeof args["project-id"] === "string" ? args["project-id"] : null;
  const domain = typeof args.domain === "string" ? args.domain : null;
  const branch = typeof args.branch === "string" ? args.branch : "develop";
  const dryRun = Boolean(args["dry-run"]);

  if (!projectId || !domain) {
    usageAndExit();
  }

  const { token: resolvedToken } = loadVercelApiConfig({ repoRoot, overrides: { VERCEL_TOKEN: token } });
  requireNonEmpty("VERCEL_TOKEN", resolvedToken);

  const path = `/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}`;
  const body = { gitBranch: branch };

  if (dryRun) {
    console.log(`[dry-run] PATCH ${path} ${JSON.stringify(body)}`);
    return;
  }

  await vercelApiFetch({
    token: resolvedToken,
    teamId,
    method: "PATCH",
    path,
    body
  });

  console.log(`Updated domain ${domain} -> gitBranch=${branch}`);
}

await main();

