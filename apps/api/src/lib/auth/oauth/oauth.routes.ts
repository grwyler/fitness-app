import { Router } from "express";
import { z } from "zod";
import { failure, success } from "../../http/envelope.js";
import { getEnv } from "../../../config/env.js";
import { issueAuthToken } from "../token.js";
import { exchangeOAuthCodeForProfile, OAuthProviderConfigError, OAuthProviderExchangeError } from "./oauth.providers.js";
import { consumeOAuthState, OAuthEmailError, OAuthLinkError, registerOAuthState, resolveUserForOAuthProfile } from "./oauth.service.js";
import type { OAuthIntent, OAuthProviderName } from "./oauth.types.js";

type DatabaseLike = {
  select: (...args: any[]) => any;
  insert: (...args: any[]) => any;
  update: (...args: any[]) => any;
  transaction: <T>(operation: (tx: any) => Promise<T>) => Promise<T>;
};

const providerSchema = z.enum(["google", "facebook"]);

const registerStateSchema = z.object({
  provider: providerSchema,
  state: z.string().min(8).max(2048),
  intent: z.enum(["signin", "signup"]).nullable().optional()
});

const exchangeSchema = z.object({
  provider: providerSchema,
  clientId: z.string().min(1),
  code: z.string().min(1),
  codeVerifier: z.string().min(1),
  redirectUri: z.string().url(),
  state: z.string().min(8).max(2048)
});

function parseAllowedRedirectUris(value: string | undefined) {
  return (
    value?.split(/[\s,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean) ?? []
  );
}

function getAllowedRedirectUris(input: { provider: OAuthProviderName; env: ReturnType<typeof getEnv> }) {
  const configured =
    input.provider === "google"
      ? parseAllowedRedirectUris(input.env.GOOGLE_OAUTH_REDIRECT_URIS)
      : parseAllowedRedirectUris(input.env.FACEBOOK_OAUTH_REDIRECT_URIS);

  return configured;
}

function isRedirectUriAllowed(input: { provider: OAuthProviderName; redirectUri: string; env: ReturnType<typeof getEnv> }) {
  return getAllowedRedirectUris({ provider: input.provider, env: input.env }).includes(input.redirectUri);
}

function isGoogleClientIdAllowed(input: { clientId: string; env: ReturnType<typeof getEnv> }) {
  const configured = input.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  return Boolean(configured) && configured === input.clientId;
}

function isFacebookClientIdAllowed(input: { clientId: string; env: ReturnType<typeof getEnv> }) {
  const configured = input.env.FACEBOOK_OAUTH_CLIENT_ID?.trim();
  return Boolean(configured) && configured === input.clientId;
}

function getProviderConfigDiagnostics(input: { provider: OAuthProviderName; env: ReturnType<typeof getEnv> }) {
  const isGoogle = input.provider === "google";
  const hasClientId = isGoogle
    ? Boolean(input.env.GOOGLE_OAUTH_CLIENT_ID?.trim())
    : Boolean(input.env.FACEBOOK_OAUTH_CLIENT_ID?.trim());
  const hasClientSecret = isGoogle
    ? Boolean(input.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim())
    : Boolean(input.env.FACEBOOK_OAUTH_CLIENT_SECRET?.trim());
  const allowedRedirectUris = getAllowedRedirectUris({ provider: input.provider, env: input.env });

  return {
    hasClientId,
    hasClientSecret,
    allowedRedirectUrisCount: allowedRedirectUris.length
  };
}

export function createOAuthRouter(database: DatabaseLike) {
  const router = Router();

  router.post("/auth/oauth/state", async (request, response, next) => {
    try {
      const parsed = registerStateSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json(failure("VALIDATION_ERROR", "Invalid OAuth state payload."));
        return;
      }

      const env = getEnv();
      await registerOAuthState({
        database,
        provider: parsed.data.provider,
        state: parsed.data.state,
        intent: (parsed.data.intent ?? null) as OAuthIntent | null,
        ttlMinutes: env.OAUTH_STATE_TTL_MINUTES
      });

      response.json(success({}));
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/oauth/exchange", async (request, response, next) => {
    try {
      const parsed = exchangeSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json(failure("VALIDATION_ERROR", "Invalid OAuth callback payload."));
        return;
      }

      const env = getEnv();
      const provider = parsed.data.provider as OAuthProviderName;

      const configDiag = getProviderConfigDiagnostics({ provider, env });
      if (!configDiag.hasClientId) {
        response.status(500).json(failure("INTERNAL_ERROR", "OAuth is not configured.", [
          { field: provider === "google" ? "GOOGLE_OAUTH_CLIENT_ID" : "FACEBOOK_OAUTH_CLIENT_ID", message: "Missing." }
        ]));
        return;
      }

      if (!configDiag.hasClientSecret) {
        response.status(500).json(failure("INTERNAL_ERROR", "OAuth is not configured.", [
          { field: provider === "google" ? "GOOGLE_OAUTH_CLIENT_SECRET" : "FACEBOOK_OAUTH_CLIENT_SECRET", message: "Missing." }
        ]));
        return;
      }

      if (configDiag.allowedRedirectUrisCount === 0) {
        response.status(500).json(failure("INTERNAL_ERROR", "OAuth is not configured.", [
          { field: provider === "google" ? "GOOGLE_OAUTH_REDIRECT_URIS" : "FACEBOOK_OAUTH_REDIRECT_URIS", message: "Missing or empty." }
        ]));
        return;
      }

      if (!isRedirectUriAllowed({ provider, redirectUri: parsed.data.redirectUri, env })) {
        const allowed = getAllowedRedirectUris({ provider, env });
        response.status(400).json(
          failure("VALIDATION_ERROR", "Redirect URI mismatch.", [
            { field: "redirectUri", message: parsed.data.redirectUri },
            { field: "allowedRedirectUris", message: allowed.join(", ") || "(none configured)" }
          ])
        );
        return;
      }

      if (provider === "google" && !isGoogleClientIdAllowed({ clientId: parsed.data.clientId, env })) {
        response.status(500).json(
          failure("INTERNAL_ERROR", "OAuth is not configured.", [
            { field: "GOOGLE_OAUTH_CLIENT_ID", message: "Configured client id does not match the request." }
          ])
        );
        return;
      }

      if (provider === "facebook" && !isFacebookClientIdAllowed({ clientId: parsed.data.clientId, env })) {
        response.status(500).json(
          failure("INTERNAL_ERROR", "OAuth is not configured.", [
            { field: "FACEBOOK_OAUTH_CLIENT_ID", message: "Configured client id does not match the request." }
          ])
        );
        return;
      }

      const stateConsumed = await consumeOAuthState({
        database,
        provider,
        state: parsed.data.state
      });

      if (!stateConsumed) {
        response.status(400).json(failure("VALIDATION_ERROR", "Invalid or expired OAuth state. Please try again."));
        return;
      }

      let profileResult;
      try {
        profileResult = await exchangeOAuthCodeForProfile({
          env,
          provider,
          clientId: parsed.data.clientId,
          code: parsed.data.code,
          codeVerifier: parsed.data.codeVerifier,
          redirectUri: parsed.data.redirectUri
        });
      } catch (error) {
        if (error instanceof OAuthProviderConfigError) {
          response.status(500).json(
            failure(
              "INTERNAL_ERROR",
              "OAuth is not configured.",
              error.missingKey ? [{ field: error.missingKey, message: "Missing." }] : undefined
            )
          );
          return;
        }

        if (error instanceof OAuthProviderExchangeError) {
          if (error.reason === "redirect_uri_mismatch") {
            response.status(400).json(failure("VALIDATION_ERROR", "Redirect URI mismatch."));
            return;
          }

          if (error.reason === "access_denied") {
            response.status(401).json(failure("UNAUTHENTICATED", "OAuth access was denied."));
            return;
          }

          response.status(401).json(failure("UNAUTHENTICATED", "Unable to sign in with this provider."));
          return;
        }

        throw error;
      }

      let user;
      try {
        user = await resolveUserForOAuthProfile({
          database,
          env,
          profile: profileResult.profile
        });
      } catch (error) {
        if (error instanceof OAuthEmailError) {
          response.status(400).json(failure("VALIDATION_ERROR", error.message));
          return;
        }

        if (error instanceof OAuthLinkError) {
          response.status(409).json(failure("CONFLICT", error.message));
          return;
        }

        throw error;
      }

      const token = issueAuthToken({
        email: user.email,
        userId: user.id
      });

      response.json(
        success({
          token,
          user
        })
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
