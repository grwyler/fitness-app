import { StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "./PrimaryButton";
import { colors, spacing } from "../theme/tokens";
import { oauthProviderLabels } from "./oauth-buttons.shared";

type Props = {
  disabled?: boolean;
  loading?: boolean;
  onPressGoogle: () => void;
};

export function OAuthButtons(props: Props) {
  const isDisabled = Boolean(props.disabled) || Boolean(props.loading);

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerLabel}>or</Text>
        <View style={styles.divider} />
      </View>

      <PrimaryButton
        disabled={isDisabled}
        label={oauthProviderLabels.google}
        loading={props.loading}
        onPress={props.onPressGoogle}
        tone="secondary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm
  },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    paddingVertical: spacing.xs
  },
  divider: {
    backgroundColor: colors.border,
    flex: 1,
    height: 1
  },
  dividerLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase"
  }
});
