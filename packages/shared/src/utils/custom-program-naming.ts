export const DEFAULT_CUSTOM_PROGRAM_NAME = "Custom Program";

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeCustomProgramName(value: string | null | undefined) {
  return normalizeWhitespace(value ?? "");
}

export function resolveCustomProgramName(value: string | null | undefined) {
  const normalized = normalizeCustomProgramName(value);
  return normalized.length > 0 ? normalized : DEFAULT_CUSTOM_PROGRAM_NAME;
}

