import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function fail(message) {
  const errorMessage = `[changelog] ${message}`;
  console.error(errorMessage);
  process.exitCode = 1;
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function normalizeVersion(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^v/i, "");
}

function formatVersionLabel(version) {
  const cleaned = normalizeVersion(version);
  return cleaned ? `v${cleaned}` : "v0.0.0";
}

function escapeMarkdown(value) {
  return String(value).replace(/\r?\n/g, " ").trim();
}

function renderChangelog(releases) {
  const lines = [];
  lines.push("# Changelog");
  lines.push("");
  lines.push("All notable changes to this project are documented here.");
  lines.push("");

  for (const release of releases) {
    const versionLabel = formatVersionLabel(release.version);
    const date = typeof release.date === "string" && release.date.trim() ? release.date.trim() : null;
    lines.push(`## ${versionLabel}${date ? ` (${date})` : ""}`);
    lines.push("");

    const sections = Array.isArray(release.sections) ? release.sections : [];
    for (const section of sections) {
      if (!section?.title) continue;
      const items = Array.isArray(section.items) ? section.items : [];
      if (items.length === 0) continue;

      lines.push(`### ${escapeMarkdown(section.title)}`);
      lines.push("");
      for (const item of items) {
        const text = escapeMarkdown(item);
        if (!text) continue;
        lines.push(`- ${text}`);
      }
      lines.push("");
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

const checkOnly = process.argv.includes("--check");

const releaseNotesPath = path.join(
  repoRoot,
  "apps",
  "mobile",
  "src",
  "core",
  "release-notes",
  "release-notes.json"
);
const changelogPath = path.join(repoRoot, "CHANGELOG.md");

const data = readJson(releaseNotesPath);
const releases = Array.isArray(data?.releases) ? data.releases : null;
if (!releases) {
  fail(`Release notes file is missing a top-level "releases" array: ${releaseNotesPath}`);
} else {
  const expected = renderChangelog(releases);
  const current = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, "utf8") : "";

  if (checkOnly) {
    if (current !== expected) {
      fail(`CHANGELOG.md is out of date. Run: npm run generate:changelog`);
    }
  } else {
    fs.writeFileSync(changelogPath, expected, "utf8");
    console.log(`[changelog] Updated ${path.relative(repoRoot, changelogPath)}`);
  }
}

