import { apiRequest } from "./client";
import type { FeedbackEntry } from "../features/feedback/types";

export async function submitFeedbackEntry(entry: FeedbackEntry) {
  return apiRequest<FeedbackEntry>("/feedback", {
    method: "POST",
    body: entry,
    idempotencyKey: entry.id
  });
}

export async function listFeedbackEntries() {
  return apiRequest<FeedbackEntry[]>("/feedback");
}

export async function updateFeedbackEntry(
  entryId: string,
  patch: Partial<Pick<FeedbackEntry, "description" | "category" | "severity" | "priority">>
) {
  return apiRequest<FeedbackEntry>(`/feedback/${encodeURIComponent(entryId)}`, {
    method: "PUT",
    body: patch
  });
}

export async function deleteFeedbackEntry(entryId: string) {
  return apiRequest<{ id: string }>(`/feedback/${encodeURIComponent(entryId)}`, {
    method: "DELETE"
  });
}
