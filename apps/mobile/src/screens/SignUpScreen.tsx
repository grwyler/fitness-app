import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { signUpWithPassword } from "../api/auth";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { OAuthButtons } from "../components/OAuthButtons";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { useAppAuth } from "../core/auth/AuthProvider";
import { useOAuthAuth } from "../core/auth/use-oauth-auth";
import { colors, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "SignUp">;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to create account.";
}

export function SignUpScreen({ navigation }: Props) {
  const auth = useAppAuth();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { oauthErrorMessage, oauthLoadingProvider, startOAuth } = useOAuthAuth({
    intent: "signup",
    enabledProviders: ["google"]
  });

  const handleCreateAccount = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await signUpWithPassword({
        email: emailAddress.trim(),
        password
      });
      await auth.completeSignIn(result);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    const result = await startOAuth("google");
    if (result) {
      await auth.completeSignIn(result);
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Create account</Text>
        <Text style={styles.title}>Start with a simple sign up.</Text>
        <Text style={styles.subtitle}>Use an email and password to get started.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmailAddress}
          placeholder="you@example.com"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={emailAddress}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="new-password"
          onChangeText={setPassword}
          placeholder="Choose a password"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          style={styles.input}
          value={password}
        />

        {errorMessage || oauthErrorMessage ? <Text style={styles.error}>{errorMessage ?? oauthErrorMessage}</Text> : null}

        <PrimaryButton
          label="Create account"
          loading={isSubmitting}
          onPress={() => void handleCreateAccount()}
        />
        <OAuthButtons
          disabled={isSubmitting}
          loading={oauthLoadingProvider === "google"}
          onPressGoogle={() => void handleGoogleSignUp()}
        />
        <PrimaryButton
          label="Back to sign in"
          onPress={() => navigation.navigate("SignIn")}
          tone="secondary"
        />
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
