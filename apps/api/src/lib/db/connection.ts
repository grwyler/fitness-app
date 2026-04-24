import { drizzle as drizzleNodePostgres } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Pool, type PoolConfig } from "pg";
import { PGlite } from "@electric-sql/pglite";
import { schema } from "@fitness/db";

function connectionStringHasInlineSslConfig(connectionString: string) {
  const searchParams = new URL(connectionString).searchParams;
  return ["sslmode", "sslcert", "sslkey", "sslrootcert"].some((key) => searchParams.has(key));
}

function shouldApplyHostedPostgresSslFallback(connectionString: string) {
  const hostname = new URL(connectionString).hostname.toLowerCase();
  const looksLikeHostedPostgres =
    hostname.endsWith(".neon.tech") ||
    hostname.endsWith(".supabase.co") ||
    hostname.endsWith(".pooler.supabase.com");

  return looksLikeHostedPostgres && !connectionStringHasInlineSslConfig(connectionString);
}

export function createPostgresPool(connectionString: string) {
  const poolConfig: PoolConfig = {
    allowExitOnIdle: true,
    connectionString,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    max: process.env.VERCEL ? 3 : 10
  };

  if (shouldApplyHostedPostgresSslFallback(connectionString)) {
    poolConfig.ssl = {
      rejectUnauthorized: false
    };
  }

  return new Pool({
    ...poolConfig
  });
}

export function createPostgresDatabase(pool: Pool) {
  return drizzleNodePostgres(pool, {
    schema
  });
}

export type PostgresDatabase = ReturnType<typeof createPostgresDatabase>;

export function createPgliteClient() {
  return new PGlite();
}

export function createPgliteDatabase(client: PGlite) {
  return drizzlePglite(client, {
    schema
  });
}

export type PgliteDatabase = ReturnType<typeof createPgliteDatabase>;
