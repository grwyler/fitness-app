# Stride Fitness Android

Trusted Web Activity wrapper for the production PWA at `https://stridefitness.app`.

## Permanent identity

- Application ID: `app.stridefitness`
- Version name: `1.0.0`
- Version code: `1`
- Target / compile SDK: Android 16, API 36
- Minimum SDK: API 23
- TWA tooling: Bubblewrap 1.25.0 / Android Browser Helper 2.6.2
- Build tooling: Android Gradle Plugin 9.4.0, Gradle 9.6.0, JDK 17

## Signing

The repository intentionally contains no keystore, key password, or signing
password. Use Google Play App Signing. Create and securely retain a separate
upload key named `upload-keystore.jks` with alias `stride-upload`; never commit
it. The production Digital Asset Links endpoint accepts comma-separated
upload-key and Play App Signing SHA-256 fingerprints through the hosted
`ANDROID_ASSETLINKS_SHA256_FINGERPRINTS` value.

The Play App Signing fingerprint must be added after the first bundle is
uploaded and Play App Signing is enabled. Keep the upload-key fingerprint too
for direct/local test installs.

Run `build-release.ps1` from a local terminal to create or reuse the upload
keystore and build the signed release bundle and APK. The script prompts for
passwords without echoing them, passes them to Java and Gradle only through
process-scoped environment variables, and clears those variables when the
build finishes. Store the passwords and a backup of the keystore in a password
manager or other secure backup; losing the upload key requires a Play Console
upload-key reset.

## Updates

Normal Stride web features, UI, AI Coach behavior, exercise data, goals, and
other PWA changes update automatically without a new Play release. A new
Android release is needed for package metadata, icons or splash resources,
native permissions or integrations, TWA wrapper behavior/dependencies,
versioning, signing changes, or changes to the wrapped production origin.
