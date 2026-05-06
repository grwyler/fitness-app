import { useMemo, useState } from "react";
import { FlatList, ScrollView, StyleSheet, View } from "react-native";
import type { ExerciseCatalogItemDto } from "@fitness/shared";
import { AppText } from "../../../components/AppText";
import { Button } from "../../../components/Button";
import { Chip } from "../../../components/Chip";
import { Input } from "../../../components/Input";
import { ListRow } from "../../../components/ListRow";
import { ModalSheet } from "../../../components/ModalSheet";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { colors, spacing } from "../../../theme/tokens";

type FilterOption = { key: string; label: string; count: number };

function normalizeFilterKey(value: string) {
  return value.trim().toLowerCase();
}

function buildTopFilterOptions(input: { values: Array<string | null | undefined>; limit: number }): FilterOption[] {
  const counts = new Map<string, { label: string; count: number }>();

  for (const rawValue of input.values) {
    const value = rawValue?.trim();
    if (!value) {
      continue;
    }

    const key = normalizeFilterKey(value);
    const existing = counts.get(key);
    if (existing) {
      existing.count++;
      continue;
    }

    counts.set(key, { label: value, count: 1 });
  }

  return Array.from(counts.entries())
    .map(([key, value]) => ({ key, label: value.label, count: value.count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, input.limit);
}

function buildExerciseMeta(exercise: ExerciseCatalogItemDto) {
  return [exercise.category, exercise.primaryMuscleGroup, exercise.equipmentType].filter(Boolean).join(" \u00b7 ");
}

export function ExercisePickerModal(props: {
  visible: boolean;
  title?: string;
  subtitle?: string;
  exercises: ExerciseCatalogItemDto[];
  loading: boolean;
  onClose: () => void;
  onSelect: (exercise: ExerciseCatalogItemDto) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<string | null>(null);

  const categoryOptions = useMemo(
    () => buildTopFilterOptions({ values: props.exercises.map((exercise) => exercise.category), limit: 10 }),
    [props.exercises]
  );

  const muscleGroupOptions = useMemo(
    () => buildTopFilterOptions({ values: props.exercises.map((exercise) => exercise.primaryMuscleGroup), limit: 12 }),
    [props.exercises]
  );

  const equipmentOptions = useMemo(
    () => buildTopFilterOptions({ values: props.exercises.map((exercise) => exercise.equipmentType), limit: 12 }),
    [props.exercises]
  );

  const hasAnyFilter = Boolean(selectedCategory || selectedMuscleGroup || selectedEquipmentType);

  const filteredExercises = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return props.exercises.filter((exercise) => {
      if (selectedCategory && normalizeFilterKey(exercise.category) !== selectedCategory) {
        return false;
      }

      if (selectedMuscleGroup && normalizeFilterKey(exercise.primaryMuscleGroup ?? "") !== selectedMuscleGroup) {
        return false;
      }

      if (
        selectedEquipmentType &&
        normalizeFilterKey(exercise.equipmentType ?? "") !== selectedEquipmentType
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const aliasText = exercise.aliases?.length ? exercise.aliases.join(" ") : "";
      const haystack = `${exercise.name} ${exercise.category} ${exercise.primaryMuscleGroup ?? ""} ${
        exercise.equipmentType ?? ""
      } ${aliasText}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [props.exercises, searchQuery, selectedCategory, selectedEquipmentType, selectedMuscleGroup]);

  function clearFilters() {
    setSelectedCategory(null);
    setSelectedMuscleGroup(null);
    setSelectedEquipmentType(null);
  }

  function toggleFilter(current: string | null, nextKey: string, setter: (value: string | null) => void) {
    setter(current === nextKey ? null : nextKey);
  }

  return (
    <ModalSheet
      visible={props.visible}
      onClose={props.onClose}
      title={props.title ?? "Add exercise"}
      subtitle={props.subtitle ?? "Search your exercise library"}
      headerRight={
        <PrimaryButton label="Close" onPress={props.onClose} variant="ghost" fullWidth={false} size="sm" />
      }
      contentStyle={styles.sheetContent}
    >
      <View style={styles.searchPanel}>
        <View style={styles.searchHeaderRow}>
          <AppText variant="caption" tone="secondary">
            Exercises
          </AppText>
          <Button
            label={filtersExpanded ? "Hide filters" : hasAnyFilter ? "Filters (on)" : "Filters"}
            onPress={() => setFiltersExpanded((current) => !current)}
            variant="ghost"
            fullWidth={false}
            size="sm"
          />
        </View>
        <Input
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSearchQuery}
          placeholder="Bench press, curl, cable..."
          value={searchQuery}
        />
      </View>

      {filtersExpanded ? (
        <View style={styles.filterPanel}>
          <ScrollView
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <AppText variant="caption" tone="secondary">
              Category
            </AppText>
            {categoryOptions.map((option) => (
              <Chip
                key={`category:${option.key}`}
                label={option.label}
                selected={selectedCategory === option.key}
                onPress={() => toggleFilter(selectedCategory, option.key, setSelectedCategory)}
              />
            ))}
          </ScrollView>

          <ScrollView
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <AppText variant="caption" tone="secondary">
              Muscle
            </AppText>
            {muscleGroupOptions.map((option) => (
              <Chip
                key={`muscle:${option.key}`}
                label={option.label}
                selected={selectedMuscleGroup === option.key}
                onPress={() => toggleFilter(selectedMuscleGroup, option.key, setSelectedMuscleGroup)}
              />
            ))}
          </ScrollView>

          <ScrollView
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <AppText variant="caption" tone="secondary">
              Equipment
            </AppText>
            {equipmentOptions.map((option) => (
              <Chip
                key={`equipment:${option.key}`}
                label={option.label}
                selected={selectedEquipmentType === option.key}
                onPress={() => toggleFilter(selectedEquipmentType, option.key, setSelectedEquipmentType)}
              />
            ))}
            {hasAnyFilter ? <Chip label="Clear" variant="muted" onPress={clearFilters} /> : null}
          </ScrollView>
        </View>
      ) : null}

      <FlatList
        data={props.loading ? [] : filteredExercises}
        keyExtractor={(exercise) => exercise.id}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        style={styles.list}
        ListEmptyComponent={
          props.loading ? (
            <AppText tone="secondary">Loading exercises...</AppText>
          ) : (
            <AppText tone="secondary">No exercises match your search.</AppText>
          )
        }
        renderItem={({ item }) => (
          <ListRow
            title={item.name}
            subtitle={buildExerciseMeta(item)}
            onPress={() => props.onSelect(item)}
            right={<Chip label="Add" variant="selected" />}
            style={styles.listRow}
          />
        )}
      />
      <AppText variant="meta" tone="tertiary" style={styles.footerHint}>
        Tip: add one exercise at a time, then tweak sets/reps right in the day.
      </AppText>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  sheetContent: {
    flex: 1,
    gap: spacing.md
  },
  searchPanel: {
    gap: spacing.xs
  },
  searchHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  filterPanel: {
    gap: spacing.xs
  },
  filterRow: {
    alignItems: "center",
    gap: spacing.xs
  },
  list: {
    flex: 1,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: colors.surface
  },
  listContent: {
    paddingBottom: spacing.sm
  },
  listRow: {
    paddingHorizontal: spacing.md
  },
  footerHint: {
    textAlign: "center"
  }
});
