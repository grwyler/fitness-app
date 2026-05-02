import type { UnitSystem } from "@fitness/shared";

export type UserRole = "user" | "admin";

export type RequestContext = {
  userId: string;
  unitSystem: UnitSystem;
  role?: UserRole;
};
