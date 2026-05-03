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

export type AdminUserSummary = {
  id: string;
  email: string;
  role: "user" | "admin";
  trainingGoal: string | null;
  experienceLevel: string | null;
  unitSystem: "imperial" | "metric";
  createdAt: string;
  updatedAt: string;
  workoutCount: number;
  lastWorkoutAt: string | null;
};

export type AdminUsersMeta = {
  limit: number;
  offset: number;
  nextOffset: number | null;
};

export async function listAdminUsers(options?: {
  limit?: number;
  offset?: number;
  search?: string;
  role?: "user" | "admin";
}) {
  const params = new URLSearchParams();
  if (options?.limit !== undefined) params.set("limit", String(options.limit));
  if (options?.offset !== undefined) params.set("offset", String(options.offset));
  if (options?.search) params.set("search", options.search);
  if (options?.role) params.set("role", options.role);

  const suffix = params.toString();
  const path = suffix ? `/admin/users?${suffix}` : "/admin/users";
  return apiRequest<AdminUserSummary[], AdminUsersMeta>(path);
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
