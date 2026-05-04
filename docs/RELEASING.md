# Releasing / Versioning

This repo supports a repeatable application version + release notes workflow.

## Source of truth

- App version is sourced from the **repo root** `package.json` `version`.
- The Expo config in `apps/mobile/app.config.js` injects that version into the app at build time.
- Release notes live in `apps/mobile/src/core/release-notes/release-notes.json`.

## Release steps

1. Update the app version (repo root) and create a release notes stub automatically:

   ```bash
   npm run release -- patch
   # or: npm run release -- minor
   # or: npm run release -- major
   ```

   Notes:
   - This updates `package.json` and prepends a new entry to `apps/mobile/src/core/release-notes/release-notes.json`.
   - If you prefer tags to be created automatically, you can still use `npm version patch/minor/major` instead of `npm run release`.

2. Fill in release notes for the new version:

   - Edit `apps/mobile/src/core/release-notes/release-notes.json`
   - Add at least one item under Added/Changed/Fixed (or adjust sections as needed)

3. Validate locally:

   ```bash
   npm run validate:release-notes
   npm run typecheck
   npm run test --workspace @fitness/mobile
   npm run test --workspace @fitness/api
   npm run build:mobile:web
   ```

4. Commit and push:

   - Commit the version bump + release notes
   - Push to the appropriate branch (`develop` for staging, `main` for production)

## CI/CD validation

GitHub Actions runs `npm run validate:release-notes` during deploy workflows to ensure:

- the repo root `package.json` version can be resolved
- a matching release notes entry exists for that version
