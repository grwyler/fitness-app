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
import { borderWidths, colors, pressable, radius, spacing, typography } from "../theme/tokens";
import { getPrimaryButtonDisabledState, handleWebPrimaryButtonClick } from "./primary-button.shared";

export type ButtonTone = "primary" | "secondary" | "danger";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: ButtonTone;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

export function Button(props: Props) {
  const toneStyle =
    props.tone === "secondary" ? styles.secondary : props.tone === "danger" ? styles.danger : styles.primary;
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

  const containerStyle = StyleSheet.flatten([
    styles.button,
    props.fullWidth === false ? styles.inline : null,
    toneStyle,
    isDisabled ? styles.disabled : null,
    props.style
  ]);

  const labelStyle = [styles.label, labelToneStyle, props.labelStyle];

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
        pressed && !isDisabled ? styles.pressed : null
      ]}
    >
      {props.loading ? <ActivityIndicator color={indicatorColor} /> : <Text style={labelStyle}>{props.label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: borderWidths.hairline,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  inline: {
    alignSelf: "flex-start"
  },
  primary: {
    backgroundColor: colors.accentStrong,
    borderColor: colors.accentStrong
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong
  },
  danger: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong
  },
  disabled: {
    opacity: pressable.disabledOpacity
  },
  pressed: {
    opacity: pressable.pressedOpacity,
    transform: [{ scale: pressable.pressedScale }]
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

