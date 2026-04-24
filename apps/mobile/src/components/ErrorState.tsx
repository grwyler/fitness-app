import { StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "./PrimaryButton";
import { colors, spacing } from "../theme/tokens";

export function ErrorState(props: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{props.title}</Text>
      <Text style={styles.message}>{props.message}</Text>
      {props.actionLabel && props.onAction ? (
        <PrimaryButton label={props.actionLabel} onPress={props.onAction} />
      ) : null}
    </View>
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
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700"
  },
  message: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22
  }
});
