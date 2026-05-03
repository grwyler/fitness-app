import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

function findRepoNpmCacheDir(startDir) {
  let current = resolve(startDir);
  for (let i = 0; i < 6; i += 1) {
    const candidate = resolve(current, ".npm-cache");
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return null;
}

export function isWindows() {
  return process.platform === "win32";
}

function resolveCmdExe() {
  const comspec = process.env.ComSpec;
  if (typeof comspec === "string" && comspec.trim()) {
    return comspec.trim();
  }

  const system32 = "C:\\\\Windows\\\\System32\\\\cmd.exe";
  if (existsSync(system32)) {
    return system32;
  }

  const system32Upper = "C:\\\\WINDOWS\\\\system32\\\\cmd.exe";
  if (existsSync(system32Upper)) {
    return system32Upper;
  }

  return "cmd.exe";
}

export function commandExists(command) {
  const result = isWindows()
    ? spawnSync("where", [command], { stdio: "ignore" })
    : spawnSync("sh", ["-lc", `command -v ${command}`], { stdio: "ignore" });
  return result.status === 0;
}

let cachedVercelCli = null;
export function resolveVercelCli() {
  if (cachedVercelCli) {
    return cachedVercelCli;
  }

  if (!isWindows()) {
    cachedVercelCli = { command: "vercel", argsPrefix: [] };
    return cachedVercelCli;
  }

  // Prefer vercel.cmd for Node spawnSync on Windows.
  const cmdLookup = spawnSync("where", ["vercel.cmd"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  if (cmdLookup.status === 0) {
    const first = (cmdLookup.stdout ?? "").split(/\r?\n/).find(Boolean);
    if (first) {
      const resolved = first.trim();
      // .cmd is not directly executable via CreateProcess; use cmd.exe wrapper.
      cachedVercelCli = { command: resolveCmdExe(), argsPrefix: ["/d", "/s", "/c", resolved] };
      return cachedVercelCli;
    }
  }

  // Fallback: PowerShell shim (vercel.ps1) is common for global installs.
  const lookup = spawnSync("where", ["vercel"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  if (lookup.status === 0) {
    const first = (lookup.stdout ?? "").split(/\r?\n/).find(Boolean);
    if (first) {
      const resolved = first.trim();
      if (/\.ps1$/i.test(resolved)) {
        cachedVercelCli = {
          command: "powershell",
          argsPrefix: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", resolved]
        };
        return cachedVercelCli;
      }
      if (/\.cmd$/i.test(resolved) || /\.bat$/i.test(resolved)) {
        cachedVercelCli = { command: resolveCmdExe(), argsPrefix: ["/d", "/s", "/c", resolved] };
        return cachedVercelCli;
      }
      cachedVercelCli = { command: resolved, argsPrefix: [] };
      return cachedVercelCli;
    }
  }

  cachedVercelCli = { command: "vercel", argsPrefix: [] };

  // Final fallback: use `npx vercel` when Vercel CLI isn't installed globally.
  // This keeps local scripts aligned with the GitHub Actions workflows that also use npx.
  if (isWindows()) {
    const npxLookup = spawnSync("where", ["npx.cmd"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    if (npxLookup.status === 0) {
      const first = (npxLookup.stdout ?? "").split(/\r?\n/).find(Boolean);
      if (first) {
        const resolvedNpx = first.trim();
        cachedVercelCli = { command: resolveCmdExe(), argsPrefix: ["/d", "/s", "/c", resolvedNpx, "vercel"] };
        return cachedVercelCli;
      }
    }
  }

  return cachedVercelCli;
}

export function spawnVercelSync(args, options = {}) {
  const { command, argsPrefix } = resolveVercelCli();

  const cwd = options.cwd ?? process.cwd();
  const npmCacheDir = findRepoNpmCacheDir(cwd);
  const envWithCache =
    npmCacheDir && !process.env.npm_config_cache
      ? { ...process.env, ...(options.env ?? {}), npm_config_cache: npmCacheDir }
      : { ...process.env, ...(options.env ?? {}) };

  return spawnSync(command, [...argsPrefix, ...args], { ...options, env: envWithCache });
}

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "inherit",
    ...options
  });

  if (result.error) {
    throw result.error;
  }
  if (typeof result.status === "number" && result.status !== 0) {
    const joined = [command, ...args].join(" ");
    throw new Error(`Command failed (${result.status}): ${joined}`);
  }

  return result;
}

export function runCapture(command, args, options = {}) {
  const stdio =
    options.stdio ??
    (Object.prototype.hasOwnProperty.call(options, "input")
      ? ["pipe", "pipe", "pipe"]
      : ["ignore", "pipe", "pipe"]);
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio,
    ...options
  });

  if (result.error) {
    throw result.error;
  }
  if (typeof result.status === "number" && result.status !== 0) {
    const joined = [command, ...args].join(" ");
    const stdout = (result.stdout ?? "").trim();
    const stderr = (result.stderr ?? "").trim();
    const extra = [stdout && `stdout: ${stdout}`, stderr && `stderr: ${stderr}`].filter(Boolean).join("\n");
    throw new Error(`Command failed (${result.status}): ${joined}${extra ? `\n${extra}` : ""}`);
  }

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

export function parseDotEnv(contents) {
  /** @type {Record<string, string>} */
  const output = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (!key) {
      continue;
    }

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    output[key] = value;
  }

  return output;
}

export function readDotEnvFile(filePath) {
  const resolvedPath = resolve(filePath);
  if (!existsSync(resolvedPath)) {
    throw new Error(`Env file not found: ${resolvedPath}`);
  }
  return parseDotEnv(readFileSync(resolvedPath, "utf8"));
}

export function readLocalVercelConfig(repoRoot) {
  const candidate = resolve(repoRoot, ".env.vercel.local");
  if (!existsSync(candidate)) {
    return {};
  }
  return readDotEnvFile(candidate);
}

export function looksSensitiveKey(name) {
  return /SECRET|TOKEN|PASSWORD|API_KEY|DATABASE_URL|PRIVATE|KEY/i.test(name);
}

export function requireNonEmpty(name, value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value.trim();
}

export function resolveProjectConfig({ repoRoot, project }) {
  if (project === "api") {
    return {
      label: "api",
      cwd: resolve(repoRoot, "apps", "api"),
      // Use the repository-level config so `vercel build --local-config` produces a correct
      // prebuilt serverless output (builds + routes) with bundled dependencies.
      localConfig: resolve(repoRoot, "vercel.api.json"),
      envFile: resolve(repoRoot, ".env.api.staging")
    };
  }

  if (project === "web") {
    return {
      label: "web",
      cwd: resolve(repoRoot, "apps", "mobile"),
      localConfig: resolve(repoRoot, "apps", "mobile", "vercel.json"),
      envFile: resolve(repoRoot, ".env.web.staging")
    };
  }

  throw new Error(`Unknown --project value: ${project}`);
}

export function getRepoRootFromScriptUrl(importMetaUrl) {
  const url = new URL(importMetaUrl);
  const scriptPath = isWindows() ? url.pathname.slice(1) : url.pathname;
  const normalized = decodeURIComponent(scriptPath);
  // scripts/vercel/<file>.mjs -> repo root is 2 directories up
  return resolve(normalized, "..", "..", "..");
}

export function parseArgs(argv) {
  /** @type {Record<string, string | boolean | string[]>} */
  const parsed = { _: [] };
  let i = 0;

  while (i < argv.length) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      parsed._.push(token);
      i += 1;
      continue;
    }

    const name = token.slice(2);
    const next = argv[i + 1];

    const isFlag = next === undefined || next.startsWith("--");
    if (isFlag) {
      parsed[name] = true;
      i += 1;
      continue;
    }

    const value = next;
    const existing = parsed[name];
    if (Array.isArray(existing)) {
      existing.push(value);
      parsed[name] = existing;
    } else if (existing !== undefined && existing !== true) {
      parsed[name] = [existing, value];
    } else {
      parsed[name] = value;
    }

    i += 2;
  }

  return parsed;
}
