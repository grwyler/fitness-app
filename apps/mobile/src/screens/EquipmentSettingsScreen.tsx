import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors, spacing } from "../theme/tokens";
import { useTrainingSettings } from "../features/workout/hooks/useTrainingSettings";
import { useUpdateTrainingSettings } from "../features/workout/hooks/useUpdateTrainingSettings";

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

function parsePositiveNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function EquipmentSettingsScreen() {
  const settingsQuery = useTrainingSettings();
  const updateMutation = useUpdateTrainingSettings();

  const [barbell, setBarbell] = useState("5");
  const [dumbbell, setDumbbell] = useState("5");
  const [machine, setMachine] = useState("10");
  const [cable, setCable] = useState("5");

  useEffect(() => {
    if (!settingsQuery.data) return;
    setBarbell(String(settingsQuery.data.defaultBarbellIncrement));
    setDumbbell(String(settingsQuery.data.defaultDumbbellIncrement));
    setMachine(String(settingsQuery.data.defaultMachineIncrement));
    setCable(String(settingsQuery.data.defaultCableIncrement));
  }, [settingsQuery.data]);

  const parsed = useMemo(() => {
    return {
      barbell: parsePositiveNumberOrNull(barbell),
      dumbbell: parsePositiveNumberOrNull(dumbbell),
      machine: parsePositiveNumberOrNull(machine),
      cable: parsePositiveNumberOrNull(cable)
    };
  }, [barbell, dumbbell, machine, cable]);

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
        <NumberRow label="Barbell increment (lb)" value={barbell} onChange={setBarbell} />
        <NumberRow label="Dumbbell increment (lb)" value={dumbbell} onChange={setDumbbell} />
        <NumberRow label="Machine increment (lb)" value={machine} onChange={setMachine} />
        <NumberRow label="Cable increment (lb)" value={cable} onChange={setCable} />
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

