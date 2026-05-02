import { useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Platform, StyleSheet, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { AppText } from "../components/AppText";
import { Input } from "../components/Input";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAppAuth } from "../core/auth/AuthProvider";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { colors, spacing } from "../theme/tokens";
import { requestResetTestDataConfirmation } from "../features/workout/utils/reset-test-data.shared";
import { resetUserData, seedTestAccount } from "../api/admin";

type Props = NativeStackScreenProps<RootStackParamList, "AdminDashboard">;

const DEFAULT_TEST_ACCOUNT_EMAIL = "test@test.com";

export function AdminDashboardScreen({ navigation }: Props) {
  const auth = useAppAuth();
  const [email, setEmail] = useState(DEFAULT_TEST_ACCOUNT_EMAIL);
  const [feedback, setFeedback] = useState<string | null>(null);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const seedMutation = useMutation({
    mutationFn: () => seedTestAccount(normalizedEmail),
    onSuccess: (response) => {
      setFeedback(`Seeded ${response.data.user.email} (${response.data.user.role}).`);
      Alert.alert("Seed complete", `Seeded ${response.data.user.email}.`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to seed test account.";
      setFeedback(message);
      Alert.alert("Seed failed", message);
    }
  });

  const resetMutation = useMutation({
    mutationFn: () => resetUserData(normalizedEmail),
    onSuccess: (response) => {
      const deletedCount = Object.values(response.data.deleted ?? {}).reduce(
        (total, value) => total + (value ?? 0),
        0
      );
      const message = `Reset complete. ${deletedCount} records cleared for ${response.data.email}.`;
      setFeedback(message);
      Alert.alert("Reset complete", message);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to reset user data.";
      setFeedback(message);
      Alert.alert("Reset failed", message);
    }
  });

  function confirmReset() {
    const webConfirm = (globalThis as { confirm?: (message: string) => boolean }).confirm;

    requestResetTestDataConfirmation({
      alert: Alert,
      confirmationMessage: `This will reset workout data for ${normalizedEmail}. Continue?`,
      confirm: webConfirm,
      log: () => {},
      onConfirm: () => {
        setFeedback(null);
        resetMutation.mutate();
      },
      platformOs: Platform.OS
    });
  }

  if (!auth.isAdmin) {
    return (
      <Screen>
        <Card variant="default" style={styles.card}>
          <AppText variant="title2">Admin access required</AppText>
          <AppText tone="secondary">This screen is only available to admin users.</AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card variant="default" style={styles.card}>
        <AppText variant="caption" tone="accent">
          Feedback
        </AppText>
        <AppText variant="title2">Feedback management</AppText>
        <AppText tone="secondary">Review, update, and delete feedback submitted by any user.</AppText>
        <PrimaryButton
          label="Open feedback manager"
          onPress={() => navigation.navigate("AdminFeedback")}
        />
      </Card>

      <Card variant="default" style={styles.card}>
        <AppText variant="caption" tone="accent">
          Test tools
        </AppText>
        <AppText variant="title2">Seed / reset test accounts</AppText>
        <AppText tone="secondary">
          These tools are restricted to approved test accounts. Default: {DEFAULT_TEST_ACCOUNT_EMAIL}.
        </AppText>

        <View style={styles.row}>
          <Input
            label="Account email"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.row}>
          <PrimaryButton
            label="Seed account"
            tone="secondary"
            loading={seedMutation.isPending}
            disabled={seedMutation.isPending || resetMutation.isPending}
            onPress={() => {
              setFeedback(null);
              seedMutation.mutate();
            }}
          />
          <PrimaryButton
            label="Reset user data"
            tone="danger"
            loading={resetMutation.isPending}
            disabled={seedMutation.isPending || resetMutation.isPending}
            onPress={confirmReset}
          />
        </View>

        {feedback ? <AppText tone="secondary">{feedback}</AppText> : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "flex-end"
  },
  linkText: {
    color: colors.accentStrong
  }
});

