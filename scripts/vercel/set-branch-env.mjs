import { readFileSync } from "node:fs";
import {
  spawnVercelSync,
  getRepoRootFromScriptUrl,
  looksSensitiveKey,
  parseArgs,
  readLocalVercelConfig,
  requireNonEmpty,
  resolveProjectConfig
} from "./_lib.mjs";

function usageAndExit() {
  console.error(
    [
      "Usage:",
      "  node scripts/vercel/set-branch-env.mjs --project api --branch develop --env preview --var KEY=value",
      "",
      "Examples:",
      "  node scripts/vercel/set-branch-env.mjs --project api --var EMAIL_PROVIDER=resend",
      "  node scripts/vercel/set-branch-env.mjs --project api --var JWT_SECRET --value-from-stdin",
      "  node scripts/vercel/set-branch-env.mjs --project web --env production --var EXPO_PUBLIC_API_BASE_URL=https://...",
      "",
      "Notes:",
      "- Secrets: prefer `--var KEY` + `--value-from-stdin` and pipe the value via stdin, or use `push-staging-env.mjs` with a local ignored env file.",
      "- This script targets Vercel CLI and never prints secret values."
    ].join("\n")
  );
  process.exit(1);
}

function normalizeVarSpec(spec) {
  const equalsIndex = spec.indexOf("=");
  if (equalsIndex === -1) {
    return { key: spec.trim(), value: null };
  }
  const key = spec.slice(0, equalsIndex).trim();
  const value = spec.slice(equalsIndex + 1);
  return { key, value };
}

function spawnVercelWithInput({ args, value, extraEnv, cwd }) {
  const child = spawnVercelSync(args, {
    input: value,
    encoding: "utf8",
    stdio: ["pipe", "inherit", "inherit"],
    env: { ...process.env, ...(extraEnv ?? {}) },
    cwd
  });

  return child;
}

function main() {
  const repoRoot = getRepoRootFromScriptUrl(import.meta.url);
  const args = parseArgs(process.argv.slice(2));

  const project = typeof args.project === "string" ? args.project : null;
  if (!project) {
    usageAndExit();
  }

  const branch = typeof args.branch === "string" ? args.branch : "develop";
  const environment = typeof args.env === "string" ? args.env : "preview";

  const varSpecsRaw = args.var;
  const varSpecs = Array.isArray(varSpecsRaw) ? varSpecsRaw : typeof varSpecsRaw === "string" ? [varSpecsRaw] : [];
  if (varSpecs.length === 0) {
    usageAndExit();
  }

  const readFromStdin = Boolean(args["value-from-stdin"]);

  const vercelProbe = spawnVercelSync(["--version"], { stdio: "ignore" });
  if (vercelProbe.error) {
    throw new Error("Vercel CLI not found. Install it with `npm i -g vercel` and run `vercel login`.");
  }

  const projectConfig = resolveProjectConfig({ repoRoot, project });
  const localVercel = readLocalVercelConfig(repoRoot);

  const scope = process.env.VERCEL_SCOPE ?? localVercel.VERCEL_SCOPE;
  const token = process.env.VERCEL_TOKEN ?? localVercel.VERCEL_TOKEN;
  const extraEnv = {
    ...(token ? { VERCEL_TOKEN: token } : {})
  };

  /** @type {Array<{key: string, value: string | null}>} */
  const varSpecsParsed = varSpecs.map(normalizeVarSpec);
  for (const spec of varSpecsParsed) {
    if (!spec.key) {
      throw new Error(`Invalid --var value: ${spec}`);
    }
    if (spec.value !== null && looksSensitiveKey(spec.key)) {
      console.warn(
        `Warning: ${spec.key} looks sensitive. Prefer piping the value via stdin, or store it in an ignored env file and use push-staging-env.mjs.`
      );
    }
  }

  for (const { key, value } of varSpecsParsed) {
    let resolvedValue = value;
    if (resolvedValue === null) {
      if (!readFromStdin) {
        throw new Error(`--var ${key} requires a value. Use --var ${key}=VALUE or --value-from-stdin with piping.`);
      }
      if (varSpecsParsed.length !== 1) {
        throw new Error("--value-from-stdin only supports setting one variable at a time.");
      }
      resolvedValue = requireNonEmpty(key, readFileFromStdin());
    }

    const globalArgs = [
      ...(scope ? ["--scope", scope] : []),
      ...(token ? ["--token", token] : [])
    ];

    const sensitiveArgs = looksSensitiveKey(key) ? ["--sensitive"] : [];

    const includeBranch = environment === "preview";
    const updateArgs = [
      "env",
      "update",
      key,
      environment,
      ...(includeBranch ? [branch] : []),
      "--yes",
      ...sensitiveArgs,
      ...globalArgs
    ];
    const addArgs = [
      "env",
      "add",
      key,
      environment,
      ...(includeBranch ? [branch] : []),
      ...sensitiveArgs,
      ...globalArgs
    ];

    const updateResult = spawnVercelWithInput({
      args: updateArgs,
      value: resolvedValue,
      extraEnv: { ...extraEnv },
      cwd: projectConfig.cwd
    });
    if (updateResult.status === 0) {
      continue;
    }

    const addResult = spawnVercelWithInput({
      args: addArgs,
      value: resolvedValue,
      extraEnv: { ...extraEnv },
      cwd: projectConfig.cwd
    });
    if (addResult.status !== 0) {
      throw new Error(`Failed to add/update ${key} for ${projectConfig.label} (${environment}/${branch}).`);
    }
  }
}

function readFileFromStdin() {
  // Read entire stdin synchronously (best for piping secrets).
  return readFileSync(0, "utf8").trimEnd();
}

main();
