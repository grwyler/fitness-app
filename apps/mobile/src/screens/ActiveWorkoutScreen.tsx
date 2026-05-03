import { useEffect, useRef, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ExerciseEntryDto, RecoveryState, SetDto } from "@fitness/shared";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { AppText } from "../components/AppText";
import { Card } from "../components/Card";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { Screen } from "../components/Screen";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { PrimaryButton } from "../components/PrimaryButton";
import { WorkoutExerciseCard } from "../components/WorkoutExerciseCard";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { FeedbackButton } from "../features/feedback/components/FeedbackButton";
import { useCurrentWorkout } from "../features/workout/hooks/useCurrentWorkout";
import { useLogSet } from "../features/workout/hooks/useLogSet";
import { useUpdateLoggedSet } from "../features/workout/hooks/useUpdateLoggedSet";
import { useCompleteWorkout } from "../features/workout/hooks/useCompleteWorkout";
import { useCancelWorkout } from "../features/workout/hooks/useCancelWorkout";
import { CustomExercisePickerModal } from "../features/workout/components/CustomExercisePickerModal";
import { useAddCustomWorkoutExercise } from "../features/workout/hooks/useCustomWorkoutExercises";
import { useExercises } from "../features/workout/hooks/useExercises";
import { useAddWorkoutSet, useDeleteWorkoutSet } from "../features/workout/hooks/useWorkoutSets";
import { useTrainingSettings } from "../features/workout/hooks/useTrainingSettings";
import { useActiveWorkoutStore } from "../features/workout/store/active-workout-store";
import { type CustomWorkoutBuilderMode } from "../features/workout/utils/custom-workout-builder.shared";
import { buildProgramDayWorkoutFromCustomSession } from "../features/workout/utils/program-creator.shared";
import {
  buildCompleteWorkoutRequest,
  getFinishWorkoutPressAction,
  getWorkoutDiscardErrorMessage,
  getWorkoutCompletionErrorMessage,
  getWorkoutCompletionUiState
} from "../features/workout/utils/active-workout-screen.shared";
import {
  buildLogSetRequestFromDraft,
  formatRestTimer,
  getRestDurationSeconds,
  getRestTimerSecondsRemaining,
  isMaterialOverperformanceLog,
  type SetLogDraft
} from "../features/workout/utils/set-logging.shared";
import { colors, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "ActiveWorkout">;

type RestTimerState = {
  exerciseName: string;
  endAtMs: number;
  setNumber: number;
} | null;

export function ActiveWorkoutScreen({ navigation, route }: Props) {
  useEffect(() => {
    if (Platform.OS === "web") {
      return undefined;
    }

    void (async () => {
      try {
        await activateKeepAwakeAsync();
      } catch {
        // Best-effort only; keep-awake is non-critical.
      }
    })();

    return () => {
      try {
        deactivateKeepAwake();
      } catch {
        // Ignore.
      }
    };
  }, []);

  const currentWorkoutQuery = useCurrentWorkout();
  const trainingSettingsQuery = useTrainingSettings();
  const logSetMutation = useLogSet();
  const updateLoggedSetMutation = useUpdateLoggedSet();
  const addWorkoutSetMutation = useAddWorkoutSet();
  const deleteWorkoutSetMutation = useDeleteWorkoutSet();
  const addCustomWorkoutExerciseMutation = useAddCustomWorkoutExercise();
  const completeWorkoutMutation = useCompleteWorkout();
  const cancelWorkoutMutation = useCancelWorkout();
  const feedbackByEntryId = useActiveWorkoutStore((state) => state.exerciseFeedbackByEntryId);
  const setExerciseFeedback = useActiveWorkoutStore((state) => state.setExerciseFeedback);
  const activeSessionId = useActiveWorkoutStore((state) => state.activeSessionId);
  const setLogDraftsBySetId = useActiveWorkoutStore((state) => state.setLogDraftsBySetId);
  const setSetLogDraft = useActiveWorkoutStore((state) => state.setSetLogDraft);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [submittingSetIds, setSubmittingSetIds] = useState<Record<string, boolean>>({});
  const [deletingSetIds, setDeletingSetIds] = useState<Record<string, boolean>>({});
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [recoveryState, setRecoveryState] = useState<RecoveryState>("normal");
  const [showFinishEarlyConfirmation, setShowFinishEarlyConfirmation] = useState(false);
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [customExerciseError, setCustomExerciseError] = useState<string | null>(null);
  const [programDayWorkoutName, setProgramDayWorkoutName] = useState("");
  const [restTimer, setRestTimer] = useState<RestTimerState>(null);
  const [recentlyLoggedSetId, setRecentlyLoggedSetId] = useState<string | null>(null);
  const [restTimerNowMs, setRestTimerNowMs] = useState(() => Date.now());
  const inFlightSetIds = useRef<Set<string>>(new Set());
  const completionInFlight = useRef(false);
  const discardInFlight = useRef(false);
  const promptedCustomExerciseSessionId = useRef<string | null>(null);
  const [showMissingFeedbackHighlights, setShowMissingFeedbackHighlights] = useState(false);
  const activeWorkout = currentWorkoutQuery.data?.activeWorkoutSession ?? null;
  const unitSystem = trainingSettingsQuery.data?.unitSystem ?? "imperial";
  const exercisesQuery = useExercises(isExercisePickerOpen);
  const customWorkoutBuilderMode: CustomWorkoutBuilderMode = route.params?.mode ?? "start";
  const isProgramDayCustomWorkoutBuilder = customWorkoutBuilderMode === "assignToProgramDay";
  const programDayNumber = route.params?.programDayNumber ?? null;

  useEffect(() => {
    if (!restTimer) {
      return undefined;
    }

    setRestTimerNowMs(Date.now());

    const interval = setInterval(() => {
      setRestTimerNowMs(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [restTimer?.endAtMs]);

  const restSecondsRemaining = restTimer
    ? getRestTimerSecondsRemaining({ endAtMs: restTimer.endAtMs, nowMs: restTimerNowMs })
    : 0;

  useEffect(() => {
    if (!recentlyLoggedSetId) {
      return;
    }

    const timeout = setTimeout(() => setRecentlyLoggedSetId(null), 1200);
    return () => clearTimeout(timeout);
  }, [recentlyLoggedSetId]);

  useEffect(() => {
    if (!restTimer) {
      return;
    }

    if (restSecondsRemaining > 0) {
      return;
    }

    setRestTimer(null);
  }, [restSecondsRemaining, restTimer?.endAtMs]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return undefined;
    }

    let wakeLock: { release?: () => Promise<void> } | null = null;
    let isDisposed = false;

    async function requestWakeLock() {
      try {
        const navigatorAny = (globalThis as any).navigator as undefined | { wakeLock?: { request: (type: "screen") => Promise<any> } };
        if (!navigatorAny?.wakeLock?.request) {
          return;
        }

        const lock = await navigatorAny.wakeLock.request("screen");
        if (isDisposed) {
          await lock.release?.();
          return;
        }

        wakeLock = lock;
      } catch {
        // Best effort: some browsers require HTTPS and user gesture.
      }
    }

    requestWakeLock();

    const documentAny = (globalThis as any).document as
      | undefined
      | {
          visibilityState?: string;
          addEventListener?: (event: string, handler: () => void) => void;
          removeEventListener?: (event: string, handler: () => void) => void;
        };

    function handleVisibilityChange() {
      if (documentAny?.visibilityState === "visible") {
        void requestWakeLock();
      }
    }

    documentAny?.addEventListener?.("visibilitychange", handleVisibilityChange);

    return () => {
      documentAny?.removeEventListener?.("visibilitychange", handleVisibilityChange);
      isDisposed = true;
      void wakeLock?.release?.();
    };
  }, []);

  useEffect(() => {
    if (
      activeWorkout?.sessionType === "custom" &&
      activeWorkout.exercises.length === 0 &&
      promptedCustomExerciseSessionId.current !== activeWorkout.id
    ) {
      promptedCustomExerciseSessionId.current = activeWorkout.id;
      setIsExercisePickerOpen(true);
    }
  }, [activeWorkout?.exercises.length, activeWorkout?.id, activeWorkout?.sessionType]);

  if (currentWorkoutQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading your active workout..." />
      </Screen>
    );
  }

  if (currentWorkoutQuery.isError) {
    return (
      <Screen>
        <ErrorState
          title="Workout unavailable"
          message="We couldn't load the active workout."
          actionLabel="Back to dashboard"
          onAction={() => navigation.navigate("Dashboard")}
        />
      </Screen>
    );
  }

  if (!activeWorkout) {
    return (
      <Screen>
        <ErrorState
          title="No active workout"
          message="Start a workout from the dashboard to begin logging sets."
          actionLabel="Back to dashboard"
          onAction={() => navigation.navigate("Dashboard")}
        />
      </Screen>
    );
  }

  const workout = activeWorkout;
  const totalPlannedSets = workout.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  const loggedSetCount = workout.exercises.reduce(
    (total, exercise) => total + exercise.sets.filter((set) => set.status !== "pending").length,
    0
  );
  const remainingSetCount = Math.max(0, totalPlannedSets - loggedSetCount);
  const availableCustomExercises = (exercisesQuery.data ?? []).filter(
    (exercise) => !workout.exercises.some((entry) => entry.exerciseId === exercise.id)
  );

  const hasPendingSetSave =
    logSetMutation.isPending ||
    updateLoggedSetMutation.isPending ||
    addWorkoutSetMutation.isPending ||
    deleteWorkoutSetMutation.isPending ||
    Object.keys(submittingSetIds).length > 0 ||
    Object.keys(deletingSetIds).length > 0 ||
    inFlightSetIds.current.size > 0;
  const completionUiState = getWorkoutCompletionUiState(workout, feedbackByEntryId, {
    hasPendingSetSave
  });
  const showFinishEarlyFeedbackWarning = completionUiState.missingEffortFeedbackCompletedExerciseCount > 0;

  const missingFeedbackExerciseEntryIds = new Set(
    workout.exercises
      .filter((exercise) => {
        if (exercise.sets.length === 0) {
          return false;
        }

        const isFullyCompleted = exercise.sets.every((set) => set.status === "completed" || set.status === "failed");
        if (!isFullyCompleted) {
          return false;
        }

        return feedbackByEntryId[exercise.id] === undefined;
      })
      .map((exercise) => exercise.id)
  );

  const restTimerCard = restTimer ? (
    <Card variant="hero" style={styles.restTimerCard} padding="sm">
      <View style={styles.restTimerTextGroup}>
        <AppText variant="sectionLabel" tone="inverse">
          {restSecondsRemaining > 0 ? "Rest timer" : "Rest done"}
        </AppText>
        <AppText variant="meta" tone="inverse" style={styles.restTimerTitle}>
          {restTimer.exerciseName} after set {restTimer.setNumber}
        </AppText>
      </View>
      <View style={styles.restTimerValueGroup}>
        <AppText variant="headline" tone="inverse" style={styles.restTimerValue}>
          {formatRestTimer(restSecondsRemaining)}
        </AppText>
        <PrimaryButton label="Skip" onPress={() => setRestTimer(null)} variant="ghost" fullWidth={false} size="sm" />
      </View>
    </Card>
  ) : null;

  function handleLogSet(exercise: ExerciseEntryDto, set: SetDto, draft: SetLogDraft) {
    if (submittingSetIds[set.id] || inFlightSetIds.current.has(set.id) || set.status !== "pending") {
      return;
    }

    const request = buildLogSetRequestFromDraft(draft, { unitSystem });
    if (!request) {
      return;
    }

    inFlightSetIds.current.add(set.id);
    setSubmittingSetIds((current) => ({
      ...current,
      [set.id]: true
    }));
    const loggedWeightValue = request.actualWeight?.value ?? set.targetWeight.value;
    const isOverperformanceSet = isMaterialOverperformanceLog({
      actualReps: request.actualReps,
      actualWeightValue: loggedWeightValue,
      targetWeightValue: set.targetWeight.value
    });
    setLastAction(
      request.actualReps >= set.targetReps || isOverperformanceSet
        ? `completed_set:${set.id}`
        : `missed_set:${set.id}`
    );
    const hasAnotherPendingSet = exercise.sets.some(
      (candidate) => candidate.setNumber > set.setNumber && candidate.status === "pending"
    );
    const restSeconds = getRestDurationSeconds({
      restSeconds: exercise.restSeconds,
      exerciseCategory: exercise.category
    });
    if (hasAnotherPendingSet) {
      setRestTimer({
        exerciseName: exercise.exerciseName,
        endAtMs: Date.now() + restSeconds * 1000,
        setNumber: set.setNumber
      });
    } else {
      setRestTimer(null);
    }
    logSetMutation.mutate(
      {
        setId: set.id,
        request
      },
      {
        onSuccess: () => {
          setRecentlyLoggedSetId(set.id);
        },
        onSettled: () => {
          inFlightSetIds.current.delete(set.id);
          setSubmittingSetIds((current) => {
            const next = { ...current };
            delete next[set.id];
            return next;
          });
        }
      }
    );
  }

  function handleStartEditSet(set: SetDto) {
    if (submittingSetIds[set.id] || inFlightSetIds.current.has(set.id) || set.status === "pending") {
      return;
    }

    setLastAction(`start_edit_set:${set.id}`);
    setEditingSetId(set.id);
  }

  function handleCancelEditSet(set: SetDto) {
    if (editingSetId !== set.id) {
      return;
    }

    setEditingSetId(null);
  }

  function handleUpdateLoggedSet(exercise: ExerciseEntryDto, set: SetDto, draft: SetLogDraft) {
    if (
      submittingSetIds[set.id] ||
      inFlightSetIds.current.has(set.id) ||
      set.status === "pending" ||
      editingSetId !== set.id
    ) {
      return;
    }

    const request = buildLogSetRequestFromDraft(draft, { unitSystem });
    if (!request) {
      return;
    }

    inFlightSetIds.current.add(set.id);
    setSubmittingSetIds((current) => ({
      ...current,
      [set.id]: true
    }));

    const loggedWeightValue = request.actualWeight?.value ?? set.targetWeight.value;
    const isOverperformanceSet = isMaterialOverperformanceLog({
      actualReps: request.actualReps,
      actualWeightValue: loggedWeightValue,
      targetWeightValue: set.targetWeight.value
    });
    setLastAction(
      request.actualReps >= set.targetReps || isOverperformanceSet
        ? `edited_completed_set:${set.id}`
        : `edited_missed_set:${set.id}`
    );

    updateLoggedSetMutation.mutate(
      {
        setId: set.id,
        request
      },
      {
        onSettled: () => {
          inFlightSetIds.current.delete(set.id);
          setSubmittingSetIds((current) => {
            const next = { ...current };
            delete next[set.id];
            return next;
          });
        },
        onSuccess: () => {
          setEditingSetId(null);
        }
      }
    );
  }

  function handleAddSet(exercise: ExerciseEntryDto) {
    if (addWorkoutSetMutation.isPending) {
      return;
    }

    setLastAction(`add_set:${exercise.id}`);
    addWorkoutSetMutation.mutate({
      sessionId: workout.id,
      exerciseEntryId: exercise.id
    });
  }

  function handleDeleteSet(set: SetDto) {
    if (deletingSetIds[set.id] || deleteWorkoutSetMutation.isPending || set.status !== "pending") {
      return;
    }

    setLastAction(`delete_set:${set.id}`);
    setDeletingSetIds((current) => ({
      ...current,
      [set.id]: true
    }));
    deleteWorkoutSetMutation.mutate(
      {
        setId: set.id
      },
      {
        onSettled: () => {
          setDeletingSetIds((current) => {
            const next = { ...current };
            delete next[set.id];
            return next;
          });
        }
      }
    );
  }

  function handleCompleteWorkout() {
    if (completionInFlight.current || completeWorkoutMutation.isPending) {
      return;
    }

    completionInFlight.current = true;
    setLastAction("complete_workout");
    setShowFinishEarlyConfirmation(false);
    const request = buildCompleteWorkoutRequest(workout, feedbackByEntryId, {
      finishEarly: completionUiState.hasPendingSets,
      recoveryState
    });

    completeWorkoutMutation.mutate(
      {
        sessionId: workout.id,
        request
      },
      {
        onSuccess: (result) => {
          navigation.replace("WorkoutSummary", {
            summary: result.response.data
          });
        },
        onError: () => {
          completionInFlight.current = false;
        }
      }
    );
  }

  function handleFinishPress() {
    const action = getFinishWorkoutPressAction({
      hasPendingSets: completionUiState.hasPendingSets,
      finishButtonDisabled: completionUiState.finishButtonDisabled
    });

    if (action === "blocked") {
      return;
    }

    if (action === "complete_workout") {
      if (!completionUiState.hasPendingSets && !completionUiState.hasCompleteFeedback) {
        setLastAction("highlight_missing_effort_feedback");
        setShowMissingFeedbackHighlights(true);
        return;
      }
      handleCompleteWorkout();
      return;
    }

    setShowFinishEarlyConfirmation(true);
  }

  function handleDiscardWorkout() {
    if (discardInFlight.current || cancelWorkoutMutation.isPending) {
      return;
    }

    discardInFlight.current = true;
    setLastAction("discard_workout");
    cancelWorkoutMutation.mutate(
      {
        sessionId: workout.id
      },
      {
        onSuccess: () => {
          if (isProgramDayCustomWorkoutBuilder) {
            navigation.navigate("CreateProgram");
            return;
          }

          navigation.replace("Dashboard");
        },
        onError: () => {
          discardInFlight.current = false;
        }
      }
    );
  }

  async function handleAddCustomExercises(input: {
    requests: Array<{
      exerciseId: string;
      targetSets: number;
      targetReps: number;
      targetWeight?: { value: number; unit: "lb" };
    }>;
  }) {
    if (cancelWorkoutMutation.isPending) {
      return;
    }

    if (input.requests.length === 0) {
      setCustomExerciseError("Choose at least one exercise to continue.");
      return;
    }

    try {
      setCustomExerciseError(null);
      setLastAction(`add_custom_exercises:${input.requests.length}`);
      let latestWorkout = workout;

      for (const request of input.requests) {
        const result = await addCustomWorkoutExerciseMutation.mutateAsync({
          sessionId: workout.id,
          request
        });
        latestWorkout = result.response.data;
      }

      if (isProgramDayCustomWorkoutBuilder && programDayNumber) {
        const assignedWorkout = buildProgramDayWorkoutFromCustomSession({
          workout: latestWorkout,
          name: programDayWorkoutName
        });

        discardInFlight.current = true;
        setLastAction(`assign_custom_workout_to_program_day:${programDayNumber}`);
        cancelWorkoutMutation.mutate(
          {
            sessionId: workout.id
          },
          {
            onSuccess: () => {
              setIsExercisePickerOpen(false);
              navigation.navigate("CreateProgram", {
                assignedDayNumber: programDayNumber,
                assignedWorkout,
                assignmentId: `${workout.id}:${programDayNumber}`
              });
            },
            onError: () => {
              discardInFlight.current = false;
            }
          }
        );
        return;
      }

      setIsExercisePickerOpen(false);
    } catch {
      setCustomExerciseError("Exercises were not added. Check your connection and try again.");
    }
  }

  return (
    <Screen fixedFooter={restTimerCard} fixedFooterHeight={restTimer ? 92 : 0}>
      <View style={styles.header}>
        <AppText variant="screenTitle">{workout.workoutName}</AppText>
        <AppText tone="secondary">
          {isProgramDayCustomWorkoutBuilder && programDayNumber
            ? `Building custom workout for Program Day ${programDayNumber}`
            : workout.sessionType === "custom"
            ? workout.exercises.length === 0
              ? "Custom workout started."
              : `${workout.exercises.length} exercises in progress`
            : `${workout.exercises.length} exercises in ${workout.programName}`}
        </AppText>
        {totalPlannedSets > 0 ? (
          <View style={styles.headerStatsRow}>
            <AppText variant="caption" tone={loggedSetCount > 0 ? "success" : "secondary"}>
              {loggedSetCount}/{totalPlannedSets} logged
            </AppText>
            <AppText variant="caption" tone="tertiary">
              /
            </AppText>
            <AppText variant="caption" tone={remainingSetCount === 0 ? "success" : "secondary"}>
              {remainingSetCount} remaining
            </AppText>
          </View>
        ) : null}
      </View>

      {workout.exercises.length === 0 ? (
        <View style={styles.emptyStateCard}>
          <EmptyState
            title="No exercises yet"
            message="Add at least one exercise from your exercise list to start logging sets."
          />
          <PrimaryButton
            label="Choose exercises"
            onPress={() => {
              setCustomExerciseError(null);
              setIsExercisePickerOpen(true);
            }}
            loading={addCustomWorkoutExerciseMutation.isPending}
          />
        </View>
      ) : (
        <>
          {workout.sessionType === "custom" ? (
            <PrimaryButton
              label="Add exercise"
              variant="secondary"
              onPress={() => {
                setCustomExerciseError(null);
                setIsExercisePickerOpen(true);
              }}
              disabled={addCustomWorkoutExerciseMutation.isPending}
              loading={addCustomWorkoutExerciseMutation.isPending}
            />
          ) : null}
          {workout.exercises.map((exercise) => (
            <WorkoutExerciseCard
              key={exercise.id}
              exercise={exercise}
              unitSystem={unitSystem}
              highlightMissingFeedback={showMissingFeedbackHighlights && missingFeedbackExerciseEntryIds.has(exercise.id)}
              {...(feedbackByEntryId[exercise.id]
                ? { selectedFeedback: feedbackByEntryId[exercise.id] }
                : {})}
              loggingSetId={logSetMutation.isPending ? logSetMutation.variables?.setId ?? null : null}
              editingSetId={editingSetId}
              recentlyLoggedSetId={recentlyLoggedSetId}
              submittingSetIds={submittingSetIds}
              deletingSetIds={deletingSetIds}
              addingSet={
                addWorkoutSetMutation.isPending &&
                addWorkoutSetMutation.variables?.exerciseEntryId === exercise.id
              }
              setLogDraftsBySetId={setLogDraftsBySetId}
              onChangeSetLogDraft={setSetLogDraft}
              onAddSet={handleAddSet}
              onDeleteSet={handleDeleteSet}
              onLogSet={handleLogSet}
              onStartEditSet={handleStartEditSet}
              onCancelEditSet={handleCancelEditSet}
              onUpdateLoggedSet={handleUpdateLoggedSet}
              onSelectFeedback={(feedback) => {
                setLastAction(`set_exercise_feedback:${exercise.id}`);
                setExerciseFeedback(exercise.id, feedback);
              }}
            />
          ))}
        </>
      )}

      <View style={styles.footer}>
        {logSetMutation.isError ? (
          <AppText variant="error">Set not saved. Check the values and try again.</AppText>
        ) : null}
        {updateLoggedSetMutation.isError ? (
          <AppText variant="error">Set not updated. Check the values and try again.</AppText>
        ) : null}
        {addWorkoutSetMutation.isError ? (
          <AppText variant="error">Set not added. Try again.</AppText>
        ) : null}
        {deleteWorkoutSetMutation.isError ? (
          <AppText variant="error">Set not removed. Only the last pending set can be removed.</AppText>
        ) : null}
        {addCustomWorkoutExerciseMutation.isError ? (
          <AppText variant="error">Exercise not added. Check your connection and try again.</AppText>
        ) : null}
        {completeWorkoutMutation.isError ? (
          <AppText variant="error">
            {getWorkoutCompletionErrorMessage(completeWorkoutMutation.error)}
          </AppText>
        ) : null}
        {cancelWorkoutMutation.isError ? (
          <AppText variant="error">
            {getWorkoutDiscardErrorMessage(cancelWorkoutMutation.error)}
          </AppText>
        ) : null}
        <AppText variant="caption" tone="secondary" style={styles.footerText}>
          {isProgramDayCustomWorkoutBuilder
            ? "Choose exercises for this program day, then return to your program."
            : completionUiState.footerMessage}
        </AppText>
        {!isProgramDayCustomWorkoutBuilder && !showDiscardConfirmation ? (
          <Card variant="muted" style={styles.recoveryCard} padding="sm">
            <AppText variant="sectionLabel" tone="secondary">
              Recovery
            </AppText>
            <View style={styles.recoveryPillRow}>
              {(["fresh", "normal", "fatigued", "exhausted"] as const).map((value) => {
                const active = recoveryState === value;
                const label = value === "fatigued" ? "Fatigued" : value === "exhausted" ? "Exhausted" : value === "fresh" ? "Fresh" : "Normal";
                return (
                  <Chip
                    key={value}
                    label={label}
                    selected={active}
                    onPress={() => setRecoveryState(value)}
                    disabled={completeWorkoutMutation.isPending || cancelWorkoutMutation.isPending}
                  />
                );
              })}
            </View>
          </Card>
        ) : null}
        {!completionUiState.hasPendingSets && showMissingFeedbackHighlights && !completionUiState.hasCompleteFeedback ? (
          <Card variant="muted" style={styles.missingFeedbackCallout} padding="sm">
            <AppText variant="cardTitle">Effort feedback needed</AppText>
            <AppText tone="secondary">
              Rate effort for the highlighted exercises to finish this workout.
            </AppText>
          </Card>
        ) : null}
        {!isProgramDayCustomWorkoutBuilder && showFinishEarlyConfirmation ? (
          <Card variant="elevated" style={styles.confirmation} padding="sm">
            <AppText variant="cardTitle">Finish early?</AppText>
            <AppText tone="secondary">
              You haven't completed all planned sets. Finish this workout anyway?
            </AppText>
            {showFinishEarlyFeedbackWarning ? (
              <AppText tone="secondary">
                Some completed exercises are missing effort feedback. Progression will be skipped for those exercises.
              </AppText>
            ) : null}
            <View style={styles.confirmationActions}>
              <PrimaryButton
                label={showFinishEarlyFeedbackWarning ? "Go back and rate effort" : "Keep working out"}
                variant="secondary"
                onPress={() => setShowFinishEarlyConfirmation(false)}
                disabled={completeWorkoutMutation.isPending}
              />
              <PrimaryButton
                label="Finish anyway"
                variant="danger"
                onPress={handleCompleteWorkout}
                loading={completeWorkoutMutation.isPending}
              />
            </View>
          </Card>
        ) : null}
        {showDiscardConfirmation ? (
          <Card variant="elevated" style={styles.confirmation} padding="sm">
            <AppText variant="cardTitle">Discard workout?</AppText>
            <AppText tone="secondary">
              This workout will not be saved and your program will not advance.
            </AppText>
            <View style={styles.confirmationActions}>
              <PrimaryButton
                label="Keep Workout"
                variant="secondary"
                onPress={() => setShowDiscardConfirmation(false)}
                disabled={cancelWorkoutMutation.isPending}
              />
              <PrimaryButton
                label="Discard"
                variant="danger"
                onPress={handleDiscardWorkout}
                loading={cancelWorkoutMutation.isPending}
              />
            </View>
          </Card>
        ) : null}
        {!isProgramDayCustomWorkoutBuilder ? (
          <PrimaryButton
            label={completionUiState.finishButtonLabel}
            onPress={handleFinishPress}
            disabled={
              completionUiState.finishButtonDisabled ||
              completionInFlight.current ||
              cancelWorkoutMutation.isPending
            }
            loading={completeWorkoutMutation.isPending}
          />
        ) : null}
        {!showDiscardConfirmation ? (
          <PrimaryButton
            label={isProgramDayCustomWorkoutBuilder ? "Cancel Custom Workout" : "Discard Workout"}
            tone="danger"
            onPress={() => {
              setShowFinishEarlyConfirmation(false);
              setShowDiscardConfirmation(true);
            }}
            disabled={completeWorkoutMutation.isPending || cancelWorkoutMutation.isPending || hasPendingSetSave}
            loading={cancelWorkoutMutation.isPending}
          />
        ) : null}
        <FeedbackButton
          screenName="ActiveWorkoutScreen"
          workoutSessionId={activeSessionId ?? workout.id}
          lastAction={lastAction}
        />
      </View>
      <CustomExercisePickerModal
        errorMessage={customExerciseError}
        exercises={availableCustomExercises}
        loadingExercises={exercisesQuery.isLoading}
        mode={customWorkoutBuilderMode}
        unitSystem={unitSystem}
        programDayNumber={programDayNumber}
        workoutName={programDayWorkoutName}
        submitting={
          addCustomWorkoutExerciseMutation.isPending ||
          (isProgramDayCustomWorkoutBuilder && cancelWorkoutMutation.isPending)
        }
        visible={isExercisePickerOpen && workout.sessionType === "custom"}
        onChangeWorkoutName={setProgramDayWorkoutName}
        onClose={() => {
          setIsExercisePickerOpen(false);
          setCustomExerciseError(null);
        }}
        onSubmit={handleAddCustomExercises}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs
  },
  headerStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: 2
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "600"
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16
  },
  restTimerCard: {
    alignItems: "center",
    backgroundColor: colors.textPrimary,
    borderRadius: 12,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md
  },
  restTimerTextGroup: {
    flex: 1,
    gap: 4
  },
  restTimerLabel: {
    color: colors.surfaceMuted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  restTimerTitle: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20
  },
  restTimerValueGroup: {
    alignItems: "flex-end",
    gap: 2
  },
  restTimerValue: {
    color: colors.surface,
    fontSize: 26,
    fontWeight: "600"
  },
  restTimerSkip: {
    color: colors.surfaceMuted,
    fontSize: 13,
    fontWeight: "600"
  },
  footer: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "600"
  },
  confirmation: {
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  emptyStateCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  emptyStateTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "600"
  },
  confirmationTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "600"
  },
  confirmationActions: {
    gap: spacing.sm
  },
  missingFeedbackCallout: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  missingFeedbackCalloutTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600"
  },
  missingFeedbackCalloutBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  recoveryCard: {
    gap: spacing.xs
  },
  recoveryLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  recoveryPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
});
