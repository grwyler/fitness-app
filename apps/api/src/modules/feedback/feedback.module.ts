import type { PgliteDatabase, PostgresDatabase } from "../../lib/db/connection.js";
import { createFeedbackRouter } from "./feedback.routes.js";

export type FeedbackDatabase = PostgresDatabase | PgliteDatabase | any;

export function createFeedbackHttpRouter(database: FeedbackDatabase) {
  return createFeedbackRouter(database);
}

