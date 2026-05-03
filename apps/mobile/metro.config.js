// Metro config used by `expo export` / `expo start`.
//
// Some environments restrict process spawning and can fail when Metro uses multiple workers.
// Set `METRO_MAX_WORKERS=1` to force a single-worker build when needed.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const maxWorkersRaw = process.env.METRO_MAX_WORKERS;
if (maxWorkersRaw) {
  const parsed = Number(maxWorkersRaw);
  if (Number.isFinite(parsed) && parsed > 0) {
    config.maxWorkers = parsed;
  }
}

module.exports = config;

