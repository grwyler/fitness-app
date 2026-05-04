import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function fail(message) {
  const errorMessage = `[release-notes] ${message}`;
  console.error(errorMessage);
  process.exitCode = 1;
}

function normalizeVersion(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^v/i, "");
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

const packageJsonPath = path.join(repoRoot, "package.json");
const packageJson = readJson(packageJsonPath);
const currentVersion = normalizeVersion(packageJson?.version);

if (!currentVersion) {
  fail(`Unable to resolve current package version from ${packageJsonPath}.`);
} else {
  const releaseNotesPath = path.join(
    repoRoot,
    "apps",
    "mobile",
    "src",
    "core",
    "release-notes",
    "release-notes.json"
  );

  if (!fs.existsSync(releaseNotesPath)) {
    fail(`Release notes file not found: ${releaseNotesPath}`);
  } else {
    const data = readJson(releaseNotesPath);
    const releases = Array.isArray(data?.releases) ? data.releases : null;

    if (!releases) {
      fail(`Release notes file is missing a top-level "releases" array: ${releaseNotesPath}`);
    } else {
      const versions = releases.map((entry) => normalizeVersion(entry?.version)).filter(Boolean);
      const duplicates = versions.filter((value, index) => versions.indexOf(value) !== index);
      if (duplicates.length > 0) {
        fail(`Release notes contain duplicate version entries: ${Array.from(new Set(duplicates)).join(", ")}`);
      }

      const hasCurrent = releases.some((entry) => normalizeVersion(entry?.version) === currentVersion);
      if (!hasCurrent) {
        fail(`Current package version ${currentVersion} does not have a matching release notes entry.`);
      }
    }
  }
}

