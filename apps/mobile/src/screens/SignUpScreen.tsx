import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useSignUp } from "@clerk/expo";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { colors, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "SignUp">;

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "errors" in error) {
    const errors = (error as { errors?: Array<{ longMessage?: string; message?: string }> }).errors;
    return errors?.[0]?.longMessage ?? errors?.[0]?.message ?? "Unable to sign up.";
  }

  return error instanceof Error ? error.message : "Unable to sign up.";
}

export function SignUpScreen({ navigation }: Props) {
  const { fetchStatus, signUp } = useSignUp();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreateAccount = async () => {
    if (!signUp || fetchStatus === "fetching") {
      return;
    }

    setErrorMessage(null);

    try {
      const { error } = await signUp.password({
        emailAddress: emailAddress.trim(),
        password
      });

      if (error) {
        setErrorMessage(getErrorMessage(error));
        return;
      }

      await signUp.verifications.sendEmailCode();
      setAwaitingVerification(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleVerify = async () => {
    if (!signUp || fetchStatus === "fetching") {
      return;
    }

    setErrorMessage(null);

    try {
      await signUp.verifications.verifyEmailCode({
        code: verificationCode.trim()
      });

      if (signUp.status === "complete") {
        await signUp.finalize({
          navigate: () => {}
        });
      } else {
        setErrorMessage("Email verification is not complete yet.");
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Create account</Text>
        <Text style={styles.title}>Start with a secure sign up.</Text>
        <Text style={styles.subtitle}>
          {awaitingVerification
            ? "Enter the verification code from your email to finish creating your account."
            : "Use your email and a password. We will verify your email before signing you in."}
        </Text>
      </View>

      <View style={styles.card}>
        {!awaitingVerification ? (
          <>
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

            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

            <PrimaryButton
              label="Create account"
              loading={fetchStatus === "fetching"}
              onPress={() => void handleCreateAccount()}
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>Verification code</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="number-pad"
              onChangeText={setVerificationCode}
              placeholder="123456"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              value={verificationCode}
            />

            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

            <PrimaryButton
              label="Verify email"
              loading={fetchStatus === "fetching"}
              onPress={() => void handleVerify()}
            />
          </>
        )}

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
    fontWeight: "700",
    letterSpacing: 1,
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
  label: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: spacing.md
  },
  error: {
    color: "#9c3b31",
    fontSize: 14,
    lineHeight: 20
  }
});
