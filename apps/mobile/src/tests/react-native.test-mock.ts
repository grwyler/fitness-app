import React from "react";

export const View = (props: unknown) => React.createElement("View", props as never);
export const Pressable = (props: unknown) => React.createElement("Pressable", props as never);
export const Text = (props: unknown) => React.createElement("Text", props as never);
export const TextInput = (props: unknown) => React.createElement("TextInput", props as never);
export const ScrollView = View;
export const Modal = View;
export const SafeAreaView = View;
export const ActivityIndicator = View;
export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
  hairlineWidth: 1,
  absoluteFillObject: {} as Record<string, number>
};
