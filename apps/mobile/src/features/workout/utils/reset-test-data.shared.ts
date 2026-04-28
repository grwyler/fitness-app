type ResetTestDataAlert = {
  alert: (
    title: string,
    message?: string,
    buttons?: Array<{
      onPress?: () => void;
      style?: "cancel" | "default" | "destructive";
      text?: string;
    }>
  ) => void;
};

type ResetTestDataConfirmationInput = {
  alert: ResetTestDataAlert;
  confirmationMessage: string;
  confirm?: (this: typeof globalThis, message: string) => boolean;
  log?: (event: string) => void;
  onConfirm: () => void;
  platformOs: string;
};

export function requestResetTestDataConfirmation(input: ResetTestDataConfirmationInput) {
  input.log?.("confirmation_opened");

  if (input.platformOs === "web" && input.confirm) {
    if (input.confirm.call(globalThis, `Reset Test Data\n\n${input.confirmationMessage}`)) {
      input.log?.("confirmation_accepted");
      input.onConfirm();
      return;
    }

    input.log?.("confirmation_cancelled");
    return;
  }

  input.alert.alert("Reset Test Data", input.confirmationMessage, [
    {
      style: "cancel",
      text: "Cancel"
    },
    {
      onPress: () => {
        input.log?.("confirmation_accepted");
        input.onConfirm();
      },
      style: "destructive",
      text: "Reset Test Data"
    }
  ]);
}
