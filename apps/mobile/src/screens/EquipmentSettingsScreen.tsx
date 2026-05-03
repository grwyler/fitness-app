import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors, spacing } from "../theme/tokens";
import { useTrainingSettings } from "../features/workout/hooks/useTrainingSettings";
import { useUpdateTrainingSettings } from "../features/workout/hooks/useUpdateTrainingSettings";
import { formatWeightForUser, parseWeightInputForUser, type UnitSystem } from "@fitness/shared";

function NumberRow(props: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  helper?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{props.label}</Text>
      {props.helper ? <Text style={styles.rowHelper}>{props.helper}</Text> : null}
      <TextInput
        keyboardType="numeric"
        inputMode="decimal"
        value={props.value}
        onChangeText={props.onChange}
        placeholder="0"
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
      />
    </View>
  );
}

function parsePositiveUserWeightLbsOrNull(value: string, unitSystem: UnitSystem): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsedLbs = parseWeightInputForUser({ weightText: trimmed, unitSystem });
  if (parsedLbs === null || !Number.isFinite(parsedLbs) || parsedLbs <= 0) return null;
  return parsedLbs;
}

export function EquipmentSettingsScreen() {
  const settingsQuery = useTrainingSettings();
  const updateMutation = useUpdateTrainingSettings();
  const unitSystem = settingsQuery.data?.unitSystem ?? "imperial";
  const unitLabel = unitSystem === "metric" ? "kg" : "lb";

  const [barbell, setBarbell] = useState("5");
  const [dumbbell, setDumbbell] = useState("5");
  const [machine, setMachine] = useState("10");
  const [cable, setCable] = useState("5");

  useEffect(() => {
    if (!settingsQuery.data) return;
    setBarbell(
      formatWeightForUser({
        weightLbs: settingsQuery.data.defaultBarbellIncrement,
        unitSystem,
        includeUnit: false,
        maximumFractionDigits: unitSystem === "metric" ? 1 : 2
      }).text
    );
    setDumbbell(
      formatWeightForUser({
        weightLbs: settingsQuery.data.defaultDumbbellIncrement,
        unitSystem,
        includeUnit: false,
        maximumFractionDigits: unitSystem === "metric" ? 1 : 2
      }).text
    );
    setMachine(
      formatWeightForUser({
        weightLbs: settingsQuery.data.defaultMachineIncrement,
        unitSystem,
        includeUnit: false,
        maximumFractionDigits: unitSystem === "metric" ? 1 : 2
      }).text
    );
    setCable(
      formatWeightForUser({
        weightLbs: settingsQuery.data.defaultCableIncrement,
        unitSystem,
        includeUnit: false,
        maximumFractionDigits: unitSystem === "metric" ? 1 : 2
      }).text
    );
  }, [settingsQuery.data, unitSystem]);

  const parsed = useMemo(() => {
    return {
      barbell: parsePositiveUserWeightLbsOrNull(barbell, unitSystem),
      dumbbell: parsePositiveUserWeightLbsOrNull(dumbbell, unitSystem),
      machine: parsePositiveUserWeightLbsOrNull(machine, unitSystem),
      cable: parsePositiveUserWeightLbsOrNull(cable, unitSystem)
    };
  }, [barbell, dumbbell, machine, cable, unitSystem]);

  const isValid = Boolean(parsed.barbell && parsed.dumbbell && parsed.machine && parsed.cable);

  return (
    <Screen
      fixedFooter={
        <PrimaryButton
          label="Save"
          loading={updateMutation.isPending}
          disabled={!isValid}
          onPress={() =>
            updateMutation.mutate({
              defaultBarbellIncrement: parsed.barbell ?? undefined,
              defaultDumbbellIncrement: parsed.dumbbell ?? undefined,
              defaultMachineIncrement: parsed.machine ?? undefined,
              defaultCableIncrement: parsed.cable ?? undefined
            })
          }
        />
      }
      fixedFooterHeight={56}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Equipment Settings</Text>
        <Text style={styles.subtitle}>Used when rounding weight changes for different equipment.</Text>
      </View>

      {settingsQuery.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
      {settingsQuery.isError ? <Text style={styles.errorText}>Unable to load training settings.</Text> : null}

      <View style={styles.card}>
        <NumberRow label={`Barbell increment (${unitLabel})`} value={barbell} onChange={setBarbell} />
        <NumberRow label={`Dumbbell increment (${unitLabel})`} value={dumbbell} onChange={setDumbbell} />
        <NumberRow label={`Machine increment (${unitLabel})`} value={machine} onChange={setMachine} />
        <NumberRow label={`Cable increment (${unitLabel})`} value={cable} onChange={setCable} />
        {!isValid ? <Text style={styles.rowHelper}>All increments must be positive numbers.</Text> : null}
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: 16
  },
  muted: {
    color: colors.textSecondary
  },
  errorText: {
    color: colors.danger
  }
});

