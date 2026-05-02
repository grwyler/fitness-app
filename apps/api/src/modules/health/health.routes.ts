import { Router } from "express";
import { programs, seedPrograms } from "@fitness/db";
import { success } from "../../lib/http/envelope.js";
import { describeErrorForLogs } from "../../lib/observability/describe-error.js";

export const healthRouter = Router();

healthRouter.get("/health", async (request, response) => {
  const database = (request.app.locals as { database?: any } | undefined)?.database;

  let databaseStatus: "ok" | "error" | "skipped" = "skipped";
  let databaseError: unknown = undefined;

  if (database?.select) {
    try {
      await database
        .select({
          id: programs.id,
          userId: programs.userId,
          source: programs.source
        })
        .from(programs)
        .limit(1);
      databaseStatus = "ok";
    } catch (error) {
      databaseStatus = "error";
      databaseError = describeErrorForLogs(error);
    }
  }

  const payload = success({
    status: databaseStatus === "error" ? "degraded" : "ok",
    service: "fitness-api",
    version: "0.1.0",
    database: {
      status: databaseStatus,
      error: databaseError
    },
    seededPrograms: seedPrograms.map((program) => ({
      name: program.name,
      templates: program.templates.length
    }))
  });

  response.status(databaseStatus === "error" ? 503 : 200).json(payload);
});
