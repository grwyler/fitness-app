type WebPrimaryButtonClickInput = {
  disabled: boolean;
  label: string;
  onPress: () => void;
};

const isDevEnvironment = typeof __DEV__ !== "undefined" && __DEV__;

export function getPrimaryButtonDisabledState(input: {
  disabled?: boolean;
  loading?: boolean;
}) {
  return Boolean(input.disabled || input.loading);
}

export function handleWebPrimaryButtonClick(input: WebPrimaryButtonClickInput) {
  if (isDevEnvironment) {
    console.info("[primary-button] click", {
      disabled: input.disabled,
      label: input.label
    });
  }

  if (!input.disabled) {
    input.onPress();
  }
}
