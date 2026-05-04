import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "fitness-app:auth-token";

function canUseLocalStorage() {
  return typeof globalThis !== "undefined" && "localStorage" in globalThis;
}

function normalizeStoredToken(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  // Guard against accidental stringified null/undefined values being persisted.
  if (trimmed === "null" || trimmed === "undefined") {
    return null;
  }

  return trimmed;
}

export async function readStoredAuthToken() {
  if (Platform.OS === "web") {
    if (!canUseLocalStorage()) {
      return null;
    }

    const token = normalizeStoredToken(globalThis.localStorage.getItem(TOKEN_KEY));
    if (!token) {
      globalThis.localStorage.removeItem(TOKEN_KEY);
    }

    return token;
  }

  const token = normalizeStoredToken(await SecureStore.getItemAsync(TOKEN_KEY));
  if (!token) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }

  return token;
}

export async function writeStoredAuthToken(token: string) {
  if (Platform.OS === "web") {
    if (canUseLocalStorage()) {
      globalThis.localStorage.setItem(TOKEN_KEY, token.trim());
    }
    return;
  }

  await SecureStore.setItemAsync(TOKEN_KEY, token.trim());
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
