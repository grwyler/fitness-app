import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../components/Screen";
import { colors, spacing } from "../../theme/tokens";

export function StartupConfigErrorScreen(props: {
  missingEnvVars: string[];
  devApiBaseUrl?: string;
}) {
  return (
    <Screen>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Configuration needed</Text>
        <Text style={styles.title}>Missing local environment variables</Text>
        <Text style={styles.message}>
          Add the missing values to the repo root .env.local file, then restart the Expo dev server.
        </Text>

        <View style={styles.list}>
          {props.missingEnvVars.map((name) => (
            <Text key={name} style={styles.item}>
              {name}
            </Text>
          ))}
        </View>

        {props.devApiBaseUrl ? (
          <Text style={styles.hint}>API base URL is using the local development default: {props.devApiBaseUrl}</Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  eyebrow: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30
  },
  message: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22
  },
  list: {
    gap: spacing.xs
  },
  item: {
    color: "#9c3b31",
    fontFamily: "monospace",
    fontSize: 14,
    fontWeight: "700"
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18
  }
});
