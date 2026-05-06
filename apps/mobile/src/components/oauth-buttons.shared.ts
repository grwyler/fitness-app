export const oauthProviderLabels = {
  google: "Continue with Google"
} as const;

export type OAuthProviderLabel = keyof typeof oauthProviderLabels;
