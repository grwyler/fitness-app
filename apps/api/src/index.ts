import { createServer } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { createPostgresDatabase, createPostgresPool } from "./lib/db/connection.js";
import { logger } from "./lib/observability/logger.js";
import { createWorkoutHttpRouter } from "./modules/workout/http/workout.module.js";

const pool = createPostgresPool(env.DATABASE_URL);
const database = createPostgresDatabase(pool);
const workoutRouter = createWorkoutHttpRouter(database);
const app = createApp({ workoutRouter });
const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info("fitness-api listening", {
    url: `http://localhost:${env.PORT}`,
    nodeEnv: env.NODE_ENV
  });
});
