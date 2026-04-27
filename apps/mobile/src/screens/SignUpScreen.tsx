import { createElement, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useClerk, useSignUp } from "@clerk/expo";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { colors, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "SignUp">;

function CaptchaMount() {
  if (Platform.OS === "web") {
    return createElement("div", {
      id: "clerk-captcha",
      "data-cl-theme": "light",
      "data-cl-size": "flexible",
      style: {
        minHeight: 78,
        width: "100%"
      }
    });
  }

  return <View nativeID="clerk-captcha" style={styles.captchaMount} />;
}

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "errors" in error) {
    const errors = (error as { errors?: Array<{ longMessage?: string; message?: string }> }).errors;
    return errors?.[0]?.longMessage ?? errors?.[0]?.message ?? "Unable to sign up.";
  }

  return error instanceof Error ? error.message : "Unable to sign up.";
}

function formatFieldLabel(field: string) {
  return field
    .split("_")
    .map(part => part.replace(/^./, char => char.toUpperCase()))
    .join(" ");
}

export function SignUpScreen({ navigation }: Props) {
  const { setActive } = useClerk();
  const { fetchStatus, signUp } = useSignUp();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationStarted, setVerificationStarted] = useState(false);
  const awaitingVerification =
    verificationStarted ||
    (signUp?.status === "missing_requirements" &&
      signUp.unverifiedFields.includes("email_address") &&
      signUp.missingFields.length === 0);
  const requiredFieldsSummary =
    signUp?.requiredFields.map(formatFieldLabel).join(", ") || "unknown";
  const missingFieldsSummary =
    signUp?.missingFields.map(formatFieldLabel).join(", ") || "none";
  const unverifiedFieldsSummary =
    signUp?.unverifiedFields.map(formatFieldLabel).join(", ") || "none";

  const buildSignUpDiagnostics = (message: string) => {
    if (!signUp) {
      return message;
    }

    const emailVerification = signUp.verifications.emailAddress;
    const emailVerificationStatus = emailVerification.status ?? "unknown";
    const verifiedOnSameClient = emailVerification.verifiedFromTheSameClient() ? "yes" : "no";

    return `${message} Current sign-up status: ${signUp.status}. Required fields: ${requiredFieldsSummary}. Missing fields: ${missingFieldsSummary}. Unverified fields: ${unverifiedFieldsSummary}. Email verification status: ${emailVerificationStatus}. Verified on same client: ${verifiedOnSameClient}.`;
  };

  const activateCompletedSession = async () => {
    if (!signUp) {
      return;
    }

    if (!signUp.createdSessionId) {
      setErrorMessage(buildSignUpDiagnostics("Sign up completed without creating a session."));
      return;
    }

    await setActive({
      session: signUp.createdSessionId
    });
  };

  const validateSignUpInputs = () => {
    return null;
  };

  const handleCreateAccount = async () => {
    if (!signUp || fetchStatus === "fetching") {
      return;
    }

    setErrorMessage(null);

    const validationError = validateSignUpInputs();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      const { error } = await signUp.password({
        emailAddress: emailAddress.trim(),
        legalAccepted,
        password
      });

      if (error) {
        setErrorMessage(buildSignUpDiagnostics(getErrorMessage(error)));
        return;
      }

      await signUp.verifications.sendEmailCode();
      setVerificationStarted(true);
      setVerificationCode("");

      if (signUp.status === "complete") {
        await activateCompletedSession();
      }
    } catch (error) {
      setErrorMessage(buildSignUpDiagnostics(getErrorMessage(error)));
    }
  };

  const handleVerify = async () => {
    if (!signUp || fetchStatus === "fetching") {
      return;
    }

    setErrorMessage(null);

    try {
      const verificationResult = await signUp.verifications.verifyEmailCode({
        code: verificationCode.trim()
      });

      if (verificationResult.error) {
        setErrorMessage(buildSignUpDiagnostics(getErrorMessage(verificationResult.error)));
        return;
      }

      if (signUp.status === "complete") {
        await activateCompletedSession();
      } else {
        setErrorMessage(buildSignUpDiagnostics("Email verification is not complete yet."));
      }
    } catch (error) {
      setErrorMessage(buildSignUpDiagnostics(getErrorMessage(error)));
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

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: legalAccepted }}
              onPress={() => setLegalAccepted(current => !current)}
              style={styles.checkboxRow}
            >
              <View style={[styles.checkbox, legalAccepted ? styles.checkboxChecked : null]}>
                {legalAccepted ? <Text style={styles.checkboxMark}>✓</Text> : null}
              </View>
              <Text style={styles.checkboxLabel}>I agree to the terms required by authentication.</Text>
            </Pressable>

            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

            {signUp?.missingFields.length ? (
              <Text style={styles.hint}>Clerk still requires: {missingFieldsSummary}.</Text>
            ) : null}

            <PrimaryButton
              label="Create account"
              loading={fetchStatus === "fetching"}
              onPress={() => void handleCreateAccount()}
            />

            <CaptchaMount />
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
            <PrimaryButton
              label="Send a new code"
              onPress={() => {
                setErrorMessage(null);
                setVerificationStarted(true);
                void signUp?.verifications.sendEmailCode();
              }}
              tone="secondary"
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
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18
  },
  checkboxRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  checkbox: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    width: 22
  },
  checkboxChecked: {
    backgroundColor: colors.accentStrong,
    borderColor: colors.accentStrong
  },
  checkboxLabel: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 14,
    lineHeight: 20
  },
  checkboxMark: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "800"
  },
  captchaMount: {
    minHeight: 78
  }
});
