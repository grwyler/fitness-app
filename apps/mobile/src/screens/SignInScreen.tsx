import { useEffect, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth, useClerk, useSignIn } from "@clerk/expo";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import {
  appendAuthDebugTimeline,
  getAuthDebugTimeline,
  getLastAuthDebugMessage,
  isDevAuthDebugEnabled,
  logSafeAuthDiagnostic
} from "../core/auth/auth-debug";
import { getAuthErrorMessage, getSafeAuthErrorDiagnostic } from "../core/auth/auth-errors";
import { colors, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "SignIn">;

function getErrorMessage(error: unknown) {
  return getAuthErrorMessage(error, "Unable to sign in.");
}

async function resolveSessionToken(getToken: ReturnType<typeof useAuth>["getToken"]) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    let token = await getToken();
    if (!token) {
      token = await getToken({ skipCache: true });
    }

    logSafeAuthDiagnostic("sign_in_get_token_result", {
      attempt: String(attempt + 1),
      tokenPresent: Boolean(token)
    });
    appendAuthDebugTimeline("sign_in_get_token_result", `attempt=${attempt + 1}; tokenPresent=${token ? "yes" : "no"}`);
    if (token) {
      return token;
    }

    await new Promise(resolve => setTimeout(resolve, 250));
  }

  return null;
}

export function SignInScreen({ navigation }: Props) {
  const showDevAuthDebug = isDevAuthDebugEnabled();
  const { getToken } = useAuth();
  const { setActive } = useClerk();
  const { fetchStatus, signIn } = useSignIn();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [devAuthMessage, setDevAuthMessage] = useState<string | null>(null);

  useEffect(() => {
    const authDebugMessage = getLastAuthDebugMessage();
    if (authDebugMessage) {
      setDevAuthMessage(authDebugMessage);
      appendAuthDebugTimeline("sign_in_screen_consumed_auth_debug", authDebugMessage);
    }
  }, []);

  const handleEmailChange = (value: string) => {
    setEmailAddress(value);
    setErrorMessage(null);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setErrorMessage(null);
  };

  const handleVerificationCodeChange = (value: string) => {
    setVerificationCode(value);
    setErrorMessage(null);
  };

  const activateCompletedSession = async () => {
    if (!signIn?.createdSessionId) {
      logSafeAuthDiagnostic("sign_in_created_session_missing", {
        signInStatus: signIn?.status ?? "unknown"
      });
      appendAuthDebugTimeline("sign_in_created_session_missing", `status=${signIn?.status ?? "unknown"}`);
      setErrorMessage("Sign in completed without creating a session.");
      return;
    }

    logSafeAuthDiagnostic("sign_in_set_active_started", {
      createdSessionPresent: true,
      signInStatus: signIn.status
    });
    appendAuthDebugTimeline("sign_in_set_active_called", `status=${signIn.status}; createdSessionId=${signIn.createdSessionId}`);

    try {
      await setActive({
        session: signIn.createdSessionId
      });
      logSafeAuthDiagnostic("sign_in_set_active_resolved", {
        createdSessionPresent: true
      });
      appendAuthDebugTimeline("sign_in_set_active_resolved", `session=${signIn.createdSessionId}`);

      const resolvedToken = await resolveSessionToken(getToken);
      if (!resolvedToken) {
        logSafeAuthDiagnostic("sign_in_token_missing_after_set_active", {
          createdSessionPresent: true,
          tokenPresent: false
        });
        appendAuthDebugTimeline("sign_in_token_missing_after_set_active");
        setErrorMessage("Sign in completed, but no auth token was available afterward.");
      }
    } catch (error) {
      logSafeAuthDiagnostic("sign_in_set_active_threw", {
        createdSessionPresent: true,
        errorKind: getSafeAuthErrorDiagnostic(error)
      });
      appendAuthDebugTimeline("sign_in_set_active_threw", getErrorMessage(error));
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleSubmit = async () => {
    if (!signIn || fetchStatus === "fetching") {
      appendAuthDebugTimeline(
        "sign_in_submit_skipped",
        `signInPresent=${signIn ? "yes" : "no"}; fetchStatus=${fetchStatus}`
      );
      return;
    }

    appendAuthDebugTimeline("sign_in_submit_entered");
    setErrorMessage(null);

    try {
      appendAuthDebugTimeline("clerk_sign_in_password_started", `email=${emailAddress.trim()}`);
      const { error } = await signIn.password({
        emailAddress: emailAddress.trim(),
        password
      });
      appendAuthDebugTimeline(
        "clerk_sign_in_password_finished",
        `status=${signIn.status}; createdSessionId=${signIn.createdSessionId ?? "none"}; error=${error ? "yes" : "no"}`
      );

      if (error) {
        appendAuthDebugTimeline("sign_in_password_error", getErrorMessage(error));
        setErrorMessage(getErrorMessage(error));
        return;
      }

      if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
        const emailCodeFactor = signIn.supportedSecondFactors.find(
          factor => factor.strategy === "email_code"
        );

        if (emailCodeFactor) {
          appendAuthDebugTimeline("sign_in_second_factor_email_code_sending");
          await signIn.mfa.sendEmailCode();
        }

        appendAuthDebugTimeline("sign_in_second_factor_required");
        setNeedsVerification(true);
        return;
      }

      if (signIn.status === "complete") {
        logSafeAuthDiagnostic("sign_in_password_complete", {
          createdSessionPresent: Boolean(signIn.createdSessionId),
          signInStatus: signIn.status
        });
        appendAuthDebugTimeline("sign_in_complete_before_dashboard_navigation");
        await activateCompletedSession();
      }
    } catch (error) {
      logSafeAuthDiagnostic("sign_in_submit_threw", {
        errorKind: getSafeAuthErrorDiagnostic(error)
      });
      appendAuthDebugTimeline("sign_in_submit_threw", getErrorMessage(error));
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleVerification = async () => {
    if (!signIn || fetchStatus === "fetching") {
      appendAuthDebugTimeline(
        "sign_in_verification_skipped",
        `signInPresent=${signIn ? "yes" : "no"}; fetchStatus=${fetchStatus}`
      );
      return;
    }

    appendAuthDebugTimeline("sign_in_verification_entered");
    setErrorMessage(null);

    try {
      appendAuthDebugTimeline("clerk_sign_in_verify_email_code_started");
      await signIn.mfa.verifyEmailCode({
        code: verificationCode.trim()
      });
      appendAuthDebugTimeline(
        "clerk_sign_in_verify_email_code_finished",
        `status=${signIn.status}; createdSessionId=${signIn.createdSessionId ?? "none"}`
      );

      if (signIn.status === "complete") {
        logSafeAuthDiagnostic("sign_in_verification_complete", {
          createdSessionPresent: Boolean(signIn.createdSessionId),
          signInStatus: signIn.status
        });
        appendAuthDebugTimeline("sign_in_verification_complete_before_dashboard_navigation");
        await activateCompletedSession();
      } else {
        appendAuthDebugTimeline("sign_in_verification_incomplete", `status=${signIn.status}`);
        setErrorMessage("Sign in verification is not complete yet.");
      }
    } catch (error) {
      logSafeAuthDiagnostic("sign_in_verification_threw", {
        errorKind: getSafeAuthErrorDiagnostic(error)
      });
      appendAuthDebugTimeline("sign_in_verification_threw", getErrorMessage(error));
      setErrorMessage(getErrorMessage(error));
    }
  };

  const devTimeline = showDevAuthDebug ? getAuthDebugTimeline().slice(-12) : [];

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
              onChangeText={handleEmailChange}
              placeholder="you@example.com"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              value={emailAddress}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="password"
              onChangeText={handlePasswordChange}
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
              onChangeText={handleVerificationCodeChange}
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

      {showDevAuthDebug && (devAuthMessage || devTimeline.length > 0) ? (
        <View style={styles.devCard}>
          <Text style={styles.devTitle}>Auth Debug</Text>
          {devAuthMessage ? <Text style={styles.devLine}>{devAuthMessage}</Text> : null}
          {devTimeline.map((entry, index) => (
            <Text key={`${entry.at}-${index}`} style={styles.devLine}>
              {entry.at} | {entry.event}
              {entry.details ? ` | ${entry.details}` : ""}
            </Text>
          ))}
        </View>
      ) : null}
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
  devCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    gap: spacing.xs,
    padding: spacing.md
  },
  devTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700"
  },
  devLine: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16
  }
});
