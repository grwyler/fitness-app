import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  bodyweightProgressionModes,
  progressionStrategies,
  type BodyweightProgressionMode,
  type ProgressionStrategy
} from "@fitness/shared";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors, spacing } from "../theme/tokens";
import { useExercises } from "../features/workout/hooks/useExercises";
import { useExerciseProgressionSettings } from "../features/workout/hooks/useExerciseProgressionSettings";
import { useUpdateExerciseProgressionSettings } from "../features/workout/hooks/useUpdateExerciseProgressionSettings";
import { formatWeightForUser, parseWeightInputForUser, type UnitSystem } from "@fitness/shared";
import { useTrainingSettings } from "../features/workout/hooks/useTrainingSettings";

function parseNullableInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  const intValue = Math.floor(parsed);
  return intValue > 0 ? intValue : null;
}

function parseNullablePositive(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseNullablePositiveUserWeightLbs(value: string, unitSystem: UnitSystem): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsedLbs = parseWeightInputForUser({ weightText: trimmed, unitSystem });
  if (parsedLbs === null || !Number.isFinite(parsedLbs) || parsedLbs <= 0) return null;
  return parsedLbs;
}

function ChipSelect<T extends string>(props: {
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (next: T | null) => void;
  allowNull?: boolean;
}) {
  const resolvedOptions = useMemo(() => (props.allowNull ? (["none", ...props.options] as const) : props.options), [props.options, props.allowNull]);

  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{props.label}</Text>
      <View style={styles.chipRow}>
        {resolvedOptions.map((option) => {
          const isNullOption = option === ("none" as any);
          const optionValue = isNullOption ? null : (option as any);
          const selected = props.value === optionValue;
          const label = isNullOption ? "Default" : String(option).replace(/_/g, " ");
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

function NumberInputRow(props: { label: string; value: string; onChange: (next: string) => void; helper?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{props.label}</Text>
      {props.helper ? <Text style={styles.rowHelper}>{props.helper}</Text> : null}
      <TextInput
        keyboardType="numeric"
        inputMode="decimal"
        value={props.value}
        onChangeText={props.onChange}
        placeholder="(leave blank for default)"
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
      />
    </View>
  );
}

export function ExerciseProgressionSettingsScreen() {
  const exercisesQuery = useExercises(true);
  const trainingSettingsQuery = useTrainingSettings();
  const unitSystem = trainingSettingsQuery.data?.unitSystem ?? "imperial";
  const unitLabel = unitSystem === "metric" ? "kg" : "lb";

  const [search, setSearch] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  const settingsQuery = useExerciseProgressionSettings(selectedExerciseId);
  const updateMutation = useUpdateExerciseProgressionSettings(selectedExerciseId);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [progressionStrategy, setProgressionStrategy] = useState<ProgressionStrategy | null>(null);
  const [repRangeMin, setRepRangeMin] = useState("");
  const [repRangeMax, setRepRangeMax] = useState("");
  const [incrementOverride, setIncrementOverride] = useState("");
  const [maxJumpPerSession, setMaxJumpPerSession] = useState("");
  const [bodyweightProgressionMode, setBodyweightProgressionMode] = useState<BodyweightProgressionMode | null>(null);

  useEffect(() => {
    if (!settingsQuery.data) return;
    setProgressionStrategy(settingsQuery.data.progressionStrategy);
    setRepRangeMin(settingsQuery.data.repRangeMin ? String(settingsQuery.data.repRangeMin) : "");
    setRepRangeMax(settingsQuery.data.repRangeMax ? String(settingsQuery.data.repRangeMax) : "");
    setIncrementOverride(
      settingsQuery.data.incrementOverride
        ? formatWeightForUser({
            weightLbs: settingsQuery.data.incrementOverride,
            unitSystem,
            includeUnit: false,
            maximumFractionDigits: unitSystem === "metric" ? 1 : 2
          }).text
        : ""
    );
    setMaxJumpPerSession(
      settingsQuery.data.maxJumpPerSession
        ? formatWeightForUser({
            weightLbs: settingsQuery.data.maxJumpPerSession,
            unitSystem,
            includeUnit: false,
            maximumFractionDigits: unitSystem === "metric" ? 1 : 2
          }).text
        : ""
    );
    setBodyweightProgressionMode(settingsQuery.data.bodyweightProgressionMode);
  }, [settingsQuery.data, unitSystem]);

  const filteredExercises = useMemo(() => {
    const list = exercisesQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list.slice(0, 30);
    return list
      .filter((exercise) => exercise.name.toLowerCase().includes(q))
      .slice(0, 30);
  }, [exercisesQuery.data, search]);

  const parsed = useMemo(() => {
    return {
      repRangeMin: parseNullableInt(repRangeMin),
      repRangeMax: parseNullableInt(repRangeMax),
      incrementOverride: parseNullablePositiveUserWeightLbs(incrementOverride, unitSystem),
      maxJumpPerSession: parseNullablePositiveUserWeightLbs(maxJumpPerSession, unitSystem)
    };
  }, [repRangeMin, repRangeMax, incrementOverride, maxJumpPerSession, unitSystem]);

  const canSave = Boolean(selectedExerciseId);

  return (
    <Screen
      fixedFooter={
        selectedExerciseId ? (
          <PrimaryButton
            label="Save"
            loading={updateMutation.isPending}
            onPress={() =>
              updateMutation.mutate({
                exerciseId: selectedExerciseId,
                progressionStrategy,
                repRangeMin: parsed.repRangeMin,
                repRangeMax: parsed.repRangeMax,
                incrementOverride: parsed.incrementOverride,
                maxJumpPerSession: parsed.maxJumpPerSession,
                bodyweightProgressionMode
              })
            }
            disabled={!canSave}
          />
        ) : null
      }
      fixedFooterHeight={56}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Exercise Progression Settings</Text>
        <Text style={styles.subtitle}>Override progression rules for a specific exercise.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Choose an exercise</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises…"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
        />
        {exercisesQuery.isLoading ? <Text style={styles.muted}>Loading exercises…</Text> : null}
        {exercisesQuery.isError ? <Text style={styles.errorText}>Unable to load exercises.</Text> : null}
        <View style={styles.exerciseList}>
          {filteredExercises.map((exercise) => {
            const selected = selectedExerciseId === exercise.id;
            return (
              <Pressable
                key={exercise.id}
                onPress={() => setSelectedExerciseId(exercise.id)}
                style={[styles.exerciseRow, selected && styles.exerciseRowSelected]}
              >
                <Text style={[styles.exerciseLabel, selected && styles.exerciseLabelSelected]}>{exercise.name}</Text>
                <Text style={styles.exerciseMeta}>{exercise.equipmentType ?? "unknown"}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {selectedExerciseId ? (
        <View style={styles.card}>
          {settingsQuery.isLoading ? <Text style={styles.muted}>Loading settings…</Text> : null}
          {settingsQuery.isError ? <Text style={styles.errorText}>Unable to load exercise settings.</Text> : null}

          <Text style={styles.sectionTitle}>Primary</Text>
          <ChipSelect
            label="Progression strategy"
            options={progressionStrategies}
            value={progressionStrategy}
            onChange={(next) => setProgressionStrategy(next as ProgressionStrategy | null)}
            allowNull
          />
          <NumberInputRow label="Rep range min" value={repRangeMin} onChange={setRepRangeMin} />
          <NumberInputRow label="Rep range max" value={repRangeMax} onChange={setRepRangeMax} />
          <NumberInputRow label={`Increment override (${unitLabel})`} value={incrementOverride} onChange={setIncrementOverride} />

          <Pressable onPress={() => setShowAdvanced((prev) => !prev)} style={styles.advancedToggle}>
            <Text style={styles.advancedToggleLabel}>{showAdvanced ? "Hide advanced" : "Show advanced"}</Text>
          </Pressable>

          {showAdvanced ? (
            <>
              <Text style={styles.sectionTitle}>Advanced</Text>
              <NumberInputRow
                label={`Max jump per session (${unitLabel})`}
                value={maxJumpPerSession}
                onChange={setMaxJumpPerSession}
                helper="Caps the size of a single weight increase."
              />
              <ChipSelect
                label="Bodyweight progression mode"
                options={bodyweightProgressionModes}
                value={bodyweightProgressionMode}
                onChange={(next) => setBodyweightProgressionMode(next as BodyweightProgressionMode | null)}
                allowNull
              />
            </>
          ) : null}
        </View>
      ) : null}
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
  exerciseList: {
    gap: spacing.sm
  },
  exerciseRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: colors.background,
    gap: spacing.xs
  },
  exerciseRowSelected: {
    borderColor: colors.accent
  },
  exerciseLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  exerciseLabelSelected: {
    color: colors.accent
  },
  exerciseMeta: {
    color: colors.textSecondary,
    fontSize: 12
  },
  advancedToggle: {
    paddingVertical: spacing.sm
  },
  advancedToggleLabel: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "700"
  },
  muted: {
    color: colors.textSecondary
  },
  errorText: {
    color: colors.danger
  }
});

