import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useSignIn } from "@clerk/expo";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { colors, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "SignIn">;

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "errors" in error) {
    const errors = (error as { errors?: Array<{ longMessage?: string; message?: string }> }).errors;
    return errors?.[0]?.longMessage ?? errors?.[0]?.message ?? "Unable to sign in.";
  }

  return error instanceof Error ? error.message : "Unable to sign in.";
}

export function SignInScreen({ navigation }: Props) {
  const { fetchStatus, signIn } = useSignIn();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);

  const handleSubmit = async () => {
    if (!signIn || fetchStatus === "fetching") {
      return;
    }

    setErrorMessage(null);

    try {
      const { error } = await signIn.password({
        emailAddress: emailAddress.trim(),
        password
      });

      if (error) {
        setErrorMessage(getErrorMessage(error));
        return;
      }

      if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
        const emailCodeFactor = signIn.supportedSecondFactors.find(
          (factor) => factor.strategy === "email_code"
        );

        if (emailCodeFactor) {
          await signIn.mfa.sendEmailCode();
        }

        setNeedsVerification(true);
        return;
      }

      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: () => {}
        });
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleVerification = async () => {
    if (!signIn || fetchStatus === "fetching") {
      return;
    }

    setErrorMessage(null);

    try {
      await signIn.mfa.verifyEmailCode({
        code: verificationCode.trim()
      });

      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: () => {}
        });
      } else {
        setErrorMessage("Sign in verification is not complete yet.");
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Welcome back</Text>
        <Text style={styles.title}>Sign in to keep training.</Text>
        <Text style={styles.subtitle}>Use your email and password to continue.</Text>
      </View>

      <View style={styles.card}>
        {!needsVerification ? (
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
              autoComplete="password"
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>Verification code</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="number-pad"
              onChangeText={setVerificationCode}
              placeholder="Enter your verification code"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              value={verificationCode}
            />
          </>
        )}

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <PrimaryButton
          label={needsVerification ? "Verify sign in" : "Sign in"}
          loading={fetchStatus === "fetching"}
          onPress={() => void (needsVerification ? handleVerification() : handleSubmit())}
        />
        <PrimaryButton
          label="Create account"
          onPress={() => navigation.navigate("SignUp")}
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
