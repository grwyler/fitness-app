import type { OAuthProviderName } from "../../api/auth";

type ProviderConfig = {
  clientId: string;
  redirectUri: string;
};

export type OAuthProviderConfigStatus = {
  config: ProviderConfig | null;
  missingKeys: string[];
};

function readTrimmedEnv(name: string) {
  const raw = process.env?.[name];
  if (typeof raw !== "string") {
    return null;
  }

  const value = raw.trim();
  return value ? value : null;
}

function getProviderKeys(provider: OAuthProviderName) {
  if (provider === "google") {
    return {
      clientId: "EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID",
      redirectUri: "EXPO_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI"
    } as const;
  }

  return {
    clientId: "EXPO_PUBLIC_FACEBOOK_OAUTH_CLIENT_ID",
    redirectUri: "EXPO_PUBLIC_FACEBOOK_OAUTH_REDIRECT_URI"
  } as const;
}

export function getOAuthProviderConfigStatus(provider: OAuthProviderName): OAuthProviderConfigStatus {
  const keys = getProviderKeys(provider);
  const clientId = readTrimmedEnv(keys.clientId);
  const redirectUri = readTrimmedEnv(keys.redirectUri);
  const missingKeys: string[] = [];

  if (!clientId) missingKeys.push(keys.clientId);
  if (!redirectUri) missingKeys.push(keys.redirectUri);

  if (missingKeys.length > 0) {
    return { config: null, missingKeys };
  }

  return { config: { clientId: clientId!, redirectUri: redirectUri! }, missingKeys };
}

export function getOAuthProviderConfig(provider: OAuthProviderName): ProviderConfig | null {
  const status = getOAuthProviderConfigStatus(provider);
  return status.config;
}
