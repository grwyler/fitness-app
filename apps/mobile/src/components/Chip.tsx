import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, pressable, radius, spacing, typography } from "../theme/tokens";
import { AppText } from "./AppText";

export type ChipVariant = "default" | "selected" | "success" | "warning" | "danger" | "muted";

type Props = PropsWithChildren<{
  label: string;
  selected?: boolean;
  variant?: ChipVariant;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}>;

export function Chip({ label, selected, variant, disabled, onPress, style, children }: Props) {
  const resolvedVariant: ChipVariant = selected ? "selected" : (variant ?? "default");

  const content = (
    <View style={styles.row}>
      <AppText
        variant="meta"
        tone={
          resolvedVariant === "selected"
            ? "accent"
            : resolvedVariant === "success"
              ? "success"
              : resolvedVariant === "warning"
                ? "secondary"
              : resolvedVariant === "danger"
                ? "danger"
                : resolvedVariant === "muted"
                  ? "tertiary"
                  : "secondary"
        }
        style={[
          styles.text,
          resolvedVariant === "selected" ? styles.textSelected : null,
          resolvedVariant === "success" ? styles.textSuccess : null,
          resolvedVariant === "warning" ? styles.textWarning : null,
          resolvedVariant === "danger" ? styles.textDanger : null
        ]}
      >
        {label}
      </AppText>
      {children}
    </View>
  );

  if (!onPress) {
    return (
      <View
        style={[
          styles.base,
          resolvedVariant === "selected" ? styles.selected : null,
          resolvedVariant === "success" ? styles.success : null,
          resolvedVariant === "warning" ? styles.warning : null,
          resolvedVariant === "danger" ? styles.danger : null,
          resolvedVariant === "muted" ? styles.muted : null,
          disabled ? styles.disabled : null,
          style
        ]}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        resolvedVariant === "selected" ? styles.selected : null,
        resolvedVariant === "success" ? styles.success : null,
        resolvedVariant === "warning" ? styles.warning : null,
        resolvedVariant === "danger" ? styles.danger : null,
        resolvedVariant === "muted" ? styles.muted : null,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
        style
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    borderWidth: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  selected: {
    backgroundColor: colors.accentMuted
  },
  success: {
    backgroundColor: "rgba(22, 121, 76, 0.10)"
  },
  warning: {
    backgroundColor: "rgba(180, 83, 9, 0.08)"
  },
  danger: {
    backgroundColor: "rgba(180, 35, 24, 0.08)"
  },
  muted: {
    backgroundColor: "transparent"
  },
  pressed: {
    opacity: pressable.pressedOpacity,
    transform: [{ scale: pressable.pressedScale }]
  },
  disabled: {
    opacity: pressable.disabledOpacity
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  text: {
    fontFamily: typography.fontFamily.system,
    fontSize: 13,
    fontWeight: typography.weight.medium,
    textTransform: "none"
  },
  textSelected: {
    color: colors.accentStrong
  },
  textSuccess: {
    color: colors.success
  },
  textWarning: {
    color: colors.warning
  },
  textDanger: {
    color: colors.danger
  }
});
