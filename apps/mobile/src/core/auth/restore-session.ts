import type { AuthUser } from "../../api/auth";

export type RestoreSessionResult =
  | { status: "unauthenticated"; token: null; user: null }
  | { status: "authenticated"; token: string; user: AuthUser };

export async function restoreSession(input: {
  clearStoredToken: () => Promise<void>;
  fetchCurrentUser: () => Promise<AuthUser>;
  readStoredToken: () => Promise<string | null>;
  setLastKnownAuthToken: (token: string | null, source: string) => void;
}): Promise<RestoreSessionResult> {
  const storedToken = await input.readStoredToken();
  if (!storedToken) {
    return { status: "unauthenticated", token: null, user: null };
  }

  input.setLastKnownAuthToken(storedToken, "stored_app_auth");

  try {
    const restoredUser = await input.fetchCurrentUser();
    return { status: "authenticated", token: storedToken, user: restoredUser };
  } catch {
    await input.clearStoredToken();
    input.setLastKnownAuthToken(null, "restore_failed");
    return { status: "unauthenticated", token: null, user: null };
  }
}

