import { commandExists, getRepoRootFromScriptUrl, parseArgs, runCapture } from "../vercel/_lib.mjs";

function usageAndExit() {
  console.error(
    [
      "Usage:",
      "  node scripts/github/protect-branches.mjs",
      "",
      "Optional:",
      "  --protect-develop",
      "  --required-check \"<check name>\"   (repeatable)",
      "  --dry-run"
    ].join("\n")
  );
  process.exit(1);
}

function parseGitHubRepo(remoteUrl) {
  const trimmed = remoteUrl.trim();
  if (!trimmed) {
    return null;
  }
  // Supports:
  // - https://github.com/owner/repo.git
  // - git@github.com:owner/repo.git
  const httpsMatch = trimmed.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }
  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }
  return null;
}

function ensureDevelopBranch(repoRoot) {
  const developExists = ok(() => runCapture("git", ["show-ref", "--verify", "--quiet", "refs/heads/develop"], { cwd: repoRoot }));
  if (!developExists) {
    runCapture("git", ["checkout", "main"], { cwd: repoRoot });
    runCapture("git", ["checkout", "-b", "develop"], { cwd: repoRoot });
    runCapture("git", ["checkout", "main"], { cwd: repoRoot });
  }

  const remoteHasDevelop = ok(() => runCapture("git", ["ls-remote", "--exit-code", "--heads", "origin", "develop"], { cwd: repoRoot }));
  if (!remoteHasDevelop) {
    runCapture("git", ["push", "-u", "origin", "develop"], { cwd: repoRoot });
  }
}

function ok(fn) {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

function buildProtectionPayload({ requiredChecks }) {
  // Note: required_status_checks contexts must match *PR* check names.
  // If you don't have a PR-check workflow yet, keep required_status_checks null.
  return {
    required_status_checks: requiredChecks.length > 0 ? { strict: true, contexts: requiredChecks } : null,
    enforce_admins: false,
    required_pull_request_reviews: {
      required_approving_review_count: 1,
      dismiss_stale_reviews: true,
      require_code_owner_reviews: false
    },
    restrictions: null,
    required_linear_history: true,
    allow_force_pushes: false,
    allow_deletions: false,
    required_conversation_resolution: true
  };
}

function main() {
  const repoRoot = getRepoRootFromScriptUrl(import.meta.url);
  const args = parseArgs(process.argv.slice(2));

  if (!commandExists("gh")) {
    throw new Error("GitHub CLI (gh) not found. Install it and run `gh auth login`.");
  }

  const dryRun = Boolean(args["dry-run"]);
  const protectDevelop = Boolean(args["protect-develop"]);
  const requiredCheckRaw = args["required-check"];
  const requiredChecks = Array.isArray(requiredCheckRaw)
    ? requiredCheckRaw
    : typeof requiredCheckRaw === "string"
      ? [requiredCheckRaw]
      : [];

  const remote = runCapture("git", ["remote", "get-url", "origin"], { cwd: repoRoot }).stdout.trim();
  const parsed = parseGitHubRepo(remote);
  if (!parsed) {
    throw new Error(`Unsupported origin remote (expected GitHub): ${remote}`);
  }

  ensureDevelopBranch(repoRoot);

  const protection = buildProtectionPayload({ requiredChecks });

  const branches = ["main", ...(protectDevelop ? ["develop"] : [])];
  for (const branch of branches) {
    const endpoint = `repos/${parsed.owner}/${parsed.repo}/branches/${branch}/protection`;
    if (dryRun) {
      console.log(`[dry-run] gh api --method PUT ${endpoint} --input <payload>`);
      continue;
    }

    runCapture(
      "gh",
      [
        "api",
        "--method",
        "PUT",
        "-H",
        "Accept: application/vnd.github+json",
        endpoint,
        "--input",
        "-"
      ],
      {
        cwd: repoRoot,
        input: JSON.stringify(protection)
      }
    );

    console.log(`Protected branch: ${branch}`);
  }

  if (requiredChecks.length === 0) {
    console.log("Note: no --required-check provided, so required status checks were not enforced.");
  }
}

main();

