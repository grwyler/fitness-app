import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, spacing } from "../theme/tokens";

export function PrimaryButton(props: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: "primary" | "secondary" | "danger";
}) {
  const toneStyle =
    props.tone === "secondary"
      ? styles.secondary
      : props.tone === "danger"
        ? styles.danger
        : styles.primary;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={props.disabled || props.loading}
      onPress={props.onPress}
      style={[styles.button, toneStyle, (props.disabled || props.loading) && styles.disabled]}
    >
      {props.loading ? (
        <ActivityIndicator color={colors.surface} />
      ) : (
        <Text style={styles.label}>{props.label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: spacing.md
  },
  primary: {
    backgroundColor: colors.accentStrong
  },
  secondary: {
    backgroundColor: colors.textSecondary
  },
  danger: {
    backgroundColor: "#9c3b31"
  },
  disabled: {
    opacity: 0.55
  },
  label: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "700"
  }
});
