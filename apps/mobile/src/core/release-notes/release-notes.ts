import type { ReleaseNotesData, ReleaseNotesEntry } from "./release-notes-types";

const data = require("./release-notes.json") as ReleaseNotesData;

export const releaseNotes: ReleaseNotesEntry[] = Array.isArray(data.releases) ? data.releases : [];

function parseSemverParts(version: string) {
  const cleaned = version.trim().replace(/^v/i, "");
  const main = cleaned.split("-")[0] ?? cleaned;
  const [major, minor, patch] = main.split(".").map((part) => Number(part));
  return {
    major: Number.isFinite(major) ? major : 0,
    minor: Number.isFinite(minor) ? minor : 0,
    patch: Number.isFinite(patch) ? patch : 0
  };
}

function compareSemverDesc(a: string, b: string) {
  const left = parseSemverParts(a);
  const right = parseSemverParts(b);
  if (left.major !== right.major) return right.major - left.major;
  if (left.minor !== right.minor) return right.minor - left.minor;
  if (left.patch !== right.patch) return right.patch - left.patch;
  return 0;
}

export function sortReleaseNotesNewestFirst(input: ReleaseNotesEntry[]) {
  return [...input].sort((a, b) => {
    if (a.date && b.date) {
      const dateComparison = b.date.localeCompare(a.date);
      if (dateComparison !== 0) return dateComparison;
    }
    return compareSemverDesc(a.version, b.version);
  });
}

export function getReleaseNotesForVersion(version: string) {
  const trimmed = version.trim().replace(/^v/i, "");
  return releaseNotes.find((entry) => entry.version.trim().replace(/^v/i, "") === trimmed) ?? null;
}

export function assertReleaseNotesContainVersion(version: string) {
  const found = getReleaseNotesForVersion(version);
  if (found) return;
  throw new Error(`Current package version ${version} does not have a matching release notes entry.`);
}

