import type { FeedbackEntry } from "../types";

export type FeedbackStorageAdapter = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

const FEEDBACK_STORAGE_KEY = "fitness-app:feedback-entries";

export function createFeedbackStorage(storage: FeedbackStorageAdapter) {
  return {
    async listEntries() {
      const rawValue = await storage.getItem(FEEDBACK_STORAGE_KEY);
      if (!rawValue) {
        return [] as FeedbackEntry[];
      }

      try {
        const parsed = JSON.parse(rawValue) as FeedbackEntry[];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    async saveEntry(entry: FeedbackEntry) {
      const entries = await this.listEntries();
      const nextEntries = [entry, ...entries];
      await storage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(nextEntries));
      return nextEntries;
    },
    async exportEntries() {
      const entries = await this.listEntries();
      return JSON.stringify(entries, null, 2);
    }
  };
}

function resolveAsyncStorage(): FeedbackStorageAdapter {
  const asyncStorageModule = require("@react-native-async-storage/async-storage") as {
    default: FeedbackStorageAdapter;
  };
  return asyncStorageModule.default;
}

export const feedbackStorage = createFeedbackStorage({
  async getItem(key) {
    return resolveAsyncStorage().getItem(key);
  },
  async setItem(key, value) {
    await resolveAsyncStorage().setItem(key, value);
  }
});
