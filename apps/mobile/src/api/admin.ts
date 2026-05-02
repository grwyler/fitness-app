import { apiRequest } from "./client";
import type { FeedbackEntry } from "../features/feedback/types";

export type AdminFeedbackEntry = FeedbackEntry & {
  updatedAt: string;
  reporter: {
    userId: string;
    email: string | null;
  };
};

export async function listAdminFeedbackEntries() {
  return apiRequest<AdminFeedbackEntry[]>("/admin/feedback");
}

export async function updateAdminFeedbackEntry(
  entryId: string,
  patch: Partial<Pick<FeedbackEntry, "description" | "category" | "severity" | "priority">>
) {
  return apiRequest<FeedbackEntry>(`/admin/feedback/${encodeURIComponent(entryId)}`, {
    method: "PUT",
    body: patch
  });
}

export async function deleteAdminFeedbackEntry(entryId: string) {
  return apiRequest<{ id: string }>(`/admin/feedback/${encodeURIComponent(entryId)}`, {
    method: "DELETE"
  });
}

export async function seedTestAccount(email: string) {
  return apiRequest<{ user: { id: string; email: string; role: "user" | "admin" } }>(
    "/admin/test-tools/seed-test-account",
    {
      method: "POST",
      body: { email }
    }
  );
}

export async function resetUserData(email: string) {
  return apiRequest<{
    deleted: Record<string, number>;
    email: string;
    reset: Record<string, number>;
    success: true;
  }>("/admin/test-tools/reset-user-data", {
    method: "POST",
    body: { email }
  });
}

