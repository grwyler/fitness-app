import {
  and as drizzleAnd,
  asc as drizzleAsc,
  desc as drizzleDesc,
  eq as drizzleEq,
  gte as drizzleGte,
  inArray as drizzleInArray,
  lte as drizzleLte,
  sql
} from "drizzle-orm";
import type { RepositoryOptions, RepositoryTransaction } from "../../repositories/models/persistence-context.js";

export const and = (...conditions: any[]) => drizzleAnd(...conditions);
export const asc = (column: any) => drizzleAsc(column);
export const desc = (column: any) => drizzleDesc(column);
export const eq = (left: any, right: any) => drizzleEq(left, right);
export const gte = (left: any, right: any) => drizzleGte(left, right);
export const inArray = (column: any, values: any[]) => drizzleInArray(column, values);
export const lte = (left: any, right: any) => drizzleLte(left, right);
export { sql };

export type DrizzleExecutor = any;

export function normalizeNumeric(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  if (value === null || value === undefined) {
    throw new Error("Expected numeric value but received nullish data.");
  }

  throw new Error(`Unsupported numeric value: ${String(value)}`);
}

export function normalizeNullableNumeric(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return normalizeNumeric(value);
}

export function createRepositoryTransaction(executor: DrizzleExecutor): RepositoryTransaction {
  return {
    __repositoryTransaction: "RepositoryTransaction",
    context: executor
  };
}

export function resolveExecutor(primaryExecutor: DrizzleExecutor, options?: RepositoryOptions): DrizzleExecutor {
  return options?.tx?.context ?? primaryExecutor;
}
