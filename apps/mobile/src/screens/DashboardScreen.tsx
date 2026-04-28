import { useState } from "react";
import type { ActiveProgramDto, ProgramDto, ProgramWorkoutTemplateDto } from "@fitness/shared";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { PrimaryButton } from "../components/PrimaryButton";
import { FeedbackButton } from "../features/feedback/components/FeedbackButton";
import { useDashboard } from "../features/workout/hooks/useDashboard";
import { useFollowProgram } from "../features/workout/hooks/useFollowProgram";
import { usePrograms } from "../features/workout/hooks/usePrograms";
import { useStartWorkout } from "../features/workout/hooks/useStartWorkout";
import {
  findProgramWorkoutById,
  getHiddenExerciseCount,
  getNextProgramPositionLabel,
  getPlannedExerciseLines,
  getProgramWorkoutPositionLabel,
  getProgramWorkouts,
  getWorkoutIntentSummary
} from "../features/workout/utils/dashboard-program.shared";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { colors, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

export function DashboardScreen({ navigation }: Props) {
  const [isProgramPickerOpen, setIsProgramPickerOpen] = useState(false);
  const [isWorkoutPickerOpen, setIsWorkoutPickerOpen] = useState(false);
  const [selectedStartingWorkoutId, setSelectedStartingWorkoutId] = useState<string | null>(null);
  const dashboardQuery = useDashboard();
  const programsQuery = usePrograms(
    Boolean(dashboardQuery.data && (!dashboardQuery.data.activeProgram || isProgramPickerOpen))
  );
  const followProgramMutation = useFollowProgram();
  const startWorkoutMutation = useStartWorkout();
  const [lastAction, setLastAction] = useState<string | null>(null);

  if (dashboardQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading your dashboard..." />
      </Screen>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <Screen>
        <ErrorState
          title="Dashboard unavailable"
          message="We couldn't load your workout dashboard."
          actionLabel="Try again"
          onAction={() => void dashboardQuery.refetch()}
        />
      </Screen>
    );
  }

  const dashboard = dashboardQuery.data;
  const activeProgram = dashboard.activeProgram;
  const activeWorkout = dashboard.activeWorkoutSession;
  const nextWorkout = dashboard.nextWorkoutTemplate;
  const programWorkouts = getProgramWorkouts(activeProgram);
  const nextWorkoutPlan = findProgramWorkoutById({
    activeProgram,
    workoutTemplateId: nextWorkout?.id
  });
  const programPositionLabel = getNextProgramPositionLabel(activeProgram);
  const plannedExerciseLines = getPlannedExerciseLines(nextWorkoutPlan);
  const hiddenExerciseCount = getHiddenExerciseCount(nextWorkoutPlan, plannedExerciseLines.length);
  const availablePrograms = programsQuery.data ?? [];
  const isStartingCustomWorkout =
    startWorkoutMutation.isPending && selectedStartingWorkoutId === "custom-workout";

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Fitness App</Text>
        <Text style={styles.title}>
          {activeProgram ? "Train with a clear next step." : "Choose your starting plan."}
        </Text>
        <Text style={styles.subtitle}>
          {activeProgram
            ? "Follow the program, log the work, and let progression handle the details."
            : "Pick a predefined program to queue your first workout."}
        </Text>
      </View>

      {activeProgram ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Current program</Text>
          <Text style={styles.cardTitle}>{activeProgram.program.name}</Text>
          <Text style={styles.cardBody}>{activeProgram.program.description}</Text>
          <Text style={styles.metaLine}>
            {activeProgram.program.daysPerWeek} days/week - {activeProgram.program.sessionDurationMinutes} min sessions - {activeProgram.completedWorkoutCount} completed
          </Text>
          {programPositionLabel ? (
            <Text style={styles.positionText}>Next up: {programPositionLabel}</Text>
          ) : null}
          {activeWorkout ? (
            <Text style={styles.warningText}>
              Finish your active workout before switching programs.
            </Text>
          ) : null}
          <PrimaryButton
            label="Change program"
            tone="secondary"
            disabled={Boolean(activeWorkout)}
            onPress={() => {
              setLastAction("change_program");
              setIsProgramPickerOpen(true);
            }}
          />
        </View>
      ) : null}

      {!activeProgram ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Predefined programs</Text>
          {programsQuery.isLoading ? (
            <Text style={styles.cardBody}>Loading programs...</Text>
          ) : availablePrograms.length === 0 ? (
            <Text style={styles.cardBody}>No active predefined programs are available yet.</Text>
          ) : (
            availablePrograms.map((program) => {
              const workoutNames = program.workouts.map((workout) => workout.name).join(" / ");
              const exerciseOverview =
                program.workouts
                  .map(
                    (workout) =>
                      `${workout.name}: ${workout.exercises
                        .map((exercise) => exercise.exerciseName)
                        .join(", ")}`
                  )
                  .join("\n") || "Workout overview unavailable";

              return (
                <View key={program.id} style={styles.programBlock}>
                  <Text style={styles.cardTitle}>{program.name}</Text>
                  <Text style={styles.cardBody}>{program.description}</Text>
                  <Text style={styles.metaLine}>
                    {program.daysPerWeek} days/week - {program.sessionDurationMinutes} minutes - {program.difficultyLevel}
                  </Text>
                  <Text style={styles.sectionTitle}>Weekly structure</Text>
                  <Text style={styles.cardBody}>{workoutNames}</Text>
                  <Text style={styles.sectionTitle}>Workout overview</Text>
                  <Text style={styles.cardBody}>{exerciseOverview}</Text>
                  <PrimaryButton
                    label="Start this program"
                    onPress={() => {
                      setLastAction("follow_program");
                      followProgramMutation.mutate(program.id);
                    }}
                    loading={followProgramMutation.isPending}
                  />
                </View>
              );
            })
          )}
          {programsQuery.isError ? (
            <Text style={styles.errorText}>We couldn't load programs. Pull to refresh or try again.</Text>
          ) : null}
        </View>
      ) : null}

      {activeWorkout ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Active workout</Text>
          <Text style={styles.cardTitle}>{activeWorkout.workoutName}</Text>
          <Text style={styles.cardBody}>
            {activeWorkout.exercises.length} exercises in progress
          </Text>
          <PrimaryButton
            label="Resume workout"
            onPress={() => {
              setLastAction("resume_workout");
              navigation.navigate("ActiveWorkout");
            }}
          />
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Next workout</Text>
        <Text style={styles.cardTitle}>{nextWorkout?.name ?? "No workout queued"}</Text>
        {programPositionLabel ? <Text style={styles.positionText}>{programPositionLabel}</Text> : null}
        <Text style={styles.cardBody}>
          {nextWorkout
            ? `${activeProgram?.program.name ?? "Current program"} - estimated ${nextWorkout.estimatedDurationMinutes ?? activeProgram?.program.sessionDurationMinutes ?? 0} minutes`
            : activeProgram
              ? "Your program does not have a workout queued."
              : "Start a predefined program to queue your first workout."}
        </Text>
        {nextWorkout ? (
          <View style={styles.intentBlock}>
            <Text style={styles.sectionTitle}>Workout intent</Text>
            <Text style={styles.cardBody}>{getWorkoutIntentSummary(nextWorkoutPlan)}</Text>
            {plannedExerciseLines.length > 0 ? (
              <View style={styles.exerciseList}>
                {plannedExerciseLines.map((line) => (
                  <Text key={line} style={styles.exerciseLine}>
                    {line}
                  </Text>
                ))}
                {hiddenExerciseCount > 0 ? (
                  <Text style={styles.exerciseLine}>+{hiddenExerciseCount} more planned</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
        <PrimaryButton
          label={activeWorkout ? "Workout already active" : "Start workout"}
          onPress={() => {
            setLastAction("start_workout");
            setSelectedStartingWorkoutId(nextWorkout?.id ?? null);
            startWorkoutMutation.mutate(
              {},
              {
                onSuccess: () => {
                  setSelectedStartingWorkoutId(null);
                  navigation.navigate("ActiveWorkout");
                },
                onError: () => {
                  setSelectedStartingWorkoutId(null);
                }
              }
            );
          }}
          disabled={Boolean(activeWorkout || !nextWorkout || !activeProgram)}
          loading={startWorkoutMutation.isPending && selectedStartingWorkoutId === nextWorkout?.id}
        />
        <PrimaryButton
          label={activeWorkout ? "Workout already active" : "Start custom workout"}
          tone="secondary"
          onPress={() => {
            setLastAction("start_custom_workout");
            setSelectedStartingWorkoutId("custom-workout");
            startWorkoutMutation.mutate(
              {
                sessionType: "custom"
              },
              {
                onSuccess: () => {
                  setSelectedStartingWorkoutId(null);
                  navigation.navigate("ActiveWorkout");
                },
                onError: () => {
                  setSelectedStartingWorkoutId(null);
                }
              }
            );
          }}
          disabled={Boolean(activeWorkout || startWorkoutMutation.isPending)}
          loading={isStartingCustomWorkout}
        />
        {activeProgram && programWorkouts.length > 0 ? (
          <PrimaryButton
            label="Choose workout"
            tone="secondary"
            disabled={Boolean(activeWorkout || startWorkoutMutation.isPending)}
            onPress={() => {
              setLastAction("choose_workout");
              setIsWorkoutPickerOpen(true);
            }}
          />
        ) : null}
        {startWorkoutMutation.error instanceof Error ? (
          <Text style={styles.errorText}>{startWorkoutMutation.error.message}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>This week</Text>
        <Text style={styles.cardTitle}>{dashboard.weeklyWorkoutCount} workouts completed</Text>
        <Text style={styles.cardBody}>
          Recent activity: {dashboard.recentProgressMetrics[0]?.displayText ?? "No progress metrics yet."}
        </Text>
        <PrimaryButton
          label="View progress"
          tone="secondary"
          onPress={() => {
            setLastAction("view_progress");
            navigation.navigate("Progression");
          }}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Recent workouts</Text>
        <Text style={styles.cardTitle}>
          {dashboard.recentWorkoutHistory[0]?.workoutName ?? "No completed workouts yet"}
        </Text>
        <Text style={styles.cardBody}>
          {dashboard.recentWorkoutHistory[0]
            ? `${dashboard.recentWorkoutHistory[0].programName} - ${dashboard.recentWorkoutHistory[0].completedSetCount} sets completed`
            : "Finish a workout to build your history."}
        </Text>
        <PrimaryButton
          label="View history"
          tone="secondary"
          onPress={() => {
            setLastAction("view_history");
            navigation.navigate("WorkoutHistory");
          }}
        />
      </View>

      <View style={styles.actions}>
        <FeedbackButton
          screenName="DashboardScreen"
          workoutSessionId={activeWorkout?.id ?? null}
          lastAction={lastAction}
        />
        {__DEV__ ? (
          <PrimaryButton
            label="Review feedback"
            tone="secondary"
            onPress={() => navigation.navigate("FeedbackDebug")}
          />
        ) : null}
      </View>

      <ProgramPickerModal
        activeProgramId={activeProgram?.program.id ?? null}
        errorMessage={followProgramMutation.error instanceof Error ? followProgramMutation.error.message : null}
        loadingPrograms={programsQuery.isLoading}
        programs={availablePrograms}
        selectingProgram={followProgramMutation.isPending}
        visible={isProgramPickerOpen}
        onClose={() => setIsProgramPickerOpen(false)}
        onSelectProgram={(programId) => {
          setLastAction("switch_program");
          followProgramMutation.mutate(programId, {
            onSuccess: () => setIsProgramPickerOpen(false)
          });
        }}
      />
      <WorkoutPickerModal
        activeProgram={activeProgram}
        errorMessage={startWorkoutMutation.error instanceof Error ? startWorkoutMutation.error.message : null}
        recommendedWorkoutId={nextWorkout?.id ?? null}
        selectedStartingWorkoutId={selectedStartingWorkoutId}
        startingWorkout={startWorkoutMutation.isPending}
        visible={isWorkoutPickerOpen}
        onClose={() => setIsWorkoutPickerOpen(false)}
        onSelectWorkout={(workoutId) => {
          setLastAction(workoutId === nextWorkout?.id ? "start_recommended_from_picker" : "start_selected_workout");
          setSelectedStartingWorkoutId(workoutId);
          startWorkoutMutation.mutate(
            {
              workoutTemplateId: workoutId
            },
            {
              onSuccess: () => {
                setSelectedStartingWorkoutId(null);
                setIsWorkoutPickerOpen(false);
                navigation.navigate("ActiveWorkout");
              },
              onError: () => {
                setSelectedStartingWorkoutId(null);
              }
            }
          );
        }}
      />
    </Screen>
  );
}

function ProgramPickerModal(props: {
  activeProgramId: string | null;
  errorMessage: string | null;
  loadingPrograms: boolean;
  programs: ProgramDto[];
  selectingProgram: boolean;
  visible: boolean;
  onClose: () => void;
  onSelectProgram: (programId: string) => void;
}) {
  return (
    <Modal animationType="slide" transparent visible={props.visible} onRequestClose={props.onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleGroup}>
              <Text style={styles.cardLabel}>Predefined programs</Text>
              <Text style={styles.modalTitle}>Change program</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={props.onClose} style={styles.closeButton}>
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.programChoiceList}>
            {props.loadingPrograms ? (
              <Text style={styles.cardBody}>Loading programs...</Text>
            ) : props.programs.length === 0 ? (
              <Text style={styles.cardBody}>No active predefined programs are available yet.</Text>
            ) : (
              props.programs.map((program) => {
                const isCurrentProgram = program.id === props.activeProgramId;
                const workoutNames = program.workouts.map((workout) => workout.name).join(" / ");

                return (
                  <View key={program.id} style={styles.programChoice}>
                    <Text style={styles.cardTitle}>{program.name}</Text>
                    <Text style={styles.cardBody}>{program.description}</Text>
                    <Text style={styles.metaLine}>
                      {program.daysPerWeek} days/week - {program.sessionDurationMinutes} minutes - {program.difficultyLevel}
                    </Text>
                    <Text style={styles.cardBody}>{workoutNames}</Text>
                    <PrimaryButton
                      label={isCurrentProgram ? "Current program" : "Switch to this program"}
                      disabled={isCurrentProgram || props.selectingProgram}
                      loading={!isCurrentProgram && props.selectingProgram}
                      onPress={() => props.onSelectProgram(program.id)}
                      tone={isCurrentProgram ? "secondary" : "primary"}
                    />
                  </View>
                );
              })
            )}
          </ScrollView>

          {props.errorMessage ? <Text style={styles.errorText}>{props.errorMessage}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

function WorkoutPickerModal(props: {
  activeProgram: ActiveProgramDto | null;
  errorMessage: string | null;
  recommendedWorkoutId: string | null;
  selectedStartingWorkoutId: string | null;
  startingWorkout: boolean;
  visible: boolean;
  onClose: () => void;
  onSelectWorkout: (workoutId: string) => void;
}) {
  const programWorkouts = getProgramWorkouts(props.activeProgram);

  return (
    <Modal animationType="slide" transparent visible={props.visible} onRequestClose={props.onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleGroup}>
              <Text style={styles.cardLabel}>Current program</Text>
              <Text style={styles.modalTitle}>Choose workout</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={props.onClose} style={styles.closeButton}>
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.programChoiceList}>
            {programWorkouts.length === 0 ? (
              <Text style={styles.cardBody}>No workouts are available for this program.</Text>
            ) : (
              programWorkouts.map((workout) => {
                const isRecommended = workout.id === props.recommendedWorkoutId;
                const positionLabel = getProgramWorkoutPositionLabel({
                  activeProgram: props.activeProgram,
                  workout
                });
                const isStartingThisWorkout =
                  props.startingWorkout && props.selectedStartingWorkoutId === workout.id;

                return (
                  <WorkoutChoice
                    key={workout.id}
                    isRecommended={isRecommended}
                    isStarting={isStartingThisWorkout}
                    positionLabel={positionLabel}
                    startingWorkout={props.startingWorkout}
                    workout={workout}
                    onSelectWorkout={props.onSelectWorkout}
                  />
                );
              })
            )}
          </ScrollView>

          {props.errorMessage ? <Text style={styles.errorText}>{props.errorMessage}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

function WorkoutChoice(props: {
  isRecommended: boolean;
  isStarting: boolean;
  positionLabel: string;
  startingWorkout: boolean;
  workout: ProgramWorkoutTemplateDto;
  onSelectWorkout: (workoutId: string) => void;
}) {
  const plannedExerciseLines = getPlannedExerciseLines(props.workout, 3);
  const hiddenExerciseCount = getHiddenExerciseCount(props.workout, plannedExerciseLines.length);

  return (
    <View style={[styles.workoutChoice, props.isRecommended && styles.recommendedWorkoutChoice]}>
      <View style={styles.workoutChoiceHeader}>
        <View style={styles.workoutChoiceTitleGroup}>
          <Text style={styles.positionText}>{props.positionLabel}</Text>
          <Text style={styles.cardTitle}>{props.workout.name}</Text>
        </View>
        {props.isRecommended ? <Text style={styles.recommendedPill}>Recommended</Text> : null}
      </View>
      <Text style={styles.cardBody}>{getWorkoutIntentSummary(props.workout)}</Text>
      <View style={styles.exerciseList}>
        {plannedExerciseLines.map((line) => (
          <Text key={line} style={styles.exerciseLine}>
            {line}
          </Text>
        ))}
        {hiddenExerciseCount > 0 ? (
          <Text style={styles.exerciseLine}>+{hiddenExerciseCount} more planned</Text>
        ) : null}
      </View>
      <PrimaryButton
        label={props.isRecommended ? "Start recommended" : "Start this workout"}
        disabled={props.startingWorkout && !props.isStarting}
        loading={props.isStarting}
        onPress={() => props.onSelectWorkout(props.workout.id)}
        tone={props.isRecommended ? "primary" : "secondary"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.sm
  },
  eyebrow: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  cardLabel: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700"
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22
  },
  metaLine: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  positionText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22
  },
  intentBlock: {
    gap: spacing.xs
  },
  exerciseList: {
    gap: spacing.xs
  },
  exerciseLine: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21
  },
  programBlock: {
    gap: spacing.sm
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700"
  },
  errorText: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "700"
  },
  warningText: {
    color: "#9c3b31",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  actions: {
    gap: spacing.sm
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(29, 36, 28, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.md
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    gap: spacing.md,
    maxHeight: "92%",
    maxWidth: 620,
    padding: spacing.lg,
    width: "100%"
  },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  modalTitleGroup: {
    flex: 1,
    gap: spacing.xs
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800"
  },
  closeButton: {
    paddingVertical: spacing.xs
  },
  closeLabel: {
    color: colors.accentStrong,
    fontSize: 15,
    fontWeight: "700"
  },
  programChoiceList: {
    gap: spacing.sm
  },
  programChoice: {
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  workoutChoice: {
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  recommendedWorkoutChoice: {
    borderColor: colors.accentStrong,
    borderWidth: 2
  },
  workoutChoiceHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  workoutChoiceTitleGroup: {
    flex: 1,
    gap: spacing.xs
  },
  recommendedPill: {
    backgroundColor: colors.accentStrong,
    borderRadius: 999,
    color: colors.surface,
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textTransform: "uppercase"
  }
});
