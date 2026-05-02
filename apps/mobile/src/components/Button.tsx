import { createElement } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  type StyleProp,
  Text,
  type TextStyle,
  View,
  type ViewStyle
} from "react-native";
import { borderWidths, colors, componentTokens, elevation, pressable, spacing, typography } from "../theme/tokens";
import { getPrimaryButtonDisabledState, handleWebPrimaryButtonClick } from "./primary-button.shared";

export type ButtonTone = "primary" | "secondary" | "danger";
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: ButtonTone;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

export function Button(props: Props) {
  const variant: ButtonVariant =
    props.variant ?? (props.tone === "secondary" ? "secondary" : props.tone === "danger" ? "danger" : "primary");
  const size: ButtonSize = props.size ?? "md";

  const variantStyle =
    variant === "secondary"
      ? styles.secondary
      : variant === "ghost"
        ? styles.ghost
        : variant === "danger"
          ? styles.danger
          : styles.primary;

  const labelVariantStyle =
    variant === "secondary"
      ? styles.secondaryLabel
      : variant === "ghost"
        ? styles.ghostLabel
        : variant === "danger"
          ? styles.dangerLabel
          : styles.primaryLabel;

  const pressedVariantStyle =
    variant === "secondary"
      ? styles.secondaryPressed
      : variant === "ghost"
        ? styles.ghostPressed
        : variant === "danger"
          ? styles.dangerPressed
          : styles.primaryPressed;

  const indicatorColor = variant === "primary" || variant === "danger" ? colors.surface : colors.accentStrong;
  const isDisabled = getPrimaryButtonDisabledState({
    disabled: props.disabled,
    loading: props.loading
  });

  const containerStyle = StyleSheet.flatten([
    styles.button,
    props.fullWidth === false ? styles.inline : null,
    size === "sm" ? styles.sizeSm : size === "lg" ? styles.sizeLg : styles.sizeMd,
    variantStyle,
    isDisabled ? styles.disabled : null,
    props.style
  ]);

  const labelStyle = [styles.label, labelVariantStyle, props.labelStyle];

  if (Platform.OS === "web") {
    return createElement(
      "button",
      {
        "aria-disabled": isDisabled,
        disabled: isDisabled,
        onClick: () =>
          handleWebPrimaryButtonClick({ disabled: isDisabled, label: props.label, onPress: props.onPress }),
        style: StyleSheet.flatten([containerStyle, styles.webButton]),
        type: "button"
      },
      props.loading
        ? createElement(ActivityIndicator, { color: indicatorColor })
        : createElement(View, { style: styles.webLabelWrap }, createElement(Text, { style: labelStyle }, props.label))
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={props.onPress}
      style={({ pressed }) => [
        containerStyle,
        pressed && !isDisabled ? [styles.pressed, pressedVariantStyle] : null
      ]}
    >
      {props.loading ? <ActivityIndicator color={indicatorColor} /> : <Text style={labelStyle}>{props.label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: componentTokens.button.radius,
    borderWidth: borderWidths.hairline,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  inline: {
    alignSelf: "flex-start"
  },
  sizeSm: {
    minHeight: componentTokens.button.height.sm,
    paddingHorizontal: spacing.md
  },
  sizeMd: {
    minHeight: componentTokens.button.height.md,
    paddingHorizontal: spacing.md
  },
  sizeLg: {
    minHeight: componentTokens.button.height.lg,
    paddingHorizontal: spacing.lg
  },
  primary: {
    backgroundColor: colors.accentStrong,
    borderColor: colors.accentStrong,
    ...elevation.xs
  },
  secondary: {
    backgroundColor: colors.surfaceMuted,
    borderColor: "transparent",
    borderWidth: 0
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "transparent"
  },
  danger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
    ...elevation.xs
  },
  disabled: {
    opacity: pressable.disabledOpacity
  },
  pressed: {
    opacity: pressable.pressedOpacity,
    transform: [{ scale: pressable.pressedScale }]
  },
  primaryPressed: {
    backgroundColor: "#1d4ed8",
    ...elevation.none
  },
  secondaryPressed: {
    backgroundColor: colors.surfaceSunken
  },
  ghostPressed: {
    backgroundColor: colors.accentMuted
  },
  dangerPressed: {
    backgroundColor: "#991b1b",
    ...elevation.none
  },
  label: {
    fontFamily: typography.fontFamily.system,
    fontSize: 16,
    fontWeight: typography.weight.semibold,
    lineHeight: 22
  },
  primaryLabel: {
    color: colors.surface
  },
  secondaryLabel: {
    color: colors.textPrimary
  },
  ghostLabel: {
    color: colors.accentStrong
  },
  dangerLabel: {
    color: colors.surface
  },
  webButton: {
    cursor: "pointer"
  },
  webLabelWrap: {
    alignItems: "center",
    justifyContent: "center"
  }
});
