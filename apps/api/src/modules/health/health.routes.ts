import { Router } from "express";
import { programs, seedPrograms } from "@fitness/db";
import { success } from "../../lib/http/envelope.js";
import { describeErrorForLogs } from "../../lib/observability/describe-error.js";
import { sql } from "drizzle-orm";

export const healthRouter = Router();

function hasExpressRoute(router: unknown, input: { method: string; path: string }): boolean | null {
  if (!router || typeof router !== "object") {
    return null;
  }

  const routerAny = router as { stack?: unknown[] };
  if (!Array.isArray(routerAny.stack)) {
    return null;
  }

  const wantedMethod = input.method.toLowerCase();
  const wantedPath = input.path;

  const queue: unknown[] = [...routerAny.stack];
  while (queue.length > 0) {
    const layer = queue.shift();
    if (!layer || typeof layer !== "object") {
      continue;
    }

    const layerAny = layer as {
      route?: { path?: unknown; methods?: Record<string, boolean> };
      handle?: { stack?: unknown[] };
    };

    const route = layerAny.route;
    if (route && route.path === wantedPath && route.methods?.[wantedMethod]) {
      return true;
    }

    const nestedStack = layerAny.handle?.stack;
    if (Array.isArray(nestedStack)) {
      queue.push(...nestedStack);
    }
  }

  return false;
}

healthRouter.get("/health", async (request, response) => {
  const database = (request.app.locals as { database?: any } | undefined)?.database;
  const appAny = request.app as unknown as { _router?: unknown; router?: unknown };
  const expressRouter = appAny._router ?? appAny.router ?? null;
  const hasGuidedProgramRecommend = hasExpressRoute(expressRouter, {
    method: "post",
    path: "/guided-program/recommend"
  });

  let databaseStatus: "ok" | "error" | "skipped" = "skipped";
  let databaseError: unknown = undefined;
  let databaseFingerprint: string | null = null;
  let hasProgramsTrainingGoal: boolean | null = null;

  if (database?.select) {
    try {
      await database
        .select({
          id: programs.id,
          userId: programs.userId,
          source: programs.source,
          trainingGoal: programs.trainingGoal
        })
        .from(programs)
        .limit(1);

      if (typeof database.execute === "function") {
        const fingerprintResult = await database.execute(
          sql`select md5(current_database() || ':' || current_setting('server_version_num') || ':' || inet_server_addr()::text || ':' || inet_server_port()::text) as fingerprint`
        );
        databaseFingerprint =
          (fingerprintResult as any)?.rows?.[0]?.fingerprint ?? (fingerprintResult as any)?.[0]?.fingerprint ?? null;

        const trainingGoalResult = await database.execute(
          sql`select exists (
                select 1
                from information_schema.columns
                where table_schema = 'public' and table_name = 'programs' and column_name = 'training_goal'
              ) as has_training_goal`
        );
        hasProgramsTrainingGoal =
          (trainingGoalResult as any)?.rows?.[0]?.has_training_goal ??
          (trainingGoalResult as any)?.[0]?.has_training_goal ??
          null;
      }
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
      fingerprint: databaseFingerprint,
      hasProgramsTrainingGoal,
      error: databaseError
    },
    routes: {
      guidedProgramRecommend: hasGuidedProgramRecommend
    },
    seededPrograms: seedPrograms.map((program) => ({
      name: program.name,
      templates: program.templates.length
    }))
  });

  response.status(databaseStatus === "error" ? 503 : 200).json(payload);
});
