import { createApp } from "./app.js";
import { getEnv } from "./config/env.js";
import {
  createPgliteClient,
  createPgliteDatabase,
  createPostgresDatabase,
  createPostgresPool
} from "./lib/db/connection.js";
import { bootstrapDevelopmentDatabase } from "./lib/db/dev-bootstrap.js";
import { createWorkoutHttpRouter } from "./modules/workout/http/workout.module.js";
import { createFeedbackHttpRouter } from "./modules/feedback/feedback.module.js";
import { createAdminHttpRouter } from "./modules/admin/admin.module.js";

export type ApiRuntime = {
  app: ReturnType<typeof createApp>;
  databaseMode: "pglite-dev" | "postgres";
};

export async function createRuntimeApp(): Promise<ApiRuntime> {
  const env = getEnv();
  if (env.USE_PGLITE_DEV) {
    const client = createPgliteClient();
    await bootstrapDevelopmentDatabase(client as any);
    const database = createPgliteDatabase(client);

    return {
      app: createApp({
        database,
        workoutRouter: createWorkoutHttpRouter(database),
        feedbackRouter: createFeedbackHttpRouter(database),
        adminRouter: createAdminHttpRouter(database)
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

export function createPostgresRuntimeApp(connectionString = getEnv().DATABASE_URL!): ApiRuntime {
  return createPostgresRuntimeAppFromPool(createPostgresPool(connectionString));
}

function createPostgresRuntimeAppFromPool(pool: ReturnType<typeof createPostgresPool>): ApiRuntime {
  const database = createPostgresDatabase(pool);

  return {
    app: createApp({
      database,
      workoutRouter: createWorkoutHttpRouter(database),
      feedbackRouter: createFeedbackHttpRouter(database),
      adminRouter: createAdminHttpRouter(database)
    }),
    databaseMode: "postgres"
  };
}
