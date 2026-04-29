import { useEffect, useState } from "react";
import { Alert, Share, StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { feedbackStorage } from "../features/feedback/storage/feedback-storage";
import type { FeedbackEntry } from "../features/feedback/types";
import { colors, spacing } from "../theme/tokens";

export function FeedbackDebugScreen() {
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadEntries();
  }, []);

  async function loadEntries() {
    setLoading(true);

    try {
      const nextEntries = await feedbackStorage.listEntries();
      setEntries(nextEntries);
    } catch (error) {
      console.error("Unable to load feedback entries", error);
      Alert.alert("Feedback unavailable", "Saved feedback could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    try {
      const payload = await feedbackStorage.exportEntries();
      await Share.share({
        message: payload
      });
    } catch (error) {
      console.error("Unable to export feedback entries", error);
      Alert.alert("Export failed", "Saved feedback could not be exported.");
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Saved feedback</Text>
        <Text style={styles.subtitle}>
          {loading ? "Loading feedback..." : `${entries.length} entr${entries.length === 1 ? "y" : "ies"} saved locally`}
        </Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Refresh" onPress={() => void loadEntries()} tone="secondary" loading={loading} />
        <PrimaryButton label="Export JSON" onPress={() => void handleExport()} disabled={loading || entries.length === 0} />
      </View>

      <View style={styles.card}>
        <Text selectable style={styles.json}>
          {entries.length === 0
            ? "No feedback has been saved yet."
            : JSON.stringify(entries, null, 2)}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "600"
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.lg
  },
  json: {
    color: colors.textSecondary,
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 20
  }
});
