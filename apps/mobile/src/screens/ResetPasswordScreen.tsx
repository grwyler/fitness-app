import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { confirmPasswordReset } from "../api/auth";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { colors, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "ResetPassword">;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to reset password.";
}

export function ResetPasswordScreen({ navigation, route }: Props) {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const email = route.params?.email;

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await confirmPasswordReset({
        token: token.trim(),
        password
      });
      navigation.navigate("SignIn");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Password reset</Text>
        <Text style={styles.title}>Set a new password.</Text>
        <Text style={styles.subtitle}>
          {email ? `Use the link we sent to ${email}, or paste the token below.` : "Use the link we sent, or paste the token below."}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Reset token</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setToken}
          placeholder="Paste token"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={token}
        />

        <Text style={styles.label}>New password</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="new-password"
          onChangeText={setPassword}
          placeholder="New password (8+ characters)"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          style={styles.input}
          value={password}
        />

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <PrimaryButton label="Reset password" loading={isSubmitting} onPress={() => void handleSubmit()} />
        <PrimaryButton label="Back to sign in" onPress={() => navigation.navigate("SignIn")} tone="secondary" />
      </View>
    </Screen>
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
    letterSpacing: 1,
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
  label: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600"
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: spacing.md
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20
  }
});

