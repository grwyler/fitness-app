import fs from "node:fs";
import path from "node:path";
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

const bumpType = process.argv[2];
if (!bumpType || bumpType === "--help" || bumpType === "-h") {
  console.log("Usage: node scripts/release.mjs patch|minor|major");
  console.log("");
  console.log("Updates:");
  console.log("- repo root package.json version");
  console.log("- apps/mobile/src/core/release-notes/release-notes.json (prepends a stub entry)");
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

releaseNotesJson.releases = [
  {
    version: nextVersion,
    date: today,
    sections: [
      { title: "Added", items: [] },
      { title: "Changed", items: [] },
      { title: "Fixed", items: [] }
    ]
  },
  ...releases
];

packageJson.version = nextVersion;

writeJson(packageJsonPath, packageJson);
writeJson(releaseNotesPath, releaseNotesJson);

console.log(`[release] Updated version ${currentVersion} -> ${nextVersion}`);
console.log(`[release] Added release notes stub for ${nextVersion} (${today})`);
