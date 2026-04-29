import type { FeedbackEntry } from "../types";

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

function formatEntrySummary(entry: FeedbackEntry) {
  const ctx = entry.context;
  return [
    `Description: ${entry.description}`,
    `Category: ${entry.category}`,
    `Severity: ${entry.severity}`,
    `Priority: ${entry.priority ?? "P2"}`,
    `Created: ${entry.createdAt}`,
    `Screen: ${ctx.screenName}`,
    `Route: ${ctx.routeName}`,
    `Platform: ${ctx.platform}`,
    `App version: ${ctx.appVersion ?? "n/a"}`,
    `Workout session: ${ctx.workoutSessionId ?? "n/a"}`,
    `Last action: ${ctx.lastAction ?? "n/a"}`
  ].join("\n");
}

export function buildCodexPromptFromFeedbackEntry(entry: FeedbackEntry) {
  const goal =
    `Goal: triage and address the user feedback below. If the issue is a clear workflow/UX bug and the fix is obvious and low-risk, implement the fix end-to-end (mobile + API + tests) following existing patterns. ` +
    `If it is ambiguous, high-scope, or not clearly actionable, do not guess—log it as a backlog item in docs/ for future work.`;

  const repoGuidance = [
    `Respect current product constraints (MVP-safe, no big new systems).`,
    `Add/adjust tests when changing behavior.`,
    `Update relevant docs/ when logging backlog items.`
  ];

  const triageWorkflow = [
    `1) Summarize the issue in 1–3 bullets.`,
    `2) Decide: FIX NOW vs BACKLOG.`,
    `3a) If FIX NOW: implement minimal change, run tests, list files changed, and give manual verification steps.`,
    `3b) If BACKLOG: add a short entry under docs/ with: title, user impact, suspected area, and a suggested next step.`
  ];

  return [
    `You are an AI coding agent running in the Codex CLI inside the fitness-app repo.`,
    "",
    goal,
    "",
    "Repo guidance:",
    ...repoGuidance.map((line) => `- ${line}`),
    "",
    "Triage workflow:",
    ...triageWorkflow.map((line) => `- ${line}`),
    "",
    "Feedback entry:",
    "```",
    formatEntrySummary(entry),
    "```",
    "",
    "Raw feedback entry (JSON):",
    "```json",
    safeJson(entry),
    "```"
  ].join("\n");
}

export function buildCodexPromptFromFeedbackEntries(entries: FeedbackEntry[]) {
  if (entries.length === 1) {
    return buildCodexPromptFromFeedbackEntry(entries[0]);
  }

  const header = `You are an AI coding agent running in the Codex CLI inside the fitness-app repo.`;
  const goal =
    `Goal: triage and address the user feedback below. Prefer fixing the highest-priority, most actionable items first. ` +
    `If an item is ambiguous or high-scope, do not guess—log it as a backlog item in docs/ for future work.`;

  return [
    header,
    "",
    goal,
    "",
    `Entry count: ${entries.length}`,
    "",
    "Raw feedback entries (JSON):",
    "```json",
    safeJson(entries),
    "```"
  ].join("\n");
}

