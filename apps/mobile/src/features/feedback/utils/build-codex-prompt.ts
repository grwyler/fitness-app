import type { FeedbackEntry } from "../types";

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "[]";
  }
}

function summarizeEntries(entries: FeedbackEntry[]) {
  const newest = entries[0];
  const categories = new Map<string, number>();
  const severities = new Map<string, number>();

  for (const entry of entries) {
    categories.set(entry.category, (categories.get(entry.category) ?? 0) + 1);
    severities.set(entry.severity, (severities.get(entry.severity) ?? 0) + 1);
  }

  const categorySummary = [...categories.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([category, count]) => `${category} (${count})`)
    .slice(0, 4)
    .join(", ");

  const severitySummary = [...severities.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([severity, count]) => `${severity} (${count})`)
    .slice(0, 4)
    .join(", ");

  return {
    newestSummary: newest
      ? normalizeWhitespace(
          `${newest.description} (screen=${newest.context.screenName}, route=${newest.context.routeName}, lastAction=${newest.context.lastAction ?? "n/a"})`
        )
      : null,
    categorySummary: categorySummary || null,
    severitySummary: severitySummary || null
  };
}

export function buildCodexPromptFromFeedbackEntries(entries: FeedbackEntry[]) {
  const { newestSummary, categorySummary, severitySummary } = summarizeEntries(entries);
  const json = safeJson(entries);

  const header = `You are GPT-5.2 running in the Codex CLI inside the fitness-app repo.`;
  const goal =
    `Goal: triage and address the user feedback below. If the issue is a clear workflow/UX bug and the fix is obvious and low-risk, implement the fix end-to-end (mobile + API + tests) following existing patterns. ` +
    `If it is ambiguous, high-scope, or not clearly actionable, do NOT guess—log it as a backlog item in docs/ for future work.`;

  const rules = [
    `Respect docs/ and current product constraints (MVP-safe, no big new systems).`,
    `Prefer backend as source of truth where applicable.`,
    `Add/adjust tests when changing behavior.`,
    `Update relevant docs/ (e.g., docs/PRODUCT_ROADMAP.md Feedback Loop) when logging backlog items.`
  ];

  const triage = [
    `1) Summarize the top issue(s) in 1–3 bullets.`,
    `2) Decide: FIX NOW vs BACKLOG.`,
    `3a) If FIX NOW: implement minimal change, run tests, list files changed, and give manual verification steps.`,
    `3b) If BACKLOG: add a short entry under docs/PRODUCT_ROADMAP.md -> Feedback Loop with: title, user impact, suspected area, and a suggested next step.`
  ];

  const contextLines = [
    newestSummary ? `Newest entry: ${newestSummary}` : `Newest entry: (none)`,
    categorySummary ? `Categories: ${categorySummary}` : `Categories: (none)`,
    severitySummary ? `Severities: ${severitySummary}` : `Severities: (none)`,
    `Entry count: ${entries.length}`
  ];

  return [
    header,
    "",
    goal,
    "",
    "Repo guidance:",
    ...rules.map((line) => `- ${line}`),
    "",
    "Triage workflow:",
    ...triage.map((line) => `- ${line}`),
    "",
    "Feedback context:",
    ...contextLines.map((line) => `- ${line}`),
    "",
    "Raw feedback entries (JSON):",
    "```json",
    json,
    "```"
  ].join("\n");
}

