import { apiRequest } from "./client";

export type AuthUser = {
  email: string;
  id: string;
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
