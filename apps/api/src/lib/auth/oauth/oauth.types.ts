export type OAuthProviderName = "google" | "facebook";

export type OAuthIntent = "signin" | "signup";

export type OAuthProfile = {
  provider: OAuthProviderName;
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  avatarUrl: string | null;
};

export type OAuthExchangeResult = {
  profile: OAuthProfile;
};

