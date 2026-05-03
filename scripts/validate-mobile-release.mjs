import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mobileDir = path.join(repoRoot, "apps", "mobile");
const easJsonPath = path.join(mobileDir, "eas.json");
const appConfigPath = path.join(mobileDir, "app.config.js");

function fail(message) {
  console.error(`[validate:mobile:release] ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`[validate:mobile:release] ${message}`);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isSemverLike(value) {
  return typeof value === "string" && /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(value);
}

function looksLikeReverseDns(value) {
  if (!isNonEmptyString(value)) return false;
  if (!value.includes(".")) return false;
  return /^[A-Za-z0-9.-]+$/.test(value);
}

function looksLikeAndroidPackage(value) {
  if (!isNonEmptyString(value)) return false;
  if (!value.includes(".")) return false;
  // Conservative: enforce lowercase Java-style package names for Play.
  return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(value);
}

function resolveLocalPath(inputPath) {
  if (!isNonEmptyString(inputPath)) return null;
  if (path.isAbsolute(inputPath)) return inputPath;
  return path.resolve(mobileDir, inputPath);
}

function validateHttpsApiBaseUrl(apiBaseUrl, { allowLocalhost } = {}) {
  if (!isNonEmptyString(apiBaseUrl)) {
    fail("Missing API base URL. Set EXPO_PUBLIC_API_BASE_URL (https://.../api/v1).");
    return;
  }

  let parsed;
  try {
    parsed = new URL(apiBaseUrl);
  } catch {
    fail(`Invalid EXPO_PUBLIC_API_BASE_URL: ${apiBaseUrl}`);
    return;
  }

  if (parsed.protocol !== "https:" && !(allowLocalhost && parsed.protocol === "http:")) {
    fail(`EXPO_PUBLIC_API_BASE_URL must be https (or http only with --allow-localhost): ${apiBaseUrl}`);
    return;
  }

  if (!allowLocalhost && ["localhost", "127.0.0.1", "10.0.2.2"].includes(parsed.hostname)) {
    fail(`EXPO_PUBLIC_API_BASE_URL must not point to localhost for release builds: ${apiBaseUrl}`);
    return;
  }

  const normalizedPath = parsed.pathname.replace(/\/+$/, "");
  if (!normalizedPath.endsWith("/api/v1")) {
    fail(`EXPO_PUBLIC_API_BASE_URL path must end in /api/v1: ${apiBaseUrl}`);
  }
}

function main() {
  const allowLocalhost = process.argv.includes("--allow-localhost");

  if (!fs.existsSync(mobileDir)) {
    fail(`Missing mobile workspace at ${mobileDir}`);
    return;
  }

  if (!fs.existsSync(appConfigPath)) {
    fail(`Missing Expo config: ${appConfigPath}`);
    return;
  }

  const require = createRequire(import.meta.url);
  const configFactory = require(appConfigPath);
  const config = typeof configFactory === "function" ? configFactory() : configFactory;

  if (!config || typeof config !== "object") {
    fail("Expo config did not resolve to an object.");
    return;
  }

  if (!isNonEmptyString(config.name)) fail("Missing Expo app name (`expo.name`).");
  if (!isNonEmptyString(config.slug)) fail("Missing Expo slug (`expo.slug`).");
  if (!isNonEmptyString(config.scheme)) fail("Missing deep link scheme (`expo.scheme`).");
  if (!isSemverLike(config.version)) fail("Missing/invalid Expo version (`expo.version`). Expected 0.0.0.");

  const iosBundleId = config.ios?.bundleIdentifier;
  if (!looksLikeReverseDns(iosBundleId)) {
    fail("Missing/invalid iOS bundle identifier (`expo.ios.bundleIdentifier`).");
  }

  const androidPackage = config.android?.package;
  if (!looksLikeAndroidPackage(androidPackage)) {
    fail("Missing/invalid Android package (`expo.android.package`). Expected lowercase reverse-DNS.");
  }

  const iconPath = resolveLocalPath(config.icon);
  if (!iconPath || !fs.existsSync(iconPath)) {
    fail("Missing app icon file (`expo.icon`).");
  }

  const splashImage = config.splash?.image;
  const splashPath = resolveLocalPath(splashImage);
  if (!splashPath || !fs.existsSync(splashPath)) {
    fail("Missing splash image file (`expo.splash.image`).");
  }

  const adaptiveForeground = config.android?.adaptiveIcon?.foregroundImage;
  const adaptivePath = resolveLocalPath(adaptiveForeground);
  if (!adaptivePath || !fs.existsSync(adaptivePath)) {
    fail("Missing Android adaptive icon foreground (`expo.android.adaptiveIcon.foregroundImage`).");
  }

  const apiBaseUrl =
    config.extra?.apiBaseUrl ??
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    process.env.EXPO_PUBLIC_API_URL;
  validateHttpsApiBaseUrl(apiBaseUrl, { allowLocalhost });

  if (!fs.existsSync(easJsonPath)) {
    fail(`Missing EAS config: ${easJsonPath}`);
  } else {
    const easJson = JSON.parse(fs.readFileSync(easJsonPath, "utf8"));
    const profiles = easJson?.build ?? {};
    for (const profileName of ["development", "preview", "production"]) {
      if (!profiles[profileName]) {
        fail(`Missing EAS build profile: build.${profileName}`);
      }
    }
  }

  if (process.exitCode === 1) {
    console.error(
      "[validate:mobile:release] FAILED. Fix the above issues, then rerun `npm run validate:mobile:release`."
    );
    return;
  }

  ok("Expo config resolves.");
  ok("Bundle/package identifiers present.");
  ok("Version is set.");
  ok("API base URL configured.");
  ok("EAS profiles present.");
  ok("PASS");
}

main();

