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
            color: colors.surface
          })
        : createElement(
            View,
            {
              style: styles.webLabelWrap
            },
            createElement(
              Text,
              {
                style: styles.label
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
  },
  webButton: {
    borderWidth: 0,
    cursor: "pointer"
  },
  webLabelWrap: {
    alignItems: "center",
    justifyContent: "center"
  }
});
