import { createPostgresPool } from "../lib/db/connection.js";
import { env } from "../config/env.js";
import { bootstrapDevelopmentDatabase, DEV_USER_ID } from "../lib/db/dev-bootstrap.js";

async function main() {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for setup:dev when targeting a real Postgres database.");
  }

  const pool = createPostgresPool(env.DATABASE_URL);

  try {
    await bootstrapDevelopmentDatabase(pool);
    console.log("");
    console.log("Development database is ready.");
    console.log(`Seeded internal user id: ${DEV_USER_ID}`);
    console.log("Backend auth resolves app-issued JWTs to internal users.");
  } finally {
    await pool.end();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
