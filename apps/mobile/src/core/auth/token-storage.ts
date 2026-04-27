import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "fitness-app:auth-token";

function canUseLocalStorage() {
  return typeof globalThis !== "undefined" && "localStorage" in globalThis;
}

export async function readStoredAuthToken() {
  if (Platform.OS === "web") {
    return canUseLocalStorage() ? globalThis.localStorage.getItem(TOKEN_KEY) : null;
  }

  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function writeStoredAuthToken(token: string) {
  if (Platform.OS === "web") {
    if (canUseLocalStorage()) {
      globalThis.localStorage.setItem(TOKEN_KEY, token);
    }
    return;
  }

  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearStoredAuthToken() {
  if (Platform.OS === "web") {
    if (canUseLocalStorage()) {
      globalThis.localStorage.removeItem(TOKEN_KEY);
    }
    return;
  }

  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
