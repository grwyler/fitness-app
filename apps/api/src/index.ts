import { createServer } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { createPostgresDatabase, createPostgresPool } from "./lib/db/connection.js";
import { createWorkoutHttpRouter } from "./modules/workout/http/workout.module.js";

const pool = createPostgresPool(env.DATABASE_URL);
const database = createPostgresDatabase(pool);
const workoutRouter = createWorkoutHttpRouter(database);
const app = createApp({ workoutRouter });
const server = createServer(app);

server.listen(env.PORT, () => {
  console.log(`fitness-api listening on http://localhost:${env.PORT}`);
});
