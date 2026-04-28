import { useEffect, useRef, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ExerciseEntryDto, SetDto } from "@fitness/shared";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { PrimaryButton } from "../components/PrimaryButton";
import { WorkoutExerciseCard } from "../components/WorkoutExerciseCard";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { FeedbackButton } from "../features/feedback/components/FeedbackButton";
import { useCurrentWorkout } from "../features/workout/hooks/useCurrentWorkout";
import { useLogSet } from "../features/workout/hooks/useLogSet";
import { useCompleteWorkout } from "../features/workout/hooks/useCompleteWorkout";
import { useCancelWorkout } from "../features/workout/hooks/useCancelWorkout";
import { CustomExercisePickerModal } from "../features/workout/components/CustomExercisePickerModal";
import { useAddCustomWorkoutExercise } from "../features/workout/hooks/useCustomWorkoutExercises";
import { useExercises } from "../features/workout/hooks/useExercises";
import { useAddWorkoutSet, useDeleteWorkoutSet } from "../features/workout/hooks/useWorkoutSets";
import { useActiveWorkoutStore } from "../features/workout/store/active-workout-store";
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
  type SetLogDraft
} from "../features/workout/utils/set-logging.shared";
import { colors, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "ActiveWorkout">;

type RestTimerState = {
  exerciseName: string;
  secondsRemaining: number;
  setNumber: number;
} | null;

export function ActiveWorkoutScreen({ navigation }: Props) {
  const currentWorkoutQuery = useCurrentWorkout();
  const logSetMutation = useLogSet();
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
  const [showFinishEarlyConfirmation, setShowFinishEarlyConfirmation] = useState(false);
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [selectedCustomExerciseIds, setSelectedCustomExerciseIds] = useState<string[]>([]);
  const [customExerciseError, setCustomExerciseError] = useState<string | null>(null);
  const [restTimer, setRestTimer] = useState<RestTimerState>(null);
  const inFlightSetIds = useRef<Set<string>>(new Set());
  const completionInFlight = useRef(false);
  const discardInFlight = useRef(false);
  const promptedCustomExerciseSessionId = useRef<string | null>(null);
  const activeWorkout = currentWorkoutQuery.data?.activeWorkoutSession ?? null;
  const exercisesQuery = useExercises(isExercisePickerOpen);

  useEffect(() => {
    if (!restTimer) {
      return undefined;
    }

    if (restTimer.secondsRemaining <= 0) {
      return undefined;
    }

    const interval = setInterval(() => {
      setRestTimer((current) => {
        if (!current) {
          return null;
        }

        const nextSeconds = Math.max(0, current.secondsRemaining - 1);
        return {
          ...current,
          secondsRemaining: nextSeconds
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [restTimer]);

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
  const availableCustomExercises = (exercisesQuery.data ?? []).filter(
    (exercise) => !workout.exercises.some((entry) => entry.exerciseId === exercise.id)
  );

  const hasPendingSetSave =
    logSetMutation.isPending ||
    addWorkoutSetMutation.isPending ||
    deleteWorkoutSetMutation.isPending ||
    Object.keys(submittingSetIds).length > 0 ||
    Object.keys(deletingSetIds).length > 0 ||
    inFlightSetIds.current.size > 0;
  const completionUiState = getWorkoutCompletionUiState(workout, feedbackByEntryId, {
    hasPendingSetSave
  });

  function handleLogSet(exercise: ExerciseEntryDto, set: SetDto, draft: SetLogDraft) {
    if (submittingSetIds[set.id] || inFlightSetIds.current.has(set.id) || set.status !== "pending") {
      return;
    }

    const request = buildLogSetRequestFromDraft(draft);
    if (!request) {
      return;
    }

    inFlightSetIds.current.add(set.id);
    setSubmittingSetIds((current) => ({
      ...current,
      [set.id]: true
    }));
    setLastAction(request.actualReps >= set.targetReps ? `completed_set:${set.id}` : `missed_set:${set.id}`);
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
        secondsRemaining: restSeconds,
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
      finishEarly: completionUiState.hasPendingSets
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
          navigation.replace("Dashboard");
        },
        onError: () => {
          discardInFlight.current = false;
        }
      }
    );
  }

  function handleToggleCustomExercise(exerciseId: string) {
    setCustomExerciseError(null);
    setSelectedCustomExerciseIds((current) =>
      current.includes(exerciseId)
        ? current.filter((selectedExerciseId) => selectedExerciseId !== exerciseId)
        : [...current, exerciseId]
    );
  }

  async function handleAddCustomExercises() {
    if (selectedCustomExerciseIds.length === 0) {
      setCustomExerciseError("Choose at least one exercise to continue.");
      return;
    }

    try {
      setCustomExerciseError(null);
      setLastAction(`add_custom_exercises:${selectedCustomExerciseIds.length}`);
      for (const exerciseId of selectedCustomExerciseIds) {
        await addCustomWorkoutExerciseMutation.mutateAsync({
          sessionId: workout.id,
          exerciseId
        });
      }
      setSelectedCustomExerciseIds([]);
      setIsExercisePickerOpen(false);
    } catch {
      setCustomExerciseError("Exercises were not added. Check your connection and try again.");
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{workout.workoutName}</Text>
        <Text style={styles.subtitle}>
          {workout.sessionType === "custom"
            ? workout.exercises.length === 0
              ? "Custom workout started."
              : `${workout.exercises.length} exercises in progress`
            : `${workout.exercises.length} exercises in ${workout.programName}`}
        </Text>
      </View>

      {restTimer ? (
        <View style={styles.restTimerCard}>
          <View style={styles.restTimerTextGroup}>
            <Text style={styles.restTimerLabel}>
              {restTimer.secondsRemaining > 0 ? "Rest timer" : "Rest done"}
            </Text>
            <Text style={styles.restTimerTitle}>
              {restTimer.exerciseName} after set {restTimer.setNumber}
            </Text>
          </View>
          <View style={styles.restTimerValueGroup}>
            <Text style={styles.restTimerValue}>{formatRestTimer(restTimer.secondsRemaining)}</Text>
            <Text style={styles.restTimerSkip} onPress={() => setRestTimer(null)}>
              Skip
            </Text>
          </View>
        </View>
      ) : null}

      {workout.exercises.length === 0 ? (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateTitle}>No exercises yet</Text>
          <Text style={styles.footerText}>
            Add at least one exercise from your exercise list to start logging sets.
          </Text>
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
              tone="secondary"
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
              {...(feedbackByEntryId[exercise.id]
                ? { selectedFeedback: feedbackByEntryId[exercise.id] }
                : {})}
              loggingSetId={logSetMutation.isPending ? logSetMutation.variables?.setId ?? null : null}
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
          <Text style={styles.errorText}>Set not saved. Check the values and try again.</Text>
        ) : null}
        {addWorkoutSetMutation.isError ? (
          <Text style={styles.errorText}>Set not added. Try again.</Text>
        ) : null}
        {deleteWorkoutSetMutation.isError ? (
          <Text style={styles.errorText}>Set not removed. Only the last pending set can be removed.</Text>
        ) : null}
        {addCustomWorkoutExerciseMutation.isError ? (
          <Text style={styles.errorText}>Exercise not added. Check your connection and try again.</Text>
        ) : null}
        {completeWorkoutMutation.isError ? (
          <Text style={styles.errorText}>
            {getWorkoutCompletionErrorMessage(completeWorkoutMutation.error)}
          </Text>
        ) : null}
        {cancelWorkoutMutation.isError ? (
          <Text style={styles.errorText}>
            {getWorkoutDiscardErrorMessage(cancelWorkoutMutation.error)}
          </Text>
        ) : null}
        <Text style={styles.footerText}>{completionUiState.footerMessage}</Text>
        {showFinishEarlyConfirmation ? (
          <View style={styles.confirmation}>
            <Text style={styles.confirmationTitle}>Finish early?</Text>
            <Text style={styles.footerText}>
              You haven't completed all planned sets. Finish this workout anyway?
            </Text>
            <View style={styles.confirmationActions}>
              <PrimaryButton
                label="Keep working out"
                tone="secondary"
                onPress={() => setShowFinishEarlyConfirmation(false)}
                disabled={completeWorkoutMutation.isPending}
              />
              <PrimaryButton
                label="Finish workout"
                tone="danger"
                onPress={handleCompleteWorkout}
                loading={completeWorkoutMutation.isPending}
              />
            </View>
          </View>
        ) : null}
        {showDiscardConfirmation ? (
          <View style={styles.confirmation}>
            <Text style={styles.confirmationTitle}>Discard workout?</Text>
            <Text style={styles.footerText}>
              This workout will not be saved and your program will not advance.
            </Text>
            <View style={styles.confirmationActions}>
              <PrimaryButton
                label="Keep Workout"
                tone="secondary"
                onPress={() => setShowDiscardConfirmation(false)}
                disabled={cancelWorkoutMutation.isPending}
              />
              <PrimaryButton
                label="Discard"
                tone="danger"
                onPress={handleDiscardWorkout}
                loading={cancelWorkoutMutation.isPending}
              />
            </View>
          </View>
        ) : null}
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
        {!showDiscardConfirmation ? (
          <PrimaryButton
            label="Discard Workout"
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
        selectedExerciseIds={selectedCustomExerciseIds}
        submitting={addCustomWorkoutExerciseMutation.isPending}
        visible={isExercisePickerOpen && workout.sessionType === "custom"}
        onClose={() => {
          setIsExercisePickerOpen(false);
          setCustomExerciseError(null);
          setSelectedCustomExerciseIds([]);
        }}
        onStart={handleAddCustomExercises}
        onToggleExercise={handleToggleCustomExercise}
      />
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
    fontWeight: "800"
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16
  },
  restTimerCard: {
    alignItems: "center",
    backgroundColor: colors.textPrimary,
    borderRadius: 18,
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
    fontWeight: "800",
    textTransform: "uppercase"
  },
  restTimerTitle: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20
  },
  restTimerValueGroup: {
    alignItems: "flex-end",
    gap: 2
  },
  restTimerValue: {
    color: colors.surface,
    fontSize: 26,
    fontWeight: "800"
  },
  restTimerSkip: {
    color: colors.surfaceMuted,
    fontSize: 13,
    fontWeight: "800"
  },
  footer: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
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
    color: "#9c3b31",
    fontSize: 14,
    fontWeight: "700"
  },
  confirmation: {
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  emptyStateCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  emptyStateTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800"
  },
  confirmationTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800"
  },
  confirmationActions: {
    gap: spacing.sm
  }
});
