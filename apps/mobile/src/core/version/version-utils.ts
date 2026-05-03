export function formatVersionLabel(version: string) {
  const trimmed = version.trim();
  if (!trimmed) return "v0.0.0";
  return trimmed.toLowerCase().startsWith("v") ? trimmed : `v${trimmed}`;
}

