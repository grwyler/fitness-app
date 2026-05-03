import type { UserRole } from "../../modules/workout/application/types/request-context.js";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function parseAdminEmailAllowlist(value: string | undefined) {
  const raw = typeof value === "string" ? value : "";
  const entries = raw
    .split(/[,\s]+/g)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(normalizeEmail);

  return new Set(entries);
}

export function resolveRoleForEmail(input: {
  email: string;
  adminEmails: string | undefined;
}): UserRole {
  const allowlist = parseAdminEmailAllowlist(input.adminEmails);
  return allowlist.has(normalizeEmail(input.email)) ? "admin" : "user";
}

