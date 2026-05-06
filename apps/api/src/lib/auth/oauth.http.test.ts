import assert from "node:assert/strict";
import { createServer, request as httpRequest } from "node:http";
import { Router } from "express";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { oauthStates, userOauthIdentities, users } from "@fitness/db";
import { and, eq, isNull } from "drizzle-orm";
import { createApp } from "../../app.js";
import { bootstrapDevelopmentDatabase, TEST_USER_EMAIL } from "../db/dev-bootstrap.js";
import { createPgliteClient, createPgliteDatabase } from "../db/connection.js";
import type { HttpTestCase } from "../../modules/workout/http/test-helpers/http-test-case.js";
import { resetEnvForTests } from "../../config/env.js";

function setEnvValue(name: string, value: string | undefined) {
  if (value === undefined) {
    delete (process.env as any)[name];
    return;
  }

  (process.env as any)[name] = value;
}

function setEnvMissing(name: string) {
  (process.env as any)[name] = "";
}

const googleTestKid = "test-google-kid";
let googleTestMaterialPromise:
  | Promise<{ publicKey: CryptoKey; privateKey: any; jwk: Record<string, unknown>; kid: string }>
  | null = null;

async function getGoogleTestMaterial() {
  if (!googleTestMaterialPromise) {
    googleTestMaterialPromise = (async () => {
      const { publicKey, privateKey } = await generateKeyPair("RS256");
      const jwk = (await exportJWK(publicKey)) as Record<string, unknown>;
      (jwk as any).kid = googleTestKid;
      (jwk as any).use = "sig";
      (jwk as any).alg = "RS256";
      return { publicKey, privateKey, jwk, kid: googleTestKid };
    })();
  }

  return googleTestMaterialPromise;
}

async function startHttpServer(database: any) {
  const app = createApp({
    database,
    workoutRouter: Router()
  });
  const server = createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected OAuth test server to listen on an ephemeral port.");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  };
}

async function httpJson(input: {
  url: string;
  method?: "GET" | "POST";
  body?: unknown;
  headers?: Record<string, string>;
}) {
  const parsed = new URL(input.url);

  const payload = input.body === undefined ? undefined : JSON.stringify(input.body);
  const headers = {
    ...(payload ? { "Content-Type": "application/json", "Content-Length": String(Buffer.byteLength(payload)) } : {}),
    ...(input.headers ?? {})
  };

  const response = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
    const req = httpRequest(
      {
        host: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        method: input.method ?? (payload ? "POST" : "GET"),
        headers
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => {
          resolve({ statusCode: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") });
        });
      }
    );

    req.on("error", reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });

  const json = response.body ? (JSON.parse(response.body) as any) : null;
  return {
    status: response.statusCode,
    json
  };
}

async function createGoogleIdToken(input: {
  privateKey: any;
  kid: string;
  clientId: string;
  sub: string;
  email?: string;
  emailVerified?: boolean;
}) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const jwt = new SignJWT({
    sub: input.sub,
    email: input.email,
    email_verified: input.emailVerified ?? false,
    name: "Google User",
    picture: "https://example.com/avatar.png",
    aud: input.clientId,
    iss: "https://accounts.google.com"
  })
    .setProtectedHeader({ alg: "RS256", kid: input.kid, typ: "JWT" })
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + 60);

  return jwt.sign(input.privateKey);
}

export const oauthHttpTestCases: HttpTestCase[] = [
  {
    name: "OAuth: invalid state is rejected",
    run: async () => {
      resetEnvForTests();
      setEnvValue("USE_PGLITE_DEV", "true");
      setEnvValue("GOOGLE_OAUTH_CLIENT_ID", "google-client-id");
      setEnvValue("GOOGLE_OAUTH_CLIENT_SECRET", "google-secret");
      setEnvValue("GOOGLE_OAUTH_REDIRECT_URIS", "fitnessapp://oauth");
      setEnvValue("FACEBOOK_OAUTH_CLIENT_ID", "fb-app-id");
      setEnvValue("FACEBOOK_OAUTH_CLIENT_SECRET", "fb-secret");
      setEnvValue("FACEBOOK_OAUTH_REDIRECT_URIS", "fitnessapp://oauth");

      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client);
      const database = createPgliteDatabase(client);
      const server = await startHttpServer(database);

      try {
        const exchange = await httpJson({
          url: `${server.baseUrl}/api/v1/auth/oauth/exchange`,
          body: {
            provider: "google",
            clientId: "google-client-id",
            code: "code-1",
            codeVerifier: "verifier-1",
            redirectUri: "fitnessapp://oauth",
            state: "missing-state-123"
          }
        });

        assert.equal(exchange.status, 400);
        assert.equal(exchange.json?.error?.code, "VALIDATION_ERROR");
      } finally {
        await server.close();
      }
    }
  },
  {
    name: "OAuth: redirect URI mismatch includes allowed list details",
    run: async () => {
      resetEnvForTests();
      setEnvValue("USE_PGLITE_DEV", "true");
      setEnvValue("GOOGLE_OAUTH_CLIENT_ID", "google-client-id");
      setEnvValue("GOOGLE_OAUTH_CLIENT_SECRET", "google-secret");
      setEnvValue("GOOGLE_OAUTH_REDIRECT_URIS", "http://localhost:8081/api/auth/callback/google");
      setEnvValue("FACEBOOK_OAUTH_CLIENT_ID", "fb-app-id");
      setEnvValue("FACEBOOK_OAUTH_CLIENT_SECRET", "fb-secret");
      setEnvValue("FACEBOOK_OAUTH_REDIRECT_URIS", "fitnessapp://oauth");

      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client);
      const database = createPgliteDatabase(client);
      const server = await startHttpServer(database);

      try {
        const state = "state-google-redirect-mismatch-123456";
        await httpJson({
          url: `${server.baseUrl}/api/v1/auth/oauth/state`,
          body: { provider: "google", state, intent: "signin" }
        });

        const exchange = await httpJson({
          url: `${server.baseUrl}/api/v1/auth/oauth/exchange`,
          body: {
            provider: "google",
            clientId: "google-client-id",
            code: "code-any",
            codeVerifier: "verifier-any",
            redirectUri: "http://localhost:8081/wrong",
            state
          }
        });

        assert.equal(exchange.status, 400);
        const fields = (exchange.json?.error?.details ?? []).map((detail: any) => detail.field);
        assert.ok(fields.includes("allowedRedirectUris"));
      } finally {
        await server.close();
      }
    }
  },
  {
    name: "OAuth: missing GOOGLE_OAUTH_CLIENT_SECRET returns a clear configuration error",
    run: async () => {
      resetEnvForTests();
      setEnvValue("USE_PGLITE_DEV", "true");
      setEnvValue("GOOGLE_OAUTH_CLIENT_ID", "google-client-id");
      setEnvMissing("GOOGLE_OAUTH_CLIENT_SECRET");
      setEnvValue("GOOGLE_OAUTH_REDIRECT_URIS", "fitnessapp://oauth");
      setEnvValue("FACEBOOK_OAUTH_CLIENT_ID", "fb-app-id");
      setEnvValue("FACEBOOK_OAUTH_CLIENT_SECRET", "fb-secret");
      setEnvValue("FACEBOOK_OAUTH_REDIRECT_URIS", "fitnessapp://oauth");

      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client);
      const database = createPgliteDatabase(client);
      const server = await startHttpServer(database);

      try {
        const state = "state-google-missing-secret-123456";
        await httpJson({
          url: `${server.baseUrl}/api/v1/auth/oauth/state`,
          body: { provider: "google", state, intent: "signin" }
        });

        const exchange = await httpJson({
          url: `${server.baseUrl}/api/v1/auth/oauth/exchange`,
          body: {
            provider: "google",
            clientId: "google-client-id",
            code: "code-google-missing-secret",
            codeVerifier: "verifier-google-missing-secret",
            redirectUri: "fitnessapp://oauth",
            state
          }
        });

        assert.equal(exchange.status, 500);
        assert.equal(exchange.json?.error?.code, "INTERNAL_ERROR");
        const fields = (exchange.json?.error?.details ?? []).map((detail: any) => detail.field);
        assert.ok(fields.includes("GOOGLE_OAUTH_CLIENT_SECRET"));
      } finally {
        await server.close();
      }
    }
  },
  {
    name: "OAuth: missing GOOGLE_OAUTH_REDIRECT_URIS returns a clear configuration error",
    run: async () => {
      resetEnvForTests();
      setEnvValue("USE_PGLITE_DEV", "true");
      setEnvValue("GOOGLE_OAUTH_CLIENT_ID", "google-client-id");
      setEnvValue("GOOGLE_OAUTH_CLIENT_SECRET", "google-secret");
      setEnvMissing("GOOGLE_OAUTH_REDIRECT_URIS");
      setEnvValue("FACEBOOK_OAUTH_CLIENT_ID", "fb-app-id");
      setEnvValue("FACEBOOK_OAUTH_CLIENT_SECRET", "fb-secret");
      setEnvValue("FACEBOOK_OAUTH_REDIRECT_URIS", "fitnessapp://oauth");

      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client);
      const database = createPgliteDatabase(client);
      const server = await startHttpServer(database);

      try {
        const state = "state-google-missing-redirect-123456";
        await httpJson({
          url: `${server.baseUrl}/api/v1/auth/oauth/state`,
          body: { provider: "google", state, intent: "signin" }
        });

        const exchange = await httpJson({
          url: `${server.baseUrl}/api/v1/auth/oauth/exchange`,
          body: {
            provider: "google",
            clientId: "google-client-id",
            code: "code-google-missing-redirect",
            codeVerifier: "verifier-google-missing-redirect",
            redirectUri: "fitnessapp://oauth",
            state
          }
        });

        assert.equal(exchange.status, 500);
        assert.equal(exchange.json?.error?.code, "INTERNAL_ERROR");
        const fields = (exchange.json?.error?.details ?? []).map((detail: any) => detail.field);
        assert.ok(fields.includes("GOOGLE_OAUTH_REDIRECT_URIS"));
      } finally {
        await server.close();
      }
    }
  },
  {
    name: "OAuth: Google callback creates a new user and links identity",
    run: async () => {
      resetEnvForTests();
      setEnvValue("USE_PGLITE_DEV", "true");
      setEnvValue("GOOGLE_OAUTH_CLIENT_ID", "google-client-id");
      setEnvValue("GOOGLE_OAUTH_CLIENT_SECRET", "google-secret");
      setEnvValue("GOOGLE_OAUTH_REDIRECT_URIS", "  fitnessapp://oauth , http://localhost:8081  ");
      setEnvValue("FACEBOOK_OAUTH_CLIENT_ID", "fb-app-id");
      setEnvValue("FACEBOOK_OAUTH_CLIENT_SECRET", "fb-secret");
      setEnvValue("FACEBOOK_OAUTH_REDIRECT_URIS", "fitnessapp://oauth");

      const { privateKey, jwk, kid } = await getGoogleTestMaterial();

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

        if (url === "https://www.googleapis.com/oauth2/v3/certs") {
          return new Response(JSON.stringify({ keys: [jwk] }), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        if (url === "https://oauth2.googleapis.com/token") {
          const body = typeof init?.body === "string" ? init.body : init?.body instanceof URLSearchParams ? init.body.toString() : "";
          const params = new URLSearchParams(body);
          assert.equal(params.get("code"), "code-google-new");
          assert.equal(params.get("client_id"), "google-client-id");
          assert.equal(params.get("client_secret"), "google-secret");
          assert.equal(params.get("redirect_uri"), "fitnessapp://oauth");
          assert.equal(params.get("code_verifier"), "verifier-google-new");

          const idToken = await createGoogleIdToken({
            privateKey,
            kid,
            clientId: "google-client-id",
            sub: "google-user-1",
            email: "new-google@example.com",
            emailVerified: true
          });

          return new Response(JSON.stringify({ access_token: "ga", id_token: idToken, token_type: "Bearer", expires_in: 3600 }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        return new Response(JSON.stringify({ error: "unexpected_fetch", url }), { status: 500 });
      }) as typeof fetch;

      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client);
      const database = createPgliteDatabase(client);
      const server = await startHttpServer(database);

      try {
        const state = "state-google-new-123456";

        const register = await httpJson({
          url: `${server.baseUrl}/api/v1/auth/oauth/state`,
          body: {
            provider: "google",
            state,
            intent: "signin"
          }
        });
        assert.equal(register.status, 200);

        const exchange = await httpJson({
          url: `${server.baseUrl}/api/v1/auth/oauth/exchange`,
          body: {
            provider: "google",
            clientId: "google-client-id",
            code: "code-google-new",
            codeVerifier: "verifier-google-new",
            redirectUri: "fitnessapp://oauth",
            state
          }
        });

        assert.equal(exchange.status, 200);
        assert.ok(exchange.json?.data?.token);
        assert.equal(exchange.json?.data?.user?.email, "new-google@example.com");

        const createdUser = (
          await database
            .select({ id: users.id, email: users.email })
            .from(users)
            .where(and(eq(users.email, "new-google@example.com"), isNull(users.deletedAt)))
            .limit(1)
        )[0];
        assert.ok(createdUser);

        const identity = (
          await database
            .select({ userId: userOauthIdentities.userId })
            .from(userOauthIdentities)
            .where(eq(userOauthIdentities.userId, createdUser.id))
            .limit(1)
        )[0];
        assert.ok(identity);

        const stateRow = (
          await database
            .select({ consumedAt: oauthStates.consumedAt })
            .from(oauthStates)
            .limit(1)
        )[0];
        assert.ok(stateRow?.consumedAt, "Expected OAuth state to be consumed.");
      } finally {
        globalThis.fetch = originalFetch;
        await server.close();
      }
    }
  },
  {
    name: "OAuth: Google callback links provider to existing email user",
    run: async () => {
      resetEnvForTests();
      process.env.USE_PGLITE_DEV = "true";
      process.env.GOOGLE_OAUTH_CLIENT_ID = "google-client-id";
      process.env.GOOGLE_OAUTH_CLIENT_SECRET = "google-secret";
      process.env.GOOGLE_OAUTH_REDIRECT_URIS = "fitnessapp://oauth";
      process.env.FACEBOOK_OAUTH_CLIENT_ID = "fb-app-id";
      process.env.FACEBOOK_OAUTH_CLIENT_SECRET = "fb-secret";
      process.env.FACEBOOK_OAUTH_REDIRECT_URIS = "fitnessapp://oauth";

      const { privateKey, jwk, kid } = await getGoogleTestMaterial();

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

        if (url === "https://www.googleapis.com/oauth2/v3/certs") {
          return new Response(JSON.stringify({ keys: [jwk] }), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        if (url === "https://oauth2.googleapis.com/token") {
          const idToken = await createGoogleIdToken({
            privateKey,
            kid,
            clientId: "google-client-id",
            sub: "google-user-link-1",
            email: TEST_USER_EMAIL,
            emailVerified: true
          });

          return new Response(JSON.stringify({ access_token: "ga", id_token: idToken, token_type: "Bearer", expires_in: 3600 }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        return new Response(JSON.stringify({ error: "unexpected_fetch", url }), { status: 500 });
      }) as typeof fetch;

      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client);
      const database = createPgliteDatabase(client);
      const server = await startHttpServer(database);

      try {
        const [existingUser] = await database
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.email, TEST_USER_EMAIL), isNull(users.deletedAt)))
          .limit(1);
        assert.ok(existingUser);

        const state = "state-google-link-123456";
        await httpJson({
          url: `${server.baseUrl}/api/v1/auth/oauth/state`,
          body: { provider: "google", state, intent: "signup" }
        });

        const exchange = await httpJson({
          url: `${server.baseUrl}/api/v1/auth/oauth/exchange`,
          body: {
            provider: "google",
            clientId: "google-client-id",
            code: "code-google-link",
            codeVerifier: "verifier-google-link",
            redirectUri: "fitnessapp://oauth",
            state
          }
        });

        assert.equal(exchange.status, 200);
        assert.equal(exchange.json?.data?.user?.id, existingUser.id);

        const identity = (
          await database
            .select({ providerUserId: userOauthIdentities.providerUserId })
            .from(userOauthIdentities)
            .where(eq(userOauthIdentities.userId, existingUser.id))
            .limit(1)
        )[0];
        assert.ok(identity);
      } finally {
        globalThis.fetch = originalFetch;
        await server.close();
      }
    }
  },
  {
    name: "OAuth: Unverified provider email does not link to existing email user",
    run: async () => {
      resetEnvForTests();
      process.env.USE_PGLITE_DEV = "true";
      process.env.GOOGLE_OAUTH_CLIENT_ID = "google-client-id";
      process.env.GOOGLE_OAUTH_CLIENT_SECRET = "google-secret";
      process.env.GOOGLE_OAUTH_REDIRECT_URIS = "fitnessapp://oauth";
      process.env.FACEBOOK_OAUTH_CLIENT_ID = "fb-app-id";
      process.env.FACEBOOK_OAUTH_CLIENT_SECRET = "fb-secret";
      process.env.FACEBOOK_OAUTH_REDIRECT_URIS = "fitnessapp://oauth";

      const { privateKey, jwk, kid } = await getGoogleTestMaterial();

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

        if (url === "https://www.googleapis.com/oauth2/v3/certs") {
          return new Response(JSON.stringify({ keys: [jwk] }), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        if (url === "https://oauth2.googleapis.com/token") {
          const idToken = await createGoogleIdToken({
            privateKey,
            kid,
            clientId: "google-client-id",
            sub: "google-user-unverified-1",
            email: TEST_USER_EMAIL,
            emailVerified: false
          });

          return new Response(JSON.stringify({ access_token: "ga", id_token: idToken, token_type: "Bearer", expires_in: 3600 }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        return new Response(JSON.stringify({ error: "unexpected_fetch", url }), { status: 500 });
      }) as typeof fetch;

      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client);
      const database = createPgliteDatabase(client);
      const server = await startHttpServer(database);

      try {
        const state = "state-google-unverified-123456";
        await httpJson({
          url: `${server.baseUrl}/api/v1/auth/oauth/state`,
          body: { provider: "google", state, intent: "signin" }
        });

        const exchange = await httpJson({
          url: `${server.baseUrl}/api/v1/auth/oauth/exchange`,
          body: {
            provider: "google",
            clientId: "google-client-id",
            code: "code-google-unverified",
            codeVerifier: "verifier-google-unverified",
            redirectUri: "fitnessapp://oauth",
            state
          }
        });

        assert.equal(exchange.status, 400);
        assert.equal(exchange.json?.error?.code, "VALIDATION_ERROR");

        const linkedIdentity = (
          await database
            .select({ userId: userOauthIdentities.userId })
            .from(userOauthIdentities)
            .limit(1)
        )[0];
        assert.equal(linkedIdentity, undefined);
      } finally {
        globalThis.fetch = originalFetch;
        await server.close();
      }
    }
  },
  {
    name: "OAuth: Facebook callback creates a new user",
    run: async () => {
      resetEnvForTests();
      process.env.USE_PGLITE_DEV = "true";
      process.env.GOOGLE_OAUTH_CLIENT_ID = "google-client-id";
      process.env.GOOGLE_OAUTH_REDIRECT_URIS = "fitnessapp://oauth";
      process.env.FACEBOOK_OAUTH_CLIENT_ID = "fb-app-id";
      process.env.FACEBOOK_OAUTH_CLIENT_SECRET = "fb-secret";
      process.env.FACEBOOK_OAUTH_REDIRECT_URIS = "fitnessapp://oauth";

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

        if (url.startsWith("https://graph.facebook.com/v20.0/oauth/access_token")) {
          return new Response(JSON.stringify({ access_token: "fb-access-token", token_type: "bearer", expires_in: 3600 }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (url.startsWith("https://graph.facebook.com/debug_token")) {
          return new Response(JSON.stringify({ data: { app_id: "fb-app-id", is_valid: true, user_id: "fb-user-1" } }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (url.startsWith("https://graph.facebook.com/me")) {
          return new Response(
            JSON.stringify({
              id: "fb-user-1",
              name: "Facebook User",
              email: "new-fb@example.com",
              picture: { data: { url: "https://example.com/fb.png" } }
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ error: "unexpected_fetch", url }), { status: 500 });
      }) as typeof fetch;

      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client);
      const database = createPgliteDatabase(client);
      const server = await startHttpServer(database);

      try {
        const state = "state-fb-new-123456";
        const register = await httpJson({
          url: `${server.baseUrl}/api/v1/auth/oauth/state`,
          body: { provider: "facebook", state, intent: "signin" }
        });
        assert.equal(register.status, 200);

        const exchange = await httpJson({
          url: `${server.baseUrl}/api/v1/auth/oauth/exchange`,
          body: {
            provider: "facebook",
            clientId: "fb-app-id",
            code: "fb-code-1",
            codeVerifier: "fb-verifier-1",
            redirectUri: "fitnessapp://oauth",
            state
          }
        });

        assert.equal(exchange.status, 200);
        assert.ok(exchange.json?.data?.token);
        assert.equal(exchange.json?.data?.user?.email, "new-fb@example.com");
      } finally {
        globalThis.fetch = originalFetch;
        await server.close();
      }
    }
  },
  {
    name: "OAuth: Facebook does not link by email when email is unverified",
    run: async () => {
      resetEnvForTests();
      process.env.USE_PGLITE_DEV = "true";
      process.env.GOOGLE_OAUTH_CLIENT_ID = "google-client-id";
      process.env.GOOGLE_OAUTH_REDIRECT_URIS = "fitnessapp://oauth";
      process.env.FACEBOOK_OAUTH_CLIENT_ID = "fb-app-id";
      process.env.FACEBOOK_OAUTH_CLIENT_SECRET = "fb-secret";
      process.env.FACEBOOK_OAUTH_REDIRECT_URIS = "fitnessapp://oauth";

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

        if (url.startsWith("https://graph.facebook.com/v20.0/oauth/access_token")) {
          return new Response(JSON.stringify({ access_token: "fb-access-token", token_type: "bearer", expires_in: 3600 }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (url.startsWith("https://graph.facebook.com/debug_token")) {
          return new Response(JSON.stringify({ data: { app_id: "fb-app-id", is_valid: true, user_id: "fb-user-existing-email" } }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (url.startsWith("https://graph.facebook.com/me")) {
          return new Response(
            JSON.stringify({
              id: "fb-user-existing-email",
              name: "Facebook User",
              email: TEST_USER_EMAIL,
              picture: { data: { url: "https://example.com/fb.png" } }
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ error: "unexpected_fetch", url }), { status: 500 });
      }) as typeof fetch;

      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client);
      const database = createPgliteDatabase(client);
      const server = await startHttpServer(database);

      try {
        const state = "state-fb-existing-email-123456";
        await httpJson({
          url: `${server.baseUrl}/api/v1/auth/oauth/state`,
          body: { provider: "facebook", state, intent: "signin" }
        });

        const exchange = await httpJson({
          url: `${server.baseUrl}/api/v1/auth/oauth/exchange`,
          body: {
            provider: "facebook",
            clientId: "fb-app-id",
            code: "fb-code-existing-email",
            codeVerifier: "fb-verifier-existing-email",
            redirectUri: "fitnessapp://oauth",
            state
          }
        });

        assert.equal(exchange.status, 400);
        assert.equal(exchange.json?.error?.code, "VALIDATION_ERROR");

        const identityCount = (await database.select({ id: userOauthIdentities.id }).from(userOauthIdentities)).length;
        assert.equal(identityCount, 0);
      } finally {
        globalThis.fetch = originalFetch;
        await server.close();
      }
    }
  },
  {
    name: "OAuth: missing provider email fails clearly",
    run: async () => {
      resetEnvForTests();
      process.env.USE_PGLITE_DEV = "true";
      process.env.GOOGLE_OAUTH_CLIENT_ID = "google-client-id";
      process.env.GOOGLE_OAUTH_CLIENT_SECRET = "google-secret";
      process.env.GOOGLE_OAUTH_REDIRECT_URIS = "fitnessapp://oauth";
      process.env.FACEBOOK_OAUTH_CLIENT_ID = "fb-app-id";
      process.env.FACEBOOK_OAUTH_CLIENT_SECRET = "fb-secret";
      process.env.FACEBOOK_OAUTH_REDIRECT_URIS = "fitnessapp://oauth";

      const { privateKey, jwk, kid } = await getGoogleTestMaterial();

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

        if (url === "https://www.googleapis.com/oauth2/v3/certs") {
          return new Response(JSON.stringify({ keys: [jwk] }), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        if (url === "https://oauth2.googleapis.com/token") {
          const idToken = await createGoogleIdToken({
            privateKey,
            kid,
            clientId: "google-client-id",
            sub: "google-user-no-email"
          });

          return new Response(JSON.stringify({ access_token: "ga", id_token: idToken, token_type: "Bearer", expires_in: 3600 }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        return new Response(JSON.stringify({ error: "unexpected_fetch", url }), { status: 500 });
      }) as typeof fetch;

      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client);
      const database = createPgliteDatabase(client);
      const server = await startHttpServer(database);

      try {
        const state = "state-google-no-email-123456";
        await httpJson({
          url: `${server.baseUrl}/api/v1/auth/oauth/state`,
          body: { provider: "google", state, intent: "signin" }
        });

        const exchange = await httpJson({
          url: `${server.baseUrl}/api/v1/auth/oauth/exchange`,
          body: {
            provider: "google",
            clientId: "google-client-id",
            code: "code-google-no-email",
            codeVerifier: "verifier-google-no-email",
            redirectUri: "fitnessapp://oauth",
            state
          }
        });

        assert.equal(exchange.status, 400);
        assert.equal(exchange.json?.error?.code, "VALIDATION_ERROR");
      } finally {
        globalThis.fetch = originalFetch;
        await server.close();
      }
    }
  }
];
