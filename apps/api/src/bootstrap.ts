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
import { createFeedbackHttpRouter } from "./modules/feedback/feedback.module.js";

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
        database,
        workoutRouter: createWorkoutHttpRouter(database),
        feedbackRouter: createFeedbackHttpRouter(database)
      }),
      databaseMode: "pglite-dev"
    };
  }

  const pool = createPostgresPool(env.DATABASE_URL!);
  if (env.NODE_ENV === "development") {
    await bootstrapDevelopmentDatabase(pool);
  }

  return createPostgresRuntimeAppFromPool(pool);
}

export function createPostgresRuntimeApp(connectionString = env.DATABASE_URL!): ApiRuntime {
  return createPostgresRuntimeAppFromPool(createPostgresPool(connectionString));
}

function createPostgresRuntimeAppFromPool(pool: ReturnType<typeof createPostgresPool>): ApiRuntime {
  const database = createPostgresDatabase(pool);

  return {
    app: createApp({
      database,
      workoutRouter: createWorkoutHttpRouter(database),
      feedbackRouter: createFeedbackHttpRouter(database)
    }),
    databaseMode: "postgres"
  };
}
