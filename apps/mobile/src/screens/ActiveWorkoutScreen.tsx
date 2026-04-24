import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CompleteWorkoutSessionRequest, SetDto } from "@fitness/shared";
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
import { colors, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "ActiveWorkout">;

export function ActiveWorkoutScreen({ navigation }: Props) {
  const currentWorkoutQuery = useCurrentWorkout();
  const logSetMutation = useLogSet();
  const completeWorkoutMutation = useCompleteWorkout();
  const feedbackByEntryId = useActiveWorkoutStore((state) => state.exerciseFeedbackByEntryId);
  const setExerciseFeedback = useActiveWorkoutStore((state) => state.setExerciseFeedback);
  const activeSessionId = useActiveWorkoutStore((state) => state.activeSessionId);
  const [lastAction, setLastAction] = useState<string | null>(null);

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

  const hasPendingSets = workout.exercises.some((exercise) =>
    exercise.sets.some((set) => set.status === "pending")
  );

  const hasCompleteFeedback = workout.exercises.every(
    (exercise) => feedbackByEntryId[exercise.id] !== undefined
  );

  function handleLogSet(set: SetDto, actualReps: number) {
    setLastAction(actualReps >= set.targetReps ? `completed_set:${set.id}` : `missed_set:${set.id}`);
    logSetMutation.mutate({
      setId: set.id,
      request: {
        actualReps,
        actualWeight: set.targetWeight
      }
    });
  }

  function handleCompleteWorkout() {
    setLastAction("complete_workout");
    const request: CompleteWorkoutSessionRequest = {
      exerciseFeedback: workout.exercises.map((exercise) => ({
        exerciseEntryId: exercise.id,
        effortFeedback: feedbackByEntryId[exercise.id]!
      }))
    };

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
          onCompleteSet={(set) => handleLogSet(set, set.targetReps)}
          onFailSet={(set) => handleLogSet(set, Math.max(0, set.targetReps - 1))}
          onSelectFeedback={(feedback) => setExerciseFeedback(exercise.id, feedback)}
        />
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {!hasPendingSets && hasCompleteFeedback
            ? "All sets are logged and feedback is ready."
            : "Finish all sets and choose feedback for every exercise to complete the workout."}
        </Text>
        <PrimaryButton
          label="Complete workout"
          onPress={handleCompleteWorkout}
          disabled={hasPendingSets || !hasCompleteFeedback}
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
  }
});
