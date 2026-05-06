import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function fail(message) {
  console.error(`[release] ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalizeVersion(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^v/i, "");
}

function parseSemver(version) {
  const cleaned = normalizeVersion(version);
  const match = cleaned.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3])
  };
}

function formatSemver(v) {
  return `${v.major}.${v.minor}.${v.patch}`;
}

function bumpSemver(current, bumpType) {
  const parsed = parseSemver(current);
  if (!parsed) {
    fail(`Unsupported version format "${current}". Expected X.Y.Z (semver).`);
  }

  if (bumpType === "major") {
    return formatSemver({ major: parsed.major + 1, minor: 0, patch: 0 });
  }
  if (bumpType === "minor") {
    return formatSemver({ major: parsed.major, minor: parsed.minor + 1, patch: 0 });
  }
  if (bumpType === "patch") {
    return formatSemver({ major: parsed.major, minor: parsed.minor, patch: parsed.patch + 1 });
  }

  fail(`Unknown bump type "${bumpType}". Use: patch | minor | major`);
}

function stripConventionalPrefix(subject) {
  const trimmed = String(subject ?? "").trim();
  const match = trimmed.match(/^(?<type>[a-z]+)(\([^)]+\))?!?:\s*(?<rest>.+)$/i);
  if (!match?.groups?.type || !match.groups.rest) return null;
  return {
    type: match.groups.type.toLowerCase(),
    rest: match.groups.rest.trim()
  };
}

function categorizeSubject(subject) {
  const parsed = stripConventionalPrefix(subject);
  if (!parsed) return null;

  if (parsed.type === "feat") return { section: "Added", text: parsed.rest };
  if (parsed.type === "fix") return { section: "Fixed", text: parsed.rest };
  if (["refactor", "perf"].includes(parsed.type)) return { section: "Changed", text: parsed.rest };
  if (["docs", "chore", "build", "ci", "test", "style"].includes(parsed.type)) return { section: "Changed", text: parsed.rest };

  return null;
}

function isNoiseSubject(subject) {
  const trimmed = String(subject ?? "").trim();
  if (!trimmed) return true;

  if (/^merge(\s|:)/i.test(trimmed)) return true;
  if (/^revert(\s|:)/i.test(trimmed)) return false;

  const conventional = stripConventionalPrefix(trimmed);
  if (conventional?.type === "chore" && /^release(\s|:)/i.test(conventional.rest)) return true;
  if (conventional?.type === "chore" && /^v?\d+\.\d+\.\d+(\s|$)/i.test(conventional.rest)) return true;
  if (conventional?.type === "chore" && /\brelease notes\b/i.test(conventional.rest)) return true;

  return false;
}

function uniquePreserveOrder(items) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const key = String(item ?? "").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(key);
  }
  return output;
}

function draftReleaseNotesFromSubjects(subjects) {
  const drafted = {
    Added: [],
    Changed: [],
    Fixed: []
  };

  for (const subject of subjects) {
    if (isNoiseSubject(subject)) continue;

    const categorized = categorizeSubject(subject);
    if (categorized) {
      drafted[categorized.section]?.push(categorized.text);
      continue;
    }

    drafted.Changed.push(String(subject).trim());
  }

  drafted.Added = uniquePreserveOrder(drafted.Added).slice(0, 10);
  drafted.Changed = uniquePreserveOrder(drafted.Changed).slice(0, 10);
  drafted.Fixed = uniquePreserveOrder(drafted.Fixed).slice(0, 10);

  return drafted;
}

function gitTagExists(tag) {
  try {
    execFileSync("git", ["rev-parse", "-q", "--verify", `refs/tags/${tag}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function readGitSubjectsSinceTag(tag) {
  const args = tag ? ["log", `${tag}..HEAD`, "--pretty=format:%s"] : ["log", "-n", "50", "--pretty=format:%s"];
  const raw = execFileSync("git", args, { encoding: "utf8" });
  return raw
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
}

const bumpType = process.argv[2];
const draftNotesEnabled = !process.argv.includes("--no-draft");
if (!bumpType || bumpType === "--help" || bumpType === "-h") {
  console.log("Usage: node scripts/release.mjs patch|minor|major");
  console.log("");
  console.log("Updates:");
  console.log("- repo root package.json version");
  console.log("- apps/mobile/src/core/release-notes/release-notes.json (prepends a new entry)");
  console.log("- CHANGELOG.md (regenerated)");
  console.log("");
  console.log("Options:");
  console.log("- --no-draft: do not auto-draft What's New entries from git history");
  process.exit(bumpType ? 0 : 1);
}

const packageJsonPath = path.join(repoRoot, "package.json");
const releaseNotesPath = path.join(
  repoRoot,
  "apps",
  "mobile",
  "src",
  "core",
  "release-notes",
  "release-notes.json"
);

const packageJson = readJson(packageJsonPath);
const currentVersion = normalizeVersion(packageJson?.version);
if (!currentVersion) {
  fail(`Unable to resolve current version from ${packageJsonPath}.`);
}

const nextVersion = bumpSemver(currentVersion, bumpType);

const releaseNotesJson = readJson(releaseNotesPath);
const releases = Array.isArray(releaseNotesJson?.releases) ? releaseNotesJson.releases : null;
if (!releases) {
  fail(`Release notes file is missing a top-level "releases" array: ${releaseNotesPath}`);
}

if (releases.some((entry) => normalizeVersion(entry?.version) === nextVersion)) {
  fail(`Release notes already contain version ${nextVersion}.`);
}

const today = new Date().toISOString().slice(0, 10);

let drafted = {
  Added: [],
  Changed: [],
  Fixed: []
};

if (draftNotesEnabled) {
  const previousTag = gitTagExists(`v${currentVersion}`) ? `v${currentVersion}` : gitTagExists(currentVersion) ? currentVersion : null;
  try {
    const subjects = readGitSubjectsSinceTag(previousTag);
    drafted = draftReleaseNotesFromSubjects(subjects);
  } catch {
    // Best-effort: release notes can still be edited manually.
  }
}

const sections = [];
if (drafted.Added.length > 0) sections.push({ title: "Added", items: drafted.Added });
if (drafted.Changed.length > 0) sections.push({ title: "Changed", items: drafted.Changed });
if (drafted.Fixed.length > 0) sections.push({ title: "Fixed", items: drafted.Fixed });
if (sections.length === 0) {
  sections.push({ title: "Changed", items: ["Internal improvements and fixes."] });
}

releaseNotesJson.releases = [
  {
    version: nextVersion,
    date: today,
    sections
  },
  ...releases
];

packageJson.version = nextVersion;

writeJson(packageJsonPath, packageJson);

const packageLockPath = path.join(repoRoot, "package-lock.json");
if (fs.existsSync(packageLockPath)) {
  try {
    const packageLock = readJson(packageLockPath);
    if (packageLock && typeof packageLock === "object") {
      if (typeof packageLock.version === "string") {
        packageLock.version = nextVersion;
      }

      if (packageLock.packages && typeof packageLock.packages === "object" && packageLock.packages[""]) {
        const rootPackage = packageLock.packages[""];
        if (rootPackage && typeof rootPackage === "object" && typeof rootPackage.version === "string") {
          rootPackage.version = nextVersion;
        }
      }
    }
    writeJson(packageLockPath, packageLock);
  } catch (error) {
    fail(`Failed to update package-lock.json: ${error instanceof Error ? error.message : String(error)}`);
  }
}

writeJson(releaseNotesPath, releaseNotesJson);

try {
  await import("./generate-changelog.mjs");
} catch (error) {
  fail(`Failed to regenerate CHANGELOG.md: ${error instanceof Error ? error.message : String(error)}`);
}

console.log(`[release] Updated version ${currentVersion} -> ${nextVersion}`);
console.log(`[release] Added release notes entry for ${nextVersion} (${today})`);
