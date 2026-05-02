import { createServer } from "node:http";
import { getEnv } from "./config/env.js";
import { createRuntimeApp } from "./bootstrap.js";
import { logger } from "./lib/observability/logger.js";

async function main() {
  const env = getEnv();
  const { app, databaseMode } = await createRuntimeApp();
  const server = createServer(app);

  server.listen(env.PORT, "0.0.0.0", () => {
    logger.info("fitness-api listening", {
      url: `http://localhost:${env.PORT}`,
      nodeEnv: env.NODE_ENV,
      databaseMode
    });
  });
}

void main();
