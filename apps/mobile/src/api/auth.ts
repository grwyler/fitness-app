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

export type OAuthProviderName = "google" | "facebook";
export type OAuthIntent = "signin" | "signup";

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

export async function registerOAuthState(input: {
  provider: OAuthProviderName;
  state: string;
  intent: OAuthIntent;
}) {
  await apiRequest<Record<string, never>>("/auth/oauth/state", {
    body: input,
    method: "POST"
  });
}

export async function exchangeOAuthCode(input: {
  provider: OAuthProviderName;
  clientId: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
  state: string;
}) {
  const response = await apiRequest<AuthResponse>("/auth/oauth/exchange", {
    body: input,
    method: "POST"
  });

  return response.data;
}
