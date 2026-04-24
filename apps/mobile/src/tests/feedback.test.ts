import assert from "node:assert/strict";
import { buildFeedbackContext } from "../features/feedback/utils/build-feedback-context";
import { createFeedbackStorage } from "../features/feedback/storage/feedback-storage";
import { createFeedbackEntry } from "../features/feedback/types";
import type { MobileTestCase } from "./mobile-test-case";

export const feedbackTestCases: MobileTestCase[] = [
  {
    name: "Feedback entries capture draft and context fields",
    run: () => {
      const entry = createFeedbackEntry({
        draft: {
          description: "  Button label is unclear  ",
          category: "Confusing",
          severity: "Low"
        },
        context: {
          screenName: "Dashboard",
          routeName: "Dashboard",
          timestamp: "2026-04-24T10:15:30.000Z",
          platform: "ios",
          workoutSessionId: null,
          appVersion: "0.1.0",
          lastAction: "opened_dashboard"
        },
        id: "feedback-1"
      });

      assert.equal(entry.id, "feedback-1");
      assert.equal(entry.createdAt, "2026-04-24T10:15:30.000Z");
      assert.equal(entry.description, "Button label is unclear");
      assert.equal(entry.category, "Confusing");
      assert.equal(entry.severity, "Low");
      assert.equal(entry.context.lastAction, "opened_dashboard");
    }
  },
  {
    name: "Feedback context builder attaches app metadata",
    run: () => {
      const context = buildFeedbackContext({
        screenName: "ActiveWorkoutScreen",
        routeName: "ActiveWorkout",
        workoutSessionId: "session-123",
        appVersion: "0.1.0",
        lastAction: "logged_set",
        now: new Date("2026-04-24T12:00:00.000Z")
      });

      assert.equal(context.screenName, "ActiveWorkoutScreen");
      assert.equal(context.routeName, "ActiveWorkout");
      assert.equal(context.workoutSessionId, "session-123");
      assert.equal(context.appVersion, "0.1.0");
      assert.equal(context.lastAction, "logged_set");
      assert.equal(context.timestamp, "2026-04-24T12:00:00.000Z");
      assert.ok(context.platform.length > 0);
    }
  },
  {
    name: "Feedback storage accumulates entries in reverse chronological order",
    run: async () => {
      const memoryStore = new Map<string, string>();
      const storage = createFeedbackStorage({
        async getItem(key) {
          return memoryStore.get(key) ?? null;
        },
        async setItem(key, value) {
          memoryStore.set(key, value);
        }
      });

      await storage.saveEntry(
        createFeedbackEntry({
          id: "entry-1",
          draft: {
            description: "First item",
            category: "Bug",
            severity: "Medium"
          },
          context: {
            screenName: "Dashboard",
            routeName: "Dashboard",
            timestamp: "2026-04-24T08:00:00.000Z",
            platform: "ios",
            workoutSessionId: null,
            appVersion: "0.1.0"
          }
        })
      );

      await storage.saveEntry(
        createFeedbackEntry({
          id: "entry-2",
          draft: {
            description: "Second item",
            category: "Idea",
            severity: "Low"
          },
          context: {
            screenName: "WorkoutSummaryScreen",
            routeName: "WorkoutSummary",
            timestamp: "2026-04-24T09:00:00.000Z",
            platform: "android",
            workoutSessionId: "session-1",
            appVersion: "0.1.0"
          }
        })
      );

      const entries = await storage.listEntries();
      assert.deepEqual(entries.map((entry) => entry.id), ["entry-2", "entry-1"]);

      const exported = await storage.exportEntries();
      assert.match(exported, /"entry-2"/);
      assert.match(exported, /"entry-1"/);
    }
  }
];
