const STORAGE_KEY = "fitness-app:last-auth-debug";
const TIMELINE_STORAGE_KEY = "fitness-app:auth-debug-timeline";

let inMemoryMessage: string | null = null;
let lastClearTimestamp: string | null = null;
let lastSetTimestamp: string | null = null;

function canUseWebStorage() {
  return typeof globalThis !== "undefined" && "sessionStorage" in globalThis;
}

export function isDevAuthDebugEnabled() {
  return (
    typeof __DEV__ !== "undefined" &&
    __DEV__ &&
    typeof process !== "undefined" &&
    process.env?.EXPO_PUBLIC_AUTH_DEBUG === "1"
  );
}

export function isAuthDiagnosticsEnabled() {
  return isDevAuthDebugEnabled();
}

export function logSafeAuthDiagnostic(event: string, details: Record<string, boolean | string | null>) {
  if (!isAuthDiagnosticsEnabled()) {
    return;
  }

  console.info("[auth-diagnostics]", {
    details,
    event
  });
}

export function setLastAuthDebugMessage(message: string) {
  if (!isDevAuthDebugEnabled()) {
    return;
  }

  inMemoryMessage = message;
  lastSetTimestamp = new Date().toISOString();

  if (canUseWebStorage()) {
    globalThis.sessionStorage.setItem(STORAGE_KEY, message);
  }
}

export function getLastAuthDebugMessage() {
  if (!isDevAuthDebugEnabled()) {
    return null;
  }

  if (canUseWebStorage()) {
    const storedMessage = globalThis.sessionStorage.getItem(STORAGE_KEY);
    if (storedMessage) {
      inMemoryMessage = storedMessage;
      globalThis.sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  const message = inMemoryMessage;
  inMemoryMessage = null;
  return message;
}

export function clearLastAuthDebugMessage() {
  if (!isDevAuthDebugEnabled()) {
    inMemoryMessage = null;
    return;
  }

  inMemoryMessage = null;
  lastClearTimestamp = new Date().toISOString();

  if (canUseWebStorage()) {
    globalThis.sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function peekPersistedAuthDebugMessage() {
  if (!isDevAuthDebugEnabled()) {
    return null;
  }

  if (canUseWebStorage()) {
    return globalThis.sessionStorage.getItem(STORAGE_KEY);
  }

  return inMemoryMessage;
}

export function getAuthDebugStorageKey() {
  return STORAGE_KEY;
}

export type AuthDebugTimelineEntry = {
  at: string;
  event: string;
  details?: string;
};

let inMemoryTimeline: AuthDebugTimelineEntry[] = [];

function readTimelineFromStorage() {
  if (!isDevAuthDebugEnabled()) {
    return [];
  }

  if (!canUseWebStorage()) {
    return inMemoryTimeline;
  }

  const rawValue = globalThis.sessionStorage.getItem(TIMELINE_STORAGE_KEY);
  if (!rawValue) {
    return inMemoryTimeline;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as AuthDebugTimelineEntry[];
    if (Array.isArray(parsedValue)) {
      inMemoryTimeline = parsedValue;
    }
  } catch {
    inMemoryTimeline = [];
  }

  return inMemoryTimeline;
}

function writeTimelineToStorage(entries: AuthDebugTimelineEntry[]) {
  if (!isDevAuthDebugEnabled()) {
    inMemoryTimeline = [];
    return;
  }

  inMemoryTimeline = entries;

  if (canUseWebStorage()) {
    globalThis.sessionStorage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(entries));
  }
}

export function appendAuthDebugTimeline(event: string, details?: string) {
  if (!isDevAuthDebugEnabled()) {
    return;
  }

  const entries = readTimelineFromStorage();
  const nextEntries = [
    ...entries,
    {
      at: new Date().toISOString(),
      details,
      event
    }
  ];

  writeTimelineToStorage(nextEntries);
}

export function getAuthDebugTimeline() {
  return readTimelineFromStorage();
}

export function clearAuthDebugTimeline() {
  if (!isDevAuthDebugEnabled()) {
    inMemoryTimeline = [];
    return;
  }

  writeTimelineToStorage([]);
}

export function getAuthDebugTimelineStorageKey() {
  return TIMELINE_STORAGE_KEY;
}

export function getLastAuthDebugClearTimestamp() {
  return lastClearTimestamp;
}

export function getLastAuthDebugSetTimestamp() {
  return lastSetTimestamp;
}
