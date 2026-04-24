import { createApp } from "./app.js";
import { env } from "./config/env.js";
import {
  createPgliteClient,
  createPgliteDatabase,
  createPostgresDatabase,
  createPostgresPool
} from "./lib/db/connection.js";
import { bootstrapDevelopmentDatabase } from "./lib/db/dev-bootstrap.js";
import { createWorkoutHttpRouter } from "./modules/workout/http/workout.module.js";

export type ApiRuntime = {
  app: ReturnType<typeof createApp>;
  databaseMode: "pglite-dev" | "postgres";
};

export async function createRuntimeApp(): Promise<ApiRuntime> {
  if (env.USE_PGLITE_DEV) {
    const client = createPgliteClient();
    await bootstrapDevelopmentDatabase(client as any);
    const database = createPgliteDatabase(client);

    return {
      app: createApp({
        workoutRouter: createWorkoutHttpRouter(database)
      }),
      databaseMode: "pglite-dev"
    };
  }

  return createPostgresRuntimeApp();
}

export function createPostgresRuntimeApp(connectionString = env.DATABASE_URL!): ApiRuntime {
  const database = createPostgresDatabase(createPostgresPool(connectionString));

  return {
    app: createApp({
      workoutRouter: createWorkoutHttpRouter(database)
    }),
    databaseMode: "postgres"
  };
}
