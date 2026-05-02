import { apiRequest } from "./client";

export type AuthUser = {
  email: string;
  id: string;
  role: "user" | "admin";
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export async function signInWithPassword(input: {
  email: string;
  password: string;
}) {
  const response = await apiRequest<AuthResponse>("/auth/signin", {
    body: input,
    method: "POST"
  });

  return response.data;
}

export async function signUpWithPassword(input: {
  email: string;
  password: string;
}) {
  const response = await apiRequest<AuthResponse>("/auth/signup", {
    body: input,
    method: "POST"
  });

  return response.data;
}

export async function fetchCurrentUser() {
  const response = await apiRequest<{ user: AuthUser }>("/auth/me");

  return response.data.user;
}

export async function requestPasswordReset(input: { email: string }) {
  await apiRequest<Record<string, never>>("/auth/password-reset/request", {
    body: input,
    method: "POST"
  });
}

export async function confirmPasswordReset(input: { token: string; password: string }) {
  await apiRequest<Record<string, never>>("/auth/password-reset/confirm", {
    body: input,
    method: "POST"
  });
}
