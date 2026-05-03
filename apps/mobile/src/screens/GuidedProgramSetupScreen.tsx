import { useEffect, useMemo, useState } from "react";
import type {
  GuidedBusyWeekPreference,
  GuidedEquipmentAccessLevel,
  GuidedEquipmentType,
  GuidedFocusArea,
  GuidedGoalType,
  GuidedProgramAnswersV2,
  GuidedRecoveryPreference,
  GuidedRecoveryTolerance,
  GuidedScheduleFlexibility,
  GuidedSessionDurationFlexibility,
  GuidedTrainingStylePreference,
  ProgressionAggressiveness
} from "@fitness/shared";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "../components/AppText";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Chip } from "../components/Chip";
import { ErrorState } from "../components/ErrorState";
import { Input } from "../components/Input";
import { LoadingState } from "../components/LoadingState";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { useFollowProgram } from "../features/workout/hooks/useFollowProgram";
import { useTrainingSettings } from "../features/workout/hooks/useTrainingSettings";
import {
  buildGuidedProgramAnswersV2,
  getGuidedProgramSavedForLaterPreferences
} from "../features/workout/utils/guided-program-intake.shared";
import { recommendGuidedProgram } from "../api/workouts";
import { colors, radius, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "GuidedProgramSetup">;

type StepId =
  | "goal"
  | "experience"
  | "schedule"
  | "duration"
  | "equipment"
  | "quickReview"
  | "style"
  | "preferences"
  | "constraints"
  | "review";

function toggleSelection<T extends string>(current: T[], value: T) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

function mapTrainingGoalToGuidedGoal(goal: string | null | undefined): GuidedGoalType {
  switch (goal) {
    case "hypertrophy":
    case "strength":
    case "general_fitness":
      return goal;
    case "endurance":
      return "sport_support";
    default:
      return "custom";
  }
}

function mapRecoveryPreference(input: { useRecoveryAdjustments?: boolean; allowAutoDeload?: boolean }): GuidedRecoveryPreference {
  if (input.useRecoveryAdjustments === false) {
    return "keep_fixed";
  }

  if (input.allowAutoDeload === false) {
    return "small_adjustments_only";
  }

  return "adjust_when_needed";
}

export function GuidedProgramSetupScreen({ navigation }: Props) {
  const trainingSettingsQuery = useTrainingSettings();
  const followProgramMutation = useFollowProgram();
  const [defaultsInitialized, setDefaultsInitialized] = useState(false);

  const [stepIndex, setStepIndex] = useState(0);
  const [includeRefinement, setIncludeRefinement] = useState(false);

  const steps = useMemo<StepId[]>(() => {
    const core: StepId[] = ["goal", "experience", "schedule", "duration", "equipment", "quickReview"];
    const refinement: StepId[] = includeRefinement ? ["style", "preferences", "constraints"] : [];
    return [...core, ...refinement, "review"];
  }, [includeRefinement]);

  const safeStepIndex = Math.min(steps.length - 1, Math.max(0, stepIndex));
  const step = steps[safeStepIndex] ?? "goal";

  useEffect(() => {
    setStepIndex((current) => Math.min(current, steps.length - 1));
  }, [steps.length]);

  const defaults = useMemo(() => {
    const settings = trainingSettingsQuery.data ?? null;
    return {
      goal: mapTrainingGoalToGuidedGoal(settings?.trainingGoal),
      experienceLevel: settings?.experienceLevel ?? "beginner",
      daysPerWeek: 3 as const,
      sessionDurationMinutes: 45 as const,
      equipmentAccess: "full_gym" as const,
      progressionAggressiveness: (settings?.progressionAggressiveness ?? "balanced") as ProgressionAggressiveness,
      recoveryPreference: mapRecoveryPreference({
        useRecoveryAdjustments: settings?.useRecoveryAdjustments,
        allowAutoDeload: settings?.allowAutoDeload
      })
    };
  }, [trainingSettingsQuery.data]);

  const [goal, setGoal] = useState<GuidedGoalType>(defaults.goal);
  const [experienceLevel, setExperienceLevel] = useState<"beginner" | "intermediate" | "advanced">(defaults.experienceLevel);
  const [daysPerWeek, setDaysPerWeek] = useState<2 | 3 | 4 | 5 | 6>(defaults.daysPerWeek);
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState<30 | 45 | 60 | 75>(defaults.sessionDurationMinutes);
  const [scheduleFlexibility, setScheduleFlexibility] = useState<GuidedScheduleFlexibility>("some_flex");
  const [sessionDurationFlexibility, setSessionDurationFlexibility] = useState<GuidedSessionDurationFlexibility>("some_flex");
  const [equipmentAccess, setEquipmentAccess] = useState<GuidedEquipmentAccessLevel>(defaults.equipmentAccess);
  const [avoidEquipment, setAvoidEquipment] = useState<GuidedEquipmentType[]>([]);
  const [progressionAggressiveness, setProgressionAggressiveness] = useState<ProgressionAggressiveness>(
    defaults.progressionAggressiveness
  );
  const [recoveryPreference, setRecoveryPreference] = useState<GuidedRecoveryPreference>(defaults.recoveryPreference);
  const [recoveryTolerance, setRecoveryTolerance] = useState<GuidedRecoveryTolerance | null>(null);
  const [busyWeekPreference, setBusyWeekPreference] = useState<GuidedBusyWeekPreference | null>(null);
  const [trainingStylePreference, setTrainingStylePreference] = useState<GuidedTrainingStylePreference | null>(null);
  const [focusAreas, setFocusAreas] = useState<GuidedFocusArea[]>([]);
  const [exerciseExclusions, setExerciseExclusions] = useState("");

  const [recommendation, setRecommendation] = useState<Awaited<ReturnType<typeof recommendGuidedProgram>>["data"] | null>(
    null
  );
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);

  useEffect(() => {
    if (defaultsInitialized) {
      return;
    }

    if (!trainingSettingsQuery.data) {
      return;
    }

    setGoal(defaults.goal);
    setExperienceLevel(defaults.experienceLevel);
    setDaysPerWeek(defaults.daysPerWeek);
    setSessionDurationMinutes(defaults.sessionDurationMinutes);
    setEquipmentAccess(defaults.equipmentAccess);
    setProgressionAggressiveness(defaults.progressionAggressiveness);
    setRecoveryPreference(defaults.recoveryPreference);
    setDefaultsInitialized(true);
  }, [defaults, defaultsInitialized, trainingSettingsQuery.data]);

  const answers: GuidedProgramAnswersV2 = useMemo(() => {
    return buildGuidedProgramAnswersV2({
      includeRefinement,
      goal,
      experienceLevel,
      daysPerWeek,
      scheduleFlexibility,
      sessionDurationMinutes,
      sessionDurationFlexibility,
      equipmentAccess,
      avoidEquipment,
      progressionAggressiveness,
      recoveryPreference,
      trainingStylePreference,
      focusAreas,
      busyWeekPreference,
      recoveryTolerance,
      exerciseExclusions
    });
  }, [
    avoidEquipment,
    busyWeekPreference,
    daysPerWeek,
    equipmentAccess,
    exerciseExclusions,
    experienceLevel,
    focusAreas,
    goal,
    includeRefinement,
    progressionAggressiveness,
    recoveryPreference,
    recoveryTolerance,
    scheduleFlexibility,
    sessionDurationFlexibility,
    sessionDurationMinutes,
    trainingStylePreference
  ]);

  const savedForLaterPreferences = useMemo(() => getGuidedProgramSavedForLaterPreferences(answers), [answers]);

  async function ensureRecommendation() {
    if (loadingRecommendation) {
      return;
    }

    setRecommendationError(null);
    setLoadingRecommendation(true);
    try {
      const response = await recommendGuidedProgram(answers);
      setRecommendation(response.data);
    } catch (error) {
      setRecommendation(null);
      setRecommendationError(error instanceof Error ? error.message : "Unable to load a recommendation.");
    } finally {
      setLoadingRecommendation(false);
    }
  }

  function goNext() {
    if (step === "review") {
      return;
    }

    const nextStep = stepIndex + 1;
    setStepIndex(nextStep);
  }

  function goBack() {
    if (stepIndex <= 0) {
      navigation.goBack();
      return;
    }
    setStepIndex((current) => Math.max(0, current - 1));
  }

  useEffect(() => {
    if (step === "review" && !recommendation && !loadingRecommendation && !recommendationError) {
      void ensureRecommendation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const stepLabel = `Step ${safeStepIndex + 1} of ${steps.length}`;

  if (trainingSettingsQuery.isLoading && !trainingSettingsQuery.data) {
    return (
      <Screen>
        <LoadingState label="Loading your settings..." />
      </Screen>
    );
  }

  if (trainingSettingsQuery.isError && !trainingSettingsQuery.data) {
    return (
      <Screen>
        <ErrorState
          title="Setup unavailable"
          message="We couldn't load your training settings."
          actionLabel="Try again"
          onAction={() => void trainingSettingsQuery.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <AppText variant="overline" tone="accent">
            Recommended plan
          </AppText>
          <AppText variant="title2">Let’s find a plan that fits</AppText>
          <AppText variant="meta" tone="secondary">
            {stepLabel}
          </AppText>
        </View>

        {step !== "review" ? (
          <Card variant="default" style={styles.card}>
            {step === "goal" ? (
              <>
                <AppText variant="headline">What are you training for right now?</AppText>
                <View style={styles.choiceGrid}>
                  {[
                    { id: "hypertrophy", label: "Build muscle" },
                    { id: "strength", label: "Get stronger" },
                    { id: "general_fitness", label: "General fitness" },
                    { id: "consistency", label: "Improve consistency" },
                    { id: "sport_support", label: "Support another sport" },
                    { id: "custom", label: "Not sure" }
                  ].map((option) => (
                    <Chip
                      key={option.id}
                      label={option.label}
                      selected={goal === option.id}
                      onPress={() => setGoal(option.id as GuidedGoalType)}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {step === "experience" ? (
              <>
                <AppText variant="headline">How experienced are you with strength training?</AppText>
                <View style={styles.choiceGrid}>
                  {[
                    { id: "beginner", label: "New / returning" },
                    { id: "intermediate", label: "Some experience" },
                    { id: "advanced", label: "Very experienced" }
                  ].map((option) => (
                    <Chip
                      key={option.id}
                      label={option.label}
                      selected={experienceLevel === option.id}
                      onPress={() => setExperienceLevel(option.id as typeof experienceLevel)}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {step === "schedule" ? (
              <>
                <AppText variant="headline">How many days can you realistically train most weeks?</AppText>
                <View style={styles.choiceGrid}>
                  {[2, 3, 4, 5, 6].map((count) => (
                    <Chip
                      key={count}
                      label={`${count} days`}
                      selected={daysPerWeek === count}
                      onPress={() => setDaysPerWeek(count as 2 | 3 | 4 | 5 | 6)}
                    />
                  ))}
                </View>

                <AppText variant="label" tone="accent" style={styles.subLabel}>
                  How strict is that schedule?
                </AppText>
                <View style={styles.choiceGrid}>
                  {[
                    { id: "strict", label: "Pretty strict" },
                    { id: "some_flex", label: "Some wiggle room" },
                    { id: "very_flex", label: "Very flexible" }
                  ].map((option) => (
                    <Chip
                      key={option.id}
                      label={option.label}
                      selected={scheduleFlexibility === option.id}
                      onPress={() => setScheduleFlexibility(option.id as GuidedScheduleFlexibility)}
                      variant="muted"
                    />
                  ))}
                </View>
              </>
            ) : null}

            {step === "duration" ? (
              <>
                <AppText variant="headline">How long do you want each workout to take?</AppText>
                <View style={styles.choiceGrid}>
                  {[
                    { value: 30, label: "30 min" },
                    { value: 45, label: "45 min" },
                    { value: 60, label: "60 min" },
                    { value: 75, label: "75+ min" }
                  ].map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      selected={sessionDurationMinutes === option.value}
                      onPress={() => setSessionDurationMinutes(option.value as 30 | 45 | 60 | 75)}
                    />
                  ))}
                </View>

                <AppText variant="label" tone="accent" style={styles.subLabel}>
                  How flexible is that?
                </AppText>
                <View style={styles.choiceGrid}>
                  {[
                    { id: "strict", label: "Need it tight" },
                    { id: "some_flex", label: "Can stretch a bit" },
                    { id: "very_flex", label: "Flexible" }
                  ].map((option) => (
                    <Chip
                      key={option.id}
                      label={option.label}
                      selected={sessionDurationFlexibility === option.id}
                      onPress={() => setSessionDurationFlexibility(option.id as GuidedSessionDurationFlexibility)}
                      variant="muted"
                    />
                  ))}
                </View>
              </>
            ) : null}

            {step === "equipment" ? (
              <>
                <AppText variant="headline">Equipment access</AppText>
                <View style={styles.choiceGrid}>
                  {[
                    { id: "full_gym", label: "Full gym" },
                    { id: "barbell_rack", label: "Barbell + rack" },
                    { id: "dumbbells", label: "Dumbbells" },
                    { id: "machines_cables", label: "Machines/cables" },
                    { id: "bodyweight_only", label: "Bodyweight only" },
                    { id: "home_gym", label: "Home gym" }
                  ].map((option) => (
                    <Chip
                      key={option.id}
                      label={option.label}
                      selected={equipmentAccess === option.id}
                      onPress={() => setEquipmentAccess(option.id as GuidedEquipmentAccessLevel)}
                    />
                  ))}
                </View>

                <AppText variant="label" tone="accent" style={styles.subLabel}>
                  Anything you want to avoid? (optional)
                </AppText>
                <View style={styles.choiceGrid}>
                  {[
                    { id: "barbell", label: "Barbell" },
                    { id: "machine", label: "Machines" },
                    { id: "cable", label: "Cables" },
                    { id: "dumbbell", label: "Dumbbells" }
                  ].map((option) => (
                    <Chip
                      key={option.id}
                      label={option.label}
                      selected={avoidEquipment.includes(option.id as GuidedEquipmentType)}
                      onPress={() => setAvoidEquipment((current) => toggleSelection(current, option.id as GuidedEquipmentType))}
                      variant="muted"
                    />
                  ))}
                </View>
              </>
            ) : null}

            {step === "quickReview" ? (
              <>
                <AppText variant="headline">Quick check</AppText>
                <AppText tone="secondary">
                  Get a recommendation now, or answer a few extra questions for a tighter match.
                </AppText>

                <View style={styles.reviewSection}>
                  <AppText variant="label" tone="accent">
                    What I’m using
                  </AppText>
                  <View style={styles.planMetaRow}>
                    <Chip label={`${daysPerWeek} days/week`} variant="muted" />
                    <Chip label={`~${sessionDurationMinutes} min`} variant="muted" />
                    <Chip label={equipmentAccess.replaceAll("_", " ")} variant="muted" />
                  </View>
                  <AppText variant="meta" tone="secondary">
                    Goal: {goal.replaceAll("_", " ")}
                  </AppText>
                  <AppText variant="meta" tone="secondary">
                    Experience: {experienceLevel.replaceAll("_", " ")}
                  </AppText>
                </View>

                <PrimaryButton
                  label="Get my recommendation"
                  onPress={() => {
                    const reviewIndex = steps.indexOf("review");
                    setStepIndex(reviewIndex === -1 ? stepIndex + 1 : reviewIndex);
                  }}
                />

                <Button
                  label="Answer a few more (optional)"
                  variant="ghost"
                  onPress={() => {
                    setIncludeRefinement(true);
                    setStepIndex((current) => current + 1);
                  }}
                />
              </>
            ) : null}

            {step === "style" ? (
              <>
                <AppText variant="headline">How do you like to train?</AppText>
                <View style={styles.choiceGrid}>
                  {[
                    { id: "no_preference", label: "No preference" },
                    { id: "full_body", label: "Full body" },
                    { id: "split", label: "Split days" }
                  ].map((option) => (
                    <Chip
                      key={option.id}
                      label={option.label}
                      selected={(trainingStylePreference ?? "no_preference") === option.id}
                      onPress={() => setTrainingStylePreference(option.id as GuidedTrainingStylePreference)}
                    />
                  ))}
                </View>

                <AppText variant="label" tone="accent" style={styles.subLabel}>
                  Any areas you want to emphasize? (optional)
                </AppText>
                <View style={styles.choiceGrid}>
                  {[
                    { id: "balanced", label: "Balanced" },
                    { id: "upper_body", label: "Upper body" },
                    { id: "lower_body", label: "Lower body" },
                    { id: "arms", label: "Arms" },
                    { id: "back", label: "Back" },
                    { id: "glutes", label: "Glutes" },
                    { id: "core", label: "Core" }
                  ].map((option) => (
                    <Chip
                      key={option.id}
                      label={option.label}
                      selected={focusAreas.includes(option.id as GuidedFocusArea)}
                      onPress={() => setFocusAreas((current) => toggleSelection(current, option.id as GuidedFocusArea))}
                      variant="muted"
                    />
                  ))}
                </View>

                <Button
                  label="Skip the extra questions"
                  variant="ghost"
                  onPress={() => {
                    setIncludeRefinement(false);
                    const reviewIndex = steps.indexOf("review");
                    setStepIndex(reviewIndex === -1 ? stepIndex + 1 : reviewIndex);
                  }}
                />
              </>
            ) : null}

            {step === "preferences" ? (
              <>
                <AppText variant="headline">How hard should this push you?</AppText>
                <View style={styles.choiceGrid}>
                  {[
                    { id: "conservative", label: "Ease in" },
                    { id: "balanced", label: "Balanced" },
                    { id: "aggressive", label: "Push it" }
                  ].map((option) => (
                    <Chip
                      key={option.id}
                      label={option.label}
                      selected={progressionAggressiveness === option.id}
                      onPress={() => setProgressionAggressiveness(option.id as ProgressionAggressiveness)}
                    />
                  ))}
                </View>

                <AppText variant="label" tone="accent" style={styles.subLabel}>
                  When you’re run down, should the plan back off?
                </AppText>
                <View style={styles.choiceGrid}>
                  {[
                    { id: "adjust_when_needed", label: "Yes, adjust" },
                    { id: "small_adjustments_only", label: "Small adjustments" },
                    { id: "keep_fixed", label: "Keep it fixed" }
                  ].map((option) => (
                    <Chip
                      key={option.id}
                      label={option.label}
                      selected={recoveryPreference === option.id}
                      onPress={() => setRecoveryPreference(option.id as GuidedRecoveryPreference)}
                      variant="muted"
                    />
                  ))}
                </View>

                <AppText variant="label" tone="accent" style={styles.subLabel}>
                  Recovery tolerance (optional)
                </AppText>
                <View style={styles.choiceGrid}>
                  {[
                    { id: "low", label: "Low" },
                    { id: "normal", label: "Normal" },
                    { id: "high", label: "High" }
                  ].map((option) => (
                    <Chip
                      key={option.id}
                      label={option.label}
                      selected={(recoveryTolerance ?? "normal") === option.id}
                      onPress={() => setRecoveryTolerance(option.id as GuidedRecoveryTolerance)}
                      variant="muted"
                    />
                  ))}
                </View>

                <AppText variant="label" tone="accent" style={styles.subLabel}>
                  If you have a busy week… (optional)
                </AppText>
                <View style={styles.choiceGrid}>
                  {[
                    { id: "shorter_sessions", label: "Shorter sessions" },
                    { id: "fewer_days", label: "Fewer days" },
                    { id: "either", label: "Either is fine" }
                  ].map((option) => (
                    <Chip
                      key={option.id}
                      label={option.label}
                      selected={(busyWeekPreference ?? "either") === option.id}
                      onPress={() => setBusyWeekPreference(option.id as GuidedBusyWeekPreference)}
                      variant="muted"
                    />
                  ))}
                </View>

                <Button
                  label="Skip the extra questions"
                  variant="ghost"
                  onPress={() => {
                    setIncludeRefinement(false);
                    const reviewIndex = steps.indexOf("review");
                    setStepIndex(reviewIndex === -1 ? stepIndex + 1 : reviewIndex);
                  }}
                />
              </>
            ) : null}

            {step === "constraints" ? (
              <>
                <AppText variant="headline">Any constraints I should know about?</AppText>
                <AppText tone="secondary">
                  Optional. For example: no overhead pressing, avoid deep squats, no running.
                </AppText>
                <Input
                  label="Exercises to avoid"
                  placeholder="Type anything you want to avoid (optional)"
                  value={exerciseExclusions}
                  onChangeText={setExerciseExclusions}
                  multiline
                  textAlignVertical="top"
                  style={styles.textArea}
                />

                <Button
                  label="Skip the extra questions"
                  variant="ghost"
                  onPress={() => {
                    setIncludeRefinement(false);
                    const reviewIndex = steps.indexOf("review");
                    setStepIndex(reviewIndex === -1 ? stepIndex + 1 : reviewIndex);
                  }}
                />
              </>
            ) : null}
          </Card>
        ) : (
          <Card variant="default" style={styles.card}>
            <AppText variant="headline">Recommended plan</AppText>

            {loadingRecommendation ? <LoadingState label="Finding the best plan..." /> : null}
            {recommendationError ? (
              <ErrorState
                title="Recommendation unavailable"
                message={recommendationError}
                actionLabel="Try again"
                onAction={() => void ensureRecommendation()}
              />
            ) : null}

            {recommendation ? (
              <>
                <View style={styles.recommendationHeader}>
                  <AppText variant="title2">{recommendation.program.name}</AppText>
                  <View style={styles.planMetaRow}>
                    <Chip label={`${answers.schedule.daysPerWeek} days/week`} variant="muted" />
                    <Chip label={`~${recommendation.program.sessionDurationMinutes} min`} variant="muted" />
                  </View>
                </View>

                <View style={styles.reviewSection}>
                  <AppText variant="label" tone="accent">
                    Your inputs
                  </AppText>
                  <AppText variant="meta" tone="secondary">
                    Goal: {answers.goal.replaceAll("_", " ")}
                  </AppText>
                  <AppText variant="meta" tone="secondary">
                    Experience: {answers.experienceLevel.replaceAll("_", " ")}
                  </AppText>
                  <AppText variant="meta" tone="secondary">
                    Schedule: {answers.schedule.daysPerWeek} days/week ({answers.schedule.flexibility.replaceAll("_", " ")})
                  </AppText>
                  <AppText variant="meta" tone="secondary">
                    Session length: ~{answers.sessions.durationMinutes} min ({answers.sessions.flexibility.replaceAll("_", " ")})
                  </AppText>
                  <AppText variant="meta" tone="secondary">
                    Equipment: {answers.equipment.access.replaceAll("_", " ")}
                    {answers.equipment.avoid?.length ? ` (avoid: ${answers.equipment.avoid.join(", ")})` : ""}
                  </AppText>
                  <AppText variant="meta" tone="secondary">
                    Progression: {answers.preferences.progressionAggressiveness}
                  </AppText>
                  <AppText variant="meta" tone="secondary">
                    Recovery adjustments: {answers.preferences.recoveryPreference.replaceAll("_", " ")}
                  </AppText>

                  {answers.intakeDepth === "refined" ? (
                    <>
                      <AppText variant="meta" tone="secondary">
                        Plan style: {(answers.preferences.trainingStylePreference ?? "no_preference").replaceAll("_", " ")}
                      </AppText>
                      {answers.preferences.focusAreas?.length ? (
                        <AppText variant="meta" tone="secondary">
                          Focus areas: {answers.preferences.focusAreas.map((item) => item.replaceAll("_", " ")).join(", ")}
                        </AppText>
                      ) : null}
                      {answers.preferences.exerciseExclusions ? (
                        <AppText variant="meta" tone="secondary">
                          Avoid: {answers.preferences.exerciseExclusions}
                        </AppText>
                      ) : null}
                    </>
                  ) : (
                    <AppText variant="meta" tone="secondary">
                      Extra preferences: skipped (you can customize next)
                    </AppText>
                  )}

                  {savedForLaterPreferences.length > 0 ? (
                    <AppText variant="meta" tone="secondary">
                      Saved for later: {savedForLaterPreferences.join(", ")}. Most plans aren’t fully tagged for these
                      yet — you can customize before starting.
                    </AppText>
                  ) : null}
                </View>

                <View style={styles.reviewSection}>
                  <AppText variant="label" tone="accent">
                    Why this plan
                  </AppText>
                  {recommendation.reasons.map((reason) => (
                    <AppText key={reason} variant="meta" tone="secondary">
                      • {reason}
                    </AppText>
                  ))}
                </View>

                {recommendation.warnings.length > 0 ? (
                  <View style={styles.reviewSection}>
                    <AppText variant="label" tone="accent">
                      Assumptions
                    </AppText>
                    {recommendation.warnings.map((warning) => (
                      <View key={warning} style={styles.warningRow}>
                        <View style={styles.warningDot} />
                        <AppText variant="meta" tone="secondary" style={styles.warningText}>
                          {warning}
                        </AppText>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={styles.reviewSection}>
                  <AppText variant="label" tone="accent">
                    Workout preview
                  </AppText>
                  {recommendation.program.workouts.slice(0, 2).map((workout) => {
                    const shownExercises = workout.exercises.slice(0, 4);
                    const hiddenCount = Math.max(0, workout.exercises.length - shownExercises.length);
                    return (
                      <View key={workout.id} style={styles.previewWorkout}>
                        <AppText variant="meta" tone="secondary">
                          {workout.name}
                        </AppText>
                        <AppText variant="meta" tone="secondary">
                          {shownExercises.map((exercise) => exercise.exerciseName).join(" • ")}
                          {hiddenCount > 0 ? ` • +${hiddenCount} more` : ""}
                        </AppText>
                      </View>
                    );
                  })}
                  <AppText variant="meta" tone="secondary">
                    You can customize exercises and days before starting.
                  </AppText>
                </View>

                <PrimaryButton
                  label="Start this plan"
                  loading={followProgramMutation.isPending}
                  disabled={followProgramMutation.isPending}
                  onPress={() => {
                    followProgramMutation.mutate(
                      {
                        programId: recommendation.program.id,
                        request: {
                          activationSource: "guided",
                          guidedAnswers: answers,
                          guidedRecommendation: {
                            reasons: recommendation.reasons,
                            warnings: recommendation.warnings,
                            isExactMatch: recommendation.isExactMatch
                          }
                        }
                      },
                      {
                        onSuccess: () => navigation.navigate("Dashboard")
                      }
                    );
                  }}
                />

                <PrimaryButton
                  label="Customize before starting"
                  tone="secondary"
                  disabled={followProgramMutation.isPending}
                  onPress={() => navigation.navigate("CreateProgram", { cloneProgramId: recommendation.program.id })}
                />
              </>
            ) : null}
          </Card>
        )}

        <View style={styles.footer}>
          <Button label={safeStepIndex === 0 ? "Close" : "Back"} onPress={goBack} variant="ghost" />
          {step !== "review" && step !== "quickReview" ? (
            <PrimaryButton label={step === "constraints" ? "See my recommendation" : "Continue"} onPress={goNext} />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm
  },
  header: {
    gap: spacing.xs
  },
  card: {
    gap: spacing.sm
  },
  choiceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
    paddingBottom: spacing.lg
  },
  recommendationHeader: {
    gap: spacing.xs
  },
  planMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  subLabel: {
    marginTop: spacing.sm
  },
  reviewSection: {
    gap: 4
  },
  previewWorkout: {
    gap: 2
  },
  warningRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start"
  },
  warningDot: {
    width: 10,
    height: 10,
    borderRadius: radius.xs,
    backgroundColor: colors.warning,
    marginTop: 4
  },
  warningText: {
    flex: 1
  },
  textArea: {
    minHeight: 96
  }
});
