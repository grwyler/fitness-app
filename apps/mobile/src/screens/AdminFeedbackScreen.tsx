import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { deleteAdminFeedbackEntry, listAdminFeedbackEntries, updateAdminFeedbackEntry, type AdminFeedbackEntry } from "../api/admin";
import { feedbackCategories, feedbackPriorities, feedbackSeverities, type FeedbackPriority } from "../features/feedback/types";
import { buildCodexPromptFromFeedbackEntry } from "../features/feedback/utils/build-codex-prompt";
import { colors, spacing } from "../theme/tokens";
import { useAppAuth } from "../core/auth/AuthProvider";
import { Card } from "../components/Card";
import { AppText } from "../components/AppText";

type SortMode = "Newest" | "Oldest" | "Priority";

const sortModes: SortMode[] = ["Newest", "Priority", "Oldest"];

function coercePriority(value: FeedbackPriority | undefined): FeedbackPriority {
  return value ?? "P2";
}

function priorityRank(priority: FeedbackPriority) {
  return feedbackPriorities.indexOf(priority);
}

export function AdminFeedbackScreen() {
  const auth = useAppAuth();
  const [entries, setEntries] = useState<AdminFeedbackEntry[]>([]);
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
      const serverEntries = (await listAdminFeedbackEntries()).data;
      setEntries(serverEntries);
    } catch (error) {
      console.error("Unable to load admin feedback entries", error);
      Alert.alert("Feedback unavailable", "Saved feedback could not be loaded from the server.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(entry: AdminFeedbackEntry) {
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

      await updateAdminFeedbackEntry(entryId, {
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
        await deleteAdminFeedbackEntry(entryId);
        if (editingId === entryId) {
          setEditingId(null);
        }
        await loadEntries();
      } catch (error) {
        console.error("Unable to delete feedback entry", error);
        Alert.alert("Delete failed", "This feedback item could not be deleted.");
      }
    };

    Alert.alert("Delete feedback?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: performDelete }
    ]);
  }

  const filteredEntries = useMemo(() => {
    let next = entries.slice();
    const query = search.trim().toLowerCase();

    if (query) {
      next = next.filter((entry) => {
        const meta = `${entry.category} ${entry.severity} ${entry.priority ?? ""} ${entry.reporter.email ?? ""}`;
        return (
          entry.description.toLowerCase().includes(query) ||
          meta.toLowerCase().includes(query) ||
          entry.id.toLowerCase().includes(query)
        );
      });
    }

    if (categoryFilterIndex >= 0) {
      const category = feedbackCategories[categoryFilterIndex];
      next = next.filter((entry) => entry.category === category);
    }

    if (severityFilterIndex >= 0) {
      const severity = feedbackSeverities[severityFilterIndex];
      next = next.filter((entry) => entry.severity === severity);
    }

    if (priorityFilterIndex >= 0) {
      const priority = feedbackPriorities[priorityFilterIndex];
      next = next.filter((entry) => (entry.priority ?? "P2") === priority);
    }

    const sortMode = sortModes[sortModeIndex] ?? "Newest";
    next.sort((a, b) => {
      if (sortMode === "Priority") {
        const priorityDiff = priorityRank(coercePriority(a.priority)) - priorityRank(coercePriority(b.priority));
        if (priorityDiff !== 0) return priorityDiff;
      }

      const timestampDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sortMode === "Oldest" ? -timestampDiff : timestampDiff;
    });

    return next;
  }, [categoryFilterIndex, entries, priorityFilterIndex, search, severityFilterIndex, sortModeIndex]);

  async function copyCodexPrompt(entry: AdminFeedbackEntry) {
    const prompt = buildCodexPromptFromFeedbackEntry(entry);
    const canShare = typeof Share?.share === "function";

    if (!canShare) {
      Alert.alert("Copy not supported", "Sharing is not available on this platform.");
      return;
    }

    try {
      await Share.share({ message: prompt });
    } catch (error) {
      console.error("Unable to share Codex prompt", error);
      Alert.alert("Share failed", "Unable to share this prompt.");
    }
  }

  if (!auth.isAdmin) {
    return (
      <Screen>
        <Card variant="default" style={styles.emptyCard}>
          <AppText variant="title2">Admin access required</AppText>
          <AppText tone="secondary">This screen is only available to admin users.</AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Feedback</Text>
        <Text style={styles.subtitle}>
          {loading ? "Loading feedback…" : `${filteredEntries.length} items`}
        </Text>
      </View>

      <View style={styles.filtersCard}>
        <TextInput
          placeholder="Search description, category, priority, or reporter…"
          placeholderTextColor={colors.textSecondary}
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.filtersRow}>
          <PrimaryButton
            label={`Category: ${categoryFilterIndex >= 0 ? feedbackCategories[categoryFilterIndex] : "All"}`}
            tone="secondary"
            onPress={() => setCategoryFilterIndex((current) => (current + 1) % (feedbackCategories.length + 1) - 1)}
          />
          <PrimaryButton
            label={`Severity: ${severityFilterIndex >= 0 ? feedbackSeverities[severityFilterIndex] : "All"}`}
            tone="secondary"
            onPress={() => setSeverityFilterIndex((current) => (current + 1) % (feedbackSeverities.length + 1) - 1)}
          />
          <PrimaryButton
            label={`Priority: ${priorityFilterIndex >= 0 ? feedbackPriorities[priorityFilterIndex] : "All"}`}
            tone="secondary"
            onPress={() => setPriorityFilterIndex((current) => (current + 1) % (feedbackPriorities.length + 1) - 1)}
          />
          <PrimaryButton
            label={`Sort: ${sortModes[sortModeIndex] ?? "Newest"}`}
            tone="secondary"
            onPress={() => setSortModeIndex((current) => (current + 1) % sortModes.length)}
          />
          <PrimaryButton label="Reload" tone="secondary" onPress={() => void loadEntries()} />
        </View>
      </View>

      <View style={styles.list}>
        {loading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Loading…</Text>
          </View>
        ) : filteredEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No feedback matches these filters.</Text>
          </View>
        ) : (
          filteredEntries.map((entry) => {
            const reporterLabel = entry.reporter.email ?? entry.reporter.userId;
            return (
              <View key={entry.id} style={styles.issueCard}>
                <View style={styles.issueHeader}>
                  <View style={styles.issueMeta}>
                    <Text style={styles.issueTitle}>{entry.category}</Text>
                    <Text style={styles.issueSubtitle}>
                      {entry.severity} • {entry.priority ?? "P2"} • {reporterLabel}
                    </Text>
                    <Text style={styles.issueDetails}>
                      {new Date(entry.createdAt).toLocaleString()} • {entry.context.screenName}
                    </Text>
                  </View>
                </View>

                {editingId === entry.id ? (
                  <View style={styles.editor}>
                    <Text style={styles.editorLabel}>Description</Text>
                    <TextInput
                      value={editDescription}
                      onChangeText={setEditDescription}
                      placeholder="Describe the issue…"
                      placeholderTextColor={colors.textSecondary}
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
                      <PrimaryButton label="Delete" tone="danger" onPress={() => void deleteEntry(entry.id)} />
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={styles.issueDetails}>{entry.description}</Text>
                    <View style={styles.issueActions}>
                      <PrimaryButton label="Copy Codex Prompt" onPress={() => void copyCodexPrompt(entry)} />
                      <PrimaryButton label="Edit" tone="secondary" onPress={() => startEdit(entry)} />
                      <PrimaryButton label="Delete" tone="danger" onPress={() => void deleteEntry(entry.id)} />
                    </View>
                  </>
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

