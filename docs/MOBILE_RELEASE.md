# Mobile beta distribution (EAS)

This repo supports internal beta distribution via **Expo Application Services (EAS)**:

- iOS: TestFlight (App Store Connect)
- Android: Play Console (Internal testing)

The Expo project lives in `apps/mobile` and uses:

- `apps/mobile/app.config.js` (loads env + returns Expo config)
- `apps/mobile/app.json` (base Expo config)
- `apps/mobile/eas.json` (EAS build profiles)

## Prerequisites (external)

- Install EAS CLI and log in:
  - `npm i -g eas-cli`
  - `eas login`
- iOS (TestFlight):
  - Apple Developer account + App Store Connect access
  - An App Store Connect app created for the bundle identifier in `apps/mobile/app.json`
- Android (Play internal testing):
  - Google Play Console access
  - An app created for the package name in `apps/mobile/app.json`

## Required environment variables

The mobile app reads runtime config from **public Expo env vars** (no secrets):

- `EXPO_PUBLIC_API_BASE_URL` (required): `https://YOUR_API_HOST/api/v1`
- `EXPO_PUBLIC_SENTRY_DSN` (optional)
- `EXPO_PUBLIC_SENTRY_ENVIRONMENT` (set by `apps/mobile/eas.json`, can override)
- `EXPO_PUBLIC_SENTRY_RELEASE` (optional)
- `EXPO_PUBLIC_OBSERVABILITY_ENABLED` (set by `apps/mobile/eas.json`, can override)

Recommended: set these as **EAS environment variables** (per build profile) in the Expo project settings, not in git.

### Sentry sourcemaps (external)

Runtime error reporting uses `@sentry/react-native`. If you want sourcemaps uploaded for native builds, configure Sentry credentials as **secrets** (do not commit):

- `SENTRY_AUTH_TOKEN` (secret)
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_URL` (optional, only if you use a self-hosted Sentry)
- `SENTRY_RELEASE` (optional; if unset, Sentry can infer a release)

## Validation (before building)

From the repo root:

```powershell
npm run validate:mobile:release
```

Notes:

- The validator loads `apps/mobile/app.config.js`, so ensure `EXPO_PUBLIC_API_BASE_URL` is available via `apps/mobile/.env.local`, repo `.env.local`, or your shell env.
- To allow a localhost API during local-only checks: `npm run validate:mobile:release -- --allow-localhost`

## Create a preview build (internal distribution)

Preview builds use the `preview` profile from `apps/mobile/eas.json`:

```powershell
npm run eas:build:preview
```

This builds:

- iOS `.ipa` for internal distribution
- Android `.apk` for internal distribution

## Submit to TestFlight (App Store Connect)

Production iOS builds use the `production` profile:

```powershell
npm run eas:build:ios
npm run eas:submit:ios
```

If this is your first time submitting:

- confirm the bundle identifier in `apps/mobile/app.json` matches your App Store Connect app
- complete EAS credentials prompts (`eas credentials`) when asked

## Submit to Play internal testing (Google Play Console)

Production Android builds use the `production` profile (AAB):

```powershell
npm run eas:build:android
npm run eas:submit:android
```

If this is your first time submitting:

- confirm the package name in `apps/mobile/app.json` matches your Play Console app
- configure Play credentials when prompted by EAS

