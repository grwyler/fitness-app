import { URL } from "node:url";
import { getRepoRootFromScriptUrl, parseArgs, readDotEnvFile } from "./_lib.mjs";

function requireString(name, value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value.trim();
}

function inferApiBaseUrlFromLocalEnv(repoRoot) {
  try {
    const vars = readDotEnvFile(`${repoRoot}/.env.web.staging`);
    const value = vars.EXPO_PUBLIC_API_BASE_URL;
    return typeof value === "string" && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

function toOrigin(inputUrl) {
  const url = new URL(inputUrl);
  return url.origin;
}

function stripApiV1(input) {
  return input.replace(/\/api\/v1\/?$/i, "");
}

async function fetchText(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  return { response, text };
}

async function main() {
  const repoRoot = getRepoRootFromScriptUrl(import.meta.url);
  const args = parseArgs(process.argv.slice(2));

  const webUrl = requireString("`--web-url`", (typeof args["web-url"] === "string" ? args["web-url"] : "https://setwisefit-test.vercel.app/"));
  const webOrigin = toOrigin(webUrl);

  const explicitApiBaseUrl = typeof args["api-base-url"] === "string" ? args["api-base-url"] : null;
  const inferredApiBaseUrl = explicitApiBaseUrl ?? inferApiBaseUrlFromLocalEnv(repoRoot);
  const apiBaseUrl = requireString("`--api-base-url` (or `.env.web.staging` EXPO_PUBLIC_API_BASE_URL)", inferredApiBaseUrl);
  const apiOrigin = stripApiV1(apiBaseUrl);

  console.log("Staging smoke check:");
  console.log(`- web: ${webOrigin}`);
  console.log(`- apiBaseUrl: ${apiBaseUrl}`);

  // 1) Web root
  {
    const { response, text } = await fetchText(webUrl, { redirect: "manual" });
    if (response.status >= 400) {
      const looksLikeVercelAuth = response.status === 401 && /Authentication Required/i.test(text) && /Vercel Authentication/i.test(text);
      if (looksLikeVercelAuth) {
        throw new Error(`Web root is protected by Vercel Authentication (${response.status}). Disable Deployment Protection for previews or use a bypass token.`);
      }
      throw new Error(`Web root returned ${response.status}.`);
    }
    if (!/<title>Fitness App<\/title>/i.test(text)) {
      console.warn("Warning: web root HTML did not include expected <title>Fitness App</title> marker.");
    }
    console.log(`OK web root: ${response.status}`);
  }

  // 2) API health
  {
    const healthUrl = `${apiOrigin}/health`;
    const { response, text } = await fetchText(healthUrl, { redirect: "manual" });
    if (response.status >= 400) {
      throw new Error(`API /health returned ${response.status}. Body: ${text.slice(0, 200)}`);
    }
    console.log(`OK api health: ${response.status}`);
  }

  // 3) CORS preflight (web -> api)
  {
    const url = `${apiOrigin}/api/v1/auth/signin`;
    const response = await fetch(url, {
      method: "OPTIONS",
      headers: {
        Origin: webOrigin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type"
      }
    });

    const allowOrigin = response.headers.get("access-control-allow-origin");
    if (response.status >= 400) {
      throw new Error(`CORS preflight returned ${response.status} (expected < 400).`);
    }
    if (allowOrigin !== webOrigin) {
      throw new Error(
        `CORS preflight did not allow origin. Expected access-control-allow-origin=${webOrigin}, got ${allowOrigin ?? "(missing)"}`
      );
    }

    console.log("OK CORS preflight");
  }

  console.log("OK staging smoke check passed.");
}

await main();
