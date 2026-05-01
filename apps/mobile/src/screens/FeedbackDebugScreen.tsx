import { useEffect, useState } from "react";
import { Alert, Platform, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { deleteFeedbackEntry, listFeedbackEntries, submitFeedbackEntry, updateFeedbackEntry } from "../api/feedback";
import { feedbackStorage as legacyFeedbackStorage } from "../features/feedback/storage/feedback-storage";
import { feedbackCategories, feedbackPriorities, feedbackSeverities, type FeedbackEntry, type FeedbackPriority } from "../features/feedback/types";
import { buildCodexPromptFromFeedbackEntry } from "../features/feedback/utils/build-codex-prompt";
import { colors, spacing } from "../theme/tokens";

type SortMode = "Newest" | "Oldest" | "Priority";

const sortModes: SortMode[] = ["Newest", "Priority", "Oldest"];

function coercePriority(value: FeedbackPriority | undefined): FeedbackPriority {
  return value ?? "P2";
}

function priorityRank(priority: FeedbackPriority) {
  return feedbackPriorities.indexOf(priority);
}

export function FeedbackDebugScreen() {
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilterIndex, setCategoryFilterIndex] = useState(-1);
  const [severityFilterIndex, setSeverityFilterIndex] = useState(-1);
  const [priorityFilterIndex, setPriorityFilterIndex] = useState(-1);
  const [sortModeIndex, setSortModeIndex] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editCategoryIndex, setEditCategoryIndex] = useState(0);
  const [editSeverityIndex, setEditSeverityIndex] = useState(0);
  const [editPriority, setEditPriority] = useState<FeedbackPriority>("P2");

  useEffect(() => {
    void loadEntries();
  }, []);

  async function loadEntries() {
    setLoading(true);

    try {
      let serverEntries = (await listFeedbackEntries()).data;

      try {
        const legacyEntries = await legacyFeedbackStorage.listEntries();
        const serverIds = new Set(serverEntries.map((entry) => entry.id));
        const legacyToUpload = legacyEntries.filter((entry) => !serverIds.has(entry.id));

        if (legacyToUpload.length > 0) {
          const results = await Promise.allSettled(
            legacyToUpload.map((entry) => submitFeedbackEntry(entry))
          );

          const uploadedIds = legacyToUpload
            .filter((_, index) => results[index]?.status === "fulfilled")
            .map((entry) => entry.id);

          if (uploadedIds.length > 0) {
            await legacyFeedbackStorage.replaceEntries(
              legacyEntries.filter((entry) => !uploadedIds.includes(entry.id))
            );
            serverEntries = (await listFeedbackEntries()).data;
          }
        }
      } catch (error) {
        console.warn("Unable to upload legacy locally saved feedback entries", error);
      }

      setEntries(serverEntries);
    } catch (error) {
      console.error("Unable to load feedback entries", error);
      Alert.alert("Feedback unavailable", "Saved feedback could not be loaded from the server.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(entry: FeedbackEntry) {
    setEditingId(entry.id);
    setEditDescription(entry.description);
    setEditCategoryIndex(Math.max(0, feedbackCategories.indexOf(entry.category)));
    setEditSeverityIndex(Math.max(0, feedbackSeverities.indexOf(entry.severity)));
    setEditPriority(coercePriority(entry.priority));
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(entryId: string) {
    try {
      const nextDescription = editDescription.trim();
      if (!nextDescription) {
        Alert.alert("Description required", "Please add a short description before saving.");
        return;
      }

      await updateFeedbackEntry(entryId, {
        description: nextDescription,
        category: feedbackCategories[editCategoryIndex] ?? feedbackCategories[0],
        severity: feedbackSeverities[editSeverityIndex] ?? feedbackSeverities[0],
        priority: editPriority
      });

      setEditingId(null);
      await loadEntries();
    } catch (error) {
      console.error("Unable to update feedback entry", error);
      Alert.alert("Update failed", "This feedback item could not be updated.");
    }
  }

  async function deleteEntry(entryId: string) {
    const performDelete = async () => {
      try {
        await deleteFeedbackEntry(entryId);
        if (editingId === entryId) {
          setEditingId(null);
        }
        await loadEntries();
      } catch (error) {
        console.error("Unable to delete feedback entry", error);
        Alert.alert("Delete failed", "This feedback item could not be deleted.");
      }
    };

    if (Platform.OS === "web") {
      const webGlobal = globalThis as unknown as { confirm?: (message: string) => boolean };
      const shouldDelete =
        typeof webGlobal.confirm === "function"
          ? webGlobal.confirm("Delete feedback?\n\nThis will remove the saved entry from the server.")
          : true;

      if (shouldDelete) {
        await performDelete();
      }
      return;
    }

    Alert.alert("Delete feedback?", "This will remove the saved entry from the server.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void performDelete() }
    ]);
  }

  async function copyCodexPrompt(entry: FeedbackEntry) {
    try {
      const prompt = buildCodexPromptFromFeedbackEntry(entry);
      const hasNavigatorClipboard =
        typeof navigator !== "undefined" &&
        "clipboard" in navigator &&
        typeof (navigator as any).clipboard?.writeText === "function";

      if (hasNavigatorClipboard) {
        await (navigator as any).clipboard.writeText(prompt);
        Alert.alert("Copied", "Codex prompt copied to clipboard.");
        return;
      }

      try {
        const clipboard = await import("expo-clipboard");
        await clipboard.setStringAsync(prompt);
        Alert.alert("Copied", "Codex prompt copied to clipboard.");
      } catch (error) {
        console.error("Unable to copy prompt to clipboard", error);
        await Share.share({
          message: prompt
        });
      }
    } catch (error) {
      console.error("Unable to build feedback prompt", error);
      Alert.alert("Copy failed", "Saved feedback could not be formatted for Codex.");
    }
  }

  const normalizedSearch = search.trim().toLowerCase();
  const categoryFilter = categoryFilterIndex >= 0 ? feedbackCategories[categoryFilterIndex] : null;
  const severityFilter = severityFilterIndex >= 0 ? feedbackSeverities[severityFilterIndex] : null;
  const priorityFilter = priorityFilterIndex >= 0 ? feedbackPriorities[priorityFilterIndex] : null;
  const sortMode = sortModes[sortModeIndex] ?? "Newest";

  const filteredEntries = entries
    .filter((entry) => {
      if (categoryFilter && entry.category !== categoryFilter) {
        return false;
      }
      if (severityFilter && entry.severity !== severityFilter) {
        return false;
      }
      if (priorityFilter && coercePriority(entry.priority) !== priorityFilter) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        entry.description,
        entry.category,
        entry.severity,
        entry.context.screenName,
        entry.context.routeName,
        entry.context.lastAction ?? ""
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    })
    .sort((left, right) => {
      if (sortMode === "Oldest") {
        return left.createdAt.localeCompare(right.createdAt);
      }

      if (sortMode === "Priority") {
        const priorityDelta = priorityRank(coercePriority(left.priority)) - priorityRank(coercePriority(right.priority));
        if (priorityDelta !== 0) {
          return priorityDelta;
        }
        return right.createdAt.localeCompare(left.createdAt);
      }

      return right.createdAt.localeCompare(left.createdAt);
    });

  function cycleFilterIndex(currentIndex: number, valuesLength: number) {
    if (valuesLength <= 0) {
      return -1;
    }
    const nextIndex = currentIndex + 1;
    return nextIndex >= valuesLength ? -1 : nextIndex;
  }

  function clearFilters() {
    setSearch("");
    setCategoryFilterIndex(-1);
    setSeverityFilterIndex(-1);
    setPriorityFilterIndex(-1);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Saved feedback</Text>
        <Text style={styles.subtitle}>
          {loading
            ? "Loading feedback..."
            : `${entries.length} entr${entries.length === 1 ? "y" : "ies"} saved in the backend • ${filteredEntries.length} shown`}
        </Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Refresh" onPress={() => void loadEntries()} tone="secondary" loading={loading} />
        <PrimaryButton
          label={`Sort: ${sortMode}`}
          onPress={() => setSortModeIndex((current) => (current + 1) % sortModes.length)}
          tone="secondary"
          disabled={loading || entries.length === 0}
        />
        <PrimaryButton label="Clear filters" onPress={clearFilters} tone="secondary" disabled={loading || entries.length === 0} />
      </View>

      <View style={styles.filtersCard}>
        <TextInput
          placeholder="Search feedback..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          editable={!loading}
        />

        <View style={styles.filtersRow}>
          <PrimaryButton
            label={`Category: ${categoryFilter ?? "All"}`}
            tone="secondary"
            onPress={() => setCategoryFilterIndex((current) => cycleFilterIndex(current, feedbackCategories.length))}
            disabled={loading || entries.length === 0}
          />
          <PrimaryButton
            label={`Severity: ${severityFilter ?? "All"}`}
            tone="secondary"
            onPress={() => setSeverityFilterIndex((current) => cycleFilterIndex(current, feedbackSeverities.length))}
            disabled={loading || entries.length === 0}
          />
          <PrimaryButton
            label={`Priority: ${priorityFilter ?? "All"}`}
            tone="secondary"
            onPress={() => setPriorityFilterIndex((current) => cycleFilterIndex(current, feedbackPriorities.length))}
            disabled={loading || entries.length === 0}
          />
        </View>
      </View>

      <View style={styles.list}>
        {entries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No feedback has been saved yet.</Text>
          </View>
        ) : filteredEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No feedback matches the current filters.</Text>
          </View>
        ) : (
          filteredEntries.map((entry) => {
            const isEditing = editingId === entry.id;
            const displayPriority = coercePriority(entry.priority);

            return (
              <View key={entry.id} style={styles.issueCard}>
                <View style={styles.issueHeader}>
                  <View style={styles.issueMeta}>
                    <Text style={styles.issueTitle} numberOfLines={2}>
                      {entry.description}
                    </Text>
                    <Text style={styles.issueSubtitle}>
                      {displayPriority} • {entry.severity} • {entry.category}
                    </Text>
                    <Text style={styles.issueDetails} numberOfLines={2}>
                      {entry.createdAt} • {entry.context.screenName} • {entry.context.routeName}
                      {entry.context.lastAction ? ` • last: ${entry.context.lastAction}` : ""}
                    </Text>
                  </View>
                </View>

                {isEditing ? (
                  <View style={styles.editor}>
                    <Text style={styles.editorLabel}>Description</Text>
                    <TextInput
                      value={editDescription}
                      onChangeText={setEditDescription}
                      style={styles.editorInput}
                      multiline
                    />

                    <View style={styles.editorRow}>
                      <PrimaryButton
                        label={`Category: ${feedbackCategories[editCategoryIndex] ?? feedbackCategories[0]}`}
                        tone="secondary"
                        onPress={() =>
                          setEditCategoryIndex((current) => (current + 1) % feedbackCategories.length)
                        }
                      />
                      <PrimaryButton
                        label={`Severity: ${feedbackSeverities[editSeverityIndex] ?? feedbackSeverities[0]}`}
                        tone="secondary"
                        onPress={() =>
                          setEditSeverityIndex((current) => (current + 1) % feedbackSeverities.length)
                        }
                      />
                    </View>

                    <View style={styles.priorityRow}>
                      {feedbackPriorities.map((priority) => (
                        <PrimaryButton
                          key={priority}
                          label={priority}
                          tone={priority === editPriority ? "primary" : "secondary"}
                          onPress={() => setEditPriority(priority)}
                        />
                      ))}
                    </View>

                    <View style={styles.issueActions}>
                      <PrimaryButton label="Cancel" tone="secondary" onPress={cancelEdit} />
                      <PrimaryButton label="Save" onPress={() => void saveEdit(entry.id)} />
                      <PrimaryButton label="Delete" tone="danger" onPress={() => deleteEntry(entry.id)} />
                    </View>
                  </View>
                ) : (
                  <View style={styles.issueActions}>
                    <PrimaryButton label="Copy Codex Prompt" onPress={() => void copyCodexPrompt(entry)} />
                    <PrimaryButton label="Edit" tone="secondary" onPress={() => startEdit(entry)} />
                    <PrimaryButton label="Delete" tone="danger" onPress={() => deleteEntry(entry.id)} />
                  </View>
                )}
              </View>
            );
          })
        )}
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
  filtersCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md
  },
  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  searchInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  list: {
    gap: spacing.md
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.lg
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22
  },
  issueCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md
  },
  issueHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md
  },
  issueMeta: {
    flex: 1,
    gap: spacing.xs
  },
  issueTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24
  },
  issueSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  issueDetails: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18
  },
  issueActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  editor: {
    gap: spacing.sm
  },
  editorLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600"
  },
  editorInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 90,
    textAlignVertical: "top"
  },
  editorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  priorityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  }
});
