import { jwtVerify, createRemoteJWKSet } from "jose";
import type { AppEnv } from "../../../config/env.js";
import type { OAuthExchangeResult, OAuthProfile, OAuthProviderName } from "./oauth.types.js";

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export class OAuthProviderConfigError extends Error {
  readonly name = "OAuthProviderConfigError";
  readonly missingKey: string | undefined;

  constructor(message: string, missingKey?: string) {
    super(message);
    this.missingKey = missingKey;
  }
}

export class OAuthProviderExchangeError extends Error {
  readonly name = "OAuthProviderExchangeError";
  readonly reason:
    | "access_denied"
    | "redirect_uri_mismatch"
    | "invalid_code"
    | "invalid_client"
    | "network_error"
    | "unknown";

  constructor(message: string, reason: OAuthProviderExchangeError["reason"] = "unknown") {
    super(message);
    this.reason = reason;
  }
}

async function readProviderJson(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text) as any;
  } catch {
    return { raw: text };
  }
}

function buildOAuthProfile(input: Omit<OAuthProfile, "email"> & { email: string | null }) {
  return {
    ...input,
    email: input.email ? normalizeEmail(input.email) : null
  };
}

const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

async function exchangeGoogle(input: {
  env: AppEnv;
  clientId: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<OAuthExchangeResult> {
  const clientId = input.clientId.trim();

  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", input.code);
  body.set("client_id", clientId);
  body.set("redirect_uri", input.redirectUri);
  body.set("code_verifier", input.codeVerifier);

  const secret = input.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  if (!secret) {
    throw new OAuthProviderConfigError("Missing GOOGLE_OAUTH_CLIENT_SECRET.", "GOOGLE_OAUTH_CLIENT_SECRET");
  }
  body.set("client_secret", secret);

  let response: Response;
  try {
    response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });
  } catch (error) {
    throw new OAuthProviderExchangeError(
      error instanceof Error ? error.message : "Network error contacting Google token endpoint.",
      "network_error"
    );
  }

  const payload = await readProviderJson(response);
  if (!response.ok) {
    const errorCode = asString(payload?.error);
    const errorDescription = asString(payload?.error_description);

    if (errorCode === "redirect_uri_mismatch") {
      throw new OAuthProviderExchangeError(errorDescription ?? "Google redirect URI mismatch.", "redirect_uri_mismatch");
    }

    if (errorCode === "access_denied") {
      throw new OAuthProviderExchangeError(errorDescription ?? "Google denied access.", "access_denied");
    }

    if (errorCode === "invalid_grant") {
      throw new OAuthProviderExchangeError(errorDescription ?? "Invalid or expired Google authorization code.", "invalid_code");
    }

    if (errorCode === "invalid_client") {
      throw new OAuthProviderExchangeError(errorDescription ?? "Invalid Google OAuth client configuration.", "invalid_client");
    }

    throw new OAuthProviderExchangeError(errorDescription ?? "Unable to exchange Google authorization code.");
  }

  const idToken = asString(payload?.id_token);
  if (!idToken) {
    throw new OAuthProviderExchangeError("Google token response did not include an id_token.");
  }

  const verified = await jwtVerify(idToken, googleJwks, {
    audience: clientId,
    issuer: ["https://accounts.google.com", "accounts.google.com"]
  });

  const sub = asString(verified.payload?.sub);
  if (!sub) {
    throw new OAuthProviderExchangeError("Google id_token is missing subject.");
  }

  const email = asString(verified.payload?.email);
  const emailVerified = asBoolean(verified.payload?.email_verified) ?? false;
  const name = asString(verified.payload?.name);
  const picture = asString(verified.payload?.picture);

  return {
    profile: buildOAuthProfile({
      provider: "google",
      providerUserId: sub,
      email,
      emailVerified,
      displayName: name,
      avatarUrl: picture
    })
  };
}

async function exchangeFacebook(input: {
  env: AppEnv;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<OAuthExchangeResult> {
  const clientId = input.env.FACEBOOK_OAUTH_CLIENT_ID?.trim();
  const clientSecret = input.env.FACEBOOK_OAUTH_CLIENT_SECRET?.trim();

  if (!clientId) {
    throw new OAuthProviderConfigError("Missing FACEBOOK_OAUTH_CLIENT_ID.");
  }

  if (!clientSecret) {
    throw new OAuthProviderConfigError("Missing FACEBOOK_OAUTH_CLIENT_SECRET.");
  }

  const tokenUrl = new URL("https://graph.facebook.com/v20.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("redirect_uri", input.redirectUri);
  tokenUrl.searchParams.set("client_secret", clientSecret);
  tokenUrl.searchParams.set("code", input.code);
  tokenUrl.searchParams.set("code_verifier", input.codeVerifier);

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(tokenUrl, {
      method: "GET"
    });
  } catch (error) {
    throw new OAuthProviderExchangeError(
      error instanceof Error ? error.message : "Network error contacting Facebook token endpoint.",
      "network_error"
    );
  }

  const tokenPayload = await readProviderJson(tokenResponse);
  if (!tokenResponse.ok) {
    const error = tokenPayload?.error;
    const message = asString(error?.message) ?? "Unable to exchange Facebook authorization code.";
    const code = asString(error?.type) ?? asString(error?.code);

    if (typeof message === "string" && message.toLowerCase().includes("redirect uri")) {
      throw new OAuthProviderExchangeError(message, "redirect_uri_mismatch");
    }

    if (code === "OAuthException" && typeof message === "string" && message.toLowerCase().includes("code")) {
      throw new OAuthProviderExchangeError(message, "invalid_code");
    }

    throw new OAuthProviderExchangeError(message);
  }

  const accessToken = asString(tokenPayload?.access_token);
  if (!accessToken) {
    throw new OAuthProviderExchangeError("Facebook token response did not include an access token.");
  }

  const appAccessToken = `${clientId}|${clientSecret}`;
  const debugUrl = new URL("https://graph.facebook.com/debug_token");
  debugUrl.searchParams.set("input_token", accessToken);
  debugUrl.searchParams.set("access_token", appAccessToken);

  const debugResponse = await fetch(debugUrl, { method: "GET" });
  const debugPayload = await readProviderJson(debugResponse);
  if (!debugResponse.ok || !debugPayload?.data?.is_valid) {
    throw new OAuthProviderExchangeError("Facebook access token could not be validated.", "invalid_code");
  }

  const debugAppId = asString(debugPayload?.data?.app_id);
  if (debugAppId && debugAppId !== clientId) {
    throw new OAuthProviderExchangeError("Facebook access token audience mismatch.", "invalid_client");
  }

  const providerUserId = asString(debugPayload?.data?.user_id) ?? asString(debugPayload?.data?.profile_id);
  if (!providerUserId) {
    throw new OAuthProviderExchangeError("Facebook debug_token response is missing user id.");
  }

  const meUrl = new URL("https://graph.facebook.com/me");
  meUrl.searchParams.set("fields", "id,name,email,picture");
  meUrl.searchParams.set("access_token", accessToken);

  const meResponse = await fetch(meUrl, { method: "GET" });
  const mePayload = await readProviderJson(meResponse);
  if (!meResponse.ok) {
    throw new OAuthProviderExchangeError("Unable to fetch Facebook profile.");
  }

  const email = asString(mePayload?.email);
  const name = asString(mePayload?.name);
  const pictureUrl = asString(mePayload?.picture?.data?.url);

  return {
    profile: buildOAuthProfile({
      provider: "facebook",
      providerUserId,
      email,
      emailVerified: false,
      displayName: name,
      avatarUrl: pictureUrl
    })
  };
}

export async function exchangeOAuthCodeForProfile(input: {
  provider: OAuthProviderName;
  clientId: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
  env: AppEnv;
}): Promise<OAuthExchangeResult> {
  if (input.provider === "google") {
    return exchangeGoogle({
      env: input.env,
      clientId: input.clientId,
      code: input.code,
      codeVerifier: input.codeVerifier,
      redirectUri: input.redirectUri
    });
  }

  return exchangeFacebook({
    env: input.env,
    code: input.code,
    codeVerifier: input.codeVerifier,
    redirectUri: input.redirectUri
  });
}
