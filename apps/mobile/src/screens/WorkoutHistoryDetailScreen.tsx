import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { formatWeightForUser, type ExerciseLoggingModality, type UnitSystem } from "@fitness/shared";
import { StyleSheet, Text, View } from "react-native";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { Screen } from "../components/Screen";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { useProgression } from "../features/workout/hooks/useProgression";
import { useTrainingSettings } from "../features/workout/hooks/useTrainingSettings";
import { useWorkoutHistoryDetail } from "../features/workout/hooks/useWorkoutHistoryDetail";
import {
  buildWorkoutDetailProgressHighlights,
  getCompletedSetVolume,
  getUnusualWorkoutPerformanceItems,
  getWorkoutDetailStats
} from "../features/workout/utils/history-detail.shared";
import { colors, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "WorkoutHistoryDetail">;

function formatCompletedDate(value: string | null) {
  if (!value) {
    return "Completion time unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDuration(durationSeconds: number | null) {
  if (!durationSeconds) {
    return "Duration unavailable";
  }

  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${minutes} min`;
}

function formatSetStatus(status: string) {
  if (status === "completed") {
    return "Done";
  }

  if (status === "failed") {
    return "Missed";
  }

  if (status === "skipped") {
    return "Skipped";
  }

  return "Not logged";
}

function formatSetEffort(input: { rir: string | null; failureStatus: string | null }) {
  const parts: string[] = [];
  if (input.failureStatus) {
    parts.push(
      input.failureStatus === "muscular_failure"
        ? "Failure"
        : input.failureStatus === "technical_failure"
          ? "Tech fail"
          : "Stopped early"
    );
  }
  if (input.rir) {
    parts.push(input.rir === "rir_5_plus" ? "RIR 5+" : `RIR ${input.rir.replace("rir_", "")}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function formatDurationSecondsCompact(durationSeconds: number) {
  const safe = Math.max(0, Math.floor(durationSeconds));
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function formatDistanceCompact(distanceMeters: number, unitSystem: UnitSystem) {
  const raw = unitSystem === "metric" ? distanceMeters / 1000 : distanceMeters / 1609.344;
  const value = Number.isFinite(raw) ? raw : 0;
  const text = value.toFixed(value >= 100 ? 1 : 2).replace(/0+$/, "").replace(/\.$/, "");
  return `${text} ${unitSystem === "metric" ? "km" : "mi"}`;
}

function formatExercisePrescriptionLine(input: {
  modality: ExerciseLoggingModality;
  exercise: {
    targetSets: number;
    targetReps: number | null;
    targetWeight: { value: number } | null;
    targetDurationSeconds?: number | null;
    targetDistanceMeters?: number | null;
    targetRounds?: number | null;
  };
  unitSystem: UnitSystem;
}) {
  const { exercise, modality, unitSystem } = input;
  const targetWeightText =
    exercise.targetWeight?.value != null
      ? formatWeightForUser({ weightLbs: exercise.targetWeight.value, unitSystem }).text
      : null;

  if (modality === "reps_load") {
    return `${exercise.targetSets} x ${exercise.targetReps ?? "—"} at ${targetWeightText ?? "—"}`;
  }

  if (modality === "reps_only") {
    const weightSuffix = targetWeightText && exercise.targetWeight?.value ? ` + ${targetWeightText}` : "";
    return `${exercise.targetSets} x ${exercise.targetReps ?? "—"} reps${weightSuffix}`;
  }

  if (modality === "time" || modality === "hold") {
    const duration =
      exercise.targetDurationSeconds != null
        ? formatDurationSecondsCompact(exercise.targetDurationSeconds)
        : "—";
    return `${exercise.targetSets} x ${duration}`;
  }

  if (modality === "time_distance") {
    const duration =
      exercise.targetDurationSeconds != null
        ? formatDurationSecondsCompact(exercise.targetDurationSeconds)
        : null;
    const distance =
      exercise.targetDistanceMeters != null
        ? formatDistanceCompact(exercise.targetDistanceMeters, unitSystem)
        : null;
    const parts = [distance, duration].filter(Boolean).join(" in ");
    return `${exercise.targetSets} x ${parts || "—"}`;
  }

  if (modality === "distance") {
    const distance =
      exercise.targetDistanceMeters != null
        ? formatDistanceCompact(exercise.targetDistanceMeters, unitSystem)
        : "—";
    return `${exercise.targetSets} x ${distance}`;
  }

  // interval
  const rounds = exercise.targetRounds != null ? `${exercise.targetRounds} rounds` : null;
  const duration =
    exercise.targetDurationSeconds != null ? formatDurationSecondsCompact(exercise.targetDurationSeconds) : null;
  const parts = [rounds, duration].filter(Boolean).join(" · ");
  return `${exercise.targetSets} x ${parts || "—"}`;
}

function formatSetSummaryLine(input: {
  modality: ExerciseLoggingModality;
  set: {
    status: string;
    targetReps: number | null;
    actualReps: number | null;
    targetWeight: { value: number } | null;
    actualWeight: { value: number } | null;
    targetDurationSeconds?: number | null;
    actualDurationSeconds?: number | null;
    targetDistanceMeters?: number | null;
    actualDistanceMeters?: number | null;
    targetRounds?: number | null;
    actualRounds?: number | null;
  };
  unitSystem: UnitSystem;
}) {
  const { set, modality, unitSystem } = input;
  const isLogged = set.status !== "pending";

  if (modality === "reps_load") {
    const planned = `planned ${set.targetReps ?? "—"} reps at ${formatWeightForUser({
      weightLbs: set.targetWeight?.value ?? 0,
      unitSystem
    }).text}`;
    if (!isLogged) return `Not logged - ${planned}`;

    return `${set.actualReps ?? 0} reps at ${formatWeightForUser({
      weightLbs: set.actualWeight?.value ?? set.targetWeight?.value ?? 0,
      unitSystem
    }).text}`;
  }

  if (modality === "reps_only") {
    const plannedWeight = set.targetWeight?.value
      ? ` + ${formatWeightForUser({ weightLbs: set.targetWeight.value, unitSystem }).text}`
      : "";
    const planned = `planned ${set.targetReps ?? "—"} reps${plannedWeight}`;
    if (!isLogged) return `Not logged - ${planned}`;

    const actualWeightSuffix = set.actualWeight?.value
      ? ` + ${formatWeightForUser({ weightLbs: set.actualWeight.value, unitSystem }).text}`
      : "";
    return `${set.actualReps ?? 0} reps${actualWeightSuffix}`;
  }

  if (modality === "time" || modality === "hold") {
    const planned =
      set.targetDurationSeconds != null ? formatDurationSecondsCompact(set.targetDurationSeconds) : "—";
    if (!isLogged) return `Not logged - planned ${planned}`;

    const actual = set.actualDurationSeconds != null ? formatDurationSecondsCompact(set.actualDurationSeconds) : planned;
    return actual;
  }

  if (modality === "time_distance") {
    const plannedDuration =
      set.targetDurationSeconds != null ? formatDurationSecondsCompact(set.targetDurationSeconds) : null;
    const plannedDistance =
      set.targetDistanceMeters != null ? formatDistanceCompact(set.targetDistanceMeters, unitSystem) : null;
    const plannedParts = [plannedDistance, plannedDuration].filter(Boolean).join(" in ");
    if (!isLogged) return `Not logged - planned ${plannedParts || "—"}`;

    const duration = set.actualDurationSeconds != null ? formatDurationSecondsCompact(set.actualDurationSeconds) : null;
    const distance = set.actualDistanceMeters != null ? formatDistanceCompact(set.actualDistanceMeters, unitSystem) : null;
    const actualParts = [distance, duration].filter(Boolean).join(" in ");
    return actualParts || plannedParts || "—";
  }

  if (modality === "distance") {
    const plannedDistance =
      set.targetDistanceMeters != null ? formatDistanceCompact(set.targetDistanceMeters, unitSystem) : "—";
    if (!isLogged) return `Not logged - planned ${plannedDistance}`;

    const actualDistance =
      set.actualDistanceMeters != null ? formatDistanceCompact(set.actualDistanceMeters, unitSystem) : plannedDistance;
    const duration = set.actualDurationSeconds != null ? ` in ${formatDurationSecondsCompact(set.actualDurationSeconds)}` : "";
    return `${actualDistance}${duration}`;
  }

  // interval
  const plannedRounds = set.targetRounds != null ? `${set.targetRounds} rounds` : null;
  const plannedDuration =
    set.targetDurationSeconds != null ? formatDurationSecondsCompact(set.targetDurationSeconds) : null;
  const planned = [plannedRounds, plannedDuration].filter(Boolean).join(" · ") || "—";
  if (!isLogged) return `Not logged - planned ${planned}`;

  const rounds = set.actualRounds != null ? `${set.actualRounds} rounds` : null;
  const duration = set.actualDurationSeconds != null ? formatDurationSecondsCompact(set.actualDurationSeconds) : null;
  return [rounds, duration].filter(Boolean).join(" · ") || planned;
}

export function WorkoutHistoryDetailScreen({ route, navigation }: Props) {
  const detailQuery = useWorkoutHistoryDetail(route.params.sessionId);
  const progressionQuery = useProgression();
  const trainingSettingsQuery = useTrainingSettings();
  const unitSystem = trainingSettingsQuery.data?.unitSystem ?? "imperial";

  if (detailQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading workout detail..." />
      </Screen>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <Screen>
        <ErrorState
          title="Workout unavailable"
          message="We couldn't load this completed workout."
          actionLabel="Back to history"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  const detail = detailQuery.data;
  const workout = detail.workoutSession;
  const progressionRecommendationEvents = detail.progressionRecommendationEvents ?? [];
  const progressHighlights = buildWorkoutDetailProgressHighlights({
    workout,
    progression: progressionQuery.data,
    unitSystem
  });
  const unusualPerformanceItems = getUnusualWorkoutPerformanceItems({ workout, unitSystem });
  const progressHighlightsByEntryId = progressHighlights.reduce<Record<string, string>>((accumulator, item) => {
    accumulator[item.exerciseEntryId] = item.text;
    return accumulator;
  }, {});
  const stats = getWorkoutDetailStats(workout);
  const exerciseNameByEntryId = workout.exercises.reduce<Record<string, string>>((accumulator, exercise) => {
    accumulator[exercise.id] = exercise.exerciseName;
    return accumulator;
  }, {});
  const recommendationAuditEvents = progressionRecommendationEvents.filter((event) => {
    const reasonCodes = event.reasonCodes ?? [];
    const resolvable =
      event.confidence === "low" ||
      event.result === "recalibrated" ||
      reasonCodes.includes("REPS_GREATLY_EXCEEDED_TARGET") ||
      reasonCodes.includes("CONFLICTING_EFFORT_SIGNALS") ||
      reasonCodes.includes("MIN_CONFIDENCE_GATE_BLOCKED_INCREASE");

    return event.resolutionType !== "unresolved" || resolvable;
  });

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Workout detail</Text>
        <Text style={styles.title}>{workout.workoutName}</Text>
        <Text style={styles.subtitle}>{workout.programName}</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.cardLabel}>Completed</Text>
        <Text style={styles.cardTitle}>{formatCompletedDate(workout.completedAt)}</Text>
        <Text style={styles.cardBody}>
          {formatDuration(workout.durationSeconds)} - {workout.exercises.length} exercises -{" "}
          {stats.completedSetCount}/{stats.plannedSetCount} sets
        </Text>
        {workout.isPartial ? <Text style={styles.warningText}>Finished early</Text> : null}
        {stats.failedSetCount > 0 ? (
          <Text style={styles.warningText}>{stats.failedSetCount} missed sets</Text>
        ) : null}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryStat}>
            <Text style={styles.cardLabel}>Volume</Text>
            <Text style={styles.summaryValue}>
              {formatWeightForUser({
                weightLbs: stats.totalVolume,
                unitSystem,
                maximumFractionDigits: 0,
                useGrouping: true
              }).text}
            </Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.cardLabel}>Outcome</Text>
            <Text style={styles.summaryValue}>
              {progressHighlights.length > 0 ? `${progressHighlights.length} improved` : "Saved"}
            </Text>
          </View>
        </View>
        {progressHighlights.length > 0 ? (
          <View style={styles.highlightList}>
            {progressHighlights.slice(0, 4).map((highlight) => (
              <Text key={highlight.exerciseEntryId} style={styles.highlightPill}>
                {highlight.text}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      {unusualPerformanceItems.length > 0 ? (
        <View style={styles.reviewCard}>
          <Text style={styles.reviewLabel}>Review</Text>
          <Text style={styles.reviewTitle}>Unusual performance detected</Text>
          <Text style={styles.reviewBody}>
            This workout included a large mismatch between prescribed targets and what was logged. This can affect future progression.
          </Text>

          {unusualPerformanceItems.slice(0, 2).map((item) => (
            <View key={item.exerciseEntryId} style={styles.reviewItem}>
              <Text style={styles.reviewItemTitle}>{item.exerciseName}</Text>
              <Text style={styles.reviewBody}>{item.message}</Text>
              <View style={styles.reviewEvidenceList}>
                {item.evidence.slice(0, 3).map((line, index) => (
                  <Text key={`${item.exerciseEntryId}:review:${index}`} style={styles.reviewEvidenceItem}>
                    {"\u2022"} {line}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {recommendationAuditEvents.length > 0 ? (
        <View style={styles.auditCard}>
          <Text style={styles.cardLabel}>Progression</Text>
          <Text style={styles.cardTitle}>Recommendation history</Text>
          <Text style={styles.cardBody}>
            Shows the original recommendation and how it was resolved.
          </Text>

          {recommendationAuditEvents.map((event) => {
            const exerciseName = exerciseNameByEntryId[event.exerciseEntryId] ?? "Exercise";
            const original = event.originalRecommendation;
            const final = event.resolution?.final ?? event.originalRecommendation;
            const originalWeightText = formatWeightForUser({ weightLbs: original.nextWeight.value, unitSystem }).text;
            const finalWeightText = formatWeightForUser({ weightLbs: final.nextWeight.value, unitSystem }).text;
            const originalRepText = original.nextRepGoal != null ? `${original.nextRepGoal} reps` : null;
            const finalRepText = final.nextRepGoal != null ? `${final.nextRepGoal} reps` : null;

            return (
              <View key={event.id} style={styles.auditItem}>
                <Text style={styles.auditTitle}>{exerciseName}</Text>
                <Text style={styles.auditBody}>
                  Original next: {originalWeightText}
                  {originalRepText ? ` · ${originalRepText}` : ""}
                </Text>
                {event.resolutionType === "unresolved" ? (
                  <Text style={styles.auditUnresolved}>
                    Unresolved · created {formatCompletedDate(event.createdAt)}
                  </Text>
                ) : (
                  <>
                    <Text style={styles.auditResolved}>
                      Resolved: {event.resolutionType.replace(/_/g, " ")}
                    </Text>
                    <Text style={styles.auditMeta}>
                      {event.resolution?.resolvedAt ? `Resolved ${formatCompletedDate(event.resolution.resolvedAt)}` : ""}
                    </Text>
                    <Text style={styles.auditBody}>
                      Final next: {finalWeightText}
                      {finalRepText ? ` · ${finalRepText}` : ""}
                    </Text>
                    {event.resolution?.note ? (
                      <Text style={styles.auditNote}>{event.resolution.note}</Text>
                    ) : null}
                  </>
                )}
              </View>
            );
          })}
        </View>
      ) : null}

      {workout.exercises.map((exercise) => {
        const highlight = progressHighlightsByEntryId[exercise.id];
        const exerciseVolume = exercise.sets.reduce((sum, set) => sum + getCompletedSetVolume(set), 0);
        const modality = exercise.loggingModality ?? "reps_load";

        return (
          <View key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseTitleRow}>
                <Text style={styles.exerciseTitle}>{exercise.exerciseName}</Text>
                {highlight ? <Text style={styles.exerciseHighlight}>{highlight}</Text> : null}
              </View>
              <Text style={styles.exerciseMeta}>
                {formatExercisePrescriptionLine({ modality, exercise, unitSystem })}
              </Text>
              <Text style={styles.exerciseMeta}>
                {formatWeightForUser({
                  weightLbs: exerciseVolume,
                  unitSystem,
                  maximumFractionDigits: 0,
                  useGrouping: true
                }).text}{" "}
                volume
              </Text>
            </View>

            {exercise.sets.map((set) => (
              <View key={set.id} style={styles.setRow}>
                <Text style={styles.setTitle}>Set {set.setNumber}</Text>
                <Text style={styles.setMeta}>
                  {formatSetSummaryLine({ modality, set, unitSystem })}
                  {formatSetEffort({ rir: set.rir, failureStatus: set.failureStatus })
                    ? ` \u2022 ${formatSetEffort({ rir: set.rir, failureStatus: set.failureStatus })}`
                    : ""}
                </Text>
                <Text
                  style={[
                    styles.setStatus,
                    set.status === "completed" && styles.setStatusComplete,
                    set.status === "failed" && styles.setStatusFailed
                  ]}
                >
                  {formatSetStatus(set.status)}
                </Text>
              </View>
            ))}

            <Text style={styles.feedbackText}>
              Feedback: {exercise.effortFeedback ? exercise.effortFeedback.replace("_", " ") : "Not recorded"}
            </Text>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.sm
  },
  eyebrow: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: "600",
    lineHeight: 36
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  cardLabel: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "600"
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22
  },
  warningText: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "600"
  },
  reviewCard: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.warning,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  reviewLabel: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  reviewTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700"
  },
  reviewBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  reviewItem: {
    gap: spacing.xs,
    paddingTop: spacing.xs
  },
  reviewItemTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700"
  },
  reviewEvidenceList: {
    gap: 4
  },
  reviewEvidenceItem: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18
  },
  auditCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  auditItem: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 4,
    paddingTop: spacing.sm
  },
  auditTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700"
  },
  auditBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  auditMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600"
  },
  auditUnresolved: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: "700"
  },
  auditResolved: {
    color: colors.success,
    fontSize: 13,
    fontWeight: "700"
  },
  auditNote: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  summaryStat: {
    backgroundColor: colors.background,
    borderRadius: 12,
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 120,
    padding: spacing.md
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "600"
  },
  highlightList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  highlightPill: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  exerciseHeader: {
    gap: spacing.xs
  },
  exerciseTitleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  exerciseTitle: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 22,
    fontWeight: "600",
    minWidth: 150
  },
  exerciseHighlight: {
    backgroundColor: colors.success,
    borderRadius: 999,
    color: colors.surface,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  exerciseMeta: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600"
  },
  setRow: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 12,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  setTitle: {
    color: colors.textPrimary,
    flexBasis: 56,
    flexShrink: 0,
    fontSize: 15,
    fontWeight: "600"
  },
  setMeta: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 15,
    fontWeight: "600"
  },
  setStatus: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    color: colors.textSecondary,
    flexShrink: 0,
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 5
  },
  setStatusComplete: {
    backgroundColor: colors.success,
    color: colors.surface
  },
  setStatusFailed: {
    backgroundColor: colors.danger,
    color: colors.surface
  },
  feedbackText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize"
  }
});
