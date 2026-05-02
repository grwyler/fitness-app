import { useMemo, useState } from "react";
import type { ProgramDto } from "@fitness/shared";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "../components/AppText";
import { Card } from "../components/Card";
import { Chip } from "../components/Chip";
import { Input } from "../components/Input";
import { ModalSheet } from "../components/ModalSheet";
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
  getCurrentProgramWorkoutChoices,
  findProgramWorkoutById,
  getHiddenExerciseCount,
  getNextProgramPositionLabel,
  getPlannedExerciseLines,
  getProgramSectionActionLabels,
  getProgramWorkoutPositionLabel,
  getWorkoutIntentSummary,
  type CurrentProgramWorkoutChoice
} from "../features/workout/utils/dashboard-program.shared";
import { requestResetTestDataConfirmation } from "../features/workout/utils/reset-test-data.shared";
import {
  TEST_USER_EMAIL,
  isTestUserEmail,
  shouldShowReviewFeedbackButton
} from "../features/workout/utils/test-account.shared";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { colors, radius, spacing } from "../theme/tokens";

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
  const [isCurrentProgramWorkoutPickerOpen, setIsCurrentProgramWorkoutPickerOpen] = useState(false);
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
  const nextWorkoutPlan = findProgramWorkoutById({
    activeProgram,
    workoutTemplateId: nextWorkout?.id
  });
  const currentProgramWorkoutChoices = getCurrentProgramWorkoutChoices(activeProgram);
  const programPositionLabel = getNextProgramPositionLabel(activeProgram);
  const availablePrograms = programsQuery.data ?? [];
  const programSectionActionLabels = getProgramSectionActionLabels({
    hasActiveProgram: Boolean(activeProgram)
  });
  const isStartingRecommendedWorkout =
    startWorkoutMutation.isPending && selectedStartingWorkoutId === nextWorkout?.id;

  function startCurrentProgramWorkout(choice: CurrentProgramWorkoutChoice) {
    setLastAction(`start_current_program_workout:${choice.workout.id}`);
    setSelectedStartingWorkoutId(choice.workout.id);
    startWorkoutMutation.mutate(
      {
        workoutTemplateId: choice.workout.id
      },
      {
        onSuccess: () => {
          setSelectedStartingWorkoutId(null);
          setIsCurrentProgramWorkoutPickerOpen(false);
          navigation.navigate("ActiveWorkout");
        },
        onError: () => {
          setSelectedStartingWorkoutId(null);
        }
      }
    );
  }

  return (
    <Screen>
      {activeProgram ? (
        <Card style={styles.card}>
          <AppText variant="label" tone="accent">
            Current program
          </AppText>
          <AppText variant="title2">{activeProgram.program.name}</AppText>
          <AppText tone="secondary">{activeProgram.program.description}</AppText>
          <AppText variant="meta" tone="secondary">
            {activeProgram.program.daysPerWeek} days/week - {activeProgram.program.sessionDurationMinutes} min sessions -{" "}
            {activeProgram.completedWorkoutCount} completed
          </AppText>
          {programPositionLabel ? (
            <AppText variant="bodyStrong">Next up: {programPositionLabel}</AppText>
          ) : null}
          {activeWorkout ? (
            <AppText variant="meta" tone="danger">
              Finish your active workout before switching programs.
            </AppText>
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
            label="Edit Program"
            tone="secondary"
            disabled={Boolean(activeWorkout)}
            onPress={() => {
              if (activeProgram.program.source === "custom") {
                navigation.navigate("CreateProgram", { editProgramId: activeProgram.program.id });
                return;
              }

              navigation.navigate("CreateProgram", { cloneProgramId: activeProgram.program.id });
            }}
          />
        </Card>
      ) : null}

      {!activeProgram ? (
        <Card style={styles.card}>
          <AppText variant="label" tone="accent">
            Program setup
          </AppText>
          <AppText variant="title2">Choose your training plan</AppText>
          <AppText tone="secondary">
            Pick a predefined program or build a simple weekly plan from existing workouts.
          </AppText>
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
        </Card>
      ) : null}

      {activeProgram ? (
        <Card style={styles.card}>
          <AppText variant="label" tone="accent">
            Start workout
          </AppText>
          <AppText variant="title2">{nextWorkout ? "Next Workout" : "Start Workout"}</AppText>
          {nextWorkout ? (
            <View style={styles.nextWorkoutSummary}>
              {programPositionLabel ? <AppText variant="bodyStrong">{programPositionLabel}</AppText> : null}
              <AppText variant="title1">{nextWorkout.name}</AppText>
              <AppText variant="meta" tone="secondary">
                {activeProgram.program.name} - estimated{" "}
                {nextWorkout.estimatedDurationMinutes ?? activeProgram.program.sessionDurationMinutes ?? 0} minutes
              </AppText>
            </View>
          ) : null}

          {nextWorkout ? (
            <PrimaryButton
              label={`Start ${nextWorkout.name}`}
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
              disabled={Boolean(activeWorkout || startWorkoutMutation.isPending)}
              loading={isStartingRecommendedWorkout}
            />
          ) : null}

          {!nextWorkout && currentProgramWorkoutChoices.length > 0 ? (
            <PrimaryButton
              label="Choose workout day"
              disabled={Boolean(activeWorkout || startWorkoutMutation.isPending)}
              onPress={() => {
                setLastAction("choose_current_program_workout");
                setIsCurrentProgramWorkoutPickerOpen(true);
              }}
            />
          ) : null}

          {nextWorkout && currentProgramWorkoutChoices.length > 1 ? (
            <PrimaryButton
              label="Choose Another Day"
              tone="secondary"
              disabled={Boolean(activeWorkout || startWorkoutMutation.isPending)}
              onPress={() => {
                setLastAction("choose_current_program_workout");
                setIsCurrentProgramWorkoutPickerOpen(true);
              }}
            />
          ) : null}

          {nextWorkout ? (
            <AppText tone="secondary">{getWorkoutIntentSummary(nextWorkoutPlan)}</AppText>
          ) : (
            <AppText tone="secondary">Pick a day from your program to start logging.</AppText>
          )}
          {startWorkoutMutation.error instanceof Error ? (
            <AppText variant="meta" tone="danger">
              {startWorkoutMutation.error.message}
            </AppText>
          ) : null}
        </Card>
      ) : null}

      {activeWorkout ? (
        <Card style={styles.card}>
          <AppText variant="label" tone="accent">
            Active workout
          </AppText>
          <AppText variant="title2">{activeWorkout.workoutName}</AppText>
          <AppText tone="secondary">{activeWorkout.exercises.length} exercises in progress</AppText>
          <PrimaryButton
            label="Resume workout"
            onPress={() => {
              setLastAction("resume_workout");
              navigation.navigate("ActiveWorkout");
            }}
          />
        </Card>
      ) : null}

      <Card style={styles.card}>
        <AppText variant="label" tone="accent">
          This week
        </AppText>
        <AppText variant="title2">{dashboard.weeklyWorkoutCount} workouts completed</AppText>
        <AppText tone="secondary">
          Recent activity: {dashboard.recentProgressMetrics[0]?.displayText ?? "No progress metrics yet."}
        </AppText>
        <PrimaryButton
          label="View progress"
          tone="secondary"
          onPress={() => {
            setLastAction("view_progress");
            navigation.navigate("Progression");
          }}
        />
      </Card>

      <Card style={styles.card}>
        <AppText variant="label" tone="accent">
          Recent workouts
        </AppText>
        <AppText variant="title2">
          {dashboard.recentWorkoutHistory[0]?.workoutName ?? "No completed workouts yet"}
        </AppText>
        <AppText tone="secondary">
          {dashboard.recentWorkoutHistory[0]
            ? `${dashboard.recentWorkoutHistory[0].programName} - ${dashboard.recentWorkoutHistory[0].completedSetCount} sets completed`
            : "Finish a workout to build your history."}
        </AppText>
        <PrimaryButton
          label="View history"
          tone="secondary"
          onPress={() => {
            setLastAction("view_history");
            navigation.navigate("WorkoutHistory");
          }}
        />
      </Card>

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
        <Card style={styles.card}>
          <AppText variant="label" tone="accent">
            Dev/Test Tools
          </AppText>
          <AppText variant="title2">Test account reset</AppText>
          <AppText tone="secondary">
            Clears workout history, custom workouts, progression state, and program progress for test@test.com only.
          </AppText>
          <PrimaryButton
            label="Reset Test Data"
            tone="danger"
            loading={resetTestUserDataMutation.isPending}
            disabled={resetTestUserDataMutation.isPending}
            onPress={confirmResetTestData}
          />
          {resetFeedback ? <AppText tone="secondary">{resetFeedback}</AppText> : null}
        </Card>
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
        onEditProgram={(programId) => {
          setIsProgramPickerOpen(false);
          const program = availablePrograms.find((item) => item.id === programId) ?? null;
          if (program?.source === "custom") {
            navigation.navigate("CreateProgram", { editProgramId: programId });
            return;
          }

          navigation.navigate("CreateProgram", { cloneProgramId: programId });
        }}
        onSelectProgram={(programId) => {
          setLastAction("switch_program");
          followProgramMutation.mutate(programId, {
            onSuccess: () => setIsProgramPickerOpen(false)
          });
        }}
      />
      <CurrentProgramWorkoutPickerModal
        errorMessage={startWorkoutMutation.error instanceof Error ? startWorkoutMutation.error.message : null}
        choices={currentProgramWorkoutChoices}
        loadingWorkouts={false}
        recommendedWorkoutId={nextWorkout?.id ?? null}
        selectedStartingWorkoutId={selectedStartingWorkoutId}
        startingWorkout={Boolean(startWorkoutMutation.isPending && selectedStartingWorkoutId)}
        visible={isCurrentProgramWorkoutPickerOpen}
        onClose={() => setIsCurrentProgramWorkoutPickerOpen(false)}
        onSelectWorkout={startCurrentProgramWorkout}
      />
    </Screen>
  );
}

function CurrentProgramWorkoutPickerModal(props: {
  errorMessage: string | null;
  choices: CurrentProgramWorkoutChoice[];
  loadingWorkouts: boolean;
  recommendedWorkoutId: string | null;
  selectedStartingWorkoutId: string | null;
  startingWorkout: boolean;
  visible: boolean;
  onClose: () => void;
  onSelectWorkout: (choice: CurrentProgramWorkoutChoice) => void;
}) {
  return (
    <ModalSheet
      headerRight={
        <Pressable accessibilityRole="button" onPress={props.onClose} style={styles.closeButton}>
          <AppText tone="accent" variant="meta">
            Close
          </AppText>
        </Pressable>
      }
      onClose={props.onClose}
      subtitle="Current program"
      title="Choose workout day"
      visible={props.visible}
    >
      <ScrollView contentContainerStyle={styles.programChoiceList}>
        {props.loadingWorkouts ? (
          <AppText tone="secondary">Loading program workouts...</AppText>
        ) : props.choices.length === 0 ? (
          <AppText tone="secondary">No workouts are available in this program.</AppText>
        ) : (
          props.choices.map((choice) => {
            const plannedExerciseLines = getPlannedExerciseLines(choice.workout, 3);
            const hiddenExerciseCount = getHiddenExerciseCount(choice.workout, plannedExerciseLines.length);
            const isRecommended = choice.workout.id === props.recommendedWorkoutId;
            const isStartingThisWorkout =
              props.startingWorkout && props.selectedStartingWorkoutId === choice.workout.id;

            return (
              <Card
                key={choice.id}
                elevated
                style={[styles.workoutChoice, isRecommended && styles.recommendedWorkoutChoice]}
              >
                <View style={styles.workoutChoiceHeader}>
                  <View style={styles.workoutChoiceTitleGroup}>
                    <AppText variant="bodyStrong">{choice.positionLabel}</AppText>
                    <AppText variant="title2">{choice.workout.name}</AppText>
                  </View>
                  {isRecommended ? (
                    <View style={styles.recommendedPill}>
                      <AppText tone="inverse" variant="overline">
                        Next up
                      </AppText>
                    </View>
                  ) : null}
                </View>
                <AppText tone="secondary">{getWorkoutIntentSummary(choice.workout)}</AppText>
                <View style={styles.exerciseList}>
                  {plannedExerciseLines.map((line) => (
                    <AppText key={line} variant="meta">
                      {line}
                    </AppText>
                  ))}
                  {hiddenExerciseCount > 0 ? (
                    <AppText variant="meta">+{hiddenExerciseCount} more planned</AppText>
                  ) : null}
                </View>
                <PrimaryButton
                  label={isRecommended ? "Start next workout" : "Start this day"}
                  disabled={props.startingWorkout && !isStartingThisWorkout}
                  loading={isStartingThisWorkout}
                  onPress={() => props.onSelectWorkout(choice)}
                  tone={isRecommended ? "primary" : "secondary"}
                />
              </Card>
            );
          })
        )}
      </ScrollView>

      {props.errorMessage ? (
        <AppText variant="meta" tone="danger">
          {props.errorMessage}
        </AppText>
      ) : null}
    </ModalSheet>
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
  onEditProgram: (programId: string) => void;
  onSelectProgram: (programId: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<"any" | "predefined" | "custom">("any");
  const [difficultyFilter, setDifficultyFilter] = useState<"any" | "beginner" | "intermediate" | "advanced">("any");
  const [daysFilter, setDaysFilter] = useState<number | "any">("any");
  const [focusFilter, setFocusFilter] = useState<"any" | "full_body" | "split" | "quick">("any");

  const isFiltering = Boolean(
    searchQuery.trim() ||
      sourceFilter !== "any" ||
      difficultyFilter !== "any" ||
      daysFilter !== "any" ||
      focusFilter !== "any"
  );

  function getProgramFocus(program: ProgramDto): "full_body" | "split" | "quick" | "mixed" {
    const categories = program.workouts.map((workout) => workout.category);
    if (categories.length === 0) {
      return "mixed";
    }

    const total = categories.length;
    const fullBodyCount = categories.filter((category) => category === "Full Body").length;
    const quickCount = categories.filter((category) => category === "Quick").length;
    const splitCount =
      categories.filter((category) => category === "Push").length +
      categories.filter((category) => category === "Pull").length +
      categories.filter((category) => category === "Legs").length;

    if (quickCount / total >= 0.6) {
      return "quick";
    }

    if (fullBodyCount / total >= 0.6) {
      return "full_body";
    }

    if (splitCount / total >= 0.6) {
      return "split";
    }

    return "mixed";
  }

  const filteredPrograms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return props.programs.filter((program) => {
      if (sourceFilter !== "any" && program.source !== sourceFilter) {
        return false;
      }

      if (difficultyFilter !== "any" && program.difficultyLevel !== difficultyFilter) {
        return false;
      }

      if (daysFilter !== "any" && program.daysPerWeek !== daysFilter) {
        return false;
      }

      const focus = getProgramFocus(program);
      if (focusFilter !== "any" && focus !== focusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const workoutNames = program.workouts.map((workout) => workout.name).join(" ");
      const haystack =
        `${program.name} ${program.description ?? ""} ${workoutNames} ${program.difficultyLevel} ${program.daysPerWeek}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [daysFilter, difficultyFilter, focusFilter, props.programs, searchQuery, sourceFilter]);

  function clearFilters() {
    setSourceFilter("any");
    setDifficultyFilter("any");
    setDaysFilter("any");
    setFocusFilter("any");
  }

  return (
    <ModalSheet
      headerRight={
        <Pressable accessibilityRole="button" onPress={props.onClose} style={styles.closeButton}>
          <AppText tone="accent" variant="meta">
            Close
          </AppText>
        </Pressable>
      }
      onClose={props.onClose}
      subtitle="Programs"
      title="Change program"
      visible={props.visible}
    >
          <ScrollView contentContainerStyle={styles.programChoiceList}>
            <View style={styles.searchPanel}>
              <View style={styles.searchHeaderRow}>
                <AppText variant="label" tone="accent">
                  Search
                </AppText>
                <Pressable accessibilityRole="button" onPress={() => setFiltersExpanded((current) => !current)}>
                  <AppText variant="meta" tone="accent">
                    {filtersExpanded
                      ? "Hide filters"
                      : sourceFilter !== "any" || difficultyFilter !== "any" || daysFilter !== "any" || focusFilter !== "any"
                        ? "Filters (on)"
                        : "Filters"}
                  </AppText>
                </Pressable>
              </View>
              <Input
                autoCapitalize="words"
                onChangeText={setSearchQuery}
                placeholder="Full body, beginner, 3-day..."
                value={searchQuery}
              />

              {filtersExpanded ? (
                <View style={styles.filterPanel}>
                  <View style={styles.chipRow}>
                    <AppText variant="overline" tone="secondary" style={styles.chipRowLabel}>
                      Source
                    </AppText>
                    {[
                      { key: "any" as const, label: "Any" },
                      { key: "predefined" as const, label: "Predefined" },
                      { key: "custom" as const, label: "Custom" }
                    ].map((option) => (
                      <Chip
                        key={`src:${option.key}`}
                        onPress={() => setSourceFilter(option.key)}
                        label={option.label}
                        selected={sourceFilter === option.key}
                      />
                    ))}
                  </View>

                  <View style={styles.chipRow}>
                    <AppText variant="overline" tone="secondary" style={styles.chipRowLabel}>
                      Difficulty
                    </AppText>
                    {(["any", "beginner", "intermediate", "advanced"] as const).map((value) => (
                      <Chip
                        key={`diff:${value}`}
                        onPress={() => setDifficultyFilter(value)}
                        label={value === "any" ? "Any" : value}
                        selected={difficultyFilter === value}
                      />
                    ))}
                  </View>

                  <View style={styles.chipRow}>
                    <AppText variant="overline" tone="secondary" style={styles.chipRowLabel}>
                      Days
                    </AppText>
                    {[
                      { key: "any" as const, label: "Any" },
                      { key: 2, label: "2" },
                      { key: 3, label: "3" },
                      { key: 4, label: "4" },
                      { key: 5, label: "5" },
                      { key: 6, label: "6" }
                    ].map((option) => (
                      <Chip
                        key={`days:${String(option.key)}`}
                        onPress={() => setDaysFilter(option.key)}
                        label={option.label}
                        selected={daysFilter === option.key}
                      />
                    ))}
                  </View>

                  <View style={styles.chipRow}>
                    <AppText variant="overline" tone="secondary" style={styles.chipRowLabel}>
                      Focus
                    </AppText>
                    {[
                      { key: "any" as const, label: "Any" },
                      { key: "full_body" as const, label: "Full body" },
                      { key: "split" as const, label: "Split" },
                      { key: "quick" as const, label: "Quick" }
                    ].map((option) => (
                      <Chip
                        key={`focus:${option.key}`}
                        onPress={() => setFocusFilter(option.key)}
                        label={option.label}
                        selected={focusFilter === option.key}
                      />
                    ))}

                    {sourceFilter !== "any" ||
                    difficultyFilter !== "any" ||
                    daysFilter !== "any" ||
                    focusFilter !== "any" ? (
                      <Chip label="Clear" onPress={clearFilters} style={styles.clearChip} />
                    ) : null}
                  </View>
                </View>
              ) : null}
            </View>

            {props.loadingPrograms ? (
              <AppText tone="secondary">Loading programs...</AppText>
            ) : props.programs.length === 0 ? (
              <AppText tone="secondary">No active programs are available yet.</AppText>
            ) : filteredPrograms.length === 0 ? (
              <AppText tone="secondary">No programs match your search.</AppText>
            ) : (
              filteredPrograms.map((program) => {
                const isCurrentProgram = program.id === props.activeProgramId;
                const workoutNames = program.workouts.map((workout) => workout.name).join(" / ");

                return (
                  <Card key={program.id} elevated style={styles.programChoice}>
                    <AppText variant="title2">{program.name}</AppText>
                    <View style={styles.sourcePill}>
                      <AppText variant="overline" tone="primary">
                        {program.source === "custom" ? "Custom program" : "Predefined program"}
                      </AppText>
                    </View>
                    <AppText tone="secondary">{program.description}</AppText>
                    <AppText variant="meta" tone="secondary">
                      {program.daysPerWeek} days/week - {program.sessionDurationMinutes} minutes - {program.difficultyLevel}
                    </AppText>
                    <AppText tone="secondary">{workoutNames}</AppText>
                    <PrimaryButton
                      label={program.source === "custom" ? "Edit Program" : "Customize Program"}
                      disabled={props.selectingProgram}
                      onPress={() => props.onEditProgram(program.id)}
                      tone="secondary"
                    />
                    <PrimaryButton
                      label={isCurrentProgram ? "Current program" : "Switch to this program"}
                      disabled={isCurrentProgram || props.selectingProgram}
                      loading={!isCurrentProgram && props.selectingProgram}
                      onPress={() => props.onSelectProgram(program.id)}
                      tone={isCurrentProgram ? "secondary" : "primary"}
                    />
                  </Card>
                );
              })
            )}
      </ScrollView>

      {props.errorMessage ? (
        <AppText variant="meta" tone="danger">
          {props.errorMessage}
        </AppText>
      ) : null}
      <PrimaryButton label="Create Program" tone="secondary" onPress={props.onCreateProgram} />
    </ModalSheet>
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
    letterSpacing: 1.1,
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
  card: {
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
    fontSize: 24,
    fontWeight: "600"
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22
  },
  metaLine: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20
  },
  searchPanel: {
    gap: spacing.xs
  },
  searchHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  searchLabel: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  linkText: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "600"
  },
  searchInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "600",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  filterPanel: {
    gap: spacing.xs
  },
  chipRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  chipRowLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginRight: spacing.xs,
    textTransform: "uppercase"
  },
  chip: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  chipSelected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentStrong
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize"
  },
  chipTextSelected: {
    color: colors.accentStrong
  },
  clearChip: {
    backgroundColor: "transparent",
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  clearChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700"
  },
  sourcePill: {
    alignSelf: "flex-start",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  positionText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22
  },
  nextWorkoutSummary: {
    gap: spacing.xs
  },
  nextWorkoutName: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34
  },
  exerciseList: {
    gap: spacing.xs
  },
  exerciseLine: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21
  },
  programBlock: {
    gap: spacing.sm
  },
  secondaryWorkoutActions: {
    gap: spacing.xs
  },
  errorText: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "600"
  },
  warningText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20
  },
  actions: {
    gap: spacing.sm
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.46)",
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.md
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderRadius: 12,
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
    fontWeight: "600"
  },
  closeButton: {
    paddingVertical: spacing.xs
  },
  closeLabel: {
    color: colors.accentStrong,
    fontSize: 15,
    fontWeight: "600"
  },
  programChoiceList: {
    gap: spacing.sm
  },
  programChoice: {
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  workoutChoice: {
    borderColor: colors.border,
    borderRadius: 12,
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
    fontWeight: "600",
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
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  }
});
