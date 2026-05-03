import { useEffect, useMemo, useState } from "react";
import type { GuidedEquipmentAccessLevel, GuidedGoalType, GuidedRecoveryPreference, ProgressionAggressiveness } from "@fitness/shared";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "../components/AppText";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Chip } from "../components/Chip";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { useFollowProgram } from "../features/workout/hooks/useFollowProgram";
import { useTrainingSettings } from "../features/workout/hooks/useTrainingSettings";
import { recommendGuidedProgram } from "../api/workouts";
import { colors, radius, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "GuidedProgramSetup">;

type StepId =
  | "goal"
  | "experience"
  | "days"
  | "duration"
  | "equipment"
  | "progression"
  | "recovery"
  | "review";

const steps: StepId[] = ["goal", "experience", "days", "duration", "equipment", "progression", "recovery", "review"];

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
  const step = steps[Math.min(steps.length - 1, Math.max(0, stepIndex))] ?? "goal";

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
  const [equipmentAccess, setEquipmentAccess] = useState<GuidedEquipmentAccessLevel>(defaults.equipmentAccess);
  const [progressionAggressiveness, setProgressionAggressiveness] = useState<ProgressionAggressiveness>(
    defaults.progressionAggressiveness
  );
  const [recoveryPreference, setRecoveryPreference] = useState<GuidedRecoveryPreference>(defaults.recoveryPreference);

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

  const answers = useMemo(
    () => ({
      goal,
      experienceLevel,
      daysPerWeek,
      sessionDurationMinutes,
      equipmentAccess,
      progressionAggressiveness,
      recoveryPreference
    }),
    [
      daysPerWeek,
      equipmentAccess,
      experienceLevel,
      goal,
      progressionAggressiveness,
      recoveryPreference,
      sessionDurationMinutes
    ]
  );

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

  const stepLabel = `Step ${stepIndex + 1} of ${steps.length}`;

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
          <AppText variant="title2">Answer a few quick questions</AppText>
          <AppText variant="meta" tone="secondary">
            {stepLabel}
          </AppText>
        </View>

        {step !== "review" ? (
          <Card variant="default" style={styles.card}>
            {step === "goal" ? (
              <>
                <AppText variant="headline">What’s your main goal?</AppText>
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
                <AppText variant="headline">Training experience</AppText>
                <View style={styles.choiceGrid}>
                  {[
                    { id: "beginner", label: "Beginner" },
                    { id: "intermediate", label: "Intermediate" },
                    { id: "advanced", label: "Advanced" }
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

            {step === "days" ? (
              <>
                <AppText variant="headline">Days per week</AppText>
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
              </>
            ) : null}

            {step === "duration" ? (
              <>
                <AppText variant="headline">Session duration</AppText>
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
              </>
            ) : null}

            {step === "progression" ? (
              <>
                <AppText variant="headline">Progression style</AppText>
                <AppText tone="secondary">
                  This sets the tone for how quickly the plan tries to increase loads.
                </AppText>
                <View style={styles.choiceGrid}>
                  {[
                    { id: "conservative", label: "Conservative" },
                    { id: "balanced", label: "Balanced" },
                    { id: "aggressive", label: "Aggressive" }
                  ].map((option) => (
                    <Chip
                      key={option.id}
                      label={option.label}
                      selected={progressionAggressiveness === option.id}
                      onPress={() => setProgressionAggressiveness(option.id as ProgressionAggressiveness)}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {step === "recovery" ? (
              <>
                <AppText variant="headline">Recovery adjustments</AppText>
                <AppText tone="secondary">Choose how much the plan should adjust when recovery is low.</AppText>
                <View style={styles.choiceGrid}>
                  {[
                    { id: "adjust_when_needed", label: "Adjust when needed" },
                    { id: "small_adjustments_only", label: "Small adjustments only" },
                    { id: "keep_fixed", label: "Keep fixed" }
                  ].map((option) => (
                    <Chip
                      key={option.id}
                      label={option.label}
                      selected={recoveryPreference === option.id}
                      onPress={() => setRecoveryPreference(option.id as GuidedRecoveryPreference)}
                    />
                  ))}
                </View>
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
                    <Chip label={`${answers.daysPerWeek} days/week`} variant="muted" />
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
                    Experience: {answers.experienceLevel}
                  </AppText>
                  <AppText variant="meta" tone="secondary">
                    Progression style: {answers.progressionAggressiveness}
                  </AppText>
                  <AppText variant="meta" tone="secondary">
                    Recovery adjustments: {answers.recoveryPreference.replaceAll("_", " ")}
                  </AppText>
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
                    What we’ll monitor (preview)
                  </AppText>
                  <AppText variant="meta" tone="secondary">
                    Workout consistency, performance trends, missed reps, and recovery signals.
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
          <Button label={stepIndex === 0 ? "Close" : "Back"} onPress={goBack} variant="ghost" />
          {step !== "review" ? <PrimaryButton label="Continue" onPress={goNext} /> : null}
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
  reviewSection: {
    gap: 4
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
  }
});
