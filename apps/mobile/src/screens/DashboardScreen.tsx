import { useState } from "react";
import type { ProgramDto } from "@fitness/shared";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { PrimaryButton } from "../components/PrimaryButton";
import { FeedbackButton } from "../features/feedback/components/FeedbackButton";
import { useAppAuth } from "../core/auth/AuthProvider";
import { useDashboard } from "../features/workout/hooks/useDashboard";
import { useFollowProgram } from "../features/workout/hooks/useFollowProgram";
import { usePrograms } from "../features/workout/hooks/usePrograms";
import { useResetTestUserData } from "../features/workout/hooks/useResetTestUserData";
import { useStartWorkout } from "../features/workout/hooks/useStartWorkout";
import {
  findProgramWorkoutById,
  getDashboardPrimarySectionOrder,
  getPredefinedWorkoutChoices,
  getHiddenExerciseCount,
  getNextProgramPositionLabel,
  getPlannedExerciseLines,
  getProgramSectionActionLabels,
  getProgramWorkoutPositionLabel,
  getProgramWorkouts,
  getWorkoutStartActionLabels,
  getWorkoutIntentSummary,
  groupPredefinedWorkoutChoicesByCategory,
  type PredefinedWorkoutCategoryGroup,
  type PredefinedWorkoutChoice
} from "../features/workout/utils/dashboard-program.shared";
import { requestResetTestDataConfirmation } from "../features/workout/utils/reset-test-data.shared";
import {
  TEST_USER_EMAIL,
  isTestUserEmail,
  shouldShowReviewFeedbackButton
} from "../features/workout/utils/test-account.shared";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { colors, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

const RESET_TEST_DATA_CONFIRMATION =
  "This will delete workout history, custom workouts, progression state, and program progress for test@test.com only. Continue?";
const RESET_DELETED_COUNT_KEYS = [
  "customPrograms",
  "customTemplateEntries",
  "customTemplates",
  "enrollments",
  "exerciseEntries",
  "idempotencyRecords",
  "progressMetrics",
  "progression",
  "sets",
  "workoutSessions"
] as const;
const isDevEnvironment = typeof __DEV__ !== "undefined" && __DEV__;

function logResetDiagnostic(event: string) {
  if (isDevEnvironment) {
    console.info("[reset-test-data]", event);
  }
}

export function DashboardScreen({ navigation }: Props) {
  const [isProgramPickerOpen, setIsProgramPickerOpen] = useState(false);
  const [isWorkoutPickerOpen, setIsWorkoutPickerOpen] = useState(false);
  const [selectedStartingWorkoutId, setSelectedStartingWorkoutId] = useState<string | null>(null);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);
  const auth = useAppAuth();
  const dashboardQuery = useDashboard();
  const programsQuery = usePrograms(Boolean(dashboardQuery.data));
  const followProgramMutation = useFollowProgram();
  const resetTestUserDataMutation = useResetTestUserData();
  const startWorkoutMutation = useStartWorkout();
  const [lastAction, setLastAction] = useState<string | null>(null);
  const isTestUser = isTestUserEmail(auth.userEmail);
  const canReviewFeedback = shouldShowReviewFeedbackButton({
    isDev: __DEV__,
    userEmail: auth.userEmail
  });

  function runResetTestData() {
    logResetDiagnostic("handler_entered");
    setLastAction("reset_test_data");
    setResetFeedback(null);
    logResetDiagnostic("mutation_started");
    resetTestUserDataMutation.mutate(undefined, {
      onSuccess: (response) => {
        logResetDiagnostic("mutation_success");
        const deletedCount = RESET_DELETED_COUNT_KEYS.reduce(
          (total, key) => total + (response.data.deleted[key] ?? 0),
          0
        );
        const message = `Test data reset complete. ${deletedCount} records cleared.`;
        setResetFeedback(message);
        Alert.alert("Reset Complete", message);
      },
      onError: (error) => {
        logResetDiagnostic("mutation_error");
        const message = error instanceof Error ? error.message : "Unable to reset test data.";
        setResetFeedback(message);
        Alert.alert("Reset Failed", message);
      }
    });
  }

  function confirmResetTestData() {
    const webConfirm = (globalThis as { confirm?: (message: string) => boolean }).confirm;

    requestResetTestDataConfirmation({
      alert: Alert,
      confirmationMessage: RESET_TEST_DATA_CONFIRMATION,
      confirm: webConfirm,
      log: logResetDiagnostic,
      onConfirm: runResetTestData,
      platformOs: Platform.OS
    });
  }

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
  const primarySectionOrder = getDashboardPrimarySectionOrder({
    hasActiveProgram: Boolean(activeProgram)
  });
  const programSectionActionLabels = getProgramSectionActionLabels({
    hasActiveProgram: Boolean(activeProgram)
  });
  const predefinedWorkoutChoices = getPredefinedWorkoutChoices({
    activeProgram,
    programs: availablePrograms
  });
  const predefinedWorkoutGroups = groupPredefinedWorkoutChoicesByCategory(predefinedWorkoutChoices);
  const hasPredefinedChoices = predefinedWorkoutChoices.length > 0;
  const workoutStartActionLabels = getWorkoutStartActionLabels({
    activeWorkout: Boolean(activeWorkout),
    hasActiveProgram: Boolean(activeProgram),
    hasPredefinedChoices,
    hasRecommendedWorkout: Boolean(nextWorkout)
  });
  const isStartingPredefinedWorkout =
    (startWorkoutMutation.isPending || followProgramMutation.isPending) &&
    selectedStartingWorkoutId !== null &&
    selectedStartingWorkoutId !== "custom-workout";
  const isStartingCustomWorkout =
    startWorkoutMutation.isPending && selectedStartingWorkoutId === "custom-workout";
  const isStartingRecommendedWorkout =
    startWorkoutMutation.isPending && selectedStartingWorkoutId === nextWorkout?.id;

  function startPredefinedWorkout(choice: PredefinedWorkoutChoice) {
    const finishStart = () => {
      startWorkoutMutation.mutate(
        {
          workoutTemplateId: choice.workout.id
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
    };

    setLastAction(
      choice.workout.id === nextWorkout?.id
        ? "start_recommended_from_picker"
        : "start_selected_predefined_workout"
    );
    setSelectedStartingWorkoutId(choice.workout.id);

    if (activeProgram?.program.id === choice.programId) {
      finishStart();
      return;
    }

    followProgramMutation.mutate(choice.programId, {
      onSuccess: finishStart,
      onError: () => {
        setSelectedStartingWorkoutId(null);
      }
    });
  }

  if (isDevEnvironment) {
    console.info("[dashboard] workout-start-structure", {
      firstAction: workoutStartActionLabels[0] ?? null,
      inlinePredefinedListVisible: false,
      secondaryActions: workoutStartActionLabels.slice(1)
    });
  }

  return (
    <Screen>
      {primarySectionOrder[0] === "currentProgram" && activeProgram ? (
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
            label={programSectionActionLabels[0] ?? "Change Program"}
            tone="secondary"
            disabled={Boolean(activeWorkout)}
            onPress={() => {
              setLastAction("change_program");
              setIsProgramPickerOpen(true);
            }}
          />
          <PrimaryButton
            label={programSectionActionLabels[1] ?? "Create Program"}
            tone="secondary"
            onPress={() => navigation.navigate("CreateProgram")}
          />
        </View>
      ) : null}

      {primarySectionOrder[0] === "programSetup" && !activeProgram ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Program setup</Text>
          <Text style={styles.cardTitle}>Choose your training plan</Text>
          <Text style={styles.cardBody}>
            Pick a predefined program or build a simple weekly plan from existing workouts.
          </Text>
          <PrimaryButton
            label={programSectionActionLabels[0] ?? "Choose Program"}
            tone="secondary"
            disabled={Boolean(activeWorkout || programsQuery.isLoading)}
            onPress={() => {
              setLastAction("choose_program");
              setIsProgramPickerOpen(true);
            }}
          />
          <PrimaryButton
            label={programSectionActionLabels[1] ?? "Create Program"}
            tone="secondary"
            onPress={() => navigation.navigate("CreateProgram")}
          />
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Start workout</Text>
        <Text style={styles.cardTitle}>Create Workout</Text>
        {programPositionLabel ? <Text style={styles.positionText}>{programPositionLabel}</Text> : null}
        <Text style={styles.cardBody}>
          Start from a blank workout when you know what you want to train. Predefined workouts are still available when you want structure.
        </Text>
        <PrimaryButton
          label={workoutStartActionLabels[0] ?? "Create Workout"}
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
        {hasPredefinedChoices ? (
          <PrimaryButton
            label="Choose Predefined Workout"
            tone="secondary"
            disabled={Boolean(
              activeWorkout ||
                startWorkoutMutation.isPending ||
                followProgramMutation.isPending ||
                programsQuery.isLoading
            )}
            onPress={() => {
              setLastAction("choose_predefined_workout");
              setIsWorkoutPickerOpen(true);
            }}
          />
        ) : null}
        {nextWorkout ? (
          <PrimaryButton
            label="Start Recommended Workout"
            tone="secondary"
            onPress={() => {
              setLastAction("start_recommended_workout");
              setSelectedStartingWorkoutId(nextWorkout.id);
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
            disabled={Boolean(activeWorkout || !activeProgram || startWorkoutMutation.isPending)}
            loading={isStartingRecommendedWorkout}
          />
        ) : null}
        {nextWorkout ? (
          <View style={styles.intentBlock}>
            <Text style={styles.sectionTitle}>Recommended from your program</Text>
            <Text style={styles.cardTitle}>{nextWorkout.name}</Text>
            <Text style={styles.cardBody}>
              {activeProgram?.program.name ?? "Current program"} - estimated {nextWorkout.estimatedDurationMinutes ?? activeProgram?.program.sessionDurationMinutes ?? 0} minutes
            </Text>
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
        ) : activeProgram ? (
          <Text style={styles.cardBody}>Your program does not have a workout queued.</Text>
        ) : null}
        {startWorkoutMutation.error instanceof Error ? (
          <Text style={styles.errorText}>{startWorkoutMutation.error.message}</Text>
        ) : null}
      </View>

      {!activeProgram && programsQuery.isError ? (
        <Text style={styles.errorText}>We couldn't load predefined workouts. Pull to refresh or try again.</Text>
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
        {canReviewFeedback ? (
          <PrimaryButton
            label="Review feedback"
            tone="secondary"
            onPress={() => navigation.navigate("FeedbackDebug")}
          />
        ) : null}
      </View>

      {isTestUser ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Dev/Test Tools</Text>
          <Text style={styles.cardTitle}>Test account reset</Text>
          <Text style={styles.cardBody}>
            Clears workout history, custom workouts, progression state, and program progress for test@test.com only.
          </Text>
          <PrimaryButton
            label="Reset Test Data"
            tone="danger"
            loading={resetTestUserDataMutation.isPending}
            disabled={resetTestUserDataMutation.isPending}
            onPress={confirmResetTestData}
          />
          {resetFeedback ? <Text style={styles.cardBody}>{resetFeedback}</Text> : null}
        </View>
      ) : null}

      <ProgramPickerModal
        activeProgramId={activeProgram?.program.id ?? null}
        errorMessage={followProgramMutation.error instanceof Error ? followProgramMutation.error.message : null}
        loadingPrograms={programsQuery.isLoading}
        programs={availablePrograms}
        selectingProgram={followProgramMutation.isPending}
        visible={isProgramPickerOpen}
        onClose={() => setIsProgramPickerOpen(false)}
        onCreateProgram={() => {
          setIsProgramPickerOpen(false);
          navigation.navigate("CreateProgram");
        }}
        onSelectProgram={(programId) => {
          setLastAction("switch_program");
          followProgramMutation.mutate(programId, {
            onSuccess: () => setIsProgramPickerOpen(false)
          });
        }}
      />
      <WorkoutPickerModal
        errorMessage={
          startWorkoutMutation.error instanceof Error
            ? startWorkoutMutation.error.message
            : followProgramMutation.error instanceof Error
              ? followProgramMutation.error.message
              : null
        }
        groups={predefinedWorkoutGroups}
        loadingWorkouts={programsQuery.isLoading && predefinedWorkoutGroups.length === 0}
        recommendedWorkoutId={nextWorkout?.id ?? null}
        selectedStartingWorkoutId={selectedStartingWorkoutId}
        startingWorkout={isStartingPredefinedWorkout}
        visible={isWorkoutPickerOpen}
        onClose={() => setIsWorkoutPickerOpen(false)}
        onSelectWorkout={startPredefinedWorkout}
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
  onCreateProgram: () => void;
  onSelectProgram: (programId: string) => void;
}) {
  return (
    <Modal animationType="slide" transparent visible={props.visible} onRequestClose={props.onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleGroup}>
              <Text style={styles.cardLabel}>Programs</Text>
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
              <Text style={styles.cardBody}>No active programs are available yet.</Text>
            ) : (
              props.programs.map((program) => {
                const isCurrentProgram = program.id === props.activeProgramId;
                const workoutNames = program.workouts.map((workout) => workout.name).join(" / ");

                return (
                  <View key={program.id} style={styles.programChoice}>
                    <Text style={styles.cardTitle}>{program.name}</Text>
                    <Text style={styles.sourcePill}>
                      {program.source === "custom" ? "Custom program" : "Predefined program"}
                    </Text>
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
          <PrimaryButton label="Create Program" tone="secondary" onPress={props.onCreateProgram} />
        </View>
      </View>
    </Modal>
  );
}

function WorkoutPickerModal(props: {
  errorMessage: string | null;
  groups: PredefinedWorkoutCategoryGroup[];
  loadingWorkouts: boolean;
  recommendedWorkoutId: string | null;
  selectedStartingWorkoutId: string | null;
  startingWorkout: boolean;
  visible: boolean;
  onClose: () => void;
  onSelectWorkout: (choice: PredefinedWorkoutChoice) => void;
}) {
  return (
    <Modal animationType="slide" transparent visible={props.visible} onRequestClose={props.onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleGroup}>
              <Text style={styles.cardLabel}>Predefined workouts</Text>
              <Text style={styles.modalTitle}>Choose workout</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={props.onClose} style={styles.closeButton}>
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.programChoiceList}>
            {props.loadingWorkouts ? (
              <Text style={styles.cardBody}>Loading predefined workouts...</Text>
            ) : props.groups.length === 0 ? (
              <Text style={styles.cardBody}>No workouts are available for this program.</Text>
            ) : (
              props.groups.map((group) => (
                <View key={group.category} style={styles.workoutCategoryGroup}>
                  <Text style={styles.categoryHeader}>{group.category}</Text>
                  {group.workouts.map((choice) => {
                    const isRecommended = choice.workout.id === props.recommendedWorkoutId;
                    const isStartingThisWorkout =
                      props.startingWorkout && props.selectedStartingWorkoutId === choice.workout.id;

                    return (
                      <WorkoutChoice
                        key={choice.id}
                        choice={choice}
                        isRecommended={isRecommended}
                        isStarting={isStartingThisWorkout}
                        startingWorkout={props.startingWorkout}
                        onSelectWorkout={props.onSelectWorkout}
                      />
                    );
                  })}
                </View>
              ))
            )}
          </ScrollView>

          {props.errorMessage ? <Text style={styles.errorText}>{props.errorMessage}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

function WorkoutChoice(props: {
  choice: PredefinedWorkoutChoice;
  isRecommended: boolean;
  isStarting: boolean;
  startingWorkout: boolean;
  onSelectWorkout: (choice: PredefinedWorkoutChoice) => void;
}) {
  const plannedExerciseLines = getPlannedExerciseLines(props.choice.workout, 3);
  const hiddenExerciseCount = getHiddenExerciseCount(
    props.choice.workout,
    plannedExerciseLines.length
  );

  return (
    <View style={[styles.workoutChoice, props.isRecommended && styles.recommendedWorkoutChoice]}>
      <View style={styles.workoutChoiceHeader}>
        <View style={styles.workoutChoiceTitleGroup}>
          <Text style={styles.positionText}>
            {props.choice.programName} - {props.choice.positionLabel}
          </Text>
          <Text style={styles.cardTitle}>{props.choice.workout.name}</Text>
        </View>
        {props.isRecommended ? <Text style={styles.recommendedPill}>Recommended</Text> : null}
      </View>
      <Text style={styles.cardBody}>{getWorkoutIntentSummary(props.choice.workout)}</Text>
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
        onPress={() => props.onSelectWorkout(props.choice)}
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
  sourcePill: {
    alignSelf: "flex-start",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textTransform: "uppercase"
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
  workoutCategoryGroup: {
    gap: spacing.sm
  },
  categoryHeader: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24
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
