import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config as loadDotEnv } from "dotenv";

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "packages",
  "db",
  "migrations"
);

function parseArgs(argv) {
  const args = { dryRun: false, envFile: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (arg === "--env-file") {
      const next = argv[i + 1];
      if (typeof next !== "string" || next.startsWith("--")) {
        throw new Error("--env-file requires a path");
      }
      args.envFile = next;
      i += 1;
      continue;
    }
  }
  return args;
}

function loadEnv({ envFile }) {
  const repoRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

  if (envFile) {
    const resolved = path.isAbsolute(envFile) ? envFile : path.resolve(repoRootDir, envFile);
    if (!existsSync(resolved)) {
      throw new Error(`Env file not found: ${resolved}`);
    }
    // Explicit env file should always win.
    loadDotEnv({ path: resolved, override: true });
    return;
  }

  const envCandidatePaths = [
    path.resolve(repoRootDir, ".vercel", ".env.production.local"),
    path.resolve(repoRootDir, ".vercel", ".env.preview.local"),
    path.resolve(repoRootDir, ".vercel", ".env.development.local"),
    path.resolve(repoRootDir, ".vercel", ".env.local"),
    path.resolve(repoRootDir, ".env.local"),
    path.resolve(repoRootDir, ".env")
  ];

  for (const candidatePath of envCandidatePaths) {
    if (existsSync(candidatePath)) {
      loadDotEnv({ path: candidatePath, override: false });
    }
  }
}

function requireDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required (set it in your environment before running migrations).");
  }
  return databaseUrl;
}

function describePgError(error) {
  if (!error || typeof error !== "object") return { message: String(error) };
  const pgError = error;
  return {
    name: pgError.name,
    message: pgError.message,
    code: pgError.code,
    detail: pgError.detail,
    hint: pgError.hint,
    where: pgError.where,
    schema: pgError.schema,
    table: pgError.table,
    column: pgError.column,
    constraint: pgError.constraint,
    routine: pgError.routine
  };
}

async function ensureMigrationsTable(client) {
  await client.query(`
    create table if not exists schema_migrations (
      id bigserial primary key,
      filename text not null unique,
      applied_at timestamptz not null default now()
    );
  `);
}

async function readAppliedMigrations(client) {
  const res = await client.query("select filename from schema_migrations order by filename asc;");
  return new Set(res.rows.map((row) => row.filename));
}

async function listMigrationFiles() {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function applyMigration(client, filename, { dryRun }) {
  const fullPath = path.join(MIGRATIONS_DIR, filename);
  const sql = await readFile(fullPath, "utf8");

  if (dryRun) {
    process.stdout.write(`DRY RUN: would apply ${filename}\n`);
    return;
  }

  await client.query("begin;");
  try {
    await client.query(sql);
    await client.query("insert into schema_migrations (filename) values ($1);", [filename]);
    await client.query("commit;");
  } catch (error) {
    await client.query("rollback;");
    const described = JSON.stringify(describePgError(error), null, 2);
    throw new Error(`Migration failed: ${filename}\n${described}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnv(args);
  const databaseUrl = requireDatabaseUrl();

  const { Pool } = pg;
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });

  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);

    const files = await listMigrationFiles();
    const applied = await readAppliedMigrations(client);
    const pending = files.filter((file) => !applied.has(file));

    if (pending.length === 0) {
      process.stdout.write("No pending migrations.\n");
      return;
    }

    process.stdout.write(`Migrations directory: ${MIGRATIONS_DIR}\n`);
    process.stdout.write(`Pending migrations (${pending.length}): ${pending.join(", ")}\n`);

    for (const filename of pending) {
      process.stdout.write(`Applying ${filename}...\n`);
      await applyMigration(client, filename, args);
      process.stdout.write(`Applied ${filename}\n`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

await main();
