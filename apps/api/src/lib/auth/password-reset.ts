import { createHmac, randomBytes } from "node:crypto";
import { env } from "../../config/env.js";

export function hashPasswordResetToken(token: string) {
  return createHmac("sha256", env.PASSWORD_RESET_TOKEN_SECRET).update(token).digest("base64url");
}

export function generatePasswordResetToken() {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashPasswordResetToken(token);

  const now = Date.now();
  const ttlMs = env.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60_000;
  const expiresAt = new Date(now + ttlMs);

  return {
    token,
    tokenHash,
    expiresAt
  };
}

export function buildPasswordResetLink(token: string) {
  const base = env.PASSWORD_RESET_LINK_BASE_URL;
  const url = new URL(base);
  url.searchParams.set("token", token);
  return url.toString();
}

