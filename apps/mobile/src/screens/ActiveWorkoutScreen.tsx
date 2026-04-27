import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SetDto } from "@fitness/shared";
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
import { useActiveWorkoutStore } from "../features/workout/store/active-workout-store";
import {
  buildCompleteWorkoutRequest,
  getFinishWorkoutPressAction,
  getWorkoutCompletionErrorMessage,
  getWorkoutCompletionUiState
} from "../features/workout/utils/active-workout-screen.shared";
import { buildLogSetRequestFromDraft, type SetLogDraft } from "../features/workout/utils/set-logging.shared";
import { colors, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "ActiveWorkout">;

export function ActiveWorkoutScreen({ navigation }: Props) {
  const currentWorkoutQuery = useCurrentWorkout();
  const logSetMutation = useLogSet();
  const completeWorkoutMutation = useCompleteWorkout();
  const feedbackByEntryId = useActiveWorkoutStore((state) => state.exerciseFeedbackByEntryId);
  const setExerciseFeedback = useActiveWorkoutStore((state) => state.setExerciseFeedback);
  const activeSessionId = useActiveWorkoutStore((state) => state.activeSessionId);
  const setLogDraftsBySetId = useActiveWorkoutStore((state) => state.setLogDraftsBySetId);
  const setSetLogDraft = useActiveWorkoutStore((state) => state.setSetLogDraft);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [submittingSetIds, setSubmittingSetIds] = useState<Record<string, boolean>>({});
  const [showFinishEarlyConfirmation, setShowFinishEarlyConfirmation] = useState(false);

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

  const activeWorkout = currentWorkoutQuery.data?.activeWorkoutSession;
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

  const completionUiState = getWorkoutCompletionUiState(workout, feedbackByEntryId);

  function handleLogSet(set: SetDto, draft: SetLogDraft) {
    if (submittingSetIds[set.id]) {
      return;
    }

    const request = buildLogSetRequestFromDraft(draft);
    if (!request) {
      return;
    }

    setSubmittingSetIds((current) => ({
      ...current,
      [set.id]: true
    }));
    setLastAction(request.actualReps >= set.targetReps ? `completed_set:${set.id}` : `missed_set:${set.id}`);
    logSetMutation.mutate(
      {
        setId: set.id,
        request
      },
      {
        onSettled: () => {
          setSubmittingSetIds((current) => {
            const next = { ...current };
            delete next[set.id];
            return next;
          });
        }
      }
    );
  }

  function handleCompleteWorkout() {
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

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{workout.workoutName}</Text>
        <Text style={styles.subtitle}>
          {workout.exercises.length} exercises in {workout.programName}
        </Text>
      </View>

      {workout.exercises.map((exercise) => (
        <WorkoutExerciseCard
          key={exercise.id}
          exercise={exercise}
          {...(feedbackByEntryId[exercise.id]
            ? { selectedFeedback: feedbackByEntryId[exercise.id] }
            : {})}
          loggingSetId={logSetMutation.isPending ? logSetMutation.variables?.setId ?? null : null}
          submittingSetIds={submittingSetIds}
          setLogDraftsBySetId={setLogDraftsBySetId}
          onChangeSetLogDraft={setSetLogDraft}
          onLogSet={handleLogSet}
          onSelectFeedback={(feedback) => {
            setLastAction(`set_exercise_feedback:${exercise.id}`);
            setExerciseFeedback(exercise.id, feedback);
          }}
        />
      ))}

      <View style={styles.footer}>
        {logSetMutation.isError ? (
          <Text style={styles.errorText}>Set not saved. Check the values and try again.</Text>
        ) : null}
        {completeWorkoutMutation.isError ? (
          <Text style={styles.errorText}>
            {getWorkoutCompletionErrorMessage(completeWorkoutMutation.error)}
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
        <PrimaryButton
          label={completionUiState.finishButtonLabel}
          onPress={handleFinishPress}
          disabled={completionUiState.finishButtonDisabled}
          loading={completeWorkoutMutation.isPending}
        />
        <FeedbackButton
          screenName="ActiveWorkoutScreen"
          workoutSessionId={activeSessionId ?? workout.id}
          lastAction={lastAction}
        />
      </View>
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
  confirmationTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800"
  },
  confirmationActions: {
    gap: spacing.sm
  }
});
