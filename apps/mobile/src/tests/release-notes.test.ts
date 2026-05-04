import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { MobileTestCase } from "./mobile-test-case.js";
import { formatVersionLabel } from "../core/version/version-utils.js";

type ReleaseNotesData = {
  releases: Array<{ version: string; date?: string }>;
};

function readRepoRootVersion() {
  const packageJsonPath = path.resolve(process.cwd(), "..", "..", "package.json");
  const parsed = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as { version?: unknown };
  const version = parsed.version;
  if (typeof version !== "string") {
    throw new Error(`Expected package.json version to be a string at ${packageJsonPath}.`);
  }
  return version.trim();
}

function readReleaseNotes() {
  const releaseNotesPath = path.resolve(process.cwd(), "src", "core", "release-notes", "release-notes.json");
  const parsed = JSON.parse(fs.readFileSync(releaseNotesPath, "utf8")) as Partial<ReleaseNotesData>;
  if (!Array.isArray(parsed.releases)) {
    throw new Error(`Expected release notes to contain a releases array at ${releaseNotesPath}.`);
  }
  return parsed.releases;
}

function normalizeVersion(value: string) {
  return value.trim().replace(/^v/i, "");
}

function assertReleaseNotesContainVersion(version: string) {
  const normalized = normalizeVersion(version);
  const releases = readReleaseNotes();
  const hasCurrent = releases.some((entry) => normalizeVersion(entry.version) === normalized);
  if (hasCurrent) return;
  throw new Error(`Current package version ${normalized} does not have a matching release notes entry.`);
}

export const releaseNotesTestCases: MobileTestCase[] = [
  {
    name: "App version label formats as vX.Y.Z",
    run: () => {
      assert.equal(formatVersionLabel("1.2.3"), "v1.2.3");
      assert.equal(formatVersionLabel("v1.2.3"), "v1.2.3");
    }
  },
  {
    name: "Current repo version has a matching release notes entry",
    run: () => {
      const version = readRepoRootVersion();
      assertReleaseNotesContainVersion(version);
    }
  },
  {
    name: "Release notes validator throws a clear message when missing",
    run: () => {
      assert.throws(
        () => assertReleaseNotesContainVersion("999.0.0"),
        (error) => {
          assert.ok(error instanceof Error);
          assert.equal(
            error.message,
            "Current package version 999.0.0 does not have a matching release notes entry."
          );
          return true;
        }
      );
    }
  },
  {
    name: "Release notes are sortable newest-first",
    run: () => {
      const sorted = [...readReleaseNotes()].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
      assert.ok(sorted.length >= 2);
    }
  }
];
