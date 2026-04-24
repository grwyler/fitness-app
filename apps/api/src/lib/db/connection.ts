import { drizzle as drizzleNodePostgres } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Pool } from "pg";
import { PGlite } from "@electric-sql/pglite";
import { schema } from "@fitness/db";

export function createPostgresPool(connectionString: string) {
  return new Pool({
    connectionString
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
