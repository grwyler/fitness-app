import { useState } from "react";
import {
  Platform,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
  type StyleProp
} from "react-native";
import { borderWidths, colors, radius, spacing, typography } from "../theme/tokens";
import { AppText } from "./AppText";

type Props = TextInputProps & {
  label?: string;
  helperText?: string | null;
  errorText?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
};

export function Input({ label, helperText, errorText, containerStyle, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const showHelper = Boolean(errorText || helperText);

  return (
    <View style={containerStyle}>
      {label ? (
        <AppText variant="label" tone="accent" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <TextInput
        {...rest}
        accessibilityLabel={rest.accessibilityLabel ?? label}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        placeholderTextColor={colors.textTertiary}
        style={[
          styles.input,
          focused ? styles.inputFocused : null,
          errorText ? styles.inputError : null,
          Platform.OS === "web" ? styles.inputWeb : null,
          style
        ]}
      />
      {showHelper ? (
        <AppText variant="meta" tone={errorText ? "danger" : "secondary"} style={styles.helper}>
          {errorText ?? helperText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: spacing.xs
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: borderWidths.hairline,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.system,
    fontSize: 17,
    fontWeight: typography.weight.semibold,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  inputFocused: {
    backgroundColor: colors.surface,
    borderColor: colors.accentStrong
  },
  inputError: {
    borderColor: colors.danger
  },
  helper: {
    marginTop: spacing.xs
  },
  inputWeb: {
    outlineStyle: "solid",
    outlineWidth: 0
  }
});
