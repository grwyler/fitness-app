import { Platform } from "react-native";

const defaultApiBaseUrl =
  Platform.OS === "android"
    ? "http://10.0.2.2:4000/api/v1"
    : "http://127.0.0.1:4000/api/v1";

export const apiConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl,
  userId: process.env.EXPO_PUBLIC_DEV_USER_ID ?? "11111111-1111-1111-1111-111111111111",
  unitSystem: (process.env.EXPO_PUBLIC_DEV_UNIT_SYSTEM ?? "imperial") as "imperial" | "metric"
} as const;
