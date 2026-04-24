import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { colors, spacing } from "../../../theme/tokens";
import { feedbackCategories, feedbackSeverities, type FeedbackCategory, type FeedbackSeverity } from "../types";

type FeedbackModalProps = {
  visible: boolean;
  saving?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (input: {
    description: string;
    category: FeedbackCategory;
    severity: FeedbackSeverity;
  }) => Promise<void>;
};

export function FeedbackModal({
  visible,
  saving = false,
  errorMessage,
  onClose,
  onSubmit
}: FeedbackModalProps) {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<FeedbackCategory>("Bug");
  const [severity, setSeverity] = useState<FeedbackSeverity>("Medium");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setDescription("");
      setCategory("Bug");
      setSeverity("Medium");
      setValidationMessage(null);
    }
  }, [visible]);

  async function handleSubmit() {
    const nextDescription = description.trim();
    if (!nextDescription) {
      setValidationMessage("Add a short description before submitting.");
      return;
    }

    setValidationMessage(null);
    await onSubmit({
      description: nextDescription,
      category,
      severity
    });
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Report issue</Text>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              multiline
              numberOfLines={4}
              placeholder="What happened?"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.choiceGroup}>
              {feedbackCategories.map((item) => (
                <SelectableChip
                  key={item}
                  label={item}
                  selected={category === item}
                  onPress={() => setCategory(item)}
                />
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Severity</Text>
            <View style={styles.choiceRow}>
              {feedbackSeverities.map((item) => (
                <SelectableChip
                  key={item}
                  label={item}
                  selected={severity === item}
                  onPress={() => setSeverity(item)}
                />
              ))}
            </View>
          </View>

          {validationMessage ? <Text style={styles.validation}>{validationMessage}</Text> : null}
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <View style={styles.actions}>
            <PrimaryButton label="Cancel" onPress={onClose} tone="secondary" disabled={saving} />
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => void handleSubmit()}
              style={[styles.submitButton, saving && styles.disabledButton]}
            >
              {saving ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.submitLabel}>Save feedback</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SelectableChip(props: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.onPress}
      style={[styles.chip, props.selected && styles.chipSelected]}
    >
      <Text style={[styles.chipLabel, props.selected && styles.chipLabelSelected]}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(29, 36, 28, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.md
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    gap: spacing.md,
    maxWidth: 560,
    padding: spacing.lg,
    width: "100%"
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800"
  },
  closeButton: {
    paddingVertical: spacing.xs
  },
  closeLabel: {
    color: colors.accentStrong,
    fontSize: 15,
    fontWeight: "700"
  },
  field: {
    gap: spacing.xs
  },
  label: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700"
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    color: colors.textPrimary,
    minHeight: 112,
    padding: spacing.md
  },
  choiceGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  chip: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  chipSelected: {
    backgroundColor: colors.accentStrong,
    borderColor: colors.accentStrong
  },
  chipLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600"
  },
  chipLabelSelected: {
    color: colors.surface
  },
  validation: {
    color: "#9c3b31",
    fontSize: 14
  },
  error: {
    color: "#9c3b31",
    fontSize: 14
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: colors.accentStrong,
    borderRadius: 18,
    flex: 1,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: spacing.md
  },
  submitLabel: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "700"
  },
  disabledButton: {
    opacity: 0.55
  }
});
