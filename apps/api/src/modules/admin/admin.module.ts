import { createAdminRouter } from "./admin.routes.js";

export type AdminDatabase = any;

export function createAdminHttpRouter(database: AdminDatabase) {
  return createAdminRouter(database);
}

