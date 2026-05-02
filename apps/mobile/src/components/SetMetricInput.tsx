import { useState, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
  View
} from "react-native";
import { AppText } from "./AppText";
import { borderWidths, colors, elevation, pressable, radius, spacing, typography } from "../theme/tokens";

type StepperControl = {
  decrementLabel?: string;
  incrementLabel?: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
  decrementA11yLabel?: string;
  incrementA11yLabel?: string;
};

export function SetMetricInput(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  helperRight?: ReactNode;
  stepper?: StepperControl;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: TextInputProps["style"];
} & Pick<
  TextInputProps,
  | "accessibilityLabel"
  | "autoCapitalize"
  | "autoCorrect"
  | "editable"
  | "inputMode"
  | "keyboardType"
  | "maxLength"
  | "onBlur"
  | "onFocus"
  | "placeholder"
  | "returnKeyType"
  | "selectTextOnFocus"
  | "textAlign"
  | "textAlignVertical"
  | "onSubmitEditing"
  | "multiline"
  | "numberOfLines"
>) {
  const [focused, setFocused] = useState(false);
  const isDisabled = Boolean(props.disabled) || props.editable === false;

  return (
    <View style={props.containerStyle}>
      <View style={styles.labelRow}>
        <AppText variant="caption" tone="secondary">
          {props.label}
        </AppText>
        {props.helperRight ? <View style={styles.helperRight}>{props.helperRight}</View> : null}
      </View>

      <View
        style={[
          styles.controlRow,
          focused ? styles.controlRowFocused : null,
          props.error ? styles.controlRowError : null,
          isDisabled ? styles.disabled : null
        ]}
      >
        {props.stepper ? (
          <IconButton
            side="left"
            label={props.stepper.decrementLabel ?? "−"}
            accessibilityLabel={props.stepper.decrementA11yLabel ?? `${props.label} minus`}
            onPress={props.stepper.onDecrement}
            disabled={isDisabled || Boolean(props.stepper.decrementDisabled)}
          />
        ) : null}

        <TextInput
          accessibilityLabel={props.accessibilityLabel ?? props.label}
          autoCapitalize={props.autoCapitalize}
          autoCorrect={props.autoCorrect}
          editable={!isDisabled}
          inputMode={props.inputMode}
          keyboardType={props.keyboardType}
          maxLength={props.maxLength}
          multiline={props.multiline}
          numberOfLines={props.numberOfLines}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          onChangeText={props.onChangeText}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onSubmitEditing={props.onSubmitEditing}
          placeholder={props.placeholder}
          placeholderTextColor={colors.textTertiary}
          returnKeyType={props.returnKeyType}
          selectTextOnFocus={props.selectTextOnFocus}
          style={[styles.input, props.inputStyle]}
          textAlign={props.textAlign ?? "center"}
          textAlignVertical={props.textAlignVertical}
          value={props.value}
        />

        {props.stepper ? (
          <IconButton
            side="right"
            label={props.stepper.incrementLabel ?? "+"}
            accessibilityLabel={props.stepper.incrementA11yLabel ?? `${props.label} plus`}
            onPress={props.stepper.onIncrement}
            disabled={isDisabled || Boolean(props.stepper.incrementDisabled)}
          />
        ) : null}
      </View>
    </View>
  );
}

function IconButton(props: {
  side: "left" | "right";
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel}
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.iconButton,
        props.side === "left" ? styles.iconButtonLeft : styles.iconButtonRight,
        props.disabled ? styles.disabled : null,
        pressed && !props.disabled ? styles.iconButtonPressed : null
      ]}
    >
      <AppText variant="headline" style={styles.iconLabel}>
        {props.label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs
  },
  helperRight: {
    flexShrink: 1,
    alignItems: "flex-end",
    justifyContent: "center"
  },
  controlRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceSunken,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: borderWidths.hairline,
    flexDirection: "row",
    minHeight: 44,
    overflow: "hidden"
  },
  controlRowFocused: {
    backgroundColor: colors.surface,
    borderColor: colors.accentStrong,
    ...elevation.xs
  },
  controlRowError: {
    borderColor: colors.danger
  },
  input: {
    color: colors.textPrimary,
    flex: 1,
    fontFamily: typography.fontFamily.system,
    fontSize: 18,
    fontWeight: typography.weight.semibold,
    minWidth: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  iconButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
    borderColor: colors.border
  },
  iconButtonLeft: {
    borderRightWidth: borderWidths.hairline
  },
  iconButtonRight: {
    borderLeftWidth: borderWidths.hairline
  },
  iconButtonPressed: {
    opacity: pressable.pressedOpacity,
    transform: [{ scale: pressable.pressedScale }]
  },
  iconLabel: {
    lineHeight: 20
  },
  disabled: {
    opacity: pressable.disabledOpacity
  }
});
