import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const CLOCK_SKEW_SECONDS = 60 * 5;

export type AuthTokenPayload = {
  email: string;
  exp: number;
  iat: number;
  sub: string;
};

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(input: string) {
  return createHmac("sha256", env.JWT_SECRET).update(input).digest("base64url");
}

export function issueAuthToken(input: {
  email: string;
  userId: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      email: input.email,
      exp: now + TOKEN_TTL_SECONDS,
      iat: now,
      sub: input.userId
    })
  );
  const unsignedToken = `${header}.${payload}`;

  return `${unsignedToken}.${sign(unsignedToken)}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) {
    throw new Error("Malformed auth token.");
  }

  const unsignedToken = `${header}.${payload}`;
  const expectedSignature = sign(unsignedToken);
  const actual = Buffer.from(signature, "base64url");
  const expected = Buffer.from(expectedSignature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error("Invalid auth token signature.");
  }

  const parsedHeader = JSON.parse(base64UrlDecode(header)) as { alg?: string; typ?: string };
  if (parsedHeader.alg !== "HS256" || parsedHeader.typ !== "JWT") {
    throw new Error("Unsupported auth token.");
  }

  const parsedPayload = JSON.parse(base64UrlDecode(payload)) as AuthTokenPayload;
  if (
    typeof parsedPayload.sub !== "string" ||
    parsedPayload.sub.length === 0 ||
    typeof parsedPayload.email !== "string" ||
    parsedPayload.email.length === 0 ||
    typeof parsedPayload.exp !== "number" ||
    typeof parsedPayload.iat !== "number"
  ) {
    throw new Error("Invalid auth token payload.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (!Number.isInteger(parsedPayload.exp) || !Number.isInteger(parsedPayload.iat)) {
    throw new Error("Invalid auth token payload.");
  }
  if (parsedPayload.iat > now + CLOCK_SKEW_SECONDS) {
    throw new Error("Invalid auth token payload.");
  }
  if (parsedPayload.exp <= parsedPayload.iat) {
    throw new Error("Invalid auth token payload.");
  }
  if (parsedPayload.exp <= now) {
    throw new Error("Expired auth token.");
  }

  return parsedPayload;
}
