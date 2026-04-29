import { createElement } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme/tokens";
import { getPrimaryButtonDisabledState, handleWebPrimaryButtonClick } from "./primary-button.shared";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: "primary" | "secondary" | "danger";
};

export function PrimaryButton(props: PrimaryButtonProps) {
  const toneStyle =
    props.tone === "secondary"
      ? styles.secondary
      : props.tone === "danger"
        ? styles.danger
        : styles.primary;
  const labelToneStyle =
    props.tone === "secondary"
      ? styles.secondaryLabel
      : props.tone === "danger"
        ? styles.dangerLabel
        : styles.primaryLabel;
  const indicatorColor = props.tone === "primary" || props.tone === undefined ? colors.surface : colors.accent;
  const isDisabled = getPrimaryButtonDisabledState({
    disabled: props.disabled,
    loading: props.loading
  });

  if (Platform.OS === "web") {
    const buttonStyle = StyleSheet.flatten([
      styles.button,
      toneStyle,
      isDisabled && styles.disabled,
      styles.webButton
    ]);

    return createElement(
      "button",
      {
        "aria-disabled": isDisabled,
        disabled: isDisabled,
        onClick: () => handleWebPrimaryButtonClick({ disabled: isDisabled, label: props.label, onPress: props.onPress }),
        style: buttonStyle,
        type: "button"
      },
      props.loading
        ? createElement(ActivityIndicator, {
            color: indicatorColor
          })
        : createElement(
            View,
            {
              style: styles.webLabelWrap
            },
            createElement(
              Text,
              {
                style: [styles.label, labelToneStyle]
              },
              props.label
            )
          )
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={props.onPress}
      style={[styles.button, toneStyle, isDisabled && styles.disabled]}
    >
      {props.loading ? (
        <ActivityIndicator color={indicatorColor} />
      ) : (
        <Text style={[styles.label, labelToneStyle]}>{props.label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  primary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border
  },
  danger: {
    backgroundColor: colors.surface,
    borderColor: colors.border
  },
  disabled: {
    opacity: 0.55
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22
  },
  primaryLabel: {
    color: colors.surface
  },
  secondaryLabel: {
    color: colors.textPrimary
  },
  dangerLabel: {
    color: colors.danger
  },
  webButton: {
    cursor: "pointer"
  },
  webLabelWrap: {
    alignItems: "center",
    justifyContent: "center"
  }
});
