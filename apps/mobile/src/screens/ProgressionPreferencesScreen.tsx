import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  progressionAggressivenessLevels,
  progressionConfidenceLevels,
  recoveryStates,
  type ProgressionAggressiveness,
  type ProgressionConfidence,
  type RecoveryState
} from "@fitness/shared";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors, spacing } from "../theme/tokens";
import { useTrainingSettings } from "../features/workout/hooks/useTrainingSettings";
import { useUpdateTrainingSettings } from "../features/workout/hooks/useUpdateTrainingSettings";

function ToggleRow(props: { label: string; value: boolean; onToggle: () => void; helper?: string }) {
  return (
    <Pressable onPress={props.onToggle} style={styles.toggleRow}>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text style={styles.rowTitle}>{props.label}</Text>
        {props.helper ? <Text style={styles.rowHelper}>{props.helper}</Text> : null}
      </View>
      <View style={[styles.togglePill, props.value ? styles.togglePillOn : styles.togglePillOff]}>
        <Text style={styles.toggleLabel}>{props.value ? "On" : "Off"}</Text>
      </View>
    </Pressable>
  );
}

function ChipRow<T extends string>(props: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{props.label}</Text>
      <View style={styles.chipRow}>
        {props.options.map((option) => {
          const selected = props.value === option;
          return (
            <Pressable
              key={option}
              onPress={() => props.onChange(option)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ProgressionPreferencesScreen() {
  const settingsQuery = useTrainingSettings();
  const updateMutation = useUpdateTrainingSettings();

  const [progressionAggressiveness, setProgressionAggressiveness] =
    useState<ProgressionAggressiveness>("balanced");
  const [useRecoveryAdjustments, setUseRecoveryAdjustments] = useState(true);
  const [defaultRecoveryState, setDefaultRecoveryState] = useState<RecoveryState>("normal");
  const [allowAutoDeload, setAllowAutoDeload] = useState(true);
  const [allowRecalibration, setAllowRecalibration] = useState(true);
  const [preferRepProgressionBeforeWeight, setPreferRepProgressionBeforeWeight] = useState(true);
  const [minimumConfidenceForIncrease, setMinimumConfidenceForIncrease] =
    useState<ProgressionConfidence>("medium");

  useEffect(() => {
    if (!settingsQuery.data) return;
    setProgressionAggressiveness(settingsQuery.data.progressionAggressiveness);
    setUseRecoveryAdjustments(settingsQuery.data.useRecoveryAdjustments);
    setDefaultRecoveryState(settingsQuery.data.defaultRecoveryState);
    setAllowAutoDeload(settingsQuery.data.allowAutoDeload);
    setAllowRecalibration(settingsQuery.data.allowRecalibration);
    setPreferRepProgressionBeforeWeight(settingsQuery.data.preferRepProgressionBeforeWeight);
    setMinimumConfidenceForIncrease(settingsQuery.data.minimumConfidenceForIncrease);
  }, [settingsQuery.data]);

  const recoveryOptions = useMemo(
    () => recoveryStates.filter((state) => state !== "fresh") as unknown as readonly RecoveryState[],
    []
  );

  return (
    <Screen
      fixedFooter={
        <PrimaryButton
          label="Save"
          loading={updateMutation.isPending}
          onPress={() =>
            updateMutation.mutate({
              progressionAggressiveness,
              useRecoveryAdjustments,
              defaultRecoveryState,
              allowAutoDeload,
              allowRecalibration,
              preferRepProgressionBeforeWeight,
              minimumConfidenceForIncrease
            })
          }
        />
      }
      fixedFooterHeight={56}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Progression Preferences</Text>
        <Text style={styles.subtitle}>Choose how quickly the app should push progress.</Text>
      </View>

      {settingsQuery.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
      {settingsQuery.isError ? <Text style={styles.errorText}>Unable to load training settings.</Text> : null}

      <View style={styles.card}>
        <ChipRow
          label="Aggressiveness"
          options={progressionAggressivenessLevels}
          value={progressionAggressiveness}
          onChange={setProgressionAggressiveness}
        />

        <ToggleRow
          label="Prefer reps before weight"
          value={preferRepProgressionBeforeWeight}
          helper="When enabled, you’ll try to add reps within the range before adding weight."
          onToggle={() => setPreferRepProgressionBeforeWeight((prev) => !prev)}
        />

        <ToggleRow
          label="Use recovery adjustments"
          value={useRecoveryAdjustments}
          helper="Uses your recovery state to be more cautious on tough days."
          onToggle={() => setUseRecoveryAdjustments((prev) => !prev)}
        />

        <ChipRow
          label="Default recovery state"
          options={recoveryOptions}
          value={defaultRecoveryState}
          onChange={setDefaultRecoveryState}
        />

        <ToggleRow
          label="Allow auto-deload"
          value={allowAutoDeload}
          helper="If you miss twice in a row, the app can reduce weight automatically."
          onToggle={() => setAllowAutoDeload((prev) => !prev)}
        />

        <ToggleRow
          label="Allow recalibration"
          value={allowRecalibration}
          helper="Allows bigger resets when performance suggests your training max is off."
          onToggle={() => setAllowRecalibration((prev) => !prev)}
        />

        <ChipRow
          label="Minimum confidence to increase"
          options={progressionConfidenceLevels}
          value={minimumConfidenceForIncrease}
          onChange={setMinimumConfidenceForIncrease}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700"
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  row: {
    gap: spacing.sm
  },
  rowTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  rowHelper: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.surface
  },
  chipLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize"
  },
  chipLabelSelected: {
    color: colors.accent
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm
  },
  togglePill: {
    minWidth: 56,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1
  },
  togglePillOn: {
    borderColor: colors.accent,
    backgroundColor: colors.surface
  },
  togglePillOff: {
    borderColor: colors.border,
    backgroundColor: colors.background
  },
  toggleLabel: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center"
  },
  muted: {
    color: colors.textSecondary
  },
  errorText: {
    color: colors.danger
  }
});

