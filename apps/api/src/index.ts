import { createServer } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import {
  createPgliteClient,
  createPgliteDatabase,
  createPostgresDatabase,
  createPostgresPool
} from "./lib/db/connection.js";
import { bootstrapDevelopmentDatabase } from "./lib/db/dev-bootstrap.js";
import { logger } from "./lib/observability/logger.js";
import { createWorkoutHttpRouter } from "./modules/workout/http/workout.module.js";

async function main() {
  const database = env.USE_PGLITE_DEV
    ? await (async () => {
        const client = createPgliteClient();
        await bootstrapDevelopmentDatabase(client as any);
        return createPgliteDatabase(client);
      })()
    : createPostgresDatabase(createPostgresPool(env.DATABASE_URL!));

  const workoutRouter = createWorkoutHttpRouter(database);
  const app = createApp({ workoutRouter });
  const server = createServer(app);

  server.listen(env.PORT, () => {
    logger.info("fitness-api listening", {
      url: `http://localhost:${env.PORT}`,
      nodeEnv: env.NODE_ENV,
      databaseMode: env.USE_PGLITE_DEV ? "pglite-dev" : "postgres"
    });
  });
}

void main();
