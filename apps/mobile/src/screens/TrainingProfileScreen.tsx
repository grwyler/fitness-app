import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { experienceLevels, trainingGoals, unitSystems, type ExperienceLevel, type TrainingGoal, type UnitSystem } from "@fitness/shared";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, spacing } from "../theme/tokens";
import { useTrainingSettings } from "../features/workout/hooks/useTrainingSettings";
import { useUpdateTrainingSettings } from "../features/workout/hooks/useUpdateTrainingSettings";

type Props = NativeStackScreenProps<RootStackParamList, "TrainingProfile">;

function OptionRow<T extends string>(props: {
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (next: T | null) => void;
  allowNull?: boolean;
}) {
  const resolvedOptions = useMemo(() => (props.allowNull ? (["none", ...props.options] as const) : props.options), [props.options, props.allowNull]);

  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{props.label}</Text>
      <View style={styles.chipRow}>
        {resolvedOptions.map((option) => {
          const isNullOption = option === ("none" as any);
          const optionValue = isNullOption ? null : (option as any);
          const selected = props.value === optionValue;
          const label = isNullOption ? "Not set" : String(option).replace(/_/g, " ");
          return (
            <Pressable
              key={String(option)}
              onPress={() => props.onChange(optionValue)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function TrainingProfileScreen({ navigation }: Props) {
  const settingsQuery = useTrainingSettings();
  const updateMutation = useUpdateTrainingSettings();

  const [trainingGoal, setTrainingGoal] = useState<TrainingGoal | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("imperial");

  useEffect(() => {
    if (!settingsQuery.data) return;
    setTrainingGoal(settingsQuery.data.trainingGoal);
    setExperienceLevel(settingsQuery.data.experienceLevel);
    setUnitSystem(settingsQuery.data.unitSystem);
  }, [settingsQuery.data]);

  return (
    <Screen
      fixedFooter={
        <PrimaryButton
          label="Save"
          loading={updateMutation.isPending}
          onPress={() =>
            updateMutation.mutate({
              trainingGoal,
              experienceLevel,
              unitSystem
            })
          }
        />
      }
      fixedFooterHeight={56}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Training Profile</Text>
        <Text style={styles.subtitle}>These settings help tailor progression recommendations.</Text>
      </View>

      {settingsQuery.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
      {settingsQuery.isError ? <Text style={styles.errorText}>Unable to load training settings.</Text> : null}

      <View style={styles.card}>
        <OptionRow
          label="Goal"
          options={trainingGoals}
          value={trainingGoal}
          onChange={(next) => setTrainingGoal(next as TrainingGoal | null)}
          allowNull
        />
        <OptionRow
          label="Experience"
          options={experienceLevels}
          value={experienceLevel}
          onChange={(next) => setExperienceLevel(next as ExperienceLevel | null)}
          allowNull
        />
        <OptionRow label="Units" options={unitSystems} value={unitSystem} onChange={(next) => setUnitSystem((next ?? "imperial") as UnitSystem)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>More settings</Text>
        <PrimaryButton label="Progression Preferences" tone="secondary" onPress={() => navigation.navigate("ProgressionPreferences")} />
        <PrimaryButton label="Equipment Settings" tone="secondary" onPress={() => navigation.navigate("EquipmentSettings")} />
        <PrimaryButton label="Exercise Progression Settings" tone="secondary" onPress={() => navigation.navigate("ExerciseProgressionSettings")} />
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
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700"
  },
  row: {
    gap: spacing.sm
  },
  rowLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600"
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
  muted: {
    color: colors.textSecondary
  },
  errorText: {
    color: colors.danger
  }
});

