# Releasing / Versioning

This repo supports a repeatable application version + release notes workflow.

## Source of truth

- App version is sourced from the **repo root** `package.json` `version`.
- The Expo config in `apps/mobile/app.config.js` injects that version into the app at build time.
- Release notes live in `apps/mobile/src/core/release-notes/release-notes.json`.

## Release steps

1. Update the app version (repo root):

   ```bash
   npm version patch
   # or: npm version minor
   # or: npm version major
   ```

   Notes:
   - `npm version` updates `package.json` and creates a git tag by default.
   - To avoid creating a git tag, use `npm version patch --no-git-tag-version`.

2. Add release notes for the new version:

   - Edit `apps/mobile/src/core/release-notes/release-notes.json`
   - Add a new entry at the top for the version you just set
   - Include a `date` (recommended) and categorized sections (Added/Changed/Fixed/etc.)

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

