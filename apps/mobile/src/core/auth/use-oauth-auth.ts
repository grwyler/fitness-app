import { useCallback, useMemo, useState } from "react";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import type { OAuthIntent, OAuthProviderName } from "../../api/auth";
import { exchangeOAuthCode, registerOAuthState } from "../../api/auth";
import { getOAuthProviderConfig, getOAuthProviderConfigStatus } from "./oauth-config";
import { MobileApiError } from "../../api/errors";

WebBrowser.maybeCompleteAuthSession();

type OAuthUiState = {
  errorMessage: string | null;
  loadingProvider: OAuthProviderName | null;
};

const googleDiscovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth"
} as const;

const facebookDiscovery = {
  authorizationEndpoint: "https://www.facebook.com/v20.0/dialog/oauth"
} as const;

function getProviderDiscovery(provider: OAuthProviderName) {
  return provider === "google" ? googleDiscovery : facebookDiscovery;
}

function getProviderScopes(provider: OAuthProviderName) {
  return provider === "google" ? ["openid", "email", "profile"] : ["public_profile", "email"];
}

function mapOAuthCancelToMessage(provider: OAuthProviderName) {
  return provider === "google" ? "Google sign-in was cancelled." : "Facebook sign-in was cancelled.";
}

function mapOAuthDenyToMessage(provider: OAuthProviderName) {
  return provider === "google" ? "Google denied access." : "Facebook denied access.";
}

export function useOAuthAuth(input: { intent: OAuthIntent; enabledProviders?: OAuthProviderName[] }) {
  const enabledProviders = input.enabledProviders ?? ["google", "facebook"];
  const [state, setState] = useState<OAuthUiState>({ errorMessage: null, loadingProvider: null });

  const providerConfigured = useMemo(() => {
    const configured: Record<OAuthProviderName, boolean> = {
      google: Boolean(getOAuthProviderConfig("google")),
      facebook: Boolean(getOAuthProviderConfig("facebook"))
    };

    return configured;
  }, []);

  const startOAuth = useCallback(
    async (provider: OAuthProviderName) => {
      if (!enabledProviders.includes(provider)) {
        setState({ errorMessage: "This sign-in provider is disabled.", loadingProvider: null });
        return null;
      }

      const config = getOAuthProviderConfig(provider);
      if (!config) {
        const status = getOAuthProviderConfigStatus(provider);
        const suffix = status.missingKeys.length > 0 ? ` Missing: ${status.missingKeys.join(", ")}.` : "";
        setState({ errorMessage: `OAuth is not configured for ${provider}.${suffix}`, loadingProvider: null });
        return null;
      }

      if (state.loadingProvider) {
        return null;
      }

      setState({ errorMessage: null, loadingProvider: provider });

      try {
        const request = new AuthSession.AuthRequest({
          clientId: config.clientId,
          redirectUri: config.redirectUri,
          responseType: AuthSession.ResponseType.Code,
          scopes: getProviderScopes(provider),
          usePKCE: true
        });

        const discovery = getProviderDiscovery(provider);
        await request.makeAuthUrlAsync(discovery);

        if (!request.state) {
          throw new Error("Unable to start OAuth sign-in (missing state).");
        }

        const codeVerifier = (request as any).codeVerifier as string | undefined;
        if (!codeVerifier) {
          throw new Error("Unable to start OAuth sign-in (missing PKCE verifier).");
        }

        await registerOAuthState({
          provider,
          state: request.state,
          intent: input.intent
        });

        const result = await request.promptAsync(discovery);

        if (result.type === "dismiss" || result.type === "cancel") {
          setState({ errorMessage: mapOAuthCancelToMessage(provider), loadingProvider: null });
          return null;
        }

        if (result.type === "error") {
          setState({ errorMessage: mapOAuthDenyToMessage(provider), loadingProvider: null });
          return null;
        }

        if (result.type !== "success") {
          setState({ errorMessage: "Unable to complete sign in.", loadingProvider: null });
          return null;
        }

        const responseState = result.params?.state;
        if (typeof responseState !== "string" || responseState !== request.state) {
          setState({ errorMessage: "Invalid or expired sign-in attempt. Please try again.", loadingProvider: null });
          return null;
        }

        const code = result.params?.code;
        if (typeof code !== "string" || !code) {
          const providerError = result.params?.error;
          if (providerError === "access_denied") {
            setState({ errorMessage: mapOAuthDenyToMessage(provider), loadingProvider: null });
            return null;
          }

          setState({ errorMessage: "Unable to complete sign in.", loadingProvider: null });
          return null;
        }

        const authResponse = await exchangeOAuthCode({
          provider,
          clientId: config.clientId,
          code,
          codeVerifier,
          redirectUri: config.redirectUri,
          state: request.state
        });

        setState({ errorMessage: null, loadingProvider: null });
        return authResponse;
      } catch (error) {
        let message = error instanceof Error ? error.message : "Unable to complete sign in.";
        if (error instanceof MobileApiError && Array.isArray(error.details) && error.details.length > 0) {
          const rendered = error.details
            .map((detail) => (detail.field ? `${detail.field}: ${detail.message}` : detail.message))
            .join(" | ");
          message = `${message} (${rendered})`;
        }
        setState({ errorMessage: message, loadingProvider: null });
        return null;
      }
    },
    [enabledProviders, input.intent, state.loadingProvider]
  );

  return {
    startOAuth,
    oauthErrorMessage: state.errorMessage,
    oauthLoadingProvider: state.loadingProvider,
    providerConfigured
  };
}
