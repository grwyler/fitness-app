export const apiConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000/api/v1",
  userId: process.env.EXPO_PUBLIC_DEV_USER_ID ?? "user-1",
  unitSystem: (process.env.EXPO_PUBLIC_DEV_UNIT_SYSTEM ?? "imperial") as "imperial" | "metric"
} as const;
